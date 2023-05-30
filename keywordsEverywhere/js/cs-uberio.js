var Tool = (function(){

  var source = 'uberio';

  var observerTarget = '.result';
  var observer = null;

  // there is separate mutation for every keyword
  // wait control interval while filling table and then process table
  var tableTimer = null;


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
      if (node.tagName == 'TR') {
        var $keywordNode = $(node).find('.btn-toolbar span[data-bind="text: text"]');
        if (!$keywordNode[0]) continue;
        if (tableTimer) clearTimeout( tableTimer );
        tableTimer = setTimeout(function(){
          processTable( $('#results table')[0] );
          tableTimer = null;
        }, 1000);
      }
    }
  };


  var processTable = function( table ){
    if (!table) return;
    addColumns( table );
    var rows = $(table).find('tr td:nth-child(2)');
    if (!rows.length) return;
    var keywords = {};
    for (var i = 0, len = rows.length; i < len; i++) {
      var td = rows[i];
      var keyword = $(td).find('.btn-toolbar span[data-bind="text: text"]').text();
      keywords[ keyword ] = td;
    }
    processKeywords( keywords, table );
  };


  var addColumns = function( table ){
    var country = Common.getCountry();
    if (country) country = ' (' + country + ')';
    var $table = $(table);
    var metricsList = Starter.getSettings().metricsList;
    var metricsNumber = Common.getMetricsNumber();

    if (!$table.find('thead .xt-col')[0]) {
      var $target = $table.find('thead tr:first-child th:nth-child(2)');

      if(metricsList.trend){
        $target.after('<th class="xt-col">Trend' + country + '</td>');
      }
      if(metricsList.comp){
        $target.after('<th class="xt-col">Competition' + country + '</td>');
      }
      if(metricsList.cpc){
        $target.after('<th class="xt-col">CPC' + country + '</td>');
      }
      if(metricsList.vol){
        $target.after('<th class="xt-col">Monthly Volume' + country + '</td>');
      }
    }
    for (var i = 0; i < metricsNumber; i++) {
      $table.find('tbody td:nth-child(2)')
        .after('<td class="xt-col"></td>');
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
      Common.appendStar($td.find('.btn-toolbar'), item);
      Common.appendKeg($td.find('.btn-toolbar'), json, item);
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
        $target = $target.next();
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
