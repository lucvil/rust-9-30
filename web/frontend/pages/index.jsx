import { useNavigate, TitleBar, Loading } from "@shopify/app-bridge-react";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  SettingToggle,
} from "@shopify/polaris";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

import { Line } from 'react-chartjs-2';

import {useState, useCallback} from 'react';

import { useAppQuery } from "../hooks";

let isFirst = true;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);



export default function HomePage() {
  /*
    Add an App Bridge useNavigate hook to set up the navigate function.
    This function modifies the top-level browser URL so that you can
    navigate within the embedded app and keep the browser in sync on reload.
  */
  const navigate = useNavigate();

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

  let [active, setActive]= useState(null);

  //普段はloadingとsuccessで2回くるが、reactQueryOptionsのonSuccessをつけるとloadingしかSuccess中の関数を実行してくれない？
  const {
    data,
    isSuccess,
  } = useAppQuery({
    url: "/api/script_tag_check?shop="+getParam('shop'),
  });
  
  //ボタンの初期設定
  if(isFirst && data != undefined){
    setActive(data.scriptTagExist);
    isFirst = false;
  }

  //setActiveではすぐに読み込み直しはされず、以下も実行されるためactiveの初期値nullのままの時はif文に入らない。
  //useAppQueryの数は常に同じでないといけないためelse文の中で何もしないuseAppQueryを入れている。
  if(!isFirst && active != null){
    if(active){
      //scriptTagを追加
      useAppQuery({
        url: "/api/script_tag_insert?shop="+getParam('shop'),
      });
    }else{
      //scriptTagを削除
      useAppQuery({
        url: "/api/script_tag_delete?shop="+getParam('shop'),
      });
    }
  }else{
    useAppQuery({
      url: "/api/script_tag_do_nothing",
    });
  }
  
  //scriptTagの切り替えボタン
  function SettingScriptTagToggle() {

    const handleToggle = useCallback(() => {
      setActive((active) => !active);
      //activeは即座に反映されず、setActiveで再描画が行われた後に更新される。
    }, []);
  
    const contentStatus = active ? '無効にする' : '有効にする';
    const textStatus = active ? '有効' : '無効';
    
    if(isSuccess){
      return (
        <SettingToggle
          action={{
            content: contentStatus,
            onAction: handleToggle,
          }}
          enabled={active}
        >
          住所変更アプリは<b>{textStatus}</b>になっています。
        </SettingToggle>
      );
    }
  }

  // チェック件数の折れ線グラフ
  function CheckCountChart(){
    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Chart.js Line Chart',
        },
      },
    };

    const labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];

    const data = {
      labels,
      datasets: [
        {
          label: 'Dataset 1',
          data: labels.map(() => 550),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        },
      ],
    };

    return (
      <Line options={options} data={data} />
    );
  }


  return (
    <Page>
      <Layout>
        <Layout.Section>
          {SettingScriptTagToggle()}
          {CheckCountChart()}
        </Layout.Section>
      </Layout>
    </Page>
  );


        {/* <TitleBar
        title="test_botton"
        primaryAction={{
          content: "test_botton",
          onAction: () => pass,
        }}
      /> */}
}
