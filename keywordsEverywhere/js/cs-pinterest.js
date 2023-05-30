var Tool = (function(){

  var vendor = (navigator.userAgent.match(/(Chrome|Firefox)/) || [])[1];

  var source = 'pntrst';

  var settings;
  var rootSel = '#searchBoxContainer > div:last-child';
  var observer = null;

  var suggestionsTimer;
  var suggestionsList = {};
  var cachedSuggestions = {};

  var relatedTimer = null;

  var $widgetsRoot;


  var init = function(){
    settings = Starter.getSettings();
    $('body').addClass('xt-' + source);
    setTimeout( function(){
      processPage();
      initSuggestions();
    }, 500 );
    initURLChangeListener(function(url){
      setTimeout( function(){
        processPage();
      }, 1000 );
    });
  };


  var initSuggestions = function(){
    var timer = setInterval(function(){
      if (!observer) {
        var node = $('#searchBoxContainer')[0];
        if (node) {
          clearInterval(timer);
          initMutationObserver(node);
        }
      }
    }, 500);
  };


  var processPage = function(){
    if (!document.location.pathname.match(/\/search/)) return;

    var query = getQuery();
    query = Common.cleanKeyword(query);
    console.log(query);
    chrome.runtime.sendMessage({
      cmd: 'api.getKeywordData',
      data: {
        keywords: [query],
        src: source
      }
    }, function( json ){
      processQueryResponse( json );
      initWidgetsRoot();
      if (settings.showGoogleTrendChart || settings.sourceList.gprsea) {
        initTrendsChart(json);
      }
      initSearchInsights();
    });
  };


  var initWidgetsRoot = function(){
    if ($widgetsRoot) $widgetsRoot.remove();
    var $divs = $('.mainContainer > .zI7:not([data-test-id="drawer-container"]) > div');
    if (!$divs[0]) {
      $divs = $('[data-test-id="header"] > .zI7 > div');
    }
    $widgetsRoot = $('<div>', {id: 'xt-pinterest-widgets-root'})
      .css({'flex-grow': 1});
    if ($divs.length === 2) {
      $widgetsRoot.insertBefore($divs[0]);
      // var $banner = $($divs[0]);
      // console.log($banner[0]);
      // if ($banner.hasClass('qiB')) {
      //   $widgetsRoot.insertAfter($banner);
      // }
      // else {
      //   $banner.prepend($widgetsRoot);
      //   $banner
      //   .addClass('xt-pinterest-widgets-parent')
      //   .css({display: 'flex', height: 'auto'});
      // }
    }
    else if ($divs.length === 1) {
      $widgetsRoot.insertBefore($divs[0]);
    }
    else {
      if (typeof retry === 'undefined' || !retry) {
        console.log('Not found where to add widgets');
        setTimeout(function(){
          initWidgetsRoot();
          initTrendsChart(metricsResponse, true);
        }, 3000);
      }
      return;
    }
    console.log($widgetsRoot);
    $widgetsRoot.html(`
      <div id="xt-pinterest-widget-insights-container"></div>
      <div id="xt-pinterest-widget-chart-container"></div>
      <div id="xt-pinterest-widget-related-container"></div>
      `);
  };


  var getQuery = function(){
    var query = $('input[name=searchBoxInput]').val();
    if (!query) query = $('input[data-test-id="search-input"]').val();
    return $.trim(query);
  };


  var getTLD = function(){
    let tld = document.location.host.replace('www.', '').replace(/.*?\.pinterest\./, '').replace('pinterest.', '');
    return tld;
  };


  var getRelatedQueries = function(){
    $items = $('[data-root-margin="search-improvements-bar"] [data-test-id="search-guide"]');
    var list = [];
    $items.map(function(i, item){
      var text = item.getAttribute('title');
      if (text && text.indexOf('Search for') !== -1) {
        text = text.replace(/Search for "(.*)"$/, '$1');
        list.push(text);
      }
    });
    return list;
  };


  var checkRelatedQueries = function($node){
    clearInterval(relatedTimer);
    var count = 0;
    relatedTimer = setInterval(function(){
      if (count > 10) clearInterval(relatedTimer);
      count++;
      var hasRelated = !!getRelatedQueries().length;
      if (hasRelated) {
        clearInterval(relatedTimer);
        var html = $node.html();
        html = Common.appendListBtn(html, {
          title: 'Find Related Pin Ideas',
          service: 'pinterest',
          query: getQuery(),
          tld: getTLD()
        });
        $node.html(html);
        $node.find('.xt-listbtn-str').click(function(){
          var list = getRelatedQueries();
          chrome.runtime.sendMessage({
            cmd: 'setKeywordsPendingList',
            data: list
          });
        });
      }
    }, 1000);
  };


  var processQueryResponse = function( json ){
    var data;
    if (json.data) data = json.data[0];
    var $node = $('#xt-info');
    var hasRelated = !!getRelatedQueries().length;
    if (!$node.length) {
      $node = $('<div/>', {
          class: 'xt-pinterest-query'
        })
        .attr('id', 'xt-info');
      var $afterNode = $(rootSel);
      if (!$afterNode[0]) $afterNode = $('form[name=search]').parent().parent();
      $node
        .insertAfter( $afterNode );
    }
    if (!data) {
      if (json.error_code === 'NOCREDITS' || json.error_code === 'NO_API_KEY') {
        if (settings.showAutocompleteButton) {
          var html = Common.appendLTKBtn('', {
            query: getQuery(),
            title: 'Find topic ideas for ',
            service: 'pinterest',
            tld: getTLD()
          });
          // if (hasRelated) {
          //   html = Common.appendListBtn(html, {
          //     title: 'Find related pins',
          //     service: 'pinterest',
          //     tld: getTLD()
          //   });
          // }
          $node.html(html);
        }
      }
      else Common.processEmptyData(json, $node);
    }
    else {
      if (data.vol != '-') {
        Common.addKeywords(data.keyword);
        var html = Common.getResultStrType2(data);
        html = Common.appendStar(html, data);
        html = Common.appendKeg(html, json, data);
        if (settings.showAutocompleteButton) {
          html = Common.appendLTKBtn(html, {
            query: getQuery(),
            title: 'Find topic ideas for ',
            service: 'pinterest',
            tld: getTLD()
          });
          // if (hasRelated) {
          //   html = Common.appendListBtn(html, {
          //     query: getQuery(),
          //     title: 'Find related pins',
          //     service: 'pinterest',
          //     tld: getTLD()
          //   });
          // }
        }
        $node.html(html);
        var color = Common.highlight(data);
        if (color) {
          $node.addClass('xt-highlight');
          var fontColor = getContrastYIQ(color.replace('#', ''));
          $node.css({
            background: color,
            color: fontColor
          });
        }
      }
      else {
        $node.html('');
      }
    }
    checkRelatedQueries($node);
  };


  var getContrastYIQ = function(hexcolor){
    var r = parseInt(hexcolor.substr(0,2),16);
    var g = parseInt(hexcolor.substr(2,2),16);
    var b = parseInt(hexcolor.substr(4,2),16);
    var yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? 'black' : 'white';
  };


  var initURLChangeListener = function( cbProcessPage ){
    var url = document.location.href;
    var timer = setInterval(function(){
      if ( url !== document.location.href ) {
        $('.xt-pinterest-query').remove();
        url = document.location.href;
        cbProcessPage( url );
      }
    }, 1000);
  };


  var initMutationObserver = function( target ){
    var settings = Starter.getSettings();
    if (!settings.showMetricsForSuggestions) return;
    if (!target) return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          if (!mutation.addedNodes.length) return;
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
      var $node = $(node);
      if ($node.find('[data-test-id="search-suggestion"]')[0] || $node.attr('data-test-id') === 'search-suggestion') {
        processSuggestion(node);
      }
    }
  };


  var processSuggestion = function(node){
    var $node = $(node);
    if (!suggestionsTimer) suggestionsList = {};
    $node.find('[data-test-id="search-suggestion"]').map(function(i, item){
      var keyword = Common.cleanKeyword( $.trim(item.textContent) );
      suggestionsList[keyword] = item;
    });
    if ($node.attr('data-test-id') === 'search-suggestion') {
      var keyword = Common.cleanKeyword( $.trim($node.text()) );
      suggestionsList[keyword] = node;
    }
    if (suggestionsTimer) clearTimeout(suggestionsTimer);
    suggestionsTimer = setTimeout(function(){
      processSuggestionsList();
      suggestionsTimer = null;
    }, 200);
  };


  var processSuggestionsList = function(list){
    if (!list) list = suggestionsList;
    var key = Object.keys(list).join('');
    if (cachedSuggestions[key]) {
      processSuggestionsListResponse(cachedSuggestions[key], list);
      return;
    }
    Common.processKeywords({
        keywords: Object.keys( list ),
        tableNode: {},
        src: source
      },
      function(json){
        processSuggestionsListResponse( json, list );
        cachedSuggestions[key] = json;
      }
    );
  };


  var processSuggestionsListResponse = function(json, keywords){
    var data = json.data;
    for (var key in data) {
      var item = data[key];
      var node = keywords[ item.keyword ];
      var $node = $(node);
      $node.find('.xt-suggestions-search').remove();
      var $span = $('<span/>').addClass('xt-suggestions-search');
      if (item.vol != '-' && item.vol != '0') {
        var html = Common.getResultStr(item);
        var color = Common.highlight(item);
        if (color) {
          $span.addClass('xt-highlight');
          $span.css({background: color});
        }
        // html = Common.appendStar(html, item);
        // html = Common.appendKeg(html, json, item);
        $span.html(html);
      }
      $node.find('.kwA > .xuA > div').append( $span );
    }
  };


  /**
   * Chart
   */

  var initTrendsChart = function(metricsResponse, retry){
    var hasCredits = Common.getCredits() > 0;
    if (settings.showGoogleTrendChart) {
      chrome.runtime.sendMessage({cmd: 'api.getConfig'}, function(json){
        var endDate;
        if (!json.error && json.data && json.data.pinterest) {
          endDate = json.data.pinterest.endDate;
        }
        getChart({
          query: getQuery(),
          showVolume: hasCredits,
          metricsResponse: metricsResponse,
          endDate: endDate
        });
      });
    }
    if (settings.sourceList.gprsea) {
      getRelatedTerms({
        query: getQuery()
      });
    }
  };


  var getRelatedTerms = function(params){
    chrome.runtime.sendMessage({cmd: 'pinterestTrendsAPI.relatedTerms', data: {
      query: params.query
    }}, async (res) => {
      console.log(res);
      if (res.error) return;
      var settings = Starter.getSettings();
      try {
        let items = res.json;
        let keywords = {};
        items.map(function(item){
          let trend = convertWeeklyCountsToTrend(item.counts);
          if (trend) keywords[item.term] = trend;
        });
        if (!settings.apiKey ) {
          let rows = [];
          for (let keyword in keywords) {
            rows.push({keyword: keyword});
          }
          Common.renderWidgetTable(rows, getRenderParams({json: null}));
          return;
        }
        processKeywords( keywords, {} );
      } catch (e) {
        console.log(e);
      }
    });
  };


  var convertWeeklyCountsToTrend = function(counts){
    var now = new Date();
    var sum = 0;
    var res = [];
    var currentMonth = now.getMonth();
    var notZero = false;
    for (var i = 0, len = counts.length; i < len; i++) {
      var count = counts[i];
      if (currentMonth === now.getMonth()) {
        sum += count;
      }
      else {
        res.unshift(sum);
        if (sum > 0) notZero = true;
        sum = 0;
        currentMonth = now.getMonth();
      }
      now.setDate(now.getDate() - 7);
    }
    res.shift();
    if (notZero) res = res.join('|');
    else res = '';
    return res;
  };


  var processKeywords = function( keywords, table ){
    let list = Object.keys(keywords);
    console.log(list);
    Common.processKeywords({
        keywords: list,
        tableNode: table,
        src: source
      },
      function(json){
        processRelatedTermsResponse( json, keywords );
      }
    );
  };


  var processRelatedTermsResponse = function( json, keywords ){
    var data = json.data;
    var rows = [];
    if (json.error_code === 'NOCREDITS') {
      for (var keyword in keywords) {
        rows.push({keyword: keyword});
      }
      Common.renderWidgetTable(rows, getRenderParams({json: null, nocredits: true}));
      return;
    }

    if (typeof json.data !== 'object') return;
    for (var key in json.data) {
      var item = json.data[key];
      var trend = keywords[item.keyword];
      if (trend) {
        trend = trend.split('|');
        var avg = trend.reduce((partial_sum, a) => partial_sum + parseInt(a), 0) / trend.length;
        var volume = parseInt(item.vol.replace(/,/g, ''));
        var factor = volume / avg;
        var trendConverted = trend.map(function(val){
          return Math.round(parseInt(val) * factor);
        });
        item.trend = trendConverted.join('|');
      }
      rows.push(item);
    }
    if (!rows.length) return;
    rows.sort(function(a,b){
      var aVol = parseInt(a.vol.replace(/[,.\s]/g, ''));
      var bVol = parseInt(b.vol.replace(/[,.\s]/g, ''));
      return bVol - aVol;
    });
    Common.renderWidgetTable(rows, getRenderParams({json: json}));
  };


  var getRenderParams = function(params){
    var nocredits = params.nocredits;
    var settings = Starter.getSettings();
    var query = getQuery() || '';
    var res = {
      settingEnabled: settings.sourceList.bingco,
      type: 'related',
      title: 'Related Trends',
      query: query,
      columnName: 'Keyword',
      rootSelector: 'xt-pinterest-related-search',
      addTo: '#xt-pinterest-widget-related-container',
      addMethod: 'appendTo',
      noPagination: true,
      excludeCols: ['cpc', 'comp'],
      rootTagName: '<section>',
      iframeSrcParam: 'pinterest',
      filename: 'pinterest-' + query.replace(/\s+/g, '_'),
      fnGenerateLink: function(keywordEnc){
        return document.location.origin + '/search?q=' + keywordEnc;
      },
      onAdded: function($root){
        // checkWidgetPosition($root, $('#related'));
      },
      onClosed: function(){
        // clearTimeout(checkWidgetPositionTimer);
      },
      loadAll: function(){
        var $this = $(this);
        var $parent = $this.closest('.xt-widget-table');
        if (nocredits || !settings.apiKey) {
          chrome.runtime.sendMessage({
            cmd: 'new_tab',
            data: 'https://keywordseverywhere.com/credits.html'
          });
          return;
        }
        processRelatedSearch('manual');
        $this.remove();
      }
    };
    for (var key in params) {
      res[key] = params[key];
    }
    return res;
  };


  var initSearchInsights = async function(){
    let res = await fetch(document.location.href);
    let response = await res.text();
    let dom = (new DOMParser()).parseFromString(response, "text/html");
    let text = $('#__PWS_DATA__', dom).text();
    let json = JSON.parse(text);
    // console.log(json);
    let pins = json.props.initialReduxState.pins;
    console.log(pins);
    if (!Object.keys(pins).length) return;
    let stat = {
      count: 0,
      pinsCount: 0,
      productsCount: 0,
      verified: 0,
      pinners: {},
      pinnerDataById: {},
      pagesSum: 0,
      reaction_sum: {},
      reaction_total: 0,
      dominant_colors: []
    };
    for (let pinId in pins) {
      let pin = pins[pinId];
      if (stat.count >= 20) continue;
      if (!pinId.match(/^\d+$/)) continue; // promo
      if (!pin.pinner) continue;
      let isProduct = false;
      if (pin.shopping_flags && pin.shopping_flags.length > 0) {
        stat.productsCount++;
        isProduct = true;
      }
      else stat.pinsCount++;
      stat.count++;
      if (pin.dominant_color) stat.dominant_colors.push(pin.dominant_color);
      // console.log('----------------', pinId, pin.grid_title, pin.reaction_counts, pin.story_pin_data, pin);
      if (pin.story_pin_data) {
        stat.pagesSum += pin.story_pin_data.page_count;
      }
      let pinnerId = pin.pinner.id;
      !stat.pinners[pinnerId] ? stat.pinners[pinnerId] = 1 : stat.pinners[pinnerId]++;
      stat.pinnerDataById[pinnerId] = {
        name: pin.pinner.full_name,
        username: pin.pinner.username
      };
      if (!isProduct) {
        for (let key in pin.reaction_counts) {
          if (stat.reaction_sum[key]) {
            stat.reaction_sum[key].sum += pin.reaction_counts[key];
            stat.reaction_sum[key].count++;
          }
          else stat.reaction_sum[key] = {sum: pin.reaction_counts[key], count: 1};
          stat.reaction_total += pin.reaction_counts[key];
        }
      }
      if (pin.pinner.verified_identity.verified) {
        stat.verified++;
      }
    }
    stat.reaction_avg = Math.round(stat.reaction_total / stat.pinsCount);
    for (let key in stat.reaction_sum) {
      stat.reaction_sum[key].avg = Math.round(stat.reaction_sum[key].sum / stat.pinsCount);
    }
    let topPinnerId = getTopPinner(stat.pinners);
    if (topPinnerId) {
      stat.topPinner = stat.pinnerDataById[topPinnerId];
    }
    stat.pagesAvg = Math.round(stat.pagesSum / stat.pinsCount);
    stat.dominant_colors.sort(function(a,b){
      return parseInt(b.replace('#', '0x')) - parseInt(a.replace('#', '0x'));
    });
    renderSearchInsights(stat);
  };


  var getTopPinner = function(pinners){
    let max = 1;
    let id = '';
    for (let key in pinners) {
      if (pinners[key] > max) {
        max = pinners[key];
        id = key;
      }
    }
    return id;
  };


  var renderSearchInsights = function(data){
    var selector = 'xt-pinterest-insights-widget';
    var $root = $('#' + selector);
    if (!$root[0]) {
      var settings = Starter.getSettings();
      var apiKey = settings.apiKey || '';
      var query = getQuery();
      var pur = Common.getCredits() > 0 ? 0 : 1;
      var version = chrome.runtime.getManifest().version;
      var settingEnabled = settings.sourceList.youtag;
      $root = $('<section>', { id: selector, class: "xt-widget-table" }).prependTo('#xt-pinterest-widget-insights-container');
      $root.html([
        '<div class="xt-close">✖</div>',
        `<h3><img src="${chrome.runtime.getURL('img/icon64.png')}" width="24" height="24"> Search Insights</h3>`,
        '<div class="xt-copy-export-row">',
          '<button class="xt-copy-csv xt-ke-btn">' + Common.getIcon('copy') + ' Copy</button>',
          '<button class="xt-export-csv xt-ke-btn">' + Common.getIcon('export') + ' Export</button>',
        '</div>',
        '<div class="xt-pinterest-widget-insights-body"></div>',
        '<div class="xt-pinterest-widget-insights-footer">',
          '<div class="xt-widget-iframe"><iframe src="https://keywordseverywhere.com/ke/widget.php?apiKey=' + apiKey + '&source=psinsights&enabled=' + settingEnabled + '&pur=' + pur + '&darkmode=false&query=' + encodeURIComponent(Common.escapeHtml(query)) + '&country=' + settings.country + '&version=' + version + '" scrolling="no"></div>',
        '</div>'
      ].join('\n'));
    }
    let res = JSON.stringify(data, '', '  ');
    let topPinnerHTML = '-';
    if (data.topPinner) {
      let topPinnerShort = data.topPinner.name;
      if (topPinnerShort.length > 25) topPinnerShort = topPinnerShort.substr(0,25) + '&hellip;';
      topPinnerHTML = `<a href="/${data.topPinner.username}" target="_blank">${topPinnerShort}</a>`;
    }
    let colorsHTML = '';
    data.dominant_colors.map(function(n){
      colorsHTML += `<span class="xt-pinterest-color-item" style="background: ${n}"></span>`;
    });
    let html = [
      '<table>',
      `<tr><td class="xt-widget-table-td-keyword"><span class="xt-ke-help" title="Top Pinner - this is the Pinterest account that has the most pins in this search result">Top Pinner</span></td><td class=""><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${topPinnerHTML}</span></td></tr>`,
      `<tr><td class="xt-widget-table-td-keyword"><span class="xt-ke-help" title="Average Reactions - this is the average number of reactions that each pin has got in this search result">Average Reactions</span></td><td class=""><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${data.reaction_avg}</span></td></tr>`,
      `<tr><td class="xt-widget-table-td-keyword" colspan="2">${renderReactionStat(data.reaction_sum)}</td></tr>`,
      `<tr><td class="xt-widget-table-td-keyword"><span class="xt-ke-help" title="Total Verified Pinners - this is the total number of pinners who have their profiles verified">Total Verified Pinners</span></td><td class=""><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${data.verified}/${data.count}</span></td></tr>`,
      `<tr><td class="xt-widget-table-td-keyword"><span class="xt-ke-help" title="Average Slides Per Story - this is the average number of slides every pin has in this search result">Average Slides Per Story</span></td><td class=""><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${data.pagesAvg}</span></td></tr>`,
      `<tr><td class="xt-widget-table-td-keyword"><span class="xt-ke-help" title="Dominant Colors - these are the dominant colors of each pin image in this search result">Dominant colors</span></td><td class=""><div class="xt-pinterest-colors">${colorsHTML}</div></td></tr>`,
      '</table>'
    ].join('\n');
    $root.find('.xt-pinterest-widget-insights-body').html(html);
    $root.find('.xt-ke-help').keTooltip();
    $root.find('.xt-close').click(function(){
      $root.hide();
    });
    $root.find('.xt-copy-csv').click(function(e){
      Common.exportTableToCSV({
        table: $root.find('table'),
        method: 'copy'
      });
    });
    $root.find('.xt-export-csv').click(function(e){
      Common.exportTableToCSV({
        table: $root.find('table'),
        method: 'export',
        filename: 'searchinsights-' + query.replace(/\s+/g, '_') + '.csv'
      });
    });

  };


  var renderReactionStat = function(reaction_sum) {
    let html = '';
    for (var key in reaction_sum) {
      html += `<img src="data:image/svg+xml;base64,${pinterestImgURLs[key]}"> ${reaction_sum[key].avg}`;
    }
    return html;
  };


  /**
   * Chart
   */

  var getChart = function(params){
    let settings = Starter.getSettings();
    chrome.runtime.sendMessage({cmd: 'pinterestTrendsAPI.exactMatch', data: {
      query: params.query.toLowerCase(),
      country: settings.country,
      endDate: params.endDate
    }}, (res) => {
      let data = processTrendsResponse(res, params);
      if (!data) {
        // $('#xt-pinterest-widget-insights-container').addClass('hidden');
        $('#xt-pinterest-widget-chart-container').addClass('hidden');
        // $('#xt-pinterest-widget-related-container').addClass('hidden');
        return;
      }
      renderTrendsChart(params, data);
    });
  };


  var processTrendsResponse = function(res, params){
    // console.log(res, params);
    let metrics = params.metricsResponse;
    let result;
    let labels = [];
    let formattedTime = [];
    let values = [];
    let chartValues;
    let volumeChart = false;
    try {
      if (!res.json || !res.json[0]) return;
      let counts = res.json[0].counts;
      counts.map(function(item){
        labels.push(new Date(item.date).getTime());
        formattedTime.push(new Date(item.date).toLocaleDateString());
        values.push(item.normalizedCount);
      });
      chartValues = values;
      if (params.showVolume) {
        let convertedValues = convertInterestToVolume({
          labels,
          values,
          metrics: metrics,
          query: params.query
        });
        if (convertedValues) {
          chartValues = convertedValues;
          volumeChart = true;
        }
      }
    } catch (e) {
      console.log(e);
    }
    result = {
      volumeChart: volumeChart,
      labels: labels,
      values: chartValues,
      formattedTime: formattedTime
    };
    return result;
  };


  const convertInterestToVolume = (params) => {
    let {labels, values, metrics, query} = params;
    if (metrics.error) return;
    if (!metrics.data) return;
    let trendVals = metrics.data[0].trend.split('|');
    let lastVals = getLastNonZeroValues(trendVals, labels, values);
    let trendValue = lastVals.trendValue;
    if (typeof trendValue === 'undefined') return;
    if (trendVals.join('') === '') trendValue = parseInt(metrics.data[0].vol.replace(/,/g, ''));
    let interestValue = lastVals.interestValue;
    let divider = interestValue * 30;
    // if (timeRange.match(/(5yrs|12mo)/)) divider = interestValue * 4;
    // else if (timeRange.match(/(3mo|30d)/)) divider = interestValue * 30;
    // else if (timeRange === '7d') divider = interestValue * (30*24);
    let scaleFactor = trendValue / divider;
    let convertedValues = values.map(value => {
      let res = value * scaleFactor;
      let formattedRes;
      // if (res < 30 && timeRange.match(/(3mo|30d|7d)/)) formattedRes = res.toFixed(2);
      if (res <= 100) formattedRes = parseInt(res);
      else if (res > 100 && res <= 1000) formattedRes = (Math.round(res / 10) * 10);
      else if (res > 1000) formattedRes = Math.round(res / 100) * 100;
      return formattedRes;
    });
    // console.log(params, values, convertedValues, trendValue, interestValue, scaleFactor, lastVals);
    return convertedValues;
  };



  const getLastNonZeroValues = (arrTrend, arrTime, arrInterest) => {
    let sum = arrTrend.reduce((accumulator, currentValue) => {
      return accumulator + parseFloat(currentValue);
    });
    if (sum === 0) return {
      allZeroes: true,
      trendValue: 0
    };
    let today = new Date();
    let endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
    endOfPrevMonth.setHours(endOfPrevMonth.getHours()-endOfPrevMonth.getTimezoneOffset()/60);
    let endTs = endOfPrevMonth.getTime();
    let startIndex = arrTime.length - 1;
    let found = false;
    for (; startIndex >= 0; startIndex--) {
      if (arrTime[startIndex] < endTs) {
        found = true;
        break;
      }
    }
    // find non-zero
    let interestValue;
    let interestIndex;
    if (!found) {
      startIndex = 0; // for 7d & 30d
      for (let i = 0, len = arrTime.length; i < len; i++) {
        if (arrInterest[i] > 0) {
          interestIndex = i;
          interestValue = arrInterest[i];
          break;
        }
      }
    }
    else {
      for (let i = startIndex; i >= 0; i--) {
        if (arrInterest[i] > 0) {
          interestIndex = i;
          interestValue = arrInterest[i];
          break;
        }
      }
    }
    if (typeof interestIndex === 'undefined') {
      for (let i = 0, len = arrTime.length; i < len; i++) {
        if (arrInterest[i] > 0) {
          interestIndex = i;
          interestValue = arrInterest[i];
          break;
        }
      }
    }
    let nonZeroTS = arrTime[interestIndex];
    let d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    let trendValue;
    for (let i = 0, len = arrTrend.length; i < len; i++) {
      if (nonZeroTS >= d.getTime()) {
        trendValue = arrTrend[i];
        break;
      }
      d.setMonth(d.getMonth() - 1);
    }
    let res = {
      trendValue: trendValue,
      interestIndex: interestIndex,
      interestValue: interestValue,
      interestTS: nonZeroTS
    };
    return res;
  };


  var getIcon = function(icon) {
    switch (icon) {
      case 'copy':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      case 'export':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    }
  };


  var renderTrendsChart = function(params, data){
    let $widgetRoot = $('#xt-pinterest-widget-chart-container');
    let settings = Starter.getSettings();
    let geo = settings.country.toUpperCase();
    if (!geo) geo = 'US';
    if (geo !== 'UK' && geo !== 'CA') geo = 'US';
    let $div = $('<section>', {class: 'xt-widget-table'}).appendTo($widgetRoot);
    let html = [
      '<h3 class=""><img src="' + chrome.runtime.getURL('/img/icon24.png') + '" width="24" height="24" style="vertical-align:middle"> Trend Data For "' + params.query + ' (' + geo + ')"</h3>',
      '<div class="xt-copy-export-row">',
        '<button class="xt-copy-csv xt-ke-btn">' + getIcon('copy') + ' Copy</button>',
        '<button class="xt-export-csv xt-ke-btn">' + getIcon('export') + ' Export</button>',
      '</div>',
      `<canvas id="xt-trend-chart"></canvas>`,
    ].join('\n');
    html += Common.renderIframeHTML({
      query: params.query,
      settingEnabled: true,
      iframeSrcParam: source
    });
    $div.html(html);
    $div.append($('<div/>', {
      "class": 'xt-close'
    }).text('✖').click(function(e){
      $div.parent().remove();
    }));
    const getExportArray = (withHeaders) => {
      let arrRes = [];
      if (withHeaders) arrRes.push(['Date', `Search Volume ${params.countryTitle}`]);
      data.formattedTime.map((val, index) => {
        let date = val;
        arrRes.push([date, data.values[index]]);
      });
      return arrRes;
    };
    $widgetRoot.find('canvas').click(e => {
      chrome.runtime.sendMessage({
        cmd: 'new_tab',
        data: `https://trends.pinterest.com/?country=${geo}&terms=${params.query}`
      });
    });
    $widgetRoot.find('.xt-copy-csv').click(e => {
      e.preventDefault();
      Common.clipboardWrite( CSV.stringify(getExportArray(true), '\t') );
    });
    $widgetRoot.find('.xt-export-csv').click(e => {
      e.preventDefault();
      let query = params.query;
      let property = params.property;
      if (!property) property = 'google';
      let filename = ['trend', 'pinterest', query.replace(/\s+/g, '-'), Date.now()].join('-') + '.csv';
      filename = filename.toLowerCase();
      let csv = CSV.stringify( getExportArray(true), ',' );
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
      Common.saveToFile(csvData, filename);
    });
    let $canvas = $div.find('#xt-trend-chart');
    var ctx = $canvas[0].getContext('2d');

    Chart.defaults.multicolorLine = Chart.defaults.line;
    Chart.controllers.multicolorLine = Chart.controllers.line.extend({
      draw: function(ease) {
        let meta = this.getMeta();
        let points = meta.data || [];
        let regularColor = this.getDataset().borderColor;
        let partialColor = this.getDataset().partialColor;
        let area = this.chart.chartArea;
        let originalDatasets = meta.dataset._children
          .filter(function(data) {
            return !isNaN(data._view.y);
          });

        function _setColor(newColor, meta) {
          meta.dataset._view.borderColor = newColor;
        }

        if (!partialColor) {
          Chart.controllers.line.prototype.draw.call(this, ease);
          return;
        }

        for (let i = 0, len = meta.data.length; i < len; i++) {
          var value = meta.data[i];
          if (data.partial[i]) {
            _setColor(partialColor, meta);
            meta.dataset._children = originalDatasets.slice(i-1, i+1);
            meta.dataset.draw();
          }
          else {
            _setColor(regularColor, meta);
            meta.dataset._children = originalDatasets.slice(i-1, i+1);
            meta.dataset.draw();
          }
        }
        meta.dataset._children = originalDatasets;
        points.forEach(function(point) {
          point.draw(area);
        });
      }
    });

    var grayColor = params.darkMode ? '#aaa' : '#70757a';
    var gridColor = params.darkMode ? '#3e3e3e' : '#d9e2ef';
    var chartColor = '#c0504f';

    var chart = new Chart(ctx, {
      type: 'multicolorLine',
      data: {
        labels: data.labels,
        datasets: [{
          label: '',
          backgroundColor: chartColor,
          borderColor: chartColor,
          // partialColor: '#00f000',
          data: data.values,
          colors: ['', 'red', 'green', 'blue']
        }],
        type: "line",
        pointRadius: 0,
        lineTension: 0,
        borderWidth: 1
      },
      options: {
        elements: {
          point:{
            radius: 0
          }
        },
        legend: {
          display: false
        },
        animation: {
          duration: 0
        },
        scales: {
          xAxes: [{
            type: "time",
            distribution: "series",
            offset: true,
            ticks: {
              major: {
                enabled: true,
                fontStyle: "bold"
              },
              source: "data",
              autoSkip: true,
              autoSkipPadding: 75,
              maxRotation: 0,
              sampleSize: 100,
              fontColor: grayColor,
            },
            gridLines: {
              display: false
            },
          }],
          yAxes: [{
            ticks: {
              // display: data.volumeChart,
              display: true,
              beginAtZero: true,
              padding: 10,
              fontColor: grayColor,
              callback: function(value, index, values) {
                return Common.formatNumber(value);
              }
            },
            gridLines: {
              borderDashOffset: [2],
              drawBorder: false,
              color: gridColor,

              zeroLineColor: gridColor,
              zeroLineBorderDash: [2],
              zeroLineBorderDashOffset: [2]
            },
            scaleLabel: {
              display: true,
              fontColor: grayColor,
              labelString: data.volumeChart ? 'Search Volume' : 'Search Interest'
            }
          }]
        },
        tooltips: {
          intersect: false,
          mode: "index",
          callbacks: {
            label: function(e, t) {
              if (!data.volumeChart) return e.value;
              let res = parseFloat(e.value).toLocaleString();
              return `${res}`;
            },
            title: function(e, t){
              let index = e[0].index;
              let res = data.formattedTime[index];
              return res;
            }
          }
        }
      }
    });
    chart.update();
  };


  var getSource = function(){
    return source;
  };


  return {
    init: init,
    getSource: getSource
  };

})();


let pinterestImgURLs = {
  1: "PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwKSI+CjxwYXRoIGQ9Ik0yMi4xOCAzLjM1QzI0LjYxIDUuODIgMjQuNjEgOS44NCAyMi4xOCAxMi4zMUwxMiAyMi41TDEuODIgMTIuMzFDMC42MSAxMS4wNyAwIDkuNDUgMCA3LjgzQzAgNi4yMSAwLjYxIDQuNTkgMS44MiAzLjM1QzQuMjYgMC44OSA4LjIyIDAuODkgMTAuNjUgMy4zNUwxMiA0LjcyTDEzLjM0IDMuMzVDMTQuNTYgMi4xMiAxNi4xNiAxLjUgMTcuNzYgMS41QzE5LjM2IDEuNSAyMC45NiAyLjEyIDIyLjE4IDMuMzVaIiBmaWxsPSIjRkY1MjQ2Ii8+CjxwYXRoIGQ9Ik0xNi4yNCAxMi44OEMxNi4yNCAxMi45IDE2LjI1IDEyLjkyIDE2LjI1IDEyLjk0QzE2LjI1IDE1LjI1IDE0LjM1IDE3LjEzIDEyIDE3LjEzQzkuNjUgMTcuMTMgNy43NSAxNS4yNiA3Ljc1IDEyLjk0QzcuNzUgMTIuOTIgNy43NiAxMi45IDcuNzYgMTIuODhDOS4wMiAxMy41NSAxMC40NyAxMy45MyAxMiAxMy45M0MxMy41MyAxMy45MyAxNC45OCAxMy41NCAxNi4yNCAxMi44OFpNNyA3LjEzQzUuOTYgNy4xMyA1LjEyIDcuOTcgNS4xMiA5LjAxQzUuMTIgMTAuMDUgNS45NiAxMC44OCA3IDEwLjg4QzguMDQgMTAuODggOC44NyAxMC4wNCA4Ljg3IDlDOC44NyA3Ljk2IDguMDQgNy4xMyA3IDcuMTNaTTE3IDcuMTNDMTUuOTYgNy4xMyAxNS4xMiA3Ljk3IDE1LjEyIDkuMDFDMTUuMTIgMTAuMDUgMTUuOTYgMTAuODggMTcgMTAuODhDMTguMDQgMTAuODggMTguODggMTAuMDQgMTguODggOUMxOC44OCA3Ljk2IDE4LjA0IDcuMTMgMTcgNy4xM1oiIGZpbGw9IiM3MjA5MDYiLz4KPC9nPgo8ZGVmcz4KPGNsaXBQYXRoIGlkPSJjbGlwMCI+CjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyMSIgZmlsbD0id2hpdGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMS41KSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPiA=",
  5: "PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIzIDEyQzIzIDE4LjA4IDE4LjA4IDIzIDEyIDIzQzUuOTIgMjMgMSAxOC4wOCAxIDEyQzEgNS45MiA1LjkyIDEgMTIgMUMxOC4wOCAxIDIzIDUuOTIgMjMgMTJaIiBmaWxsPSIjOEY5RkY4Ii8+CjxwYXRoIGQ9Ik0xMiAxMkMxNC40OSAxMiAxNi45MSAxMi4yOCAxOS4yNSAxMi44QzE5LjI1IDEyLjgzIDE5LjI1IDEyLjg2IDE5LjI1IDEyLjg5QzE5LjI1IDE2LjgyIDE2IDIwIDEyIDIwQzggMjAgNC43NSAxNi44MiA0Ljc1IDEyLjg5QzQuNzUgMTIuODYgNC43NSAxMi44MyA0Ljc1IDEyLjhDNy4wOSAxMi4yOCA5LjUxIDEyIDEyIDEyWk02Ljc1IDkuMDlDNy4zOSA5LjA5IDcuOTYgOS40IDguMzIgOS44N0M4LjU4IDkuNTMgOC43NSA5LjEgOC43NSA4LjY0QzguNzUgNy41MyA3Ljg1IDYuNjIgNi43NSA2LjYyQzUuNjUgNi42MiA0Ljc1IDcuNTIgNC43NSA4LjY0QzQuNzUgOS4xMSA0LjkxIDkuNTMgNS4xOCA5Ljg3QzUuNTQgOS40IDYuMTEgOS4wOSA2Ljc1IDkuMDlaTTE3LjI1IDkuMDlDMTcuODkgOS4wOSAxOC40NiA5LjQgMTguODIgOS44N0MxOS4wOCA5LjUzIDE5LjI1IDkuMSAxOS4yNSA4LjY0QzE5LjI1IDcuNTMgMTguMzUgNi42MiAxNy4yNSA2LjYyQzE2LjE1IDYuNjIgMTUuMjUgNy41MiAxNS4yNSA4LjY0QzE1LjI1IDkuMTEgMTUuNDEgOS41MyAxNS42OCA5Ljg3QzE2LjA0IDkuNCAxNi42MSA5LjA5IDE3LjI1IDkuMDlaIiBmaWxsPSIjMDIxNTYzIi8+Cjwvc3ZnPiA=",
  7: "PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwKSI+CjxwYXRoIGQ9Ik04IDIxLjVIMTZWMjEuNTlDMTYgMjIuOTIgMTQuOTIgMjQgMTMuNTkgMjRIMTAuNDFDOS4wOCAyNCA4IDIyLjkyIDggMjEuNTlWMjEuNVpNMTAuODkgMC4wNjAwMDA4QzYuNDIgMC41NTAwMDEgMi44IDQuMTggMi4zIDguNjVDMS44NyAxMi41NyA0LjA1IDE2LjMgNi44IDE4QzcuNjQgMTguNTIgOCAxOS4xNCA4IDIwVjIwLjVIMTZWMjBDMTYgMTkuMTQgMTYuNCAxOC41IDE3LjIgMThDMTkuOTUgMTYuMjkgMjEuNzUgMTMuMjIgMjEuNzUgOS43NUMyMS43NSA0IDE2Ljc3IC0wLjU4OTk5OSAxMC44OSAwLjA2MDAwMDhaIiBmaWxsPSIjRkZEMzQ4Ii8+CjxwYXRoIGQ9Ik0xMC4zOCA2LjI1QzEwLjM4IDcuMjkgOS41NCA4LjEyIDguNSA4LjEyQzcuNDYgOC4xMiA2LjYzIDcuMjkgNi42MyA2LjI1QzYuNjMgNS4yMSA3LjQ3MDAxIDQuMzcgOC41MSA0LjM3QzkuNTUgNC4zNyAxMC4zOCA1LjIxIDEwLjM4IDYuMjVaTTE1Ljc1IDQuMzdDMTQuNzEgNC4zNyAxMy44NyA1LjIxIDEzLjg3IDYuMjVDMTMuODcgNy4yOSAxNC43MSA4LjEyIDE1Ljc1IDguMTJDMTYuNzkgOC4xMiAxNy42MyA3LjI4IDE3LjYzIDYuMjVDMTcuNjMgNS4yMiAxNi43OSA0LjM3IDE1Ljc1IDQuMzdaTTcgMTIuMDVDNyAxNC43OCA5LjI0IDE3IDEyIDE3QzE0Ljc2IDE3IDE3IDE0Ljc4IDE3IDEyLjA1QzE3IDkuMzIgNyA5LjMyIDcgMTIuMDVaIiBmaWxsPSIjNkEzOTA5Ii8+CjwvZz4KPGRlZnM+CjxjbGlwUGF0aCBpZD0iY2xpcDAiPgo8cmVjdCB3aWR0aD0iMTkuNSIgaGVpZ2h0PSIyNCIgZmlsbD0id2hpdGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIuMjUpIi8+CjwvY2xpcFBhdGg+CjwvZGVmcz4KPC9zdmc+IA==",
  11: "PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE1IDIzSDlDNC41OCAyMyAxIDE5LjQyIDEgMTVWOUMxIDQuNTggNC41OCAxIDkgMUgxNUMxOS40MiAxIDIzIDQuNTggMjMgOVYxNUMyMyAxOS40MiAxOS40MiAyMyAxNSAyM1oiIGZpbGw9IiNGRkFENjUiLz4KPHBhdGggZD0iTTkuODggOEM5Ljg4IDkuMDQgOS4wNCA5Ljg4IDggOS44OEM2Ljk2IDkuODggNi4xMiA5LjA0IDYuMTIgOEM2LjEyIDYuOTYgNi45NiA2LjEyIDggNi4xMkM5LjA0IDYuMTIgOS44OCA2Ljk2IDkuODggOFpNMTYgNi4xMkMxNC45NiA2LjEyIDE0LjEyIDYuOTYgMTQuMTIgOEMxNC4xMiA5LjA0IDE0Ljk2IDkuODggMTYgOS44OEMxNy4wNCA5Ljg4IDE3Ljg4IDkuMDQgMTcuODggOEMxNy44OCA2Ljk2IDE3LjA0IDYuMTIgMTYgNi4xMlpNMTIgMTEuNUM5LjkzIDExLjUgOC4yNSAxMy40IDguMjUgMTUuNzVDOC4yNSAxOC4xIDkuOTMgMjAgMTIgMjBDMTQuMDcgMjAgMTUuNzUgMTguMSAxNS43NSAxNS43NUMxNS43NSAxMy40IDE0LjA3IDExLjUgMTIgMTEuNVoiIGZpbGw9IiM2MDM2MUEiLz4KPC9zdmc+IA==",
  13: "PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuNTggMjNMMy45MyAxNS40NkwwIDkuNEw3LjAxIDYuNDhMMTIgMUwxNi45OSA2LjQ5TDI0IDkuNEwyMC4wNyAxNS40NUwxOS40MiAyM0wxMiAyMUw0LjU4IDIzWiIgZmlsbD0iIzQ0RTFCOSIvPgo8cGF0aCBkPSJNMTYuNDkgMTQuNUMxNi40OSAxNC41MyAxNi41IDE0LjU1IDE2LjUgMTQuNTdDMTYuNSAxNy4wMSAxNC40OSAxOSAxMiAxOUM5LjUwOTk5IDE5IDcuNDk5OTkgMTcuMDIgNy40OTk5OSAxNC41N0M3LjQ5OTk5IDE0LjU0IDcuNTA5OTkgMTQuNTIgNy41MDk5OSAxNC41QzguODU5OTkgMTUuMTcgMTAuMzggMTUuNTYgMTIgMTUuNTZDMTMuNjIgMTUuNTYgMTUuMTQgMTUuMTcgMTYuNDkgMTQuNVpNNy44Mzk5OSAxMS4zMUM4LjQ3OTk5IDExLjE0IDkuMTI5OTkgMTEuMyA5LjYwOTk5IDExLjY4QzkuNzU5OTkgMTEuMyA5Ljc5OTk5IDEwLjg4IDkuNjc5OTkgMTAuNDZDOS4zOTk5OSA5LjQxIDguMjk5OTkgOC43OSA3LjIyOTk5IDkuMDdDNi4xNTk5OSA5LjM1IDUuNTI5OTkgMTAuNDMgNS44MTk5OSAxMS40OEM1LjkyOTk5IDExLjkgNi4xNzk5OSAxMi4yNSA2LjQ5OTk5IDEyLjVDNi43MTk5OSAxMS45MyA3LjE5OTk5IDExLjQ4IDcuODM5OTkgMTEuMzFaTTE3LjUgMTIuNUMxNy44MiAxMi4yNSAxOC4wNyAxMS45IDE4LjE4IDExLjQ4QzE4LjQ3IDEwLjQzIDE3LjgzIDkuMzUgMTYuNzcgOS4wN0MxNS43IDguNzkgMTQuNjEgOS40MSAxNC4zMiAxMC40NkMxNC4yMSAxMC44OCAxNC4yNCAxMS4zIDE0LjM5IDExLjY4QzE0Ljg3IDExLjMgMTUuNTIgMTEuMTQgMTYuMTYgMTEuMzFDMTYuOCAxMS40OCAxNy4yOCAxMS45MyAxNy41IDEyLjVaIiBmaWxsPSIjMEM0MDNCIi8+Cjwvc3ZnPiA="
};
