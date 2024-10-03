//人口動態統計のestatページから該当のcsvアドレスを取得し、縦1列で出力する

function getParseList(parseData,fromText,toText){
  /*パースする実働部分、ここで対象文字列群から必要文字列をリストにして返すという動作を行う
  parseData:分割元となるテキストデータ
  fromText:リスト化する際識別するための頭のキーワード
  toText:fromTextをどこまで検索するかのキーワード
  */
  var parse_list = Parser.data(parseData).from(fromText).to(toText).iterate();

  return parse_list

}

function getYMList(parseData,headURL,btmFlag){
  /*
  抜き出した人口動態統計管理HTMLから年月をyyyymm形式で抜き出す
  */
  var year_parse = Parser.data(parseData).from('<ul class="stat-cycle_ul_other">').to('</ul>').iterate();
  //最後の年かどうかで対応が変わってしまうため注意

  if(!btmFlag){
    year_parse.pop()
  }
  console.log(`iterate後の要素数は${year_parse.length}`);
  console.log(year_parse.slice(-1));
  
  //match正規表現中の()によるグループ囲みを行うと、グループの内容がそれぞれリストとして取り出すことができる
  //gフラグなどはつけ外しを動的に行いたい場合はRegExp()で指定すること
  var y_reg = /<span>([0-9]+)年<\/span>/;
  var m_reg = 'href="(.+?)" class="stat-item_child">([0-9]+)月';
  
  var result_list = [];
  var y_data = "dummy";
  var y_text_buf = "dummy";

  for(let i=0; i < year_parse.length; i++){
    //年データを取得する
    y_text_buf = year_parse[year_parse.length-1-i];
    y_data = y_text_buf.match(y_reg);
    //console.log(y_data);

    //該当年の月とそれに対応するURLを取得する
    let data_list = y_text_buf.match(RegExp(m_reg,'g'));
    console.log(data_list.length);

    for(let j=0; j < data_list.length; j++){
      //yyyymm形式になるようにデータを整理する
      match_list = data_list[j].match(RegExp(m_reg));
      //console.log(match_list);
      ym_data = Number(y_data[1])*100 + Number(match_list[2])
      catch_url = headURL+match_list[1]

      result_list.push([ym_data,catch_url.replace(/&amp;/g,'&')])
    }
  }

  let log_text = `最終時点での要素数は ${result_list.length}`;
  console.log(log_text);

  return result_list

}

function getTerminalList(terminalURL,tType,headURL,parseDict,btmFlag){
  /*各指定から記録元HTMLのリストを作成する
  この際、年月も一緒に取得し、年月とアドレスが一致するようにする
  terminalURL:サーチ対象のページURL
  tType:ページの文字コード
  headURL:アドレス生成時に抜出データの前につけるURL
  parseDict:パース用キーワードが格納された辞書オブジェクト
    from1:該当データが大まかに含まれる部分を特定するための頭のキーワード
    to1:from1をどこまで検索するかのキーワード
    from2:該当アドレスを個別に抜き出す際の共通する頭のキーワード
    to2:from2をどこまで検索するかのキーワード
  */

  var from1 = parseDict.from1;//大枠の指定
  var to1 = parseDict.to1;//大枠の終わり
  var from2 = parseDict.from2;//個別取得指定
  var to2 = parseDict.to2;//個別取得終わり

  //記録を格納するための空リスト
  var result_list = [];

  //URLに対しフェッチを行ってHTMLデータを取得する
  var UCD_html = UrlFetchApp.fetch(terminalURL).getContentText(tType);
  //大枠＞個別という具合にパースする
  var parse_big = Parser.data(UCD_html).from(from1).to(to1).build();

  //年月をyyyymmという形式に修正し、対象アドレスも取得したリストを作成し、返す
  var result = getYMList(parse_big,headURL,btmFlag);
  return result

}

function makeBufferList(targetText,headURL,reg,bufArray){
  console.log(targetText.match(reg)[1]);
  let pick_url = headURL + targetText.match(reg)[1];
  let fType = checkFileType(pick_url);
  if((fType==0)|(fType==4)){
    bufArray[1] = pick_url;
  }else{
    bufArray[0] = pick_url;
  }
  return bufArray
}

function makeRegList(){
  /*
  人口動態統計月報における死因簡単分類、感染症による死亡の名称が定まっていないため、これに対応する正規表現リストを作成する
  */
  let kantan_parts = '^（保管.*表）死亡数,性・年齢（５歳階級）,.*死因簡単分類.*,都道府県（.+都市再掲）,別$'.split(",")
  let infect_parts = '^（保管.*表）感染症による死亡数,死因（感染症分類）,都道府県（.+都市再掲）,別$'.split(",")

  let key_list = 'kantan,infect'.split(',');
  let reg_list = [kantan_parts,infect_parts];

  let reg_object = addItemToObject(new Object, key_list, reg_list);
  
  console.log(reg_object);

  return reg_object

}
//↑ここまで

function searchReg(fromText, regList){
  
  let reg_set = makeRegMix(regList);
  let target_reg = searchHead(fromText, reg_set);

  let result = 'dummy';
  let head_reg = 'dummy';

  head_reg = fromText.match(RegExp(target_reg))[0]
  //注意！！正規表現における.は「改行を含まない」ため、行をまたいだ検索を行おうとすると改行で止まり、nullを返す場合がある
  //また、基本的に最長データを目標とするため、最短データにするために*+の後に?をつける
  result = head_reg + '[\\s\\S]+?file-download(.+)"'

  
  console.log(result);

  return result
}

function makeGeppouBuffer(fromText, regCategory, headURL){
  /*
  月報において必要なリンクアドレスを書いたリストを作成する
  */
  let regLink = searchReg(fromText, regCategory);
  let data_text = fromText.match(RegExp(regLink))[0];
  console.log(data_text);

  //なぜか結果記録配列が元関数においておくと変化してしまうためこの関数内で新規に生成することにした
  //変数を渡す場合、変数のメモリアドレスを渡しているため、これに注意する必要がある
  return makeBufferList(data_text,headURL,regLink,['-','-'])
}

function getGeppouDataList(address="https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&toukei=00450011&tstat=000001028897&cycle=1&year=20130&month=24101212&tclass1=000001053058&tclass2=000001053060&result_back=1&cycle_facet=tclass1%3Acycle&tclass3val=0&metadata=1&data=1"){
  /*月報のデータを抜き出していく、CSVとEXCELファイルがあるため、どちらも取得し、1列目にCSV、2列目にEXCELを配置する
  最終的には[[年月,元アドレス,死亡CSV,死亡EXCEL,感染症CSV,感染症EXCEL],,,,]というリストになる
  月報は月や集計年によって対象データの表記の仕方が違うため、必要な正規表現を複数用意してから望むこと
  */
  //API呼び出し時はfunctionとしてリストが与えられるため、それを考慮
  if(Array.isArray(address)){
    address = address[0];
  }
  var geppou_reg_obj = makeRegList();

  var parseDict = {
    'from1':'<div class="stat-dataset_list-body">',
    'to1':'<span id="functionId">disp_toukeih</span>',
    //'reg_kantan':geppou_reg_obj.kantan,
    //'reg_infect':geppou_reg_obj.infect
  }

  //各必要ファイルの正規表現をparseDictに自動追加する
  for(let element of Object.keys(geppou_reg_obj)){
    parseDict['reg_'+element] = geppou_reg_obj[element];
  }

  console.log(parseDict);

  var from1 = parseDict.from1;
  var to1 = parseDict.to1;

  var headURL = 'https://www.e-stat.go.jp/stat-search/file-download';
  var tType = 'UTF-8';//該当ページの文字コード

  var result = [];

  let target_url = address;

  let UCD_html = UrlFetchApp.fetch(target_url).getContentText(tType);
  let parse_big = Parser.data(UCD_html).from(from1).to(to1).build();

  const kantan_buf = makeGeppouBuffer(parse_big, parseDict.reg_kantan, headURL);
  console.log(kantan_buf);

  const infect_buf = makeGeppouBuffer(parse_big, parseDict.reg_infect, headURL);
  console.log(infect_buf);

  console.log(kantan_buf.slice(0).concat(infect_buf));
  return [kantan_buf.concat(infect_buf)]
  
}

function getSokuhouDataList(address="https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&data=1&metadata=1&cycle=1&toukei=00450011&tstat=000001028897&tclass1=000001053058&tclass2=000001053059&cycle_facet=tclass1%3Acycle&tclass3val=0&year=20130&month=11010301&result_back=1"){
  /*速報のデータを抜き出していく、PDFとEXCELファイルがあるため、どちらも取得し、1列目にEXCEL、2列目にPDFを配置する
  最終的には[[年月,元アドレス,EXCEL,PDF],,,,]というリストになる
  */
  //API呼び出し時はfunctionとしてリストが与えられるため、それを考慮
  if(Array.isArray(address)){
    address = address[0];
  }
  var parseDict = {
    'from1':'<div class="stat-dataset_list-main">',
    'to1':'<div style="display: none">',
    'reg':'file-download(.+?)"'
  }

  var from1 = parseDict.from1;
  var to1 = parseDict.to1;
  var reg = parseDict.reg;

  var headURL = 'https://www.e-stat.go.jp/stat-search/file-download';
  var tType = 'UTF-8';//該当ページの文字コード

  var result = [];

  let buf_list = ['-','-'];

  let target_url = address;

  let UCD_html = UrlFetchApp.fetch(target_url).getContentText(tType);
  let parse_big = Parser.data(UCD_html).from(from1).to(to1).build();

  let data_text_list = parse_big.match(RegExp(reg,'g'));
  console.log(data_text_list);

  if(data_text_list.length==1){

    buf_list = makeBufferList(data_text_list[0],headURL,reg,buf_list)
  }else if(data_text_list.length>1){

    for(let j=0; j < data_text_list.length; j++){
      buf_list = makeBufferList(data_text_list[j],headURL,reg,buf_list);
    }
  }else{
    return "処理が不適切です、確認してください。"
  }

  console.log(buf_list);
  return [buf_list]
}

function getRootAddress(rFlag = '速報',bottomYear = '２０１') {
  //下限数字の初期処理
  //文字列型だった場合数字として扱う

  //API呼び出し時はfunctionとしてリストが与えられる、複数要素であればそのままの状態でok
  
  let checkYear = convertYearString(bottomYear);
  let pastYear;

  let tableURL = 'dummy';
  let to1_str = 'dummy';
  //月報に関して一連の流れを統括する関数、流れとしては各月報を保管するアドレスを特定し、保管するアドレスから目的のアドレスを抽出する
  if(rFlag=='月報'){
    pastYear = 2009;
    tableURL = 'https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&toukei=00450011&tstat=000001028897&cycle=1&tclass1=000001053058&tclass2=000001053060&cycle_facet=tclass1%3Acycle&tclass3val=0&metadata=1&data=1';
  }else if(rFlag=='速報'){
    pastYear = 2010;
    tableURL = 'https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&toukei=00450011&tstat=000001028897&cycle=1&tclass1=000001053058&tclass2=000001053059&cycle_facet=tclass1%3Acycle&tclass3val=0&metadata=1&data=1';
  }else{
    return "入力文字列が不適です。月報もしくは速報と入力してください。"
  }

  bottomYear = checkYearRange(checkYear,pastYear);

  let mostBottomFlag = new Boolean;

  if(bottomYear==pastYear){
    to1_str = '<div style="display: none">'
    mostBottomFlag = true;
  }else{
    to1_str = `<span>${bottomYear-1}年</span>`;
    mostBottomFlag = false;
  }
  console.log(to1_str);

  var parse_dict = {
    'from1':'<div class="stat-cycle_sheet">',
    'to1':to1_str,
    'from2':'href="/stat-search/files?page=1&amp;layout=datalist&amp;cycle=1&amp;toukei=00450011',
    'to2':'" class="stat-item_child">'
  }

  var head_url = 'https://www.e-stat.go.jp';

  var tType = 'UTF-8';//該当ページの文字コード

  //各データの大本となるアドレスをリストで取得する
  let addr_list = getTerminalList(tableURL, tType, head_url, parse_dict, mostBottomFlag);

  console.log(addr_list);

  return addr_list

}
