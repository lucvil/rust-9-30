// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import cookieParser from "cookie-parser";

//11/24追記 
import bodyParser from "body-parser";
import queryString from "query-string";
import fs from "fs";
import path from "path";
import cron from "node-cron";

import { Shopify, LATEST_API_VERSION } from "@shopify/shopify-api";

import applyAuthMiddleware from "./middleware/auth.js";
import verifyRequest from "./middleware/verify-request.js";
import { setupGDPRWebHooks } from "./gdpr.js";
import productCreator from "./helpers/product-creator.js";
import redirectToAuth from "./helpers/redirect-to-auth.js";
import { BillingInterval } from "./helpers/ensure-billing.js";
import { AppInstallations } from "./app_installations.js";

// script_tagのimport
// 年を変更 2021-10 -> 2022-07
import {ScriptTag} from '@shopify/shopify-api/dist/rest-resources/2022-07/index.js';

//11/23 app_proxyの認証のため追記
import { verifySignature } from "./utils/app_proxy.js";


const USE_ONLINE_TOKENS = false;

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

// TODO: There should be provided by env vars
const DEV_INDEX_PATH = `${process.cwd()}/frontend/`;
const PROD_INDEX_PATH = `${process.cwd()}/frontend/dist/`;

const DB_PATH = `${process.cwd()}/database.sqlite`;


Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(","),
  HOST_NAME: process.env.HOST.replace(/https?:\/\//, ""),
  HOST_SCHEME: process.env.HOST.split("://")[0],
  API_VERSION: LATEST_API_VERSION,
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy
  SESSION_STORAGE: new Shopify.Session.SQLiteSessionStorage(DB_PATH),
});

Shopify.Webhooks.Registry.addHandler("APP_UNINSTALLED", {
  path: "/api/webhooks",
  webhookHandler: async (_topic, shop, _body) => {
    await AppInstallations.delete(shop);
  },
});

// The transactions with Shopify will always be marked as test transactions, unless NODE_ENV is production.
// See the ensureBilling helper to learn more about billing in this template.
const BILLING_SETTINGS = {
  required: false,
  // This is an example configuration that would do a one-time charge for $5 (only USD is currently supported)
  // chargeName: "My Shopify One-Time Charge",
  // amount: 5.0,
  // currencyCode: "USD",
  // interval: BillingInterval.OneTime,
};

// This sets up the mandatory GDPR webhooks. You’ll need to fill in the endpoint
// in the “GDPR mandatory webhooks” section in the “App setup” tab, and customize
// the code when you store customer data.
//
// More details can be found on shopify.dev:
// https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks
setupGDPRWebHooks("/api/webhooks");


// export for test use only
export async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === "production",
  billingSettings = BILLING_SETTINGS
) {
  const app = express();

  app.set("use-online-tokens", USE_ONLINE_TOKENS);
  app.use(cookieParser(Shopify.Context.API_SECRET_KEY));


  applyAuthMiddleware(app, {
    billing: billingSettings,
  });


  // Do not call app.use(express.json()) before processing webhooks with
  // Shopify.Webhooks.Registry.process().
  // See https://github.com/Shopify/shopify-api-node/blob/main/docs/usage/webhooks.md#note-regarding-use-of-body-parsers
  // for more details.
  app.post("/api/webhooks", async (req, res) => {
    try {
      await Shopify.Webhooks.Registry.process(req, res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (e) {
      console.log(`Failed to process webhook: ${e.message}`);
      if (!res.headersSent) {
        res.status(500).send(e.message);
      }
    }
  });

  // All endpoints after this point will require an active session
  app.use(
    "/api/*",
    verifyRequest(app, {
      billing: billingSettings,
    })
  );
  

  app.get("/api/products/count", async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get("use-online-tokens")
    );
    const { Product } = await import(
      `@shopify/shopify-api/dist/rest-resources/${Shopify.Context.API_VERSION}/index.js`
    );

    const countData = await Product.count({ session });
    res.status(200).send(countData);
  });

  app.get("/api/products/create", async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get("use-online-tokens")
    );
    let status = 200;
    let error = null;

    try {
      await productCreator(session);
    } catch (e) {
      console.log(`Failed to process products/create: ${e.message}`);
      status = 500;
      error = e.message;
    }
    res.status(status).send({ success: status === 200, error });
  });


  // All endpoints after this point will have access to a request.body
  // attribute, as a result of the express.json() middleware
  app.use(express.urlencoded({extended: true}));
  app.use(express.json()); 



  //script_tagからの通信
  app.get('/address_kun/search_address', async (req, res) => {
    //通信の検証
    try {
      verifySignature(req.url,process.env.SHOPIFY_API_SECRET);
    }catch (error){
      // signatureの確認が終わるまではshopifyからの呼び出しではないかもしれないので，liquidで返さない
      res.status(403).send("正しくないリクエストが送信されました");
      return;
    }

    const qs = req.url.match(/\?(.*)/);
    const AppProxyData = queryString.parse((qs && qs[1]) || "");

    //graphql query
    const graphqlQueryString = `{
      order(id: `+ `"gid://shopify/Order/` + AppProxyData.order_id + `"` + `){
        shippingAddress{
          city
          address1
          address2
        }        
      }
    }`;

    //GraphQL Admin APIを使うためにaccess token 取得
    //shopが必ず来るとは限らないので例外処理が必要かも
    const session = await Shopify.Utils.loadOfflineSession(AppProxyData.shop);
    

    const client = new Shopify.Clients.Graphql(
      session.shop,
      session.accessToken
    );

    const graphqlResponse = await client.query({
      data: {
        "query": graphqlQueryString
      }
    });

    var sendText = graphqlResponse.body.data.order.shippingAddress.city + graphqlResponse.body.data.order.shippingAddress.address1;
    
    res.status(200);
    res.contentType("aplication","application/json");
    sendText = {
      city: graphqlResponse.body.data.order.shippingAddress.city,
      address1: graphqlResponse.body.data.order.shippingAddress.address1,
      address2: graphqlResponse.body.data.order.shippingAddress.address2
    };
    res.send(JSON.stringify(sendText));
    res.end();
  });

  //App proxy
  app.get('/address_kun/change_address', async (req, res) => {
    //通信の検証
    try {
      verifySignature(req.url,process.env.SHOPIFY_API_SECRET);
    }catch (error){
      // signatureの確認が終わるまではshopifyからの呼び出しではないかもしれないので，liquidで返さない
      res.status(403).send("正しくないリクエストが送信されました");
      return;
    }

    const qs = req.url.match(/\?(.*)/);
    const AppProxyData = queryString.parse((qs && qs[1]) || "");

    //graphql query
    const graphqlQueryString = `mutation orderUpdate($input: OrderInput!){
      orderUpdate(input: $input){
        order {
          id
          shippingAddress{
            city
            address1
            address2
          }
        }
        userErrors {
          message
          field
        }
      }
    }`;

    const graphqlQueryVariables = {
      "input": {
        "id": "gid://shopify/Order/" + AppProxyData.order_id,
        "shippingAddress": {
          "city": AppProxyData.city,
          "address1": AppProxyData.address1,
          "address2": AppProxyData.address2
        }
      }
    };


    //GraphQL Admin APIを使うためにaccess token 取得
    //shopが必ず来るとは限らないので例外処理が必要かも
    const session = await Shopify.Utils.loadOfflineSession(AppProxyData.shop);
    

    const client = new Shopify.Clients.Graphql(
      session.shop,
      session.accessToken
    );

    const graphqlResponse = await client.query({
      data: {
        "query": graphqlQueryString,
        "variables": graphqlQueryVariables,
      }
    });

    res.status(200).send("Hello");
    res.end();

    // console.log(graphqlResponse.body.data.orderUpdate);

    //changed_recordに記録
    let changedRecord = JSON.parse(
      fs.readFileSync(join(`${process.cwd()}`, `record/changed_record.json`)).toString()
    );

    const today = new Date();
    const recordKey = today.getFullYear() + "/" + (today.getMonth() + 1) + "/" + today.getDate();
    if(changedRecord[recordKey] == undefined){
      changedRecord[recordKey] = 1;
    }else{
      changedRecord[recordKey] += 1;
    }

    fs.writeFileSync(
      join(`${process.cwd()}`, `record/changed_record.json`),
      JSON.stringify(changedRecord,null,4)
    );

  });

  // return scriptTag
  app.get('/address_kun/return_script_tag', async(req, res) => {
    //通信の検証
    try {
      verifySignature(req.url,process.env.SHOPIFY_API_SECRET);
    }catch (error){
      // signatureの確認が終わるまではshopifyからの呼び出しではないかもしれないので，liquidで返さない
      res.status(403).send("正しくないリクエストが送信されました");
      return;
    }

    //web/script_tag/script_tag.jsを返す
    res.contentType("text/javascript");
    res.sendFile(join(`${process.cwd()}`, `script_tag/script_tag.js`));

  });

  //scritTagが挿入されているか確認
  app.get("/api/script_tag_check", async (request, response) => {
    const test_session = await Shopify.Utils.loadCurrentSession(
      request,
      response,
      app.get("use-online-tokens")
    );

    const qs = request.url.match(/\?(.*)/);
    const AppProxyData = queryString.parse((qs && qs[1]) || "");


    //ScriptTagのlistを取得しsrcと同じScriptTagがなければ挿入    
    // const src = "https://lucvil.github.io/script_tag/test_script.js";
    const src = "https://" + AppProxyData.shop + "/apps/address/return_script_tag";
    let scriptTagExist = false;

    //shopify.rest.ScriptTag -> ScriptTag
    const scriptTagList =  await ScriptTag.all({
      session: test_session,
    });

    scriptTagList.map((scriptTagItem) => {
      if(scriptTagItem.src == src){
        scriptTagExist = true;
      }
    });

    let responseData = {
      "scriptTagExist": scriptTagExist
    }

    response.status(200).send(responseData);
  });

  //ScriptTag挿入 
  app.get("/api/script_tag_insert", async (request, response) => {
    const test_session = await Shopify.Utils.loadCurrentSession(
      request,
      response,
      app.get("use-online-tokens")
    );

    const qs = request.url.match(/\?(.*)/);
    const AppProxyData = queryString.parse((qs && qs[1]) || "");

    //ScriptTagのlistを取得しsrcと同じScriptTagがなければ挿入    
    // const src = "https://lucvil.github.io/script_tag/test_script.js";
    const src = "https://" + AppProxyData.shop + "/apps/address/return_script_tag";
    let scriptTagExist = false;

    //shopify.rest.ScriptTag -> ScriptTag
    const scriptTagList =  await ScriptTag.all({
      session: test_session,
    });

    scriptTagList.map((scriptTagItem) => {
      if(scriptTagItem.src == src){
        scriptTagExist = true;
      }
    });


    if(!scriptTagExist){
      //新しいScriptTagを作る
      const script_tag = new ScriptTag({session: test_session});
      script_tag.event = "onload";
      script_tag.src = src;
      await script_tag.save({
        update: true,
      });
    }

    //useAppQueryでresponse.json()を行うためjsonっぽいデータを返す。
    response.status(200).send("{}");
  });

  //ScriptTag削除
  app.get("/api/script_tag_delete", async (request, response) => {
    const test_session = await Shopify.Utils.loadCurrentSession(
      request,
      response,
      app.get("use-online-tokens")
    );

    const qs = request.url.match(/\?(.*)/);
    const AppProxyData = queryString.parse((qs && qs[1]) || "");


    //ScriptTagのlistを取得しsrcと同じScriptTagがなければ挿入    
    // const src = "https://lucvil.github.io/script_tag/test_script.js";
    const src = "https://" + AppProxyData.shop + "/apps/address/return_script_tag";
    let scriptTagExist = false;

    //shopify.rest.ScriptTag -> ScriptTag
    const scriptTagList =  await ScriptTag.all({
      session: test_session,
    });

    let scriptTagIdList = [];

    scriptTagList.map((scriptTagItem) => {
      if(scriptTagItem.src == src){
        scriptTagIdList.push(scriptTagItem.id);
        scriptTagExist = true;
      }
    });

    scriptTagIdList.map((scriptTagIdItem) => {
      ScriptTag.delete({
        session: test_session,
        id: scriptTagIdItem,
      });
    });

    response.status(200).send("{}");
  });

  //ScriptTagに対して何もしない。
  app.get("/api/script_tag_do_nothing", async(request, response) => {
    response.status(200).send("{}");
  });

  app.use((req, res, next) => {
    const shop = Shopify.Utils.sanitizeShop(req.query.shop);
    if (Shopify.Context.IS_EMBEDDED_APP && shop) {
      res.setHeader(
        "Content-Security-Policy",
        `frame-ancestors https://${encodeURIComponent(
          shop
        )} https://admin.shopify.com;`
      );
    } else {
      res.setHeader("Content-Security-Policy", `frame-ancestors 'none';`);
    }
    next();
  });

  if (isProd) {
    const compression = await import("compression").then(
      ({ default: fn }) => fn
    );
    const serveStatic = await import("serve-static").then(
      ({ default: fn }) => fn
    );
    app.use(compression());
    app.use(serveStatic(PROD_INDEX_PATH, { index: false }));
  }

  app.use("/*", async (req, res, next) => {
    
    if (typeof req.query.shop !== "string") {
      res.status(500);
      return res.send("No shop provided");
    }

    const shop = Shopify.Utils.sanitizeShop(req.query.shop);
    const appInstalled = await AppInstallations.includes(shop);

    if (!appInstalled && !req.originalUrl.match(/^\/exitiframe/i)) {
      return redirectToAuth(req, res, app);
    }

    if (Shopify.Context.IS_EMBEDDED_APP && req.query.embedded !== "1") {
      const embeddedUrl = Shopify.Utils.getEmbeddedAppUrl(req);

      return res.redirect(embeddedUrl + req.path);
    }

    const htmlFile = join(
      isProd ? PROD_INDEX_PATH : DEV_INDEX_PATH,
      "index.html"
    );

    return res
      .status(200)
      .set("Content-Type", "text/html")
      .send(readFileSync(htmlFile));
  });


  return { app };
}

//毎日0:01にrecordに0データを追加
//アプリがその日に一件も変更しなくても件数0というデータを残しておく
cron.schedule('0 1 0 * * *', () => {
    //changed_recordに記録
    let changedRecord = JSON.parse(
      fs.readFileSync(join(`${process.cwd()}`, `record/changed_record.json`)).toString()
    );

    const today = new Date();
    const recordKey = today.getFullYear() + "/" + (today.getMonth() + 1) + "/" + today.getDate();
    if(changedRecord[recordKey] == undefined){
      changedRecord[recordKey] = 0;
    }

    fs.writeFileSync(
      join(`${process.cwd()}`, `record/changed_record.json`),
      JSON.stringify(changedRecord,null,4)
    );
})

createServer().then(({ app }) => app.listen(PORT));
