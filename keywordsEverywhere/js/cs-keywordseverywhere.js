(function(){

  var init = function(){
    initUI();
  };


  var initUI = function(){
    var node = document.querySelector('#xt-settings');
    if (!node) return;
    node.style.display = '';
    node.addEventListener("click", function(e){
      chrome.runtime.sendMessage({
        cmd: 'new_tab',
        data: chrome.runtime.getURL('/html/options.html')
      });
    });
  };


  return {
    init: init
  };

})().init();
