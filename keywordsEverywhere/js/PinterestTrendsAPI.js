const PinterestTrendsAPI = (() => {

  const API_URL = 'https://trends.pinterest.com/';


  const exactMatch = async (params) => {
    let country = params.country.toUpperCase() || 'US';
    console.log(country);
    if (country === 'UK') country = 'GB';
    if ('US GB CA'.indexOf(country) === -1) {
      country = 'US';
    }
    let urlParams = {
      terms: params.query,
      country: country,
      days: 365,
      end_date: params.endDate || getDate('YYYY-MM-DD'),
      normalize_against_group: true
    };
    let url = API_URL + 'metrics/?' + (new URLSearchParams(urlParams).toString());
    let response = await fetch(url);
    if (!response.ok) {
      return {
        error: response.status
      };
    }
    let res = {};
    let json = await response.json();
    res.json = json;
    return res;
  };


  const relatedTerms = async (params) => {
    let urlParams = {
      requestTerm: params.query,
      country: 'US',
      endDate: ''
    };
    let url = API_URL + 'related_terms/?' + (new URLSearchParams(urlParams).toString());
    let response = await fetch(url);
    if (!response.ok) {
      return {
        error: response.status
      };
    }
    let res = {};
    let json = await response.json();
    res.json = json;
    return res;
  };


  const getDate = (format, date) => {
    if (typeof date === 'undefined') date = new Date();
    if (!format) format = 'YYYY-MM-DD hh:mm:ss';
    var year = date.getFullYear();
    var month = ('0' + (date.getMonth() + 1)).substr(-2);
    var day = ('0' + date.getDate()).substr(-2);
    var hours = ('0' + date.getHours()).substr(-2);
    var min = ('0' + date.getMinutes()).substr(-2);
    var sec = ('0' + date.getSeconds()).substr(-2);

    var res = format;
    res = res.replace('YYYY', year);
    res = res.replace(/YY/g, year.toString().substr(-2));
    res = res.replace('MM', month);
    res = res.replace('DD', day);
    res = res.replace('hh', hours);
    res = res.replace('mm', min);
    res = res.replace('ss', sec);
    return res;
  };


  return {
    exactMatch,
    relatedTerms
  };

})();
