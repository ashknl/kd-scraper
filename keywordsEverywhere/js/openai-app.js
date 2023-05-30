(() => {

  const categorySelect = document.getElementById('select-category');
  const subCategorySelect = document.getElementById('select-subcategory');
  const templateSelect = document.getElementById('select-template');
  const languageSelect = document.getElementById('select-language');
  const countrySelect = document.getElementById('select-country');
  const voiceToneSelect = document.getElementById('select-tone-of-voice');
  const writingStyleSelect = document.getElementById('select-writing-style');

  const $sectionGlobal = $('#section-global');
  const $sectionInputs = $('#section-inputs');

  const promptTextarea = document.getElementById('promptTextarea');
  const executeTemplateButton = document.getElementById('executeTemplate');

  const globalVars = {};
  let selectedTemplateData;
  let settings;

  const ICON_HELP_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-help-circle"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';


  const init = () => {
    Prefix.init('xt-openai');
    initWindowMessaging();
    reset();
    post('widget.ready');
    post('get-settings');
    initTheme();
    initUI();
    getGlobalInputs();
    populateCategories();
  };


  const initTheme = function(){
    const dark = getURLParameter('darkmode');
    if (dark && dark === "true") $('html').attr('dark', true);
  };


  const initIframe = () => {
    const darkmode = $('html').attr('dark') === 'true';
    console.log(settings);
    const apiKey = settings.apiKey || '';
    const settingEnabled = settings.sourceList.instgr;
    const version = chrome.runtime.getManifest().version;
    const iframe = '<div class="xt-widget-iframe"><iframe class="xt-ke-instgrm-iframe" src="https://keywordseverywhere.com/ke/widget.php?apiKey=' + apiKey + '&source=chatgpt&enabled=' + settingEnabled + '&country=' + settings.country + '&darkmode=' + darkmode + '&version=' + version + '" scrolling="no"></div>';
    $('#section-footer').html(iframe);
    setTimeout(() => {
      WidgetHelpers.resize({heightOnly: true});
    }, 500);
  };

  const reset = () => {
    $('#section-description').text('Please browse through our categories and sub-categories above and select a prompt template that you\'d like to execute');
    $('#section-global > div[data-id]').addClass('hidden');
    $('#section-inputs').text('');
    $('#section-prompt').addClass('hidden');
    $('#section-execute').addClass('hidden');
    promptTextarea.value = '';
    WidgetHelpers.resize({heightOnly: true});
  };


  const initWindowMessaging = () => {
    window.addEventListener("message", function(event){
      const payload = event.data;
      if (typeof payload !== 'object') return;
      let cmd = payload.cmd;
      const data = payload.data;
      const prefix = Prefix.get('');
      if (cmd === 'xt.resize') {
        var height = data.height;
        var source = data.source;
        var selector = '#section-footer';
        if (!selector) return;
        if (height <= 0) return;
        $(selector + ' iframe').height(height + 10);
      }
      if (cmd.indexOf( prefix ) !== 0) {
        // console.log('Command without prefix. Aborting to avoid collision', cmd, data);
        return;
      }
      cmd = cmd.replace( prefix, '');
      // console.log(cmd, data);
      if (cmd === 'darkmode') {
        $('html').attr('dark', data);
        initIframe();
      }
      else if (cmd === 'settings') {
        settings = data;
        initIframe();
      }
    }, false);
  };


  const processTemplate = (data) => {
    data.global_variables.map(item => {
      const key = 'select-' + item.name.replace(/_/g, '-');
      $(`#section-global > div[data-id=${key}]`).removeClass('hidden');
    });
    // data.input_grid = '"input_1 input_1 input_1 input_1 input_1 input_1 input_2 input_2 input_3 input_3 input_3 input_3" "input_4 input_4 input_4 input_4 input_4 input_4 input_4 input_4 input_4 input_4 input_4 input_4"';
    renderInputs(data.input_variables, data.input_grid);
    $('#section-description').text('Description: ' + data.description);
    $('#section-prompt').removeClass('hidden');
    $('#section-execute').removeClass('hidden');
    WidgetHelpers.resize({heightOnly: true});
    prepareTemplateString();
  };


  const getGlobalInputs = async () => {
    try {
      const storage = await readStorage();
      const [languages, countries, voiceTones, writingStyles] = await Promise.all([
        API.openAIFetchLanguages(),
        API.openAIFetchCountries(),
        API.openAIFetchVoiceTones(),
        API.openAIFetchWritingStyles()
      ]);
      globalVars.voiceTones = voiceTones;
      globalVars.writingStyles = writingStyles;
      renderSelectOptions(languageSelect, languages, storage.language);
      renderSelectOptions(countrySelect, countries, storage.country);
      renderSelectOptions(voiceToneSelect, voiceTones, storage.tone_of_voice);
      renderSelectOptions(writingStyleSelect, writingStyles, storage.writing_style);
    } catch (err) {
      console.log(err);
    }
  };


  const readStorage = () => {
    return new Promise((resolve) => {
      chrome.storage.local.get('openai', (data) => {
        if (!data.openai) resolve({});
        else resolve(data.openai);
      });
    });
  };


  const setStorage = async (key, value) => {
    let data = await readStorage();
    data[key] = value;
    chrome.storage.local.set({openai: data});
  };


  const renderInputs = (inputs, grid) => {
    if (grid) {
      $sectionInputs.removeClass('row').addClass('grid');
      $sectionInputs[0].style.gridTemplateAreas = grid;
    }
    else {
      $sectionInputs.removeClass('grid').addClass('row');
    }
    inputs.map(input => {
      if (input.type === 'text') {
        const html = `
          <div class="flex-full-width" style='grid-area: ${input.name}'>
            <label>${input.label} <span class="help" title="${input.help_text}">${ICON_HELP_SVG}</span></label>
            <input type="text" placeholder="${input.label}" data-name="${input.name}" value="${input.default_text || ''}">
          </div>`;
        $sectionInputs.append(html);
      }
      else if (input.type === 'number') {
        const html = `
          <div class="flex-item" style='grid-area: ${input.name}'>
            <label>${input.label} <span class="help" title="${input.help_text}">${ICON_HELP_SVG}</span></label>
            <input type="number" data-name="${input.name}" value="${input.default_text || ''}">
          </div>`;
        $sectionInputs.append(html);
      }
      else if (input.type === 'dropdown') {
        let optionsHTML = '';
        let options = input.options.split(/\s*,\s*/).map(option => {
          optionsHTML += `<option value="${option}">${option}</option>`;
        });
        const html = `
          <div class="flex-item" style='grid-area: ${input.name}'>
          <label>${input.label} <span class="help" title="${input.help_text}">${ICON_HELP_SVG}</span></label>
          <select data-name="${input.name}">${optionsHTML}</select>
          `;
        $sectionInputs.append(html);
      }
      else if (input.type === 'textarea') {
        const html = `
          <div class="flex-full-width" style='grid-area: ${input.name}'>
            <label>${input.label} <span class="help" title="${input.help_text}">${ICON_HELP_SVG}</span></label>
            <textarea data-name="${input.name}" rows="4">${input.default_text || ''}</textarea>
          </div>`;
        $sectionInputs.append(html);
      }
    });
    $sectionInputs.find('.help').keTooltip();
  };


  const renderSelectOptions = (selectNode, list, selected) => {
    for (const key in list) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = list[key];
      if (selected && selected === key) option.selected = true;
      selectNode.appendChild(option);
    }
  };


  const prepareTemplateString = (params) => {
    if (!params) params = {};
    let subst = {};
    let hasEmptyFields = false;
    $sectionInputs.find('input').map((index, input) => {
      const val = input.value.trim().replace(/"/g, '');
      const name = input.dataset.name;
      subst[name] = val;
      if (val === '') hasEmptyFields = true;
    });
    $sectionInputs.find('textarea').map((index, input) => {
      const val = input.value.trim().replace(/"/g, '');
      const name = input.dataset.name;
      subst[name] = val;
      if (val === '') hasEmptyFields = true;
    });
    $sectionInputs.find('select').map((index, input) => {
      const val = input.value.trim().replace(/"/g, '');
      const name = input.dataset.name;
      subst[name] = val;
      console.log(name, val);
      if (val === '') hasEmptyFields = true;
    });
    $sectionGlobal.find('select').map((index, select) => {
      let val = select.value;
      const name = select.dataset.name;
      if (name === 'tone_of_voice') {
        if (val === 'default') val = '';
        else val = `You have a ${globalVars.voiceTones[val]} tone of voice.`;
      }
      if (name === 'writing_style') {
        if (val === 'default') val = '';
        else val = `You have a ${globalVars.writingStyles[val]} writing style.`;
      }
      subst[name] = val;
    });
    if (!selectedTemplateData) return;
    let prompt = selectedTemplateData.prompt;
    for (const key in subst) {
      const re = new RegExp(`{${key}}`, 'g');
      prompt = prompt.replace(re, subst[key]);
    }
    if (!params.leavePrompt) promptTextarea.value = prompt;
    return {
      hasEmptyFields,
      prompt
    };
  };


  const initUI = () => {
    $('.btn-close').click(function(e){
      post('widget.close');
    });

    $sectionGlobal.on('change', 'select', function(e){
      prepareTemplateString();
      this.removeAttribute('pristine');
      const name = this.dataset.name;
      setStorage(name, this.value);
    });

    $sectionInputs.on('keyup', 'input, textarea', function(e){
      prepareTemplateString();
      this.removeAttribute('pristine');
    });

    $sectionInputs.on('change', 'input, select', function(e){
      prepareTemplateString();
      this.removeAttribute('pristine');
    });

    categorySelect.addEventListener('change', () => {
      reset();
      subCategorySelect.innerHTML = '<option value="">Select a sub-category</option>';
      templateSelect.innerHTML = '<option value="">Select a template</option>';
      subCategorySelect.disabled = true;
      templateSelect.disabled = true;
      executeTemplateButton.disabled = true;

      const selectedCategory = categorySelect.value;
      if (selectedCategory !== 'Choose a category') {
        API.openAIFetchCategories().then(categories => {
          const subcategories = categories[selectedCategory].subcategories;
          for (const subcategory in subcategories) {
            const option = document.createElement('option');
            option.value = subcategory;
            option.textContent = subcategories[subcategory];
            subCategorySelect.appendChild(option);
          }
          subCategorySelect.disabled = false;
        });
      }
    });

    subCategorySelect.addEventListener('change', () => {
      reset();
      templateSelect.innerHTML = '<option value="">Select a template</option>';
      templateSelect.disabled = true;
      executeTemplateButton.disabled = true;

      const selectedSubCategory = subCategorySelect.value;
      if (selectedSubCategory) {
        API.openAIFetchTemplates(selectedSubCategory).then(templates => {
          for (const template in templates) {
            const option = document.createElement('option');
            option.value = template;
            option.textContent = templates[template].name;
            templateSelect.appendChild(option);
          }
          templateSelect.disabled = false;
        });
      }
    });

    templateSelect.addEventListener('change', () => {
      executeTemplateButton.disabled = !templateSelect.value;
      chooseTemplate();
    });

    executeTemplateButton.addEventListener('click', () => {
      const res = prepareTemplateString({leavePrompt: true});
      if (res.hasEmptyFields) {
        alert('Please fill out all required fields.');
        return;
      }
      const prompt = promptTextarea.value;
      post('choose-template', {prompt: prompt});
      post('widget.close');
    });
  };


  async function chooseTemplate() {
    reset();
    const selectedTemplate = templateSelect.value;
    if (selectedTemplate) {
      const response = await API.openAIFetchTemplate(selectedTemplate);
      selectedTemplateData = response;
      processTemplate(response);
    } else {
      promptTextarea.value = '';
      selectedTemplateData = null;
    }
  }


  function populateCategories() {
    API.openAIFetchCategories().then(categories => {
      for (const category in categories) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = categories[category].name;
        categorySelect.appendChild(option);
      }
      categorySelect.dispatchEvent(new Event('change'));
    });
  }


  const getURLParameter = (sParam, useHash) => {
    let qs = window.location.search.substring(1);
    if (useHash) qs = window.location.hash.substring(1);
    qs = qs.split('+').join(' ');
    let params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;
    while (tokens = re.exec(qs)) {
      params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }
    return params[sParam];
  };


  const post = (cmd, data) => {
    window.parent.postMessage({cmd: `xt-openai-${cmd}`, data: data}, '*');
  };


  return {
    init: init
  };

})().init();
