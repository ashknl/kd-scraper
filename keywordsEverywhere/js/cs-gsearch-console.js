var Tool = (function(){

  var source = 'gwmtoo';

  var observerTarget = '#query,[jsrenderer=Mtipq]';
  var tableSelector = '#query table,[jsrenderer=Mtipq] table';
  var observer = null;


  var init = function(){
    initPage();
  };


  var initPage = function(){
    checkTarget();
    var timer = setInterval(function(){
      var found = checkTarget();
      if (found) clearInterval(timer);
    }, 500);
    initMutationObserver(document.body);
  };


  var checkTarget = function(){
    var $target = $( observerTarget );
    if (!$target.length) return;
    processTable( $(tableSelector).last()[0] );
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
      if (node.nodeName === 'C-WIZ') {
        processTable($(tableSelector).last()[0]);
      }
      else if (node.children && node.children[0] && node.children[0].nodeName === 'C-WIZ') {
        processTable($(tableSelector).last()[0]);
      }
    }
  };


  var processTable = function( table ){
    if (!table) return;
    $('body').addClass('xt-' + source);
    // console.log(table);
    var rows = $(table).find('td:nth-child(1)');
    if (!rows.length) return;
    var keywords = {};
    for (var i = 0, len = rows.length; i < len; i++) {
      var td = rows[i];
      var $td = $(td);
      var text = $td.find('content span[title], .zRhise span[title]').attr('title');
      if ($td.is(':hidden') || $td.data('fetch')) {
        continue;
      }
      $td.data('fetch', true);
      var keyword = Common.cleanKeyword( text );
      if (!keywords[keyword]) keywords[keyword] = [];
      keywords[ keyword ].push(td);
    }
    addColumns( table );
    if (Object.keys(keywords).length !== 0) {
      processKeywords( keywords, table );
    }
    setTimeout(function(){
      processTable(table);
    }, 5000);
  };


  var addColumns = function( table ){
    if ($(table).find('.xt-col')[0]) return;
    var country = Common.getCountry();
    if (country) country = ' (' + country + ')';
    var $table = $(table);
    var metricsList = Starter.getSettings().metricsList;
    var metricsNumber = Common.getMetricsNumber();
    var $target = $table.find('thead th:nth-child(1)');
    if (metricsList.trend) {
      $target.after('<th class="xt-col XgRaPc sbEvHd">Trend' + country + '</td>');
    }
    if (metricsList.comp) {
      $target.after('<th class="xt-col XgRaPc sbEvHd">Comp' + country + '</td>');
    }
    if (metricsList.cpc) {
      $target.after('<th class="xt-col XgRaPc sbEvHd">CPC' + country + '</td>');
    }
    if (metricsList.vol) {
      $target.after('<th class="xt-col XgRaPc sbEvHd">Vol' + country + '</td>');
    }
    for (var i = 0; i < metricsNumber; i++) {
      $table.find('tbody td:nth-child(1)')
        .after('<td class="xt-gwmtoo-cell sbEvHd"></td>');
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
      var tds = keywords[ item.keyword ];
      for (var i = 0, len = tds.length; i < len; i++) {
        var td = tds[i];
        var $td = $(td);
        if ($td.find('.xt-star')[0]) continue;
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
