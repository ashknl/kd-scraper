var OpenaiWidgetController = (function(){

  var settings;
  var widget;


  var init = function(){
    initWindowMessaging();
  };


  var initWindowMessaging = function(){
    window.addEventListener("message", function(event){
      var payload = event.data;
      if (typeof payload !== 'object') return;
      var cmd = payload.cmd;
      var data = payload.data;
      if (!cmd) return;
      if (cmd.indexOf( 'xt-openai-' ) !== 0) {
        // console.log('Command without prefix. Aborting to avoid collision', cmd, data);
        return;
      }
      cmd = cmd.replace( 'xt-openai-', '');
      if (!cmd) return;
      if (cmd.match(/^widget\./)) {
        widget.onMessage(cmd, data);
      }
      else if (cmd === 'iframe.close') {
        $iframeRoot.remove();
      }
    }, false);
  };


  var initWidget = function(params){
    try {
      widget = new Widget({
        prefix: 'xt-openai-',
        id: 'xt-openai-widget',
        src: chrome.runtime.getURL('html/openai.html?darkmode=' + params.darkMode),
        parent: document.body,
        draggable: true,
        dragHandleTitle: dragHandleHTML,
        onReady: function(){
        },
        onShow: function(){},
        onHide: function(){},
        onClosed: function(){},
        onPositionChanged: function(pos){
          chrome.storage.local.get('openaiPosition', function(res){
            if (!res) res = {};
            res.openaiPosition = pos;
            chrome.storage.local.set(res);
          });
        }
      });
      widget.inject(params);
      widget.show();
    } catch (e) {
      console.log(e);
    }
  };


  var toggle = function(params){
    if (!widget) {
      chrome.storage.local.get('openaiPosition', function(res){
        params.position = res.openaiPosition || null;
        initWidget(params);
      });
    }
    else widget.toggle();
  };


  var post = function(cmd, data){
    if (widget) widget.post(cmd, data);
  };


  var dragHandleHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 262.77 262.77"><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><g><circle cx="131.38" cy="131.38" r="126.38" style="fill: none;stroke-miterlimit: 10;stroke-width: 10px"/><path d="M109.38,106.42c7.54-9,14-17.2,20.94-25,7.63-8.58,15.73-16.73,23.48-25.2,4.32-4.72,9.2-5.71,14.78-2.85,5.07,2.59,10,5.43,14.34,7.81-12.71,12-24.57,23.42-36.64,34.59-4.92,4.56-5.87,9.38-3.45,15.63,11.36,29.37,23.23,58.47,41.41,84.49.95,1.35,2,2.62,3.47,4.5C180.2,206.74,172,210.94,162.14,211c-1.48,0-3.48-2-4.39-3.54-5-8.63-10.36-17.12-14.36-26.2-6.75-15.37-12.57-31.15-18.78-46.77-1-2.6-2-5.22-3.51-9.14-5.47,8.17-12.51,14.31-12.51,23.93,0,16.81.38,33.63.91,50.44.11,3.63-.92,5.56-4.32,6.67-6.73,2.18-13.44,3.46-20.58,2.12-2.79-.52-3.69-1.83-3.77-4.22-.12-3.32-.23-6.65-.16-10q.93-41.44,1.94-82.89c.08-3.33.33-6.65.56-10,.84-11.8-.41-23.09-6-33.86-3.1-5.92-2.59-6.68,3.77-8.25a151.63,151.63,0,0,1,22.45-4c6.93-.64,7.1-.1,7,6.71-.23,12.48-.62,25-.93,37.44C109.34,101.33,109.38,103.16,109.38,106.42Z"/></g></g></g></svg>Keywords Everywhere's ChatGPT Prompt Templates`;


  return {
    init: init,
    toggle: toggle,
    post: post
  };

})();

OpenaiWidgetController.init();
