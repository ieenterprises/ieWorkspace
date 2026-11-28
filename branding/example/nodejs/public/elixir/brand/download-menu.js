/* ieWorkspace Desktop & Mobile Download Dropdown — non-invasive Home header widget */
(function () {
  'use strict';

  var RELEASE_BASE = 'https://github.com/ieenterprises/ieWorkspace/releases/latest/download';

  var DOWNLOADS = [
    {
      id: 'windows',
      label: 'Windows',
      detail: 'Windows (x64 / x86) · .exe installer',
      href: RELEASE_BASE + '/ieWorkspace-0.9.4-win-x64.exe',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5.55 10.35 4.5v7.05H3V5.55zm8.25-1.18L21 3v8.55h-9.75V4.37zM3 12.45h7.35v7.05L3 18.45v-6zm8.25 0H21V21l-9.75-1.37V12.45z"/></svg>'
    },
    {
      id: 'macos',
      label: 'macOS',
      detail: 'Apple Silicon · .dmg disk image',
      href: RELEASE_BASE + '/ieWorkspace-0.9.4-mac-arm64.dmg',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.96 6.33c.67-.81 1.12-1.94 1-3.08-.96.04-2.13.64-2.82 1.45-.61.7-.114 1.85-.99 2.96 1.07.08 2.15-.52 2.81-1.33z"/></svg>'
    },
    {
      id: 'linux',
      label: 'Linux',
      detail: 'Linux (64-bit) · .AppImage',
      href: RELEASE_BASE + '/ieWorkspace-0.9.4-x86_64.AppImage',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a4.5 4.5 0 0 0-4.5 4.5c0 1.4.4 2.7 1.1 3.8-.9 1.3-1.6 3-1.6 4.7 0 2.1 1.2 3.8 3 4.5-.2.5-.3 1-.3 1.5h4.6c0-.5-.1-1-.3-1.5 1.8-.7 3-2.4 3-4.5 0-1.7-.7-3.4-1.6-4.7.7-1.1 1.1-2.4 1.1-3.8A4.5 4.5 0 0 0 12 2zm-1.5 4.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM12 10c1.2 0 2 .6 2 1.2 0 .5-.9 1-2 1s-2-.5-2-1c0-.6.8-1.2 2-1.2z"/></svg>'
    },
    {
      id: 'android',
      label: 'Android',
      detail: 'Android · .apk installer',
      href: RELEASE_BASE + '/ieWorkspace-0.9.4-android.apk',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.6 9.48l1.84-3.18a.49.49 0 0 0-.18-.67.49.49 0 0 0-.67.18l-1.86 3.22A11.3 11.3 0 0 0 12 8c-1.72 0-3.33.38-4.73 1.03L5.41 5.81a.49.49 0 0 0-.67-.18.49.49 0 0 0-.18.67L6.4 9.48A10.7 10.7 0 0 0 1 18h22a10.7 10.7 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>'
    }
  ];

  function injectStyles() {
    if (document.getElementById('ie-download-style')) return;
    var style = document.createElement('style');
    style.id = 'ie-download-style';
    style.textContent =
      '.topbar .account{display:inline-flex;align-items:center;gap:10px;}' +
      '.ie-dl-wrap{position:relative;display:inline-flex;align-items:center;}' +
      '.ie-dl-btn{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 13px;border:1px solid #0082c9;border-radius:6px;background:#0082c9;color:#ffffff;font:600 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer;transition:background .15s,border-color .15s,box-shadow .15s;white-space:nowrap;}' +
      '.ie-dl-btn:hover,.ie-dl-btn:focus-visible{background:#006da8;border-color:#006da8;outline:none;box-shadow:0 0 0 2px rgba(0,130,201,.22);}' +
      '.ie-dl-btn svg{flex-shrink:0;}' +
      '.ie-dl-caret{transition:transform .15s;}' +
      '.ie-dl-wrap.open .ie-dl-caret{transform:rotate(180deg);}' +
      '.ie-dl-menu{position:absolute;top:calc(100% + 6px);right:0;min-width:255px;background:#ffffff;border:1px solid rgba(0,0,0,.12);border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.14);padding:6px;z-index:1000;display:none;}' +
      '.ie-dl-wrap.open .ie-dl-menu{display:block;}' +
      '.ie-dl-header{padding:6px 10px 4px;font:600 11px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-transform:uppercase;letter-spacing:.04em;color:#666;}' +
      '.ie-dl-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:7px;text-decoration:none;color:#1d1d1f;transition:background .12s;}' +
      '.ie-dl-item:hover,.ie-dl-item:focus-visible{background:#f0f7fc;outline:none;}' +
      '.ie-dl-icon{width:30px;height:30px;border-radius:7px;background:#eef6fb;color:#0082c9;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '.ie-dl-text{display:flex;flex-direction:column;gap:2px;min-width:0;}' +
      '.ie-dl-title{font:600 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;}' +
      '.ie-dl-sub{font:400 11.5px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#60656c;}' +
      '@media (max-width:600px){.ie-dl-btn span.ie-dl-label{display:none;}.ie-dl-btn{padding:0 10px;}}' +
      '.ie-bulk-bar{display:none;align-items:center;justify-content:space-between;gap:12px;padding:8px 14px;margin:8px 0 10px;border:1px solid #cfe4f5;border-radius:8px;background:#f0f7fc;font:500 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;}' +
      '.ie-bulk-bar.show{display:flex;flex-wrap:wrap;}' +
      '.ie-bulk-actions{display:inline-flex;align-items:center;gap:8px;}' +
      '.ie-bulk-btn{height:30px;padding:0 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#1d1d1f;font:600 12.5px/1 system-ui,sans-serif;cursor:pointer;}' +
      '.ie-bulk-btn:hover{background:#f3f4f6;}' +
      '.ie-bulk-btn.danger{border-color:#fca5a5;color:#b91c1c;}' +
      '.ie-bulk-btn.danger:hover{background:#fef2f2;}' +
      '.ie-chk-col{width:34px;text-align:center;padding:0 4px !important;}' +
      '.ie-row-chk,.ie-all-chk{width:15px;height:15px;cursor:pointer;accent-color:#0082c9;}';
    document.head.appendChild(style);
  }

  function mount() {
    if (document.getElementById('ie-dl-wrap')) return;
    var account = document.querySelector('header.topbar .account');
    if (!account) return;

    injectStyles();

    var wrap = document.createElement('div');
    wrap.id = 'ie-dl-wrap';
    wrap.className = 'ie-dl-wrap';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ie-dl-btn';
    btn.id = 'ie-dl-btn';
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'ie-dl-menu');
    btn.title = 'Download ieWorkspace';
    btn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
      '<span class="ie-dl-label">Download</span>' +
      '<svg class="ie-dl-caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

    var menu = document.createElement('div');
    menu.id = 'ie-dl-menu';
    menu.className = 'ie-dl-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-labelledby', 'ie-dl-btn');

    var header = document.createElement('div');
    header.className = 'ie-dl-header';
    header.textContent = 'Download ieWorkspace';
    menu.appendChild(header);

    DOWNLOADS.forEach(function (item) {
      var a = document.createElement('a');
      a.className = 'ie-dl-item';
      a.href = item.href;
      a.setAttribute('role', 'menuitem');
      a.setAttribute('download', '');
      a.setAttribute('rel', 'noopener noreferrer');
      a.innerHTML =
        '<span class="ie-dl-icon">' + item.icon + '</span>' +
        '<span class="ie-dl-text">' +
          '<span class="ie-dl-title">' + item.label + '</span>' +
          '<span class="ie-dl-sub">' + item.detail + '</span>' +
        '</span>';
      a.addEventListener('click', function () {
        closeMenu();
      });
      menu.appendChild(a);
    });

    function closeMenu() {
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }

    function toggleMenu(e) {
      e.stopPropagation();
      var isOpen = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    btn.addEventListener('click', toggleMenu);
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    account.insertBefore(wrap, account.firstChild);

    // Also keep "Blank PDF form" visible under Start new on Home & New views
    function syncBlankPdfTile() {
      var pdfTile = document.querySelector('#tiles .tile-blank[data-type="pdf"]');
      if (!pdfTile) return;
      var h = (window.location.hash || '#home').toLowerCase();
      if (h === '' || h === '#' || h === '#home' || h === '#new' || h === '#pdf') {
        pdfTile.hidden = false;
        pdfTile.style.display = '';
      }
    }
    syncBlankPdfTile();
    window.addEventListener('hashchange', function () { setTimeout(syncBlankPdfTile, 30); });
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.rail-item')) {
        setTimeout(syncBlankPdfTile, 30);
      }
    });

    // Multi-select checkboxes + bulk actions (Open, Download, Delete) for Recent documents
    function setupRecentMultiSelect() {
      var tbody = document.getElementById('files-body');
      if (!tbody) return;
      var table = tbody.closest('table');
      if (!table || table.getAttribute('data-ie-multi') === '1') return;
      table.setAttribute('data-ie-multi', '1');

      var theadRow = table.querySelector('thead tr');
      var selectAll = null;
      if (theadRow && !theadRow.querySelector('.ie-chk-col')) {
        var th = document.createElement('th');
        th.className = 'ie-chk-col';
        th.innerHTML = '<input type="checkbox" class="ie-all-chk" aria-label="Select all documents" />';
        theadRow.insertBefore(th, theadRow.firstChild);
        selectAll = th.querySelector('.ie-all-chk');
      }

      var bar = document.createElement('div');
      bar.className = 'ie-bulk-bar';
      bar.id = 'ie-bulk-bar';
      bar.innerHTML =
        '<span id="ie-bulk-count">0 selected</span>' +
        '<div class="ie-bulk-actions">' +
          '<button type="button" class="ie-bulk-btn" data-bulk="open">Open</button>' +
          '<button type="button" class="ie-bulk-btn" data-bulk="download">Download</button>' +
          '<button type="button" class="ie-bulk-btn danger" data-bulk="delete">Delete</button>' +
          '<button type="button" class="ie-bulk-btn" data-bulk="clear">Clear</button>' +
        '</div>';
      table.parentNode.insertBefore(bar, table);

      function getRowName(tr) {
        if (tr.dataset && tr.dataset.name) return tr.dataset.name;
        var link = tr.querySelector('a[href*="fileName="]');
        if (link) {
          try {
            var u = new URL(link.getAttribute('href'), window.location.href);
            var fn = u.searchParams.get('fileName');
            if (fn) return fn;
          } catch (e) {}
        }
        var nameEl = tr.querySelector('.file-name, a, td:nth-child(2)');
        return nameEl ? nameEl.textContent.trim() : '';
      }

      function getSelectedNames() {
        var checks = tbody.querySelectorAll('.ie-row-chk:checked');
        var names = [];
        for (var i = 0; i < checks.length; i++) {
          var tr = checks[i].closest('tr');
          var n = tr ? getRowName(tr) : '';
          if (n) names.push(n);
        }
        return names;
      }

      function updateBar() {
        var names = getSelectedNames();
        bar.querySelector('#ie-bulk-count').textContent = names.length + ' document' + (names.length === 1 ? '' : 's') + ' selected';
        bar.classList.toggle('show', names.length > 0);
        if (selectAll) {
          var total = tbody.querySelectorAll('.ie-row-chk').length;
          selectAll.checked = total > 0 && names.length === total;
          selectAll.indeterminate = names.length > 0 && names.length < total;
        }
      }

      function decorateRows() {
        var rows = tbody.querySelectorAll('tr');
        for (var i = 0; i < rows.length; i++) {
          var tr = rows[i];
          if (tr.querySelector('.ie-chk-col')) continue;
          var td = document.createElement('td');
          td.className = 'ie-chk-col';
          var chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.className = 'ie-row-chk';
          chk.setAttribute('aria-label', 'Select ' + (getRowName(tr) || 'document'));
          chk.addEventListener('click', function (e) { e.stopPropagation(); });
          chk.addEventListener('change', updateBar);
          td.appendChild(chk);
          tr.insertBefore(td, tr.firstChild);
        }
        updateBar();
      }

      if (selectAll) {
        selectAll.addEventListener('change', function () {
          var checks = tbody.querySelectorAll('.ie-row-chk');
          for (var i = 0; i < checks.length; i++) checks[i].checked = selectAll.checked;
          updateBar();
        });
      }

      bar.addEventListener('click', async function (e) {
        var b = e.target && e.target.closest ? e.target.closest('button[data-bulk]') : null;
        if (!b) return;
        var act = b.getAttribute('data-bulk');
        var names = getSelectedNames();
        if (act === 'clear') {
          var checks = tbody.querySelectorAll('.ie-row-chk');
          for (var i = 0; i < checks.length; i++) checks[i].checked = false;
          updateBar();
          return;
        }
        if (!names.length) return;
        if (act === 'open') {
          names.forEach(function (n) {
            window.open('editor?fileName=' + encodeURIComponent(n), '_blank', 'noopener');
          });
        } else if (act === 'download') {
          names.forEach(function (n, idx) {
            setTimeout(function () {
              var a = document.createElement('a');
              a.href = 'download?fileName=' + encodeURIComponent(n);
              a.download = n;
              document.body.appendChild(a);
              a.click();
              a.remove();
            }, idx * 250);
          });
        } else if (act === 'delete') {
          if (!window.confirm('Delete ' + names.length + ' selected document(s) permanently?')) return;
          for (var d = 0; d < names.length; d++) {
            try {
              await fetch('file?filename=' + encodeURIComponent(names[d]), { method: 'DELETE' });
            } catch (err) {}
          }
          window.location.reload();
        }
      });

      decorateRows();
      var mo = new MutationObserver(function () { decorateRows(); });
      mo.observe(tbody, { childList: true });
    }

    setupRecentMultiSelect();

    // Sync signed-in ieWorkspace user, suppress anonymous "What's your name?" prompt, and add Sign out
    (function setupWebAuthProfile() {
      function dismissNameDialog() {
        var dlgs = document.querySelectorAll('dialog[open]');
        for (var i = 0; i < dlgs.length; i++) {
          var txt = dlgs[i].textContent || '';
          if (/What.{1,3}s your name/i.test(txt)) {
            try { dlgs[i].close(); } catch (e) { dlgs[i].removeAttribute('open'); }
          }
        }
      }
      dismissNameDialog();
      var mo = new MutationObserver(dismissNameDialog);
      mo.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['open'] });

      fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.authenticated || !data.user) return;
          var u = data.user;
          try { localStorage.setItem('ieworkspace-user', JSON.stringify(u)); } catch (e) {}
          var initials = (u.name || u.email || 'U').trim().split(/\s+/).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
          var btn = document.getElementById('account-btn');
          if (btn) {
            btn.title = u.name + ' (' + u.email + ')';
            btn.setAttribute('aria-label', 'Account: ' + u.name);
            var av = btn.querySelector('.avatar');
            if (av) av.textContent = initials;
          }
          // Add user info + Sign out button into the Account panel
          var panel = document.getElementById('account-panel');
          if (panel && !document.getElementById('ie-web-signout')) {
            var box = document.createElement('div');
            box.id = 'ie-web-signout';
            box.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;';
            box.innerHTML =
              '<div style="min-width:0;overflow:hidden;"><div style="font-weight:600;color:#1d1d1f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div><div style="color:#64748b;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div></div>' +
              '<button type="button" style="flex-shrink:0;height:30px;padding:0 12px;border:1px solid #fca5a5;border-radius:6px;background:#fff;color:#b91c1c;font-weight:600;font-size:12px;cursor:pointer;">Sign out</button>';
            box.children[0].children[0].textContent = u.name;
            box.children[0].children[1].textContent = u.email;
            box.querySelector('button').addEventListener('click', function () {
              fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
                .finally(function () {
                  try { localStorage.removeItem('ieworkspace-user'); } catch (e) {}
                  window.location.replace('/login');
                });
            });
            panel.appendChild(box);
          }
        })
        .catch(function () {});
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
