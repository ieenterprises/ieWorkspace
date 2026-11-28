/* ieWorkspace AI —
   1. File -> AI Settings (multi-provider + multi-model + OpenRouter OAuth PKCE) across Word, Excel, Presentation & PDF
   2. Complete UI rebrand observer (Ask Elixir / Search or ask Elixir / Elixir tab / Type / for commands -> ieWorkspace AI)
   3. Round, movable Business-Logo AI bubble + movable floating chat window
   4. Smart Document-Aware Direct Editing (reads highlighted text OR full document text, performs in-place SearchAndReplace, cell edits, or inserts) */
(function () {
  'use strict';

  var STORAGE_KEY = 'ieworkspace-ai-config-v1';
  var ELIXIR_KEY = 'elixir-ai-settings';
  var PKCE_VERIFIER_KEY = 'ieworkspace-or-pkce-verifier';
  var POS_KEY = 'ieworkspace-ai-pos-v1';
  var JOURNAL_KEY = 'ieworkspace-ai-journal-v1';
  var lastModalIntent = 'settings'; // 'settings' or 'journal'

  function loadJournal() {
    var combined = [];
    try {
      var ieList = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
      if (Array.isArray(ieList)) combined = combined.concat(ieList);
    } catch (e) {}
    try {
      // Also include any entries from Word's native Elixir AI journal so nothing is lost
      var nativeRaw = localStorage.getItem('elixir-ai-journal');
      if (nativeRaw) {
        var nList = JSON.parse(nativeRaw);
        if (Array.isArray(nList)) {
          nList.forEach(function (item) {
            combined.push({
              when: item.time || item.when || (item.ts ? new Date(item.ts).toLocaleString() : ''),
              editor: item.editor || 'Word AI',
              model: item.model || '',
              instruction: item.instruction || item.prompt || '',
              result: item.result || item.status || ''
            });
          });
        }
      }
    } catch (e) {}
    return combined;
  }
  function appendJournal(entry) {
    try {
      var list = [];
      try { list = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]'); } catch (e) {}
      if (!Array.isArray(list)) list = [];
      list.unshift(entry);
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(list.slice(0, 100)));
    } catch (e) {}
  }
  function clearJournal() {
    try {
      localStorage.removeItem(JOURNAL_KEY);
      localStorage.removeItem('elixir-ai-journal');
    } catch (e) {}
  }

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

  /* ---- Runtime UI Rebrand Observer (removes every visible "Elixir" / "Ask Elixir" string in editor iframe) ---- */
  function rebrandString(str) {
    if (!str || !/elixir/i.test(str)) return str;
    return str
      .replace(/ElixirOffice/gi, 'ieWorkspace')
      .replace(/Elixir AI/gi, 'ieWorkspace AI')
      .replace(/Ask Elixir/g, 'Ask ieWorkspace AI')
      .replace(/ask Elixir/g, 'ask ieWorkspace AI')
      .replace(/\bElixir\b/g, 'ieWorkspace AI');
  }

  function rebrandSubtree(root) {
    if (!root) return;
    try {
      if (root.nodeType === 3) {
        var nv = rebrandString(root.nodeValue);
        if (nv !== root.nodeValue) root.nodeValue = nv;
        return;
      }
      if (root.nodeType !== 1 && root.nodeType !== 9) return;
      var doc = root.nodeType === 9 ? root : root.ownerDocument;
      var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      var node;
      while ((node = walker.nextNode())) {
        if (node.parentNode && /^(SCRIPT|STYLE)$/i.test(node.parentNode.nodeName)) continue;
        var v = rebrandString(node.nodeValue);
        if (v !== node.nodeValue) node.nodeValue = v;
      }
      var els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label]') : [];
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
          var av = el.getAttribute(attr);
          if (av && /elixir/i.test(av)) {
            var rv = rebrandString(av);
            if (rv !== av) el.setAttribute(attr, rv);
          }
        });
      }
    } catch (e) {}
  }

  function buildJournalView(doc) {
    var wrap = doc.createElement('div');
    wrap.id = 'ie-modal-journal';
    wrap.style.cssText = 'padding:4px 0 12px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;';
    wrap.innerHTML =
      '<h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#1d1d1f;">AI journal</h1>' +
      '<p style="margin:0 0 12px;font-size:13px;color:#555;">Stored locally in this browser. History of your ieWorkspace AI requests across Word, Excel, Presentation, and PDF.</p>' +
      '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
        '<button type="button" id="ie-j-export" style="height:32px;padding:0 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:12.5px;cursor:pointer;">Export JSON</button>' +
        '<button type="button" id="ie-j-clear" style="height:32px;padding:0 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:12.5px;cursor:pointer;">Clear journal</button>' +
      '</div>' +
      '<div style="max-height:320px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
          '<thead><tr style="background:#f8fafc;text-align:left;border-bottom:1px solid #e5e7eb;">' +
            '<th style="padding:8px;">When</th><th style="padding:8px;">Editor</th><th style="padding:8px;">Model</th><th style="padding:8px;">Instruction</th><th style="padding:8px;">Result</th>' +
          '</tr></thead>' +
          '<tbody id="ie-j-body"></tbody>' +
        '</table>' +
      '</div>';

    function render() {
      var body = wrap.querySelector('#ie-j-body');
      var list = loadJournal();
      if (!list.length) {
        body.innerHTML = '<tr><td colspan="5" style="padding:14px;text-align:center;color:#666;">No AI requests recorded yet.</td></tr>';
        return;
      }
      body.innerHTML = '';
      list.forEach(function (r) {
        var tr = doc.createElement('tr');
        tr.style.borderBottom = '1px solid #f1f5f9';
        [r.when || '', r.editor || '', r.model || '', r.instruction || '', r.result || ''].forEach(function (val) {
          var td = doc.createElement('td');
          td.style.padding = '7px 8px';
          td.textContent = String(val).slice(0, 120);
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    }

    wrap.querySelector('#ie-j-export').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(loadJournal(), null, 2)], { type: 'application/json' });
      var a = doc.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ieworkspace-ai-journal.json';
      a.click();
    });
    wrap.querySelector('#ie-j-clear').addEventListener('click', function () {
      clearJournal();
      render();
    });
    render();
    wrap._refresh = render;
    return wrap;
  }

  function openStandaloneModal(doc, frameWin, mode) {
    var existing = doc.getElementById('ie-standalone-modal-bg');
    if (existing) existing.remove();
    var bg = doc.createElement('div');
    bg.id = 'ie-standalone-modal-bg';
    bg.style.cssText = 'position:fixed;inset:0;z-index:2147483500;background:rgba(0,0,0,.38);display:flex;align-items:center;justify-content:center;padding:16px;';
    var card = doc.createElement('div');
    card.style.cssText = 'width:620px;max-width:95vw;max-height:88vh;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.28);padding:20px 24px;display:flex;flex-direction:column;';
    card.appendChild(mode === 'journal' ? buildJournalView(doc) : buildBackstageSettingsPanel(doc, frameWin, true));
    var foot = doc.createElement('div');
    foot.style.cssText = 'display:flex;justify-content:flex-end;margin-top:12px;';
    var closeBtn = doc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'height:34px;padding:0 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#1d1d1f;font-size:13px;cursor:pointer;';
    closeBtn.addEventListener('click', function () { bg.remove(); });
    foot.appendChild(closeBtn);
    card.appendChild(foot);
    bg.appendChild(card);
    bg.addEventListener('click', function (e) { if (e.target === bg) bg.remove(); });
    doc.body.appendChild(bg);
  }

  function upgradeNativeAiSettingsModal(doc, frameWin) {
    try {
      var selects = doc.querySelectorAll('select');
      for (var i = 0; i < selects.length; i++) {
        var sel = selects[i];
        if (sel.id === 'ie-bs-provider' || sel.id === 'ie-bs-model') continue;
        var cur = sel.parentElement;
        var host = null;
        for (var depth = 0; depth < 8 && cur && cur !== doc.body; depth++) {
          var txt = cur.textContent || '';
          if (txt.indexOf('Service URL') !== -1 && txt.indexOf('API key') !== -1) {
            host = cur;
            if (txt.indexOf('AI settings') !== -1 || txt.indexOf('AI journal') !== -1) break;
          }
          cur = cur.parentElement;
        }
        if (!host || host.getAttribute('data-ie-modal-upgraded') === '1') continue;
        host.setAttribute('data-ie-modal-upgraded', '1');

        var children = Array.prototype.slice.call(host.children);
        var closeNode = null;
        var inJournal = false;
        for (var c = 0; c < children.length; c++) {
          var ch = children[c];
          var ctxt = ch.textContent || '';
          if (/^\s*Close\s*$/i.test(ctxt) || ch.querySelector && ch.querySelector('button') && /^\s*Close\s*$/i.test(ch.textContent)) {
            closeNode = ch;
            continue;
          }
          if (ctxt.indexOf('AI journal') !== -1) inJournal = true;
          if (lastModalIntent === 'journal') {
            // Show ONLY the native journal section, hide the settings section
            if (!inJournal) ch.style.display = 'none';
          } else {
            // Show ONLY our upgraded settings panel, hide both old settings and journal clutter
            ch.style.display = 'none';
          }
        }

        if (lastModalIntent !== 'journal') {
          var panel = buildBackstageSettingsPanel(doc, frameWin, true);
          if (closeNode) host.insertBefore(panel, closeNode);
          else host.insertBefore(panel, host.firstChild);
        }
      }
    } catch (e) {}
  }

  function attachRibbonTab(frameWin) {
    try {
      var doc = frameWin && frameWin.document;
      if (!doc || !doc.body) return;

      // 1. Hook ribbon buttons across ALL editors (including Word!):
      //    - "AI settings" ALWAYS opens ONLY the Settings modal
      //    - "AI journal"  ALWAYS opens ONLY the Journal modal
      //    - "Ask ieWorkspace AI" toggles the Ask bar closed on repeat click
      if (!doc.body.getAttribute('data-ie-ribbon-clicks')) {
        doc.body.setAttribute('data-ie-ribbon-clicks', '1');
        doc.body.addEventListener('click', function (e) {
          var btn = e.target && e.target.closest ? e.target.closest('button, .btn, [role="button"], li, a') : null;
          if (!btn || btn.getAttribute('data-ie-custom-tab-btn')) return;
          if (btn.closest('#ie-standalone-modal-bg, #ie-backstage-ai')) return;
          var label = (btn.textContent || btn.getAttribute('title') || btn.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
          if (/^AI\s+journal$/i.test(label)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            openStandaloneModal(doc, frameWin, 'journal');
            return;
          }
          if (/^AI\s+settings$/i.test(label)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            openStandaloneModal(doc, frameWin, 'settings');
            return;
          }
          if (/^Ask\s+ieWorkspace\s+AI$/i.test(label)) {
            var bars = doc.querySelectorAll('.elx-ai-bar, [class*="elixir-ai"], [class*="elx-ai"]');
            for (var i = 0; i < bars.length; i++) {
              var b = bars[i];
              if (b.querySelector && b.querySelector('input, textarea') && b.offsetParent !== null && !b.closest('[role="dialog"]')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                b.style.display = 'none';
                var esc = new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true });
                doc.dispatchEvent(esc);
                return;
              }
            }
          }
        }, true);
      }

      // 2. Unified native-looking "ieWorkspace AI" ribbon tab across ALL 4 editors (Word, Excel, Presentation, AND PDF)!
      var toolbarEl = doc.querySelector('#toolbar, .toolbar, .box-tabs');
      if (!toolbarEl) return;

      // Always keep Word's legacy built-in Elixir / ieWorkspace AI tab hidden (even if Word unhides it after API key load!)
      function hideLegacyAiTabs(host) {
        if (!host) return;
        var kids = host.children;
        for (var s = 0; s < kids.length; s++) {
          var sib = kids[s];
          if (sib.id === 'ie-ribbon-tab-ai') continue;
          var stxt = (sib.textContent || '').replace(/\s+/g, ' ').trim();
          if (/^(Elixir|ieWorkspace AI)$/i.test(stxt)) {
            sib.style.setProperty('display', 'none', 'important');
            sib.setAttribute('data-ie-hidden-legacy-tab', '1');
          }
        }
      }

      var existingOurTab = doc.getElementById('ie-ribbon-tab-ai');
      if (existingOurTab) {
        hideLegacyAiTabs(existingOurTab.parentElement);
        return;
      }

      // Find the ribbon tab strip universally across Word, Excel, Presentation, and PDF by locating the Home/View tab
      var refTabItem = null;
      var candidates = toolbarEl.querySelectorAll('li, a, button');
      for (var c = 0; c < candidates.length; c++) {
        var el = candidates[c];
        var txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt === 'View' || txt === 'Home') {
          var parentLi = el.tagName === 'LI' ? el : el.closest('li');
          if (parentLi && parentLi.parentElement) {
            refTabItem = parentLi;
            if (txt === 'View') break; // prefer View as our reference clone
          }
        }
      }
      if (!refTabItem || !refTabItem.parentElement) return;

      var tabHost = refTabItem.parentElement;
      hideLegacyAiTabs(tabHost);

      // Clone the exact sibling tab (e.g. View) so font, spacing, and SINGLE active underline match 100% natively!
      var li = refTabItem.cloneNode(true);
      li.id = 'ie-ribbon-tab-ai';
      li.classList.remove('active');
      li.removeAttribute('data-tab');
      li.style.display = '';
      var innerLink = li.querySelector('a, button, span');
      if (innerLink) {
        innerLink.removeAttribute('id');
        innerLink.removeAttribute('data-tab');
        innerLink.removeAttribute('href');
        innerLink.classList.remove('active');
        innerLink.textContent = 'ieWorkspace AI';
      } else {
        li.textContent = 'ieWorkspace AI';
      }
      tabHost.appendChild(li);

      // Mount INSIDE the ribbon's own panel container (never below the ribbon)
      var panelHost =
        toolbarEl.querySelector('.box-panels, .toolbar-panels, .panels') ||
        (toolbarEl.querySelector('section.panel') && toolbarEl.querySelector('section.panel').parentElement) ||
        toolbarEl;

      var strip = doc.createElement('div');
      strip.id = 'ie-ribbon-ai-strip';
      strip.style.cssText = 'display:none;position:absolute;inset:0;z-index:500;background:#ffffff;padding:4px 16px;align-items:center;gap:12px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-sizing:border-box;';
      strip.innerHTML =
        '<button type="button" data-ie-custom-tab-btn="ask" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;height:66px;padding:6px 14px;border:1px solid transparent;border-radius:6px;background:transparent;cursor:pointer;color:#1d1d1f;font-size:12px;line-height:1.2;">' +
          '<span style="font-size:20px;line-height:1;">&#10024;</span><span>Ask<br/>ieWorkspace AI</span>' +
        '</button>' +
        '<div style="width:1px;height:48px;background:#e5e7eb;"></div>' +
        '<button type="button" data-ie-custom-tab-btn="settings" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;height:66px;padding:6px 14px;border:1px solid transparent;border-radius:6px;background:transparent;cursor:pointer;color:#1d1d1f;font-size:12px;line-height:1.2;">' +
          '<span style="font-size:19px;line-height:1;">&#9881;</span><span>AI<br/>settings</span>' +
        '</button>' +
        '<button type="button" data-ie-custom-tab-btn="journal" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;height:66px;padding:6px 14px;border:1px solid transparent;border-radius:6px;background:transparent;cursor:pointer;color:#1d1d1f;font-size:12px;line-height:1.2;">' +
          '<span style="font-size:19px;line-height:1;">&#128337;</span><span>AI<br/>journal</span>' +
        '</button>';

      if (panelHost) {
        if (getComputedStyle(panelHost).position === 'static') panelHost.style.position = 'relative';
        if (panelHost === toolbarEl) {
          var tabRect = tabHost.getBoundingClientRect();
          var hostRect = panelHost.getBoundingClientRect();
          var topOffset = Math.max(28, Math.round(tabRect.bottom - hostRect.top));
          strip.style.top = topOffset + 'px';
        }
        panelHost.appendChild(strip);
      }

      var prevActiveTab = null;

      function deactivateAiTab() {
        strip.style.display = 'none';
        li.classList.remove('active');
        if (innerLink) innerLink.classList.remove('active');
        if (prevActiveTab) {
          prevActiveTab.classList.add('active');
          var prevA = prevActiveTab.querySelector('a, button');
          if (prevA) prevA.classList.add('active');
          prevActiveTab = null;
        }
      }

      function activateAiTab() {
        var activeTabs = tabHost.querySelectorAll('.active');
        prevActiveTab = null;
        for (var k = 0; k < activeTabs.length; k++) {
          var at = activeTabs[k];
          if (at !== li && !li.contains(at)) {
            if (at.tagName === 'LI') prevActiveTab = at;
            at.classList.remove('active');
          }
        }
        li.classList.add('active');
        if (innerLink) innerLink.classList.add('active');
        strip.style.display = 'flex';
      }

      li.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (strip.style.display === 'none') activateAiTab();
        else deactivateAiTab();
      });

      tabHost.addEventListener('click', function (e) {
        if (!e.target.closest('#ie-ribbon-tab-ai')) {
          prevActiveTab = null;
          deactivateAiTab();
        }
      }, true);

      strip.addEventListener('click', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('button[data-ie-custom-tab-btn]') : null;
        if (!b) return;
        var act = b.getAttribute('data-ie-custom-tab-btn');
        if (act === 'ask') {
          if (typeof window._ieToggleAIWin === 'function') window._ieToggleAIWin();
        } else if (act === 'settings') {
          openStandaloneModal(doc, frameWin, 'settings');
        } else if (act === 'journal') {
          openStandaloneModal(doc, frameWin, 'journal');
        }
      });
    } catch (e) {}
  }

  /* ---- Context Menu "Ask ieWorkspace AI" + Quick Popover (Word, Excel, Presentation, PDF) + Click-outside-to-close ---- */
  function closeQuickPopovers(doc) {
    try {
      var custom = doc && doc.getElementById('ie-ctx-ai-popover');
      if (custom) custom.remove();
      // Also close Word's native "Ask ieWorkspace AI about this..." popover if open
      if (doc) {
        var inputs = doc.querySelectorAll('input[placeholder*="about this"], input[placeholder*="Ask ieWorkspace AI"]');
        for (var i = 0; i < inputs.length; i++) {
          var pop = inputs[i].closest('.elx-ask-menu, .elx-ai-menu, [role="menu"], div');
          var cur = inputs[i].parentElement;
          for (var d = 0; d < 5 && cur && cur !== doc.body; d++) {
            var st = getComputedStyle(cur);
            if (st.position === 'fixed' || st.position === 'absolute') { pop = cur; break; }
            cur = cur.parentElement;
          }
          if (pop && pop.id !== 'ie-ctx-ai-popover' && !pop.closest('#ie-ai-win')) {
            pop.style.display = 'none';
            try { doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true })); } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }

  function openQuickAiPopover(doc, x, y) {
    closeQuickPopovers(doc);
    var kind = detectEditorType();
    var itemsByKind = {
      word: [
        { label: 'Rewrite', prompt: 'Rewrite this highlighted text to be clearer and more professional.' },
        { label: 'Shorten', prompt: 'Shorten this highlighted text while keeping the key points.' },
        { label: 'Fix spelling and grammar', prompt: 'Fix spelling and grammar in this highlighted text without changing its meaning.' },
        { label: 'Translate…', prefill: 'Translate to ' }
      ],
      cell: [
        { label: 'Write formula', prefill: 'Write an Excel formula to ' },
        { label: 'Explain formula', prompt: 'Explain what this selected Excel formula does.' },
        { label: 'Clean & format cell', prompt: 'Clean and format the selected cell text.' },
        { label: 'Translate…', prefill: 'Translate to ' }
      ],
      slide: [
        { label: 'Rewrite slide text', prompt: 'Rewrite this highlighted slide text into crisp, punchy bullets.' },
        { label: 'Shorten bullets', prompt: 'Shorten this slide text so it fits cleanly on one slide.' },
        { label: 'Fix spelling and grammar', prompt: 'Fix spelling and grammar in this slide text.' },
        { label: 'Translate…', prefill: 'Translate to ' }
      ],
      pdf: [
        { label: 'Rewrite', prompt: 'Rewrite this highlighted PDF text clearly and concisely.' },
        { label: 'Simplify text', prompt: 'Rewrite this highlighted PDF section in plain, simple English.' },
        { label: 'Fix spelling and grammar', prompt: 'Fix spelling and grammar in this highlighted PDF text.' },
        { label: 'Translate…', prefill: 'Translate to ' }
      ]
    };
    var items = itemsByKind[kind] || itemsByKind.word;

    var pop = doc.createElement('div');
    pop.id = 'ie-ctx-ai-popover';
    pop.style.cssText =
      'position:fixed;z-index:2147483550;width:280px;background:#ffffff;border:1px solid rgba(0,0,0,.14);' +
      'border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:8px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;';

    var maxL = Math.max(8, (doc.defaultView ? doc.defaultView.innerWidth : 900) - 296);
    var maxT = Math.max(8, (doc.defaultView ? doc.defaultView.innerHeight : 600) - 230);
    pop.style.left = Math.min(Math.max(8, x), maxL) + 'px';
    pop.style.top = Math.min(Math.max(8, y), maxT) + 'px';

    pop.innerHTML =
      '<div style="display:flex;align-items:center;gap:7px;border:1px solid #cbd5e1;border-radius:7px;padding:6px 9px;margin-bottom:6px;background:#fff;">' +
        '<span style="color:#6d4aff;font-size:15px;line-height:1;">&#10024;</span>' +
        '<input id="ie-ctx-ai-input" type="text" placeholder="Ask ieWorkspace AI about this…" style="border:none;outline:none;flex:1;font:13px/1.3 system-ui,sans-serif;color:#1d1d1f;background:transparent;" />' +
      '</div>' +
      '<div id="ie-ctx-ai-list" style="display:flex;flex-direction:column;"></div>';

    var list = pop.querySelector('#ie-ctx-ai-list');
    var input = pop.querySelector('#ie-ctx-ai-input');

    function runInstruction(txt) {
      var val = String(txt || '').trim();
      if (!val) return;
      pop.remove();
      if (typeof window._ieRunAIInstruction === 'function') {
        window._ieRunAIInstruction(val);
      }
    }

    items.forEach(function (it) {
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.textContent = it.label;
      btn.style.cssText = 'text-align:left;padding:8px 10px;border:none;border-radius:6px;background:transparent;color:#1d1d1f;font:400 13px/1.25 system-ui,sans-serif;cursor:pointer;';
      btn.addEventListener('mouseenter', function () { btn.style.background = '#f1f3f5'; });
      btn.addEventListener('mouseleave', function () { btn.style.background = 'transparent'; });
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (it.prefill) {
          input.value = it.prefill;
          input.focus();
        } else {
          runInstruction(it.prompt);
        }
      });
      list.appendChild(btn);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        runInstruction(input.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        pop.remove();
      }
    });

    doc.body.appendChild(pop);
    setTimeout(function () { input.focus(); }, 20);
  }

  function enhanceContextMenus(doc) {
    try {
      var menus = doc.querySelectorAll('ul.dropdown-menu, ul[role="menu"]');
      for (var i = 0; i < menus.length; i++) {
        var menu = menus[i];
        if (menu.offsetParent === null) continue;
        // Check for our actual item (NOT a data attribute, because ONLYOFFICE reuses the <ul> and replaces innerHTML!)
        if (menu.querySelector('.ie-ctx-ai-item')) continue;
        // Skip ribbon toolbar dropdowns
        if (menu.closest('#toolbar, .toolbar')) continue;
        var text = menu.textContent || '';
        if (!(/\b(Paste|Copy|Cut)\b/i.test(text))) continue;
        if (/Ask\s+(ieWorkspace\s+AI|Elixir)/i.test(text)) continue;

        // Find the Paste item (or Copy/Cut fallback) to insert directly after it
        var anchorLi = null;
        var lis = menu.children;
        for (var j = 0; j < lis.length; j++) {
          var lt = lis[j].textContent || '';
          if (/\bPaste\b/i.test(lt)) { anchorLi = lis[j]; break; }
          if (!anchorLi && /\b(Copy|Cut)\b/i.test(lt)) anchorLi = lis[j];
        }

        var li = doc.createElement('li');
        li.className = 'ie-ctx-ai-item';
        li.setAttribute('role', 'menuitem');
        li.innerHTML =
          '<a href="#" style="display:flex;align-items:center;gap:8px;padding:6px 14px;text-decoration:none;color:#1d1d1f;font:400 13px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">' +
            '<span style="color:#6d4aff;font-size:15px;line-height:1;">&#10024;</span><span>Ask ieWorkspace AI</span>' +
          '</a>';

        li.addEventListener('mousedown', function (e) {
          e.preventDefault();
          e.stopPropagation();
        });
        li.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var rect = menu.getBoundingClientRect();
          menu.style.display = 'none';
          try { doc.defaultView && doc.defaultView.Common && doc.defaultView.Common.UI && doc.defaultView.Common.UI.Menu && doc.defaultView.Common.UI.Menu.Manager && doc.defaultView.Common.UI.Menu.Manager.hideAll(); } catch (err) {}
          openQuickAiPopover(doc, rect.left, rect.top);
        });

        if (anchorLi && anchorLi.parentNode === menu) {
          anchorLi.insertAdjacentElement('afterend', li);
        } else {
          menu.insertBefore(li, menu.firstChild);
        }
      }
    } catch (e) {}
  }

  function attachRebrandObserver(frameWin) {
    if (!frameWin || !frameWin.document || !frameWin.document.body) return;
    var doc = frameWin.document;
    if (doc.body.getAttribute('data-ie-rebrand') === '1') return;
    doc.body.setAttribute('data-ie-rebrand', '1');
    rebrandSubtree(doc.body);
    upgradeNativeAiSettingsModal(doc, frameWin);
    attachRibbonTab(frameWin);
    enhanceContextMenus(doc);

    // Re-check context menu right after any right-click in Excel, Presentation, PDF, or Word
    doc.addEventListener('contextmenu', function () {
      setTimeout(function () { enhanceContextMenus(doc); }, 30);
      setTimeout(function () { enhanceContextMenus(doc); }, 120);
    }, true);

    // Click/tap anywhere on empty space outside quick AI popovers closes them immediately
    doc.addEventListener('pointerdown', function (e) {
      var target = e.target;
      if (target && target.closest && (target.closest('#ie-ctx-ai-popover') || target.closest('.ie-ctx-ai-item') || target.closest('.elx-ask-menu'))) return;
      var inNativePop = false;
      var cur = target;
      for (var d = 0; d < 6 && cur && cur !== doc.body; d++) {
        if (cur.querySelector && cur.querySelector('input[placeholder*="about this"]')) { inNativePop = true; break; }
        cur = cur.parentElement;
      }
      if (!inNativePop) closeQuickPopovers(doc);
    }, true);

    var mo = new MutationObserver(function (muts) {
      var added = false;
      var styleChanged = false;
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') {
          rebrandSubtree(m.target);
        } else if (m.type === 'attributes') {
          if (m.attributeName === 'style' || m.attributeName === 'class') styleChanged = true;
          else rebrandSubtree(m.target);
        } else if (m.addedNodes && m.addedNodes.length) {
          added = true;
          for (var j = 0; j < m.addedNodes.length; j++) rebrandSubtree(m.addedNodes[j]);
        }
      }
      if (added) {
        upgradeNativeAiSettingsModal(doc, frameWin);
        attachRibbonTab(frameWin);
      }
      if (added || styleChanged) enhanceContextMenus(doc);
    });
    mo.observe(doc.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'style', 'class']
    });
  }

  /* ---- Editor Detection & Smart Document Bridge ---- */
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
    var href = (window.location.href || '').toLowerCase();
    var title = (document.title || '').toLowerCase();
    var icon = document.querySelector('link[rel="icon"]');
    var iconHref = icon ? (icon.getAttribute('href') || '').toLowerCase() : '';
    var combined = href + ' ' + title + ' ' + iconHref;

    // Check PDF first because PDF forms run inside window.DE as well as window.PDFE
    if (/(\.pdf\b|fileext=pdf|pdf\.ico)/.test(combined)) return 'pdf';

    var w = getEditorFrameWin();
    if (w) {
      if (w.PDFE) return 'pdf';
      if (w.SSE) return 'cell';
      if (w.PE) return 'slide';
      if (w.DE) return 'word';
    }
    if (/(\.xlsx|\.xls|\.ods|\.csv|cell\.ico|spreadsheet|workbook)/.test(combined)) return 'cell';
    if (/(\.pptx|\.ppt|\.odp|slide\.ico|presentation)/.test(combined)) return 'slide';
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

  function readDocumentContext(kind) {
    return new Promise(function (resolve) {
      var w = getEditorFrameWin();
      if (!w || !w.Asc || !w.Asc.editor || typeof w.Asc.editor.callCommand !== 'function') return resolve('');
      var ed = w.Asc.editor;
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; resolve(''); } }, 1800);
      var script = '';
      if (kind === 'word') {
        script = '(function(){try{var d=Api.GetDocument();var n=Math.min(d.GetElementsCount(),60);var out=[];for(var i=0;i<n;i++){var el=d.GetElement(i);if(el&&el.GetText){var tx=el.GetText();if(tx&&tx.trim())out.push(tx);}}return out.join("\\n").slice(0,5000);}catch(e){return "";}})()';
      } else if (kind === 'cell') {
        script = '(function(){try{var sh=Api.GetActiveSheet();var r=sh.GetUsedRange();if(!r)return "";return JSON.stringify(r.GetValue2()).slice(0,4000);}catch(e){return "";}})()';
      } else if (kind === 'slide') {
        script = '(function(){try{var s=Api.GetPresentation().GetCurrentSlide();if(!s)return "";var sh=s.GetAllShapes();var out=[];for(var i=0;i<sh.length;i++){var dc=sh[i].GetDocContent();if(dc){for(var j=0;j<dc.GetElementsCount();j++){var tx=dc.GetElement(j).GetText();if(tx&&tx.trim())out.push(tx);}}}return out.join("\\n").slice(0,4000);}catch(e){return "";}})()';
      } else {
        clearTimeout(t);
        return resolve('');
      }
      try {
        ed.callCommand(script, true, function (val) {
          if (!done) { done = true; clearTimeout(t); resolve(val ? String(val).trim() : ''); }
        });
      } catch (e) {
        if (!done) { done = true; clearTimeout(t); resolve(''); }
      }
    });
  }

  function executeEditAction(actionObj, kind) {
    return new Promise(function (resolve) {
      var w = getEditorFrameWin();
      if (!w || !w.Asc || !w.Asc.editor) return resolve({ ok: false, summary: 'Editor is still loading.' });
      var ed = w.Asc.editor;

      try {
        // Action 1: Search & Replace in-place inside Word (works even when user didn't highlight!)
        if (actionObj.action === 'replace' && actionObj.find && typeof ed.callCommand === 'function') {
          var findStr = String(actionObj.find);
          var repStr = String(actionObj.replace != null ? actionObj.replace : '');
          if (kind === 'word') {
            var done = false;
            var t = setTimeout(function () { if (!done) { done = true; resolve({ ok: true, summary: 'Replaced "' + findStr + '" with "' + repStr + '".' }); } }, 2000);
            ed.callCommand(
              '(function(){var d=Api.GetDocument();d.SearchAndReplace({searchString:' + JSON.stringify(findStr) + ',replaceString:' + JSON.stringify(repStr) + ',matchCase:false});return true;})()',
              false,
              function () {
                if (!done) { done = true; clearTimeout(t); resolve({ ok: true, summary: 'Replaced "' + findStr + '" with "' + repStr + '".' }); }
              }
            );
            return;
          }
          if (kind === 'cell') {
            var cDone = false;
            var ct = setTimeout(function () { if (!cDone) { cDone = true; resolve({ ok: true, summary: 'Replaced "' + findStr + '" with "' + repStr + '".' }); } }, 2000);
            ed.callCommand(
              '(function(){var sh=Api.GetActiveSheet();var r=sh.GetUsedRange();if(r)r.Replace({What:' + JSON.stringify(findStr) + ',Replacement:' + JSON.stringify(repStr) + ',MatchCase:false});return true;})()',
              false,
              function () {
                if (!cDone) { cDone = true; clearTimeout(ct); resolve({ ok: true, summary: 'Replaced "' + findStr + '" with "' + repStr + '".' }); }
              }
            );
            return;
          }
        }

        // Action 2: Replace highlighted selection or insert text at cursor
        var text = String(actionObj.text != null ? actionObj.text : (actionObj.replace != null ? actionObj.replace : '')).trim();
        if (!text) return resolve({ ok: false, summary: 'Nothing to apply.' });

        if (kind === 'cell' && typeof ed.callCommand === 'function') {
          var firstLine = text.split(/\r?\n/)[0].trim();
          var xDone = false;
          var xt = setTimeout(function () { if (!xDone) { xDone = true; resolve({ ok: true, summary: 'Updated selected cell.' }); } }, 2000);
          ed.callCommand(
            '(function(){var s=Api.GetActiveSheet().GetSelection();if(s){s.SetValue(' + JSON.stringify(firstLine) + ');return true;}return false;})()',
            false,
            function (res) {
              if (!xDone) { xDone = true; clearTimeout(xt); resolve({ ok: !!res, summary: res ? 'Updated selected cell.' : 'Select a cell first.' }); }
            }
          );
          return;
        }

        var hasSel = false;
        try {
          if (typeof ed.asc_GetSelectedText === 'function') hasSel = String(ed.asc_GetSelectedText() || '').trim().length > 0;
        } catch (e) {}

        if (kind === 'slide' && !hasSel && typeof ed.callCommand === 'function') {
          var sDone = false;
          var st = setTimeout(function () { if (!sDone) { sDone = true; resolve({ ok: true, summary: 'Added text to current slide.' }); } }, 2000);
          ed.callCommand(
            '(function(){var p=Api.GetPresentation();var s=p&&p.GetCurrentSlide();if(!s)return false;' +
            'var sh=Api.CreateShape("rect",5500000,2600000,Api.CreateNoFill(),Api.CreateStroke(0,Api.CreateNoFill()));' +
            'sh.SetPosition(1200000,1500000);var dc=sh.GetDocContent();var lines=' + JSON.stringify(text) + '.split(/\\r?\\n/);' +
            'for(var i=0;i<lines.length;i++){var para=i===0?dc.GetElement(0):Api.CreateParagraph();para.AddText(lines[i]);if(i>0)dc.Push(para);}' +
            's.AddObject(sh);return true;})()',
            false,
            function (res) {
              if (!sDone) { sDone = true; clearTimeout(st); resolve({ ok: !!res, summary: 'Added text to current slide.' }); }
            }
          );
          return;
        }

        if (typeof ed.asc_PasteText === 'function') {
          ed.asc_PasteText(text);
          return resolve({ ok: true, summary: hasSel ? 'Replaced highlighted selection.' : 'Inserted into document.' });
        }
      } catch (err) {
        return resolve({ ok: false, summary: err && err.message ? err.message : String(err) });
      }
      resolve({ ok: false, summary: 'Could not modify directly. Use Copy instead.' });
    });
  }

  function parseAiAction(rawReply, hasSelection) {
    var trimmed = String(rawReply || '').trim().replace(/^```(?:json)?\r?\n?/i, '').replace(/\r?\n?```$/i, '').trim();
    if (!hasSelection && trimmed.charAt(0) === '{') {
      try {
        var obj = JSON.parse(trimmed);
        if (obj && (obj.action === 'replace' || obj.action === 'insert' || obj.action === 'reply')) {
          return obj;
        }
      } catch (e) {}
    }
    return { action: 'insert', text: trimmed };
  }

  var PROMPTS = {
    word: {
      badge: 'Word AI',
      selectionSystem: 'You are ieWorkspace AI modifying a highlighted section of a Word document. Return ONLY the exact replacement text to substitute for the highlighted selection—no quotes, no preamble, no markdown fences.',
      docSystem: 'You are ieWorkspace AI editing a Word document. You are given the current document text and a user instruction. Respond with a single JSON object (no markdown fences):\n- If the user wants to change/replace specific word(s) or a phrase in the document: {"action":"replace","find":"exact existing text from document","replace":"new replacement text"}\n- If the user wants to write/draft/add new content: {"action":"insert","text":"new text to insert"}\n- If the user is only asking a question: {"action":"reply","text":"your answer"}',
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
      selectionSystem: 'You are ieWorkspace AI editing an Excel cell directly. If asked for a formula, return ONLY the single Excel formula starting with = (no backticks, no explanation). Otherwise return ONLY the concise cell value.',
      docSystem: 'You are ieWorkspace AI editing an Excel spreadsheet. Respond with a single JSON object (no markdown fences):\n- To replace text across the sheet: {"action":"replace","find":"exact text","replace":"new text"}\n- To set a formula or value in the active cell: {"action":"insert","text":"=SUM(A1:A10) or value"}\n- To answer a question: {"action":"reply","text":"your answer"}',
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
      selectionSystem: 'You are ieWorkspace AI editing a highlighted section of a PowerPoint slide. Return ONLY the concise replacement text—no preamble or markdown fences.',
      docSystem: 'You are ieWorkspace AI editing a PowerPoint slide. Respond with a single JSON object (no markdown fences):\n- To insert new slide content/bullets: {"action":"insert","text":"concise slide text"}\n- To answer a question: {"action":"reply","text":"your answer"}',
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
      selectionSystem: 'You are ieWorkspace AI editing highlighted text in a PDF document. Return ONLY the clean replacement text—no preamble or markdown fences.',
      docSystem: 'You are ieWorkspace AI assisting with a PDF document. Respond with a single JSON object (no markdown fences):\n- To insert new text: {"action":"insert","text":"clean text to insert"}\n- To answer a question: {"action":"reply","text":"your answer"}',
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
      selectionSystem: 'You are ieWorkspace AI editing a document directly. Return ONLY the exact replacement text.',
      docSystem: 'You are ieWorkspace AI. Respond with JSON: {"action":"insert","text":"..."} or {"action":"reply","text":"..."}',
      chatSystem: 'You are ieWorkspace AI, a helpful assistant for documents, spreadsheets, presentations, and PDFs.',
      quick: [
        { label: 'Rewrite selection', prompt: 'Rewrite the selected text clearly and professionally.' },
        { label: 'Fix grammar', prompt: 'Fix spelling and grammar in the selected text.' },
        { label: 'Draft text', prompt: 'Draft a professional section about: ' },
        { label: 'Summarize', prompt: 'Summarize the selected text into concise bullet points.' }
      ]
    }
  };

  /* ---- Build File -> AI & Ribbon AI Settings UI inside editor iframe ---- */
  function buildBackstageSettingsPanel(doc, frameWin, compact) {
    var wrap = doc.createElement('div');
    wrap.id = compact ? 'ie-modal-ai' : 'ie-backstage-ai';
    wrap.style.cssText = compact
      ? 'padding:4px 0 16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;'
      : 'max-width:660px;padding:28px 36px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;';

    wrap.innerHTML =
      '<h1 style="margin:0 0 8px;font-size:' + (compact ? '20px' : '28px') + ';font-weight:600;color:#1d1d1f;">' + (compact ? 'AI settings' : 'ieWorkspace AI') + '</h1>' +
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

    function notifyNativeAI() {
      try {
        var fw = frameWin || getEditorFrameWin();
        if (!fw) return;
        fw.Common && fw.Common.NotificationCenter && fw.Common.NotificationCenter.trigger('elixir:ai-state', true);
        var app = fw.DE || fw.SSE || fw.PE;
        var ctrl = app && app.getController && app.getController('Common.Controllers.ElixirAI');
        if (ctrl && ctrl.refreshState) ctrl.refreshState();
      } catch (e) {}
    }

    wrap.querySelector('#ie-bs-save').addEventListener('click', function () {
      var cfg = readForm();
      saveConfig(cfg);
      notifyNativeAI();
      refreshFromStorage();
      statusEl.textContent = 'Saved! ieWorkspace AI is ready (' + cfg.model + ').';
    });

    wrap.querySelector('#ie-bs-remove').addEventListener('click', function () {
      clearConfig();
      notifyNativeAI();
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
    attachRebrandObserver(frameWin);
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
      aiPanel.appendChild(buildBackstageSettingsPanel(doc, frameWin, false));
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
    // Run continuously so Desktop (Windows/macOS/Linux) re-attaches whenever a new document iframe is opened or switched!
    setInterval(function () {
      var frames = document.querySelectorAll('iframe');
      for (var i = 0; i < frames.length; i++) {
        try {
          var fw = frames[i].contentWindow;
          if (!fw || !fw.document || !fw.document.body) continue;
          attachRebrandObserver(fw);
          attachToBackstage(fw);
          attachRibbonTab(fw);
        } catch (e) {}
      }
      // On Desktop shell (#workspace exists), show the round AI bubble only while a document is open
      var ws = document.getElementById('workspace');
      var fabEl = document.getElementById('ie-ai-fab');
      var winEl = document.getElementById('ie-ai-win');
      if (ws && fabEl) {
        var visible = !ws.hidden;
        fabEl.style.display = visible ? 'inline-flex' : 'none';
        if (!visible && winEl) winEl.classList.remove('open');
      }
    }, 500);
  }

  /* ---- Draggable Utility ---- */
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
      el.style.left = Math.min(maxL, Math.max(0, origL + dx)) + 'px';
      el.style.top = Math.min(maxT, Math.max(0, origT + dy)) + 'px';
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
      '.ie-ai-sel-badge{display:inline-flex;align-items:center;gap:5px;color:#006da8;font-weight:600;max-width:215px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
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
    var cachedSelection = '';

    fetch('/elixir-ai/config.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data && data.enabled) serverManaged = true; })
      .catch(function () {});

    var fab = document.createElement('button');
    fab.id = 'ie-ai-fab';
    fab.type = 'button';
    fab.title = 'ieWorkspace AI (drag to move, click to open)';
    fab.innerHTML = '<img src="' + logoSrc + '" alt="ieWorkspace AI" /><span class="ie-spark">&#10024;</span>';

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
        '<span class="ie-ai-sel-badge" id="ie-ai-sel-status">Document-aware mode</span>' +
        '<label class="ie-ai-toggle" title="Automatically apply AI edits directly into the document"><input type="checkbox" id="ie-ai-direct" checked /> Direct edit</label>' +
      '</div>' +
      '<div class="ie-ai-quick" id="ie-ai-quick"></div>' +
      '<div class="ie-ai-msgs" id="ie-ai-msgs"></div>' +
      '<div class="ie-ai-foot">' +
        '<textarea id="ie-ai-input" placeholder="e.g. Change mathematical to english, or highlight text to rewrite…"></textarea>' +
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
        cachedSelection = sel;
        if (sel) {
          selStatusEl.textContent = 'Selected: "' + (sel.length > 26 ? sel.slice(0, 26) + '…' : sel) + '"';
        } else {
          selStatusEl.textContent = 'Document-aware edit mode';
        }
        return sel;
      });
    }

    // Keep selection fresh while the floating window is open (before focus moves to textarea)
    setInterval(function () {
      if (win.classList.contains('open') && document.activeElement !== inputEl) {
        refreshSelectionBadge();
      }
    }, 900);

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
    window._ieToggleAIWin = toggleWin;

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

      if (role !== 'user' && (opts.actionObj || opts.showOpenSettings)) {
        var acts = document.createElement('div');
        acts.className = 'ie-ai-actions';
        if (opts.actionObj && opts.actionObj.action !== 'reply') {
          var applyBtn = document.createElement('button');
          applyBtn.type = 'button';
          applyBtn.className = 'ie-ai-act primary';
          applyBtn.textContent = opts.applied ? 'Applied ✓ (Re-apply)' : 'Apply to document';
          applyBtn.addEventListener('click', async function () {
            var res = await executeEditAction(opts.actionObj, kind);
            applyBtn.textContent = res.ok ? 'Applied ✓' : ('Could not apply: ' + (res.summary || 'try Copy'));
          });
          acts.appendChild(applyBtn);

          var copyText = opts.actionObj.replace != null ? opts.actionObj.replace : (opts.actionObj.text || body.textContent);
          var cp = document.createElement('button');
          cp.type = 'button';
          cp.className = 'ie-ai-act';
          cp.textContent = 'Copy';
          cp.addEventListener('click', function () {
            navigator.clipboard.writeText(copyText).then(function () {
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

    addMsg('bot', 'Highlight text to rewrite it, or simply ask me to edit anywhere in the document (e.g. "change mathematical to english"). Press Ctrl+Z anytime to undo!');

    async function send() {
      var instruction = inputEl.value.trim();
      if (!instruction) return;
      inputEl.value = '';

      var liveSel = await readDocumentSelection();
      var sel = liveSel || cachedSelection;
      addMsg('user', instruction + (sel ? '\n[Selection: "' + (sel.length > 60 ? sel.slice(0, 60) + '…' : sel) + '"]' : ''));

      var cfg = loadConfig();
      var p = getProvider(cfg.provider || 'openai');
      var useManaged = serverManaged && !cfg.apiKey && !p.noKeyRequired;

      if (!useManaged && !cfg.apiKey && !p.noKeyRequired) {
        addMsg('bot', 'No AI provider is configured yet. Open File → AI to choose a provider or sign in with OpenRouter.', { showOpenSettings: true });
        return;
      }

      var directMode = directChk.checked;
      var docContext = (!sel && directMode) ? await readDocumentContext(kind) : '';
      var sysPrompt = !directMode ? preset.chatSystem : (sel ? preset.selectionSystem : preset.docSystem);
      var userContent = sel
        ? ('Highlighted text:\n"""\n' + sel + '\n"""\n\nInstruction: ' + instruction)
        : (docContext
            ? ('Current document text:\n"""\n' + docContext + '\n"""\n\nInstruction: ' + instruction)
            : instruction);

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
            messages: [{ role: 'system', content: sysPrompt }].concat(history.slice(-6))
          })
        });
        var data = await res.json();
        if (!res.ok) throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
        var rawReply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
        history.push({ role: 'assistant', content: rawReply });

        thinking.div.remove();

        if (!directMode) {
          appendJournal({ when: new Date().toLocaleString(), editor: preset.badge, model: cfg.model || p.models[0], instruction: instruction, result: 'chat' });
          addMsg('bot', rawReply.trim() || 'No response received.', { actionObj: { action: 'insert', text: rawReply.trim() }, applied: false });
          return;
        }

        var actionObj = parseAiAction(rawReply, !!sel);
        if (actionObj.action === 'reply') {
          appendJournal({ when: new Date().toLocaleString(), editor: preset.badge, model: cfg.model || p.models[0], instruction: instruction, result: 'replied' });
          addMsg('bot', actionObj.text || rawReply.trim());
        } else {
          var applyRes = await executeEditAction(actionObj, kind);
          appendJournal({ when: new Date().toLocaleString(), editor: preset.badge, model: cfg.model || p.models[0], instruction: instruction, result: applyRes.ok ? 'applied' : 'failed' });
          var displayMsg = actionObj.action === 'replace'
            ? (applyRes.summary || ('Replaced "' + actionObj.find + '" → "' + actionObj.replace + '"'))
            : (actionObj.text || rawReply.trim());
          addMsg('bot', displayMsg, { actionObj: actionObj, applied: !!applyRes.ok });
        }
      } catch (err) {
        thinking.body.textContent = 'AI request failed: ' + (err && err.message ? err.message : String(err));
      } finally {
        sendBtn.disabled = false;
        msgsBox.scrollTop = msgsBox.scrollHeight;
      }
    }

    sendBtn.addEventListener('click', send);
    window._ieRunAIInstruction = function (text) {
      if (!win.classList.contains('open')) {
        win.classList.add('open');
        refreshSelectionBadge();
      }
      inputEl.value = String(text || '');
      send();
    };
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
