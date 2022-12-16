import { useNavigate, TitleBar, Loading } from "@shopify/app-bridge-react";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  SkeletonBodyText,
} from "@shopify/polaris";

import { useAppQuery } from "../hooks";

export default function HomePage() {
  /*
    Add an App Bridge useNavigate hook to set up the navigate function.
    This function modifies the top-level browser URL so that you can
    navigate within the embedded app and keep the browser in sync on reload.
  */
  const navigate = useNavigate();

  /*
    These are mock values. Setting these values lets you preview the loading markup and the empty state.
  */
  const isLoading = false;
  const isRefetching = false;
  const QRCodes = [];

  /* loadingMarkup uses the loading component from AppBridge and components from Polaris  */
  const loadingMarkup = isLoading ? (
    <Card sectioned>
      <Loading />
      <SkeletonBodyText />
    </Card>
  ) : null;

  /* Use Polaris Card and EmptyState components to define the contents of the empty state */
  const emptyStateMarkup =
    !isLoading && !QRCodes?.length ? (
      <Card sectioned>
        <EmptyState
          heading="Create unique QR codes for your product"
          /* This button will take the user to a Create a QR code page */
          action={{
            content: "Create QR code",
            onAction: () => navigate("/qrcodes/new"),
          }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>
            Allow customers to scan codes and buy products using their phones.
          </p>
        </EmptyState>
      </Card>
    ) : null;

  /*
    Use Polaris Page and TitleBar components to create the page layout,
    and include the empty state contents set above.
  */

  //app管理画面からshopify storeのurlを取得する
  function getParam(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  // ここからweb/index.jsの/api/script_tag_insert/の関数に飛ぶ。
  useAppQuery({
    url: "/api/script_tag_insert?shop="+getParam('shop'),
  });

  
  return (
    <Page>
      <TitleBar
        title="test_botton"
        primaryAction={{
          content: "test_botton",
          onAction: () => pass,
        }}
      />
      <Layout>
        <Layout.Section>
          {loadingMarkup}
          {emptyStateMarkup}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
