//ファイル名の正規表現リストを作成する
function makeNenpouFileTitleObj() {
  let f_title_list = 'age_birth,icd_block,kantan_age_detail,infect_month,infect_pref,infect_age'.split(',');
  let reg_age_birth = '死亡数,性,死亡月,生年年齢.*,別';
  let reg_icd_block = '死亡数,性・年齢[\(（][5５]歳階級[\)）],死因[\(（]死因基本分類[\)）],別';
  let reg_kantan_age_detail = '死亡数,性・年齢[\(（]各歳.+小学生－中学生.*再掲）,死因[\(（]死因簡単分類[\)）],別';
  let reg_infect_month = '感染症による死亡数,性,死因[\(（]感染症分類[\)）],死亡月,別';
  let reg_infect_pref = '感染症による死亡数,死因[\(（]感染症分類[\)）],都道府県[\(（].+都市再掲[\)）],死亡月,別';
  let reg_infect_age = '感染症による死亡数,性・年齢[\(（][5５]歳階級[\)）],死因[\(（]感染症分類[\)）],別';

  let reg_list = [reg_age_birth,reg_icd_block,reg_kantan_age_detail,reg_infect_month,reg_infect_pref,reg_infect_age];

  let r_str = 'dummy';

  //頭とケツにそれぞれ記号を付ける
  for(let i=0; i<reg_list.length; i++){
    r_str = reg_list[i].slice(0);
    r_str = '^' + r_str + '$';
    console.log(r_str);
    reg_list[i] = r_str;
  }

  let reg_object = addItemToObject(new Object, f_title_list, reg_list);
  
  console.log(reg_object);

  return reg_object

}

function getNenpouDataAddress(parseDict,parseText,colName,reg){
  //
  let head_url = parseDict.head_url;

  let reg_set = makeRegMix(reg.split(','));

  let reg_sample = searchHead(parseText,reg_set);

  let url_reg = 'dummy';
  let buf = []
  let result = [];

  if(colName != 'icd_block'){
    //注意！！正規表現における.は「改行を含まない」ため、行をまたいだ検索を行おうとすると改行で止まり、nullを返す場合がある
    //また、基本的に最長データを目標とするため、最短データにするために*+の後に?をつける必要がある
    url_reg = reg_sample + '[\\s\\S]+?file-download(.+)"';
    result = head_url + parseText.match(RegExp(url_reg))[1];
  }else{
    //死因基本分類の該当ファイルは2つあるため、それを考慮して抜き出す
    let head_reg = parseText.match(RegExp(reg_sample))[0]
    parse_small = Parser.data(parseText).from(head_reg).to('<li class="stat-dataset_list-detail-item stat-dataset_list-border-top">').build();
    //console.log(parse_small);
    buf = Parser.data(parse_small).from('file-download').to('"').iterate();
    console.log(`死因基本分類では以下のように抜き出せた。\n${buf}`);
    for(i=0; i < buf.length; i++){
      result.push(head_url + buf[i])
    }
    result = result.join(',');

  }

  console.log(result);

  return result

}

function separateFileType(addressList){
  /*
  ファイルタイプに応じて記録位置を変更する
  CSVなら手前、EXCELなら後ろ、という具合
  */
  let a_length = addressList.length;
  let result_list = [new Array(a_length),new Array(a_length)];

  let f_type = 9999;
  let adrs = 'dummy';

  for(let i=0; i < a_length; i++){
    adrs = addressList[i].slice(0);
    f_type = checkFileType(adrs);
    if(f_type==1){
      result_list[0][i] = adrs;
    }else{
      result_list[1][i] = adrs;
    }
  }

  let result = result_list.flat();
  console.log(result);

  return [result]
}

function getParseText(parseDict,url){
  /*
  urlから初期パースした文字列を返す
  */
  let from1 = parseDict.from1;
  let to1 = parseDict.to1;
  let tType = parseDict.tType;

  //URLに対しフェッチを行ってHTMLデータを取得する
  let UCD_html = UrlFetchApp.fetch(url).getContentText(tType);
  //大枠＞個別という具合にパースする
  let parse_big = Parser.data(UCD_html).from(from1).to(to1).build();

  return parse_big
}

//デフォルトとして、2013年のアドレスを採用
//こんな使い方を想定＞=getNenpouDataList(A1:B1)
function getNenpouDataList(rootTarget = [['https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&toukei=00450011&tstat=000001028897&cycle=7&year=20130&month=0&tclass1=000001053058&tclass2=000001053061&tclass3=000001053065&result_back=1&cycle_facet=tclass1&tclass4val=0&metadata=1&data=1','https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&toukei=00450011&tstat=000001028897&cycle=7&year=20130&month=0&tclass1=000001053058&tclass2=000001053061&tclass3=000001053073&tclass4=000001053082&result_back=1&tclass5val=0']]){

  console.log(rootTarget);
  let summary_url = rootTarget[0][0];
  let detail_url = rootTarget[0][1];

  let reg_obj = makeNenpouFileTitleObj();

  //取得年でパラメタを変える必要があるため、辞書で管理する
  let parse_dict = {
    'from1'     :'<div class="stat-dataset_list">',                              //parseするときの頭
    'to1'       :'<div style="display: none">',                                 //parseするときのケツ
    'head_url'  :'https://www.e-stat.go.jp/stat-search/file-download',          //ダウンロードアドレスの頭
    'tType'     :'UTF-8'                                                        //該当ページの文字コード
    
  }

  let summary_parse = getParseText(parse_dict,summary_url);
  let detail_parse = getParseText(parse_dict,detail_url);

  //csvかexcelかで変える必要あり
  //死因基本分類のやつは2つあるためそれも考慮する必要あり
  let buf = [];
  let use_parse = 'dummy';

  for(let d_col in reg_obj){
    //キーをd_colとして取得している
    console.log(d_col);
    if(d_col == 'age_birth'){
      use_parse = summary_parse.slice(0);
    }else{
      use_parse = detail_parse.slice(0);
    }
    buf.push(getNenpouDataAddress(parse_dict, use_parse, d_col, reg_obj[d_col]));
  }

  let buf_str = buf.join(',');
  
  return separateFileType(buf_str.split(','))

}