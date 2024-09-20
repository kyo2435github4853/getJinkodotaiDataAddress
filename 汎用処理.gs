//組み合わせをメソッド化する
//参考：　http://www2.nagano.ac.jp/hiraoka/PL/l/js.gakkou.html
//↓ここから
function pickEach(a) {
  // console.log(a)
  if(a.length<=0) return []
  else {
    let top=a[0], rest=a.slice(1)
    return [[top,rest]].concat(pickEach(rest).map(([t,r])=>[t,[top].concat(r)]))
  }
}

Array.prototype.perm = function(){
  //console.log(this);
  return this.length<=0 ? [[]] :
    pickEach(this).map(([top,rest])=>rest.perm().map(l=>[top].concat(l))).flat()
}

//↑ここまで

//人口動態統計における書類の特定に使う正規表現を生成する
//↓ここから
function makeRegMix(parts_list){
  /*
  正規表現パーツリストから正規表現の組み合わせを生成する
  */
  let head = "";
  let tail = "";
  let result = [];
  let middle_list = [];

  //頭か尻かを判断する
  for(let i=0; i < parts_list.length; i++){
    if(parts_list[i].slice(0,1) == "^"){
      head = parts_list[i].slice(1);
    }else if(parts_list[i].slice(-1) == "$"){
      tail = parts_list[i].slice(0,-1);
    }else{
      middle_list.push(parts_list[i]);
    }
  }

  //middle_listの組み合わせを網羅するリストを作成する
  middle_set = middle_list.perm()
  //console.log(middle_set);

  for(let m_parts of middle_set){
    m_parts.unshift(head);
    result.push(m_parts.join("[，・]*") + tail);
  }

  console.log(result);
  return result

}

//人口動態統計におけるファイルタイプを確認する
function checkFileType(target_text){
  console.log(target_text.slice(-1))
  var fType = Number(target_text.slice(-1));
  return fType
}

//入力した対象年データを適切に処理する
function convertYearString(yStr='2０１3.05'){
  /*
  入力した年データを適切に前処理する
  */
  let checkYear;
  let checkObjectType = Object.prototype.toString.call(yStr);
  if(checkObjectType == '[object String]'){
    checkYear = yStr.slice(0);
    let zenkaku_number = '１,２,３,４,５,６,７,８,９,０,．'.split(',');
    let hankaku_number = '1,2,3,4,5,6,7,8,9,0,\.'.split(',')
    zenkaku_number.map(function(v,idx,arr){
      checkYear = checkYear.replace(RegExp(v,'g'),hankaku_number[idx])
    })
    checkYear = Number(checkYear);
    //console.log(checkYear);
  }else if(checkObjectType == "[object Number]"){
    checkYear = yStr;
  }else{
    throw new TypeError('不適切なデータ型が入力されています。数字のみを入力してください。');
  }

  //小数点以下が入力されていた場合は四捨五入
  //小数第13位までが0で14位以降に数字が入っていた場合、Math.ceilで切り上げられない
  if((checkYear - Math.ceil(checkYear)) < 0){
    console.log(checkYear - Math.ceil(checkYear));
    checkYear = Math.round(checkYear);
  }

  console.log(checkYear);
  return checkYear

}

function checkYearRange(yearData,mostPastRecYear,nenpouFlag=false){
  /*
  取得する年の範囲を確認し、適切かどうか判断する
  yearData:取得する年の下限
  mostPastRecYear:過去データの下限年、年報、速報、月報によってそれぞれ違う
  nenpouFlag:年報だった場合、必ず昨年以前になるためこれを判断する
  */

  //最新年を取得する
  let lastRecYear = new Date().getFullYear();

  //年報だった場合、最新-1
  if(nenpouFlag){
    lastRecYear -= 1;
  }

  //入力された最下限年について値が適切か確認する
  mostPastRecYear = convertYearString(mostPastRecYear);

  if(yearData<=mostPastRecYear){
    console.log(`取得下限年が過小のため、${mostPastRecYear}に設定します。`);
    yearData = mostPastRecYear;
  }else if(yearData >= lastRecYear){
    console.log(`取得下限年が過大のため、${lastRecYear}に設定します。`);
    yearData = lastRecYear;
  }else{
    console.log('適切な値です。')
  }

  console.log(`今回の処理では${yearData}年から${lastRecYear}年までのデータを保管するページのアドレスを取得します。`)
  return yearData
}

//オブジェクトに要素を追加する、関数が指定されていた場合、dataを第一引数として関数を適用する
function addItemToObject(obj, keyList, dataList, fun = undefined, args = undefined){
  /*
  対象オブジェクトにkey名でdataを追加する
  */
  if(keyList.length != dataList.length){
    throw new RangeError(`keyの要素数(${keyList.length})とdataの要素数(${dataList.length})が一致しません。`);
  }
  if(fun !== undefined){
    if(args === undefined){
      for(let i=0; i < keyList.length; i++){
        obj[keyList[i]] = fun(dataList[i]);
      }
    }else{
      for(let i=0; i < keyList.length; i++){
        obj[keyList[i]] = fun(dataList[i],args);
      }
    }
  }else{
    for(let i=0; i < keyList.length; i++){
      obj[keyList[i]] = dataList[i];
    }
  }

  return obj
}