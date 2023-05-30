(function(){

  var $popover;
  var popoverTimeout;


  var init = function(){
    initTheme();
    initUI();
    initPopover();
    chrome.runtime.sendMessage({cmd: 'yt.getVideoCache'}, function(data){
      processVideoData(data);
      document.title = data.avg.query;
    });
  };


  var initTheme = function(){
    var dark = getURLParameter('darkmode');
    if (dark && dark === "true") $('html').attr('dark', true);
  };


  var initUI = function(){
    $('.xt-copy-csv').click(function(e){
      $popover.text('').hide();
      Common.exportTableToCSV({
        table: $('table'),
        method: 'copy'
      });
    });
    $('.xt-export-csv').click(function(e){
      $popover.text('').hide();
      Common.exportTableToCSV({
        table: $('table'),
        method: 'export',
        filename: 'breakdown-' + document.title.replace(/\s+/g, '_') + '.csv'
      });
    });
  };


  var initPopover = function() {
    $popover = $('<div/>')
      .attr('id', 'xt-popover')
      .appendTo( $('body') );
    var hideTimer;


    $('body').on('click', '[data-popover]',
      function(e){
        e.stopPropagation();
        var html = decodeURIComponent(this.dataset.popover);
        var rect = e.target.getBoundingClientRect();
        $popover.html(html);
        var top = document.documentElement.scrollTop + rect.top + rect.height;
        showPopover($popover, top, e.pageX - $popover.width() - 20);
      });

    $('body').on('click',
      function(e){
        if ($(e.target).closest('#xt-popover')[0] || e.target === $popover[0]) return;
        $popover.text('').hide();
      });
  };


  var showPopover = function($popover, top, left){
    // if (popoverTimeout) clearTimeout(popoverTimeout);
    popoverTimeout = setTimeout(function(){
      $popover
        .show()
        .css('top', top)
        .css('left', left);
    }, 0);
  };


  var initWindowMessaging = function(){
    window.addEventListener("message", function(event){
      var payload = event.data;
      // console.log(payload);
      if (typeof payload !== 'object') return;
      var cmd = payload.cmd;
      var data = payload.data;
      if (!cmd) return;
      if (cmd === 'xt.yt.videos') {
        processVideoData(data);
      }
    }, false);
  };


  var getVideosData = function(){
    window.parent.postMessage({cmd: 'xt.yt.getVideos'}, '*');
  };


  var processVideoData = function(data){
    // console.log(data);
    var videoCache = data.videoCache;
    var avg = data.avg;
    var order = videoCache.order;
    var html = `<div id="main-line">Full report for the YouTube search: <a href="${avg.url}" id="open-query-btn">${avg.queryEnc}</a></div>`;
    var $table = $('<table class="table">');
    var $tbody = $('<tbody />');
    $table.append('<thead><tr><th>No</th><th>Title</th><th>Channel</th><th>Views</th><th>Age</th><th>Keyword in Title</th><th>Keyword in Desc</th><th>Added in last 7 days</th><th>Added in last 6 weeks</th><th>Ranking Difficulty</th><th>Total Subscribers</th><th>Engagement Score</th><th>Views Per Day</th><th>SEO Score</th></tr></thead>');
    var index = 0;
    for (var i = 0, len = order.length; i < len; i++) {
      var href = order[i];
      var item = videoCache.cache[href];
      if (!item.ignore) index++;
      let data = $.extend({}, item, {href: href, index: index});
      let html = renderTableRow(data);
      $tbody.append(html);
    }
    $table.append($tbody);
    $('#result').append(html).append($table);
  };


  var renderTableRow = function(item) {
    // console.log(item);
    var className = '';
    if (item.ignore) {
      className = 'tr-na';
      item = {
        index: '-',
        title: item.title,
        ownerChannelName: item.ownerChannelName,
        ageStr: 'n/a',
        viewCount: 'n/a',
        titleHasQuery: 'n/a',
        addedIn7Days: 'n/a',
        addedIn6Weeks: 'n/a'
      };
    }
    item.viewCountFmt = formatNumber(item.viewCount);
    var difficultyTotal = '';
    var difficultyHint = '';
    if (item.difficulty) {
      difficultyTotal = item.difficulty.total;
      difficultyHint = encodeURIComponent(item.difficulty.hint);
    }
    var advanced = item.advanced || {};
    var seoScoreHint = advanced.hint ? encodeURIComponent(advanced.hint) : '';
    var html = [
      `<td>${item.index}</td>`,
      `<td><a href="${item.href}" target="_blank">${item.title}</a></td>`,
      `<td>${item.ownerChannelName} ${item.verified ? verifiedIconSVG : ''}</td>`,
      `<td class="right">${item.viewCountFmt}</td>`,
      `<td class="right">${item.ageStr || '-'}</td>`,
      `<td class="centered">${checkMarkHTML(item.titleHasQuery)}</td>`,
      `<td class="centered">${checkMarkHTML((item.advanced || {}).descriptionHasQuery)}</td>`,
      `<td class="centered">${checkMarkHTML(item.addedIn7Days)}</td>`,
      `<td class="centered">${checkMarkHTML(item.addedIn6Weeks)}</td>`,
      `<td class="right" data-popover="${difficultyHint}">${difficultyTotal}</td>`,
      `<td class="">${advanced.subscribersText || ''}</td>`,
      `<td class="">${advanced.engagementScore || ''}</td>`,
      `<td class="">${advanced.viewsPerDay || ''}</td>`,
      `<td class="" data-popover="${seoScoreHint}">${advanced.seoScore || ''}</td>`,
    ].join('\n');
    return `<tr class="${className}">${html}</tr>`;
  };


  var getURLParameter = function(sParam, useHash) {
    var qs = window.location.search.substring(1);
    if (useHash) qs = window.location.hash.substring(1);
    qs = qs.split('+').join(' ');
    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;
    while (tokens = re.exec(qs)) {
      params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }
    return params[sParam];
  };


  var formatNumber = function(n){
    var res = n;
    if (n >= 1000000000) res = parseFloat((n/1000000000).toFixed(2)) + 'G';
    else if (n >= 1000000) res = parseFloat((n/1000000).toFixed(2)) + 'M';
    else if (n > 1000) res = parseFloat((n/1000).toFixed(2)) + 'K';
    return res;
  };


  var checkMarkHTML = function(cond){
    if (cond === true) return '&#10004;';
    else return '';
  };


  var verifiedIconSVG = '<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" class="style-scope yt-icon" style="pointer-events: none; width: 12px; height: 12px; opacity: 0.35; vertical-align:middle;"><g class="style-scope yt-icon"><path fill-rule="evenodd" clip-rule="evenodd" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10 S17.52,2,12,2z M9.92,17.93l-4.95-4.95l2.05-2.05l2.9,2.9l7.35-7.35l2.05,2.05L9.92,17.93z" class="style-scope yt-icon"></path></g></svg>';


  return {
    init: init
  };

})().init();
