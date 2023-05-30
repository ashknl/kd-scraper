(function(){

  var settings;


  var init = function(){
    initSettings(function(){
      injectIframe();
    });
  };


  var initSettings = function( cbContinue ){
    chrome.storage.local.get(null, function( data ){
      if (data.settings) {
        settings = data.settings;
        console.log(settings);
        cbContinue();
      }
    });
  };


  var injectIframe = function(){
    var $iframe = $('<iframe>').appendTo('body');
    var page = getURLParam('page');
    var id = getURLParam('id');
    var loc = btoa(document.location.href);
    var src = 'https://keywordseverywhere.com/ke/1/' + page + '.php?apiKey=' + settings.apiKey + '&t=' + Date.now();
    if (DEV_MODE) {
      src = 'http://localhost:8080/' + page + '.html?apiKey=' + settings.apiKey + '&t=' + Date.now();
    }
    if (page === 'autocomplete' || page === 'list') {
      var query = getURLParam('query') || '';
      var service = getURLParam('service') || '';
      var tld = getURLParam('tld') || '';
      var lng = getURLParam('lng') || '';
      src += '&query=' + query + '&service=' + service + '&tld=' + tld + '&lng=' + lng;
    }
    if (page === 'hashtags') {
      var service = getURLParam('service') || '';
      src += '&service=' + service;
      src += '&version=' + chrome.runtime.getManifest().version;
    }
    if (page === 'analyze' || page === 'keywords') {
      src += '&loc=' + loc;
    }
    if (page === 'keywords' || page === 'bulkTraffic') {
      src += '&target=' + getURLParam('target');
    }
    if (page === 'trends') {
      var country = getURLParam('country');
      if (country) src += '&country=' + country;
      src += '&timerange=' + getURLParam('timerange');
      src += '&prop=' + getURLParam('prop');
      src += '&terms=' + (getURLParam('terms') || '');
    }
    if (id) src += '&id=' + id;
    $iframe.attr('src', src);
  };


  var getURLParam = function(sParam, locationObj) {
    if (!locationObj) locationObj = document.location;
    var sPageURL = locationObj.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++)
    {
      var sParameterName = sURLVariables[i].split('=');
      if (sParameterName[0] == sParam)
      {
        return sParameterName[1];
      }
    }
  };


  return {
    init: init
  };

})().init();
