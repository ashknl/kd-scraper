var Tool = (function(){

  var source = 'etsyco';

  var rootSel = '.gnav-search-inner, #gnav-search .wt-menu';
  var observer = null;

  var suggestionsTimer = null;
  var cachedSuggestions = {};


  var init = function(){
    setTimeout( function(){
      processPage();
      initSuggestions();
      initURLChangeListener(processPage);
    }, 500 );
  };


  var initSuggestions = function(){
    var timer = setInterval(function(){
      if (!observer) {
        var node = $('#search-suggestions, [data-id="search-suggestions"]')[0];
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
    console.log(query);
    query = Common.cleanKeyword(query);
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
    var query = $('input#search-query, [data-id="search-query"]').val();
    return $.trim(query);
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
    if (json.data) data = json.data[0];
    var settings = Starter.getSettings();
    var $node = $('#xt-info');
    if (!$node.length) {
      $node = $('<div/>', {
          class: 'xt-etsy-query'
        })
        .attr('id', 'xt-info');
      $node
        .insertAfter( $(rootSel) )
        .css('margin-left', $(rootSel).position().left);
    }
    if (!data) {
      if (json.error_code === 'NOCREDITS' || json.error_code === 'NO_API_KEY') {
        if (settings.showAutocompleteButton) {
          var html = Common.appendLTKBtn('', {
            query: getQuery(),
            title: 'Find Etsy keywords for',
            service: 'etsy'
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
            title: 'Find Etsy keywords for',
            service: 'etsy'
          });
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
        // console.log(mutation);
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
      if ($node.find('.as-rich')[0]) {
        processSuggestion(node);
      }
    }
  };


  var processSuggestion = function(node){
    var $node = $(node);
    var suggestionsList = {};
    $node.find('.as-rich .as-suggestion').map(function(i, item){
      var keyword = Common.cleanKeyword( $.trim(item.textContent) );
      suggestionsList[keyword] = item;
    });
    if (suggestionsTimer) clearTimeout(suggestionsTimer);
    suggestionsTimer = setTimeout(function(){
      processSuggestionsList(suggestionsList);
    }, 1000);
  };


  var processSuggestionsList = function(list){
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
      $node.parent().addClass('xt-etsy-parent').append( $span );
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
