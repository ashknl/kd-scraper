var TrendsChart = (function(){

  var vendor = (navigator.userAgent.match(/(Chrome|Firefox)/) || [])[1];


  var init = function(params){
    if (params.queries) {
      if (params.chartData) initMultiTrendsChartWithData(params);
      else initMultiTrendsChart(params);
    }
    else initTrendsChart(params);
  };


  const initTrendsChart = (params) => {
    let query = params.query;
    let metricsPromise = params.metrics;
    let settings = Starter.getSettings();
    let geo = settings.country.toUpperCase();
    if (typeof params.geo !== 'undefined') geo = params.geo;
    if (!geo) geo = '';
    if (geo === 'UK') geo = 'GB';
    params.geo = geo;
    let property = params.property;
    let timeRange = params.timeRange || 'All Time';
    chrome.runtime.sendMessage({cmd: 'googleTrendsAPI.multiline', data: {
      keyword: query,
      timeRange: timeRange,
      geo: geo,
      property: property || '',
      category: params.category || 0
    }}, async (res) => {
      let data = await processTrendsResponse(res, params, metricsPromise);
      if (!data) return;
      if (data.nodata) return;
      renderTrendsChart(params, data);
    });
  };


  const googleTrendsAPImultilineAsync = (params) => {
    let metricsPromise = params.metricsPromise;
    return new Promise((resolve, reject) => {
      let retry = (function(){
        let attempts = 0;
        return function(){
          var timeout = [0, 30, 60, 90, 120, 300][attempts];
          attempts++;
          if (attempts <= 5) {
            setTimeout(async function(){
              let res = await GoogleTrendsAPI.multiline({
                keyword: params.keyword,
                timeRange: params.timeRange,
                geo: params.geo,
                property: params.property || '',
                category: params.category || '',
                captcha: params.captcha
              });
              let data = await processTrendsResponse(res, params, metricsPromise);
              if (!data) retry();
              else resolve(data);
            }, timeout*1000);
          }
          else {
            resolve();
            console.log('googleTrendsAPI.multiline failed after 5 retries');
          }
        };
      })();
      retry();
    });
  };


  var getChartItem = async function(params, index){
    var m = {
      error: false,
      data: [params.metrics[index]]
    };
    var metricsPromise = Promise.resolve(m);
    let res = await processTrendsResponse(params.chartData, params, metricsPromise, index);
    res.query = params.queries[index];
    res.keyword = params.queries[index];
    return res;
  };


  const initMultiTrendsChartWithData = async (params) => {
    let queries = params.queries;
    let results = new Array(queries.length);
    for (let i = 0; i < queries.length; i++) {
      results[i] = await getChartItem(params, i);
    }
    renderTrendsChart(params, results);
    $('.xt-trend-loading-spinner').addClass('xt-hidden');
  };


  const initMultiTrendsChart = async (params) => {
    let queries = params.queries;
    let metricsPromises = params.metricsPromises;
    let settings = Starter.getSettings();
    let geo = settings.country.toUpperCase();
    if (typeof params.geo !== 'undefined') geo = params.geo;
    if (!geo) geo = '';
    if (geo === 'UK') geo = 'GB';
    params.geo = geo;
    let property = params.property;
    let timeRange = params.timeRange || 'All Time';
    let results = new Array(queries.length);
    let promises = [];
    for (let [index, query] of queries.entries()) {
      let promise = googleTrendsAPImultilineAsync({
        showVolume: params.showVolume,
        keyword: query,
        metricsPromise: metricsPromises[index],
        timeRange: params.timeRange,
        geo: params.geo,
        property: params.property || '',
        category: params.category,
        captcha: params.captcha
      }).then(function(data){
        results[index] = data;
        if (data && !data.nodata) renderTrendsChart(params, results);
        if (typeof data === 'undefined') {
          $('.xt-trend-loading-status').removeClass('xt-hidden');
        }
      });
      promises.push(promise);
      if (index < queries.length - 1) {
        await timeoutAsync(1000);
      }
    }
    Promise.all(promises).then(function(){
      $('.xt-trend-loading-spinner').addClass('xt-hidden');
    });
    // renderTrendsChart(params, results);
  };


  const timeoutAsync = function(timeout){
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  };


  const processTrendsResponse = async (res, params, metricsPromise, chartIndex) => {
    try {
      if (res.error) return;
      if (!chartIndex) chartIndex = 0;
      let resolution = res.req.request.resolution;
      let arrTimeline = res.json.default.timelineData;
      if (!arrTimeline.length) return {nodata: true};
      let labels = [];
      let formattedTime = [];
      let values = [];
      let partial = {};
      let noDataCount = 0;
      arrTimeline.map((item, index) => {
        labels.push(item.time*1000);
        formattedTime.push(item.formattedTime);
        values.push(item.value[chartIndex]);
        if (item.isPartial) partial[index] = true;
        if (!item.hasData[0]) noDataCount++;
      });
      let noDataRatio = noDataCount / arrTimeline.length;
      // if (noDataRatio > 0.25) return {noDataPartial: true};
      let chartValues = values;
      let volumeChart = false;
      if (params.showVolume) {
        let convertedValues = await convertInterestToVolume({labels,
          values,
          metricsPromise: metricsPromise,
          timeRange: params.timeRange,
          property: params.property,
          query: params.query
        });
        if (convertedValues) {
          chartValues = convertedValues;
          volumeChart = true;
        }
      }
      let result = {
        query: params.keyword,
        volumeChart: volumeChart,
        labels: labels,
        values: chartValues,
        formattedTime: formattedTime,
        resolution: resolution,
        partial: partial
      };
      // $('#xt-trend-chart-root').append('<pre>' + JSON.stringify({
      //   interestValue: interestValue,
      //   interestIndex: lastVals.interestIndex,
      //   interestDate: (new Date(lastVals.interestTS)).toLocaleString(),
      //   interestTS: lastVals.interestTS,
      //   scaleFactor: scaleFactor,
      //   trendValue: trendValue,
      //   trendVals: trendVals
      // }, '', '  ') + '</pre>');
      return result;
    } catch (e) {
      console.log(e);
      return;
    }
  };


  const convertInterestToVolume = async (params) => {
    let {labels, values, metricsPromise, timeRange, property, query} = params;
    let metrics = await metricsPromise;
    if (metrics.error) return;
    if (!metrics.data) return;
    let trendVals = metrics.data[0].trend.split('|');
    let lastVals = getLastNonZeroValues(trendVals, labels, values);
    let trendValue = lastVals.trendValue;
    if (typeof trendValue === 'undefined') return;
    if (trendVals.join('') === '') trendValue = parseInt(metrics.data[0].vol.replace(/,/g, ''));
    if (trendValue === 0) {
      if (property === 'youtube') return;
      if (lastVals.allZeroes) return;
      chrome.runtime.sendMessage({
        cmd: 'api.trend',
        data: {
          query: query
        }
      });
      return;
    }
    let interestValue = lastVals.interestValue;
    let divider = interestValue;
    if (timeRange.match(/(5yrs|12mo)/)) divider = interestValue * 4;
    else if (timeRange.match(/(3mo|30d)/)) divider = interestValue * 30;
    else if (timeRange === '7d') divider = interestValue * (30*24);
    else if (timeRange === '1d') divider = interestValue * (30*24*7.5); // every 8 minutes
    else if (timeRange === '4h') divider = interestValue * (30*24*60);
    else if (timeRange === '1h') divider = interestValue * (30*24*60);
    let scaleFactor = trendValue / divider;
    let convertedValues = values.map(value => {
      let res = value * scaleFactor;
      let formattedRes;
      if (res < 30 && timeRange.match(/(3mo|30d|7d)/)) formattedRes = res.toFixed(2);
      else if (res <= 100) formattedRes = parseInt(res);
      else if (res > 100 && res <= 1000) formattedRes = (Math.round(res / 10) * 10);
      else if (res > 1000) formattedRes = Math.round(res / 100) * 100;
      return formattedRes;
    });
    // console.log(params, values, convertedValues, trendValue, interestValue, scaleFactor, lastVals);
    return convertedValues;
  };


  const getLastNonZeroValues = (arrTrend, arrTime, arrInterest) => {
    let sum = arrTrend.reduce((accumulator, currentValue) => {
      return accumulator + parseFloat(currentValue);
    });
    if (sum === 0) return {
      allZeroes: true,
      trendValue: 0
    };
    let today = new Date();
    let endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
    endOfPrevMonth.setHours(endOfPrevMonth.getHours()-endOfPrevMonth.getTimezoneOffset()/60);
    let endTs = endOfPrevMonth.getTime();
    let startIndex = arrTime.length - 1;
    let found = false;
    for (; startIndex >= 0; startIndex--) {
      if (arrTime[startIndex] < endTs) {
        found = true;
        break;
      }
    }
    // find non-zero
    let interestValue;
    let interestIndex;
    if (!found) {
      startIndex = 0; // for 7d & 30d
      for (let i = 0, len = arrTime.length; i < len; i++) {
        if (arrInterest[i] > 0) {
          interestIndex = i;
          interestValue = arrInterest[i];
          break;
        }
      }
    }
    else {
      for (let i = startIndex; i >= 0; i--) {
        if (arrInterest[i] > 0) {
          interestIndex = i;
          interestValue = arrInterest[i];
          break;
        }
      }
    }
    if (typeof interestIndex === 'undefined') {
      for (let i = 0, len = arrTime.length; i < len; i++) {
        if (arrInterest[i] > 0) {
          interestIndex = i;
          interestValue = arrInterest[i];
          break;
        }
      }
    }
    let nonZeroTS = arrTime[interestIndex];
    let d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    let trendValue;
    for (let i = 0, len = arrTrend.length; i < len; i++) {
      if (nonZeroTS >= d.getTime()) {
        trendValue = arrTrend[i];
        break;
      }
      d.setMonth(d.getMonth() - 1);
    }
    let res = {
      trendValue: trendValue,
      interestIndex: interestIndex,
      interestValue: interestValue,
      interestTS: nonZeroTS
    };
    return res;
  };


  const renderTrendsChart = async (params, data) => {
    console.log(params, data);
    var multiCharts = false;
    if (data && data.length) multiCharts = true;

    let $root = $(params.parentSelector);
    $root.addClass(params.parentClassName);
    let rootId = params.rootId;
    let $widgetRoot = $root.find('#' + rootId);
    let rootTagName = params.rootTagName || '<div>';
    if (!$widgetRoot[0]) {
      $widgetRoot = $(rootTagName, {
        id: rootId,
        class: 'xt-ke-card'
      });
      if (params.addFn) {
        params.addFn($widgetRoot, $root);
      }
      else $widgetRoot[params.addMethod]($root);
    }
    else $widgetRoot.text('');

    let timeRangeSelectorHTML;
    if (!multiCharts) timeRangeSelectorHTML = renderTrendTimeRangeSelector(params.timeRange);
    let spinner = '';
    if (multiCharts) {
      spinner = '<span class="xt-trend-loading-spinner">Loading Keywords Everywhere Trend Chart</span><span class="xt-trend-loading-status xt-hidden">The Google Trends API is not responding. Please refresh this page after 10 minutes</span>';
    }
    var queries = params.queries;
    var iframeQuery = params.query ? params.query : queries.join(',');
    var settings = Starter.getSettings();
    let country = settings.country.toUpperCase();
    if (typeof params.geo !== 'undefined') country = params.geo;
    if (!country) country = 'Global';
    let countryTitle = '(' + country + ')';
    params.country = country;
    params.countryTitle = countryTitle;
    var volumeChart = data.volumeChart;
    if (multiCharts) {
      var index = data.findIndex(el => el !== undefined);
      if (index < 0) {
        console.log('No datasets for chart');
        return;
      }
      volumeChart = false;
      data.map(item => {
        if (item && item.volumeChart) volumeChart = true;
      });
    }
    let buttonsHiddenClass = volumeChart ? '' : 'xt-hidden';
    let version = chrome.runtime.getManifest().version;
    let heading = `${params.title} ${Common.escapeHtml(params.query)} ${countryTitle}`;
    if (multiCharts) heading = params.title + ' ' + countryTitle;

    let html = [
      '<div class="xt-close">✖</div>',
      '<table class="xt-ke-google-trend-title"><tr>',
      '<td><img src="' + chrome.runtime.getURL('/img/icon24.png') + '" width="24" height="24" style="vertical-align:middle">',
      '</td><td>',
      `<h3>${heading}</h3>`,
      spinner,
      '</td></tr></table>',
    ].join('\n');
    if (data && data.noDataPartial) {
      let url = `https://trends.google.com/trends/explore?geo=${params.geo}&q=` + encodeURIComponent(params.query);
      html += [
        '<div class="xt-chart-no-data">',
        '<div class="xt-text-center">The Trend chart is not shown as the Trends API is unavailable.<br>Please try again later.</div>',
        `<div class="xt-text-center"><a href="${url}" target="_blank">View this chart on Google Trends website</a></div>`,
        '</div>'
      ].join('\n');
    }
    else {
      html += [
        '<table class="xt-google-trend-controls">',
        '<tr><td>',
        timeRangeSelectorHTML,
        '</td><td style="text-align:right">',
        '<div class="xt-ke-google-trend-copy-export-row">',
        `<button class="xt-ke-btn xt-google-trend-copy ${buttonsHiddenClass}">${Common.getIcon('copy')} ${params.buttonCopy}</button>`,
        `<button class="xt-ke-btn xt-google-trend-export ${buttonsHiddenClass}">${Common.getIcon('export')} ${params.buttonExport}</button>`,
        '</div>',
        '</td></tr>',
        '</table>',
        '<div class="xt-google-trend-canvas"></div>',
        `<div class="xt-widget-iframe"><iframe src="https://keywordseverywhere.com/ke/widget.php?apiKey=${settings.apiKey}&source=${params.source}&pur=${params.showVolume ? 0 : 1}&country=${settings.country}&version=${version}&darkmode=${params.darkMode}&query=${encodeURIComponent(Common.escapeHtml(iframeQuery))}" scrolling="no"></iframe></div>`
      ].join('\n');
    }
    $widgetRoot.html(html);
    if (data && data.noDataPartial) return;
    initTrendsChartEventHandlers(params, $widgetRoot, data);

    let $canvas = $('<canvas>', {id: 'xt-trend-chart'}).appendTo($widgetRoot.find('.xt-google-trend-canvas'));
    var ctx = $canvas[0].getContext('2d');

    Chart.defaults.multicolorLine = Chart.defaults.line;
    Chart.controllers.multicolorLine = Chart.controllers.line.extend({
      draw: function(ease) {
        let meta = this.getMeta();
        let points = meta.data || [];
        let regularColor = this.getDataset().borderColor;
        let partialColor = this.getDataset().partialColor;
        let area = this.chart.chartArea;
        let originalDatasets = meta.dataset._children
          .filter(function(data) {
            return !isNaN(data._view.y);
          });

        function _setColor(newColor, meta) {
          meta.dataset._view.borderColor = newColor;
        }

        if (!partialColor) {
          Chart.controllers.line.prototype.draw.call(this, ease);
          return;
        }

        for (let i = 0, len = meta.data.length; i < len; i++) {
          var value = meta.data[i];
          if (data.partial[i]) {
            _setColor(partialColor, meta);
            meta.dataset._children = originalDatasets.slice(i-1, i+1);
            meta.dataset.draw();
          }
          else {
            _setColor(regularColor, meta);
            meta.dataset._children = originalDatasets.slice(i-1, i+1);
            meta.dataset.draw();
          }
        }
        meta.dataset._children = originalDatasets;
        points.forEach(function(point) {
          point.draw(area);
        });
      }
    });

    var grayColor = params.darkMode ? '#aaa' : '#70757a';
    var gridColor = params.darkMode ? '#3e3e3e' : '#d9e2ef';
    var chartColor = '#c0504f';

    var volumeChart;
    var resolution;
    var formattedTime;
    var datasets = [];
    var labels = [];
    var colors = ['#4285f4', '#db4437', '#f4b400', '#0f9d58', '#ab47bc'];
    if (multiCharts) {
      var index = data.findIndex(el => el !== undefined);
      if (index < 0) {
        console.log('No datasets for chart');
        return;
      }
      volumeChart = data[index].volumeChart;
      resolution = data[index].resolution;
      formattedTime = data[index].formattedTime;
      labels = data[index].labels;
      data.map((item, index) => {
        if (!item) return;
        // if (item.volumeChart) {
        //   datasets.push({});
        //   return;
        // }
        datasets.push({
          label: '',
          fill: false,
          borderColor: colors[index], //chartColor,
          // partialColor: '#00f000',
          data: item.values,
          colors: ['red', 'green', 'blue']
          // colors: ['', 'red', 'green', 'blue']
        });
      });
    }
    else {
      volumeChart = data.volumeChart;
      resolution = data.resolution;
      formattedTime = data.formattedTime;
      labels = data.labels;
      datasets.push({
        label: '',
        backgroundColor: chartColor,
        borderColor: chartColor,
        // partialColor: '#00f000',
        data: data.values,
        colors: ['', 'red', 'green', 'blue']
      });
    }

    var chart = new Chart(ctx, {
      type: 'multicolorLine',
      data: {
        labels: labels,
        datasets: datasets,
        type: "line",
        pointRadius: 0,
        lineTension: 0,
        borderWidth: 1
      },
      options: {
        aspectRatio: params.aspectRatio || 2,
        elements: {
          point:{
            radius: 0
          }
        },
        legend: {
          display: false
        },
        animation: {
          duration: 0
        },
        scales: {
          xAxes: [{
            type: "time",
            distribution: "series",
            offset: true,
            ticks: {
              major: {
                enabled: true,
                fontStyle: "bold"
              },
              source: "data",
              autoSkip: true,
              autoSkipPadding: 75,
              maxRotation: 0,
              sampleSize: 100,
              fontColor: grayColor,
            },
            gridLines: {
              display: false
            },
          }],
          yAxes: [{
            ticks: {
              display: volumeChart,
              beginAtZero: true,
              padding: 10,
              fontColor: grayColor,
              callback: function(value, index, values) {
                return value.toLocaleString();
              }
            },
            gridLines: {
              borderDashOffset: [2],
              drawBorder: false,
              color: gridColor,

              zeroLineColor: gridColor,
              zeroLineBorderDash: [2],
              zeroLineBorderDashOffset: [2]
            },
            scaleLabel: {
              display: true,
              fontColor: grayColor,
              labelString: volumeChart ? 'Search Volume' : 'Search Interest'
            }
          }]
        },
        tooltips: {
          intersect: false,
          mode: "index",
          callbacks: {
            label: function(e, t) {
              var dataPointer = data;
              var query = '';
              if (data.length) {
                dataPointer = data[e.datasetIndex];
                query = ' - ' + queries[e.datasetIndex];
              }
              // if (!dataPointer.volumeChart) return '';
              let res = parseFloat(e.value).toLocaleString();
              if (res > 10) res = Math.round(res);
              return `${res} (${dataPointer.resolution.toLowerCase()})${query}`;
            },
            labelColor: function(context) {
              return {
                borderColor: colors[context.datasetIndex],
                backgroundColor: colors[context.datasetIndex],
                borderWidth: 0,
              };
            },
            title: function(e, t){
              let index = e[0].index;
              let formattedTime = data.formattedTime;
              if (!formattedTime && data.length) {
                formattedTime = data[0].formattedTime;
              }
              let res = formattedTime[index];
              return res;
            }
          }
        }
      }
    });
    chart.update();
  };


  const formatDateString = (resolution, ts) => {
    let res;
    let d = new Date(ts);
    if (resolution === 'HOUR') res = d.toLocaleString();
    if (resolution === 'WEEK' || resolution === 'DAY') {
      res = d.toLocaleDateString();
    }
    else if (resolution === 'MONTH') {
      res = Common.getDate('MON YYYY', d);
    }
    return res;
  };


  const initTrendsChartEventHandlers = (params, $widgetRoot, data) => {
    const getExportArray = (withHeaders) => {
      let arrRes = [];
      if (data.length) {
        data.map(function(item, i){
          item.formattedTime.map((val, index) => {
            let date = val;
            if (i === 0) arrRes.push([date, item.values[index]]);
            else arrRes[index][i + 1] = item.values[index];
          });
        });
        if (withHeaders) {
          var headers = ['Date'];
          data.map(function(item){
            headers.push(`${item.query} - Search Volume ${params.countryTitle}`);
          });
          arrRes.unshift(headers);
        }
      }
      else {
        if (withHeaders) arrRes.push(['Date', `Search Volume ${params.countryTitle}`]);
        data.formattedTime.map((val, index) => {
          // let date = formatDateString(data.resolution, val);
          let date = val;
          arrRes.push([date, data.values[index]]);
        });
      }
      return arrRes;
    };
    $widgetRoot.find('.xt-close').click(e => {
      e.preventDefault();
      $widgetRoot.remove();
    });
    $widgetRoot.find('.xt-google-trend-canvas').click(e => {
      e.preventDefault();
      let date = '';
      let mapping = {
        'All Time': 'all',
        '5yrs': 'today 5-y',
        '12mo': '',
        '3mo': 'today 3-m',
        '30d': 'today 1-m',
        '7d': 'now 7-d'
      };
      if (mapping[params.timeRange]) date = '&date=' + encodeURIComponent(mapping[params.timeRange]);
      let url = `https://trends.google.com/trends/explore?geo=${params.geo}&q=` + encodeURIComponent(params.query) + date;
      if (params.property === 'youtube') url += '&gprop=youtube';
      chrome.runtime.sendMessage({
        cmd: 'new_tab',
        data: url
      });
    });
    $widgetRoot.find('.xt-trend-time').click(function(e){
      e.preventDefault();
      $widgetRoot.find('.xt-trend-spinner').removeClass('xt-hidden');
      let val = this.dataset.val;
      params.timeRange = val;
      initTrendsChart(params);
      chrome.runtime.sendMessage({
        cmd: 'setting.set',
        data: {key: 'googleTrendChartDefaultTime', value: val}
      });
    });
    $widgetRoot.find('.xt-google-trend-copy').click(e => {
      e.preventDefault();
      Common.clipboardWrite( CSV.stringify(getExportArray(true), '\t') );
    });
    $widgetRoot.find('.xt-google-trend-export').click(e => {
      e.preventDefault();
      let query = params.query;
      if (params.queries) query = params.queries[0];
      let property = params.property;
      if (!property) property = 'google';
      let filename = ['trend', property, query.replace(/\s+/g, '-'), params.country.toLowerCase(), params.timeRange.replace(/\s+/g, '-'), Date.now()].join('-') + '.csv';
      filename = filename.toLowerCase();
      let csv = CSV.stringify( getExportArray(true), ',' );
      if (vendor === 'Firefox') {
        chrome.runtime.sendMessage({
          cmd: 'file.download',
          data: {
            content: csv,
            name: filename
          }
        });
        return;
      }
      var csvData = 'data:application/csv;charset=utf-8,' + '\ufeff' + encodeURIComponent(csv);
      Common.saveToFile(csvData, filename);
    });
  };


  const renderTrendTimeRangeSelector = (active) => {
    if (!active) active = 'All Time';
    let items = ['7d', '30d', '3mo', '12mo', '5yrs', 'All Time'];
    let html = '';
    items.map(item => {
      let activeClass = active === item ? 'xt-trend-time-active' : '';
      html += `<a href="#" class="xt-trend-time ${activeClass}" data-val="${item}">${item}</a>`;
    });
    html += '<span class="xt-trend-spinner xt-hidden"></span>';
    return '<div class="xt-trend-time-row">' + html + '</div>';
  };


  return {
    init: init,
    processTrendsResponse: processTrendsResponse
  };

})();
