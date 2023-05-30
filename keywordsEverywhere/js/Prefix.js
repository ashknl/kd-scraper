var Prefix = (function(){

  var _prefix = '';

  var init = function(prefix){
    _prefix = prefix;
  };

  var get = function(s){return _prefix + '-' + s;};
  var id = function(s){return '#' + get(s);};
  var cc = function(s){return '.' + get(s);};
  var data = function(s){
    return _prefix + '_' + s.replace(/-/g, '_');
  };

  return {
    init: init,
    _: get,
    get: get,
    id: id,
    cc: cc,
    data: data
  };

})();

