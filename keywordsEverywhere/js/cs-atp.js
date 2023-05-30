var Tool = (function(){

  var source = 'answtp';

  var keywordsList = [];

  var observer;


  var init = function(){
    initMutationObserver( document.body );
  };


  var initMutationObserver = function( target ){
    if (observer) observer.disconnect();

    var timer;

    var run = function(){
      if (!$('.sections section svg').length) {
        timer = setTimeout(run, 2000);
        return;
      }
      // observer.disconnect();
      processPage();
      return true;
    };

    observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          // console.log(mutation.addedNodes[0], mutation.addedNodes[0].nodeName);
          // if (mutation.addedNodes[0] && mutation.addedNodes[0].nodeName.match(/^(circle|path|g|#?text)$/i)) {
          //   clearTimeout(timer);
          //   timer = setTimeout(run, 5000);
          // }
          if (mutation.addedNodes[0] && mutation.addedNodes[0].nodeName === 'SECTION') {
            clearTimeout(timer);
            timer = setTimeout(run, 5000);
          }
        }
      });
    });

    var config = { subtree: true, childList: true };
    observer.observe(target, config);
    setTimeout(run, 5000);
  };


  var processPage = function(){
    var list = $('.modifier-list li, .node text, .modifier-list--suggestion p');
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
        keywords: Object.keys(keywords),
        tableNode: table,
        src: source
      },
      function(json){
        processJSON( json, Object.keys(keywords) );
      }
    );
  };


  var processJSON = function( json, keywords ){
    var data = json.data;
    var dataByKeyword = {};
    for (var key in data) {
      var item = data[key];
      dataByKeyword[ item.keyword ] = item;
      Common.addKeywords(item.keyword);
    }
    for (var i = 0, len = keywordsList.length; i < len; i++) {
      var keyword = keywordsList[i].keyword;
      var item = dataByKeyword[keyword];
      if ( item ) {
        var title = Common.getResultStr(item, 'full');
        var shortTitle = Common.getResultStr(item);
        var color = Common.highlight(item);
        var res = '';
        if (shortTitle) {
          res = $('<span>').addClass('xt-atp-line').html('[' + shortTitle + ']');
          Common.appendStar(res, item);
          Common.appendKeg(res, json, item);
          if (color) {
            res.addClass('xt-highlight');
            res.css({background: color});
          }
        }
        var $node = $( keywordsList[i].node );
        if ($node[0].tagName === 'text' && title) {
          var $titleHTML = $('<div/>');
          var titleHTML = $node[0].textContent + '<br>';
          // titleHTML += title.replace(/\s+-\s+/g, '<br/>');
          titleHTML += ' - ' + title;
          var svgTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
          svgTitle.innerHTML = titleHTML;
          $node.append(svgTitle);
          $node.attr('font-weight', '700');
          if (color) $node.attr('fill', LightenDarkenColor(color, -50));
        }
        else if (!$node.find('.xt-atp-line')[0]) $node.append( res );
      }
    }
    $(document).tooltip({
      open: function (event, ui) {
        ui.tooltip.css("max-width", "500px");
      },
      content: function() {
          return $(this).attr('title').replace(/\n/g, '<br>');
      },
      show: {
        effect: "show",
        delay: 0
      },
      position: {
        my: "center bottom-30",
        at: "center top"
      }
    });
  };


  var LightenDarkenColor = function(col, amt) {
      var usePound = false;
      if (col[0] == "#") {
          col = col.slice(1);
          usePound = true;
      }
      var num = parseInt(col,16);
      var r = (num >> 16) + amt;
      if (r > 255) r = 255;
      else if  (r < 0) r = 0;
      var b = ((num >> 8) & 0x00FF) + amt;
      if (b > 255) b = 255;
      else if  (b < 0) b = 0;
      var g = (num & 0x0000FF) + amt;
      if (g > 255) g = 255;
      else if (g < 0) g = 0;
      var res = '000000' + (g | (b << 8) | (r << 16)).toString(16);
      res = res.substr(-6);
      return (usePound?"#":"") + res;
  };


  var getSource = function(){
    return source;
  };


  return {
    init: init,
    getSource: getSource
  };


})();
