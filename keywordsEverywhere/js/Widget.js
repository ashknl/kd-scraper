var Widget = (function(){

  return function(params){
    this.id = params.id || '';
    this.src = params.src;
    this.class = params.class;
    this.prefix = params.prefix || '';
    this.parent = params.parent || document.body;
    this.$root = null;
    this.$iframe = null;
    this.animate = params.animate || {};
    this.onReady = params.onReady;
    this.onEnabled = params.onEnabled;
    this.onDisabled = params.onDisabled;
    this.onClosed = params.onClosed;
    this.onHide = params.onHide;
    this.onShow = params.onShow;
    if (params.draggable) {
      this.draggable = true;
      this.$handle = null;
      this.dragHandleTitle = params.dragHandleTitle;
      this.$dragHint = null;
      this.onPositionChanged = params.onPositionChanged;
      this.showDragHint = params.showDragHint;
    }
  };

})();


Widget.prototype.inject = function(params){
  var self = this;
  this.$root = $('<div/>')
    .attr('id', this.id)
    .appendTo( $(this.parent) );
  this.$iframe = $('<iframe/>')
    .attr('src', this.src)
    .appendTo( this.$root );
  if (params && params.position) {
    this.setPosition(params.position);
  }
  if (this.draggable) {
    if (this.showDragHint) {
      this.$dragHint = $('<div/>')
        .addClass(this.id + '-drag-hint')
        .text('Use your mouse to drag me around')
        .append( $('<div/>', {class: this.id + '-drag-hint-arrow'}) )
        .appendTo(this.$root);
        setTimeout(function(){self.$dragHint.fadeIn('slow')}, 2000);
    }
    this.$handle = $('<div/>')
      .addClass(this.id + '-handle')
      .append($('<div>', {class: this.id + '-handle-title'}).html(this.dragHandleTitle || ''))
      .append( $('<span>', {class: this.id + '-btn-close'}).text('✖'))
      .appendTo( this.$root );
    this.$handle.find('.' + this.id + '-btn-close').click(function(e){
      console.log(e);
      self.toggle();
    });
    this.initDragEvents();
  }
};


Widget.prototype.addClass= function(className){
  this.$root.addClass(className);
};


Widget.prototype.show = function(){
  var show = function(){
    if (this.animate.show) {
      var params = this.animate.show;
      this.$root.css(params.from);
      this.$root.show();
      this.$root.animate(params.to, params.duration);
    }
    else this.$root.show();
  };

  if (this.$root) {
    show.call(this);
  }
  else {
    this.inject();
    show.call(this);
  }
  if (this.onShow) this.onShow();
};


Widget.prototype.setPosition = function(pos){
  var dim = {
    rootW: this.$root.width(),
    rootH: this.$root.height(),
    winW: $(window).width(),
    winH: $(window).height()
  };
  var left = pos.left;
  var top = pos.top;
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (left > dim.winW - dim.rootW) left = dim.winW - dim.rootW;
  if (top > dim.winH - dim.rootH) top = dim.winH - dim.rootH;
  this.$root.css({
    left: left,
    top: top
  });
};


Widget.prototype.enable = function(){
  this.post('enable');
  if (this.onEnabled) this.onEnabled();
};


Widget.prototype.disable = function(){
  this.post('disable');
  if (this.onDisabled) this.onDisabled();
};


Widget.prototype.hide = function(){
  if (this.$root) this.$root.hide();
  if (this.onHide) this.onHide();
};


Widget.prototype.toggle = function(){
  if (!this.$root) {
    return;
  }
  if (this.$root.is(':visible')) this.hide();
  else this.show();
};


Widget.prototype.remove = function(){
  if (this.$root) this.$root.remove();
};


Widget.prototype.resize = function(params) {
  if (params.width) this.$iframe.css({width: params.width});
  if (params.height) this.$iframe.css({height: params.height});
};


Widget.prototype.post = function(cmd, data) {
  if (!this.$iframe) {
    console.error('Iframe not found');
    return;
  }
  this.$iframe[0].contentWindow.postMessage({
    cmd: this.prefix + cmd,
    data: data
  }, '*');
};


Widget.prototype.onMessage = function(cmd, data){
  if (!this.prefix) {
    // console.log('Prefix is not set. Aborting to avoid collision');
    return;
  }
  cmd = cmd.replace( this.prefix, '');

  if (cmd === 'widget.ready') {
    if (typeof this.onReady === 'function') this.onReady();
  }
  else if (cmd === 'widget.resize') {
    this.resize(data);
  }
  else if (cmd === 'widget.close') {
    this.hide();
    if (this.onClosed) this.onClosed();
  }
  else if (cmd === 'widget.enable') {
    this.enable();
  }
  else if (cmd === 'widget.disable') {
    this.disable();
  }
};


Widget.prototype.initDragEvents = function() {
  if (!this.draggable) return;
  var self = this;
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
    self.$root.css({
      left: left,
      top: top
    });
    if (self.onPositionChanged) self.onPositionChanged({left: left, top: top});
  };
  this.$handle.mousedown(function(e){
    self.$root.addClass( self.id + '-drag' );
    if (self.$dragHint) self.$dragHint.remove();
    var pos = self.$root.position();
    dim = {
      rootW: self.$root.width(),
      rootH: self.$root.height(),
      winW: $(window).width(),
      winH: $(window).height()
    };
    offset.x = e.clientX - pos.left;
    offset.y = e.clientY - pos.top;
    $(window).on('mousemove', moveHandler);
  });
  $(window).mouseup(function(e){
    self.$root.removeClass( self.id + '-drag' );
    $(window).off('mousemove', moveHandler);
  });
  this.$handle.hover(
    function(){
      self.$root.addClass(self.id + '-hover');
    },
    function(){
      self.$root.removeClass(self.id + '-hover');
  });
};
