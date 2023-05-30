var Tool = (function(){

  var source = 'yahsea';

  var rootSel = 'form#sf';
  var observer;
  var suggestionsTimer;
  var suggestionsList = {};


  var init = function(){
    initWindowMessaging();
    setTimeout( function(){
      processPage();
      initSuggestions();
    }, 500 );
    // initURLChangeListener(function(){
    //   setTimeout( function(){
    //     processPage();
    //   }, 500 );
    // });
  };


  var initWindowMessaging = function(){
    // console.log('initWindowMessaging');
    window.addEventListener("message", function(event){
      var payload = event.data;
      if (typeof payload !== 'object') return;
      var cmd = payload.cmd;
      var data = payload.data;
      if (!cmd) return;
      if (cmd === 'xt.resize') {
        var height = data.height;
        var source = data.source;
        var selector = '';
        if (source === 'related') selector = '#xt-related-search';
        if (!selector) return;
        if (height <= 0) return;
        $(selector + ' iframe').height(height + 10);
      }
    }, false);
  };


  var initSuggestions = function(){
    var timer = setInterval(function(){
      if (!observer) {
        var node = $('.sa, .header-search-assist')[0];
        if (node) {
          clearInterval(timer);
          initMutationObserver(node);
        }
      }
    }, 500);
  };


  var getQuery = function(){
    return $('#yschsp').val();
  };


  var processPage = function(){
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


  var processQueryResponse = function( json ){
    var data;
    if (json.data) data = json.data[0];
    var $node = $('#xt-info');
    if (!$node.length) {
      $node = $('<link/>', {
          class: 'xt-yahoo-query'
        })
        .attr('id', 'xt-info');
      var settings = Starter.getSettings();
      $node
        .insertAfter( $(rootSel) );
    }
    if (json.error_code === 'NOCREDITS') {
      return;
    }
    else if (!data) {
      Common.processEmptyData(json, $node);
      return;
    }
    else {
      if(data.vol != '-') {
        Common.addKeywords(data.keyword);
        var html = Common.getResultStrType2(data);
        html = Common.appendStar(html, data);
        html = Common.appendKeg(html, json, data);
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
      if ($node.hasClass('sa-tray')) {
        processSuggestion(node);
      }
      else if ($node.find('[role="listbox"]')) {
        processSuggestion(node);
      }
    }
  };


  var processSuggestion = function(node){
    var $node = $(node);
    var suggestionsList = {};
    $node.find('li[role=option]').map(function(i, item){
      var keyword = $.trim(item.getAttribute('data'));
      if (!keyword) {
        keyword = $.trim(item.textContent);
      }
      suggestionsList[keyword] = item;
    });
    processSuggestionsList(suggestionsList);
  };



  var processSuggestionsList = function(list){
    Common.processKeywords({
        keywords: Object.keys( list ),
        tableNode: {},
        src: source
      },
      function(json){
        // console.log(json, list);
        processSuggestionsListResponse( json, list );
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
      $node.find('>span').append( $span );
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
