var API = (function(){

  var API_URL = 'https://keywordseverywhere.com/service/1/';
  var _apiKey;
  var _country = 'global';
  var _currency = 'usd';
  var _dataSource = 'cli';

  var getConfigTS = 0;
  var getConfigCachedResponse = {};

  var version = chrome.runtime.getManifest().version;

  var backlinksByPlan = {
    bronze: 1000,
    silver: 2000,
    gold: 5000,
    platinum: 10000,
    legacy: 5000
  };
  var numParam = 5000;


  var init = function( apiKey, country, currency, dataSource ){
    if (typeof apiKey !== 'undefined') _apiKey = apiKey;
    if (typeof country !== 'undefined') _country = country;
    if (typeof currency !== 'undefined') _currency = currency;
    if (typeof dataSource !== 'undefined') _dataSource = dataSource;
  };


  var buildParams = function(data) {
    if (!data) return '';
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'undefined') value = '';
      if (Array.isArray(value)) {
        value.forEach(value => params.append(key + '[]', value.toString()));
      }
      else {
        params.append(key, value.toString());
      }
    });
    return params.toString();
  };


  var getJSON = function(url, payload, cbProcessResponse){
    let u = new URL(url);
    u.search = buildParams(payload);
    return fetch(u, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(function(response){
      return response.json();
    }).then(function(json){
      return json;
    }).catch(function(response){
      if (response.message) {
        throw response;
      }
      else if (response.status) {
        let error = new Error(response.statusText);
        error.code = response.status;
        throw error;
      }
    });
  };


  var ajax = function(params, cbProcessResponse){
    return fetch(params.url, {
      method: params.method,
      headers: params.headers,
      body: params.data
    }).then(function(response){
      return response.json();
    }).then(function(json){
      return json;
    }).catch(function(response){
      if (response.message) {
        throw response;
      }
      else if (response.status) {
        let error = new Error(response.statusText);
        error.code = response.status;
        throw error;
      }
    });
  };


  var isOnline = function(cbProcessResponse){
    var url = API_URL + 'isOnline.php?version=' + version;
    getJSON(url)
      .then(function(json){
        chrome.storage.local.get('appStorage', function(data){
          if (data.appStorage) {
            data.appStorage.tsNoReplySince = 0;
            chrome.storage.local.set({
              appStorage: data.appStorage
            }, function(){});
          }
        });
        if (typeof json === 'object' && json[0] === true) {
          cbProcessResponse({error: false, data: true});
        }
        else {
          cbProcessResponse({
            error: false,
            data: false,
            message: 'Keywords Everywhere is currently undergoing maintenance.'
          });
        }
      })
      .catch(function(){
        var now = Date.now();
        var diff;
        chrome.storage.local.get('appStorage', function(data){
          if (!data.appStorage) data.appStorage = {};
          if (data.appStorage.tsNoReplySince) {
            diff = now - data.appStorage.tsNoReplySince;
          }
          else {
            data.appStorage.tsNoReplySince = now;
          }
          var message = 'Something has gone wrong.';
          if (diff > 24*3600*1000) message += ' Please re-install the extension.';
          cbProcessResponse({
            error: true,
            data: false,
            message: message
          });
          chrome.storage.local.set({
            appStorage: data.appStorage
          }, function(){});
        });
      });
  };


  var getParams = function(){
    return {
      apiKey: _apiKey,
      country: _country,
      currency: _currency,
      dataSource: _dataSource
    };
  };


  var getPlan = function(cbProcessResponse){
    var url = API_URL + 'getPlan.php';
    if (!_apiKey) {
      cbProcessResponse({
        ext_error: 'Please setup a valid API key'
      });
      return;
    }
    getJSON(url, {
      apiKey: _apiKey,
      version: version,
      t: Date.now()
    })
      .then(function(json){
        if (json && json.plan) {
          numParam = backlinksByPlan[json.plan];
        }
        cbProcessResponse({error: '', data: json});
      })
      .catch(function(response){
        cbProcessResponse(response);
      });
  };


  var getCredits = function(cbProcessResponse){
    var url = API_URL + 'getCredits.php';
    if (!_apiKey) {
      cbProcessResponse({
        ext_error: 'Please setup a valid API key'
      });
      return;
    }
    getJSON(url, {
      apiKey: _apiKey,
      version: version,
      t: Date.now()
    })
      .then(function(json){
        cbProcessResponse({error: '', data: json[0]});
      })
      .catch(function(response){
        console.log(response);
        cbProcessResponse(response);
      });
  };


  var getKeywordData = function( params, cbProcessResponse ){
    var keywords = params.keywords;
    var src = params.src;
    var useGlobal = params.global;
    var url = API_URL + 'getKeywordData.php';
    var country = useGlobal ? '' : _country;
    if (typeof params.country !== 'undefined') country = params.country.toLowerCase();
    if (!_apiKey) {
      cbProcessResponse({
        error_code: 'NO_API_KEY',
        ext_error: 'Please setup a valid API key'
      });
      return;
    }
    var data = {
      apiKey: _apiKey,
      country: country,
      currency: _currency,
      dataSource: _dataSource,
      source: src,
      version: version,
      kw: keywords,
      t: Date.now()
    };
    if (params.from) data.from = params.from;
    if (params.seed) data.seed = params.seed;
    getJSON( url, data )
      .then(function(json){
        if (json.data) {
          formatResponse(json);
        }
        cbProcessResponse(json);
      })
      .catch(function(error){
        cbProcessResponse({error: true, data: error.message});
      });
  };


  var getTagsData = function( params, cbProcessResponse ){
    var keywords = params.keywords;
    var src = params.src;
    var useGlobal = params.global;
    var url = 'https://api.keywordseverywhere.com/v1/get_tag_data';
    if (!_apiKey) {
      cbProcessResponse({
        error_code: 'NO_API_KEY',
        ext_error: 'Please setup a valid API key'
      });
      return;
    }
    var data = {
      apiKey: _apiKey,
      country: useGlobal ? '' : _country,
      currency: _currency,
      dataSource: _dataSource,
      source: src,
      version: version,
      tag: keywords,
      t: Date.now()
    };
    ajax({
      method: 'POST',
      url: url,
      headers: {
        'Accept': `application/json`,
        'Authorization': 'Bearer ' + _apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: buildParams(data)
    })
      .then(function(json){
        if (json.data) {
          formatResponse(json);
        }
        cbProcessResponse(json);
      })
      .catch(function(jqXHR, textStatus, error){
        cbProcessResponse({error: true, data: error});
      });
  };


  var getCountries = function(cbProcessResponse){
    var url = 'https://keywordseverywhere.com/service/getCountries.php';
    getJSON(url).then(function(json){
      cbProcessResponse(json);
    });
  };


  var getCurrencies = function(cbProcessResponse){
    var url = 'https://keywordseverywhere.com/service/getCurrencies.php';
    getJSON(url).then(function(json){
      cbProcessResponse(json);
    });
  };


  var checkApiKey = function(key, cbProcessResponse){
    var url = API_URL + 'checkApiKey.php';
    getJSON(url, {
      version: version,
      apiKey: key
    })
      .then(function(json){
        cbProcessResponse({error: '', data: json[0]});
      })
      .catch(function(error){
        cbProcessResponse({error: true, data: error.message});
      });
  };


  var formatResponse = function(json){
    for (var key in json.data) {
      var item = json.data[key];
      var cpc = item.cpc;
      var vol = parseFloat(item.vol);
      item.cpc = typeof cpc !== 'undefined' ? cpc : '-';
      item.vol = typeof vol !== 'undefined' ? Number( vol ).toLocaleString() : '-';
    }
  };


  var addKeywords = function(keywords, cbProcessResponse){
    var url = API_URL + 'addKeywords.php?apiKey=' + _apiKey + '&version=' + version;
    ajax({
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: buildParams({kw: keywords})
    })
      .then(function(json){
        cbProcessResponse({error: false, data: json});
      })
      .catch(function(){
        cbProcessResponse({error: true});
      });
  };


  var deleteKeywords = function(keywords, cbProcessResponse){
    var url = API_URL + 'deleteKeywords.php?apiKey=' + _apiKey + '&version=' + version;
    ajax({
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: buildParams({kw: keywords})
    })
      .then(function(response){
        cbProcessResponse({error: false, data: response});
      })
      .catch(function(){
        cbProcessResponse({error: true});
      });
  };


  var getFavoriteKeywords = function(cbProcessResponse){
    var url = API_URL + 'getFavoriteKeywords.php';
    getJSON(url, {
      apiKey: _apiKey,
      version: version,
      country: _country,
      currency: _currency
    })
      .then(function(response){
        cbProcessResponse({error: false, data: response});
      })
      .catch(function(){
        cbProcessResponse({error: true});
      });
  };


  var getConfig = function(cbProcessResponse){
    if (Date.now() - getConfigTS < 8*3600*1000) {
      cbProcessResponse(getConfigCachedResponse);
      return;
    }
    var url = API_URL + 'getConfig.php';
    if (DEV_MODE) {
      url = chrome.runtime.getURL('/html/mock/getConfigResponse.json');
    }
    getJSON(url, {
      apiKey: _apiKey,
      version: version,
    })
      .then(function(response){
        getConfigCachedResponse = {error: false, data: response};
        getConfigTS = Date.now();
        cbProcessResponse(getConfigCachedResponse);
      })
      .catch(function(error){
        cbProcessResponse({error: true, data: error.message});
      });
  };


  var getBulkConfig = function(cbProcessResponse){
    var url = API_URL + 'getBulkConfig.php?apiKey=' + _apiKey + '&version=' + version;
    getJSON(url)
      .then(function(response){
        cbProcessResponse({error: false, data: response});
      })
      .catch(function(){
        cbProcessResponse({error: true});
      });
  };


  var trend = function(query){
    var url = API_URL + 'trend.php?apiKey=' + _apiKey + '&country=' + _country + '&version=' + version + '&query=' + encodeURIComponent(query);
    getJSON(url).then(function(response){});
  };


  var postTrendKeywords = function(params, cbProcessResponse){
    var list = params.list;
    var url = API_URL + 'GetTrendData.php?apiKey=' + _apiKey + '&version=' + version;
    ajax({
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: buildParams({query: list})
    })
      .then(function(json){
        cbProcessResponse({error: false, data: json});
      })
      .catch(function(){
        cbProcessResponse({error: true});
      });
  };


  var getDomainMetrics = function(params, cbProcessResponse){
    var domains = params.domains;
    var country = params.country;
    var url = 'https://data.keywordseverywhere.com/service/get-domain-metrics';
    if (!country) country = 'us';
    ajax({
      method: 'POST',
      url: url,
      headers: {
        'Accept': `application/x.seometrics.v4+json`,
      },
      data: JSON.stringify({
        domains: domains,
        country: country,
        version: version,
        num: numParam,
        api_key: _apiKey || ''
      })
    })
    .then(function(json){
      var res = {error: false, data: json};
      cbProcessResponse(res);
    })
    .catch(function(jqXHR, textStatus, errorThrown){
      cbProcessResponse({error: true, data: textStatus});
    });
  };


  var getURLMetrics = function(params, cbProcessResponse){
    var urls = params.urls;
    var country = params.country;
    var url = 'https://data.keywordseverywhere.com/service/get-url-metrics';
    if (!country) country = 'us';
    ajax({
      method: 'POST',
      url: url,
      headers: {
        'Accept': `application/x.seometrics.v4+json`,
      },
      data: JSON.stringify({
        urls: urls,
        country: country,
        version: version,
        num: numParam,
        api_key: _apiKey || ''
      })
    })
    .then(function(json){
      var res = {error: false, data: json};
      cbProcessResponse(res);
    })
    .catch(function(jqXHR, textStatus, errorThrown){
      cbProcessResponse({error: true, data: textStatus});
    });
  };


  var getURLKeywords = function(params, cbProcessResponse){
    var url = 'https://data.keywordseverywhere.com/service/get-url-keywords';
    var country = params.country;
    if (!country) country = 'us';
    ajax({
      method: 'POST',
      url: url,
      contentType : 'application/json',
      headers: {
        'Accept': `application/x.seometrics.v4+json`,
      },
      data: JSON.stringify({
        url: params.url,
        country: country,
        version: version,
        num: numParam,
        api_key: _apiKey || ''
      })
    })
    .then(function(json){
      var res = {error: false, data: json};
      cbProcessResponse(res);
    })
    .catch(function(jqXHR, textStatus, errorThrown){
      cbProcessResponse({error: true, data: textStatus});
    });
  };


  var getDomainKeywords = function(params, cbProcessResponse){
    var url = 'https://data.keywordseverywhere.com/service/get-domain-keywords';
    var country = params.country;
    if (!country) country = 'us';
    ajax({
      method: 'POST',
      url: url,
      contentType : 'application/json',
      headers: {
        'Accept': `application/x.seometrics.v4+json`,
      },
      data: JSON.stringify({
        domain: params.domain,
        country: country,
        version: version,
        num: numParam,
        api_key: _apiKey || ''
      })
    })
    .then(function(json){
      var res = {error: false, data: json};
      cbProcessResponse(res);
    })
    .catch(function(jqXHR, textStatus, errorThrown){
      cbProcessResponse({error: true, data: textStatus});
    });
  };


  var getDomainLinkMetrics = function(params, cbProcessResponse){
    var url = 'https://data.keywordseverywhere.com/service/get-domain-link-metrics';
    var country = params.country;
    if (!country) country = 'us';
    ajax({
      method: 'POST',
      url: url,
      contentType : 'application/json',
      headers: {
        'Accept': `application/x.seometrics.v4+json`,
      },
      data: JSON.stringify({
        domains: params.domains,
        country: country,
        version: version,
        num: numParam,
        api_key: _apiKey || ''
      })
    })
    .then(function(json){
      var res = {error: false, data: json};
      if (json.error) {
        res = {error: true, data: json.message};
      }
      cbProcessResponse(res);
    })
    .catch(function(jqXHR, textStatus, errorThrown){
      cbProcessResponse({error: true, data: textStatus});
    });
  };


  var getDomainPages = function(params, cbProcessResponse){
    var url = 'https://data.keywordseverywhere.com/service/get-domain-pages';
    var country = params.country;
    if (!country) country = 'us';
    ajax({
      method: 'POST',
      url: url,
      contentType : 'application/json',
      headers: {
        'Accept': `application/x.seometrics.v4+json`,
      },
      data: JSON.stringify({
        domain: params.domain,
        country: country,
        version: version,
        num: numParam,
        api_key: _apiKey || ''
      })
    })
    .then(function(json){
      var res = {error: false, data: json};
      cbProcessResponse(res);
    })
    .catch(function(jqXHR, textStatus, errorThrown){
      cbProcessResponse({error: true, data: textStatus});
    });
  };


  var getCompetitorKeywords = function(params, cbProcessResponse){
    var url = 'https://data.keywordseverywhere.com/service/get-competitor-keywords';
    var country = params.country;
    if (!country) country = 'us';
    ajax({
      method: 'POST',
      url: url,
      contentType : 'application/json',
      headers: {
        'Accept': `application/x.seometrics.v4+json`,
      },
      data: JSON.stringify({
        my_domain: params.myDomain,
        competitors: params.competitors,
        country: country,
        version: version,
        num: numParam,
        api_key: _apiKey || ''
      })
    })
    .then(function(json){
      var res = {error: false, data: json};
      cbProcessResponse(res);
    })
    .catch(function(jqXHR, textStatus, errorThrown){
      cbProcessResponse({error: true, data: textStatus});
    });
  };


  var getMatchingDomains = function(params, cbProcessResponse){
    var url = 'https://data.keywordseverywhere.com/service/get-matching-domains';
    var country = params.country;
    if (!country) country = 'us';
    ajax({
      method: 'POST',
      url: url,
      contentType : 'application/json',
      headers: {
        'Accept': `application/x.seometrics.v4+json`,
      },
      data: JSON.stringify({
        match_string: params.matchString,
        version: version,
        num: numParam,
        api_key: _apiKey || ''
      })
    })
    .then(function(json){
      var res = {error: false, data: json};
      cbProcessResponse(res);
    })
    .catch(function(jqXHR, textStatus, errorThrown){
      cbProcessResponse({error: true, data: textStatus});
    });
  };


  var getPageBacklinks = function(data, cbProcessResponse){
    var url = 'https://links.keywordseverywhere.com/service/get-page-backlinks';
    fetchWithTimeout(url, {
      method: "POST",
      headers: {
        'Accept': `application/x.seometrics.v3+json`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "api_key": _apiKey, 'page': data.page, num: numParam})
    })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
    }).then((json) => {
      cbProcessResponse(json);
    }).catch(function (error) {
      cbProcessResponse({
        error: true,
        data: error.message
      });
    });
  };


  var getUniquePageBacklinks = function(data, cbProcessResponse){
    var url = 'https://links.keywordseverywhere.com/service/get-unique-page-backlinks';
    fetchWithTimeout(url, {
      method: "POST",
      headers: {
        'Accept': `application/x.seometrics.v3+json`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "api_key": _apiKey, 'page': data.page, num: numParam })
    }
    )
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
    }).then((json) => {
      cbProcessResponse(json);
    }).catch(function (error) {
      console.log(error.message);
      cbProcessResponse({
        error: true,
        data: error.message
      });
    });
  };


  var getDomainBacklinks = function(data, cbProcessResponse){
    var url = 'https://links.keywordseverywhere.com/service/get-domain-backlinks';
    fetchWithTimeout(url, {
      method: "POST",
      headers: {
        'Accept': `application/x.seometrics.v3+json`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "api_key": _apiKey, 'domain': data.domain, num: numParam })
    }
    )
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
    }).then((json) => {
      cbProcessResponse(json);
    }).catch(function (error) {
      console.log(error.message);
      cbProcessResponse({
        error: true,
        data: error.message
      });
    });
  };


  var getUniqueDomainBacklinks = function(data, cbProcessResponse){
    var url = 'https://links.keywordseverywhere.com/service/get-unique-domain-backlinks';
    fetchWithTimeout(url, {
      method: "POST",
      headers: {
        'Accept': `application/x.seometrics.v3+json`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "api_key": _apiKey, 'domain': data.domain, num: numParam })
    }
    )
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
    }).then((json) => {
      cbProcessResponse(json);
    }).catch(function (error) {
      console.log(error.message);
      cbProcessResponse({
        error: true,
        data: error.message
      });
    });
  };


  async function openAIFetchCategories() {
    const response = await fetch(API_URL + `templates/getCategories.php`);
    const data = await response.json();
    return data;
  }

  async function openAIFetchTemplates(subcat) {
    const response = await fetch(API_URL + `templates/getTemplates.php?subcat=${subcat}`);
    const data = await response.json();
    return data;
  }

  async function openAIFetchTemplate(id) {
    const response = await fetch(API_URL + `templates/getTemplate.php?id=${id}`);
    const data = await response.json();
    return data;
  }


  async function openAIFetchLanguages() {
    const response = await fetch(API_URL + `templates/getLanguages.php`);
    const data = await response.json();
    return data;
  }


  async function openAIFetchCountries() {
    const response = await fetch(API_URL + `templates/getCountries.php`);
    const data = await response.json();
    return data;
  }


  async function openAIFetchVoiceTones() {
    const response = await fetch(API_URL + `templates/getVoiceTones.php`);
    const data = await response.json();
    return data;
  }


  async function openAIFetchWritingStyles() {
    const response = await fetch(API_URL + `templates/getWritingStyles.php`);
    const data = await response.json();
    return data;
  }


  async function openAIfetchPersuasions() {
    const response = await fetch(API_URL + `templates/getPersuasions.php`);
    const data = await response.json();
    return data;
  }


  async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 30000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  }


  return {
    init: init,
    isOnline: isOnline,
    getPlan: getPlan,
    getCredits: getCredits,
    getParams: getParams,
    getKeywordData: getKeywordData,
    getTagsData: getTagsData,
    getCountries: getCountries,
    getCurrencies: getCurrencies,
    checkApiKey: checkApiKey,
    addKeywords: addKeywords,
    deleteKeywords: deleteKeywords,
    getFavoriteKeywords: getFavoriteKeywords,
    getConfig: getConfig,
    getBulkConfig: getBulkConfig,
    trend: trend,
    postTrendKeywords: postTrendKeywords,
    getDomainMetrics: getDomainMetrics,
    getDomainLinkMetrics: getDomainLinkMetrics,
    getURLMetrics: getURLMetrics,
    getURLKeywords: getURLKeywords,
    getDomainKeywords: getDomainKeywords,
    getDomainPages: getDomainPages,
    getCompetitorKeywords: getCompetitorKeywords,
    getMatchingDomains: getMatchingDomains,
    getPageBacklinks: getPageBacklinks,
    getUniquePageBacklinks: getUniquePageBacklinks,
    getDomainBacklinks: getDomainBacklinks,
    getUniqueDomainBacklinks: getUniqueDomainBacklinks,
    openAIFetchCategories: openAIFetchCategories,
    openAIFetchTemplates: openAIFetchTemplates,
    openAIFetchTemplate: openAIFetchTemplate,
    openAIFetchLanguages: openAIFetchLanguages,
    openAIFetchCountries: openAIFetchCountries,
    openAIFetchVoiceTones: openAIFetchVoiceTones,
    openAIFetchWritingStyles: openAIFetchWritingStyles,
    openAIfetchPersuasions: openAIfetchPersuasions
  };

})();
