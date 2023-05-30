(function(){

  var $popover;
  var popoverTimeout;


  var init = function(){
    initUI();
    initPopover();
    chrome.runtime.sendMessage({cmd: 'google.getDifficultyData'}, function(data){
      processData(data);
      document.title = '';
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


  var processData = function(data){
    let order = data.onpage.data;
    let dataByDomain = data.offpage.data;

    var $table = $('<table class="table diff-table"">');
    var $tbody = $('<tbody />');
    $table.append('<thead>' +
                    '<tr>' +
                      '<th>No</th>' +
                      '<th>URL</th>' +
                      '<th>Title</th>' +
                      '<th class="th-description">Description</th>' +
                      '<th>SERP Highlights</th>' +
                      '<th class="right first">Moz Domain Authority</th>' +
                      '<th class="right">Open Page Rank</th>' +
                      '<th class="right">Off-Page Difficulty</th>' +
                      '<th class="right">On-Page Difficulty</th>' +
                    '</tr>' +
                  '</thead>');

    var index = 0;
    for (let i = 0, len = order.length; i < len; i++) {
      let domain = order[i].domain;
      var item = dataByDomain[domain];
      index++;
      let data = $.extend({}, item, order[i], {index: index});
      let html = renderTableRow(data);
      $tbody.append(html);
    }

    $("#main-line").html(`Query: ${data.query}`);
    $table.append($tbody);
    $('#result').append($table);
  };


  var renderTableRow = function(item) {
    let onpageHint = `
      <div class="xt-widget-table xt-ke-bordered-table xt-ke-mb-0 xt-ke-border-0">
        <table>
          <tr><td class="xt-widget-table-td-keyword">On-Page Difficulty</td><td><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${Math.round(item.onpage.sum)}/100</span></td>
          <tr><td class="xt-widget-table-td-keyword">Exact Match Title</td><td><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${item.onpage.exactMatchesTitle}/15</span></td></tr>
          <tr><td class="xt-widget-table-td-keyword">Exact Match URL</td><td><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${item.onpage.exactMatchesURL}/5</span></td></tr>
          <tr><td class="xt-widget-table-td-keyword">Exact Match Description</td><td><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${item.onpage.exactMatchesDescr}/5</span></td></tr>
          <tr><td class="xt-widget-table-td-keyword">Broad Match Title</td><td><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${item.onpage.broadMatchesTitle}/25</span></td></tr>
          <tr><td class="xt-widget-table-td-keyword">Broad Match URL</td><td><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${item.onpage.broadMatchesURL}/10</span></td></tr>
          <tr><td class="xt-widget-table-td-keyword">Broad Match Description</td><td><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${item.onpage.broadMatchesDescr}/10</span></td></tr>
          <tr><td class="xt-widget-table-td-keyword">SERP Highlights</td><td><span class="xt-ke-badge xt-ke-badge-light xt-ke-px-10px">${item.onpage.boldPoints}/30</span></td></tr>
        </table>
      </div>`;

    let className = 'align-middle';
    let pageRank = item.page_rank ? item.page_rank.toFixed(2) : '-';
    let offpageSum = item.sum ? item.sum.toFixed(2) : '-';
    let serpHighlights = item.descriptionBold.join(' ');
    if (item.descriptionOptimized) serpHighlights = 'Special Description';
    let html = [
      `<th>${item.index}</th>`,
      `<td><a href="${item.url}" target="_blank" class="td-url">${item.url}</a></td>`,
      `<td>${Common.escapeHtml(item.title)}</td>`,
      `<td class="td-description">${Common.escapeHtml(item.description)}</td>`,
      `<td class="td-bolded">${serpHighlights}</td>`,
      `<td class="right first">${item.moz_domain_authority || '-'}/100</td>`,
      `<td class="right">${pageRank}/10</td>`,
      `<td class="right">${Math.round(offpageSum) || '-'}/100</td>`,
      `<td class="right" data-popover="${encodeURIComponent(onpageHint)}">${Math.round(item.onpage.sum)}/100</td>`,
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
