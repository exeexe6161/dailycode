/* ============================================================
   dailycode  Drittes Spiel  (Nexa)
   Einzelne geometrische Symbole fallen in ein Raster. Beruehren sich
   drei oder mehr gleiche Symbole orthogonal zusammenhaengend, loesen
   sie sich auf (Flood-Fill), darueber liegende fallen nach, was
   Kettenreaktionen ausloest. Symbole werden PRIMAER ueber ihre Form
   unterschieden, Farbe ist nur zusaetzliche Kennzeichnung, das Spiel
   bleibt in Graustufen spielbar.
   Vanilla JS, keine Libraries, keine externen Ressourcen, keine
   data-URI. Strikte CSP konform: keine Inline-Styles im Markup,
   dynamische Werte nur ueber CSSOM und Canvas. Theme und Sprache
   teilen die bestehenden Keys (dailycode:theme, dailycode:lang).
   i18n der Spieltexte folgt als eigener Schritt, die Texte liegen
   bereits hinter einem t() Muster.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Spielkonstanten ---------- */
  var COLS = 7;
  var ROWS = 12;
  var NTYPES = 5;                // Kreis, Dreieck, Quadrat, Raute, Stern
  var SPAWN_COL = 3;            // mittlere Spalte (0..6)
  var MIN_GROUP = 3;            // ab drei gleichen wird aufgeloest

  var FALL_BASE = 600;          // ms je Fallschritt bei Stufe 0
  var FALL_MIN = 180;           // Obergrenze fuer das Tempo (untere ms Grenze)
  var FALL_DEC = 42;            // ms schneller je Stufe
  var SOFT_MS = 45;             // Fallschritt bei Soft-Drop (schneller fallen)
  var CLEARS_PER_LEVEL = 10;    // alle 10 aufgeloeste Symbole eine Stufe schneller

  var BASE_POINTS = 10;         // Punkte je aufgeloestem Symbol (mal Kaskadentiefe)
  var SWIPE_MIN = 24;           // Mindestweg fuer eine Wischgeste in px
  var FLASH_MS = 260;           // Dauer der dezenten Aufloese-Blende (nur Zier)

  /* ---------- Sprache: minimaler t() Tisch (Deutsch) ---------- */
  var STR = {
    subtitle: 'Staple Formen, verbinde drei gleiche und mehr.',
    score: 'Punkte',
    lbl_best: 'Bestwert',
    best_none: 'noch keine',
    pause: 'Pause',
    resume: 'Weiter',
    restart: 'Neu',
    over_title: 'Spiel vorbei',
    over_restart: 'Neu starten',
    theme_group: 'Darstellung',
    theme_auto: 'Auto',
    theme_light: 'Hell',
    theme_dark: 'Dunkel',
    act_left: 'Nach links',
    act_right: 'Nach rechts',
    act_drop: 'Schneller fallen',
    aria_field: 'Spielfeld. Symbol mit Pfeiltasten oder WASD bewegen, runter faellt schneller, P pausiert.',
    aria_pause: 'Pausieren',
    aria_resume: 'Fortsetzen',
    aria_restart: 'Neu starten',
    help_summary: 'Hilfe',
    help_1: 'Pfeiltasten oder WASD bewegen, runter laesst schneller fallen, Wischen und Tippen geht auch.',
    help_2: 'Drei oder mehr gleiche Formen, die sich beruehren, loesen sich auf und geben Punkte.',
    help_3: 'Ketten geben Bonus. Vorbei ist es, wenn oben kein Platz mehr bleibt.',
    nav_privacy: 'Datenschutz',
    nav_imprint: 'Impressum',
    back: 'Zurueck',
    back_aria: 'Zurueck zur Startseite'
  };
  function t(key) {
    var v = STR[key];
    return v === undefined ? key : v;
  }

  /* ---------- Lucide Bedien-Icons (ISC), Pfade verbatim ---------- */
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" class="lucide" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  var ICON = {
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: svg('<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>'),
    monitor: svg('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>')
  };
  var THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };

  /* ---------- DOM ---------- */
  var themebarEl    = document.getElementById('themebar');
  var themeColorEl  = document.getElementById('themeColor');
  var themeFeedbackEl = document.getElementById('themeFeedback');
  var subtitleEl    = document.getElementById('subtitle');
  var scoreEl       = document.getElementById('score');
  var bestEl        = document.getElementById('best');
  var canvas        = document.getElementById('playfield');
  var overlayEl     = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlayTitle');
  var overlayScoreEl = document.getElementById('overlayScore');
  var overlayBtn    = document.getElementById('overlayBtn');
  var pauseBtn      = document.getElementById('pauseBtn');
  var restartBtn    = document.getElementById('restartBtn');
  var ctrlpadEl     = document.getElementById('ctrlpad');
  var linkPrivacyEl = document.getElementById('linkPrivacy');
  var linkImprintEl = document.getElementById('linkImprint');

  var ctx = (canvas && canvas.getContext) ? canvas.getContext('2d') : null;

  /* ---------- Theme Zustand (geteilte Keys mit Portal und Spielen) ---------- */
  var THEME_KEY = 'dailycode:theme';
  var LANG_KEY = 'dailycode:lang';
  var THEMES = ['auto', 'light', 'dark'];
  var hasStorage = storageOK();
  var theme = loadTheme();
  var systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = reduceMQ.matches;
  var themeToggleBtn = null;
  var fbTimer = 0;

  function storageOK() {
    try {
      var k = '__dc_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }
  function loadTheme() {
    if (hasStorage) {
      try {
        var v = window.localStorage.getItem(THEME_KEY);
        if (v === 'auto' || v === 'light' || v === 'dark') return v;
      } catch (e) { /* kein Storage */ }
    }
    return 'auto';
  }
  function saveTheme(v) {
    if (!hasStorage) return;
    try { window.localStorage.setItem(THEME_KEY, v); } catch (e) { /* nur Sitzung */ }
  }
  function loadLang() {
    if (hasStorage) {
      try {
        var v = window.localStorage.getItem(LANG_KEY);
        if (v === 'de' || v === 'en' || v === 'tr') return v;
      } catch (e) { /* kein Storage */ }
    }
    return 'de';
  }
  function effectiveDark() {
    return theme === 'dark' || (theme === 'auto' && systemDarkMQ.matches);
  }
  function updateThemeColor() {
    if (themeColorEl) themeColorEl.setAttribute('content', effectiveDark() ? '#0a0c11' : '#f4f5f7');
  }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeColor();
    refreshThemeBar();
    readColors();
    render();
  }
  function setTheme(v) {
    if (THEMES.indexOf(v) === -1) return;
    theme = v;
    saveTheme(v);
    applyTheme();
  }
  function buildThemeBar() {
    if (!themebarEl) return;
    themebarEl.innerHTML = '';
    themeToggleBtn = document.createElement('button');
    themeToggleBtn.type = 'button';
    themeToggleBtn.className = 'icon-btn theme-toggle';
    themeToggleBtn.addEventListener('click', cycleTheme);
    themebarEl.appendChild(themeToggleBtn);
    refreshThemeBar();
  }
  function cycleTheme() {
    var i = THEMES.indexOf(theme);
    setTheme(THEMES[(i + 1) % THEMES.length]);
    showThemeFeedback();
  }
  function showThemeFeedback() {
    if (!themeFeedbackEl) return;
    themeFeedbackEl.textContent = t('theme_' + theme);
    themeFeedbackEl.classList.add('show');
    if (fbTimer) window.clearTimeout(fbTimer);
    fbTimer = window.setTimeout(function () {
      themeFeedbackEl.classList.remove('show');
    }, 2200);
  }
  function refreshThemeBar() {
    if (!themeToggleBtn) return;
    themeToggleBtn.innerHTML = ICON[THEME_ICON[theme]];
    themeToggleBtn.setAttribute('aria-label', t('theme_group') + ': ' + t('theme_' + theme));
  }

  /* ---------- Canvas Farben aus Tokens lesen (Theme Parität) ---------- */
  var COL = { sym: [] };
  function cssVar(name) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
    catch (e) { return ''; }
  }
  function readColors() {
    COL.field  = cssVar('--field-bg')   || '#0e1119';
    COL.grid   = cssVar('--field-grid') || 'rgba(255,255,255,.05)';
    COL.glow   = cssVar('--sym-glow')   || 'transparent';
    COL.active = cssVar('--sym-active') || '#e9ecf3';
    COL.sym = [
      cssVar('--sym-1') || '#6b8cff',
      cssVar('--sym-2') || '#34d399',
      cssVar('--sym-3') || '#fbbf24',
      cssVar('--sym-4') || '#22d3ee',
      cssVar('--sym-5') || '#c084fc'
    ];
  }

  /* ---------- Spielzustand ----------
     grid[r][c]: null oder Symboltyp 0..NTYPES-1. r=0 ist oben. */
  var grid = [];
  var active = null;            // { r, c, type } fallendes Symbol, nicht Teil des Rasters
  var score = 0;
  var clearsTotal = 0;
  var level = 0;
  var stepMs = FALL_BASE;
  var softDrop = false;
  var paused = false;
  var over = false;

  var recent = [];              // zuletzt erzeugte Typen, begrenzt Wiederholungen
  var flashes = [];             // { r, c, type, t0 } dezente Aufloese-Blende, nur Zier

  var rafId = 0;
  var lastTs = 0;
  var acc = 0;

  function makeGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) row.push(null);
      grid.push(row);
    }
  }

  /* ---------- Spawn-Fairness: begrenzter Zufall ----------
     Verhindert lange Laeufe desselben Symbols (hoechstens zwei
     gleiche direkt hintereinander). Sorgt fuer Vielfalt, damit
     keine dauerhaft unloesbaren Lagen entstehen. */
  function pickType() {
    var cand = 0;
    for (var tries = 0; tries < 8; tries++) {
      cand = Math.floor(Math.random() * NTYPES);
      var n = recent.length;
      if (n >= 2 && recent[n - 1] === cand && recent[n - 2] === cand) { continue; }
      break;
    }
    recent.push(cand);
    if (recent.length > 4) recent.shift();
    return cand;
  }

  // Neues Symbol erscheint oben mittig und faellt. Es ist NICHT Teil
  // des Rasters, daher loest es im Moment des Erscheinens nichts aus.
  // Aufloesungen werden erst nach dem Einrasten geprueft, also nachdem
  // der Spieler Zeit zum Bewegen hatte. Ist die Spawnzelle belegt, ist
  // das Feld oben voll: Spielende.
  function spawn() {
    if (grid[0][SPAWN_COL] !== null) { gameOver(); return; }
    active = { r: 0, c: SPAWN_COL, type: pickType() };
  }

  function canPlace(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c] === null;
  }

  function lockActive() {
    grid[active.r][active.c] = active.type;
    active = null;
    resolveBoard();   // abgeschlossene Kaskaden Schleife
    if (!over) spawn();
  }

  // Ein Fallschritt des aktiven Symbols.
  function fallStep() {
    if (!active) { spawn(); return; }
    if (canPlace(active.r + 1, active.c)) { active.r += 1; }
    else { lockActive(); }
  }

  /* ---------- Verbinde-Logik: Flood-Fill, Aufloesen, Gravitation ----------
     Klar abgeschlossene Schleife:
     (a) im AKTUELLEN Rasterzustand ALLE Gruppen >= 3 per Flood-Fill finden,
     (b) gesammelt aufloesen und werten (Kaskadentiefe als Bonusfaktor),
     (c) Gravitation vollstaendig anwenden,
     (d) erneut ab (a), bis kein Aufloesen mehr passiert.
     Nicht waehrend des Nachfallens neu pruefen. */
  function findGroups() {
    var visited = [];
    for (var r = 0; r < ROWS; r++) {
      visited.push([]);
      for (var c = 0; c < COLS; c++) visited[r].push(false);
    }
    var groups = [];
    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        if (grid[r2][c2] === null || visited[r2][c2]) continue;
        var type = grid[r2][c2];
        // iterativer Flood-Fill (orthogonal), jede Zelle genau einmal besucht
        var comp = [];
        var stack = [[r2, c2]];
        visited[r2][c2] = true;
        while (stack.length) {
          var cur = stack.pop();
          var cr = cur[0], cc = cur[1];
          comp.push({ r: cr, c: cc });
          var neigh = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
          for (var k = 0; k < 4; k++) {
            var nr = neigh[k][0], nc = neigh[k][1];
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
            if (visited[nr][nc] || grid[nr][nc] !== type) continue;
            visited[nr][nc] = true;
            stack.push([nr, nc]);
          }
        }
        if (comp.length >= MIN_GROUP) groups.push(comp);
      }
    }
    return groups;
  }

  function applyGravity() {
    for (var c = 0; c < COLS; c++) {
      // Bestehende Symbole der Spalte in Reihenfolge oben nach unten sammeln.
      var stackVals = [];
      for (var r = 0; r < ROWS; r++) {
        if (grid[r][c] !== null) stackVals.push(grid[r][c]);
      }
      var empty = ROWS - stackVals.length;
      for (var r2 = 0; r2 < ROWS; r2++) {
        grid[r2][c] = (r2 < empty) ? null : stackVals[r2 - empty];
      }
    }
  }

  function resolveBoard() {
    var cascade = 0;
    var guard = 0;
    while (true) {
      if (++guard > ROWS * COLS) break;   // Sicherheitsnetz, kann real nie greifen
      var groups = findGroups();
      if (groups.length === 0) break;
      cascade += 1;
      var cleared = 0;
      var now = nowMs();
      for (var g = 0; g < groups.length; g++) {
        var comp = groups[g];
        for (var i = 0; i < comp.length; i++) {
          var cell = comp[i];
          // Blende NUR als Zier, ohne reduced-motion.
          if (!reduceMotion) flashes.push({ r: cell.r, c: cell.c, type: grid[cell.r][cell.c], t0: now });
          grid[cell.r][cell.c] = null;
          cleared += 1;
        }
      }
      // Punkte einmal je Kaskadenstufe: jede aufgeloeste Zelle zaehlt genau
      // einmal (Flood-Fill besucht jede Zelle nur einmal), Bonus ueber cascade.
      score += cleared * BASE_POINTS * cascade;
      clearsTotal += cleared;
      updateSpeed();
      updateScore();
      applyGravity();           // erst vollstaendig nachfallen, dann erneut pruefen
    }
    return cascade;
  }

  function nowMs() {
    return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
  }

  function updateSpeed() {
    level = Math.floor(clearsTotal / CLEARS_PER_LEVEL);
    stepMs = Math.max(FALL_MIN, FALL_BASE - level * FALL_DEC);
  }

  function updateScore() {
    if (scoreEl) scoreEl.textContent = t('score') + ' ' + score;
    updateBest();
  }

  /* ---------- Bestwert (einheitliches null-Muster, Vorbild grid9) ----------
     Score, hoeher ist besser. Kein gespeicherter Wert ergibt null, daher
     "noch keine" statt 0. hasStorage-Preflight, try/catch, Bereichspruefung. */
  function bestKey() { return 'dailycode:cluster:best'; }
  function loadBestVal() {
    if (!hasStorage) return null;
    try { var v = window.localStorage.getItem(bestKey()); if (v == null) return null; var n = parseInt(v, 10); return (isNaN(n) || n < 0) ? null : n; }
    catch (e) { return null; }
  }
  function saveBest(val) { if (!hasStorage) return; try { window.localStorage.setItem(bestKey(), String(val)); } catch (e) {} }
  function updateBest() {
    if (!bestEl) return;
    var v = loadBestVal();
    bestEl.textContent = t('lbl_best') + ' ' + ((v == null) ? t('best_none') : v);
  }

  /* ---------- Eingaben: Bewegung, Soft-Drop, Pause ---------- */
  function moveLeft() {
    if (over || paused || !active) return;
    if (canPlace(active.r, active.c - 1)) active.c -= 1;
  }
  function moveRight() {
    if (over || paused || !active) return;
    if (canPlace(active.r, active.c + 1)) active.c += 1;
  }
  function setSoftDrop(on) {
    if (over || paused) { softDrop = false; return; }
    softDrop = !!on;
  }

  /* ---------- Rendering ---------- */
  var cell = 0;
  function sizeCanvas() {
    if (!canvas || !ctx) return;
    var cssW = canvas.clientWidth || 280;
    var dpr = window.devicePixelRatio || 1;
    var w = Math.max(1, Math.round(cssW * dpr));
    canvas.width = w;
    canvas.height = Math.round(w * ROWS / COLS);
    cell = canvas.width / COLS;
  }

  function symbolPath(type, cx, cy, rad) {
    ctx.beginPath();
    if (type === 0) {                       // Kreis
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    } else if (type === 1) {                // Dreieck
      ctx.moveTo(cx, cy - rad);
      ctx.lineTo(cx + rad * 0.92, cy + rad * 0.72);
      ctx.lineTo(cx - rad * 0.92, cy + rad * 0.72);
      ctx.closePath();
    } else if (type === 2) {                // Quadrat
      var s = rad * 0.86;
      ctx.rect(cx - s, cy - s, s * 2, s * 2);
    } else if (type === 3) {                // Raute
      ctx.moveTo(cx, cy - rad);
      ctx.lineTo(cx + rad, cy);
      ctx.lineTo(cx, cy + rad);
      ctx.lineTo(cx - rad, cy);
      ctx.closePath();
    } else {                                // Stern (fuenf Zacken)
      for (var i = 0; i < 5; i++) {
        var ao = -Math.PI / 2 + i * 2 * Math.PI / 5;
        var ai = ao + Math.PI / 5;
        var ox = cx + Math.cos(ao) * rad, oy = cy + Math.sin(ao) * rad;
        var ix = cx + Math.cos(ai) * rad * 0.46, iy = cy + Math.sin(ai) * rad * 0.46;
        if (i === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
    }
  }

  function drawSymbol(type, gx, gy, opts) {
    var cx = gx * cell + cell / 2;
    var cy = gy * cell + cell / 2;
    var rad = cell * 0.36;
    var glowOn = effectiveDark() && !reduceMotion;
    ctx.save();
    if (glowOn && opts && opts.glow) { ctx.shadowColor = COL.glow; ctx.shadowBlur = cell * 0.5; }
    ctx.fillStyle = COL.sym[type];
    symbolPath(type, cx, cy, rad);
    ctx.fill();
    ctx.restore();
    // Aktives Symbol bekommt einen dezenten Ring zur Abhebung.
    if (opts && opts.active) {
      ctx.save();
      ctx.lineWidth = Math.max(1.5, cell * 0.06);
      ctx.strokeStyle = COL.active;
      symbolPath(type, cx, cy, rad + cell * 0.06);
      ctx.stroke();
      ctx.restore();
    }
  }

  function render(nowTs) {
    if (!ctx) return;
    var W = canvas.width, H = canvas.height;
    ctx.fillStyle = COL.field;
    ctx.fillRect(0, 0, W, H);

    // Raster
    ctx.strokeStyle = COL.grid;
    ctx.lineWidth = Math.max(1, cell * 0.02);
    ctx.beginPath();
    for (var c = 1; c < COLS; c++) { var px = Math.round(c * cell) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, H); }
    for (var r = 1; r < ROWS; r++) { var py = Math.round(r * cell) + 0.5; ctx.moveTo(0, py); ctx.lineTo(W, py); }
    ctx.stroke();

    // Gerasterte Symbole. Defensiv: noch nicht angelegte Rasterzeilen
    // ueberspringen, damit render() jeden Zustand uebersteht (Erststart,
    // Neustart nach Spielende, kuenftige Aufrufreihenfolgen).
    for (var rr = 0; rr < ROWS; rr++) {
      if (!grid[rr]) continue;
      for (var cc = 0; cc < COLS; cc++) {
        var ty = grid[rr][cc];
        if (ty !== null) drawSymbol(ty, cc, rr, { glow: false });
      }
    }

    // Dezente Aufloese-Blende (nur Zier, ohne reduced-motion)
    if (!reduceMotion && flashes.length) {
      var now = (nowTs || nowMs());
      var keep = [];
      for (var f = 0; f < flashes.length; f++) {
        var fl = flashes[f];
        var age = now - fl.t0;
        if (age >= FLASH_MS) continue;
        keep.push(fl);
        var a = 1 - age / FLASH_MS;
        ctx.save();
        ctx.globalAlpha = a * 0.7;
        ctx.shadowColor = COL.glow; ctx.shadowBlur = cell * 0.8;
        drawFlash(fl.type, fl.c, fl.r, a);
        ctx.restore();
      }
      flashes = keep;
    }

    // Aktives fallendes Symbol oben drueber
    if (active) drawSymbol(active.type, active.c, active.r, { glow: true, active: true });
  }

  function drawFlash(type, gx, gy, a) {
    var cx = gx * cell + cell / 2;
    var cy = gy * cell + cell / 2;
    var rad = cell * 0.36 * (1 + (1 - a) * 0.5);
    ctx.fillStyle = COL.sym[type];
    symbolPath(type, cx, cy, rad);
    ctx.fill();
  }

  /* ---------- Schleife: feste Schrittzeit, framerateunabhaengig ----------
     Gravitation und Aufloesen laufen synchron in resolveBoard innerhalb
     von fallStep, also NICHT bildbasiert. Das Rendering ist davon
     entkoppelt, die Blende ist reine Zier. */
  function frame(now) {
    if (!lastTs) lastTs = now;
    var dt = now - lastTs;
    lastTs = now;
    if (dt > 250) dt = 250;        // nach Tabwechsel keinen Riesensprung
    if (!paused && !over) {
      acc += dt;
      var interval = softDrop ? SOFT_MS : stepMs;
      var guard = 0;
      while (acc >= interval) {
        fallStep();
        acc -= interval;
        interval = softDrop ? SOFT_MS : stepMs;
        if (over) { acc = 0; break; }
        if (++guard > 40) { acc = 0; break; }
      }
    }
    render(now);
    if (rafId) { rafId = window.requestAnimationFrame(frame); }
  }

  function startLoop() {
    if (rafId || over || paused || document.hidden) return;
    lastTs = 0; acc = 0;
    rafId = window.requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
  }

  /* ---------- Zustaende: Pause, Spielende, Neustart ---------- */
  function setPauseLabels() {
    if (!pauseBtn) return;
    pauseBtn.textContent = paused ? t('resume') : t('pause');
    pauseBtn.setAttribute('aria-label', paused ? t('aria_resume') : t('aria_pause'));
  }
  function showOverlay(title, scoreText, btnText) {
    if (overlayTitleEl) overlayTitleEl.textContent = title;
    if (overlayScoreEl) { overlayScoreEl.textContent = scoreText || ''; overlayScoreEl.hidden = !scoreText; }
    if (overlayBtn) overlayBtn.textContent = btnText;
    if (overlayEl) overlayEl.hidden = false;
  }
  function hideOverlay() { if (overlayEl) overlayEl.hidden = true; }

  function pauseGame() {
    if (over || paused) return;
    paused = true; softDrop = false;
    stopLoop();
    setPauseLabels();
    showOverlay(t('pause'), '', t('resume'));
    render();
  }
  function resumeGame() {
    if (over || !paused) return;
    paused = false;
    hideOverlay();
    setPauseLabels();
    startLoop();
  }
  function togglePause() {
    if (over) return;
    if (paused) resumeGame(); else pauseGame();
  }

  function gameOver() {
    over = true; softDrop = false; active = null;
    stopLoop();
    render();
    var prev = loadBestVal();
    if (prev == null || score > prev) saveBest(score);
    var best = loadBestVal();
    updateBest();
    showOverlay(t('over_title'),
      t('score') + ' ' + score + (best != null ? '  ·  ' + t('lbl_best') + ' ' + best : ''),
      t('over_restart'));
    if (scoreEl) scoreEl.textContent = t('over_title') + ', ' + t('score') + ' ' + score;
  }

  function restartGame() {
    makeGrid();
    active = null;
    score = 0; clearsTotal = 0; level = 0; stepMs = FALL_BASE;
    softDrop = false; paused = false; over = false;
    recent = []; flashes = [];
    updateScore();
    setPauseLabels();
    hideOverlay();
    spawn();
    render();
    startLoop();
  }

  /* ---------- Tastatur ---------- */
  function onKeyDown(e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); moveLeft(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); moveRight(); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); setSoftDrop(true); }
    else if (k === 'p' || k === 'P') { e.preventDefault(); togglePause(); }
    else if (k === ' ' || k === 'Spacebar') {
      var tag = e.target && e.target.tagName;
      if (tag !== 'BUTTON' && tag !== 'SUMMARY' && tag !== 'A') { e.preventDefault(); togglePause(); }
    }
  }
  function onKeyUp(e) {
    var k = e.key;
    if (k === 'ArrowDown' || k === 's' || k === 'S') setSoftDrop(false);
  }

  /* ---------- Touch Knoepfe (links, schneller, rechts) ---------- */
  function bindCtrlpad() {
    if (!ctrlpadEl) return;
    var btns = ctrlpadEl.querySelectorAll('[data-act]');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        var act = btn.getAttribute('data-act');
        btn.setAttribute('aria-label', t('act_' + act));
        if (act === 'left') btn.addEventListener('click', moveLeft);
        else if (act === 'right') btn.addEventListener('click', moveRight);
        else if (act === 'drop') {
          // Halten beschleunigt, Loslassen stoppt. Pointer deckt Touch und Maus ab.
          btn.addEventListener('pointerdown', function (ev) { ev.preventDefault(); setSoftDrop(true); });
          btn.addEventListener('pointerup', function () { setSoftDrop(false); });
          btn.addEventListener('pointercancel', function () { setSoftDrop(false); });
          btn.addEventListener('pointerleave', function () { setSoftDrop(false); });
        }
      })(btns[i]);
    }
  }

  /* ---------- Touch auf dem Feld: Tippen und Wischen ---------- */
  var tStartX = 0, tStartY = 0, tActive = false, tMoved = false;
  function bindFieldTouch() {
    if (!canvas) return;
    canvas.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches.length) return;
      tActive = true; tMoved = false;
      tStartX = e.touches[0].clientX;
      tStartY = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
      if (tActive && e.cancelable) e.preventDefault();
      if (!tActive || !e.touches.length) return;
      var dx = e.touches[0].clientX - tStartX;
      var dy = e.touches[0].clientY - tStartY;
      if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
        // je Wisch-Schwelle ein Schritt, Startpunkt nachziehen (entprellt Mehrfachschritte)
        if (dx > 0) moveRight(); else moveLeft();
        tStartX = e.touches[0].clientX;
        tMoved = true;
      } else if (dy >= SWIPE_MIN && Math.abs(dy) > Math.abs(dx)) {
        setSoftDrop(true);
        tMoved = true;
      }
    }, { passive: false });
    canvas.addEventListener('touchend', function (e) {
      setSoftDrop(false);
      if (tActive && !tMoved) {
        // Tippen ohne Wischen: ein Schritt zur angetippten Seite (kein Durchklippen).
        var ch = (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0] : null;
        if (ch) {
          var rect = canvas.getBoundingClientRect();
          var rel = ch.clientX - rect.left;
          if (rel < rect.width / 2) moveLeft(); else moveRight();
        }
      }
      tActive = false;
    }, { passive: true });
  }

  /* ---------- Sichtbarkeit: Logik und Canvas bei verstecktem Tab anhalten ---------- */
  function onVisibility() {
    if (document.hidden) { softDrop = false; stopLoop(); }
    else { if (!paused && !over) startLoop(); }
  }
  function onReduceChange() { reduceMotion = reduceMQ.matches; render(); }

  /* ---------- Statische Texte und Rechtslinks ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    setText('navPrivacy', t('nav_privacy'));
    setText('navImprint', t('nav_imprint'));
    setText('backLabel', t('back'));
    var backLinkEl = document.getElementById('backLink');
    if (backLinkEl) backLinkEl.setAttribute('aria-label', t('back_aria'));
    setText('helpSummary', t('help_summary'));
    setText('help1', t('help_1'));
    setText('help2', t('help_2'));
    setText('help3', t('help_3'));
    setText('restartBtn', t('restart'));
    if (restartBtn) restartBtn.setAttribute('aria-label', t('aria_restart'));
    if (canvas) canvas.setAttribute('aria-label', t('aria_field'));
    setPauseLabels();
  }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  function setFooterLinks() {
    var lang = loadLang();
    if (linkPrivacyEl) linkPrivacyEl.setAttribute('href', '../datenschutz-' + lang + '.html');
    if (linkImprintEl) linkImprintEl.setAttribute('href', '../impressum-' + lang + '.html');
  }

  /* ---------- Service Worker: nur https oder localhost, nie ueber file:// ---------- */
  function registerServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) return;
      var proto = location.protocol;
      var host = location.hostname;
      var secure = (proto === 'https:') ||
                   (proto === 'http:' && (host === 'localhost' || host === '127.0.0.1' || host === '[::1]'));
      if (!secure) return; // ueber file:// leise nichts tun, Spiel bleibt voll spielbar
      window.addEventListener('load', function () {
        try {
          navigator.serviceWorker.register('sw.js').catch(function () { /* still ignorieren */ });
        } catch (e) { /* nie crashen */ }
      });
    } catch (e) { /* nie crashen */ }
  }

  /* ---------- Start ---------- */
  function init() {
    // Raster und Canvasgroesse MUESSEN stehen, bevor der erste render()
    // laeuft. applyTheme() ruft render() auf, daher kommt makeGrid()
    // (und sizeCanvas()) bewusst davor.
    makeGrid();
    sizeCanvas();
    readColors();

    buildThemeBar();
    applyTheme();
    applyTexts();
    setFooterLinks();
    bindCtrlpad();
    bindFieldTouch();

    updateScore();
    spawn();
    render();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    if (overlayBtn) overlayBtn.addEventListener('click', function () {
      if (over) restartGame(); else resumeGame();
    });

    if (systemDarkMQ.addEventListener) systemDarkMQ.addEventListener('change', function () { if (theme === 'auto') applyTheme(); });
    else if (systemDarkMQ.addListener) systemDarkMQ.addListener(function () { if (theme === 'auto') applyTheme(); });
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduceChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onReduceChange);

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { sizeCanvas(); render(); }, 150);
    });
    document.addEventListener('visibilitychange', onVisibility);

    registerServiceWorker();
    startLoop();
  }

  init();
})();
