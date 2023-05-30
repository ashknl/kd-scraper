var Tool = (function(){

  var source = 'gwmtoo';

  var observerTarget = '.table-container';
  var tableSelector = '.google-visualization-table-table';
  var observer = null;


  var init = function(){
    initPage();
  };


  var initPage = function(){
    // wait for table initialization
    checkTarget();
    var timer = setInterval(function(){
      var found = checkTarget();
      if (found) clearInterval(timer);
    }, 500);
  };


  var checkTarget = function(){
    var $target = $( observerTarget );
    if (!$target.length) return;
    processTable( $(tableSelector)[0] );
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
    for (var i = 0, len = children.length; i < len; i++) {
      var node = children[i];
      if (node.className && node.className.match(/google-visualization-table-table/)) {
        processTable(node);
      }
    }
  };


  var processTable = function( table ){
    if (!table) return;
    var rows = $(table).find('td:nth-child(2)');
    if (!rows.length) return;
    var keywords = {};
    for (var i = 0, len = rows.length; i < len; i++) {
      var td = rows[i];
      var keyword = Common.cleanKeyword( $(td).text() );
      keywords[ keyword ] = td;
    }
    processKeywords( keywords, table );
    addColumns( table );
  };


  var addColumns = function( table ){
    if ($('.xt-col')[0]) return;
    var country = Common.getCountry();
    if (country) country = ' (' + country + ')';
    var $table = $(table);
    var metricsList = Starter.getSettings().metricsList;
    var metricsNumber = Common.getMetricsNumber();
    var $target = $table.find('thead th:nth-child(2)');
    if (metricsList.trend) {
      $target.after('<th class="xt-col wmt-jstable-header-cell">Trend' + country + '</td>');
    }
    if (metricsList.comp) {
      $target.after('<th class="xt-col wmt-jstable-header-cell">Competition' + country + '</td>');
    }
    if (metricsList.cpc) {
      $target.after('<th class="xt-col wmt-jstable-header-cell">CPC' + country + '</td>');
    }
    if (metricsList.vol) {
      $target.after('<th class="xt-col wmt-jstable-header-cell">Monthly Volume' + country + '</td>');
    }
    for (var i = 0; i < metricsNumber; i++) {
      $table.find('tbody td:nth-child(2)')
        .after('<td class="wmt-jstable-cell"></td>');
    }
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
    var metricsList = Starter.getSettings().metricsList;

    for (var key in data) {
      var item = data[key];
      var td = keywords[ item.keyword ];
      var $td = $(td);
      Common.appendStar($td, item);
      Common.appendKeg($td, json, item);
      $td.find('.xt-star').hide();
      $td.find('.xt-keg').hide();
      var color = Common.highlight(item);
      var $target = $td.next();
      if (metricsList.vol) {
        $target.text(item.vol).toggleClass('xt-highlight', color).css('background', color);
        $target = $target.next();
      }
      if (metricsList.cpc) {
        $target.text(item.cpc).toggleClass('xt-highlight', color).css('background', color);
        $target = $target.next();
      }
      if (metricsList.comp) {
        $target.text(item.competition).toggleClass('xt-highlight', color).css('background', color);
      }
      if (metricsList.trend) {
        $target.text(item.trend).toggleClass('xt-highlight', color).css('background', color);
      }
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
