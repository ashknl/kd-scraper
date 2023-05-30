/**
 * Status Class
 * v0.1
 *
 * == Usage:
 *
 *  var status = new Helpers.Status( $('#status'), {
 *   show: {method: 'slideDown', params: []},
 *   hide: {method: 'slideUp', params: []}
 * } );
 *
 * status.set({
 *   html: 'test status',
 *   type: 'warning',
 *   timeout: 2000
 * });
 *
 * status.success('success', 3000);
 *
 * setTimeout(function(){
 *   status.error('error', 3000);
  * }, 1000);
 *
 *
 */

(function(){

  function Status ( rootElement, animations, defaultType ) {
    this.defaultType = defaultType || 'default';
    this.$root = $(rootElement);
    this.html = '';
    this.type = this.defaultType;
    this.timeout = 0;
    this.timer = null;
    this.animations = animations || {};
  }

  /**
   * Update status
   * @param {object} params
   * {
   *   html: html,
   *   type: success|info|warning|danger,
   *   timeout: integer ms
   * }
   */
  Status.prototype.set = function( params ) {
    this.clear();
    if (params.timeout) this.timeout = parseInt( params.timeout );
    else this.timeout = 0;
    this.html = params.html;
    this.type = params.type || this.defaultType;
    this.render();
  };


  /**
   * Shorthand for success handling
   */
  Status.prototype.success = function( statusText, timeout ){
    timeout = timeout || 0;
    this.set({
      type: 'success',
      html: statusText,
      timeout: timeout
    });
  };


  /**
   * Shorthand for error handling
   */
  Status.prototype.error = function( statusText, timeout ){
    timeout = timeout || 0;
    this.set({
      type: 'danger',
      html: statusText,
      timeout: timeout
    });
  };


  /**
   * Remove content, set default type, stop timer
   */
  Status.prototype.clear = function(){
    this.$root.html('');
    this.type = this.defaultType;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  };


  Status.prototype.render = function() {
    if (!this.$root[0]) {
      return;
    }
    var $elem = $('<div class="alert"></div>').appendTo( this.$root );
    $elem
      .html( this.html )
      .addClass('alert-' + this.type)
      .hide();
    // show
    if ( this.animations.show ) {
      var method = this.animations.show.method;
      $elem[method].apply($elem, this.animations.show.params);
    }
    else {
      $elem.show();
    }
    // hide
    var self = this;
    if ( this.timeout ) this.timer = setTimeout(function(){
      if ( self.animations.hide ) {
        var method = self.animations.hide.method;
        $elem[method].apply($elem, self.animations.hide.params);
      }
      else $elem.remove();
    }, this.timeout);
  };


  window.Helpers = window.Helpers || {};
  window.Helpers.Status = Status;

})();
