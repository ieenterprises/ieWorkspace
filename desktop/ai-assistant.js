/* ieWorkspace AI — File -> AI Settings (multi-provider + multi-model + OpenRouter OAuth PKCE)
   and clean floating Chat Drawer across Word, Excel, Presentation, and PDF (Web, Android, Desktop). */
(function () {
  'use strict';

  var STORAGE_KEY = 'ieworkspace-ai-config-v1';
  var ELIXIR_KEY = 'elixir-ai-settings';
  var PKCE_VERIFIER_KEY = 'ieworkspace-or-pkce-verifier';

  var PROVIDERS = [
    {
      id: 'openrouter',
      name: 'OpenRouter (Sign in with OpenRouter — OpenAI, Gemini, Claude, DeepSeek…)',
      baseUrl: 'https://openrouter.ai/api/v1',
      keyPlaceholder: 'sk-or-v1-… (or click Sign in with OpenRouter)',
      oauth: 'openrouter',
      models: [
        'openai/gpt-4.1',
        'openai/gpt-4.1-mini',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'google/gemini-2.5-pro',
        'google/gemini-2.5-flash',
        'anthropic/claude-sonnet-4',
        'deepseek/deepseek-chat-v3-0324',
        'deepseek/deepseek-r1',
        'meta-llama/llama-4-maverick'
      ]
    },
    {
      id: 'openai',
      name: 'OpenAI (ChatGPT API)',
      baseUrl: 'https://api.openai.com/v1',
      keyPlaceholder: 'sk-…',
      models: [
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4.1-nano',
        'gpt-4o',
        'gpt-4o-mini',
        'o4-mini',
        'o3-mini'
      ]
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      keyPlaceholder: 'AIza…',
      models: [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash'
      ]
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      keyPlaceholder: 'sk-…',
      models: [
        'deepseek-chat',
        'deepseek-reasoner'
      ]
    },
    {
      id: 'groq',
      name: 'Groq (Fast Inference)',
      baseUrl: 'https://api.groq.com/openai/v1',
      keyPlaceholder: 'gsk_…',
      models: [
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'deepseek-r1-distill-llama-70b',
        'qwen-qwq-32b'
      ]
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      baseUrl: 'https://api.mistral.ai/v1',
      keyPlaceholder: 'Mistral API key',
      models: [
        'mistral-large-latest',
        'mistral-medium-latest',
        'mistral-small-latest',
        'codestral-latest'
      ]
    },
    {
      id: 'xai',
      name: 'xAI (Grok)',
      baseUrl: 'https://api.x.ai/v1',
      keyPlaceholder: 'xai-…',
      models: [
        'grok-3',
        'grok-3-mini',
        'grok-2-latest'
      ]
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude (via OpenAI-compatible proxy)',
      baseUrl: 'https://api.anthropic.com/v1',
      keyPlaceholder: 'sk-ant-…',
      models: [
        'claude-sonnet-4-20250514',
        'claude-3-7-sonnet-20250219',
        'claude-3-5-haiku-20241022'
      ]
    },
    {
      id: 'ollama',
      name: 'Ollama (Local / Offline)',
      baseUrl: 'http://localhost:11434/v1',
      keyPlaceholder: 'ollama (optional for local)',
      noKeyRequired: true,
      models: [
        'llama3.2',
        'qwen2.5',
        'mistral',
        'deepseek-r1',
        'gemma3'
      ]
    },
    {
      id: 'custom',
      name: 'Custom OpenAI-compatible service',
      baseUrl: 'https://api.openai.com/v1',
      keyPlaceholder: 'API key',
      models: ['gpt-4.1-mini']
    }
  ];

  function getProvider(id) {
    for (var i = 0; i < PROVIDERS.length; i++) {
      if (PROVIDERS[i].id === id) return PROVIDERS[i];
    }
    return PROVIDERS[1]; // OpenAI fallback
  }

  function loadConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4.1-mini',
      apiKey: ''
    };
  }

  function saveConfig(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      // Keep native ElixirAI settings in sync for Word/Excel/Presentation built-in tools
      if (cfg && (cfg.apiKey || cfg.provider === 'ollama')) {
        localStorage.setItem(ELIXIR_KEY, JSON.stringify({
          endpoint: cfg.baseUrl,
          model: cfg.model,
          apiKey: cfg.apiKey || 'ollama',
          provider: 'openai'
        }));
      } else {
        localStorage.removeItem(ELIXIR_KEY);
      }
    } catch (e) {}
  }

  function clearConfig() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ELIXIR_KEY);
    } catch (e) {}
  }

  /* ---- OpenRouter PKCE OAuth (browser-native, no client secret exposed) ---- */
  function base64Url(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function startOpenRouterOAuth() {
    var rand = new Uint8Array(32);
    crypto.getRandomValues(rand);
    var verifier = base64Url(rand);
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    var hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    var challenge = base64Url(new Uint8Array(hash));
    var callback = window.location.href.split('#')[0];
    var authUrl = 'https://openrouter.ai/auth?callback_url=' + encodeURIComponent(callback) +
      '&code_challenge=' + encodeURIComponent(challenge) + '&code_challenge_method=S256';
    window.location.href = authUrl;
  }

  async function handleOpenRouterCallback() {
    try {
      var params = new URLSearchParams(window.location.search);
      var code = params.get('code');
      var verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
      if (!code || !verifier) return;
      sessionStorage.removeItem(PKCE_VERIFIER_KEY);
      var res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          code_verifier: verifier,
          code_challenge_method: 'S256'
        })
      });
      var data = await res.json();
      if (res.ok && data && data.key) {
        var cur = loadConfig();
        saveConfig({
          provider: 'openrouter',
          baseUrl: 'https://openrouter.ai/api/v1',
          model: cur.provider === 'openrouter' && cur.model ? cur.model : 'openai/gpt-4.1-mini',
          apiKey: data.key
        });
      }
      params.delete('code');
      var clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
      window.history.replaceState({}, '', clean);
    } catch (e) {}
  }

  /* ---- Editor Detection & Prompts ---- */
  function detectEditorType() {
    var href = (window.location.href || '').toLowerCase();
    var title = (document.title || '').toLowerCase();
    var icon = document.querySelector('link[rel="icon"]');
    var iconHref = icon ? (icon.getAttribute('href') || '').toLowerCase() : '';
    var combined = href + ' ' + title + ' ' + iconHref;
    if (/(\.xlsx|\.xls|\.ods|\.csv|cell\.ico|spreadsheet|workbook)/.test(combined)) return 'cell';
    if (/(\.pptx|\.ppt|\.odp|slide\.ico|presentation)/.test(combined)) return 'slide';
    if (/(\.pdf|pdf\.ico)/.test(combined)) return 'pdf';
    if (/(\.docx|\.doc|\.odt|\.rtf|word\.ico|document)/.test(combined)) return 'word';
    return 'general';
  }

  var PROMPTS = {
    word: {
      badge: 'Word AI',
      system: 'You are ieWorkspace AI, an expert Word document assistant. Provide clear, well-structured text ready to paste into a Word document.',
      quick: [
        { label: 'Draft document', prompt: 'Draft a professional one-page document about: ' },
        { label: 'Rewrite & polish', prompt: 'Rewrite and polish the following text for clarity and tone:\n\n' },
        { label: 'Fix grammar', prompt: 'Fix spelling and grammar in the following text without changing its meaning:\n\n' },
        { label: 'Summarize', prompt: 'Summarize the following text into concise bullet points:\n\n' }
      ]
    },
    cell: {
      badge: 'Excel AI',
      system: 'You are ieWorkspace AI, an expert Excel spreadsheet assistant. Provide exact Excel formulas (starting with =), clean tables, and concise explanations.',
      quick: [
        { label: 'Write formula', prompt: 'Write an Excel formula to: ' },
        { label: 'Explain formula', prompt: 'Explain what this Excel formula does step by step:\n\n' },
        { label: 'Build table', prompt: 'Create a tab-separated spreadsheet table template for: ' },
        { label: 'Analyze data', prompt: 'Analyze these numbers and highlight key insights:\n\n' }
      ]
    },
    slide: {
      badge: 'Presentation AI',
      system: 'You are ieWorkspace AI, an expert PowerPoint presentation designer. Write punchy slide titles, concise bullet points (max 5 per slide), and helpful speaker notes.',
      quick: [
        { label: 'Slide outline', prompt: 'Create a 6-slide presentation outline (titles + 3-4 concise bullets per slide) about: ' },
        { label: 'Speaker notes', prompt: 'Write concise, natural speaker notes for this slide:\n\n' },
        { label: 'Shorten bullets', prompt: 'Shorten this text into crisp presentation bullet points:\n\n' },
        { label: 'Visual layout ideas', prompt: 'Suggest visual layout and chart ideas for a slide about: ' }
      ]
    },
    pdf: {
      badge: 'PDF AI',
      system: 'You are ieWorkspace AI, an expert PDF document assistant. Summarize PDF excerpts accurately, extract structured facts/dates/action items, and draft clean responses.',
      quick: [
        { label: 'Summarize PDF text', prompt: 'Summarize the following PDF text clearly:\n\n' },
        { label: 'Extract key details', prompt: 'Extract key dates, names, amounts, and action items from this PDF text:\n\n' },
        { label: 'Draft response', prompt: 'Draft a professional response based on this PDF content:\n\n' },
        { label: 'Simplify language', prompt: 'Explain this PDF section in plain, simple English:\n\n' }
      ]
    },
    general: {
      badge: 'ieWorkspace AI',
      system: 'You are ieWorkspace AI, a helpful assistant for documents, spreadsheets, presentations, and PDFs.',
      quick: [
        { label: 'Draft text', prompt: 'Draft a professional text about: ' },
        { label: 'Write Excel formula', prompt: 'Write an Excel formula to: ' },
        { label: 'Slide outline', prompt: 'Create a presentation outline about: ' },
        { label: 'Summarize', prompt: 'Summarize the following content:\n\n' }
      ]
    }
  };

  /* ---- Build File -> AI Settings UI inside the editor iframe backstage ---- */
  function buildBackstageSettingsPanel(doc) {
    var wrap = doc.createElement('div');
    wrap.id = 'ie-backstage-ai';
    wrap.style.cssText = 'max-width:660px;padding:28px 36px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;';

    wrap.innerHTML =
      '<h1 style="margin:0 0 8px;font-size:28px;font-weight:600;color:#1d1d1f;">AI</h1>' +
      '<p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.45;">ieWorkspace AI works across Word, Excel, Presentation, and PDF. It stays off until you connect a model or sign in with OpenRouter.</p>' +
      '<div style="display:flex;flex-direction:column;gap:14px;">' +
        '<div>' +
          '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;color:#222;">Provider</label>' +
          '<select id="ie-bs-provider" style="width:100%;height:38px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:13.5px;color:#111;"></select>' +
        '</div>' +
        '<div id="ie-bs-oauth-row" style="display:none;padding:10px 12px;border:1px solid #cfe4f5;border-radius:8px;background:#f2f8fd;align-items:center;justify-content:space-between;gap:12px;">' +
          '<div style="font-size:12.5px;color:#1f3b52;">Sign in with your OpenRouter account to use OpenAI/ChatGPT, Gemini, Claude, DeepSeek, and more without pasting a key manually.</div>' +
          '<button type="button" id="ie-bs-or-signin" style="flex-shrink:0;height:34px;padding:0 14px;border:none;border-radius:6px;background:#0082c9;color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Sign in with OpenRouter</button>' +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;color:#222;">Service URL (OpenAI-compatible)</label>' +
          '<input id="ie-bs-url" type="url" style="width:100%;box-sizing:border-box;height:38px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13.5px;color:#111;background:#fff;" />' +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;color:#222;">Model</label>' +
          '<select id="ie-bs-model" style="width:100%;height:38px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:13.5px;color:#111;"></select>' +
          '<input id="ie-bs-custom-model" type="text" placeholder="Enter custom model ID (e.g. gpt-4.1)" style="display:none;margin-top:8px;width:100%;box-sizing:border-box;height:38px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13.5px;color:#111;background:#fff;" />' +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;color:#222;">API key (stored locally in this browser)</label>' +
          '<input id="ie-bs-key" type="password" autocomplete="off" style="width:100%;box-sizing:border-box;height:38px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13.5px;color:#111;background:#fff;" />' +
        '</div>' +
        '<div id="ie-bs-status" style="padding:10px 12px;border-left:3px solid #0082c9;background:#f4f8fb;font-size:13px;color:#1d1d1f;"></div>' +
        '<p style="margin:0;font-size:12px;color:#666;">Stored locally in this browser (localStorage). Your key is sent only to the provider URL above, never logged or shared.</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;">' +
          '<button type="button" id="ie-bs-save" style="height:36px;padding:0 18px;border:none;border-radius:6px;background:#0082c9;color:#fff;font-weight:600;font-size:13.5px;cursor:pointer;">Save</button>' +
          '<button type="button" id="ie-bs-test" style="height:36px;padding:0 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#1d1d1f;font-weight:500;font-size:13.5px;cursor:pointer;">Test connection</button>' +
          '<button type="button" id="ie-bs-remove" style="height:36px;padding:0 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#1d1d1f;font-weight:500;font-size:13.5px;cursor:pointer;">Remove settings</button>' +
        '</div>' +
      '</div>';

    var provSel = wrap.querySelector('#ie-bs-provider');
    var oauthRow = wrap.querySelector('#ie-bs-oauth-row');
    var orBtn = wrap.querySelector('#ie-bs-or-signin');
    var urlIn = wrap.querySelector('#ie-bs-url');
    var modelSel = wrap.querySelector('#ie-bs-model');
    var customModelIn = wrap.querySelector('#ie-bs-custom-model');
    var keyIn = wrap.querySelector('#ie-bs-key');
    var statusEl = wrap.querySelector('#ie-bs-status');

    PROVIDERS.forEach(function (p) {
      var opt = doc.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      provSel.appendChild(opt);
    });

    function populateModels(providerId, selectedModel) {
      var p = getProvider(providerId);
      modelSel.innerHTML = '';
      var found = false;
      p.models.forEach(function (m) {
        var opt = doc.createElement('option');
        opt.value = m;
        opt.textContent = m;
        if (m === selectedModel) { opt.selected = true; found = true; }
        modelSel.appendChild(opt);
      });
      var customOpt = doc.createElement('option');
      customOpt.value = '__custom__';
      customOpt.textContent = 'Custom model ID…';
      modelSel.appendChild(customOpt);

      if (selectedModel && !found) {
        modelSel.value = '__custom__';
        customModelIn.style.display = 'block';
        customModelIn.value = selectedModel;
      } else {
        customModelIn.style.display = 'none';
        customModelIn.value = '';
      }
      keyIn.placeholder = p.keyPlaceholder || 'API key';
      oauthRow.style.display = p.oauth === 'openrouter' ? 'flex' : 'none';
    }

    function refreshFromStorage() {
      var cfg = loadConfig();
      var p = getProvider(cfg.provider || 'openai');
      provSel.value = p.id;
      urlIn.value = cfg.baseUrl || p.baseUrl;
      populateModels(p.id, cfg.model || p.models[0]);
      keyIn.value = cfg.apiKey || '';
      if (cfg.apiKey || p.noKeyRequired) {
        statusEl.textContent = 'AI is active: ' + p.name.split(' (')[0] + ' · ' + (cfg.model || p.models[0]);
      } else {
        statusEl.textContent = 'AI is off. No text leaves your computer until you save a provider key or sign in.';
      }
    }

    provSel.addEventListener('change', function () {
      var p = getProvider(provSel.value);
      urlIn.value = p.baseUrl;
      populateModels(p.id, p.models[0]);
    });

    modelSel.addEventListener('change', function () {
      customModelIn.style.display = modelSel.value === '__custom__' ? 'block' : 'none';
      if (modelSel.value === '__custom__') customModelIn.focus();
    });

    orBtn.addEventListener('click', function () {
      startOpenRouterOAuth();
    });

    function readForm() {
      var p = getProvider(provSel.value);
      var model = modelSel.value === '__custom__' ? customModelIn.value.trim() : modelSel.value;
      return {
        provider: p.id,
        baseUrl: (urlIn.value || p.baseUrl).trim().replace(/\/+$/, ''),
        model: model || p.models[0],
        apiKey: (keyIn.value || '').trim()
      };
    }

    wrap.querySelector('#ie-bs-save').addEventListener('click', function () {
      var cfg = readForm();
      saveConfig(cfg);
      refreshFromStorage();
      statusEl.textContent = 'Saved! ieWorkspace AI is ready (' + cfg.model + ').';
    });

    wrap.querySelector('#ie-bs-remove').addEventListener('click', function () {
      clearConfig();
      refreshFromStorage();
      statusEl.textContent = 'Settings removed. AI is off.';
    });

    wrap.querySelector('#ie-bs-test').addEventListener('click', async function () {
      var cfg = readForm();
      var p = getProvider(cfg.provider);
      if (!cfg.apiKey && !p.noKeyRequired) {
        statusEl.textContent = 'Enter an API key first (or sign in with OpenRouter).';
        return;
      }
      statusEl.textContent = 'Testing connection to ' + cfg.baseUrl + '…';
      try {
        var headers = { 'Content-Type': 'application/json' };
        if (cfg.apiKey) headers['Authorization'] = 'Bearer ' + cfg.apiKey;
        var res = await fetch(cfg.baseUrl + '/chat/completions', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            model: cfg.model,
            max_tokens: 12,
            messages: [{ role: 'user', content: 'Reply with OK' }]
          })
        });
        var data = await res.json();
        if (!res.ok) throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
        statusEl.textContent = 'Connection succeeded! Model "' + cfg.model + '" responded.';
      } catch (err) {
        statusEl.textContent = 'Connection failed: ' + (err && err.message ? err.message : String(err));
      }
    });

    refreshFromStorage();
    wrap._refresh = refreshFromStorage;
    return wrap;
  }

  /* ---- Hook File -> AI inside the editor iframe (Word, Excel, Presentation, PDF) ---- */
  function attachToBackstage(frameWin) {
    if (!frameWin || !frameWin.document) return false;
    var doc = frameWin.document;
    var rail = doc.querySelector('.panel-menu');
    var ctx = doc.querySelector('.panel-context');
    if (!rail || !ctx) return false;
    if (rail.getAttribute('data-ie-ai-hooked') === '1') return true;
    rail.setAttribute('data-ie-ai-hooked', '1');

    // Ensure #fm-btn-elx-ai exists and is visible in ALL 4 editors (Word, Excel, Presentation, PDF)
    var aiBtn = doc.getElementById('fm-btn-elx-ai');
    if (!aiBtn) {
      aiBtn = doc.createElement('li');
      aiBtn.id = 'fm-btn-elx-ai';
      aiBtn.className = 'fm-btn';
      aiBtn.setAttribute('role', 'menuitem');
      aiBtn.setAttribute('tabindex', '0');
      aiBtn.innerHTML = '<a href="#" style="display:flex;align-items:center;gap:10px;padding:8px 14px;text-decoration:none;color:inherit;"><span style="font-size:15px;">&#10024;</span><span>AI</span></a>';
      var optBtn = doc.getElementById('fm-btn-settings');
      if (optBtn && optBtn.parentNode === rail) {
        rail.insertBefore(aiBtn, optBtn);
      } else {
        rail.appendChild(aiBtn);
      }
    } else {
      aiBtn.style.display = '';
      aiBtn.hidden = false;
    }

    // Create or upgrade our dedicated File -> AI settings container
    var aiPanel = doc.getElementById('panel-ie-ai');
    if (!aiPanel) {
      aiPanel = doc.createElement('div');
      aiPanel.id = 'panel-ie-ai';
      aiPanel.className = 'content-box elx-page';
      aiPanel.style.cssText = 'display:none;overflow-y:auto;height:100%;background:#fff;';
      var settingsView = buildBackstageSettingsPanel(doc);
      aiPanel.appendChild(settingsView);
      ctx.appendChild(aiPanel);
    }

    function showAiPanel(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
      var boxes = ctx.querySelectorAll('.content-box');
      for (var i = 0; i < boxes.length; i++) boxes[i].style.display = 'none';
      aiPanel.style.display = 'block';
      var items = rail.querySelectorAll('.fm-btn');
      for (var j = 0; j < items.length; j++) items[j].classList.remove('active');
      aiBtn.classList.add('active');
      var view = aiPanel.querySelector('#ie-backstage-ai');
      if (view && view._refresh) view._refresh();
    }

    aiBtn.addEventListener('click', showAiPanel, true);

    // Hide our panel when any other File menu button is clicked
    rail.addEventListener('click', function (e) {
      var li = e.target && e.target.closest ? e.target.closest('.fm-btn') : null;
      if (li && li.id !== 'fm-btn-elx-ai') {
        aiPanel.style.display = 'none';
        aiBtn.classList.remove('active');
      }
    }, true);

    // Keep #fm-btn-elx-ai visible if the editor's own mode logic tries to hide it
    var mo = new MutationObserver(function () {
      if (aiBtn.style.display === 'none' || aiBtn.hidden) {
        aiBtn.style.display = '';
        aiBtn.hidden = false;
      }
    });
    mo.observe(aiBtn, { attributes: true, attributeFilter: ['style', 'hidden', 'class'] });

    window._ieOpenFileAI = function () {
      try {
        var fileTab = doc.querySelector('#file-menu-btn, [data-tab="file"], .ribtab-file, a[href="#file"]');
        if (fileTab) fileTab.click();
        setTimeout(function () { showAiPanel(); }, 80);
      } catch (e) {}
    };

    return true;
  }

  function startBackstageWatcher() {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      var frames = document.querySelectorAll('iframe');
      for (var i = 0; i < frames.length; i++) {
        try {
          if (attachToBackstage(frames[i].contentWindow)) {
            clearInterval(timer);
            return;
          }
        } catch (e) {}
      }
      if (attempts > 60) clearInterval(timer);
    }, 500);
  }

  /* ---- Clean Floating Chat Drawer (NO inline settings form!) ---- */
  function injectStyles() {
    if (document.getElementById('ie-ai-style')) return;
    var s = document.createElement('style');
    s.id = 'ie-ai-style';
    s.textContent =
      '#ie-ai-fab{position:fixed;right:18px;bottom:34px;z-index:2147483600;display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 14px;border:none;border-radius:999px;background:#0082c9;color:#fff;font:600 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 6px 20px rgba(0,130,201,.36);cursor:pointer;transition:transform .15s,background .15s;}' +
      '#ie-ai-fab:hover{background:#006da8;transform:translateY(-1px);}' +
      '#ie-ai-drawer{position:fixed;top:0;right:0;bottom:0;width:370px;max-width:94vw;z-index:2147483601;background:#ffffff;color:#1d1d1f;box-shadow:-8px 0 30px rgba(0,0,0,.18);display:none;flex-direction:column;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}' +
      '#ie-ai-drawer.open{display:flex;}' +
      '.ie-ai-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#f8fafc;}' +
      '.ie-ai-title{display:flex;align-items:center;gap:8px;font:700 14px/1.2 system-ui,sans-serif;}' +
      '.ie-ai-pill{font:600 11px/1 system-ui,sans-serif;padding:4px 8px;border-radius:999px;background:#e6f3fb;color:#0072b1;}' +
      '.ie-ai-iconbtn{width:28px;height:28px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#374151;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:15px;}' +
      '.ie-ai-iconbtn:hover{background:#f3f4f6;}' +
      '.ie-ai-quick{display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px;border-bottom:1px solid #eef0f3;}' +
      '.ie-ai-chip{padding:5px 10px;border:1px solid #d0e4f2;border-radius:999px;background:#f4f9fd;color:#006da8;font:500 12px/1.2 system-ui,sans-serif;cursor:pointer;}' +
      '.ie-ai-chip:hover{background:#e2f1fb;}' +
      '.ie-ai-msgs{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:1.45;}' +
      '.ie-ai-msg{padding:9px 11px;border-radius:10px;white-space:pre-wrap;word-break:break-word;}' +
      '.ie-ai-msg.user{background:#0082c9;color:#fff;align-self:flex-end;max-width:88%;}' +
      '.ie-ai-msg.bot{background:#f3f4f6;color:#111827;align-self:flex-start;max-width:94%;border:1px solid #e5e7eb;}' +
      '.ie-ai-copy{margin-top:6px;padding:3px 8px;border:1px solid #cbd5e1;border-radius:5px;background:#fff;color:#374151;font-size:11px;cursor:pointer;display:inline-block;}' +
      '.ie-ai-copy:hover{background:#eef6fb;color:#006da8;}' +
      '.ie-ai-foot{padding:10px 12px;border-top:1px solid #e5e7eb;display:flex;gap:8px;align-items:flex-end;background:#fff;}' +
      '#ie-ai-input{flex:1;min-height:40px;max-height:120px;resize:vertical;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:13px/1.35 system-ui,sans-serif;}' +
      '#ie-ai-send{height:38px;padding:0 14px;border:none;border-radius:8px;background:#0082c9;color:#fff;font:600 13px/1 system-ui,sans-serif;cursor:pointer;}' +
      '#ie-ai-send:disabled{opacity:.55;cursor:not-allowed;}';
    document.head.appendChild(s);
  }

  function mount() {
    var isEditor = /\/editor(\b|\?|#|$)/i.test(window.location.pathname) || !!document.getElementById('workspace');
    if (!isEditor || document.getElementById('ie-ai-fab')) return;

    handleOpenRouterCallback();
    injectStyles();
    startBackstageWatcher();

    var kind = detectEditorType();
    var preset = PROMPTS[kind] || PROMPTS.general;
    var history = [];
    var serverManaged = false;

    fetch('/elixir-ai/config.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data && data.enabled) serverManaged = true; })
      .catch(function () {});

    var fab = document.createElement('button');
    fab.id = 'ie-ai-fab';
    fab.type = 'button';
    fab.title = 'Open ieWorkspace AI Assistant';
    fab.innerHTML = '<span>&#10024;</span><span>ieWorkspace AI</span>';

    var drawer = document.createElement('aside');
    drawer.id = 'ie-ai-drawer';
    drawer.setAttribute('aria-label', 'ieWorkspace AI Assistant');
    drawer.innerHTML =
      '<div class="ie-ai-head">' +
        '<div class="ie-ai-title"><span>&#10024; ieWorkspace AI</span><span class="ie-ai-pill" id="ie-ai-badge"></span></div>' +
        '<button type="button" class="ie-ai-iconbtn" id="ie-ai-close" title="Close">&times;</button>' +
      '</div>' +
      '<div class="ie-ai-quick" id="ie-ai-quick"></div>' +
      '<div class="ie-ai-msgs" id="ie-ai-msgs"></div>' +
      '<div class="ie-ai-foot">' +
        '<textarea id="ie-ai-input" placeholder="Ask ieWorkspace AI anything…"></textarea>' +
        '<button type="button" id="ie-ai-send">Send</button>' +
      '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(drawer);

    drawer.querySelector('#ie-ai-badge').textContent = preset.badge;
    var quickBox = drawer.querySelector('#ie-ai-quick');
    var msgsBox = drawer.querySelector('#ie-ai-msgs');
    var inputEl = drawer.querySelector('#ie-ai-input');
    var sendBtn = drawer.querySelector('#ie-ai-send');

    preset.quick.forEach(function (q) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ie-ai-chip';
      chip.textContent = q.label;
      chip.addEventListener('click', function () {
        inputEl.value = q.prompt;
        inputEl.focus();
      });
      quickBox.appendChild(chip);
    });

    function addMsg(role, text, showOpenSettings) {
      var div = document.createElement('div');
      div.className = 'ie-ai-msg ' + (role === 'user' ? 'user' : 'bot');
      var body = document.createElement('div');
      body.textContent = text;
      div.appendChild(body);
      if (role !== 'user') {
        var cp = document.createElement('button');
        cp.type = 'button';
        cp.className = 'ie-ai-copy';
        cp.textContent = 'Copy';
        cp.addEventListener('click', function () {
          navigator.clipboard.writeText(body.textContent).then(function () {
            cp.textContent = 'Copied!';
            setTimeout(function () { cp.textContent = 'Copy'; }, 1500);
          }).catch(function () {});
        });
        div.appendChild(cp);
      }
      if (showOpenSettings) {
        var openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'ie-ai-copy';
        openBtn.style.marginLeft = '6px';
        openBtn.textContent = 'Open File → AI Settings';
        openBtn.addEventListener('click', function () {
          drawer.classList.remove('open');
          if (typeof window._ieOpenFileAI === 'function') window._ieOpenFileAI();
        });
        div.appendChild(openBtn);
      }
      msgsBox.appendChild(div);
      msgsBox.scrollTop = msgsBox.scrollHeight;
      return body;
    }

    addMsg('bot', 'Hi! I am ieWorkspace AI (' + preset.badge + '). Pick a quick action above or type a request. Configure your AI provider & model in File → AI.');

    fab.addEventListener('click', function () {
      drawer.classList.toggle('open');
      if (drawer.classList.contains('open')) inputEl.focus();
    });
    drawer.querySelector('#ie-ai-close').addEventListener('click', function () {
      drawer.classList.remove('open');
    });

    async function send() {
      var text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      addMsg('user', text);

      var cfg = loadConfig();
      var p = getProvider(cfg.provider || 'openai');
      var useManaged = serverManaged && !cfg.apiKey && !p.noKeyRequired;

      if (!useManaged && !cfg.apiKey && !p.noKeyRequired) {
        addMsg('bot', 'No AI provider is configured yet. Open File → AI to choose a provider (OpenAI, Gemini, DeepSeek, OpenRouter, Groq, Mistral, xAI, Ollama…) or sign in with OpenRouter.', true);
        return;
      }

      history.push({ role: 'user', content: text });
      var outBody = addMsg('bot', 'Thinking…');
      sendBtn.disabled = true;

      try {
        var endpoint = useManaged ? '/elixir-ai/v1/chat/completions' : (cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions');
        var headers = { 'Content-Type': 'application/json' };
        if (!useManaged && cfg.apiKey) headers['Authorization'] = 'Bearer ' + cfg.apiKey;

        var res = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            model: cfg.model || p.models[0],
            messages: [{ role: 'system', content: preset.system }].concat(history.slice(-10))
          })
        });
        var data = await res.json();
        if (!res.ok) {
          throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
        }
        var reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'No response received.';
        history.push({ role: 'assistant', content: reply });
        outBody.textContent = reply;
      } catch (err) {
        outBody.textContent = 'AI request failed: ' + (err && err.message ? err.message : String(err));
      } finally {
        sendBtn.disabled = false;
        msgsBox.scrollTop = msgsBox.scrollHeight;
      }
    }

    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
