var Tool = (function(){

  var source = 'soovle';

  var observerTarget = '#divscontainer';
  var tableSelector = '.table-anchor-text';
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
      if (node.className && node.className.match(/ui-draggable/)) {
        if (tableTimer) clearTimeout( tableTimer );
        tableTimer = setTimeout(function(){
          processPage();
          tableTimer = null;
        }, 1000);
      }
    }
  };


  var processPage = function(){
    var keywordsList = [];
    var list = $('[classname=sugg]');
    for (var i = 0, len = list.length; i < len; i++) {
      var keyword = Common.cleanKeyword( list[i].textContent );
      keywordsList.push({
        keyword: keyword,
        node: list[i]
      });
    }
    processKeywords( keywordsList, null );
  };


  var processKeywords = function( keywordsList, table ){
    var keywords = {};
    for (var i = 0, len = keywordsList.length; i < len; i++) {
      keywords[ keywordsList[i].keyword ] = '';
    }
    Common.processKeywords({
        keywords: Object.keys( keywords ),
        tableNode: table,
        src: source
      },
      function(json){
        processJSON( json, keywordsList );
      }
    );
    Starter.initMouseEvents();
    Starter.addSettingsButton();
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
      var item = dataByKeyword[keyword];
      if ( item ) {
        var title = Common.getResultStr(item);
        var color = Common.highlight(item);
        if (title) title = '[' + title + ']';
        var $res = $('<span>').addClass('xt-soovle-line').text(title);
        if (color) {
          $res.addClass('xt-highlight');
          $res.css('background', color);
        }
        Common.addKeywords(keyword, item);
        var $node = $( keywordsList[i].node );
        if (!$node.find('.xt-soovle-line')[0]) {
          var $titleHTML = $('<div/>');
          $('<strong/>').text($node[0].textContent).appendTo($titleHTML);
          $('<div/>').html(title).appendTo($titleHTML);
          $node.attr('title', $titleHTML.html());
          $node.append( $res );
        }
      }
    }
    $(document).tooltip({
      open: function (event, ui) {
        ui.tooltip.css("max-width", "500px");
      },
      content: function() {
          return $(this).attr('title');
      },
      show: {
        effect: "show",
        delay: 0
      },
      position: {
        my: "center bottom-10",
        at: "center top"
      }

    });
  };


  var getSource = function(){
    return source;
  };


  return {
    init: init,
    getSource: getSource
  };


})();
