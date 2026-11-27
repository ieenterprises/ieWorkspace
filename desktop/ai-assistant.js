/* ieWorkspace AI —
   1. File -> AI Settings (multi-provider + multi-model + OpenRouter OAuth PKCE) across Word, Excel, Presentation & PDF
   2. Round, movable Business-Logo AI bubble + movable floating chat window
   3. Direct document reading (highlighted selection) & direct in-place modification across Word, Excel, Presentation & PDF */
(function () {
  'use strict';

  var STORAGE_KEY = 'ieworkspace-ai-config-v1';
  var ELIXIR_KEY = 'elixir-ai-settings';
  var PKCE_VERIFIER_KEY = 'ieworkspace-or-pkce-verifier';
  var POS_KEY = 'ieworkspace-ai-pos-v1';

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
      models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o4-mini', 'o3-mini']
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      keyPlaceholder: 'AIza…',
      models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      keyPlaceholder: 'sk-…',
      models: ['deepseek-chat', 'deepseek-reasoner']
    },
    {
      id: 'groq',
      name: 'Groq (Fast Inference)',
      baseUrl: 'https://api.groq.com/openai/v1',
      keyPlaceholder: 'gsk_…',
      models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'deepseek-r1-distill-llama-70b', 'qwen-qwq-32b']
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      baseUrl: 'https://api.mistral.ai/v1',
      keyPlaceholder: 'Mistral API key',
      models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest']
    },
    {
      id: 'xai',
      name: 'xAI (Grok)',
      baseUrl: 'https://api.x.ai/v1',
      keyPlaceholder: 'xai-…',
      models: ['grok-3', 'grok-3-mini', 'grok-2-latest']
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude (via OpenAI-compatible proxy)',
      baseUrl: 'https://api.anthropic.com/v1',
      keyPlaceholder: 'sk-ant-…',
      models: ['claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022']
    },
    {
      id: 'ollama',
      name: 'Ollama (Local / Offline)',
      baseUrl: 'http://localhost:11434/v1',
      keyPlaceholder: 'ollama (optional for local)',
      noKeyRequired: true,
      models: ['llama3.2', 'qwen2.5', 'mistral', 'deepseek-r1', 'gemma3']
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
    return PROVIDERS[1];
  }

  function loadConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { provider: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', apiKey: '' };
  }

  function saveConfig(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
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

  /* ---- OpenRouter PKCE OAuth ---- */
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
    window.location.href = 'https://openrouter.ai/auth?callback_url=' + encodeURIComponent(callback) +
      '&code_challenge=' + encodeURIComponent(challenge) + '&code_challenge_method=S256';
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
        body: JSON.stringify({ code: code, code_verifier: verifier, code_challenge_method: 'S256' })
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

  /* ---- Editor Detection & Direct Asc.editor Bridge ---- */
  function getEditorFrameWin() {
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) {
      try {
        var w = frames[i].contentWindow;
        if (w && w.Asc && w.Asc.editor) return w;
      } catch (e) {}
    }
    return null;
  }

  function detectEditorType() {
    var w = getEditorFrameWin();
    if (w) {
      if (w.SSE) return 'cell';
      if (w.PE) return 'slide';
      if (w.PDFE) return 'pdf';
      if (w.DE) return 'word';
    }
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

  function readDocumentSelection() {
    return new Promise(function (resolve) {
      var w = getEditorFrameWin();
      if (!w || !w.Asc || !w.Asc.editor) return resolve('');
      var ed = w.Asc.editor;
      try {
        if (w.SSE && typeof ed.callCommand === 'function') {
          var done = false;
          var t = setTimeout(function () { if (!done) { done = true; resolve(''); } }, 1200);
          ed.callCommand(
            '(function(){var s=Api.GetActiveSheet().GetSelection();if(!s)return "";var v=s.GetValue2();return typeof v==="string"?v:JSON.stringify(v);})()',
            true,
            function (val) {
              if (!done) { done = true; clearTimeout(t); resolve(val ? String(val).trim() : ''); }
            }
          );
          return;
        }
        if (typeof ed.asc_GetSelectedText === 'function') {
          var sel = ed.asc_GetSelectedText();
          if (sel && String(sel).trim()) return resolve(String(sel).trim());
        }
      } catch (e) {}
      resolve('');
    });
  }

  function applyTextToDocument(text, kind) {
    return new Promise(function (resolve) {
      var w = getEditorFrameWin();
      if (!w || !w.Asc || !w.Asc.editor) return resolve({ ok: false, reason: 'Editor is still loading.' });
      var ed = w.Asc.editor;
      var clean = String(text || '').trim();
      if (!clean) return resolve({ ok: false, reason: 'Nothing to apply.' });

      try {
        // 1. Excel: write value or formula directly into selected cell
        if (kind === 'cell' && typeof ed.callCommand === 'function') {
          var firstLine = clean.split(/\r?\n/)[0].trim();
          var valJson = JSON.stringify(firstLine);
          var done = false;
          var timer = setTimeout(function () { if (!done) { done = true; resolve({ ok: true, method: 'cell' }); } }, 2000);
          ed.callCommand(
            '(function(){var s=Api.GetActiveSheet().GetSelection();if(s){s.SetValue(' + valJson + ');return true;}return false;})()',
            false,
            function (res) {
              if (!done) {
                done = true;
                clearTimeout(timer);
                resolve({ ok: !!res, method: 'cell' });
              }
            }
          );
          return;
        }

        // 2. Word, PDF, and Presentation (when text is selected/cursor active): direct in-place replace/insert
        var hasSelection = false;
        try {
          if (typeof ed.asc_GetSelectedText === 'function') {
            hasSelection = String(ed.asc_GetSelectedText() || '').trim().length > 0;
          }
        } catch (e) {}

        if (kind === 'slide' && !hasSelection && typeof ed.callCommand === 'function') {
          var slideTextJson = JSON.stringify(clean);
          var sDone = false;
          var sTimer = setTimeout(function () { if (!sDone) { sDone = true; resolve({ ok: true, method: 'slide-box' }); } }, 2000);
          ed.callCommand(
            '(function(){var p=Api.GetPresentation();var s=p&&p.GetCurrentSlide();if(!s)return false;' +
            'var sh=Api.CreateShape("rect",5500000,2600000,Api.CreateNoFill(),Api.CreateStroke(0,Api.CreateNoFill()));' +
            'sh.SetPosition(1200000,1500000);var dc=sh.GetDocContent();var lines=' + slideTextJson + '.split(/\\r?\\n/);' +
            'for(var i=0;i<lines.length;i++){var para=i===0?dc.GetElement(0):Api.CreateParagraph();para.AddText(lines[i]);if(i>0)dc.Push(para);}' +
            's.AddObject(sh);return true;})()',
            false,
            function (res) {
              if (!sDone) { sDone = true; clearTimeout(sTimer); resolve({ ok: !!res, method: 'slide-box' }); }
            }
          );
          return;
        }

        if (typeof ed.asc_PasteText === 'function') {
          ed.asc_PasteText(clean);
          return resolve({ ok: true, method: 'paste' });
        }

        // Fallback via Word public Document Builder API
        if (kind === 'word' && typeof ed.callCommand === 'function') {
          var wJson = JSON.stringify(clean);
          ed.callCommand(
            '(function(){var d=Api.GetDocument();var p=Api.CreateParagraph();p.AddText(' + wJson + ');d.InsertContent([p]);return true;})()',
            false,
            function () { resolve({ ok: true, method: 'word-api' }); }
          );
          return;
        }
      } catch (err) {
        return resolve({ ok: false, reason: err && err.message ? err.message : String(err) });
      }
      resolve({ ok: false, reason: 'Could not modify this selection directly. Use Copy instead.' });
    });
  }

  var PROMPTS = {
    word: {
      badge: 'Word AI',
      editSystem: 'You are ieWorkspace AI editing a Word document directly. Return ONLY the final replacement or new plain text to insert into the document—no preamble, no markdown fences, no commentary.',
      chatSystem: 'You are ieWorkspace AI, an expert Word document assistant.',
      quick: [
        { label: 'Rewrite selection', prompt: 'Rewrite this highlighted text to be clearer and more professional.' },
        { label: 'Fix grammar', prompt: 'Fix spelling and grammar in this highlighted text without changing its meaning.' },
        { label: 'Make shorter', prompt: 'Shorten this highlighted text while keeping the key points.' },
        { label: 'Draft section', prompt: 'Draft a professional section about: ' }
      ]
    },
    cell: {
      badge: 'Excel AI',
      editSystem: 'You are ieWorkspace AI editing an Excel cell directly. If asked for a formula, return ONLY the single Excel formula starting with = (no backticks, no explanation). Otherwise return ONLY the concise cell value.',
      chatSystem: 'You are ieWorkspace AI, an expert Excel spreadsheet assistant.',
      quick: [
        { label: 'Write formula', prompt: 'Write an Excel formula to: ' },
        { label: 'SUM formula', prompt: 'Write a SUM formula for A1:A10' },
        { label: 'IF formula', prompt: 'Write an IF formula that checks: ' },
        { label: 'Clean text', prompt: 'Clean and format the selected cell text.' }
      ]
    },
    slide: {
      badge: 'Presentation AI',
      editSystem: 'You are ieWorkspace AI editing a PowerPoint slide directly. Return ONLY the concise slide text/bullets to insert onto the slide—no preamble or markdown code fences.',
      chatSystem: 'You are ieWorkspace AI, an expert PowerPoint presentation designer.',
      quick: [
        { label: 'Rewrite slide', prompt: 'Rewrite this highlighted slide text into crisp, punchy bullets.' },
        { label: 'Add bullets', prompt: 'Write 4 concise bullet points for a slide about: ' },
        { label: 'Shorten text', prompt: 'Shorten this slide text so it fits cleanly on one slide.' },
        { label: 'Speaker notes', prompt: 'Write concise speaker notes for this slide.' }
      ]
    },
    pdf: {
      badge: 'PDF AI',
      editSystem: 'You are ieWorkspace AI editing a PDF document directly. Return ONLY the clean replacement or new text to insert into the PDF—no preamble or markdown fences.',
      chatSystem: 'You are ieWorkspace AI, an expert PDF document assistant.',
      quick: [
        { label: 'Rewrite selection', prompt: 'Rewrite this highlighted PDF text clearly and concisely.' },
        { label: 'Fix grammar', prompt: 'Fix spelling and grammar in this highlighted PDF text.' },
        { label: 'Simplify text', prompt: 'Rewrite this highlighted PDF section in plain, simple English.' },
        { label: 'Draft text', prompt: 'Write a short paragraph to insert into this PDF about: ' }
      ]
    },
    general: {
      badge: 'ieWorkspace AI',
      editSystem: 'You are ieWorkspace AI editing a document directly. Return ONLY the final text to insert, with no preamble or markdown fences.',
      chatSystem: 'You are ieWorkspace AI, a helpful assistant for documents, spreadsheets, presentations, and PDFs.',
      quick: [
        { label: 'Rewrite selection', prompt: 'Rewrite the selected text clearly and professionally.' },
        { label: 'Fix grammar', prompt: 'Fix spelling and grammar in the selected text.' },
        { label: 'Draft text', prompt: 'Draft a professional section about: ' },
        { label: 'Summarize', prompt: 'Summarize the selected text into concise bullet points.' }
      ]
    }
  };

  /* ---- Build File -> AI Settings UI inside editor iframe backstage ---- */
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

    orBtn.addEventListener('click', function () { startOpenRouterOAuth(); });

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
          body: JSON.stringify({ model: cfg.model, max_tokens: 12, messages: [{ role: 'user', content: 'Reply with OK' }] })
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

  function attachToBackstage(frameWin) {
    if (!frameWin || !frameWin.document) return false;
    var doc = frameWin.document;
    var rail = doc.querySelector('.panel-menu');
    var ctx = doc.querySelector('.panel-context');
    if (!rail || !ctx) return false;
    if (rail.getAttribute('data-ie-ai-hooked') === '1') return true;
    rail.setAttribute('data-ie-ai-hooked', '1');

    var aiBtn = doc.getElementById('fm-btn-elx-ai');
    if (!aiBtn) {
      aiBtn = doc.createElement('li');
      aiBtn.id = 'fm-btn-elx-ai';
      aiBtn.className = 'fm-btn';
      aiBtn.setAttribute('role', 'menuitem');
      aiBtn.setAttribute('tabindex', '0');
      aiBtn.innerHTML = '<a href="#" style="display:flex;align-items:center;gap:10px;padding:8px 14px;text-decoration:none;color:inherit;"><span style="font-size:15px;">&#10024;</span><span>AI</span></a>';
      var optBtn = doc.getElementById('fm-btn-settings');
      if (optBtn && optBtn.parentNode === rail) rail.insertBefore(aiBtn, optBtn);
      else rail.appendChild(aiBtn);
    } else {
      aiBtn.style.display = '';
      aiBtn.hidden = false;
    }

    var aiPanel = doc.getElementById('panel-ie-ai');
    if (!aiPanel) {
      aiPanel = doc.createElement('div');
      aiPanel.id = 'panel-ie-ai';
      aiPanel.className = 'content-box elx-page';
      aiPanel.style.cssText = 'display:none;overflow-y:auto;height:100%;background:#fff;';
      aiPanel.appendChild(buildBackstageSettingsPanel(doc));
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
    rail.addEventListener('click', function (e) {
      var li = e.target && e.target.closest ? e.target.closest('.fm-btn') : null;
      if (li && li.id !== 'fm-btn-elx-ai') {
        aiPanel.style.display = 'none';
        aiBtn.classList.remove('active');
      }
    }, true);

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
          if (attachToBackstage(frames[i].contentWindow)) { clearInterval(timer); return; }
        } catch (e) {}
      }
      if (attempts > 60) clearInterval(timer);
    }, 500);
  }

  /* ---- Draggable Utility (Mouse + Touch Pointer Events) ---- */
  function makeDraggable(el, handle, onMoved, onClickIfNoDrag) {
    var dragging = false, moved = false, startX = 0, startY = 0, origL = 0, origT = 0;
    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target && e.target.closest && e.target.closest('button,input,textarea,select,label') && handle !== el) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      var rect = el.getBoundingClientRect();
      origL = rect.left;
      origT = rect.top;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.left = origL + 'px';
      el.style.top = origT + 'px';
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    });
    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      if (!moved) return;
      var maxL = Math.max(0, window.innerWidth - el.offsetWidth);
      var maxT = Math.max(0, window.innerHeight - el.offsetHeight);
      var nl = Math.min(maxL, Math.max(0, origL + dx));
      var nt = Math.min(maxT, Math.max(0, origT + dy));
      el.style.left = nl + 'px';
      el.style.top = nt + 'px';
    });
    function finish(e) {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved) {
        if (onMoved) onMoved(parseFloat(el.style.left) || 0, parseFloat(el.style.top) || 0);
      } else if (onClickIfNoDrag) {
        onClickIfNoDrag();
      }
    }
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }

  function injectStyles() {
    if (document.getElementById('ie-ai-style')) return;
    var s = document.createElement('style');
    s.id = 'ie-ai-style';
    s.textContent =
      '#ie-ai-fab{position:fixed;right:20px;bottom:34px;z-index:2147483600;width:54px;height:54px;padding:0;border:2.5px solid #0082c9;border-radius:50%;background:#ffffff;box-shadow:0 6px 22px rgba(0,0,0,.22);cursor:grab;display:inline-flex;align-items:center;justify-content:center;touch-action:none;user-select:none;transition:box-shadow .15s,transform .15s;}' +
      '#ie-ai-fab:active{cursor:grabbing;}' +
      '#ie-ai-fab:hover{box-shadow:0 8px 26px rgba(0,130,201,.42);transform:scale(1.04);}' +
      '#ie-ai-fab img{width:100%;height:100%;border-radius:50%;object-fit:contain;pointer-events:none;}' +
      '#ie-ai-fab .ie-spark{position:absolute;top:-4px;right:-4px;width:20px;height:20px;border-radius:50%;background:#0082c9;color:#fff;font-size:11px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.25);pointer-events:none;}' +
      '#ie-ai-win{position:fixed;right:20px;bottom:98px;width:368px;max-width:94vw;height:490px;max-height:80vh;z-index:2147483601;background:#ffffff;color:#1d1d1f;border:1px solid rgba(0,0,0,.14);border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}' +
      '#ie-ai-win.open{display:flex;}' +
      '.ie-ai-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e5e7eb;background:#f8fafc;cursor:move;touch-action:none;user-select:none;}' +
      '.ie-ai-title{display:flex;align-items:center;gap:8px;font:700 13.5px/1.2 system-ui,sans-serif;}' +
      '.ie-ai-title img{width:24px;height:24px;border-radius:50%;object-fit:contain;border:1px solid #d1d5db;background:#fff;}' +
      '.ie-ai-pill{font:600 11px/1 system-ui,sans-serif;padding:3px 8px;border-radius:999px;background:#e6f3fb;color:#0072b1;}' +
      '.ie-ai-iconbtn{width:26px;height:26px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#374151;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:15px;}' +
      '.ie-ai-iconbtn:hover{background:#f3f4f6;}' +
      '.ie-ai-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 12px;border-bottom:1px solid #eef0f3;background:#fbfdff;font-size:11.5px;color:#374151;}' +
      '.ie-ai-sel-badge{display:inline-flex;align-items:center;gap:5px;color:#006da8;font-weight:600;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.ie-ai-toggle{display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-weight:600;color:#1d1d1f;white-space:nowrap;}' +
      '.ie-ai-quick{display:flex;flex-wrap:wrap;gap:5px;padding:8px 12px;border-bottom:1px solid #eef0f3;}' +
      '.ie-ai-chip{padding:4px 9px;border:1px solid #d0e4f2;border-radius:999px;background:#f4f9fd;color:#006da8;font:500 11.5px/1.2 system-ui,sans-serif;cursor:pointer;}' +
      '.ie-ai-chip:hover{background:#e2f1fb;}' +
      '.ie-ai-msgs{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:12.8px;line-height:1.45;}' +
      '.ie-ai-msg{padding:8px 10px;border-radius:10px;white-space:pre-wrap;word-break:break-word;}' +
      '.ie-ai-msg.user{background:#0082c9;color:#fff;align-self:flex-end;max-width:88%;}' +
      '.ie-ai-msg.bot{background:#f3f4f6;color:#111827;align-self:flex-start;max-width:95%;border:1px solid #e5e7eb;}' +
      '.ie-ai-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}' +
      '.ie-ai-act{padding:3px 9px;border:1px solid #cbd5e1;border-radius:5px;background:#fff;color:#1d1d1f;font:600 11px/1.3 system-ui,sans-serif;cursor:pointer;}' +
      '.ie-ai-act.primary{background:#0082c9;border-color:#0082c9;color:#fff;}' +
      '.ie-ai-act:hover{opacity:.9;}' +
      '.ie-ai-foot{padding:8px 10px;border-top:1px solid #e5e7eb;display:flex;gap:7px;align-items:flex-end;background:#fff;}' +
      '#ie-ai-input{flex:1;min-height:38px;max-height:110px;resize:vertical;padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;font:12.8px/1.35 system-ui,sans-serif;}' +
      '#ie-ai-send{height:36px;padding:0 13px;border:none;border-radius:8px;background:#0082c9;color:#fff;font:600 12.5px/1 system-ui,sans-serif;cursor:pointer;}' +
      '#ie-ai-send:disabled{opacity:.55;cursor:not-allowed;}';
    document.head.appendChild(s);
  }

  function mount() {
    var isEditor = /\/editor(\b|\?|#|$)/i.test(window.location.pathname) || !!document.getElementById('workspace');
    if (!isEditor || document.getElementById('ie-ai-fab')) return;

    handleOpenRouterCallback();
    injectStyles();
    startBackstageWatcher();

    var logoSrc = document.getElementById('workspace') ? '/icon.png' : 'elixir/brand/icon-192.png';
    var kind = detectEditorType();
    var preset = PROMPTS[kind] || PROMPTS.general;
    var history = [];
    var serverManaged = false;
    var lastSelection = '';

    fetch('/elixir-ai/config.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data && data.enabled) serverManaged = true; })
      .catch(function () {});

    var fab = document.createElement('button');
    fab.id = 'ie-ai-fab';
    fab.type = 'button';
    fab.title = 'ieWorkspace AI (drag to move, click to open)';
    fab.innerHTML = '<img src="' + logoSrc + '" alt="ieWorkspace AI" /><span class="ie-spark">&#10024;</span>';

    // Restore saved bubble position if within viewport
    try {
      var savedPos = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
        fab.style.left = Math.min(Math.max(8, savedPos.x), Math.max(8, window.innerWidth - 62)) + 'px';
        fab.style.top = Math.min(Math.max(8, savedPos.y), Math.max(8, window.innerHeight - 62)) + 'px';
      }
    } catch (e) {}

    var win = document.createElement('aside');
    win.id = 'ie-ai-win';
    win.setAttribute('aria-label', 'ieWorkspace AI Assistant');
    win.innerHTML =
      '<div class="ie-ai-head" id="ie-ai-drag-head" title="Drag to move anywhere">' +
        '<div class="ie-ai-title"><img src="' + logoSrc + '" alt="" /><span>ieWorkspace AI</span><span class="ie-ai-pill" id="ie-ai-badge"></span></div>' +
        '<button type="button" class="ie-ai-iconbtn" id="ie-ai-close" title="Close">&times;</button>' +
      '</div>' +
      '<div class="ie-ai-bar">' +
        '<span class="ie-ai-sel-badge" id="ie-ai-sel-status">Highlight text to edit directly</span>' +
        '<label class="ie-ai-toggle" title="Automatically apply AI edits directly into the document"><input type="checkbox" id="ie-ai-direct" checked /> Direct edit</label>' +
      '</div>' +
      '<div class="ie-ai-quick" id="ie-ai-quick"></div>' +
      '<div class="ie-ai-msgs" id="ie-ai-msgs"></div>' +
      '<div class="ie-ai-foot">' +
        '<textarea id="ie-ai-input" placeholder="Describe how to modify the highlighted text or document…"></textarea>' +
        '<button type="button" id="ie-ai-send">Apply</button>' +
      '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(win);

    var badgeEl = win.querySelector('#ie-ai-badge');
    var selStatusEl = win.querySelector('#ie-ai-sel-status');
    var directChk = win.querySelector('#ie-ai-direct');
    var quickBox = win.querySelector('#ie-ai-quick');
    var msgsBox = win.querySelector('#ie-ai-msgs');
    var inputEl = win.querySelector('#ie-ai-input');
    var sendBtn = win.querySelector('#ie-ai-send');

    badgeEl.textContent = preset.badge;

    function refreshSelectionBadge() {
      kind = detectEditorType();
      preset = PROMPTS[kind] || PROMPTS.general;
      badgeEl.textContent = preset.badge;
      return readDocumentSelection().then(function (sel) {
        lastSelection = sel;
        if (sel) {
          selStatusEl.textContent = 'Selected: "' + (sel.length > 26 ? sel.slice(0, 26) + '…' : sel) + '"';
        } else {
          selStatusEl.textContent = 'Cursor mode (inserts at cursor)';
        }
        return sel;
      });
    }

    directChk.addEventListener('change', function () {
      sendBtn.textContent = directChk.checked ? 'Apply' : 'Send';
    });

    function toggleWin() {
      var opening = !win.classList.contains('open');
      win.classList.toggle('open');
      if (opening) {
        refreshSelectionBadge();
        inputEl.focus();
      }
    }

    makeDraggable(fab, fab, function (x, y) {
      try { localStorage.setItem(POS_KEY, JSON.stringify({ x: x, y: y })); } catch (e) {}
    }, toggleWin);

    makeDraggable(win, win.querySelector('#ie-ai-drag-head'), null, null);

    win.querySelector('#ie-ai-close').addEventListener('click', function () {
      win.classList.remove('open');
    });

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

    function addMsg(role, text, opts) {
      opts = opts || {};
      var div = document.createElement('div');
      div.className = 'ie-ai-msg ' + (role === 'user' ? 'user' : 'bot');
      var body = document.createElement('div');
      body.textContent = text;
      div.appendChild(body);

      if (role !== 'user' && (opts.canApply || opts.showOpenSettings)) {
        var acts = document.createElement('div');
        acts.className = 'ie-ai-actions';
        if (opts.canApply) {
          var applyBtn = document.createElement('button');
          applyBtn.type = 'button';
          applyBtn.className = 'ie-ai-act primary';
          applyBtn.textContent = opts.applied ? 'Applied ✓ (Re-apply)' : 'Apply to document';
          applyBtn.addEventListener('click', async function () {
            var res = await applyTextToDocument(body.textContent, kind);
            applyBtn.textContent = res.ok ? 'Applied ✓' : ('Could not apply: ' + (res.reason || 'try Copy'));
          });
          acts.appendChild(applyBtn);

          var cp = document.createElement('button');
          cp.type = 'button';
          cp.className = 'ie-ai-act';
          cp.textContent = 'Copy';
          cp.addEventListener('click', function () {
            navigator.clipboard.writeText(body.textContent).then(function () {
              cp.textContent = 'Copied!';
              setTimeout(function () { cp.textContent = 'Copy'; }, 1500);
            }).catch(function () {});
          });
          acts.appendChild(cp);
        }
        if (opts.showOpenSettings) {
          var openBtn = document.createElement('button');
          openBtn.type = 'button';
          openBtn.className = 'ie-ai-act primary';
          openBtn.textContent = 'Open File → AI Settings';
          openBtn.addEventListener('click', function () {
            win.classList.remove('open');
            if (typeof window._ieOpenFileAI === 'function') window._ieOpenFileAI();
          });
          acts.appendChild(openBtn);
        }
        div.appendChild(acts);
      }

      msgsBox.appendChild(div);
      msgsBox.scrollTop = msgsBox.scrollHeight;
      return { div: div, body: body };
    }

    addMsg('bot', 'Highlight any text or cell in your document, tell me how to change it, and I will modify it directly (press Ctrl+Z anytime to undo). Drag my round logo or this header anywhere on screen!');

    async function send() {
      var instruction = inputEl.value.trim();
      if (!instruction) return;
      inputEl.value = '';

      var sel = await refreshSelectionBadge();
      addMsg('user', instruction + (sel ? '\n[Selection: "' + (sel.length > 60 ? sel.slice(0, 60) + '…' : sel) + '"]' : ''));

      var cfg = loadConfig();
      var p = getProvider(cfg.provider || 'openai');
      var useManaged = serverManaged && !cfg.apiKey && !p.noKeyRequired;

      if (!useManaged && !cfg.apiKey && !p.noKeyRequired) {
        addMsg('bot', 'No AI provider is configured yet. Open File → AI to choose a provider or sign in with OpenRouter.', { showOpenSettings: true });
        return;
      }

      var directMode = directChk.checked;
      var sysPrompt = directMode ? preset.editSystem : preset.chatSystem;
      var userContent = sel
        ? ('Selected document text:\n"""\n' + sel + '\n"""\n\nInstruction: ' + instruction)
        : instruction;

      history.push({ role: 'user', content: userContent });
      var thinking = addMsg('bot', directMode ? 'Editing document…' : 'Thinking…');
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
            messages: [{ role: 'system', content: sysPrompt }].concat(history.slice(-8))
          })
        });
        var data = await res.json();
        if (!res.ok) throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
        var reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
        reply = reply.replace(/^```[a-z]*\r?\n?/i, '').replace(/\r?\n?```$/i, '').trim();
        history.push({ role: 'assistant', content: reply });

        var applied = false;
        if (directMode && reply) {
          var applyRes = await applyTextToDocument(reply, kind);
          applied = !!applyRes.ok;
        }

        // Replace thinking bubble with final message + Apply/Copy controls
        thinking.div.remove();
        addMsg('bot', reply || 'No response received.', { canApply: true, applied: applied });
      } catch (err) {
        thinking.body.textContent = 'AI request failed: ' + (err && err.message ? err.message : String(err));
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
