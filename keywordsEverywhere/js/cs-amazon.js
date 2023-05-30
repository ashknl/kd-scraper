var Tool = (function(){

  var source = 'amazon';

  var rootSel = '#nav-search';
  var observer = null;

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
        var node = $('#nav-flyout-searchAjax')[0];
        if (node) {
          clearInterval(timer);
          initMutationObserver(node);
        }
      }
    }, 500);
  };


  var processPage = function(){
    console.log('processPage');
    if (!document.location.pathname.match(/(\/s(\/|$)|gp\/search)/)) return;
    var query = getQuery();
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
    return $.trim($('input[name="field-keywords"]').val());
  };


  var getTLD = function(){
    let tld = document.location.host.replace('www.', '').replace('amazon.', '').replace('smile.', '');
    return tld;
  };


  var processQueryResponse = function( json ){
    var data;
    var settings = Starter.getSettings();
    if (json.error) {
      console.log('Error', json);
      return;
    }
    if (json.data) data = json.data[0];
    var $node = $('#xt-info');
    if (!$node.length) {
      $node = $('<div/>', {
          class: 'xt-amazon-query'
        })
        .attr('id', 'xt-info');
      $node
        .insertAfter( $(rootSel) );
        // .css('margin-left', $(rootSel).position().left);
      $('#nav-search').addClass('xt-amazon-h');
    }
    if (!data) {
      if (json.error_code === 'NOCREDITS' || json.error_code === 'NO_API_KEY') {
        if (settings.showAutocompleteButton) {
          var html = Common.appendLTKBtn('', {
            query: getQuery(),
            title: 'Find Amazon keywords for',
            service: 'amazon'
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
        var html = Common.getResultStrType2(data, {darkMode: true});
        html = Common.appendStar(html, data);
        html = Common.appendKeg(html, json, data);
        var settings = Starter.getSettings();
        if (settings.showAutocompleteButton) {
          html = Common.appendLTKBtn(html, {
            query: getQuery(),
            service: 'amazon',
            title: 'Find Amazon keywords for',
            tld: getTLD()
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
    // console.log(target);
    if (!target) return;
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
      // var $node = $(node);
      if (node.id === 'suggestions-template') {
        processSuggestions(node);
      }
      else if (node.querySelector('.s-suggestion')) {
        processSuggestion(node);
      }
    }
  };


  var processSuggestions = function(node){
    var $node = $(node);
    var suggestionsList = {};
    $node.find('.s-suggestion').map(function(i, item){
      var keyword = Common.cleanKeyword(item.dataset.keyword);
      suggestionsList[keyword] = item;
    });
    if (suggestionsTimer) clearTimeout(suggestionsTimer);
    suggestionsTimer = setTimeout(function(){
      processSuggestionsList(suggestionsList);
      suggestionsTimer = null;
    }, 1000);
  };


  var processSuggestion = function(node){
    var $node = $(node);
    if (!suggestionsTimer) suggestionsList = {};
    $node.find('.s-suggestion').map(function(i, item){
      if ($(item).closest('.discover-tr')[0]) return;
      var keyword = item.dataset.keyword;
      if (!keyword) keyword = $.trim(item.textContent);
      suggestionsList[keyword] = item;
    });
    if (suggestionsTimer) clearTimeout(suggestionsTimer);
    suggestionsTimer = setTimeout(function(){
      processSuggestionsList();
      suggestionsTimer = null;
    }, 1000);
  };


  var processSuggestionsList = function(list){
    if (!list) list = suggestionsList;
    for (var key in list) {
      var node = list[key];
      if (!$(node).is(':visible')) delete list[key];
    }
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
