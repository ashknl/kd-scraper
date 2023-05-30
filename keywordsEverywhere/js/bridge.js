window.addEventListener("message", function(event){
  var payload = event.data;
  if (typeof payload !== 'object') return;
  var cmd = payload.cmd;
  var data = payload.data;
  var handlerId = payload.handlerId;
  if (!cmd || !handlerId) return;

  if (cmd === 'xtkt.getAPIparams') {
    chrome.runtime.sendMessage({
      cmd: 'api.getParams'
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  if (cmd === 'xtkt.getExtensionURL') {
    var response = chrome.runtime.getURL('');
    postResponse(cmd, handlerId, response);
  }
  if (cmd === 'xtkt.getSettings') {
    chrome.runtime.sendMessage({
      cmd: 'settings.get'
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  if (cmd === 'xtkt.getCountries') {
    chrome.runtime.sendMessage({
      cmd: 'api.getCountries'
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  if (cmd === 'xtkt.processKeywords') {
    Common.processKeywords(payload.data, function(response, list){
      postResponse(cmd, handlerId, {
        response: response,
        list: list
      });
    });
  }
  else if (cmd === 'xtkt.getKeywordData') {
    chrome.runtime.sendMessage({
      cmd: 'api.getKeywordData',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getTagsData') {
    chrome.runtime.sendMessage({
      cmd: 'api.getTagsData',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getFavoriteKeywords') {
    chrome.runtime.sendMessage({
      cmd: 'api.getFavoriteKeywords'
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.addKeywords') {
    chrome.runtime.sendMessage({
      cmd: 'api.addKeywords',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.deleteKeywords') {
    chrome.runtime.sendMessage({
      cmd: 'api.deleteKeywords',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getPageHTML') {
    chrome.runtime.sendMessage({
      cmd: 'ajax.getPageHTML',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getURLKeywords') {
    chrome.runtime.sendMessage({
      cmd: 'api.getURLKeywords',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getDomainKeywords') {
    chrome.runtime.sendMessage({
      cmd: 'api.getDomainKeywords',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getURLMetrics') {
    chrome.runtime.sendMessage({
      cmd: 'api.getURLMetrics',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getDomainMetrics') {
    chrome.runtime.sendMessage({
      cmd: 'api.getDomainMetrics',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getDomainPages') {
    chrome.runtime.sendMessage({
      cmd: 'api.getDomainPages',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getCompetitorKeywords') {
    chrome.runtime.sendMessage({
      cmd: 'api.getCompetitorKeywords',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getMatchingDomains') {
    chrome.runtime.sendMessage({
      cmd: 'api.getMatchingDomains',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getKeywordsPendingList') {
    chrome.runtime.sendMessage({
      cmd: 'getKeywordsPendingList',
      data: {}
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.googleTrendsAPI.multiline') {
    chrome.runtime.sendMessage({
      cmd: 'googleTrendsAPI.multiline',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.autocomplete') {
    chrome.runtime.sendMessage({
      cmd: 'autocomplete',
      data: data
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getBulkConfig') {
    chrome.runtime.sendMessage({
      cmd: 'api.getBulkConfig',
      data: {}
    }, function(response){
      postResponse(cmd, handlerId, response);
    });
  }
  else if (cmd === 'xtkt.getCredits') {
    chrome.runtime.sendMessage({
      cmd: 'api.getCredits'
    }, function(json){
      if (json.error) resolve(false);
      else {
        Common.setCredits(json.data);
        postResponse(cmd, handlerId, json.data);
      }
    });
  }
  else if (cmd === 'xtkt.newtab') {
    chrome.runtime.sendMessage({
      cmd: 'new_tab',
      data: data
    }, function(){
      if (json.error) resolve(false);
      else {
        Common.setCredits(json.data);
        postResponse(cmd, handlerId, json.data);
      }
    });
  }
  else if (cmd === 'xtkt.is_installed') {
    window.postMessage({cmd: 'xtkt.is_installed_response'}, '*');
  }
}, false);


var postResponse = function(cmd, handlerId, data){
  window.postMessage({
    cmd: cmd + '_response',
    handlerId: handlerId,
    data: data
  }, '*');
};
