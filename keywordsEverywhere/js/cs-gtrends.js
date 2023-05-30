var Tool = (function(){

  var source = 'gtrend';

  var urlRE = new RegExp(/(trends\/explore|trends\/story)/i);
  var observerTarget = 'body';
  var observer = null;

  var volBtnTimer = null;

  var processReportTimer = null;
  var reportKeywordsList = [];

  var loadRelatedQueriesPermission = false;


  var init = function(){
    initPage();
    initURLChangeListener(function(){
      initPage();
    });
  };


  var initPage = function(){
    $('.xt-gtrend-query').remove();
    // wait for table initialization
    checkTarget();
    var timer = setInterval(function(){
      var found = checkTarget();
      if (found) clearInterval(timer);
    }, 500);
    var pillsTimer = setInterval(function(){
      var found = $('.search-term-wrapper ng-include')[0];
      if (found) {
        clearInterval(pillsTimer);
        processKeywordPills();
      }
    }, 500);
  };


  var initURLChangeListener = function( cbProcessPage ){
    var url = document.location.href;
    var timer = setInterval(function(){
      if ( url !== document.location.href ) {
        url = document.location.href;
        cbProcessPage( url );
      }
    }, 1000);
  };


  var getPagePrefs = function(){
    var geo = getURLParameter('geo') || '';
    var date = getURLParameter('date') || '';
    var q = getURLParameter('q');
    var property = getURLParameter('gprop') || '';
    var category = getURLParameter('cat') || 0;
    var res = {};
    let mapping = {
      'All Time': 'all',
      '5yrs': 'today 5-y',
      '12mo': '',
      '3mo': 'today 3-m',
      '30d': 'today 1-m',
      '7d': 'now 7-d',
      '1d': 'now 1-d',
      '4h': 'now 4-H',
      '1h': 'now 1-H'
    };
    for (var key in mapping) {
      if (date === mapping[key]) res.date = key;
    }
    if (date && !res.date) res.date = 'custom';
    'US GB CA AU IN NZ ZA'.split(' ').map(function(country){
      if (geo === country) {
        res.geo = country;
        if (country === 'GB') res.geo = 'UK';
      }
    });
    if (geo === '') res.geo = 'worldwide';
    res.property = property;
    res.category = category;
    return res;
  };


  var getURLParameter = function(sParam, useHash, url) {
    var location = window.location;
    if (url) location = new URL(url);
    var qs = location.search.substring(1);
    if (useHash) qs = location.hash.substring(1);
    qs = qs.split('+').join(' ');
    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;
    while (tokens = re.exec(qs)) {
      params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }
    return params[sParam];
  };


  var addLoadRelatedBtn = function(reportKeywordsList){
    var $secBtn = $('.xt-gtrends-related-btn');
    if ($secBtn[0]) $secBtn.remove();
    var $widgets = $('[id^=RELATED_QUERIES]');
    $widgets.map(function(i, widget){
      var $root = $(widget.parentNode);
      var $prependTo = $root.find('.pagination');
      if (!$prependTo[0]) $prependTo = $root.find('.pagination-container');
      $secBtn = $('<button>', {class: 'xt-gtrends-related-btn'}).prependTo($prependTo);
      $secBtn.text("Load Metrics (uses 25 credits)");
      $secBtn.click(function(e){
        e.preventDefault();
        e.stopPropagation();
        loadRelatedQueriesPermission = true;
        $('.xt-gtrends-related-btn').remove();
        processKeywords(reportKeywordsList, null);
      });

    });
  };


  var addSearchVolButtons = function(){
    var s = getPageSettings();
    var showButton = true;
    if (s.date !== 'Past 5 years' && s.date.indexOf(' - present') === -1) showButton = false;
    if (s.prop !== 'YouTube Search' && s.prop !== 'Web Search') showButton = false;
    var text = 'Get Search Volumes from 2004';
    if (s.prop === 'YouTube Search') {
      text = text.replace('2004', '2008');
    }
    var timerange = 'All Time';
    if (s.date === 'Past 5 years') {
      text = 'Get Search Volumes for past 5 years';
      timerange = '5yrs';
    }

    var $btn = $('#xt-gtrends-get-vol-main-btn');
    if ($btn[0]) $btn.remove();
    $btn = $('<button>', {id: 'xt-gtrends-get-vol-main-btn'}).appendTo('.compare-pickers ');
    $btn.text(text);
    $btn.toggleClass('xt-hidden', !showButton);
    $btn.click(function(e){
      e.preventDefault();
      var prop = s.prop === 'YouTube Search' ? 'youtube' : 'google';
      var termsStr = s.terms.join(',');
      var url = chrome.runtime.getURL(`html/page.html?page=trends&country=${s.country}&prop=${prop}&timerange=${timerange}&terms=${termsStr}`);
      chrome.runtime.sendMessage({
        cmd: 'new_tab',
        data: url
      });
    });

    // var $secBtn = $('.xt-gtrends-get-vol-sec-btn');
    // if ($secBtn[0]) $secBtn.remove();
    // var $widgets = $('[id^=RELATED_QUERIES]');
    // $widgets.map(function(i, widget){
    //   var $root = $(widget.parentNode);
    //   var $prependTo = $root.find('.pagination');
    //   if (!$prependTo[0]) $prependTo = $root.find('.pagination-container');
    //   $secBtn = $('<button>', {class: 'xt-gtrends-get-vol-sec-btn'}).prependTo($prependTo);
    //   $secBtn.text(text);
    //   $secBtn.toggleClass('xt-hidden', !showButton);
    //   $secBtn.click(function(e){
    //     e.preventDefault();
    //     var prop = s.prop === 'YouTube Search' ? 'youtube' : 'google';
    //     var termsStr = $root.find('[ng-bind="bidiText"]').map(function(j, node){
    //       return $(node).contents().get(0).nodeValue;
    //     }).toArray().join(',');
    //     var url = chrome.runtime.getURL(`html/page.html?page=trends&country=${s.country}&prop=${prop}&timerange=${timerange}&terms=${termsStr}`);
    //     chrome.runtime.sendMessage({
    //       cmd: 'new_tab',
    //       data: url
    //     });
    //   });
    // });

  };


  var getPageSettings = function(){
    var country = $.trim($('.compare-pickers [ng-model="ctrl.model.geo"]').text());
    var date = $.trim($('.compare-pickers custom-date-picker ._md-select-value').text());
    var prop = $.trim($('.compare-pickers [ng-model="ctrl.model.property"] ._md-select-value').text());
    var terms = $('explore-search-term input').map(function(i, input){
      return input.value;
    }).toArray();
    return {country: country, date: date, prop: prop, terms: terms};
  };


  var checkTarget = function(){
    var $target = $( observerTarget );
    if (!$target.length) return;
    initMutationObserver( $target[0] );
    processChildList($('#RELATED_QUERIES').parent().find('.widget-template'), {});
    return true;
  };


  var initMutationObserver = function( target ){
    if (observer) observer.disconnect();
    observer = new MutationObserver(function(mutations) {
      if ( !document.location.href.match(urlRE) ) return;
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          processChildList(mutation.addedNodes, mutation);
        }
      });
    });

    var config = {subtree: true, childList: true, characterData: true };
    observer.observe(target, config);
  };


  var processChildList = function(children, mutation){
    for (var i = 0, len = children.length; i < len; i++) {
      var node = children[i];
      var $node = $(node);
      if (node.id === 'report') {
        processReport( node );
      }
      else if ( $node.hasClass('widget-template') &&
                node.children &&
                $(node.children[0]).hasClass('fe-related-queries') ) {
        processReport( node );
      }
      else if (mutation.target && mutation.target.getAttribute('ng-bind') === 'bidiText' && mutation.addedNodes[0] && mutation.addedNodes[0].nodeType === Node.TEXT_NODE) {
        var $target = $(mutation.target);
        processReport($target.closest('.item'));
      }
    }
  };


  const waitGoogleChartReady = () => {
    return new Promise((resolve) => {
      let interval = setInterval(() => {
        if ($('.fe-line-chart')[0]) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });
  };


  var showSpinner = function(){
    var rootId = 'xt-trend-chart-root';
    var $root = $('#' + rootId);
    if (!$root[0]) {
      $root = $('<div>', {
        id: rootId,
        class: 'xt-ke-card'
      });
      $('.fe-line-chart').css({
        'overflow': 'auto',
        'height': 'auto'
      }).prepend($root);
    }
    $root.html('<img src="' + chrome.runtime.getURL('img/spinner32.gif') + '" style="vertical-align:middle"> Loading Keywords Everywhere Trend Chart');
  };


  var getChartValues = function(){
    var $node = $('template[data-multiline]');
    var res = {};
    if ($node.length) {
      try {
        var text = $node[$node.length - 1].textContent;
        res.json = JSON.parse(text);
        var url = $node[$node.length - 1].dataset.url;
        var req = getURLParameter('req', false, url);
        req = JSON.parse(decodeURIComponent(req));
        res.req = {request: req};
      } catch (e) {
        res = null;
        console.log(e);
      }
    }
    $node.remove();
    return res;
  };


  var processKeywordPills = async function(){
    var settings = Starter.getSettings();
    if (!settings.showChartsForGoogleTrends) return;
    await waitGoogleChartReady();
    var s = getPagePrefs();
    console.log(s);
    if (s.date === '1d' || s.date === '1h' || s.date === '4h' || s.date === 'custom') return;
    var hasCredits = Common.getCredits() > 0;
    var geo = s.geo;
    if (!geo) return;
    if (geo === 'worldwide') geo = '';
    if ($('.fe-line-chart .widget-error-title')[0]) {
      // no chart - so we don't continue
      return;
    }
    var pageQueries = [];
    var urlQueries = [];
    var promises = [];
    var q = getURLParameter('q');
    // if (q && q.indexOf('/m/') !== -1) return;
    var qs = q.split(',');
    var nodes = [];
    var abort = false;
    $('.search-term-wrapper ng-include').map(function(i, node){
        var $node = $(node);
        var value = $node.find('input[type=search]').val();
        if (value.match(/^".*"$/)) abort = true;
        value = value.replace(/"/g, '');
        var urlValue = qs[i];
        urlQueries.push(urlValue);
        pageQueries.push(value.toLowerCase());
        nodes.push($node);
    });
    if (abort) return;
    var uniqQueries = pageQueries.filter(function(val, index){
      return pageQueries.indexOf(val) === index;
    });
    if (!uniqQueries.length) {
      return;
    }
    showSpinner();
    chrome.runtime.sendMessage({
      cmd: 'api.getKeywordData',
      data: {
        keywords: uniqQueries,
        country: geo,
        src: source
      }
    }, function( json ){
      var dataByKeyword = {};
      var keys = Object.keys(json.data);
      for (var i = 0; i < keys.length; i++) {
        dataByKeyword[json.data[keys[i]].keyword] = json.data[i];
      }
      // fighting with keywords with double quotes issue
      // reconstruct the json
      var clonedJSON = structuredClone(json);
      clonedJSON.data = [];
      for (var i = 0, len = nodes.length; i < len; i++) {
        var node = nodes[i];
        var keyword = pageQueries[i];
        clonedJSON.data.push(dataByKeyword[keyword]);
        processQueryResponse(dataByKeyword[keyword], node, geo);
      }
      var values = getChartValues();
      if (!values) {
        $('#xt-trend-chart-root').remove();
        return;
      }
      initTrendsChart({
        showVolume: hasCredits,
        queries: pageQueries,
        metrics: clonedJSON.data,
        chartData: values,
        geo: geo,
        timeRange: s.date,
        property: s.property,
        category: s.category
      });
    });
  };


  var processKeywordPill = function($node){
    var s = getPagePrefs();
    var hasCredits = Common.getCredits() > 0;
    var geo = s.geo;
    if (!geo) return;
    if (geo === 'worldwide') geo = '';
    var value = $node.find('input[type=search]').val();
    var metricsPromise = new Promise((resolve) => {
      chrome.runtime.sendMessage({
        cmd: 'api.getKeywordData',
        data: {
          keywords: [value],
          src: source
        }
      }, function( json ){
        if (!json || !json.data) return;
        processQueryResponse( json.data[0], $node, geo );
        resolve(json);
      });
    });
  };


  var processQueryResponse = function(data, $pill, geo){
    var $node = $pill.find('#xt-info');
    if (!$node.length) {
      $node = $('<div/>', {
          class: 'xt-gtrend-query'
        })
        .attr('id', 'xt-info');
      $node.insertAfter($pill.find('input[type=search]'));
    }
    if (!data) {
      Common.processEmptyData(json, $node);
      return;
    }
    else {
      if (data.vol != '-') {
        var html = geo + ' Volume: ' + data.vol + '/mo';
        $node.html(html);
      }
      else {
        $node.html('');
      }
    }
  };


  const initTrendsChart = (params) => {
    params.parentSelector = '.fe-line-chart';
    params.addFn = function($node){
      $(params.parentSelector).css({
        'overflow': 'auto',
        'height': 'auto'
      }).prepend($node);
    };
    params.parentClassName = 'xt-gtrends-trends-root';
    if (params.queries && params.queries.length === 1) {
      params.parentClassName = 'xt-gtrends-trends-single-root';
    }
    var query = params.query;
    if (!query) query = params.queries[0];
    params.rootId = 'xt-trend-chart-root';
    params.title = 'Trend Data';
    params.buttonCopy = 'Copy';
    params.buttonExport = 'Export';
    params.source = source;
    params.darkMode = false;
    params.aspectRatio = 5;
    params.captcha = $('.g-recaptcha-response').val();
    TrendsChart.init(params);
  };


  var processReport = function( node ){
    // console.log(node);
    var $node = $(node);
    if ($node.closest('.geo-widget-wrapper, .multi-heat-map-widget')[0]) return;
    if ($node.closest('[widget-name="RELATED_TOPICS"]')[0]) return;
    var list = $node.find('.trends-bar-chart-name, .label-text span:first-child');
    for (var i = 0, len = list.length; i < len; i++) {
      if (list.find('.xt-gtrends-line')[0]) continue;
      var keyword = Common.cleanKeyword( list[i].textContent );
      reportKeywordsList.push({
        keyword: keyword,
        node: list[i]
      });
    }
    var hasCredits = Common.getCredits() > 0;
    if (hasCredits) {
      if (processReportTimer) clearTimeout(processReportTimer);
      processReportTimer = setTimeout(function(){
        processKeywords( reportKeywordsList, null );
      }, 200);
    }

    if (volBtnTimer) clearTimeout(volBtnTimer);
    volBtnTimer = setTimeout(function(){
      if (!loadRelatedQueriesPermission) {
        addLoadRelatedBtn(reportKeywordsList);
      }
      addSearchVolButtons();
    }, 100);
  };


  var processKeywords = function( keywordsList, table ){
    var keywords = {};
    for (var i = 0, len = keywordsList.length; i < len; i++) {
      keywords[ keywordsList[i].keyword ] = '';
      // if (!loadRelatedQueriesPermission) {
      //   var node = keywordsList[i].node;
      //   var $node = $(node);
      //   var $a = $('<a class="xt-gtrends-line">Load Metrics (uses 25 credits)</a>');
      //   if (!$node.find('.xt-gtrends-line')[0]) $node.append($a);
      //   $a.click(function(e){
      //     e.preventDefault();
      //     e.stopPropagation();
      //     loadRelatedQueriesPermission = true;
      //     $('.xt-gtrends-line').remove();
      //     processKeywords(keywordsList, table);
      //   });
      // }
    }
    if (!loadRelatedQueriesPermission) return;
    Common.processKeywords({
        keywords: Object.keys( keywords ),
        tableNode: table,
        src: source
      },
      function(json){
        processJSON( json, keywordsList );
        reportKeywordsList = [];
      }
    );
  };


  var processJSON = function( json, keywordsList ){
    var data = json.data;
    var dataByKeyword = {};
    for (var key in data) {
      var item = data[key];
      dataByKeyword[ item.keyword ] = item;
    }
    for (var i = 0, len = keywordsList.length; i < len; i++) {
      var keyword = keywordsList[i].keyword;
      var item = dataByKeyword[ keyword];
      if (item) {
        var title = Common.getResultStr(item);
        if (title) title = '[' + title + ']';
        var $res = $('<span/>').addClass('xt-gtrends-line').html(title);
        var color = Common.highlight(item);
        if (color) {
          $res.addClass('xt-highlight');
          $res.css('background', color);
        }
        // Common.appendStar($res, item);
        Common.addKeywords(keyword, item);
        Common.appendKeg($res, json, item);
        var $node = $( keywordsList[i].node );
        if ($node.find('.xt-gtrends-line')[0]) {
          $node.find('.xt-gtrends-line').remove();
        }
        $node.append( $res );
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
