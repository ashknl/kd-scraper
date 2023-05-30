var WidgetHelpers = (function(){

  /**
   * Iframe cann't be resized by parent. We have to notify parent.
   */
  var resize = function( params ){
    if (!params) params = {};
    if (typeof Prefix === 'undefined') Prefix = {get: function(s){return s;}};
    var size = {
      width: params.width? params.width : document.body.offsetWidth,
      height: params.height? params.height : document.body.offsetHeight
    };
    if (params.extraHeight) size.height += params.extraHeight + 10;
    if (params.heightOnly) delete size.width;
    window.parent.postMessage({cmd: Prefix.get('widget.resize'), data: size}, '*');
  };


  return {
    resize: resize
  };

})();
