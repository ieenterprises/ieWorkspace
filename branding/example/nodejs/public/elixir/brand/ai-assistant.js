/* ieWorkspace AI Assistant — universal AI side panel for Word, Excel, Presentation, and PDF */
(function () {
  'use strict';

  var STORAGE_KEY = 'ieworkspace-ai-config-v1';

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
      system: 'You are ieWorkspace AI, an expert PowerPoint presentation designer. Write punchy slide titles, concise bullet points (max 5 bullets per slide), and helpful speaker notes.',
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

  function loadConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '' };
  }

  function saveConfig(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch (e) {}
  }

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
      '.ie-ai-hbtns{display:flex;gap:6px;}' +
      '.ie-ai-iconbtn{width:28px;height:28px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#374151;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:14px;}' +
      '.ie-ai-iconbtn:hover{background:#f3f4f6;}' +
      '.ie-ai-settings{padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#f9fafb;display:none;flex-direction:column;gap:8px;font-size:12px;}' +
      '.ie-ai-settings.open{display:flex;}' +
      '.ie-ai-settings label{display:flex;flex-direction:column;gap:3px;font-weight:600;color:#374151;}' +
      '.ie-ai-settings input{padding:7px 9px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;background:#fff;color:#111;}' +
      '.ie-ai-save{align-self:flex-end;padding:6px 12px;border:none;border-radius:6px;background:#0082c9;color:#fff;font-weight:600;cursor:pointer;}' +
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
    // Only mount on editor pages (web /example/editor or desktop app shell), not on Home page
    var isEditor = /\/editor(\b|\?|#|$)/i.test(window.location.pathname) || !!document.getElementById('workspace');
    if (!isEditor || document.getElementById('ie-ai-fab')) return;

    injectStyles();

    var kind = detectEditorType();
    var preset = PROMPTS[kind] || PROMPTS.general;
    var history = [];
    var serverManaged = false;

    // Check if server-managed AI proxy (/elixir-ai/config.json) is enabled
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
        '<div class="ie-ai-hbtns">' +
          '<button type="button" class="ie-ai-iconbtn" id="ie-ai-cfg-btn" title="AI Settings">&#9881;</button>' +
          '<button type="button" class="ie-ai-iconbtn" id="ie-ai-close" title="Close">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="ie-ai-settings" id="ie-ai-settings">' +
        '<label>API Base URL (OpenAI-compatible)<input id="ie-ai-url" type="url" placeholder="https://api.openai.com/v1"></label>' +
        '<label>Model<input id="ie-ai-model" type="text" placeholder="gpt-4o-mini"></label>' +
        '<label>API Key (saved locally in this browser)<input id="ie-ai-key" type="password" placeholder="sk-..."></label>' +
        '<button type="button" class="ie-ai-save" id="ie-ai-save">Save settings</button>' +
      '</div>' +
      '<div class="ie-ai-quick" id="ie-ai-quick"></div>' +
      '<div class="ie-ai-msgs" id="ie-ai-msgs"></div>' +
      '<div class="ie-ai-foot">' +
        '<textarea id="ie-ai-input" placeholder="Ask ieWorkspace AI anything..."></textarea>' +
        '<button type="button" id="ie-ai-send">Send</button>' +
      '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(drawer);

    var badgeEl = drawer.querySelector('#ie-ai-badge');
    var cfgBox = drawer.querySelector('#ie-ai-settings');
    var urlInput = drawer.querySelector('#ie-ai-url');
    var modelInput = drawer.querySelector('#ie-ai-model');
    var keyInput = drawer.querySelector('#ie-ai-key');
    var quickBox = drawer.querySelector('#ie-ai-quick');
    var msgsBox = drawer.querySelector('#ie-ai-msgs');
    var inputEl = drawer.querySelector('#ie-ai-input');
    var sendBtn = drawer.querySelector('#ie-ai-send');

    badgeEl.textContent = preset.badge;

    var cfg = loadConfig();
    urlInput.value = cfg.baseUrl || 'https://api.openai.com/v1';
    modelInput.value = cfg.model || 'gpt-4o-mini';
    keyInput.value = cfg.apiKey || '';

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

    function addMsg(role, text) {
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
      msgsBox.appendChild(div);
      msgsBox.scrollTop = msgsBox.scrollHeight;
      return body;
    }

    addMsg('bot', 'Hi! I am ieWorkspace AI (' + preset.badge + '). Pick a quick action above or type a request. Click the gear icon (⚙) to configure your OpenAI-compatible API key & model.');

    fab.addEventListener('click', function () {
      drawer.classList.toggle('open');
      if (drawer.classList.contains('open')) inputEl.focus();
    });
    drawer.querySelector('#ie-ai-close').addEventListener('click', function () {
      drawer.classList.remove('open');
    });
    drawer.querySelector('#ie-ai-cfg-btn').addEventListener('click', function () {
      cfgBox.classList.toggle('open');
    });
    drawer.querySelector('#ie-ai-save').addEventListener('click', function () {
      cfg = {
        baseUrl: (urlInput.value || 'https://api.openai.com/v1').trim().replace(/\/+$/, ''),
        model: (modelInput.value || 'gpt-4o-mini').trim(),
        apiKey: (keyInput.value || '').trim()
      };
      saveConfig(cfg);
      cfgBox.classList.remove('open');
      addMsg('bot', 'AI settings saved (' + cfg.model + ').');
    });

    async function send() {
      var text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      addMsg('user', text);

      var useManaged = serverManaged && !cfg.apiKey;
      if (!useManaged && !cfg.apiKey) {
        cfgBox.classList.add('open');
        addMsg('bot', 'Please enter your API key in AI Settings (⚙) above (or configure ELIXIR_AI_BASE_URL / ELIXIR_AI_API_KEY on the server).');
        return;
      }

      history.push({ role: 'user', content: text });
      var outBody = addMsg('bot', 'Thinking...');
      sendBtn.disabled = true;

      try {
        var endpoint = useManaged ? '/elixir-ai/v1/chat/completions' : (cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions');
        var headers = { 'Content-Type': 'application/json' };
        if (!useManaged) headers['Authorization'] = 'Bearer ' + cfg.apiKey;

        var res = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            model: cfg.model || 'gpt-4o-mini',
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
