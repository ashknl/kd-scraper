var SourceList = {
  'gsearc': {name: 'Google Search', type: 'site'},
  'gwmtoo': {name: 'Google Search Console', type: 'site'},
  'gkplan': {name: 'Google Keyword Planner', type: 'site'},
  'analyt': {name: 'Google Analytics', type: 'site'},
  'gtrend': {name: 'Google Trends', type: 'site'},
  'youtub': {name: 'YouTube', type: 'site'},
  'bingco': {name: 'Bing Search', type: 'site'},
  'yahsea': {name: 'Yahoo Search', type: 'site'},
  'amazon': {name: 'Amazon', type: 'site'},
  'ebayco': {name: 'Ebay', type: 'site'},
  'etsyco': {name: 'Etsy', type: 'site'},
  'duckgo': {name: 'DuckDuckGo ', type: 'site'},
  'soovle': {name: 'Soovle', type: 'site'},
  'answtp': {name: 'Answer The Public', type: 'site'},
  'keyshi': {name: 'Keyword Shitter', type: 'site'},
  'instgr': {name: 'Instagram', type: 'site'},
  'pntrst': {name: 'Pinterest', type: 'site'},
  'openai': {name: 'ChatGPT', type: 'site'},
  'gprsea': {name: 'Related Widget (Google, Bing, YouTube, Pinterest & DDG)', type: 'widget'},
  'gpasea': {name: 'PASF Widget (Google)', type: 'widget'},
  'trenkw': {name: 'Trending Widget (Google & YouTube)', type: 'widget'},
  'ltkwid': {name: 'Long-Tail Widget (Google)', type: 'widget'},
  'youtag': {name: 'Tags Widget (YouTube)', type: 'widget'}
};


if (typeof exports !== 'undefined') {
  exports.get = function(){
    return SourceList;
  };
}
