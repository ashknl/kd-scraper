var Tool = (function(){

  var source = 'ebayco';

  var rootSel = '#gh-ac-box';

  var observer;
  var suggestionsTimer;
  var suggestionsList = {};
  var cachedSuggestions = {};


  var init = function(){
    $('body').addClass('xt-' + source);
    setTimeout( function(){
      processPage();
      initSuggestions();
    }, 500 );
    initURLChangeListener(function(url){
      setTimeout( function(){
        processPage();
      }, 500 );
    });
  };


  var initSuggestions = function(){
    var timer = setInterval(function(){
      if (!observer) {
        var node = $('#ebay-autocomplete, .ui-autocomplete')[0];
        if (node) {
          clearInterval(timer);
          initMutationObserver(node);
          console.log(node);
        }
      }
    }, 500);
  };


  var processPage = function(){
    if (!document.location.pathname.match(/\/sch\//)) return;
    var query = getQuery();
    query = Common.cleanKeyword(query);
    console.log(query);
    if (!query) return;
    chrome.runtime.sendMessage({
      cmd: 'api.getKeywordData',
      data: {
        keywords: [query],
        src: source
      }
    }, function( json ){
      processQueryResponse( json );
    });
  };


  var getQuery = function(){
    var query = $.trim( $('#gh-ac').val() );
    return query;
  };


  var processKeywords = function( keywords, table ){
    Common.processKeywords({
        keywords: Object.keys( keywords ),
        tableNode: table,
        src: source
      },
      function(json){
        processRelatedSearchResponse( json, keywords );
      }
    );
  };


  var processQueryResponse = function( json ){
    var data;
    console.log(json);
    if (json.data) data = json.data[0];
    var $node = $('#xt-info');
    var settings = Starter.getSettings();
    if (!$node.length) {
      $node = $('<div/>', {
          class: 'xt-ebay-query'
        })
        .attr('id', 'xt-info');
      $node
        .insertAfter( $(rootSel) );
    }
    if (!data) {
      if (json.error_code === 'NOCREDITS' || json.error_code === 'NO_API_KEY') {
        if (settings.showAutocompleteButton) {
          var html = Common.appendLTKBtn('', {
            query: getQuery(),
            title: 'Find Ebay keywords for',
            service: 'ebay'
          });
          $node.html(html);
        }
      }
      else Common.processEmptyData(json, $node);
      return;
    }
    else {
      if(data.vol != '-') {
        Common.addKeywords(data.keyword);
        var html = Common.getResultStrType2(data);
        html = Common.appendStar(html, data);
        html = Common.appendKeg(html, json, data);
        if (settings.showAutocompleteButton) {
          html = Common.appendLTKBtn(html, {
            query: getQuery(),
            title: 'Find Ebay keywords for',
            service: 'ebay'
          });
        }
        $node.html(html);
        var color = Common.highlight(data);
        if (color) {
          $node.addClass('xt-highlight');
          $node.css({background: color});
        }
      }
      else {
        $node.html('');
      }
    }
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



  var initMutationObserver = function( target ){
    var settings = Starter.getSettings();
    if (!settings.showMetricsForSuggestions) return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          if (!mutation.addedNodes.length) return;
          // console.log(mutation);
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
      if ($node.attr('role') === 'presentation') {
        processSuggestion(node);
      }
      else if (node.dataset.type === 'AC_SUGGESTION') {
        processSuggestion(node);
      }
      else {
        var list = $node.find('ul[role=listbox]')[0];
        if (list) {
          $(list).find('li div[role=option]').map(function(i, node){
            processSuggestion(node);
          });
        }
      }
    }
  };


  var processSuggestion = function(node){
    var $node = $(node);
    var option = $node.find('.ghAC_sugg')[0];
    if (!option) option = $node.find('.ebay-autocomplete-suggestion');
    // console.log(option, node);
    if (!option) return;
    if (!suggestionsTimer) suggestionsList = {};
    var $option = $(option);
    var keyword = $(option).text();
    if ($option.find('i')[0]) keyword = keyword.replace(/\s+–\s+.*$/, '');
    // console.log(keyword);
    suggestionsList[keyword] = option;
    if (suggestionsTimer) clearTimeout(suggestionsTimer);
    suggestionsTimer = setTimeout(function(){
      processSuggestionsList();
    }, 100);
  };


  var processSuggestionsList = function(){
    var list = $.extend({}, suggestionsList);
    var key = Object.keys(list).join('');
    if (cachedSuggestions[key]) {
      processSuggestionsListResponse(cachedSuggestions[key], list);
      return;
    }
    suggestionsTimer = null;
    Common.processKeywords({
        keywords: Object.keys( list ),
        tableNode: {},
        src: source
      },
      function(json){
        // console.log(json, list);
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
      $node.append( $span );
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
