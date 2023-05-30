var UIHelper = (function(){

  var buttonsId = 'xt-buttons-container';
  var iconId = 'xt-icon';
  var popupId = 'xt-popup';
  var errorId = 'xt-error';
  var flagClassName = 'xt-flag';
  var messageShown = false;
  var installDate = 0;
  var lastClickDate = 0;

  var $popup = null;
  var $buttonsContainer = null;


  var addBrowserClass = function(node){
    if (navigator.userAgent.match(/Firefox/)) {
      $(node).addClass('xt-moz');
    }
  };


  var checkErrors = function( json, popupRoot ){
    var hints = ['error', 'alert', 'flag'];
    for (var i = 0, len = hints.length; i < len; i++) {
      var hint = hints[i];
      if (!json[hint]) continue;
      var content = json[hint];
      showIcon( hint, content, popupRoot );
    }
  };


  var checkAnniversary = function(){
    // show social share icons on specific dates -
    // based on user's install date - show every 30 days, 90 days, 180 days, 365 days - only show the icon for a single day
    /* Disabled - did not work very well
    chrome.storage.sync.get(['installDate', 'lastClickDate'], function(items) {
      if (items.installDate) installDate = items.installDate;
      if (items.lastClickDate) lastClickDate = items.lastClickDate;


      var iconByDays = {
        30: {
          title: 'You\'ve been using this chrome extension for 30 days. Hope you\'ve found it useful. We got something for you!',
          type: 'gift'
        },
        90: {
          title: 'Three months go by so quickly! Click for a special surprise!',
          type: 'baloons'
        },
        180: {
          title: 'You and I have been together for six months now! Click to celebrate our anniversary.',
          type: 'cupcake'
        },
        365: {
          title: 'Click for celebration time! I\'ve been installed in your chrome browser for one whole year!',
          type: 'gifts'
        }
      };

      var days = parseInt( (Date.now() - installDate) / (3600*24*1000) );
      var icon = iconByDays[ days ];
      if ( icon && (Date.now() - lastClickDate > 3600*24*1000) ) showIcon( icon.type, icon.title );
    });
    */
  };


  var showIcon = function( type, content, popupRoot ){
    if ($('[data-type="' + type + '"]')[0]) {
      return;
    }
    if (!$('.' + buttonsId)[0]) {
      $buttonsContainer = $('<div/>', {
        class: buttonsId
      });
      var $dragHandle = $('<div>', {class: 'xt-buttons-drag-handle'}).appendTo($buttonsContainer);
      $('body').append($buttonsContainer);
      initButtonsPosition($buttonsContainer);
      initDragEvents($dragHandle, $buttonsContainer);
    }
    var $icon = $('<div class="' + iconId + '"/>');
    $icon[0].dataset.type = type;
    // $icon.css({bottom: '10px'});

    if (type.match(/^(baloons|cupcake|gift|gifts)$/)) {
      $icon.css({position: 'fixed', bottom: '100px', right: '20px'});
      $('body').append($icon);
    }
    else {
      $icon.css({float: 'right'});
      $buttonsContainer.append($icon);
    }

    if (type === 'addKeywords') {
      $icon.addClass('xt-btn-addKeywords');
      $icon.html('<span class="xt-star" data-state="off"></span> Add All Keywords');
      addBrowserClass($icon);
    }
    else if (type === 'exportCSV') {
      $icon.addClass('xt-btn-exportCSV');
      $icon.html('Export CSV');
      addBrowserClass($icon);
    }
    else if (type === 'custom') {
      $icon.text('');
    }
    else {
      $icon.html( '<img width="32" height="32" src="' + chrome.runtime.getURL('/img/' + type + '.png') + '"/>' );
      $icon.find('span').hide();
    }

    $icon.click(function(){
      if (type === 'settings') {
        chrome.runtime.sendMessage({
          cmd: 'new_tab',
          data: chrome.runtime.getURL('/html/options.html')
        });
      }
      else if (type === 'addKeywords') {
        var star = $icon.find('.xt-star')[0];
        star.classList.add('xt-rotate');
        Common.uploadKeywords(function(json){
          star.classList.remove('xt-rotate');
          if (!json.error) {
            $('.xt-star').map(function(i, node){
              node.dataset.state = 'on';
            });
          }
        });
      }
      else if (type === 'exportCSV') {
        Common.exportKeywords();
      }
      else if (type.match(/^(baloons|cupcake|gift|gifts)$/)) {
        chrome.runtime.sendMessage({
          cmd: 'new_tab',
          data: 'https://keywordseverywhere.com/addon-share.html?s=c'
        });
        chrome.storage.sync.set({'lastClickDate': Date.now() } , function() {});
      }
      else {
        $('body').remove('#' + popupId);
        if (messageShown) {
          $('body').remove('#' + popupId);
          messageShown = false;
        }
        else {
          $popup = $('<div/>').attr('id', popupId).css({position: 'fixed',right: '10px',"z-index": 1000,}).hide();
          $popup.css({bottom: '70px'});
          $('body').append($popup);
          $popup.html(content).animate({right:'toggle'}, 350);
          messageShown = true;
        }
      }
    });
  };


  var showError = function( content ){
    var $node = $('#' + errorId);
    if (!$node[0]) {
      $node = $('<div/>').attr('id', errorId).hide();
      $node.append($('<div/>', {
        "class": 'xt-close'
      }).text('✖').click(function(e){
        $node.remove();
        $('html').removeClass('xt-transform');
      }));
      $node.append('<div class="xt-error-content"></div>');
      $('body').append($node);
      $node.find('.xt-error-content').html(content);
      //$node.animate({right:'toggle'}, 350);
      $node.slideDown();
      $('html').addClass('xt-transform');
    }
    else {
      $node.find('.xt-error-content').html(content);
    }
  };


  var moveButtons = function(bottom){
    if (!$buttonsContainer || !$buttonsContainer[0]) return;
    if ($buttonsContainer.hasClass('xt-buttons-moved')) return;
    $buttonsContainer.css({
      bottom: bottom
    });
  };


  var initButtonsPosition = function($root){
    chrome.storage.local.get('buttonsPosition', function(data){
      if (typeof data.buttonsPosition !== 'object') data.buttonsPosition = {};
      var source = Tool.getSource();
      if (!source) return;
      var pos = data.buttonsPosition[source];
      if (!pos && source === 'openai') {
        pos = {left: document.body.clientWidth - 120, top: 10};
      }
      if (!pos) return;
      if (typeof pos.left === 'undefined' || typeof pos.top === 'undefined') return;
      var res = {
        left: pos.left,
        top: pos.top,
        right: 'auto',
        bottom: 'auto',
      };
      $root.css(res).addClass('xt-buttons-moved');
    });
  };


  var saveButtonsPosition = function(pos){
    var source = Tool.getSource();
    if (!source) return;
    chrome.storage.local.get('buttonsPosition', function(res){
      if (!res.buttonsPosition) res = {buttonsPosition: {}};
      res.buttonsPosition[source] = pos;
      chrome.storage.local.set(res);
    });
  };


  var initDragEvents = function($handle, $root, onDrop) {
    var offset = {x: 0, y: 0};
    var dim = {rootW: 0, rootH: 0, winW: 0, winH: 0};
    var moveHandler = function(e){
      e.preventDefault();
      var left =  e.clientX - offset.x;
      var top = e.clientY - offset.y;
      if (left < 0) left = 0;
      if (top < 0) top = 0;
      if (left > dim.winW - dim.rootW) left = dim.winW - dim.rootW;
      if (top > dim.winH - dim.rootH) top = dim.winH - dim.rootH;
      $root.css({
        left: left,
        top: top,
        right: 'auto',
        bottom: 'auto'
      });
      saveButtonsPosition({
        left: left,
        top: top
      });
    };
    $handle.mousedown(function(e){
      $root.addClass( self.id + '-drag' );
      var pos = $root.position();
      dim = {
        rootW: $root.width(),
        rootH: $root.height(),
        winW: $(window).width(),
        winH: $(window).height()
      };
      offset.x = e.clientX - pos.left;
      offset.y = e.clientY - pos.top;
      $(window).on('mousemove', moveHandler);
    });
    $(window).mouseup(function(e){
      $root.removeClass( self.id + '-drag' );
      $(window).off('mousemove', moveHandler);
    });
    $handle.hover(
      function(){
        $root.addClass(self.id + '-hover');
      },
      function(){
        $root.removeClass(self.id + '-hover');
    });
  };


  return {
    addBrowserClass: addBrowserClass,
    checkErrors: checkErrors,
    checkAnniversary: checkAnniversary,
    showIcon: showIcon,
    moveButtons: moveButtons
  };

})();
