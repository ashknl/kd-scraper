var Tool = (function(){

  var source = 'gkplan';

  var observerTarget = '#root';
  var observer = null;
  var timer;


  var init = function(){
    initPage();
  };


  var initPage = function(){
    // wait for table initialization
    checkTarget();
    var timer = setInterval(function(){
      var found = checkTarget();
      if (found) clearInterval(timer);
    }, 1500);
  };


  var checkTarget = function(){
    var $target = $( observerTarget );
    if (!$target.length) return;
    initMutationObserver( $target[0] );
    return true;
  };


  var initMutationObserver = function( target ){
    if (observer) observer.disconnect();
    observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          processChildList(mutation.addedNodes);
        }
      });
    });

    var config = { subtree: true, childList: true, characterData: true };
    observer.observe(target, config);
  };


  var processChildList = function(children){
    var found = false;
    for (var i = 0, len = children.length; i < len; i++) {
      var node = children[i];
      if (node.tagName !== 'TR') continue;
      if (!node.getAttribute('__gwt_row')) continue;
      found = true;
    }
    if (found) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function(){
        processTables();
      }, 500);
    }
  };


  var processTables = function(){
    var $firstTable = $('#gwt-debug-table table');
    var $secTable = $('#gwt-debug-keyword-table table');
    var keywords = {};
    $.extend(keywords, processTable($firstTable));
    $.extend(keywords, processTable($secTable));
    processKeywords(keywords);
  };


  var processTable = function(tables){
    var $leftTable;
    var $middleTable;
    var keywords = {};
    if (!tables || !tables.length) return;
    for (var i = 0, len = tables.length; i < len; i++) {
      var table = tables[i];
      var $table = $(table);
      if (table.id === 'gwt-debug-leftTable' && $table.is(':visible') && !$leftTable) {
        $leftTable = $table;
      }
      if (table.id === 'gwt-debug-middleTable' && $table.is(':visible') && !$middleTable) {
        $middleTable = $table;
      }
    }
    var processed = false;
    if ($middleTable.find('td.xt-col').map(function(i, col){
      if ($(col).is(':visible')) {
        processed = true;
      }
    }));
    if (processed) return;

    $leftTable.find('td').map(function(i, td){
      var keyword = Common.cleanKeyword(td.textContent);
      var middleTD = $middleTable.find('td:first-child')[i];
      keywords[keyword] = [td, middleTD];
      $('<td/>', {class: 'xt-col spAb-f spAb-h spAb-i spAb-s spAb-E'})
        .insertAfter(middleTD);
    });
    var country = Starter.getSettings().country;
    var countryStr = country ? country.toUpperCase() : 'Global';
    $('<th/>', {
      class: 'spAb-m xt-col'
    })
      .text('Volume (' + countryStr + ')')
      .insertAfter( $middleTable.find('th:first-child') );
    return keywords;
  };


  var processKeywords = function( keywords, table ){
    Common.processKeywords({
        keywords: Object.keys( keywords ),
        tableNode: table,
        src: source
      },
      function(json){
        processJSON( json, keywords );
      }
    );
  };


  var processJSON = function( json, keywords ){
    var data = json.data;
    for (var key in data) {
      var item = data[key];
      var tds = keywords[ item.keyword ];
      var $td = $(tds[0]);
      Common.appendStar($td.find('.spGb-h')[0], item, 'after');
      var color = Common.highlight(item);
      var $target = $(tds[1]).next();
      $target.text(item.vol).toggleClass('xt-highlight', color).css('background', color);
      $target = $target.next();
    }
  };


  var getSource = function(){
    return source;
  };


  return {
    init: init,
    getSource: getSource
  };


})();
