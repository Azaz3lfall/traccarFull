(function () {
  'use strict';

  var MODEL   = 'J16+';
  var POLL_MS = 10000;
  var SCAN_MS = 800;

  // door=true  → PORTA ABERTA  (fio aterrado,    io1=false)
  // door=false → PORTA FECHADA (fio não aterrado, io1=true)
  var doorState  = {};  // deviceId → true | false | undefined
  var prevAlert  = {};  // deviceId → last alerted state
  var devInfo    = {};  // deviceId → {name, model}
  var j16Ids     = new Set();
  var lastPosMap = {};  // deviceId → last position object

  // ── Helpers ────────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function j16IdByName(name) {
    var found = null;
    j16Ids.forEach(function(id) {
      if (devInfo[id] && devInfo[id].name === name) found = id;
    });
    return found;
  }

  // ── Alerts ─────────────────────────────────────────────────────────────────
  var alertQueue = [], alertRunning = false;

  function queueAlert(devId, name, open) {
    alertQueue.push({ devId: devId, name: name, open: open });
    if (!alertRunning) drainAlerts();
  }
  function drainAlerts() {
    if (!alertQueue.length) { alertRunning = false; return; }
    alertRunning = true;
    var item = alertQueue.shift();
    showAlert(item.name, item.open);
    setTimeout(drainAlerts, 6500);
  }
  function maybeAlert(devId, name, open) {
    if (open === undefined) return;
    var prev = prevAlert[devId];
    if (prev === undefined) {
      prevAlert[devId] = open;
      if (open === true) queueAlert(devId, name, true);
      return;
    }
    if (prev === open) return;
    prevAlert[devId] = open;
    queueAlert(devId, name, open);
  }
  function showAlert(name, open) {
    var old = document.getElementById('j16-alert');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'j16-alert';
    var color = open ? '#ef4444' : '#22c55e';
    el.innerHTML =
      '<div class="j16-atitle" style="color:' + color + '">'
      + (open ? '🚨 PORTA ABERTA' : '✅ PORTA FECHADA')
      + '</div><div class="j16-asub">' + esc(name) + '</div>';
    document.body.appendChild(el);
    if (open) {
      try { var a = new Audio('/alarm.mp3'); a.volume = 0.7; a.play().catch(function(){}); } catch(e){}
    }
    setTimeout(function() {
      if (!el.parentNode) return;
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(-14px)';
      setTimeout(function() { if (el.parentNode) el.remove(); }, 420);
    }, 6000);
  }

  // ── Fetch interceptor ──────────────────────────────────────────────────────
  // Runs before React so React's own /api/positions calls are also intercepted.
  // Injects door:true when our cache says OPEN — Traccar's Ul() uses PRESENCE
  // of "door" attr (mode 2: isOpen = hasDoor), so injection makes it show OPEN.
  (function patchFetch() {
    var _orig = window.fetch;
    window.fetch = function(url, opts) {
      var resp = _orig.apply(this, arguments);
      if (typeof url !== 'string') return resp;

      if (/\/api\/devices(\?|$)/.test(url)) {
        resp.then(function(r) {
          r.clone().json().then(function(devs) {
            if (!Array.isArray(devs)) return;
            devs.forEach(function(d) {
              devInfo[d.id] = { name: d.name, model: d.model };
              if (d.model === MODEL) j16Ids.add(d.id);
              else j16Ids.delete(d.id);
            });
          }).catch(function(){});
        }).catch(function(){});
        return resp;
      }

      if (!/\/api\/positions/.test(url)) return resp;

      return resp.then(function(r) {
        if (!r.ok) return r;
        return r.clone().json().then(function(positions) {
          if (!Array.isArray(positions) || !positions.length) return r;
          var dirty = false;
          var out = positions.map(function(pos) {
            if (!j16Ids.has(pos.deviceId)) return pos;
            var attrs = pos.attributes || {};
            var info  = devInfo[pos.deviceId];
            var name  = info ? info.name : '';

            if (attrs.hasOwnProperty('door')) {
              var nowOpen = attrs.door === true;
              if (doorState[pos.deviceId] !== nowOpen) {
                doorState[pos.deviceId] = nowOpen;
                if (name) maybeAlert(pos.deviceId, name, nowOpen);
              } else {
                maybeAlert(pos.deviceId, name, nowOpen);
              }
              return pos;
            }
            if (attrs.hasOwnProperty('io1')) {
              var nowOpenIo1 = attrs.io1 === false;
              if (doorState[pos.deviceId] !== nowOpenIo1) {
                doorState[pos.deviceId] = nowOpenIo1;
                if (name) maybeAlert(pos.deviceId, name, nowOpenIo1);
              } else {
                maybeAlert(pos.deviceId, name, nowOpenIo1);
              }
            }
            if (doorState[pos.deviceId] === true) {
              dirty = true;
              return Object.assign({}, pos, {
                attributes: Object.assign({}, attrs, { door: true })
              });
            }
            return pos;
          });
          if (!dirty) return r;
          return new Response(JSON.stringify(out), {
            status: r.status, statusText: r.statusText,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }).catch(function() { return r; });
      }).catch(function() { return resp; });
    };
  })();

  // ── CSS ────────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('j16-styles')) return;
    var s = document.createElement('style');
    s.id = 'j16-styles';
    s.textContent = [
      /* VehicleCard dot */
      '.j16-vc-dot{display:inline-block;width:9px;height:9px;border-radius:50%;',
        'margin-left:6px;vertical-align:middle;flex-shrink:0;',
        'transition:background .4s,box-shadow .4s}',
      '.j16-vc-dot.open{background:#ef4444;box-shadow:0 0 5px #ef4444cc;animation:j16pulse 1s infinite}',
      '.j16-vc-dot.closed{background:#22c55e;box-shadow:none}',
      '.j16-vc-dot.unk{background:#475569;box-shadow:none}',
      /* Status card banner */
      '.j16-sc-banner{display:flex;align-items:center;gap:10px;',
        'padding:8px 20px;border-bottom:1px solid rgba(0,0,0,.08);',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.j16-sc-banner.open{background:rgba(239,68,68,.10)}',
      '.j16-sc-banner.closed{background:rgba(34,197,94,.08)}',
      '.j16-sc-banner.unk{background:rgba(71,85,105,.06)}',
      '.j16-sc-lbl{font-weight:800;font-size:13px;letter-spacing:.3px}',
      '.j16-sc-lbl.open{color:#dc2626}',
      '.j16-sc-lbl.closed{color:#16a34a}',
      '.j16-sc-lbl.unk{color:#64748b}',
      '.j16-sc-sensors{display:flex;align-items:center;gap:10px;margin-left:auto;font-size:11px;color:#94a3b8}',
      '.j16-ico{display:flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:#94a3b8}',
      '.j16-ico svg{display:block}',
      /* Alert toast */
      '#j16-alert{position:fixed;top:24px;left:50%;transform:translateX(-50%);',
        'background:rgba(15,23,42,.98);border:1px solid rgba(255,255,255,.12);',
        'border-radius:14px;padding:14px 22px;z-index:99999;',
        'box-shadow:0 12px 40px rgba(0,0,0,.55);color:#e2e8f0;',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
        'transition:opacity .4s,transform .4s;',
        'animation:j16toast .35s cubic-bezier(.34,1.56,.64,1);',
        'min-width:240px;text-align:center;pointer-events:none}',
      '.j16-atitle{font-size:16px;font-weight:800;letter-spacing:.5px;margin-bottom:4px}',
      '.j16-asub{font-size:12px;color:#94a3b8}',
      '@keyframes j16toast{from{transform:translateX(-50%) translateY(-28px);opacity:0}',
        'to{transform:translateX(-50%) translateY(0);opacity:1}}',
      '@keyframes j16pulse{0%,100%{opacity:1}50%{opacity:.45}}'
    ].join('');
    document.head.appendChild(s);
  }

  // ── SVG helpers ────────────────────────────────────────────────────────────
  function icoDoor(open) {
    return open
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#dc2626"><path d="M19 19V3L5 3v16H3v2h18v-2h-2zM13 13v-2h-2v2H9V7h6v6h-2z"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#16a34a"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';
  }
  function icoKey(on) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="' + (on ? '#16a34a' : '#9ca3af') + '"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>';
  }
  function icoPlug(on) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="' + (on ? '#16a34a' : '#9ca3af') + '"><path d="M16 7V3h-2v4h-4V3H8v4c0 2.21 1.79 4 4 4v5c0 .55-.45 1-1 1H9c-.55 0-1-.45-1-1v-3H6v3c0 1.66 1.34 3 3 3h2v3h2v-3h2c1.66 0 3-1.34 3-3v-3h-2v3c0 .55-.45 1-1 1h-2v-5c2.21 0 4-1.79 4-4z"/></svg>';
  }
  function icoBattery(level) {
    var c = level < 20 ? '#dc2626' : level < 40 ? '#d97706' : '#16a34a';
    var w = Math.max(1, Math.round((level / 100) * 13));
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="12" viewBox="0 0 22 12">'
      + '<rect x="0" y="1" width="18" height="10" rx="2" stroke="' + c + '" stroke-width="1.5" fill="none"/>'
      + '<rect x="18" y="3.5" width="3" height="5" rx="1" fill="' + c + '"/>'
      + '<rect x="1.5" y="2.5" width="' + w + '" height="7" rx="1" fill="' + c + '"/>'
      + '</svg>';
  }
  function icoSignal(sat) {
    var bars = sat === 0 ? 0 : sat < 3 ? 1 : sat < 6 ? 2 : sat < 9 ? 3 : sat < 12 ? 4 : 5;
    var r = '';
    for (var i = 0; i < 5; i++) {
      var h = (i + 1) * 2.2;
      r += '<rect x="' + (i*4) + '" y="' + (12-h) + '" width="3" height="' + h
        + '" rx="0.5" fill="' + (i < bars ? '#16a34a' : 'rgba(0,0,0,.15)') + '"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="21" height="12" viewBox="0 0 21 12">' + r + '</svg>';
  }
  function sensorBar(attrs) {
    var ign = attrs.ignition === true;
    var chg = attrs.charge   === true;
    var bat = typeof attrs.batteryLevel === 'number' ? attrs.batteryLevel : null;
    var sat = typeof attrs.sat === 'number' ? attrs.sat : 0;
    var adc = typeof attrs.adc1 === 'number' ? attrs.adc1.toFixed(1) : null;
    return '<span class="j16-ico">' + icoKey(ign) + '</span>'
      + (bat !== null ? '<span class="j16-ico">' + icoBattery(bat)
          + '<small style="color:' + (bat<20?'#dc2626':bat<40?'#d97706':'#94a3b8') + '">' + bat + '%</small></span>' : '')
      + '<span class="j16-ico">' + icoPlug(chg) + '</span>'
      + '<span class="j16-ico">' + icoSignal(sat) + '<small>' + sat + 'sat</small></span>'
      + (adc !== null ? '<span class="j16-ico" style="color:#3b82f6;font-weight:700">' + adc + 'V</span>' : '');
  }

  // ── VehicleCard dot ────────────────────────────────────────────────────────
  function scanVehicleCards() {
    var candidates = document.querySelectorAll('.MuiListItemText-primary');
    // Fallback: list items when MUI class not found
    if (!candidates.length) {
      candidates = document.querySelectorAll('[class*="MuiListItem"] span, [class*="MuiListItem"] div');
    }
    candidates.forEach(function(el) {
      if (el.dataset && el.dataset.j16scanned) {
        var dot = el.querySelector('.j16-vc-dot');
        if (dot && dot.dataset) updateVcDot(dot, Number(dot.dataset.devid));
        return;
      }
      var name = el.textContent && el.textContent.trim();
      if (!name) return;
      var devId = j16IdByName(name);
      if (devId === null) return;
      var dot = document.createElement('span');
      dot.className = 'j16-vc-dot unk';
      dot.dataset.devid = devId;
      dot.title = 'Sensor de Porta J16+';
      el.appendChild(dot);
      el.dataset.j16scanned = '1';
      updateVcDot(dot, devId);
    });
  }
  function updateVcDot(dot, devId) {
    var s = doorState[devId];
    dot.className = 'j16-vc-dot ' + (s === true ? 'open' : s === false ? 'closed' : 'unk');
    dot.title     = s === true ? '🚨 Porta Aberta' : s === false ? '✅ Porta Fechada' : 'Sensor de Porta J16+';
  }

  // ── Status card banner ─────────────────────────────────────────────────────
  function scanStatusCards() {
    var h2s = document.querySelectorAll('h2');
    h2s.forEach(function(h2) {
      if (!h2.parentElement) return;
      var txt = h2.textContent || '';
      j16Ids.forEach(function(devId) {
        var info = devInfo[devId];
        if (!info || txt.indexOf(info.name) === -1) return;

        var header    = (h2.closest && h2.closest('[style*="border-bottom"]')) || h2.parentElement;
        var container = header.parentElement || header;
        var existing  = container.querySelector('.j16-sc-banner[data-devid="' + devId + '"]');
        if (!existing) {
          var banner = document.createElement('div');
          banner.className  = 'j16-sc-banner';
          banner.dataset.devid = devId;
          container.insertBefore(banner, header.nextSibling);
          existing = banner;
        }
        updateScBanner(existing, devId);
      });
    });
  }
  function updateScBanner(el, devId) {
    var pos   = lastPosMap[devId];
    var attrs = (pos && pos.attributes) ? pos.attributes : {};
    var open  = doorState[devId];
    var cls   = open === true ? 'open' : open === false ? 'closed' : 'unk';
    var label = open === true ? '🚨 PORTA ABERTA' : open === false ? '✅ PORTA FECHADA' : '⚫ SEM DADOS';
    el.className = 'j16-sc-banner ' + cls;
    el.innerHTML  = icoDoor(open === true)
      + '<span class="j16-sc-lbl ' + cls + '">' + label + '</span>'
      + '<span class="j16-sc-sensors">' + sensorBar(attrs) + '</span>';
  }

  // ── DOM scan ───────────────────────────────────────────────────────────────
  function domScan() {
    scanVehicleCards();
    scanStatusCards();
  }
  function startObserver() {
    if (!window.MutationObserver) return;
    var obs = new MutationObserver(function() {
      clearTimeout(startObserver._t);
      startObserver._t = setTimeout(domScan, 250);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // ── State from position ────────────────────────────────────────────────────
  function learnFromPos(devId, attrs) {
    if (attrs.hasOwnProperty('door')) {
      doorState[devId] = attrs.door === true;
    } else if (attrs.hasOwnProperty('io1')) {
      doorState[devId] = attrs.io1 === false;
    }
    return doorState[devId];
  }

  // ── Polling ────────────────────────────────────────────────────────────────
  function poll() {
    fetch('/api/devices', { credentials: 'include' })
      .then(function(r) { return r.ok ? r.json() : []; })
      .then(function(devs) {
        devs.forEach(function(d) {
          devInfo[d.id] = { name: d.name, model: d.model };
          if (d.model === MODEL) j16Ids.add(d.id);
          else j16Ids.delete(d.id);
        });
        var j16devs = devs.filter(function(d) { return d.model === MODEL; });
        if (!j16devs.length) return;

        fetch('/api/positions', { credentials: 'include' })
          .then(function(r) { return r.ok ? r.json() : []; })
          .then(function(positions) {
            var posMap = {};
            positions.forEach(function(p) { posMap[p.deviceId] = p; });
            lastPosMap = posMap;
            j16devs.forEach(function(dev) {
              var attrs = (posMap[dev.id] && posMap[dev.id].attributes) ? posMap[dev.id].attributes : {};
              maybeAlert(dev.id, dev.name, learnFromPos(dev.id, attrs));
            });
            domScan();
          }).catch(function(){});
      }).catch(function(){});
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  var initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    injectStyles();
    startObserver();
    setInterval(domScan, SCAN_MS);
    poll();
    setInterval(poll, POLL_MS);
  }

  function waitForBody() {
    if (document.body) { init(); } else { setTimeout(waitForBody, 50); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForBody);
  } else {
    waitForBody();
  }

})();
