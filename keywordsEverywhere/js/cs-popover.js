var Popover = (function(){

  var root = null;


  var inject = function( data, text ){
    if (root) {
      root.style.display = 'block';
      return;
    }
    root = document.createElement('div');
    root.id = 'xtkwd-root';
    var div = document.createElement('div');
    var item = JSON.parse(data);
    if (item.keyword) {
      var strong = document.createElement('strong');
      strong.innerHTML = Common.appendStar(item.keyword, item, 'prepend');
      var p = document.createElement('p');
      var text = Common.getResultStr(item, {useLong: true, trendSizeFactor: 2});
      p.innerHTML = text;
      div.appendChild(strong);
      div.appendChild(p);
    }
    else {
      div.innerHTML = 'No metrics found for <strong>"' + text + '"</strong>';
    }
    document.body.appendChild(root);
    root.appendChild(div);
    root.addEventListener('click', function(e){
      if (e.target && e.target.className.indexOf('xt-star') !== -1 ) return;
      hide();
    });
  };


  var show = function( data, text ){
    if (!root) inject( data, text );
    else root.style.display = 'block';
  };


  var hide = function(){
    if (root) {
      document.body.removeChild(root);
      root = null;
    }
  };


  return {
    show: show,
    hide: hide
  };

})();
