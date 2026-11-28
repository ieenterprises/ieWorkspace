/* ieWorkspace Desktop Sign-In Gate — verifies credentials online once against ieWorkspace server,
   then allows offline desktop usage on Windows, macOS, and Linux until the user signs out. */
(function () {
  'use strict';

  var AUTH_KEY = 'ieworkspace-desktop-auth-v1';
  var DEFAULT_SERVER = 'https://ieworkspace.apps.iecloudbase.com';

  function loadSession() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.token && parsed.user && parsed.user.email) return parsed;
      }
    } catch (e) {}
    return null;
  }

  function saveSession(session) {
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(session)); } catch (e) {}
  }

  function clearSession() {
    try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
  }

  function addSignOutBadge(session) {
    if (document.getElementById('ie-desk-user-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'ie-desk-user-bar';
    bar.style.cssText =
      'position:fixed;top:10px;right:14px;z-index:2147483500;display:inline-flex;align-items:center;gap:8px;' +
      'padding:4px 10px 4px 12px;border-radius:999px;background:#ffffff;border:1px solid #d1d5db;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.08);font:500 12px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;';
    var label = document.createElement('span');
    label.textContent = session.user.name || session.user.email;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Sign out';
    btn.style.cssText =
      'border:none;border-radius:999px;background:#fee2e2;color:#b91c1c;padding:4px 9px;font:600 11.5px/1 system-ui,sans-serif;cursor:pointer;';
    btn.addEventListener('click', function () {
      clearSession();
      bar.remove();
      showGate();
    });
    bar.appendChild(label);
    bar.appendChild(btn);
    document.body.appendChild(bar);

    // Hide badge while editing a document so it never overlaps editor chrome
    setInterval(function () {
      var ws = document.getElementById('workspace');
      if (ws && bar.isConnected) bar.style.display = ws.hidden ? 'inline-flex' : 'none';
    }, 500);
  }

  function showGate() {
    if (document.getElementById('ie-desk-auth-gate')) return;
    var gate = document.createElement('div');
    gate.id = 'ie-desk-auth-gate';
    gate.style.cssText =
      'position:fixed;inset:0;z-index:2147483640;display:flex;align-items:center;justify-content:center;' +
      'background:linear-gradient(145deg,#f3f7fb 0%,#e7f0f8 100%);padding:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;';

    gate.innerHTML =
      '<div style="width:100%;max-width:410px;background:#fff;border-radius:16px;box-shadow:0 16px 44px rgba(15,23,42,.14);padding:34px 32px 28px;border:1px solid rgba(0,0,0,.06);">' +
        '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:22px;">' +
          '<img src="/icon.png" alt="ieWorkspace" style="width:68px;height:68px;border-radius:50%;object-fit:contain;border:2px solid #e5e7eb;background:#fff;margin-bottom:10px;" />' +
          '<h1 style="margin:0;font-size:22px;font-weight:700;">Sign in to ieWorkspace</h1>' +
          '<p style="margin:6px 0 0;font-size:13px;color:#5b626b;">Use the account you created online. After signing in once, you can continue working offline.</p>' +
        '</div>' +
        '<div id="ie-desk-err" style="display:none;margin-bottom:12px;padding:10px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:12.5px;"></div>' +
        '<form id="ie-desk-form" style="display:flex;flex-direction:column;gap:12px;">' +
          '<label style="display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;color:#334155;">Email address' +
            '<input id="ie-desk-email" type="email" required placeholder="you@company.com" style="height:40px;padding:0 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;" />' +
          '</label>' +
          '<label style="display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;color:#334155;">Password' +
            '<input id="ie-desk-pass" type="password" required placeholder="Your password" style="height:40px;padding:0 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;" />' +
          '</label>' +
          '<details style="font-size:12px;color:#64748b;">' +
            '<summary style="cursor:pointer;">Server URL</summary>' +
            '<input id="ie-desk-server" type="url" value="' + DEFAULT_SERVER + '" style="margin-top:6px;width:100%;box-sizing:border-box;height:34px;padding:0 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;" />' +
          '</details>' +
          '<button type="submit" id="ie-desk-submit" style="height:42px;border:none;border-radius:8px;background:#0082c9;color:#fff;font:600 14.5px/1 system-ui,sans-serif;cursor:pointer;margin-top:4px;">Sign in</button>' +
        '</form>' +
        '<p style="margin:16px 0 0;text-align:center;font-size:12.5px;color:#475569;">Don\'t have an account yet? Sign up online at <strong>ieworkspace.apps.iecloudbase.com/signup</strong></p>' +
      '</div>';

    document.body.appendChild(gate);

    var errEl = gate.querySelector('#ie-desk-err');
    var btn = gate.querySelector('#ie-desk-submit');
    gate.querySelector('#ie-desk-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      errEl.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      try {
        var server = (gate.querySelector('#ie-desk-server').value || DEFAULT_SERVER).trim().replace(/\/+$/, '');
        var email = gate.querySelector('#ie-desk-email').value.trim();
        var password = gate.querySelector('#ie-desk-pass').value;
        var res = await fetch(server + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password })
        });
        var data = await res.json();
        if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Invalid email or password.');
        var session = { token: data.token, user: data.user, server: server };
        saveSession(session);
        gate.remove();
        addSignOutBadge(session);
      } catch (err) {
        errEl.textContent = (err && err.message) ? err.message : 'Could not reach ieWorkspace server. Check your internet connection.';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Sign in';
      }
    });
  }

  function init() {
    var session = loadSession();
    if (session) {
      addSignOutBadge(session);
    } else {
      showGate();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
