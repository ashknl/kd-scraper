var TaskManager = function( params ){
  this.queue = [];
  // default interval
  this.interval = 1000;
  this.onEnd = function(){};
  this.timer = null;
  this.pristine = true;
  this.init(params);
};


TaskManager.prototype.init = function( params ){
  var self = this;
  this.interval = params.interval;
  if (params.onEnd) this.onEnd = params.onEnd;
  this.start();
};


TaskManager.prototype.push = function( task ){
  this.pristine = false;
  var last = this.queue[ this.queue.length - 1 ];
  var timestamp = last? last.timestamp + this.interval : Date.now();
  this.queue.push({
    timestamp: timestamp,
    task: task
  });
};


TaskManager.prototype.processQueue = function(){
  var item = this.queue[0];
  if (!item) {
    if (!this.pristine && typeof this.onEnd === 'function') this.onEnd();
    return;
  }
  var now = Date.now();
  if ( now < item.timestamp) return;
  var task = this.queue.shift().task;
  if (typeof task === 'function') task();
};


TaskManager.prototype.stop = function(){
  this.queue = [];
  if (this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }
};


TaskManager.prototype.start = function(){
  if (this.timer) return;
  var self = this;
  this.processQueue();
  this.timer = setInterval(function(){
    self.processQueue();
  }, this.interval);
};
