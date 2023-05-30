var Cache = (function(){

  var _cacheTime = 24*3600*1000;

  var cache = {};

  var get = function( url ){
    var now = Date.now();
    if (cache[url] && now - cache[url].timestamp <= _cacheTime) {
      // console.log('From cache', url, cache[url].response);
      return cache[url].response;
    }
    else {
      delete cache[url];
    }
    return false;
  };


  var set = function( url, response ){
    var now = Date.now();
    if (cache[url] && now - cache[url].timestamp <= _cacheTime) {
      return;
    }
    // console.log('Set cache', url, response);
    cache[url] = {
      timestamp: Date.now(),
      response: response
    };
    setTimeout(function(){
      delete cache[url];
    }, _cacheTime);
  };


  var clear = function(){
    cache = {};
  };


  return {
    get: get,
    set: set,
    clear: clear
  };

})();
