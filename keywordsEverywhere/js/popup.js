(function(){

  var init = function(){
    chrome.storage.local.get(null, function( data ){
      if (data.settings) {
        checkMaintenance();
        initUI(data.settings);
      }
    });
  };


  var checkMaintenance = function(){
    chrome.runtime.sendMessage({
      cmd: 'api.isOnline'
    }, function(response){
      if (!response.data) {
        $('.maintenance-msg')
          .removeClass('hidden')
          .text(response.message);
      }
    });
  };


  var initUI = function(settings){
    chrome.runtime.sendMessage({cmd: 'api.getConfig'}, function(json){
      if (json.error) return;
      console.log(json);
      if (json.data && !json.data.showUrlMetrics) return;
      $('.feature-keywords').removeClass('hidden');
    });

    if (!settings.apiKey) {
      $('#apiKeyWarning').show();
    }
    populateCountries(settings);
    $('#toggle-extension')[0].dataset.state = settings.enabled ? 'on' : 'off';
    document.body.dataset.state = settings.enabled ? 'on' : 'off';

    $('.toggle-button').click(function(){
      this.dataset.state = this.dataset.state === 'on' ? 'off' : 'on';
    });

    $('#toggle-extension').click(function(){
      chrome.runtime.sendMessage({
        cmd: 'app.setState',
        data: {
          state: this.dataset.state === 'on'
        }
      });
      document.body.dataset.state = this.dataset.state;
    });

    $('select').change(function(e){
      var id = this.id;
      if (id !== 'country') return;
      else settings[id] = $.trim(this.value);
      chrome.storage.local.set({settings: settings});
      chrome.runtime.sendMessage({cmd: 'settings.update'});
    });

    $('[data-page]').click(function(e){
      e.preventDefault();
      if (document.body.dataset.state === 'off') {
        showDisabledWarning();
        return;
      }
      var page = this.dataset.page;
      chrome.tabs.create({
        url: '/html/page.html?page=' + page
      });
    });

    $('.analyze').click(function(e){
      e.preventDefault();
      if (document.body.dataset.state === 'off') {
        showDisabledWarning();
        return;
      }
      var href = this.href;
      chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
        var url = tabs[0].url;
        if (!url.match(/^http/)) {
          alert('Please open a website to analyze before using this feature.');
          return;
        }
        var id = btoa(url);
        chrome.runtime.sendMessage({
          cmd: 'urlToAnalyze',
          data: {
            id: id,
            url: url
          }
        });
        chrome.tabs.create({
          url: '/html/page.html?page=analyze&id=' + encodeURIComponent(id)
        });
      });
    });

    $('.feature-keywords, .feature-toppages').click(function(e){
      e.preventDefault();
      var $this = $(this);
      var page = 'keywords';
      if ($this.hasClass('feature-toppages')) page = 'toppages';
      if (document.body.dataset.state === 'off') {
        showDisabledWarning();
        return;
      }
      var href = this.href;
      var target = this.dataset.target || '';
      chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
        var url = tabs[0].url;
        if (!url.match(/^http/)) {
          alert('Please open a website to analyze before using this feature.');
          return;
        }
        var id = btoa(url);
        chrome.tabs.create({
          url: `/html/page.html?page=${page}&target=${target}&id=` + encodeURIComponent(id)
        });
      });
    });

    $('.feature-bulkTraffic').click(function(e){
      e.preventDefault();
      var $this = $(this);
      var href = this.href;
      var target = this.dataset.target || '';
      chrome.tabs.create({
        url: `/html/page.html?page=bulkTraffic&target=${target}`
      });
    });
    injectIframe(settings);
  };


  var showDisabledWarning = function(){
    $('#disabledWarning').removeClass('hidden');
    setTimeout(function(){
      $('#disabledWarning').addClass('hidden');
    }, 2000);
  };

  var injectIframe = function(params){
    var version = chrome.runtime.getManifest().version;
    var src = 'https://keywordseverywhere.com/ke/kepopup.php?apiKey=' + params.apiKey + '&version=' + version + '&t=' + Date.now() ;
    $('<iframe/>').attr('src', src).appendTo($('#iframe-root'));
  };


  var run = function(action){
    if (action === 'popup') return;
    else if (action === 'settings') {
      chrome.tabs.create({url: '/html/options.html'});
    }
    else if (action === 'manual') {
      chrome.tabs.create({url: 'https://keywordseverywhere.com/ke/1/manual.php'});
    }
    else if (action === 'favorite') {
      chrome.tabs.create({url: 'https://keywordseverywhere.com/ke/1/favorites.php'});
    }
  };


  var populateCountries = function(settings){
    chrome.runtime.sendMessage({cmd: 'api.getCountries'}, function(json){
      if (!json || !Object.keys(json).length) {
        return;
      }
      for (var key in json) {
        var $option = $('<option/>')
          .attr('value', key)
          .text(json[key]);
        if (settings.country === key) $option.attr('selected', 'true');
        $option.appendTo($('#country'));
      }
    });
  };


  return {
    init: init
  };

})().init();
