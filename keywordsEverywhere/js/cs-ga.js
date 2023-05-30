  var Tool = (function(){

  var source = 'analyt';

  var urlRE = new RegExp(/(acquisition-channels.*Organic|acquisition-sc-queries|trafficsources-seo-queries)/i);
  var observerTarget = '#ID-view';
  var tableSelector = '#ID-explorer-table-dataTable';
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
      if ( !document.location.href.match(urlRE) ) return;
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
      if (node.id === tableSelector.substring(1)) {
        processTable( node );
      }
    }
  };


  var processTable = function( table ){
    if (!table) return;
    addColumns( table );
    var rows;
    if ( document.location.href.match(/acquisition-channels/) ) {
      rows = $(table).find('tbody td:nth-child(3)');
    }
    else if ( document.location.href.match(/trafficsources-seo-queries/) ) {
      rows = $(table).find('tbody td:nth-child(2)');
    }
    else if (document.location.href.match(/acquisition-sc-queries/)) {
      rows = $(table).find('tbody td:nth-child(2)');
    }
    if (!rows.length) return;
    var keywords = {};
    for (var i = 0, len = rows.length; i < len; i++) {
      var td = rows[i];
      var keyword = Common.cleanKeyword( $(td).text() );
      if (!keyword) continue;
      keywords[ keyword ] = td;
    }
    processKeywords( keywords, table );
  };


  var addColumns = function( table ){
    var country = Common.getCountry();
    if (country) country = ' (' + country + ')';
    if ($('.xt-col')[0]) return;
    var $table = $(table);
    var headRows = $table.find('thead tr');
    var metricsList = Starter.getSettings().metricsList;
    var metricsNumber = Common.getMetricsNumber();
    if ( document.location.href.match(/acquisition-channels/) ) {
      $(headRows[0]).find('th:nth-child(2)')
        .after('<th class="xt-col _GAnm" colspan="' + metricsNumber + '">Keyword data</td>');

      var $target = $(headRows[1]).find('th:first-child');
      if(metricsList.vol) {
        $target.before('<th class="xt-col _GAnm" style="line-height:1em">Monthly Volume' + country + '</td>');
      }
      if(metricsList.cpc) {
        $target.before('<th class="xt-col _GAnm" style="line-height:1em">CPC' + country + '</td>');
      }
      if(metricsList.comp) {
        $target.before('<th class="xt-col _GAnm" style="line-height:1em">Competition' + country + '</td>');
      }
      if(metricsList.trend) {
        $target.before('<th class="xt-col _GAnm" style="line-height:1em">Trend' + country + '</td>');
      }

      for (var i = 0; i < metricsNumber; i++) {
        $(headRows[2]).find('td:nth-child(2)').after('<td/>');
        $(headRows[3]).find('td:nth-child(2)').after('<td/>');
        $table.find('tbody td:nth-child(3)')
          .after('<td class="wmt-jstable-cell"></td>');
      }
    }
    else if ( document.location.href.match(/trafficsources-seo-queries|acquisition-sc-queries/) ) {
      var $target = $(headRows[0]).find('th:nth-child(1)');
      if(metricsList.trend) {
        $target.after('<th class="xt-col">Trend' + country + '</td>');
      }
      if(metricsList.comp) {
        $target.after('<th class="xt-col">Competition' + country + '</td>');
      }
      if(metricsList.cpc) {
        $target.after('<th class="xt-col">CPC' + country + '</td>')
      }
      if(metricsList.vol) {
        $target.after('<th class="xt-col">Monthly Volume' + country + '</td>');
      }
      for (var i = 0; i < metricsNumber; i++) {
        $(headRows[1]).find('td:nth-child(1)')
          .after('<th class="xt-col"></td>');
        $table.find('tbody td:nth-child(2)')
          .after('<td class="wmt-jstable-cell"></td>');
      }
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
        $target.html(Common.getTrendImgHTML(item.trend, false)).toggleClass('xt-highlight', color).css('background', color);
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
