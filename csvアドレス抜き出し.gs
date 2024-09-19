//人口動態統計のestatページから該当のcsvアドレスを取得し、縦1列で出力する
function make_address(plist,header){
  var address_list = [];
  console.log(plist.length);
  for (var i=0;i<plist.length;i++){
    file_address = header + plist[i];
    address_list.push(file_address);
  }

  //console.log(address_list);

  return address_list;

}

function make_parsedict(select_year){

  var old_dict = {
    'from1':'死因(死因基本分類)',
    'to1':'死亡月・死因(死因簡単分類)',
    'from2':'<a href="',
    'to2':'"'
  };
  var new_dict = {
    'from1':'表示・ダウンロード',
    'to1':'死因（死因簡単分類）・性・死亡月別',
    'from2':'<a href="',
    'to2':'"'
  };
  
  if (select_year>2017){
    return new_dict;
  }else{
    return old_dict;
  }


}

function getCSVAddress(tableURL='https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&cycle=7&toukei=00450011&tstat=000001028897&tclass1=000001053058&tclass2=000001053061&tclass3=000001053074&tclass4=000001053089&tclass5val=0&year=20220&month=0&result_back=1', getYear=2022) {

  //tableURL:大元となる取得対象のURL
  //getYear:取得する年、2017以前はhtmlの構造が違うため注意が必要
  //区切りのないテーブル構造だったため、一括で死因基本分類と死因簡単分類を読み込む

  //取得年でパラメタを変える必要があるため、辞書で管理する
  var parse_dict = make_parsedict(getYear);

  var from1 = parse_dict.from1;//大枠の指定
  var to1 = parse_dict.to1;//大枠の終わり
  var from2 = parse_dict.from2;//個別取得指定
  var to2 = parse_dict.to2;//個別取得終わり

  var head_url = 'https://www.e-stat.go.jp';

  var tType = 'UTF-8';//該当ページの文字コード

  //URLに対しフェッチを行ってHTMLデータを取得する
  var UCD_html = UrlFetchApp.fetch(tableURL).getContentText(tType);

  //大枠＞個別という具合にパースする
  var parse_big = Parser.data(UCD_html).from(from1).to(to1).build();

  var parse_list = Parser.data(parse_big).from(from2).to(to2).iterate();
  //console.log(parse_list);

  var addr_list = make_address(parse_list,head_url);

  console.log(addr_list);

  return addr_list;

}
