var Common = (function(){

  var vendor = (navigator.userAgent.match(/(Chrome|Firefox)/) || [])[1];

  var _country = '';
  var _credits = -1;
  var _config = {};
  var _plan = {};

  var keywordsStorage = {};

  /**
   * [processKeywords description]
   * @param  {object} params          {keywords, src, tableNode}
   * @param  {function} cbProcessResult
   */
  var processKeywords = function( params, cbProcessResult ){
    var keywords = params.keywords;
    if (params.noCheckCredits) {}
    else if (keywords.length > _credits) {
      var resData = [];
      keywords.map(function(keyword, i){
        resData.push({keyword: keyword, vol: '-', cpc: '-', competition: '-'});
      });
      cbProcessResult({error: true, error_code: 'NOCREDITS', data: resData}, keywords);
      return;
    }
    var useGlobal = !!params.global;
    var queue = splitKeywords(keywords);
    for (var i = 0, len = queue.length; i < len; i++) {
      var requestKeywords = queue[i];
      (function (list) {
        var data = {
          keywords: requestKeywords,
          src: params.src,
          global: useGlobal
        };
        if (params.from) data.from = params.from;
        if (params.seed) data.seed = params.seed;
        chrome.runtime.sendMessage({
          cmd: 'api.getKeywordData',
          data: data
        }, function( json ){
          if (typeof UIHelper !== 'undefined') UIHelper.checkErrors(json, params.tableNode);
          cbProcessResult( json, list );
        });
      })(requestKeywords);
    }
  };


  var splitKeywords = function( keywords ){
    var URL_LEN_LIMIT = 1850;
    // &kw%5B%5D=
    var extraLen = 10;
    var queue = [];
    var request = [];
    var count = 0;
    for (var i = 0, len = keywords.length; i < len; i++) {
      var keyword = keywords[i];
      if (count + extraLen + encodeURIComponent(keyword).length > URL_LEN_LIMIT || request.length >= 20) {
        queue.push(request);
        request = [];
        count = 0;
      }
      request.push(keyword);
      count += encodeURIComponent(keyword).length + extraLen;
    }
    queue.push(request);
    return queue;
  };


  var cleanKeyword = function( keyword ){
    if (!keyword) return '';
    var res = keyword;
    // https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
    // "dégustation vins paris" should be "degustation vins paris"
    res = res.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    res = res.replace(/[^-\w.& ]/g, '');
    res = res.replace(/\./g, ' ');
    res = res.replace(/[-_]/g, ' ');
    res = res.replace(/\s+/g, ' ');
    return $.trim(res);
  };


  var getResultStr = function( data, params ){
    var useLong = false;
    if (typeof params === 'string') useLong = true;
    else if (!params) params = {};
    if (params.useLong) useLong = params.useLong;

    if (data.vol === '-') return '';
    var settings = Starter.getSettings();
    var res = [];
    if (settings.metricsList.vol) {
      var val = '';
      if (useLong) val = 'Search Volume: ';
      res.push(val + data.vol + '/mo');
    }
    if (settings.metricsList.cpc && data.cpc !== '-') {
      if (useLong) res.push(' CPC: ' + data.cpc);
      else res.push(data.cpc);
    }
    if (settings.metricsList.comp) {
      if (useLong) res.push(' Competition: ' + data.competition);
      else res.push(data.competition);
    }
    if (settings.metricsList.trend) {
      var trendParams;
      if (params.trendSizeFactor) {
        trendParams = {};
        trendParams.sizeFactor = params.trendSizeFactor;
      }
      var trendImgHTML = getTrendImgHTML(data.trend, false, trendParams);
      if (trendImgHTML) res.push(trendImgHTML);
    }
    return res.join(' - ');
  };


  var getResultStrType2 = function(data, extra){
    if (data.vol === '-') return '';
    if (!extra) extra = {};
    var settings = Starter.getSettings();
    var res = [];
    if (settings.metricsList.vol) {
      res.push('Volume: ' + data.vol + '/mo');
    }
    if (settings.metricsList.cpc) {
      res.push('CPC: ' + data.cpc);
    }
    if (settings.metricsList.comp) {
      res.push('Competition: ' + data.competition);
    }
    if (settings.metricsList.trend) {
      var trendImgHTML = getTrendImgHTML(data.trend, extra.darkMode);
      if (trendImgHTML) res.push(trendImgHTML);
    }
    if (!res.length) return '';
    return res.join(' | ');
  };


  var getTrendPercent = function(trendStr, params){
    var vals = trendStr.split('|');
    if (params && params.moz) vals.pop(); // moz data ends with |
    vals = vals.reverse();
    var now = vals[0];
    var len = vals.length;
    var was = len >= 12 ? vals[12] : vals[len - 1];
    var percent = Math.round((now - was) * 100 / was);
    return percent >= 0 ? '+' + percent : percent;
  };


  var parseTrendStr = function(trendStr, params){
    var vals = trendStr.split('|');
    if (params && params.moz) vals.pop(); // moz data ends with |
    var months = vals.length;
    var date = new Date();
    date.setDate(15); // to fix the problem with setMonth for Feb 30
    date.setMonth(date.getMonth() - months);
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May","Jun","Jul", "Aug", "Sep", "Oct", "Nov","Dec"];
    if (!params || params.reverse) vals = vals.reverse();
    var res = [];
    vals = vals.map(val => {
      val = parseInt(val) || 0;
      var str = monthNames[date.getMonth()] + ' ' + date.getFullYear();
      res.push({date: str, val: val});
      date.setMonth(date.getMonth() + 1);
    });
    return res;
  };


  var getTrendImgHTML = function(trendStr, dark, params){
    var trendImg = getTrendImgData(trendStr, dark, params);
    if (params && params.notitle) trendImg.title = '';
    if (trendImg) return '<img class="xt-trend-img" src="' + trendImg.src + '" title="' + trendImg.title + '">';
    else return '';
  };


  var getTrendImgData = function(trendStr, dark, params){
    if (!trendStr) return '';
    var sizeFactor = 1;
    if (params && params.sizeFactor) sizeFactor = params.sizeFactor;
    var COLUMN_W = 3*sizeFactor;
    var SPACE = 0.6*sizeFactor;
    if (params && typeof params.space !== 'undefined') SPACE = params.space;
    if (params && typeof params.columnW !== 'undefined') COLUMN_W = params.columnW;
    var maxVal = 0;
    var noValues = true;
    var title = [];
    var date = new Date();
    var vals = trendStr.split('|');
    if (params && params.moz) vals.pop(); // moz data ends with |
    var months = vals.length;
    if (months !== 12) {
      console.log('Investigate trend str', months);
    }
    var CANVAS_W = COLUMN_W * months;
    var CANVAS_H = 10 * sizeFactor;
    date.setDate(15); // to fix the problem with setMonth for Feb 30
    date.setMonth(date.getMonth() - months);
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May","Jun","Jul", "Aug", "Sep", "Oct", "Nov","Dec"];
    if (!params || params.reverse) vals = vals.reverse();
    vals = vals.map(val => {
      val = parseInt(val) || 0;
      if (val > 0) noValues = false;
      if (val > maxVal) maxVal = val;
      var str = monthNames[date.getMonth()] + ' ' + date.getFullYear() + ' - ' + val.toLocaleString();
      title.push(str);
      date.setMonth(date.getMonth() + 1);
      return val;
    });
    if (noValues) return '';
    if (!maxVal) maxVal = CANVAS_H - 1;
    var heightRatio = (CANVAS_H - 1) / maxVal;
    var canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    if (canvas.getContext) {
      var ctx = canvas.getContext('2d');
      vals.map((val, index) => {
        var margin = index * COLUMN_W;
        var h = Math.round(val*heightRatio) + 1;
        if (h === 0) h = 1;
        var w = COLUMN_W - SPACE*2;
        var x = margin + SPACE;
        var y = CANVAS_H - h;
        if (params && params.color) ctx.fillStyle = params.color;
        else if (dark) ctx.fillStyle = '#aaaaaa';
        else ctx.fillStyle = "#5e9ce4";
        ctx.fillRect(x, y, w, h);
      });
    }
    var dataURL = canvas.toDataURL();
    return {
      src: dataURL,
      title: title.join('\n')
    };
  };


  var getTrendVals = function(trendStr){
    if (!trendStr) return Array(12).fill('');
    var vals = trendStr.split('|').reverse().map(val => {
      val = parseInt(val) || 0;
      val = val.toLocaleString();
      return val;
    });
    return vals;
  };


  var getTrendTitles = function(){
    var date = new Date();
    date.setMonth(date.getMonth() - 12);
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May","Jun","Jul", "Aug", "Sep", "Oct", "Nov","Dec"];
    var res = [];
    for (var i = 0; i < 12; i++) {
      var str = monthNames[date.getMonth()] + ' ' + date.getFullYear();
      date.setMonth(date.getMonth() + 1);
      res.push({title: str});
    }
    return res;
  };


  var processEmptyData = function(json, $node){
    if (json.ext_error) {
      // // Since we now want to encourage free users to get data without registering for an API key, let's remove this message
      //
      // var html = json.ext_error;
      // if (html === 'Please setup a valid API key') {
      //   html = '<a href="https://keywordseverywhere.com/first-install-addon.html" target="_blank">Please setup a valid API key</a>';
      // }
      // $node.html(html);
    }
    // Since now we have paid & free users, we need to be careful not to show this to free users, as it implies that the keyword does not have any volume.
    // else $node.html('No search volume');
  };


  var appendStar = function(html, data, method){
    if (!method) method = 'append';
    var state = data.fav ? 'on' : 'off';
    var $star = $('<span/>', {
      class: 'xt-star',
      "data-state": state,
      "data-keyword": data.keyword
    });
    UIHelper.addBrowserClass($star);
    if (typeof html === 'string') {
      if (html.indexOf('xt-star') !== -1) return;
      if (method === 'prepend') html = $star[0].outerHTML + html;
      else html += $star[0].outerHTML;
    }
    else {
      if (!(html instanceof jQuery)) html = $(html);
      if (html.find('.xt-star')[0]) return;
      html[method]($star);
    }
    addKeywords(data.keyword, data);
    return html;
  };


  var appendKeg = function(html, json, data, method){
    if (json.showSearchIcon !== 1) return html;
    if (!method) method = 'append';
    var $keg = $('<a/>', {
      class: 'xt-keg',
      "data-keyword": data.keyword
    });
    if (json.searchIconLink) {
      var href = json.searchIconLink.replace('#query#', encodeURIComponent(data.keyword));
      $keg.attr('href', href);
    }
    if (json.searchIconImage) {
      $keg.css('background-image', 'url(' + json.searchIconImage + ')');
    }
    UIHelper.addBrowserClass($keg);
    if (typeof html === 'string') {
      if (html.indexOf('xt-keg') !== -1) return;
      if (method === 'prepend') html = $keg[0].outerHTML + html;
      else html += $keg[0].outerHTML;
    }
    else {
      if (!(html instanceof jQuery)) html = $(html);
      if (html.find('.xt-keg')[0]) return;
      html[method]($keg);
    }
    return html;
  };


  var appendLTKBtn = function(html, params){
    let country = (Starter.getSettings().country || '').toUpperCase();
    let countryTitle = country ? `(${country})` : '';
    let btnURL = chrome.runtime.getURL(`html/page.html?page=autocomplete&query=${encodeURIComponent(params.query)}&service=${params.service}`);
    if (params.tld) btnURL += '&tld=' +  params.tld;
    if (params.lng) btnURL += '&lng=' +  params.lng;
    let title = 'Find long-tail keywords for';
    if (params.title) title = params.title;
    html += `<a href="${btnURL}" class="xt-ltkbtn-str" target="_blank">${title}<span>"${params.query}"${countryTitle? ' ' + countryTitle : ''}</span></a>`;
    return html;
  };


  var appendListBtn = function(html, params){
    let country = (Starter.getSettings().country || '').toUpperCase();
    let countryTitle = country ? `(${country})` : '';
    let btnURL = chrome.runtime.getURL(`html/page.html?page=list&query=${encodeURIComponent(params.query)}&service=${params.service}`);
    if (params.tld) btnURL += '&tld=' +  params.tld;
    if (params.lng) btnURL += '&lng=' +  params.lng;
    let title = '';
    if (params.title) title = params.title;
    html += `<a href="${btnURL}" class="xt-listbtn-str" target="_blank">${title}</span></a>`;
    return html;
  };


  var highlight = function(params){
    if (!params) params = {};
    var vol = params.vol;
    var cpc = params.cpc;
    var comp = params.competition;
    if (vol === '-') return false;
    if (vol) vol = parseInt(vol.replace(/[,.\s]/g, ''));
    if (cpc) cpc = parseFloat(cpc.replace(/[^\d,.]/g, '').replace(',', '.'));
    if (comp) comp = parseFloat(comp);
    var settings = Starter.getSettings();
    if (!settings.highlightCPC && !settings.highlightVolume && !settings.highlightComp) return false;
    var resVol = false;
    var resCPC = false;
    var resComp = false;
    if (settings.highlightCPC && cpc >= 0) {
      if (settings.highlightCPCCond === 'eq' && cpc == settings.highlightCPCValue) resCPC = true;
      if (settings.highlightCPCCond === 'lt' && cpc < settings.highlightCPCValue) resCPC = true;
      if (settings.highlightCPCCond === 'gt' && cpc > settings.highlightCPCValue) resCPC = true;
      if (typeof settings.highlightCPCValueSec === 'number' && resCPC) {
        if (settings.highlightCPCCondSec === 'eq' && cpc != settings.highlightCPCValueSec) resCPC = false;
        if (settings.highlightCPCCondSec === 'lt' && cpc > settings.highlightCPCValueSec) resCPC = false;
        if (settings.highlightCPCCondSec === 'gt' && cpc < settings.highlightCPCValueSec) resCPC = false;
      }
    }
    else resCPC = true;

    if (settings.highlightVolume && vol >= 0) {
      if (settings.highlightVolumeCond === 'eq' && vol == settings.highlightVolumeValue) resVol = true;
      if (settings.highlightVolumeCond === 'lt' && vol < settings.highlightVolumeValue) resVol = true;
      if (settings.highlightVolumeCond === 'gt' && vol > settings.highlightVolumeValue) resVol = true;
      if (typeof settings.highlightVolumeValueSec === 'number' && resVol) {
        if (settings.highlightVolumeCondSec === 'eq' && vol != settings.highlightVolumeValueSec) resVol = false;
        if (settings.highlightVolumeCondSec === 'lt' && vol > settings.highlightVolumeValueSec) resVol = false;
        if (settings.highlightVolumeCondSec === 'gt' && vol < settings.highlightVolumeValueSec) resVol = false;
      }
    }
    else resVol = true;

    if (settings.highlightComp && comp >= 0) {
      if (settings.highlightCompCond === 'eq' && comp == settings.highlightCompValue) resComp = true;
      if (settings.highlightCompCond === 'lt' && comp < settings.highlightCompValue) resComp = true;
      if (settings.highlightCompCond === 'gt' && comp > settings.highlightCompValue) resComp = true;
      if (typeof settings.highlightCompValueSec === 'number' && resComp) {
        if (settings.highlightCompCondSec === 'eq' && comp != settings.highlightCompValueSec) resComp = false;
        if (settings.highlightCompCondSec === 'lt' && comp > settings.highlightCompValueSec) resComp = false;
        if (settings.highlightCompCondSec === 'gt' && comp < settings.highlightCompValueSec) resComp = false;
      }
    }
    else resComp = true;
    if (resCPC && resVol && resComp) return settings.highlightColor;
    else return false;
  };


  var setPlan = function(val){
    _plan = val;
  };


  var getPlan = function(){
    return _plan;
  };


  var setConfig = function(val){
    _config = val;
  };


  var getConfig = function(){
    return _config;
  };


  var setCredits = function(val){
    _credits = val;
  };


  var getCredits = function(){
    return _credits;
  };


  var setCountry = function(country){
    _country = country;
  };


  var getCountry = function(){
    return _country;
  };


  var clearKeywordsStorage = function(){
    keywordsStorage = {};
  };


  var addKeywords = function(keywords, data){
    if (typeof keywords === 'object') {
      keywords.map(function(keyword){
        keywordsStorage[keyword] = keywords[keyword];
      });
    }
    else keywordsStorage[keywords] = data;
  };


  var exportKeywords = function(){
    var metricsList = Starter.getSettings().metricsList;
    var $result = $('<table>');
    var $tr = $('<tr>').appendTo($result);
    $tr.append('<th>Keyword</th>');
    if (metricsList.vol) $tr.append('<th>Vol</th>');
    if (metricsList.cpc) $tr.append('<th>CPC</th>');
    if (metricsList.comp) $tr.append('<th>Comp</th>');
    if (metricsList.trend) {
      getTrendTitles().map(function(item){
        $tr.append('<th>' + item.title + '</th>');
      });
    }
    for (var keyword in keywordsStorage) {
      var $tr = $('<tr>').appendTo($result);
      var data = keywordsStorage[keyword];
      $('<td>').text(keyword).appendTo($tr);
      if (metricsList.vol) $('<td>').text(data.vol.replace(/,/g, '')).appendTo($tr);
      if (metricsList.cpc) $('<td>').text(data.cpc).appendTo($tr);
      if (metricsList.comp) $('<td>').text(data.competition).appendTo($tr);
      if (metricsList.trend) {
        getTrendVals(data.trend).map(function(val){
           $('<td>').text(val).appendTo($tr);
        });

      }
    }
    var filename = document.location.host + '_' + Date.now() + '.csv';
    exportTableToCSV({table: $result, filename: filename});
  };


  var uploadKeywords = function(cbProcessResult){
    var keywords = Object.keys( keywordsStorage );
    if (!keywords.length) {
      cbProcessResult({error: false});
      return;
    }
    chrome.runtime.sendMessage({
      cmd: 'api.addKeywords',
      data: keywords
    }, cbProcessResult);
  };


  var uploadKeywordsList = function(keywords, cbProcessResult){
    chrome.runtime.sendMessage({
      cmd: 'api.addKeywords',
      data: keywords
    }, cbProcessResult);
  };


  var getMetricsNumber = function(){
    var metricsList = Starter.getSettings().metricsList;
    var metricsNumber = 0;
    for (var key in metricsList) {
      if (metricsList[key]) metricsNumber++;
    }
    return metricsNumber;
  };


  var exportTableToCSV = function(params) {
    var $table = params.table;
    var filename = params.filename;
    var method = params.method;
    var $rows = $table.find('tr:has(td,th)');
    var tmpColDelim = String.fromCharCode(11);
    var tmpRowDelim = String.fromCharCode(0);
    var colDelim = '","';
    var rowDelim = '"\n"';
    if (method === 'copy') colDelim = '"\t"';
    if (getDecimalSeparator() === ',') colDelim = '";"';
    csv = '"' + $rows.map(function (i, row) {
      var $row = $(row),
      $cols = $row.find('td,th');
      return $cols.map(function (j, col) {
        var $col = $(col),
        text = $.trim( $col.text() );
        return text.replace(/"/g, '""'); // escape double quotes
      }).get().join(tmpColDelim);
    }).get().join(tmpRowDelim)
    .split(tmpRowDelim).join(rowDelim)
    .split(tmpColDelim).join(colDelim) + '"';
    if (method === 'copy') {
      clipboardWrite(csv);
      return;
    }
    if (vendor === 'Firefox') {
      chrome.runtime.sendMessage({
        cmd: 'file.download',
        data: {
          content: csv,
          name: filename
        }
      });
      return;
    }
    var csvData = 'data:application/csv;charset=utf-8,' + '\ufeff' + encodeURIComponent(csv);
    saveToFile(csvData, filename);
  };


  var getDecimalSeparator = function() {
    var decSep = ".";
    try {
      var sep = parseFloat(3/2).toLocaleString().substring(1,2);
      if (sep === '.' || sep === ',') {
        decSep = sep;
      }
    } catch(e){
      decSep = '.';
    }
    return decSep;
  };


  var saveToFile = function(fileContents, fileName) {
    var link = document.createElement('a');
    link.download = fileName;
    link.href = fileContents;
    link.click();
  };


  var clipboardWrite = function( text ){
    var textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.value = text;
    textarea.select();
    document.execCommand('copy');
    textarea.parentNode.removeChild(textarea);
  };


  var escapeHtml = function(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };


  var decodeHTMLEntities = function(str){
    return $('<textarea/>').html(str).text();
  };


  var shortenStr = function(str, len){
    if (str.length <= len) return str;
    else {
      return str.substr(0, len) + '…';
    }
  };


  var inject = function( fn, args ){
    if (!args) args = [];
    args = args.map(function(val){
      return '"' + val + '"';
    });
    var script = document.createElement('script');
    script.textContent = '(' + fn + ')(' + args.join(',') + ')';
    (document.head||document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);
  };



  var renderWidgetTable = function(rows, params){
    // console.log(params);
    var type = params.type;
    var json = params.json;
    var nocredits = params.nocredits;
    var title = params.title;
    var addTo = params.addTo;
    var addMethod = params.addMethod;
    var loadAll = params.loadAll;
    var rootSelector = params.rootSelector;
    var rootTagName = params.rootTagName || '<div>';
    var filename = params.filename;
    var darkMode = params.darkMode;
    var trendColumnName = params.trendColumnName || 'Trend';
    var iframeSrcParam = params.iframeSrcParam || '';
    var iframeSettingEnabledParam = params.settingEnabled;
    // console.log(json);
    var settings = Starter.getSettings();
    var country = (settings.country || '').toUpperCase();
    var apiKey = settings.apiKey || '';
    var metricsList = settings.metricsList;
    var keywordsPerPage = settings.widgetKeywordsPerPage || 'All';
    var pur = _credits > 0 ? 0 : 1;
    var excludeCols = params.excludeCols || [];
    var hasCPCColumn = metricsList.cpc && excludeCols.indexOf('cpc') === -1;
    var hasCompColumn = metricsList.comp && excludeCols.indexOf('cpc') === -1;
    var hasUsageColumn = rows && rows[0] && typeof rows[0].usage !== 'undefined';
    var html = [
      '<div class="xt-copy-export-row">',
        '<button class="xt-copy-csv xt-ke-btn">' + getIcon('copy') + ' Copy</button>',
        '<button class="xt-export-csv xt-ke-btn">' + getIcon('export') + ' Export</button>',
      '</div>',
      '<h3 class="' + (json ? '' : 'xt-ke-h-no-credits') + '"><img src="' + chrome.runtime.getURL('/img/icon24.png') + '" width="24" height="24" style="vertical-align:middle"> ' + title + '</h3>',
      '<table class="' + (json ? '' : 'xt-g-table-no-credits') + '">',
      '<thead><tr>'
    ];
    if (json) {
      var columnName = 'Keyword';
      if (params.columnName) columnName = params.columnName;
      html.push(
        '<th><span id="xt-widget-table-add-all" class="xt-star" data-state="off"></span></th>',
        '<th class="xt-widget-table-th-keyword">' + columnName + '</th>',
        metricsList.vol ? '<th>Vol' + (country ? ' (' + country + ')' : '') + '</th>' : '',
        hasCPCColumn ? '<th>CPC</th>' : '',
        hasCompColumn ? '<th>Cmp</th>' : '',
        metricsList.trend ? '<th>' + trendColumnName + '</th>' : '',
        hasUsageColumn ? '<th>Usage</th>' : ''
      );
    }
    else {
      var thHTML = '<th class="xt-widget-table-th-keyword"><div class="xt-ke-col-no-credits"><button class="xt-widget-load-all xt-ke-btn">Load Metrics (uses ' + rows.length + ' credits)</button>Keyword</div></th>';
      if (hasUsageColumn) {
        thHTML += '<th>Usage</th>';
      }
      html.push(thHTML);
    }
    html.push('</tr><thead><tbody>'),
    html = html.join('\n');
    var keywords = [];
    for (var i = 0, len = rows.length; i < len; i++) {
      var row = rows[i];
      var keyword = row.keyword;
      if (keyword.length > 100) continue;
      keywords.push(keyword);
      var keywordEnc = escapeHtml(keyword);
      var link;
      if (params.fnGenerateLink) {
        var url = params.fnGenerateLink(encodeURIComponent(keyword));
        link = '<a href="' + url + '">' + keywordEnc + '</a>';
      }
      else link = keyword;
      var tr = [
        '<td class="xt-widget-table-td-keyword" data-keyword="' + keywordEnc + '">' + appendKeg(link, {}, row) + '</td>',
      ];
      if (json) {
        tr = [
          '<td>' + appendStar('', row) + '</td>',
          '<td class="xt-widget-table-td-keyword" data-keyword="' + keywordEnc + '">' + appendKeg(link, json, row) + '</td>',
          metricsList.vol  ? '<td>' + formatLongNumber(row.vol) + '</td>' : '',
          hasCPCColumn  ? '<td>' + row.cpc + '</td>' : '',
          hasCompColumn ? '<td>' + row.competition + '</td>' : '',
        ];
        if (row.trendingValue) {
          tr.push('<td>+' + row.trendingValue + '%</td>');
        }
        else {
          tr.push(metricsList.trend ? '<td>' + Common.getTrendImgHTML(row.trend) + '</td>' : '');
        }
        if (row.usage) {
          tr.push('<td>' + row.usage + '</td>');
        }
        tr = tr.join('\n');
        var color = highlight(row);
      }
      else if (row.usage) {
        tr += '<td>' + row.usage + '</td>';
      }
      if (color) {
        tr = '<tr style="background:' + color + '">' + tr + '</tr>';
      }
      else tr = '<tr>' + tr + '</tr>';
      html += tr;
    }
    html += '</tbody></table>';
    if (!params.noPagination) {
    html += '<div class="xt-widget-pagination">' + getPaginationHTML({perPage: keywordsPerPage, rows: rows, currentPage: 1}) + '</div>';
    }
    var version = chrome.runtime.getManifest().version;
    var iframeSrc = 'https://keywordseverywhere.com/ke/widget.php?apiKey=' + apiKey + '&source=' + iframeSrcParam + '&enabled=' + iframeSettingEnabledParam + '&country=' + country + '&version=' + version + '&pur=' + pur + '&query=' + encodeURIComponent(Common.escapeHtml(params.query));
    if (params.darkMode) iframeSrc += '&darkmode=' + params.darkMode;
    html += '<div class="xt-widget-iframe"><iframe src="' + iframeSrc + '" scrolling="no"></div>';

    var $root = $('#' + rootSelector);
    if (!$root[0]) {
      $root = $(rootTagName, {id: rootSelector, class: 'xt-widget-table'});
      var addToNode;
      if (typeof addTo === 'object' && typeof addTo.map === 'function') {
        addTo.map(sel => {
          if (addToNode) return;
          if ($(sel).is(':visible')) addToNode = sel;
        });
      }
      else addToNode = addTo;
      $root[addMethod](addToNode);
      if (params.onAdded) params.onAdded($root);
    }
    $root.html(html);
    if (keywordsPerPage !== 'All') {
      showWidgetTablePage($root.find('table'), rows, keywordsPerPage, 1);
    }

    $root.append($('<div/>', {
      "class": 'xt-close'
    }).text('✖').click(function(e){
      $root.remove();
      if (params.onClosed) params.onClosed();
    }));

    $root.find('#xt-widget-table-add-all').click(function(e){
      var $parent = $(this).closest('.xt-widget-table');
      var $icons = $parent.find('.xt-star');
      $icons.addClass('xt-rotate');
      var state = this.dataset.state;
      var cmd = (state === 'on')? 'api.deleteKeywords' : 'api.addKeywords';
      var newState = (state === 'on') ? 'off' : 'on';
      chrome.runtime.sendMessage({
        cmd: cmd,
        data: keywords
      }, function(json){
        $icons.removeClass('xt-rotate');
        if (!json.error) {
          $icons.map(function(i, node){
            node.dataset.state = newState;
          });
        }
      });
    });

    $root.find('.xt-widget-load-all').click(function(e){
      var $this = $(this);
      var $parent = $this.closest('.xt-widget-table');
      if (nocredits || !apiKey) {
        chrome.runtime.sendMessage({
          cmd: 'new_tab',
          data: 'https://keywordseverywhere.com/credits.html'
        });
        return;
      }
      if (loadAll) loadAll.call(this, 'manual');
      $this.remove();
    });

    $root.find('.xt-copy-csv').click(function(e){
      e.preventDefault();
      var $parent = $(this).closest('.xt-widget-table');
      var table = $parent.find('table')[0];
      exportTable({table: table, filename: filename, method: 'copy'});
    });

    $root.find('.xt-export-csv').click(function(e){
      e.preventDefault();
      var $parent = $(this).closest('.xt-widget-table');
      var table = $parent.find('table')[0];
      exportTable({table: table, filename: filename});
    });

    $root.on('click', '[data-page]', function(e){
      e.preventDefault();
      var page = parseInt(this.dataset.page);
      var perPage = $root.find('.xt-widget-page-select').val();
      var html = getPaginationHTML({perPage: perPage, rows: rows, currentPage: page});
      $root.find('.xt-widget-pagination').html(html);
      var $table = $root.find('table');
      showWidgetTablePage($table, rows, perPage, page);
    });

    $root.on('change', '.xt-widget-page-select', function(e){
      var perPage = this.value;
      var html = getPaginationHTML({perPage: perPage, rows: rows, currentPage: 1});
      $root.find('.xt-widget-pagination').html(html);
      var $table = $root.find('table');
      showWidgetTablePage($table, rows, perPage, 1);
      chrome.runtime.sendMessage({
        cmd: 'setting.set',
        data: {
          key: 'widgetKeywordsPerPage',
          value: perPage
        }
      });
    });
  };


  var renderIframeHTML = function(params){
    var settings = Starter.getSettings();
    var country = (settings.country || '').toUpperCase();
    var apiKey = settings.apiKey || '';
    var pur = _credits > 0 ? 0 : 1;
    var iframeSettingEnabledParam = params.settingEnabled;

    var version = chrome.runtime.getManifest().version;
    var iframeSrc = 'https://keywordseverywhere.com/ke/widget.php?apiKey=' + apiKey + '&source=' + params.iframeSrcParam + '&enabled=' + iframeSettingEnabledParam + '&country=' + country + '&version=' + version + '&pur=' + pur + '&query=' + encodeURIComponent(Common.escapeHtml(params.query));
    if (params.darkMode) iframeSrc += '&darkmode=' + params.darkMode;
    var html = '<div class="xt-widget-iframe"><iframe src="' + iframeSrc + '" scrolling="no"></div>';
    return html;
  };


  var getPaginationHTML = function(params){
    var keywordsPerPage = params.perPage;
    var rows = params.rows;
    var currentPage = params.currentPage;
    var options = params.options;
    var len = rows.length;
    var start = 1;
    var end = len;
    if (keywordsPerPage !== 'All') {
      keywordsPerPage = parseInt(keywordsPerPage);
      start = (currentPage - 1) * keywordsPerPage + 1;
      end = start + keywordsPerPage - 1;
    }
    if (end > rows.length) end = rows.length;
    var status = `<span class="xt-widget-pagination-status">${start}-${end} of ${len}</span>`;
    if (start !== 1) {
      status += `<span class="xt-ke-pg xt-ke-pg-back"><a href="" data-page="${currentPage - 1}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-left"><polyline points="15 18 9 12 15 6"></polyline></svg></a></span>`;
    }
    if (end < len) {
      status += `<span class="xt-ke-pg xt-ke-pg-next"><a href="#" data-page="${currentPage + 1}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right"><polyline points="9 18 15 12 9 6"></polyline></svg></a></span>`;
    }
    var html = 'Per page: ';
    var select = '<select class="xt-widget-page-select">';
    if (!options) options = [5, 10, 20, 'All'];
    options.map(function(val){
      var selected = val === keywordsPerPage ? 'selected' : '';
      select += `<option value="${val}" ${selected}>${val}</option>`;
    });
    select += '</select>';
    html += select + status;
    return html;
  };


  var showWidgetTablePage = function($table, rows, keywordsPerPage, currentPage){
    var len = rows.length;
    var start = 0;
    var end = len;
    if (keywordsPerPage !== 'All') {
      keywordsPerPage = parseInt(keywordsPerPage);
      start = (currentPage - 1) * keywordsPerPage;
      end = start + keywordsPerPage;
    }
    $table.find('tbody tr').map(function(i, tr){
      var $tr = $(tr);
      if (i >= start && i < end) {
        $tr.removeClass('xt-hidden');
      }
      else {
        $tr.addClass('xt-hidden');
      }
    });
  };


  var exportTable = function(params){
    var table = params.table;
    var filename = params.filename;
    var method = params.method;
    var $result = $('<table>');
    var $table = $(table);
    var trendIndex = -1;
    var hasStarColumn = true;
    if ($table.hasClass('xt-g-table-no-credits')) hasStarColumn = false;
    $table.find('tr').each(function(i, tr){
      var $tr = $('<tr>').appendTo($result);
      $(tr).find('td,th').each(function(j, td){
        if (j === 0 && hasStarColumn) return; // no star
        var text = td.textContent;
        if (td.tagName === 'TH' && text === 'Trend') {
          trendIndex = j;
        }
        if ($(td).find('button')[0]) {
          var cloned = $(td).clone();
          cloned.find('button').remove();
          text = cloned.text();
        }
        if (text === 'CPC') text = 'CPC ($)';
        if (text.match(/^[$\d,.]+$/)) text = text.replace(/[$,]/g, '');
        if (td.tagName === 'TD' && trendIndex === j) {
          var title = $(td).find('img').attr('title');
          if (title) {
            title.split('\n').map(function(str, index){
              var [mon, val] = str.split(' - ');
              $result.find('tr:first-child td')[trendIndex + index - (hasStarColumn? 1 : 0)].textContent = mon;
              $('<td>').text(val).appendTo($tr);
            });
          }
        }
        else if (td.tagName === 'TH' && text === 'Trend') {
          for (var i = 0; i < 12; i++) {
            $('<td>').text('Trend').appendTo($tr);
          }
        }
        else $('<td>').text(text).appendTo($tr);
      });
    });
    exportTableToCSV({table: $result, filename: filename + '.csv', method: method });
  };


  const getHost = str => {
    try {
      let url = new URL(str);
      return url.host;
    } catch (e) {
      console.log(e);
      return '';
    }
  };


  const formatNumber = n => {
    var res = n;
    if (n >= 1000000000) res = parseFloat((n/1000000000).toFixed(2)) + 'B';
    else if (n >= 1000000) res = parseFloat((n/1000000).toFixed(2)) + 'M';
    else if (n > 1000) res = parseFloat((n/1000).toFixed(2)) + 'K';
    return res;
  };


  const formatLongNumber = (n) => {
    var num = parseFloat(n.replace(/,/g, ''));
    var res = n;
    if (num >= 1000000000) res = (num/1000000000).toLocaleString() + ' bil';
    else if (num >= 1000000) res = (num/1000000).toLocaleString() + ' mil';
    return res;
  };


  const getDate = (format, date) => {
    if (typeof date === 'undefined') date = new Date();
    if (!format) format = 'YYYY-MM-DD hh:mm:ss';
    var year = date.getFullYear();
    var month = ('0' + (date.getMonth() + 1)).substr(-2);
    var day = ('0' + date.getDate()).substr(-2);
    var hours = ('0' + date.getHours()).substr(-2);
    var min = ('0' + date.getMinutes()).substr(-2);
    var sec = ('0' + date.getSeconds()).substr(-2);
    var monthStr = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[date.getMonth()];

    var res = format;
    res = res.replace('MON', monthStr);
    res = res.replace('YYYY', year);
    res = res.replace(/YY/g, year.toString().substr(-2));
    res = res.replace('MM', month);
    res = res.replace('DD', day);
    res = res.replace('hh', hours);
    res = res.replace('mm', min);
    res = res.replace('ss', sec);
    return res;
  };


  const renderFindLongTailKeywordsBtn = function(params){
    let rootId = params.rootId;
    let rootTagName = params.rootTagName || '<div>';
    let addMethod = params.addMethod;
    let $root = $('#' + rootId);
    let country = (Starter.getSettings().country || '').toUpperCase();
    let countryTitle = country ? `(${country})` : '';
    if (!$root[0]) {
      $root = $(rootTagName, {
        id: rootId,
        class: 'xt-ltkbtn-root xt-ke-card'
      });
      let $addTo = $(params.parentSelector);
      $root[addMethod]($addTo);
      if (params.onAdded) params.onAdded($root);
    }
    let title = 'Find long-tail keywords for';
    if (params.title) title = params.title;
    let query = Common.escapeHtml(params.query);
    let queryQuotes = '"' + query + '"';
    if (query.length > 38) queryQuotes = 'this search query';

    let html = [
      '<div class="xt-close">✖</div>',
      '<table><tr>',
      `<td><button class="xt-ke-btn">${title} <span style="margin-left: .25rem">${queryQuotes} ${countryTitle}</span></button>`,
      '</td></tr></table>',
    ].join('\n');
    $root.html(html);
    let btnURL = chrome.runtime.getURL(`html/page.html?page=autocomplete&query=${encodeURIComponent(query)}&service=${params.service}`);
    if (params.tld) btnURL += '&tld=' +  params.tld;
    if (params.lng) btnURL += '&lng=' +  params.lng;

    $root.find('button').click(() => {
      chrome.runtime.sendMessage({
        cmd: 'new_tab',
        data: btnURL
      });
    });
    $root.find('.xt-close').click(function(){
      $root.remove();
    });
  };


  const renderGenericWidget = function(params){
    let rootId = params.rootId;
    let rootTagName = params.rootTagName || '<div>';
    let addMethod = params.addMethod;
    let $root = $('#' + rootId);
    let country = (Starter.getSettings().country || '').toUpperCase();
    let countryTitle = country ? `(${country})` : '';
    if (!$root[0]) {
      $root = $(rootTagName, {
        id: rootId,
        class: 'xt-ke-card'
      });
      let $addTo = $(params.parentSelector);
      $root[addMethod]($addTo);
      if (params.onAdded) params.onAdded($root);
    }
    let title = '';
    if (params.title) title = params.title;
    let query = Common.escapeHtml(params.query);
    let html = [
      '<div class="xt-close">✖</div>'
    ].join('\n');
    if (params.html) html += params.html;
    $root.html(html);
    if (params.onReady) params.onReady($root);
    $root.find('button').click(function(){
      chrome.runtime.sendMessage({
        cmd: 'new_tab',
        data: this.dataset.url
      });
    });
    $root.find('.xt-close').click(function(){
      $root.remove();
    });
    return $root;
  };


  const getIcon = function(icon) {
    switch (icon) {
      case 'copy':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      case 'export':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    }
  };


  return {
    processKeywords: processKeywords,
    cleanKeyword: cleanKeyword,
    highlight: highlight,
    appendStar: appendStar,
    appendKeg: appendKeg,
    appendLTKBtn: appendLTKBtn,
    appendListBtn: appendListBtn,
    formatNumber: formatNumber,
    getResultStr: getResultStr,
    getResultStrType2: getResultStrType2,
    getTrendPercent: getTrendPercent,
    parseTrendStr: parseTrendStr,
    getTrendImgHTML: getTrendImgHTML,
    processEmptyData: processEmptyData,
    setCredits: setCredits,
    getCredits: getCredits,
    setConfig: setConfig,
    getConfig: getConfig,
    setPlan: setPlan,
    getPlan: getPlan,
    setCountry: setCountry,
    getCountry: getCountry,
    clearKeywordsStorage: clearKeywordsStorage,
    addKeywords: addKeywords,
    exportKeywords: exportKeywords,
    exportTableToCSV: exportTableToCSV,
    saveToFile: saveToFile,
    clipboardWrite: clipboardWrite,
    uploadKeywords: uploadKeywords,
    uploadKeywordsList: uploadKeywordsList,
    getMetricsNumber: getMetricsNumber,
    getHost: getHost,
    escapeHtml: escapeHtml,
    decodeHTMLEntities: decodeHTMLEntities,
    shortenStr: shortenStr,
    inject: inject,
    renderWidgetTable: renderWidgetTable,
    getPaginationHTML: getPaginationHTML,
    showWidgetTablePage: showWidgetTablePage,
    renderFindLongTailKeywordsBtn: renderFindLongTailKeywordsBtn,
    renderGenericWidget: renderGenericWidget,
    renderIframeHTML: renderIframeHTML,
    getDate: getDate,
    getIcon: getIcon
  };

})();
