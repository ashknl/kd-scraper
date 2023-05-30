(function(){

  var settings = {};
  var status;


  var init = function(){
    initUI();
    // bug in FF49: no reply on first tab load
    var timer = setTimeout(function(){
      document.location.reload();
    }, 500);
    chrome.storage.local.get(null, function( data ){
      clearTimeout(timer);
      if (data.settings) settings = data.settings;
      processSettings();
      populateCountries();
      populateCurrencies();

      calculateScrollingPositions();
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


  var initUI = function(){
    checkMaintenance();

    status = new Helpers.Status( $('#status'), {
      show: {method: 'slideDown', params: []},
      hide: {method: 'slideUp', params: []}
    } );

    $('input, select').change(function(e){
      // custom handler for sources list
      if (this.dataset.source) return;
      if (this.dataset.metric) return;
      if (this.dataset.selector) return;
      var id = this.id;
      if (!id) return;
      if (this.type === 'checkbox') settings[id] = this.checked;
      else if (this.type === 'number') {
        settings[id] = parseFloat(this.value) || '';
      }
      else if (this.type === 'radio') {
        var key = this.name.replace('input-', '');
        settings[key] = this.value;
      }
      else settings[id] = $.trim(this.value);
      saveSettings();
    });

    $('.section-toggle').change(function(e){
      var selector = this.dataset.selector;
      var $inputs = $(selector + ' input[type=checkbox]');
      $inputs.prop('checked', this.checked).trigger('change');
    });

    $('#apiKey').keyup(function(e){
      if (e.keyCode === 13) {
        $(this).trigger('change');
        $('#validate').trigger('click');
      }
    });

    $('#validate').click(function(e){
      if (!settings.apiKey) {
        status.error('API key is empty', 3000);
        return;
      }
      chrome.runtime.sendMessage({
        cmd: 'api.checkApiKey',
        data: {key: settings.apiKey}
      }, function(json){
        if (json.error) status.error(json.data, 5000);
        else {
          if (json.data) {
            status.success('The API key is valid.', 3000);
            $('.error-msg').addClass('hidden');
          }
          else if (json.data === false) {
            status.error('The API Key is not valid. If you have generated it within the last 10 minutes, please wait till 10 minutes are up and check again. If not, then please email me at help@keywordseverywhere.com');
          }
          else {
            status.error('Please refresh the page or check your internet connection. If you continue having issues please email help@keywordseverywhere.com');
          }
        }
      });
    });

    $('.help').keTooltip();

    /**
     * Enable smooth transition animation when scrolling
     **/
    $('a.scrollto').on('click', function (event) {
      event.preventDefault();
      var scrollAnimationTime = 800;

      $('main').stop().animate({
        // the scrolling position is calculated, since the scrolling element is not the body
        // can't be taken directly from the position the element has in the DOM because the DOM is dynamically updated after the settings have been loaded
        scrollTop: $(this).data('scrolling-position') - 115
      }, scrollAnimationTime, 'easeInOutExpo');
    });
  };

  /**
   * Calculate the scrolling position of all sections, should be done after the settings have been loaded
   * because the DOM is updated with multiple supported websites and other elements.
   **/
  var calculateScrollingPositions = function() {
    $('.scrollto').each(function(i, el) {
      var target = el.hash;
      $(el).data('scrolling-position', $(target).offset().top);
    });
  }

  var processSettings = function(){
    if (!settings.apiKey) {
      $('.error-msg').removeClass('hidden').html('You only need to enter an API key if you want access to our <a href=" https://keywordseverywhere.com/start.html" target="_blank">paid features</a>');
    }
    processHighlightSettings();
    if (settings.apiKey) $('#apiKey').val(settings.apiKey);
    $('[name=input-dataSource][value=' + settings.dataSource + ']').prop('checked', true);
    $('#showAddAllButton').prop('checked', !!settings.showAddAllButton);
    $('#showExportButton').prop('checked', !!settings.showExportButton);
    $('#showChatGPTactions').prop('checked', !!settings.showChatGPTactions);
    $('#showMetricsForSuggestions').prop('checked', !!settings.showMetricsForSuggestions);
    $('#showChartsForGoogleTrends').prop('checked', !!settings.showChartsForGoogleTrends);
    $('#showAutocompleteButton').prop('checked', !!settings.showAutocompleteButton);
    $('#showDifficultyMetrics').prop('checked', !!settings.showDifficultyMetrics);
    $('#showGoogleTraffic').prop('checked', !!settings.showGoogleTraffic);
    $('#showGoogleMetrics').prop('checked', !!settings.showGoogleMetrics);
    $('#showGoogleTrendChart').prop('checked', !!settings.showGoogleTrendChart);
    $('#showYoutubeAdvancedMetrics').prop('checked', !!settings.showYoutubeAdvancedMetrics);
    $('#defaultPopupAction').val(settings.defaultPopupAction);
    $('#googlePos').val(settings.googlePos);

    $('#sourceList').append(getSourceListTable('site'));
    $('#widgetsList').append(getSourceListTable('widget'));
    for (var key in settings.metricsList) {
      var checked = settings.metricsList[key];
      $('input[data-metric="' + key + '"').prop('checked', checked);
    }
    initSourceListClickHandlers();
    initMeticsListClickHandlers();

    $('.section-toggle').map(function(i, node){
      var selector = node.dataset.selector;
      var off = true;
      $(selector + ' input[type=checkbox]').map(function(j, input){
        if (input.checked) off = false;
      });
      node.checked = !off;
    });
  };

  var getSourceListTable = function(type) {
    const items = [];

    for (var key in SourceList) {
      var item = SourceList[key];
      if (item.type !== type) continue;

      var name = item.name;
      var html = $('<div />', {
        class: "group-row",
        html: getSourceInputHTML(key, name)
      });

      items.push(html);
    }

    return items;
  };


  var processHighlightSettings = function(){
    'highlightVolume highlightCPC highlightComp'.split(' ').map(function(key){
      var isChecked = !!settings[key];

      ['', 'Sec'].map(function(suffix){
        var condId = key + 'Cond' + suffix;
        var valId = key + 'Value' + suffix;
        $('#' + key).prop('checked', isChecked);
        if (typeof settings[condId] !== 'undefined') {
          $('#' + condId).val( settings[condId] );
        }
        if (typeof settings[valId] !== 'undefined' && settings[valId] !== '') {
          $('#' + valId).val( settings[valId] );
        }
      });

      /**
       * Open the highlighting conditions for the particular setting
       **/
      if (isChecked) {
        $('#' + key).parent('.group-row').next().addClass('open');
      }

      /**
       * Enable collapse on toggle change
       **/
      $('#' + key).on('change', function(e) {
        var target = e.target;
        var row = $(target).parent('.group-row').next();

        if (target.checked) {
          row.addClass('open');
        } else {
          row.removeClass('open');
        }
      });
    });
    if (settings.highlightColor) $('#highlightColor').val(settings.highlightColor);
  };


  var getSourceInputHTML = function( key, name ) {
    var $input = $('<input/>', {
      type: "checkbox",
      class: "toggler",
      id: key
    });

    $input.attr('data-source', key);

    if (settings.sourceList && settings.sourceList[key]) {
      $input.attr('checked', true);
    }

    var html = ['<label for="' + key + '" class="label">' + name + '</label>', $input];
    return html;
  };


  var initSourceListClickHandlers = function(){
    $('#sourceList input[type=checkbox], #widgetsList input[type=checkbox]').change(function(e){
      var checked = this.checked;
      var src = this.dataset.source;
      settings.sourceList[src] = checked;
      saveSettings();
    });
  };


  var initMeticsListClickHandlers = function(){
    $('#metricsList input[type=checkbox]').change(function(e){
      var checked = this.checked;
      var metric = this.dataset.metric;
      settings.metricsList[metric] = checked;
      saveSettings();
    });
  };


  var populateCountries = function(){
    chrome.runtime.sendMessage({cmd: 'api.getCountries'}, function(json){
      if (!json || !Object.keys(json).length) {
        status.error('An error has occured');
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


  var populateCurrencies = function(){
    chrome.runtime.sendMessage({cmd: 'api.getCurrencies'}, function(json){
      if (!json || !Object.keys(json).length) {
        status.error('An error has occured');
        return;
      }
      for (var key in json) {
        var $option = $('<option/>')
          .attr('value', key)
          .text(json[key]);
        if (settings.currency === key) $option.attr('selected', 'true');
        $option.appendTo($('#currency'));
      }
    });
  };


  var saveSettings = function(){
    chrome.storage.local.set({settings: settings});
    chrome.runtime.sendMessage({cmd: 'settings.update'});
  };


  return {
    init: init
  };

})().init();
