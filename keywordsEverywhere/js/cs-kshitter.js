var Tool = (function(){

  var source = 'keyshi';

  var target = '#input';
  var $resultBox = null;
  var dataByKeyword = {};

  var startBtnClicked = false;


  var init = function(){
    initPage();
  };


  var initPage = function(){
    checkTarget();
    $('#startjob').click(function(e){
      startBtnClicked = !startBtnClicked;
    });
  };


  var checkTarget = function(){
    var $target = $( target );
    if (!$target.length) return;
    appendResultBox();
    observeTargetChange();
    return true;
  };


  var appendResultBox = function(){
    if ($resultBox) return;
    $resultBox = $('<div/>', {id: 'xt-kshitter-root'}).html(`
        <div class="xt-kshitter-count"></div>
        <div class="xt-kshitter-content"></div>
      `).appendTo('body');
  };


  var observeTargetChange = function(){
    var storedText = $(target).val();
    var timer = setInterval(function(){
      if (!startBtnClicked) return;
      var text = $(target).val();
      if (text !== storedText) processText(text);
      storedText = text;
    }, 1000);
  };


  var processText = function( text ){
    var list = text.split('\n')
      .map(function(key){
        return key.toLowerCase();
      })
      .filter(function( key, i ){
        if ( dataByKeyword[key] ) return false;
        return true;
      });
    processKeywords( list, null );
  };


  var processKeywords = function( keywordsList, table ){
    Common.processKeywords({
        keywords: keywordsList,
        tableNode: table,
        src: source
      },
      function(json){
        processJSON( json, keywordsList );
      }
    );
  };


  var processJSON = function( json, keywordsList ){
    var data = json.data;
    for (var key in data) {
      var item = data[key];
      dataByKeyword[ item.keyword ] = item;
    }
    keywordsList.map(function(keyword){
      if (!dataByKeyword[keyword]) dataByKeyword[keyword] = {cpc: '0.00', vol: '0', keyword: keyword};
    });
    var text = $(target).val();
    var list = text.split('\n');
    var $res = $('<div/>');
    var rows = [];

    for (var i = 0, len = list.length; i < len; i++) {
      var keyword = list[i];
      if (!$.trim(keyword)) continue;
      var keywordLC = keyword.toLowerCase();
      var item = dataByKeyword[keywordLC];
      if ( item ) {
        rows.push(item);
        // var title = Common.getResultStr(item);
        // var color = Common.highlight(item);
        // if (title) title = '[' + title + ']';
        // var $span = $('<span/>').html(title);
        // if (color) {
        //   $span.addClass('xt-highlight').css('background-color', color);
        // }
        // $span = Common.appendStar($span, item);
        // $span = Common.appendKeg($span, json, item);
        // $res.append( $('<div/>').text(keyword + ' ').append($span) );
      }
      else {
        // $res.append( $('<div/>').text(keyword) );
      }
    }
    $resultBox.find('.xt-kshitter-count').html(list.length + ' keywords found');
    $resultBox.find('.xt-kshitter-content').html('');
    renderWidgetTable('related-keywords', rows, json);
  };


  var renderWidgetTable = function(type, rows, json, nocredits){
    var title = '';
    var rootSelector;
    var iframeSrcParam = source;
    rootSelector = 'xt-kshitter-table';
    var settings = Starter.getSettings();
    var params = {
      settingEnabled: settings.sourceList[source],
      source: source,
      query: '',
      title: title,
      json: json,
      type: type,
      columnName: 'Keyword',
      rootSelector: rootSelector,
      addTo: '.xt-kshitter-content',
      addMethod: 'appendTo',
      iframeSrcParam: iframeSrcParam,
      filename: source,
    };
    Common.renderWidgetTable(rows, params);
  };


  var getSource = function(){
    return source;
  };


  return {
    init: init,
    getSource: getSource
  };


})();
