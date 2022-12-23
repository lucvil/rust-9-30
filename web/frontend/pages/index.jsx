import { useNavigate, TitleBar, Loading } from "@shopify/app-bridge-react";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  SettingToggle,
  Button,
  ButtonGroup,
  AutoSelection,
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

import changedRecord from "../../record/changed_record.json";

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

  
  const [isDayButtonActive, setIsDayButtonActive] = useState(true);

  function getDateStr(Date){
    return Date.getFullYear() + "/" + (Date.getMonth() + 1) + "/" + Date.getDate();
  } 

  function getMonthStr(Date){
    return Date.getFullYear() + "/" + (Date.getMonth() + 1);
  }



  // チェック件数の折れ線グラフ
  function CheckCountChart(){
  
    //todayを今日の23:59:59とする
    const today = new Date();
    today.setHours(23);
    today.setMinutes(59);
    today.setSeconds(59);
    const chartYear = today.getFullYear();
    const chartMonth = today.getMonth() + 1; //本当の月


    //グラフデータの作成(初期設定)
    let labels,chartData,chartRangeText;
    if(isDayButtonActive){
      //デイリーデータ
      let thisDay = new Date(chartYear, chartMonth - 1,1,0,0,0);
      let chartLabelsFull = [];
      for(let i = 0; i < 31; i++){
        if(thisDay <= today && thisDay.getFullYear() == chartYear && thisDay.getMonth() == chartMonth - 1){
          chartLabelsFull.push(getDateStr(thisDay));
        }
        thisDay.setDate(thisDay.getDate() + 1);
      }

      labels = chartLabelsFull.map(x => x.replace(String(chartYear) + '/', ''));
      chartData = chartLabelsFull.map(x => changedRecord[x]);
      chartRangeText="過去1ヶ月間 " +getDateStr(new Date(chartYear,chartMonth-1,1)) + "〜" + getDateStr(new Date(chartYear,chartMonth,0)) 
    }else{
      //マンスリーデータ
      let thisDay = new Date(chartYear, 0,1,0,0,0);
      let chartLabelsFull = []
      for(let month = 0; month < 12; month++){
        if(thisDay <= today){
          chartLabelsFull.push(getMonthStr(thisDay));
        }
        thisDay.setMonth(thisDay.getMonth() + 1);
      }
      
      labels = chartLabelsFull.map(x => x.replace(String(chartYear) + '/', '') + "月");
      chartData = []
      for(let i = 0; i < labels.length; i++){
        let isExist = false;
        let monthSum = 0;
        for(let key in changedRecord){
          if(key.startsWith( String(chartYear) + "/" + String(i+1) + "/" )){
            monthSum += changedRecord[key];
            isExist = true;
          }
        }

        let thisMonth = (isExist) ? monthSum : undefined;
        chartData.push(thisMonth)
      }
      chartRangeText = "過去1年間 " + chartYear + "/1〜" + chartYear + "/12";
    }


    //ボタンの関数
    //ボタンを押した時のみ動く
    const handleDayButtonClick = useCallback(() => {
      if (isDayButtonActive) return;
      setIsDayButtonActive(true);
    }, [isDayButtonActive]);
  
    const handleMonthButtonClick = useCallback(() => {
      if (!isDayButtonActive) return;
      setIsDayButtonActive(false);
    }, [isDayButtonActive]);



    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        // title: {
        //   display: false,
        //   text: 'Chart.js Line Chart',
        // },
      },
      scales: {
        y: {
          suggestedMin: 0,
        }
      }
    };
    

    let data = {
      labels,
      datasets: [
        {
          label: "アドレス変更件数",
          data: chartData,
          borderColor: 'rgba(59, 98, 121, 1)',
          backgroundColor: 'rgba(59, 98, 121, 1)',
          pointBorderWidth: 3,
          borderWidth: 1,
          // borderColor: 'rgb(255, 99, 132)',
          // backgroundColor: 'rgba(255, 99, 132, 0.5)',
        },
      ],
    };

    return (
      <div style={{marginTop: 2+"em"}}>
        <div className="clearfix">
          <div style={{height: 3+"em",float: "left"}}> 
              <p style={{lineHeight:2 + "em",fontSize: 20+"px"}}><b>チェック件数</b></p>
          </div>
          <div style={{float: "right"}}>
            <ButtonGroup segmented>
              <Button pressed={isDayButtonActive} onClick={handleDayButtonClick}>
                デイリー
              </Button>
              <Button pressed={!isDayButtonActive} onClick={handleMonthButtonClick}>
                マンスリー
              </Button>
            </ButtonGroup>
          </div>
          <div style={{height: 3+"em",float: "right",marginRight: 2+"em"}}>
            <p style={{lineHeight:3 + "em"}}>{chartRangeText}</p>
          </div>
        </div>
        <div style={{height: 4+"em"}}>
        </div>
        <Card>
          <div style={{alignItems: "center",paddingTop:2+"em" ,paddingBottom: 2+"em",paddingLeft:4+"em",paddingRight:1+"em",}}>
            <Line options={options} data={data}/>
          </div>
        </Card>
      </div>
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
