var Starter = (function(){

  var settings = {};

  var init = function(){
    initSettings();
    initMouseEvents();
    if (typeof UIHelper !== 'undefined') UIHelper.checkAnniversary();
  };


  var initSettings = function( cbContinue, manual ){
    chrome.storage.local.get(null, async function( data ){
      if (data.settings) {
        settings = data.settings;
        if (settings.enabled === false && !manual) return;
        if (settings.country) {
          Common.setCountry( settings.country.toUpperCase() );
        }
      }
      var active = await isOnline();
      if (active) {
        var config = await getConfig();
        if (!config) return;
        var plan = await getPlan();
        if (config.areSubsEnabled) {
          checkURL( settings.sourceList, plan, config );
        }
        else {
          checkURL( settings.sourceList, plan, config );
        }
      }
    });
  };


  var isOnline = function(){
    return new Promise(function(resolve){
      chrome.runtime.sendMessage({
        cmd: 'api.isOnline'
      }, function(response){
        if (response.error) {
          resolve(false);
          return;
        }
        resolve(response.data);
      });
    });
  };


  var getConfig = function(){
    return new Promise(function(resolve, reject){
      chrome.runtime.sendMessage({cmd: 'api.getConfig'}, function(json){
        if (json.error) {
          resolve(null);
          return;
        }
        Common.setConfig(json.data);
        resolve(json.data);
      });
    });
  };


  var getPlan = function(){
    return new Promise(function(resolve, reject){
      chrome.runtime.sendMessage({cmd: 'api.getPlan'}, function(json){
        if (json.error || json.ext_error) {
          resolve(null);
          return;
        }
        Common.setPlan(json.data);
        Common.setCredits(json.data.credits);
        resolve(json.data);
      });
    });
  };


  var getCredits = function(){
    return new Promise(function(resolve){
      chrome.runtime.sendMessage({
        cmd: 'api.getCredits'
      }, function(json){
        if (json.error) resolve(false);
        else {
          Common.setCredits(json.data);
          var hasCredits = json.data > 0;
          resolve(hasCredits);
        }
      });
    });
  };


  var getSettings = function(){
    return settings;
  };


  var initMouseEvents = function(){
    $('body').on('mousedown', '.xt-keg', function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      var url = this.href;
      if (!url) url = 'https://app.keywordkeg.com/?api=google&autostart=1&query=' + encodeURIComponent(this.dataset.keyword);
      chrome.runtime.sendMessage({
        cmd: 'new_tab',
        data: url
      });
    });
    $('body').on('contextmenu', '.xt-star, .xt-keg', function(e){
      e.preventDefault();
      return false;
    });
    $('body').on('click', '.xt-star, .xt-keg', function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
    });
    $('body').on('click', '.xt-ltkbtn-str', function(e){
      e.preventDefault();
      chrome.runtime.sendMessage({
        cmd: 'new_tab',
        data: this.href
      });
    });
    $('body').on('mouseup', '.xt-star, .xt-keg', function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
    });
    $('body').on('mousedown', '.xt-star', function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!this.dataset.keyword) return;
      var self = this;
      var state = this.dataset.state;
      this.classList.add('xt-rotate');
      var cmd = (state === 'on')? 'api.deleteKeywords' : 'api.addKeywords';
      var newState = (state === 'on')? 'off' : 'on';
      chrome.runtime.sendMessage({
        cmd: cmd,
        data: [self.dataset.keyword]
      }, function(json){
        self.classList.remove('xt-rotate');
        if (!json.error) self.dataset.state = newState;
      });
    });
  };


  var checkURL = function( sources, plan, config ){
    if (!sources) return;
    if (!plan) plan = {};
    var source = Tool.getSource();
    if (sources[source]) {
      if (source === 'gsearc' && !isGSearchURL()) return;
      if (source === 'analyt' && window.self === window.parent.self) {
        return;
      }
      var hasCredits = plan.credits > 0;
      if (hasCredits) {
        Tool.init();
        addSettingsButton();
      }
      else {
        var freeSources = 'bingco youtub gtrend instgr ebayco etsyco amazon pntrst openai';
        // config.areSubsEnabled = false;
        if (config.areSubsEnabled) freeSources = 'instgr openai pntrst youtub';
        if ((source === 'gsearc' && isGSearchURL()) || freeSources.indexOf(source) !== -1) {
          Tool.init();
          if (source === 'openai') addSettingsButton();
        }
      }
    }
  };


  var addSettingsButton = function(){
    if ($('.xt-icon[data-type=settings]')[0]) return;
    // UIHelper.showIcon('settings');
    var source = Tool.getSource();
    if (source === 'gsearc') {
      if (document.location.href.indexOf('tbm=') !== -1) return;
    }
    if (source === 'pntrst') {
      if (document.location.host.indexOf('trends') !== -1) return;
    }
    if (source === 'yahoo') {
      if (document.location.host !== 'search.yahoo.com') return;
    }
    if (settings.showAddAllButton) {
      if ('amazon ebayco youtub instgr yahoo openai'.indexOf(source) === -1) {
        UIHelper.showIcon('addKeywords');
      }
    }
    console.log(settings);
    if (settings.showExportButton) {
      if ('amazon ebayco youtub instgr yahoo openai'.indexOf(source) === -1) {
        UIHelper.showIcon('exportCSV');
      }
    }
    if (settings.showChatGPTactions) {
      if (source === 'openai') {
        UIHelper.showIcon('custom');
      }
    }
  };


  var isGSearchURL = function(){
    var url = document.location.href;
    if (url.indexOf('sorry/index') !== -1) return false;
    if (url.match(/google\.[\w.]+\/(\?|search|#q=|webhp|\?ion|#[\w&=-]+&q=)/)) return true;
    else if (url.match(/google\.[\w.]+\/?$/)) return true;
    else return false;
    return true;
  };


  return {
    init: init,
    initSettings: initSettings,
    getSettings: getSettings,
    isGSearchURL: isGSearchURL,
    initMouseEvents: initMouseEvents,
    addSettingsButton: addSettingsButton
  };

})();
