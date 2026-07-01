/* ============================================================
   dailycode  Achtes Spiel  (Fluxa)
   Wege-Verbindungsraetsel: Farbige Endpunktpaare auf einem Gitter mit
   zusammenhaengenden orthogonalen Wegen verbinden. Ziel (streng): alle
   Paare verbunden UND jedes Feld belegt (volles Gitter). Wege kreuzen
   und ueberlappen nicht.

   GENERATOR (Kern, garantiert volle Lösung): Rueckwaerts aus einer
   Konstruktionsloesung. Erst EIN Hamilton-Pfad (Backtracking mit
   Warnsdorff-Heuristik plus zufaelliger Tie-Break-Reihenfolge), der
   jedes Feld genau einmal besucht. Schlaegt das in der Versuchsgrenze
   fehl, Fallback auf eine deterministische Serpentine (existiert immer).
   Der Pfad wird in K Segmente (Mindestlaenge 3) geschnitten; die beiden
   Enden jedes Segments sind ein Endpunktpaar. Da der Hamilton-Pfad das
   ganze Gitter abdeckt, partitionieren die Segmente es lueckenlos: kein
   leeres, kein isoliertes Feld, und die Konstruktion IST eine Loesung.
   Mehrdeutigkeit ist bewusst erlaubt (Genre-typisch).

   EINGABE: Ziehen per Pointer Events (Touch und Maus), setPointerCapture
   fuer fluessiges Ziehen. Ueberschreiben: zieht ein Weg in ein fremdes
   Wegfeld, wird der fremde Weg dort abgeschnitten. Loeschen per Tippen.
   Tastatur als Zusatz (Ziffer waehlt Farbe, Pfeile verlaengern).

   Vanilla JS, keine Libraries, keine externen Ressourcen, keine data-URI.
   Strikte CSP konform: keine Inline-Styles, Theme ueber data-Attribut,
   Spielfeldfarben zur Laufzeit aus CSS Variablen gelesen, Canvas-Pixel
   ueber CSSOM. Theme und Sprache teilen die bestehenden Keys.

   Lehre aus dem dritten Spiel (cluster): in init() erst die
   Datenstrukturen (Gitter, Loesung, Endpunkte, Wege-Zustand), dann der
   erste Render. Render und Update sind defensiv gegen einen leeren
   Zustand abgesichert (kein Crash bei Start, Neustart, neuer Stufe).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Progression (dokumentiert): Gitter und Paarzahl je Stufe ----------
     Stufe 1..2 -> 5x5 / 3 Paare, 3..4 -> 6x6 / 4, 5..6 -> 7x7 / 5,
     ab 7 -> 8x8 / 6. Obergrenze 8x8 (touchfreundlich, Felder >= 44px). */
  function levelConfig(level) {
    if (level <= 2) return { N: 5, K: 3 };
    if (level <= 4) return { N: 6, K: 4 };
    if (level <= 6) return { N: 7, K: 5 };
    return { N: 8, K: 6 };
  }
  var MIN_SEG = 3; // Mindestlaenge je Segment, damit Endpunkte distinkt sind

  /* ---------- Sprache: minimaler t() Tisch (Deutsch) ---------- */
  var STR = {
    subtitle: 'Verbinde die gleichen Punkte und fuelle das ganze Gitter.',
    lbl_level: 'Stufe',
    lbl_fill: 'Felder',
    lbl_best: 'Bestwert',
    best_none: 'noch keine',
    btn_clear: 'Alles loeschen',
    btn_new: 'Neues Raetsel',
    btn_restart: 'Neu starten',
    btn_continue: 'Weiter',
    aria_clear: 'Alle Wege loeschen',
    aria_new: 'Neues Raetsel der gleichen Stufe',
    aria_restart: 'Lauf bei Stufe eins neu starten',
    aria_board: 'Wege-Gitter. Ziehe von einem Punkt zum gleichfarbigen Punkt. Mit der Tastatur: Ziffer waehlt ein Paar, Pfeiltasten ziehen den Weg, Entf loescht.',
    loading: 'Erzeuge Raetsel',
    msg_go: 'Verbinde die Paare und fuelle das Gitter',
    msg_pair: 'Paar {n} verbunden',
    msg_pair_open: 'Paar {n} wieder offen',
    msg_full: 'Gitter voll',
    msg_cleared: 'Weg geloescht',
    msg_color: 'Farbe {n} gewaehlt',
    solved_title: 'Stufe geloest',
    solved_score: 'Stufe {n} geschafft',
    theme_group: 'Darstellung',
    theme_auto: 'Auto',
    theme_light: 'Hell',
    theme_dark: 'Dunkel',
    help_summary: 'Hilfe',
    help_1: 'Ziehe mit dem Finger oder der Maus von einem Punkt entlang der Felder zum gleichfarbigen Punkt. Jeder Punkt traegt zusaetzlich eine Ziffer.',
    help_2: 'Ein Weg darf einen anderen ueberschreiben, der fremde Weg wird dort abgeschnitten. Tippe einen Punkt oder Weg kurz an, um ihn zu loeschen.',
    help_3: 'Geloest ist die Stufe, wenn alle Paare verbunden sind und jedes Feld belegt ist. Dann waechst das Gitter.',
    nav_privacy: 'Datenschutz',
    nav_imprint: 'Impressum',
    back: 'Zurueck',
    back_aria: 'Zurueck zur Startseite'
  };
  function t(key) { var v = STR[key]; return v === undefined ? key : v; }
  function fmt(key, map) {
    var s = t(key);
    for (var k in map) { if (map.hasOwnProperty(k)) { s = s.replace('{' + k + '}', String(map[k])); } }
    return s;
  }

  /* ---------- Lucide Bedien-Icons (ISC) ---------- */
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
  var statusEl      = document.getElementById('status');
  var hudLevelEl    = document.getElementById('hudLevel');
  var hudFillEl     = document.getElementById('hudFill');
  var hudBestEl     = document.getElementById('hudBest');
  var canvas        = document.getElementById('board');
  var ctx           = canvas ? canvas.getContext('2d') : null;
  var overlayEl     = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlayTitle');
  var overlayScoreEl = document.getElementById('overlayScore');
  var overlayBtn    = document.getElementById('overlayBtn');
  var clearBtn      = document.getElementById('clearBtn');
  var newBtn        = document.getElementById('newBtn');
  var restartBtn    = document.getElementById('restartBtn');
  var linkPrivacyEl = document.getElementById('linkPrivacy');
  var linkImprintEl = document.getElementById('linkImprint');

  /* ---------- Theme Zustand (geteilte Keys) ---------- */
  var THEME_KEY = 'dailycode:theme';
  var LANG_KEY = 'dailycode:lang';
  var THEMES = ['auto', 'light', 'dark'];
  var hasStorage = storageOK();
  var theme = loadTheme();
  var systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var themeToggleBtn = null;
  var fbTimer = 0;

  function storageOK() {
    try { var k = '__dc_test__'; window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  }
  function loadTheme() {
    if (hasStorage) { try { var v = window.localStorage.getItem(THEME_KEY); if (v === 'auto' || v === 'light' || v === 'dark') return v; } catch (e) {} }
    return 'auto';
  }
  function saveTheme(v) { if (!hasStorage) return; try { window.localStorage.setItem(THEME_KEY, v); } catch (e) {} }
  function loadLang() {
    if (hasStorage) { try { var v = window.localStorage.getItem(LANG_KEY); if (v === 'de' || v === 'en' || v === 'tr') return v; } catch (e) {} }
    return 'de';
  }
  function effectiveDark() { return theme === 'dark' || (theme === 'auto' && systemDarkMQ.matches); }
  function updateThemeColor() { if (themeColorEl) themeColorEl.setAttribute('content', effectiveDark() ? '#0a0c11' : '#f4f5f7'); }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeColor();
    refreshThemeBar();
    readColors();
    requestDraw();
  }
  function setTheme(v) { if (THEMES.indexOf(v) === -1) return; theme = v; saveTheme(v); applyTheme(); }
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
  function cycleTheme() { var i = THEMES.indexOf(theme); setTheme(THEMES[(i + 1) % THEMES.length]); showThemeFeedback(); }
  function showThemeFeedback() {
    if (!themeFeedbackEl) return;
    themeFeedbackEl.textContent = t('theme_' + theme);
    themeFeedbackEl.classList.add('show');
    if (fbTimer) window.clearTimeout(fbTimer);
    fbTimer = window.setTimeout(function () { themeFeedbackEl.classList.remove('show'); }, 2200);
  }
  function refreshThemeBar() {
    if (!themeToggleBtn) return;
    themeToggleBtn.innerHTML = ICON[THEME_ICON[theme]];
    themeToggleBtn.setAttribute('aria-label', t('theme_group') + ': ' + t('theme_' + theme));
  }

  /* ---------- Farben aus CSS Variablen (CSP konform) ---------- */
  var COL = { field: '#fff', grid: 'rgba(0,0,0,.1)', cell: '#f6f7f9', ink: '#fff', paths: [] };
  function cssVar(name) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) { return ''; }
  }
  function readColors() {
    COL.field = cssVar('--field-bg') || '#ffffff';
    COL.grid  = cssVar('--field-grid') || 'rgba(20,30,60,.10)';
    COL.cell  = cssVar('--field-cell') || '#f6f7f9';
    COL.ink   = cssVar('--endpoint-ink') || '#ffffff';
    COL.paths = [
      cssVar('--path-1') || '#2563c9',
      cssVar('--path-2') || '#c77400',
      cssVar('--path-3') || '#0e8f86',
      cssVar('--path-4') || '#7c3aed',
      cssVar('--path-5') || '#c026a8',
      cssVar('--path-6') || '#51607a'
    ];
  }

  /* ---------- Spielzustand ----------
     phase: 'init' | 'loading' | 'play' | 'solved' */
  var phase = 'init';
  var level = 1;
  var N = 5, K = 3;
  var owner = new Int16Array(0);   // Feld -> Farbindex oder -1
  var epColor = new Int16Array(0); // Feld -> Farbindex falls Endpunkt, sonst -1
  var endpoints = [];              // [{ a, b, num }]
  var paths = [];                  // paths[k] = geordnete Feldliste ab Anker-Endpunkt
  var connected = [];
  var prevConnected = [];

  // Zeigereingabe
  var active = -1;                 // aktive Farbe beim Ziehen, sonst -1
  var pendingStart = null;         // 'endpoint' | 'path'
  var downCell = -1;
  var engaged = false;
  var moved = false;

  /* ---------- Helfer ---------- */
  function randInt(n) { return Math.floor(Math.random() * n); }
  function rc(cell) { return [Math.floor(cell / N), cell % N]; }
  function adjacent(a, b) {
    var ar = Math.floor(a / N), ac = a % N, br = Math.floor(b / N), bc = b % N;
    return (ar === br && Math.abs(ac - bc) === 1) || (ac === bc && Math.abs(ar - br) === 1);
  }
  function neighborsOf(cell) {
    var r = Math.floor(cell / N), c = cell % N, res = [];
    if (r > 0) res.push(cell - N);
    if (r < N - 1) res.push(cell + N);
    if (c > 0) res.push(cell - 1);
    if (c < N - 1) res.push(cell + 1);
    return res;
  }
  function targetEndpoint(k) {
    var P = paths[k];
    return (P[0] === endpoints[k].a) ? endpoints[k].b : endpoints[k].a;
  }

  /* ---------- Generator: Hamilton-Pfad (Warnsdorff + Backtracking) ---------- */
  function makeHamiltonian(n) {
    var total = n * n;
    var visited = new Uint8Array(total);
    var path = [];
    var steps = 0;
    var CAP = total * 200;       // Versuchsgrenze gegen Worst-Case-Backtracking
    var ok = false;
    function nbrs(cell) {
      var r = Math.floor(cell / n), c = cell % n, res = [];
      if (r > 0) res.push(cell - n);
      if (r < n - 1) res.push(cell + n);
      if (c > 0) res.push(cell - 1);
      if (c < n - 1) res.push(cell + 1);
      return res;
    }
    function freeDeg(cell) {
      var ns = nbrs(cell), d = 0;
      for (var i = 0; i < ns.length; i++) if (!visited[ns[i]]) d++;
      return d;
    }
    function dfs(cell) {
      if (steps++ > CAP) return false;
      visited[cell] = 1; path.push(cell);
      if (path.length === total) { ok = true; return true; }
      var list = [];
      var ns = nbrs(cell);
      for (var i = 0; i < ns.length; i++) if (!visited[ns[i]]) list.push(ns[i]);
      list.sort(function (a, b) { return (freeDeg(a) - freeDeg(b)) || (Math.random() < 0.5 ? -1 : 1); });
      for (var j = 0; j < list.length; j++) { if (dfs(list[j])) return true; }
      visited[cell] = 0; path.pop();
      return false;
    }
    dfs(randInt(total));
    return ok ? path : null;
  }
  function serpentine(n) {
    var path = [];
    for (var r = 0; r < n; r++) {
      if (r % 2 === 0) { for (var c = 0; c < n; c++) path.push(r * n + c); }
      else { for (var c2 = n - 1; c2 >= 0; c2--) path.push(r * n + c2); }
    }
    return path;
  }
  function partition(total, k, minLen) {
    if (total < k * minLen) return null;
    var lens = new Array(k);
    for (var i = 0; i < k; i++) lens[i] = minLen;
    var rem = total - k * minLen;
    while (rem > 0) { lens[randInt(k)]++; rem--; }
    return lens;
  }

  /* ---------- Stufe aufbauen (volles, loesbares Gitter garantiert) ---------- */
  function makeLevel() {
    var cfg = levelConfig(level);
    N = cfg.N; K = cfg.K;
    var total = N * N;

    var path = null, tries = 0;
    while (!path && tries < 8) { path = makeHamiltonian(N); tries++; }
    if (!path) path = serpentine(N);   // Fallback, existiert immer

    var lens = partition(total, K, MIN_SEG);
    if (!lens) { // sollte bei den gewaehlten Konfigurationen nie passieren
      lens = new Array(K); var base = Math.floor(total / K);
      for (var i = 0; i < K; i++) lens[i] = base; lens[K - 1] += total - base * K;
    }

    owner = new Int16Array(total); for (var o = 0; o < total; o++) owner[o] = -1;
    epColor = new Int16Array(total); for (var e = 0; e < total; e++) epColor[e] = -1;
    endpoints = []; paths = []; connected = []; prevConnected = [];

    var pos = 0;
    for (var s = 0; s < K; s++) {
      var seg = path.slice(pos, pos + lens[s]); pos += lens[s];
      var a = seg[0], b = seg[seg.length - 1];
      endpoints.push({ a: a, b: b, num: s + 1 });
      owner[a] = s; owner[b] = s;
      epColor[a] = s; epColor[b] = s;
      paths.push([a]);
      connected.push(false); prevConnected.push(false);
    }

    active = -1; pendingStart = null; downCell = -1; engaged = false; moved = false;
    phase = 'play';
  }

  /* ---------- Wege-Logik ---------- */
  function clearColor(k, anchor) {
    var P = paths[k];
    for (var i = 0; i < P.length; i++) { var c = P[i]; if (epColor[c] !== k) owner[c] = -1; }
    paths[k] = [(anchor != null) ? anchor : endpoints[k].a];
  }
  function clearAll() {
    for (var k = 0; k < K; k++) clearColor(k, endpoints[k].a);
  }

  // Versucht, den aktiven Weg um genau ein orthogonal benachbartes Feld zu
  // erweitern. Liefert true, wenn sich etwas geaendert hat.
  function tryExtend(next) {
    if (active < 0) return false;
    var P = paths[active];
    var len = P.length;
    if (len === 0) return false;
    var head = P[len - 1];
    if (!adjacent(head, next)) return false;

    var target = targetEndpoint(active);

    // Rueckschritt auf das vorherige Feld
    if (len >= 2 && next === P[len - 2]) {
      var removed = P.pop();
      if (epColor[removed] !== active) owner[removed] = -1;
      return true;
    }
    // Auf ein frueheres eigenes Feld: Schleife abschneiden
    var idx = P.indexOf(next);
    if (idx >= 0) {
      for (var i = P.length - 1; i > idx; i--) { var cc = P.pop(); if (epColor[cc] !== active) owner[cc] = -1; }
      return true;
    }
    // Vom Zielendpunkt aus nicht weiter vorwaerts (nur zurueck moeglich, oben)
    if (head === target) return false;
    // Zielendpunkt erreicht -> verbinden (Feld gehoert bereits der Farbe)
    if (next === target) { P.push(next); return true; }
    // Jeder Endpunkt (auch fremder) ist fest und nicht ueberschreibbar
    if (epColor[next] >= 0) return false;

    var no = owner[next];
    if (no === -1) { owner[next] = active; P.push(next); return true; }
    if (no === active) return false; // eigene, nicht in P (unerwartet): blocken
    // Fremder Weg -> dort abschneiden und Feld uebernehmen
    var Pd = paths[no];
    var j = Pd.indexOf(next);
    if (j >= 0) { for (var m = Pd.length - 1; m >= j; m--) { var c2 = Pd.pop(); if (epColor[c2] !== no) owner[c2] = -1; } }
    owner[next] = active; P.push(next);
    return true;
  }

  // Ziel-Feld T: entlang gemeinsamer Zeile/Spalte schrittweise erweitern.
  function dragTo(T) {
    if (active < 0 || !engaged) return false;
    var changed = false, guard = 0;
    while (guard++ < 256) {
      var P = paths[active]; var head = P[P.length - 1];
      if (head === T) break;
      var hr = Math.floor(head / N), hc = head % N, tr = Math.floor(T / N), tc = T % N;
      var next;
      if (hr === tr && hc !== tc) next = head + (tc > hc ? 1 : -1);
      else if (hc === tc && hr !== tr) next = head + (tr > hr ? N : -N);
      else break; // nicht ausgerichtet: auf naechstes Move warten
      if (!tryExtend(next)) break;
      changed = true;
    }
    return changed;
  }

  function engage() {
    if (engaged) return;
    if (pendingStart === 'endpoint') {
      clearColor(active, downCell);            // frisch ab dem gegriffenen Endpunkt
    } else if (pendingStart === 'path') {
      var P = paths[active]; var idx = P.indexOf(downCell);
      if (idx >= 0) { for (var i = P.length - 1; i > idx; i--) { var c = P.pop(); if (epColor[c] !== active) owner[c] = -1; } }
    }
    engaged = true;
  }

  /* ---------- Zeigereingabe (Pointer Events) ---------- */
  function cellFromEvent(e) {
    if (!canvas) return -1;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return -1;
    var c = Math.floor((e.clientX - rect.left) / rect.width * N);
    var r = Math.floor((e.clientY - rect.top) / rect.height * N);
    if (r < 0 || r >= N || c < 0 || c >= N) return -1;
    return r * N + c;
  }
  function onPointerDown(e) {
    if (phase !== 'play') return;
    var cell = cellFromEvent(e); if (cell < 0) return;
    var oc = owner[cell];
    if (epColor[cell] >= 0) { active = epColor[cell]; pendingStart = 'endpoint'; downCell = cell; }
    else if (oc >= 0) { active = oc; pendingStart = 'path'; downCell = cell; }
    else { active = -1; return; }
    moved = false; engaged = false;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  }
  function onPointerMove(e) {
    if (active < 0 || phase !== 'play') return;
    var cell = cellFromEvent(e); if (cell < 0) return;
    if (!engaged) engage();
    if (dragTo(cell)) { moved = true; afterChange(); }
    e.preventDefault();
  }
  function onPointerUp(e) {
    if (active < 0) return;
    if (!moved) {
      clearColor(active, (pendingStart === 'endpoint') ? downCell : endpoints[active].a);
      announce(t('msg_cleared'));
    }
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    active = -1; engaged = false; pendingStart = null; downCell = -1;
    afterChange(); checkWin(); requestDraw();
  }
  function onPointerCancel() {
    active = -1; engaged = false; pendingStart = null; downCell = -1;
    requestDraw();
  }

  /* ---------- Tastatur (Zusatz; Ziehen ist primaer) ---------- */
  function onKeyDown(e) {
    if (phase !== 'play') return;
    var k = e.key;
    if (k >= '1' && k <= '9') {
      var idx = parseInt(k, 10) - 1;
      if (idx >= 0 && idx < K) {
        e.preventDefault();
        active = idx; pendingStart = 'endpoint'; downCell = endpoints[idx].a;
        engaged = false; engage(); moved = true;
        announce(fmt('msg_color', { n: idx + 1 }));
        afterChange(); requestDraw();
      }
      return;
    }
    if (active < 0) return;
    var head = paths[active][paths[active].length - 1];
    var hr = Math.floor(head / N), hc = head % N, next = -1;
    if (k === 'ArrowUp') { if (hr > 0) next = head - N; }
    else if (k === 'ArrowDown') { if (hr < N - 1) next = head + N; }
    else if (k === 'ArrowLeft') { if (hc > 0) next = head - 1; }
    else if (k === 'ArrowRight') { if (hc < N - 1) next = head + 1; }
    else if (k === 'Backspace' || k === 'Delete') {
      e.preventDefault(); clearColor(active, endpoints[active].a);
      announce(t('msg_cleared')); afterChange(); requestDraw(); return;
    } else { return; }
    if (next >= 0) { e.preventDefault(); if (tryExtend(next)) { afterChange(); checkWin(); requestDraw(); } }
  }

  /* ---------- Fortschritt, Ansagen, Gewinn ---------- */
  function recomputeConnected() {
    for (var k = 0; k < K; k++) {
      var P = paths[k];
      var tgt = (P[0] === endpoints[k].a) ? endpoints[k].b : endpoints[k].a;
      connected[k] = (P.length >= 2 && P[P.length - 1] === tgt);
    }
  }
  function coveredCount() {
    var c = 0; for (var i = 0; i < owner.length; i++) if (owner[i] >= 0) c++; return c;
  }
  function afterChange() {
    recomputeConnected();
    for (var k = 0; k < K; k++) {
      if (connected[k] && !prevConnected[k]) announce(fmt('msg_pair', { n: k + 1 }));
      prevConnected[k] = connected[k];
    }
    updateHud();
    requestDraw();
  }
  function allConnected() { for (var k = 0; k < K; k++) if (!connected[k]) return false; return true; }
  function checkWin() {
    if (phase !== 'play') return;
    if (allConnected() && coveredCount() === N * N) solved();
  }
  function solved() {
    phase = 'solved';
    var prev = loadBestVal();
    if (prev == null || level > prev) saveBest(level);
    updateBest();
    showOverlay(t('solved_title'), fmt('solved_score', { n: level }), t('btn_continue'));
    announce(t('solved_title') + ', ' + fmt('solved_score', { n: level }), 'good');
  }

  /* ---------- Bestwert (einheitliches null-Muster, Vorbild grid9) ----------
     Erfolgsgroesse: erreichte Stufe, hoeher ist besser. Kein gespeicherter
     Wert ergibt null, daher "noch keine" statt 0. hasStorage-Preflight,
     try/catch, Bereichspruefung. */
  function bestKey() { return 'dailycode:flow8:best'; }
  function loadBestVal() {
    if (!hasStorage) return null;
    try { var v = window.localStorage.getItem(bestKey()); if (v == null) return null; var n = parseInt(v, 10); return (isNaN(n) || n < 0) ? null : n; }
    catch (e) { return null; }
  }
  function saveBest(val) { if (!hasStorage) return; try { window.localStorage.setItem(bestKey(), String(val)); } catch (e) {} }
  function updateBest() {
    if (!hudBestEl) return;
    var v = loadBestVal();
    hudBestEl.textContent = (v == null) ? t('best_none') : String(v);
  }

  function updateHud() {
    if (hudLevelEl) hudLevelEl.textContent = String(level);
    if (hudFillEl) hudFillEl.textContent = coveredCount() + '/' + (N * N);
    updateBest();
  }
  function announce(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.toggle('is-good', kind === 'good');
  }

  /* ---------- Overlay ---------- */
  function showOverlay(title, scoreText, btnText) {
    if (overlayTitleEl) overlayTitleEl.textContent = title;
    if (overlayScoreEl) { overlayScoreEl.textContent = scoreText || ''; overlayScoreEl.hidden = !scoreText; }
    if (overlayBtn) overlayBtn.textContent = btnText;
    if (overlayEl) overlayEl.hidden = false;
  }
  function hideOverlay() { if (overlayEl) overlayEl.hidden = true; }

  /* ---------- Canvas: Groesse (DPR) und Render ---------- */
  var cell = 0;
  function sizeCanvas() {
    if (!canvas || !ctx) return;
    var cssW = canvas.clientWidth || 320;
    var dpr = window.devicePixelRatio || 1;
    var px = Math.max(1, Math.round(cssW * dpr));
    canvas.width = px;
    canvas.height = px;
    cell = canvas.width / N;
  }
  var rafPending = 0;
  function requestDraw() { if (rafPending) return; rafPending = window.requestAnimationFrame(function () { rafPending = 0; render(); }); }

  function center(cellIdx) { var r = Math.floor(cellIdx / N), c = cellIdx % N; return [ (c + 0.5) * cell, (r + 0.5) * cell ]; }

  function render() {
    if (!ctx || !owner.length) return;
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COL.field; ctx.fillRect(0, 0, W, H);

    // Belegte Felder zart in Wegfarbe toenen (Fortschritt sichtbar)
    for (var i = 0; i < owner.length; i++) {
      var ow = owner[i];
      if (ow < 0) continue;
      var r = Math.floor(i / N), c = i % N;
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = COL.paths[ow % COL.paths.length];
      ctx.fillRect(c * cell, r * cell, cell, cell);
      ctx.globalAlpha = 1;
    }

    // Gitterlinien
    ctx.strokeStyle = COL.grid; ctx.lineWidth = Math.max(1, cell * 0.02);
    ctx.beginPath();
    for (var g = 1; g < N; g++) {
      ctx.moveTo(g * cell, 0); ctx.lineTo(g * cell, H);
      ctx.moveTo(0, g * cell); ctx.lineTo(W, g * cell);
    }
    ctx.stroke();

    // Wege als dicke runde Linien durch die Feldmitten
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var k = 0; k < K; k++) {
      var P = paths[k];
      if (P.length < 2) continue;
      ctx.strokeStyle = COL.paths[k % COL.paths.length];
      ctx.lineWidth = cell * (k === active ? 0.34 : 0.30);
      ctx.beginPath();
      var p0 = center(P[0]); ctx.moveTo(p0[0], p0[1]);
      for (var p = 1; p < P.length; p++) { var pp = center(P[p]); ctx.lineTo(pp[0], pp[1]); }
      ctx.stroke();
    }

    // Endpunkte: gefuellte Scheibe in Wegfarbe mit Ziffer
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.round(cell * 0.42) + 'px system-ui, -apple-system, sans-serif';
    for (var e = 0; e < K; e++) {
      drawEndpoint(endpoints[e].a, e, connected[e]);
      drawEndpoint(endpoints[e].b, e, connected[e]);
    }
  }
  function drawEndpoint(cellIdx, k, conn) {
    var ctr = center(cellIdx);
    var rad = cell * 0.34;
    if (conn) {
      ctx.beginPath(); ctx.arc(ctr[0], ctr[1], rad + cell * 0.08, 0, Math.PI * 2);
      ctx.strokeStyle = COL.paths[k % COL.paths.length]; ctx.lineWidth = Math.max(1, cell * 0.04); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(ctr[0], ctr[1], rad, 0, Math.PI * 2);
    ctx.fillStyle = COL.paths[k % COL.paths.length]; ctx.fill();
    ctx.fillStyle = COL.ink;
    ctx.fillText(String(k + 1), ctr[0], ctr[1] + cell * 0.02);
  }

  /* ---------- Ablauf: erzeugen, neu, neustarten, weiter ---------- */
  function generate() {
    phase = 'loading';
    hideOverlay();
    announce(t('loading'));
    if (canvas) canvas.setAttribute('aria-busy', 'true');
    // Ladezustand zuerst zeigen, Erzeugung auf den naechsten Tick legen.
    window.setTimeout(function () {
      makeLevel();
      sizeCanvas();
      recomputeConnected();
      for (var k = 0; k < K; k++) prevConnected[k] = connected[k];
      updateHud();
      if (canvas) canvas.removeAttribute('aria-busy');
      requestDraw();
      announce(t('msg_go'));
    }, 0);
  }
  function newPuzzle() { generate(); }
  function restartRun() { level = 1; generate(); }
  function nextLevel() { level += 1; generate(); }

  /* ---------- Statische Texte und Rechtslinks ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    setText('lblLevel', t('lbl_level'));
    setText('lblFill', t('lbl_fill'));
    setText('lblBest', t('lbl_best'));
    setText('navPrivacy', t('nav_privacy'));
    setText('navImprint', t('nav_imprint'));
    setText('backLabel', t('back'));
    var backLinkEl = document.getElementById('backLink');
    if (backLinkEl) backLinkEl.setAttribute('aria-label', t('back_aria'));
    setText('helpSummary', t('help_summary'));
    setText('help1', t('help_1'));
    setText('help2', t('help_2'));
    setText('help3', t('help_3'));
    if (canvas) canvas.setAttribute('aria-label', t('aria_board'));
    if (clearBtn) { clearBtn.textContent = t('btn_clear'); clearBtn.setAttribute('aria-label', t('aria_clear')); }
    if (newBtn) { newBtn.textContent = t('btn_new'); newBtn.setAttribute('aria-label', t('aria_new')); }
    if (restartBtn) { restartBtn.textContent = t('btn_restart'); restartBtn.setAttribute('aria-label', t('aria_restart')); }
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
      var proto = location.protocol, host = location.hostname;
      var secure = (proto === 'https:') ||
                   (proto === 'http:' && (host === 'localhost' || host === '127.0.0.1' || host === '[::1]'));
      if (!secure) return;
      window.addEventListener('load', function () {
        try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
      });
    } catch (e) {}
  }

  /* ---------- Start ----------
     Reihenfolge penibel (Lehre aus cluster): Theme, Texte, Farben und die
     Bedienleisten zuerst, dann Listener, DANN die erste Stufe erzeugen
     (makeLevel baut Datenstrukturen, danach sizeCanvas und Render). Kein
     Render greift vorher auf einen leeren Zustand zu (render() prueft
     owner.length). */
  function init() {
    setFooterLinks();
    buildThemeBar();
    readColors();
    applyTheme();
    applyTexts();
    updateBest();

    if (canvas) {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerCancel);
      canvas.addEventListener('keydown', onKeyDown);
    }
    if (clearBtn) clearBtn.addEventListener('click', function () { if (phase === 'play') { clearAll(); afterChange(); requestDraw(); } });
    if (newBtn) newBtn.addEventListener('click', newPuzzle);
    if (restartBtn) restartBtn.addEventListener('click', restartRun);
    if (overlayBtn) overlayBtn.addEventListener('click', function () { if (phase === 'solved') nextLevel(); });

    if (systemDarkMQ.addEventListener) systemDarkMQ.addEventListener('change', function () { if (theme === 'auto') applyTheme(); });
    else if (systemDarkMQ.addListener) systemDarkMQ.addListener(function () { if (theme === 'auto') applyTheme(); });

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { sizeCanvas(); requestDraw(); }, 150);
    });

    registerServiceWorker();

    generate();
  }

  init();
})();
