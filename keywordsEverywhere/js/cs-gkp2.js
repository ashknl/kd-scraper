var Tool = (function(){

  var source = 'gkplan';

  var observerTarget = 'body';
  var observer = null;
  var timer;

  var processedKeywords = {};


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
          processChildList(mutation.addedNodes, mutation);
        }
      });
    });

    var config = { subtree: true, childList: true, characterData: false };
    observer.observe(target, config);
  };


  var processChildList = function(children, mutation){
    var found = false;
    for (var i = 0, len = children.length; i < len; i++) {
      var node = children[i];
      if (node.className && node.className.indexOf && node.className.indexOf('particle-table-row') !== -1) {
        found = true;
        var $target = $(node).find('[essfield=text]');
        if (!$target[0]) {
          $target = $(node).find('[essfield=keyword]');
        }
        var metricsList = Starter.getSettings().metricsList;
        if(metricsList.trend) {
          $target.after('<ess-cell role="grid-cell" tabindex="-1" class="xt-col"></ess-cell>');
        }
        if(metricsList.comp) {
          $target.after('<ess-cell role="grid-cell" tabindex="-1" class="xt-col"></ess-cell>');
        }
        if(metricsList.cpc) {
          $target.after('<ess-cell role="grid-cell" tabindex="-1" class="xt-col"></ess-cell>');
        }
        if(metricsList.vol) {
          $target.after('<ess-cell role="grid-cell" tabindex="-1" class="xt-col"></ess-cell>');
        }

      }
    }
    if (found) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function(){
        processTable();
      }, 500);
    }
  };


  var processTable = function(){
    var $table = $('.ess-table-wrapper');
    if (!$table[0]) return;
    addColumns( $table );
    var rows = $table.find('.particle-table-row');
    if (!rows.length) return;
    var keywords = {};
    for (var i = 0, len = rows.length; i < len; i++) {
      var row = rows[i];
      var keyword = Common.cleanKeyword( $(row).find('keyword-text').text() );
      if (!keyword) continue;
      if (processedKeywords[keyword] && $(row).find('.xt-col').text()) continue;
      var td = $(row).find('ess-cell[essfield=text]');
      if (!td[0]) td = $(row).find('ess-cell[essfield=keyword]');
      keywords[ keyword ] = [row, td];
    }
    // Common.clearKeywordsStorage();
    processKeywords( keywords, $table[0] );
  };


  var addColumns = function( $table ){
    var country = Common.getCountry();
    if (country) country = ' (' + country + ')';
    if ($('.particle-table-header .xt-col')[0]) return;
    var rows = $table.find('.particle-table-header');
    var metricsList = Starter.getSettings().metricsList;
    var metricsNumber = Common.getMetricsNumber();
    // $(headRows[0]).find('th:nth-child(1)')
    //   .after('<th class="xt-col" colspan="' + metricsNumber + '">Keyword data</td>');
    for (var i = 0, len = rows.length; i < len; i++) {
      var row = rows[i];
      var $row = $(row);
      var $target = $row.find('[essfield=text]');
      if (!$target[0]) $target = $row.find('[essfield=keyword]');
      if (!$target[0]) {
        console.log('target header not found');
      }
      if(metricsList.trend) {
        if ($row.hasClass('particle-table-header')) {
          $target.after('<div class="xt-col particle-table-header-cell">Trend' + country + '</div>');
        }
      }
      if(metricsList.comp) {
        if ($row.hasClass('particle-table-header')) {
          $target.after('<div class="xt-col particle-table-header-cell">Comp' + country + '</div>');
        }
      }
      if(metricsList.cpc) {
        if ($row.hasClass('particle-table-header')) {
          $target.after('<div class="xt-col particle-table-header-cell">CPC' + country + '</div>');
        }
      }
      if(metricsList.vol) {
        if ($row.hasClass('particle-table-header')) {
          $target.after('<div class="xt-col particle-table-header-cell">Vol' + country + '</div>');
        }
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
      var nodes = keywords[ item.keyword ];
      var $row = $(nodes[0]);
      var $cell = $(nodes[1]);
      processedKeywords[item.keyword] = true;
      if (!$row.find('.xt-keg')[0]) Common.appendKeg($row.find('keyword-text')[0], json, item, 'after');
      if (!$row.find('.xt-star')[0]) Common.appendStar($row.find('keyword-text')[0], item, 'after');
      var color = Common.highlight(item);
      var $target = $cell.next();
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
