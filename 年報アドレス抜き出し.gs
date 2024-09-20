function getNenpouYearList(parseData,headURL,btmYear=2013){
  /*
  抜き出した人口動態統計管理HTMLから年をyyyy形式で抜き出す
  */
  console.log(headURL);
  var year_parse = Parser.data(parseData).from('<a tabindex="22"').to('</div>').iterate();
  console.log(year_parse.length);
  //match正規表現中の()によるグループ囲みを行うと、グループの内容がそれぞれリストとして取り出すことができる
  //gフラグなどはつけ外しを動的に行いたい場合はRegExp()で指定すること
  var y_reg = /class="stat-item_child">([0-9]+)年/;
  
  var result_list = [];
  var y_data = "dummy";
  var y_text_buf = "dummy";

  for(let i=0; i < year_parse.length-1; i++){
    //年データを取得する
    y_text_buf = year_parse[i];
    y_data = y_text_buf.match(y_reg);
    //console.log(y_data);

    //デフォルトでは2012年以前のものは取得しない
    if(btmYear>1980){
      if(Number(y_data[1])<btmYear){
        break;
      }
    }

    //該当年のURLを取得する
    //yyyymm形式になるようにデータを整理する
    match_list = y_text_buf.match(/href="(.+?)"/);
    //console.log(match_list);
    catch_url = headURL+match_list[1]

    result_list.push([y_data[1],catch_url.replace(/&amp;/g,'&')])
  
  }

  let log_text = `最終時点での要素数は ${result_list.length}`;
  console.log(log_text);

  return result_list

}

function getNenpouTerminal(terminalURL,tType,headURL,parseDict,btmYear=2013){
  /*各指定から記録元HTMLのリストを作成する
  この際、年も一緒に取得し、年とアドレスが一致するようにする
  terminalURL:サーチ対象のページURL
  tType:ページの文字コード
  headURL:アドレス生成時に抜出データの前につけるURL
  parseDict:パース用キーワードが格納された辞書オブジェクト
    from1:該当データが大まかに含まれる部分を特定するための頭のキーワード
    to1:from1をどこまで検索するかのキーワード
    from2:該当アドレスを個別に抜き出す際の共通する頭のキーワード
    to2:from2をどこまで検索するかのキーワード
  */

  console.log(parseDict);

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
  var result = getNenpouYearList(parse_big,headURL,btmYear);
  return result

}

function getNenpouRoot(tableURL = 'https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&toukei=00450011&tstat=000001028897&cycle=7&tclass1=000001053058&tclass2=000001053061&tclass3=000001053074&tclass4=000001053089&tclass5val=0', btmYear = 2013) {
  //年報の特定項目の年別リストを作成する
  
  //取得年でパラメタを変える必要があるため、辞書で管理する
  var parse_dict = {
    'from1':'<div class="stat-cycle_sheet">',
    'to1':'<div style="display: none">',
    'from2':'href="/stat-search/files?page=1&amp;layout=datalist&amp;cycle=1&amp;toukei=00450011',
    'to2':'" class="stat-item_child">'
  }

  var head_url = 'https://www.e-stat.go.jp';

  var tType = 'UTF-8';//該当ページの文字コード

  //各データの大本となるアドレスをリストで取得する
  let addr_list = getNenpouTerminal(tableURL,tType,head_url,parse_dict,btmYear);

  console.log(addr_list);

  return addr_list

}

function makeNenpouRootDict(outputDict, category, target_list){
  /*
  対象の年一覧リストを適切な辞書形式に整理する
  */
  
  for(let i=0; i < target_list.length; i++){
    if(target_list[i][0] in outputDict){
      let data_obj = outputDict[target_list[i][0]];
      data_obj[category] = target_list[i][1];
      outputDict[target_list[i][0]] = data_obj;
    }else{
      outputDict[target_list[i][0]] = {[category]:target_list[i][1]};
    }
    
  }

  console.log(outputDict);

  return outputDict
}

function makeNenpouOutputList(data_obj){
  /*
  年毎の一覧ページアドレスをスプレッドシートに出力できるように編集する
  */
  let output_list = [];
  let setup_dict = new Object;
  for(let element of Object.keys(data_obj)){
    console.log(element);
    setup_dict = makeNenpouRootDict(setup_dict, element, data_obj[element])
  }

  for(let year of Object.keys(setup_dict)){
    let buf_list = [];
    let year_obj = setup_dict[year];
    //console.log(year_obj);
    let key_list = Object.keys(year_obj);
    //console.log(key_list);
    for(let key of key_list){
      //console.log(year_obj[key]);
      buf_list.push(year_obj[key]);
    }
    
    output_list.push([year].concat(buf_list));
    console.log(output_list);
  }

  console.log(output_list);
  return output_list
  
}

function getNenpouTargetRoot(bottomYear = 2013){
  /*
  取得したいデータの年一覧を取得する
  */

  //下限数字の初期処理
  //文字列型だった場合数字として扱う
  let checkYear = convertYearString(bottomYear);

  bottomYear = checkYearRange(checkYear,1980,new Date().getFullYear(),nenpouFlag=true);  

  //let target_data_obj = new Object;
  let pref_death_url = 'https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&toukei=00450011&tstat=000001028897&cycle=7&tclass1=000001053058&tclass2=000001053061&tclass3=000001053074&tclass4=000001053089&tclass5val=0';
  let death_data_url = 'https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&toukei=00450011&tstat=000001028897&cycle=7&tclass1=000001053058&tclass2=000001053061&tclass3=000001053065&cycle_facet=tclass1&tclass4val=0&metadata=1&data=1';
  let death_detail_url = 'https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&toukei=00450011&tstat=000001028897&cycle=7&tclass1=000001053058&tclass2=000001053061&tclass3=000001053073&tclass4=000001053082&tclass5val=0';

  let obj_key_list = 'pref,death_all,death_detail'.split(',');
  let obj_url_list = [pref_death_url,death_data_url,death_detail_url];

  /*
  for(let i=0; i < obj_key_list.length; i++){
    target_data_obj[obj_key_list[i]] = getNenpouRoot(obj_url_list[i]);
  }
  */

  let target_data_obj = addItemToObject(new Object, obj_key_list, obj_url_list, getNenpouRoot, Number(bottomYear));

  return makeNenpouOutputList(target_data_obj);

}
