const AutocompleteAPI = (() => {

  let services = {};
  let fnGetSettings;

  const init = params => {
    if (params.fnGetSettings) fnGetSettings = params.fnGetSettings;
  };


  const get = async (params) => {
    try {
      let settings = await fnGetSettings();
      let res = await services[params.service].get(params, settings);
      console.log(res);
      return res;
    } catch (e) {
      console.log(e);
    }
  };



  services.google = {
    name: 'google',
    async get (params) {
      let url = 'https://www.google.';
      if (params.tld) url += params.tld;
      else url += 'com';
      url += `/complete/search?`;
      if (params.cp) url += 'cp=' + params.cp + '&';
      url += `client=gws-wiz&xssi=t&hl=en&authuser=0&psi=AVxsX9KsAuOX4-EP94KmyAE.1600936964140&dpr=1&q=` + encodeURIComponent(params.query);
      let data = fetchData({url: url})
        .then(data => {
          let response = this.parse(data);
          if (response.error) return response;
          return {error: false, data: response};
        })
        .catch(error => {
          return {error: true, data: error.message};
        });
      return data;
    },
    parse (text) {
      try {
        let jsonStr = text.replace(")]}'", '');
        let json = JSON.parse(jsonStr);
        let items = json[0];
        let res = [];
        items.map(item => {
          let kw = item[0];
          kw = kw.replace(/<\/?b>/g, '');
          res.push({keyword: kw, extra: item[1]});
        });
        // console.log(json, res);
        return res;
      } catch (e) {
        console.log('Parse error', e, text);
        return {error: true, data: 'Parse error'};
      }
    }
  };


  services.youtube = {
    name: 'youtube',
    async get (params) {
      let url = `https://clients1.google.com/complete/search?client=youtube&hl=en&gl=${params.lng}&gs_rn=64&gs_ri=youtube&tok=qd7pItwW99nwgd8R-it9rQ&ds=yt&cp=3&gs_id=9&callback=google.sbox.p50&gs_gbg=09tlsZzNK0Dp4R&q=` + encodeURIComponent(params.query);
      let data = fetchData({url: url})
        .then(data => {
          let response = this.parse(data);
          if (response.error) return response;
          return {error: false, data: response};
        })
        .catch(error => {
          return {error: true, data: error.message};
        });
      return data;
    },
    parse (text) {
      try {
        let jsonStr = text.replace(/^[^(]*?\(/, '');
        jsonStr = jsonStr.replace(/\)[^)]*?$/, '');
        let json = JSON.parse(jsonStr);
        let items = json[1];
        let res = [];
        items.map(item => {
          let kw = item[0];
          kw = kw.replace(/<\/?b>/g, '');
          res.push({keyword: kw, extra: item[1]});
        });
        // console.log(json, res);
        return res;
      } catch (e) {
        console.log('Parse error', e, text);
        return {error: true, data: 'Parse error'};
      }
    }
  };


  services.bing = {
    name: 'bing',
    async get (params, settings) {
      let lng = 'en-us';
      let country = settings.country;
      if (country) {
        lng = 'en-' + country;
        if (country === 'uk') lng = 'en-gb';
      }
      let url = `https://www.bing.com/AS/Suggestions?pt=page.home&mkt=${lng}&cp=7&cvid=RANDOM&qry=` + encodeURIComponent(params.query);
      let data = fetchData({url: url})
        .then(data => {
          // let response = this.parse(data);
          // if (response.error) return response;
          return {error: false, data: {html: data, type: 'bing'}};
        })
        .catch(error => {
          return {error: true, data: error.message};
        });
      return data;
    },
    parse (text) {
      try {
        let dom = (new DOMParser()).parseFromString(text, "text/html");
        let lis = dom.querySelectorAll('ul li[role=option]');
        let res = [];
        for (let li of lis) {
          if (li.getAttribute('pw') === null && li.getAttribute('sw') === null) {
            res.push({keyword: $.trim(li.textContent)});
          }
        }
        return res;
      } catch (e) {
        console.log('Parse error', e, text);
        return {error: true, data: 'Parse error'};
      }
    }
  };


  services.ebay = {
    name: 'ebay',
    async get (params) {
      let url = ` https://autosug.ebaystatic.com/autosug?_jgr=1&sId=0&_ch=0&callback=0&kwd=` + encodeURIComponent(params.query);
      let data = fetchData({url: url})
        .then(data => {
          let response = this.parse(data);
          if (response.error) return response;
          return {error: false, data: response};
        })
        .catch(error => {
          return {error: true, data: error.message};
        });
      return data;
    },
    parse (text) {
      try {
        let json = JSON.parse(text);
        if (!json.res) return [];
        let items = json.res.sug;
        let res = [];
        items.map(item => {
          res.push({keyword: item});
        });
        return res;
      } catch (e) {
        console.log('Parse error', e, text);
        return {error: true, data: 'Parse error'};
      }
    }
  };


  services.etsy = {
    name: 'etsy',
    async get (params) {
      let url = `https://www.etsy.com/suggestions_ajax.php?extras=%7B%26quot%3Bexpt%26quot%3B%3A%26quot%3Boff%26quot%3B%2C%26quot%3Blang%26quot%3B%3A%26quot%3Ben-GB%26quot%3B%2C%26quot%3Bextras%26quot%3B%3A%5B%5D%2C%26quot%3Bsearches%26quot%3B%3A%5B%5D%7D&version=10_12672349415_19&search_type=all&previous_query=&search_query=` + encodeURIComponent(params.query);
      let data = fetchData({url: url})
        .then(data => {
          let response = this.parse(data);
          if (response.error) return response;
          return {error: false, data: response};
        })
        .catch(error => {
          return {error: true, data: error.message};
        });
      return data;
    },
    parse (text) {
      try {
        let json = JSON.parse(text);
        let items = json.results;
        if (items.length === 1 && items[0].link) return [];
        let res = [];
        items.map(item => {
          if (item.link) return;
          let kw = item.query;
          res.push({keyword: kw});
        });
        return res;
      } catch (e) {
        console.log('Parse error', e, text);
        return {error: true, data: 'Parse error'};
      }
    }
  };


  services.pinterest = {
    name: 'pinterest',
    async get (params) {
      let source_url = `/search/pins/q=${encodeURIComponent(params.query)}&term_meta[]=`;
      let dataParam = `{"options":{"term":"${params.query}","pin_scope":"pins","no_fetch_context_on_resource":false},"context":{}}`;
      let url = 'https://www.pinterest.';
      if (params.tld) url += params.tld;
      else url += 'com';
      url += `/resource/AdvancedTypeaheadResource/get/?source_url=${source_url}&data=${dataParam}`;
      let data = fetchData({url: url})
        .then(data => {
          let response = this.parse(data);
          if (response.error) return response;
          return {error: false, data: response};
        })
        .catch(error => {
          return {error: true, data: error.message};
        });
      return data;
    },
    parse (text) {
      try {
        let json = JSON.parse(text);
        console.log(json);
        let items = json.resource_response.data.items;
        let res = [];
        items.map(item => {
          let kw = item.query;
          res.push({keyword: kw});
        });
        return res;
      } catch (e) {
        console.log('Parse error', e, text);
        return {error: true, data: 'Parse error'};
      }
    }
  };


  services.instagram = {
    name: 'instagram',
    async get (params) {
      let url = `https://www.instagram.com/web/search/topsearch/?context=blended&query=${encodeURIComponent(params.query)}&include_reel=true`;
      let data = fetchData({url: url})
        .then(data => {
          let response = this.parse(data);
          if (response.error) return response;
          return {error: false, data: response};
        })
        .catch(error => {
          return {error: true, data: error.message};
        });
      return data;
    },
    parse (text) {
      try {
        let json = JSON.parse(text);
        let items = json.hashtags;
        let res = [];
        items.map(item => {
          let kw = item.hashtag.name;
          let score = item.hashtag.media_count;
          res.push({keyword: kw, score: score});
        });
        return res;
      } catch (e) {
        console.log('Parse error', e, text);
        return {error: true, data: 'Parse error'};
      }
    }
  };


  services.amazon = {
    name: 'amazon',
    async get (params) {
      let url = 'https://completion.amazon.';
      if (params.tld) url += params.tld;
      else url += 'com';
      let marketplaceID = this.getMIDbyTLD(params.tld);
      url += `/api/2017/suggestions?session-id=131-1807770-4044833&customer-id=&request-id=H4KF4325A6ZYTHNK0748&page-type=Gateway&lop=en_US&site-variant=desktop&client-info=amazon-search-ui&mid=${marketplaceID}&alias=aps&b2b=0&fresh=0&ks=79&event=onKeyPress&limit=11&fb=1&suggestion-type=KEYWORD&suggestion-type=WIDGET&_=1600937407074&prefix=` + encodeURIComponent(params.query);
      let data = fetchData({url: url})
        .then(data => {
          let response = this.parse(data);
          if (response.error) return response;
          return {error: false, data: response};
        })
        .catch(error => {
          return {error: true, data: error.message};
        });
      return data;
    },
    parse (text) {
      try {
        let json = JSON.parse(text);
        let items = json.suggestions;
        let res = [];
        items.map(item => {
          if (item.type === 'KEYWORD') {
            res.push({keyword: item.value});
          }
        });
        return res;
      } catch (e) {
        console.log('Parse error', e, text);
        return {error: true, data: 'Parse error'};
      }
    },
    getMIDbyTLD (tld) {
      let mapping = {
        "com.br": "A2Q3Y263D00KWC",
        "ca": "A2EUQ1WTGCTBG2",
        "com.mx": "A1AM78C64UM0Y8",
        "com": "ATVPDKIKX0DER",
        "ae": "A2VIGQ35RCS4UG",
        "de": "A1PA6795UKMFR9",
        "eg": "ARBP9OOSHTCHU",
        "es": "A1RKKUPIHCS9HS",
        "fr": "A13V1IB3VIYZZH",
        "co.uk": "A1F83G8C2ARO7P",
        "in": "A21TJRUUN4KGV",
        "it": "APJ6JRA9NG5V4",
        "nl": "A1805IZSGTT6HS",
        "sa": "A17E79C6D8DWNP",
        "se": "A2NODRKZP88ZB9",
        "com.tr": "A33AVAJ2PDY3EV",
        "sg": "A19VAU5U5O7RUS",
        "com.au": "A39IBJ37TRP1C6",
        "co.jp": "A1VC38T7YXB528"
      };
      let res = mapping[tld];
      if (!res) res = mapping.com;
      return res;
    }
  };


  const fetchData = async (params) => {
    let response = await fetch(params.url, {
      method: 'GET'
    });
    if (!response.ok) {
      const msg = response.status;
      throw new Error(msg);
    }
    let data;
    if (params.json) {
      data = await response.json();
    }
    else data = await response.text();
    return data;
  };



  return {
    init,
    get
  };

})();
