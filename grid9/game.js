/* ============================================================
   dailycode  Sechstes Spiel  (Numora)
   Ruhiges Logikgitter: 9x9 Felder, Zahlen 1 bis 9, jede Zahl genau
   einmal pro Zeile, Spalte und 3x3 Block. Vorgegebene Felder (Givens)
   sind fest. Eingabe per Klick und Tastatur, Zahlenleiste 1 bis 9 plus
   Loeschen. Regelverstoss wird sofort markiert (Farbe UND Ausrufezeichen
   im Feld, plus Statusansage), damit das Spiel bei Farbsehschwaeche
   nutzbar bleibt. Undo, Neustart (gleiches Raetsel) und Neues Raetsel.

   Raetselgenerator: vollstaendige gueltige Loesung per Backtracking,
   dann Felder entfernen; nach JEDEM Entfernen wird per zaehlendem Solver
   (Bitmasken, MRV, Abbruch bei zwei Loesungen) geprueft, dass GENAU EINE
   Loesung bleibt. Mehrdeutige Raetsel entstehen so nie.

   Vanilla JS, keine Libraries, keine externen Ressourcen, keine data-URI.
   Strikte CSP konform: keine Inline-Styles, Zustaende ueber Klassen.
   Theme und Sprache teilen die bestehenden Keys (dailycode:theme,
   dailycode:lang). Texte zunaechst Deutsch hinter einem t() Muster.

   Lehre aus dem dritten Spiel (cluster): in init() erst Theme, Texte und
   die statischen Bedienleisten, DANN die Datenstrukturen erzeugen und das
   Raster aufbauen. Render und Update sind defensiv gegen einen noch
   leeren Zustand abgesichert (kein Crash beim ersten Paint, beim Neustart
   oder waehrend der Erzeugung).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Schwierigkeit: Spanne der verbleibenden Givens ----------
     leicht: viele Vorgaben, schwer: wenige. Untergrenze 28 haelt die
     Erzeugung schnell und das Raetsel ohne Tiefst-Raten loesbar. Die
     Eindeutigkeit wird unabhaengig davon erzwungen. */
  var GIVENS = {
    leicht: { min: 42, max: 47 },
    mittel: { min: 34, max: 38 },
    schwer: { min: 28, max: 32 }
  };
  var DIFFS = ['leicht', 'mittel', 'schwer'];

  /* ---------- Sprache: minimaler t() Tisch (Deutsch) ---------- */
  var STR = {
    subtitle: 'Fuelle das Gitter, jede Zahl einmal pro Zeile, Spalte und Block.',
    lbl_time: 'Zeit',
    lbl_best: 'Bestzeit',
    best_none: 'noch keine',
    diff_group: 'Schwierigkeit',
    diff_leicht: 'Leicht',
    diff_mittel: 'Mittel',
    diff_schwer: 'Schwer',
    num_group: 'Zahlen eins bis neun',
    btn_undo: 'Rueckgaengig',
    btn_restart: 'Neustart',
    btn_new: 'Neues Raetsel',
    aria_erase: 'Ausgewaehltes Feld loeschen',
    aria_undo: 'Letzten Zug zuruecknehmen',
    aria_restart: 'Raetsel auf die Vorgaben zuruecksetzen',
    aria_new: 'Neues Raetsel erzeugen',
    aria_grid: 'Zahlengitter neun mal neun. Mit den Pfeiltasten bewegen, Ziffer eins bis neun setzen, Entf loescht.',
    aria_num: 'Zahl {n} setzen',
    loading: 'Erzeuge Raetsel',
    msg_go: 'Los, fuelle das Gitter',
    msg_given: 'Vorgegebenes Feld, nicht aenderbar',
    msg_conflict: 'Konflikt in Zeile, Spalte oder Block',
    msg_set: 'Gesetzt',
    msg_cleared: 'Geloescht',
    msg_select: 'Feld gewaehlt',
    msg_nothing: 'Bitte zuerst ein Feld waehlen',
    msg_undo_empty: 'Kein Zug zum Zuruecknehmen',
    win_title: 'Geloest',
    win_time: 'Zeit {t}',
    win_best: 'Bestzeit {t}',
    win_restart: 'Neues Raetsel',
    cell_pos: 'Zeile {r} Spalte {c}',
    cell_given: 'vorgegeben',
    cell_empty: 'leer',
    cell_conflict: 'Konflikt',
    theme_group: 'Darstellung',
    theme_auto: 'Auto',
    theme_light: 'Hell',
    theme_dark: 'Dunkel',
    help_summary: 'Hilfe',
    help_1: 'Tippe ein Feld an oder bewege dich mit den Pfeiltasten, dann setze eine Zahl ueber die Leiste oder die Tastatur.',
    help_2: 'Jede Zahl von eins bis neun darf in jeder Zeile, jeder Spalte und jedem Dreierblock nur einmal stehen.',
    help_3: 'Verstoesst eine Zahl, wird das Feld farbig mit Ausrufezeichen markiert. Vorgegebene Felder sind fett und nicht aenderbar.',
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
    monitor: svg('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'),
    erase: svg('<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l9.6-9.6a2 2 0 0 1 2.8 0l5.5 5.5a2 2 0 0 1 0 2.8L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>')
  };
  var THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };

  /* ---------- DOM ---------- */
  var themebarEl    = document.getElementById('themebar');
  var themeColorEl  = document.getElementById('themeColor');
  var themeFeedbackEl = document.getElementById('themeFeedback');
  var subtitleEl    = document.getElementById('subtitle');
  var statusEl      = document.getElementById('status');
  var diffbarEl     = document.getElementById('diffbar');
  var gridEl        = document.getElementById('grid');
  var numpadEl      = document.getElementById('numpad');
  var overlayEl     = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlayTitle');
  var overlayScoreEl = document.getElementById('overlayScore');
  var overlayBtn    = document.getElementById('overlayBtn');
  var hudTimeEl     = document.getElementById('hudTime');
  var hudBestEl     = document.getElementById('hudBest');
  var undoBtn       = document.getElementById('undoBtn');
  var restartBtn    = document.getElementById('restartBtn');
  var newBtn        = document.getElementById('newBtn');
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

  /* ---------- Spielzustand ---------- */
  var phase = 'init';           // 'init' | 'loading' | 'play' | 'over'
  var solution = [];            // Int(81) volle Loesung
  var current = [];             // Int(81) 0 leer, 1..9 gesetzt
  var givens = [];              // Bool(81) feste Felder
  var history = [];             // [{ index, prev }]
  var cellEls = [];
  var selected = -1;
  var difficulty = 'mittel';
  var won = false;
  var diffBtns = {};

  /* ---------- Helfer ---------- */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function boxOf(r, c) { return Math.floor(r / 3) * 3 + Math.floor(c / 3); }
  function bitToNum(bit) { var n = 0; while (bit > 1) { bit >>= 1; n++; } return n; }
  function popcount(x) { var n = 0; while (x) { x &= x - 1; n++; } return n; }

  /* ---------- Generator: vollstaendige gueltige Loesung ----------
     Backtracking, je Position zufaellige Zahlenreihenfolge. Damit ist
     die erzeugte Loesung zufaellig und gueltig. */
  function buildSolved() {
    var g = new Array(81).fill(0);
    var rows = new Array(9).fill(0);
    var cols = new Array(9).fill(0);
    var boxes = new Array(9).fill(0);
    function fill(pos) {
      if (pos === 81) return true;
      var r = Math.floor(pos / 9), c = pos % 9, b = boxOf(r, c);
      var nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (var k = 0; k < 9; k++) {
        var n = nums[k], bit = 1 << n;
        if ((rows[r] & bit) || (cols[c] & bit) || (boxes[b] & bit)) continue;
        g[pos] = n; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        if (fill(pos + 1)) return true;
        g[pos] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      }
      return false;
    }
    fill(0);
    return g;
  }

  /* ---------- Zaehlender Solver (Eindeutigkeitspruefung) ----------
     Bitmasken je Zeile/Spalte/Block, MRV-Heuristik (am staerksten
     eingeschraenkte Zelle zuerst). Bricht ab, sobald limit Loesungen
     erreicht sind. Liefert die Anzahl gefundener Loesungen (0, 1, ...). */
  function countSolutions(grid, limit) {
    var rows = new Array(9).fill(0);
    var cols = new Array(9).fill(0);
    var boxes = new Array(9).fill(0);
    var work = grid.slice();
    var p, r, c, b, v, bit;
    for (p = 0; p < 81; p++) {
      v = work[p];
      if (v) { r = Math.floor(p / 9); c = p % 9; b = boxOf(r, c); bit = 1 << v; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit; }
    }
    var count = 0;
    var ALL = 0x3FE; // Bits 1..9 gesetzt

    function rec() {
      if (count >= limit) return;
      // MRV: leere Zelle mit den wenigsten Kandidaten suchen.
      var best = -1, bestCnt = 10, bestCand = 0, i, rr, cc, bb, used, cand, cnt;
      for (i = 0; i < 81; i++) {
        if (work[i] !== 0) continue;
        rr = Math.floor(i / 9); cc = i % 9; bb = boxOf(rr, cc);
        used = rows[rr] | cols[cc] | boxes[bb];
        cand = (~used) & ALL;
        cnt = popcount(cand);
        if (cnt === 0) return;                 // Sackgasse, kein Zweig
        if (cnt < bestCnt) { bestCnt = cnt; best = i; bestCand = cand; if (cnt === 1) break; }
      }
      if (best === -1) { count++; return; }    // keine leere Zelle: eine Loesung
      rr = Math.floor(best / 9); cc = best % 9; bb = boxOf(rr, cc);
      var rem = bestCand;
      while (rem) {
        var lb = rem & (-rem); rem &= rem - 1;
        var n = bitToNum(lb);
        work[best] = n; rows[rr] |= lb; cols[cc] |= lb; boxes[bb] |= lb;
        rec();
        work[best] = 0; rows[rr] &= ~lb; cols[cc] &= ~lb; boxes[bb] &= ~lb;
        if (count >= limit) return;
      }
    }
    rec();
    return count;
  }

  /* ---------- Raetsel erzeugen (eindeutige Loesung garantiert) ----------
     Von der vollen Loesung Felder in Zufallsreihenfolge entfernen. Nach
     jedem Entfernen pruefen, dass weiterhin GENAU eine Loesung bleibt;
     sonst das Feld zurueckstellen. So ist die Eindeutigkeit jederzeit
     gesichert. Es wird bis zur Zielzahl an Givens entfernt; blockiert die
     Eindeutigkeit frueher, bleiben entsprechend mehr Givens stehen. */
  function makePuzzle(diff) {
    var sol = buildSolved();
    var puzzle = sol.slice();
    var order = []; for (var i = 0; i < 81; i++) order.push(i);
    shuffle(order);
    var target = randInt(GIVENS[diff].min, GIVENS[diff].max);
    var givenCount = 81;
    for (var oi = 0; oi < order.length && givenCount > target; oi++) {
      var idx = order[oi];
      if (puzzle[idx] === 0) continue;
      var saved = puzzle[idx];
      puzzle[idx] = 0;
      if (countSolutions(puzzle, 2) !== 1) { puzzle[idx] = saved; } // nicht eindeutig: behalten
      else { givenCount -= 1; }
    }
    return { solution: sol, puzzle: puzzle, givens: givenCount };
  }

  /* ---------- Konflikte (Duplikate je Zeile, Spalte, Block) ---------- */
  function conflictSet() {
    var bad = {};
    var i, r, c, v, seen;
    function mark(a, b) { bad[a] = true; bad[b] = true; }
    for (r = 0; r < 9; r++) {
      seen = {};
      for (c = 0; c < 9; c++) { i = r * 9 + c; v = current[i]; if (v) { if (seen[v] !== undefined) mark(i, seen[v]); else seen[v] = i; } }
    }
    for (c = 0; c < 9; c++) {
      seen = {};
      for (r = 0; r < 9; r++) { i = r * 9 + c; v = current[i]; if (v) { if (seen[v] !== undefined) mark(i, seen[v]); else seen[v] = i; } }
    }
    for (var bx = 0; bx < 9; bx++) {
      seen = {};
      var br = Math.floor(bx / 3) * 3, bc = (bx % 3) * 3;
      for (var dr = 0; dr < 3; dr++) {
        for (var dc = 0; dc < 3; dc++) {
          r = br + dr; c = bc + dc; i = r * 9 + c; v = current[i];
          if (v) { if (seen[v] !== undefined) mark(i, seen[v]); else seen[v] = i; }
        }
      }
    }
    var count = 0; for (var k in bad) { if (bad.hasOwnProperty(k)) count++; }
    return { has: function (idx) { return bad[idx] === true; }, size: count };
  }

  /* ---------- Render (defensiv) ---------- */
  function buildGridDOM() {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    cellEls = [];
    for (var i = 0; i < 81; i++) {
      (function (idx) {
        var r = Math.floor(idx / 9), c = idx % 9;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cell';
        if (c % 3 === 2 && c !== 8) btn.classList.add('blk-right');
        if (r % 3 === 2 && r !== 8) btn.classList.add('blk-bottom');
        btn.tabIndex = (idx === selected) ? 0 : -1;
        btn.addEventListener('click', function () { if (phase === 'play') selectCell(idx, true); });
        gridEl.appendChild(btn);
        cellEls.push(btn);
      })(i);
    }
  }

  function renderCell(i, conflicts) {
    var el = cellEls[i]; if (!el) return;
    var v = current[i];
    el.textContent = v ? String(v) : '';
    var given = givens[i];
    var conflict = conflicts.has(i);
    var sel = (i === selected);
    el.classList.toggle('is-given', given);
    el.classList.toggle('is-conflict', conflict);
    el.classList.toggle('is-selected', sel);
    el.tabIndex = sel ? 0 : -1;
    var r = Math.floor(i / 9), c = i % 9;
    var label = fmt('cell_pos', { r: r + 1, c: c + 1 }) + ', ' + (v ? String(v) : t('cell_empty'));
    if (given) label += ', ' + t('cell_given');
    if (conflict) label += ', ' + t('cell_conflict');
    el.setAttribute('aria-label', label);
  }

  function renderAll() {
    if (!cellEls.length) return;
    var conflicts = conflictSet();
    for (var i = 0; i < 81; i++) renderCell(i, conflicts);
    return conflicts;
  }

  function announce(msg) { if (statusEl) statusEl.textContent = msg; }

  /* ---------- Auswahl und Eingabe ---------- */
  function firstEmptyIndex() {
    var i;
    for (i = 0; i < 81; i++) { if (!givens[i] && current[i] === 0) return i; }
    for (i = 0; i < 81; i++) { if (!givens[i]) return i; }
    return 0;
  }
  function selectCell(i, focusIt) {
    if (i < 0 || i > 80) return;
    selected = i;
    renderAll();
    if (focusIt && cellEls[selected]) cellEls[selected].focus();
  }
  function moveSel(dr, dc) {
    if (phase !== 'play') return;
    if (selected < 0) selected = firstEmptyIndex();
    var r = Math.max(0, Math.min(8, Math.floor(selected / 9) + dr));
    var c = Math.max(0, Math.min(8, (selected % 9) + dc));
    selectCell(r * 9 + c, true);
  }
  function cellFocused() {
    var el = document.activeElement;
    return !!(el && el.classList && el.classList.contains('cell'));
  }

  function setNumber(n) {
    if (phase !== 'play') return;
    if (selected < 0) { announce(t('msg_nothing')); return; }
    if (givens[selected]) { announce(t('msg_given')); return; }
    if (current[selected] === n) return;
    history.push({ index: selected, prev: current[selected] });
    current[selected] = n;
    var conflicts = renderAll();
    if (conflicts.has(selected)) announce(t('msg_conflict')); else announce(t('msg_set'));
    checkWin(conflicts);
  }
  function eraseSelected() {
    if (phase !== 'play') return;
    if (selected < 0) { announce(t('msg_nothing')); return; }
    if (givens[selected]) { announce(t('msg_given')); return; }
    if (current[selected] === 0) return;
    history.push({ index: selected, prev: current[selected] });
    current[selected] = 0;
    renderAll();
    announce(t('msg_cleared'));
  }
  function undo() {
    if (phase !== 'play') return;
    if (!history.length) { announce(t('msg_undo_empty')); return; }
    var h = history.pop();
    current[h.index] = h.prev;
    selected = h.index;
    renderAll();
    if (cellEls[selected]) cellEls[selected].focus();
    announce(t('msg_set'));
  }

  function onKeyDown(e) {
    var k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { if (cellFocused()) { e.preventDefault(); moveSel(-1, 0); } }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { if (cellFocused()) { e.preventDefault(); moveSel(1, 0); } }
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { if (cellFocused()) { e.preventDefault(); moveSel(0, -1); } }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { if (cellFocused()) { e.preventDefault(); moveSel(0, 1); } }
    else if (k >= '1' && k <= '9') { e.preventDefault(); setNumber(parseInt(k, 10)); }
    else if (k === 'Backspace' || k === 'Delete' || k === '0') { e.preventDefault(); eraseSelected(); }
  }

  /* ---------- Gewinn ---------- */
  function checkWin(conflicts) {
    for (var i = 0; i < 81; i++) { if (current[i] === 0) return; }
    if (conflicts.size !== 0) return;
    gameWon();
  }
  function gameWon() {
    phase = 'over';
    won = true;
    stopTimer();
    var sec = Math.floor(currentElapsed());
    var prev = loadBestVal(difficulty);
    var bestSec = (prev == null || sec < prev) ? sec : prev;
    if (prev == null || sec < prev) saveBest(difficulty, sec);
    updateBest();
    showOverlay(t('win_title'),
      fmt('win_time', { t: fmtTime(sec) }) + '  ·  ' + fmt('win_best', { t: fmtTime(bestSec) }),
      t('win_restart'));
    announce(t('win_title') + ', ' + fmt('win_time', { t: fmtTime(sec) }));
  }
  function showOverlay(title, scoreText, btnText) {
    if (overlayTitleEl) overlayTitleEl.textContent = title;
    if (overlayScoreEl) { overlayScoreEl.textContent = scoreText || ''; overlayScoreEl.hidden = !scoreText; }
    if (overlayBtn) overlayBtn.textContent = btnText;
    if (overlayEl) overlayEl.hidden = false;
  }
  function hideOverlay() { if (overlayEl) overlayEl.hidden = true; }

  /* ---------- Timer (friert bei verstecktem Tab) ---------- */
  var baseElapsed = 0, segStart = 0, timerId = 0;
  function nowMs() { return (window.performance && window.performance.now) ? window.performance.now() : Date.now(); }
  function currentElapsed() { return baseElapsed + (segStart ? (nowMs() - segStart) / 1000 : 0); }
  function startTimer() {
    stopTimer();
    baseElapsed = 0; segStart = nowMs();
    updateTime();
    timerId = window.setInterval(function () { if (phase === 'play') updateTime(); }, 500);
  }
  function stopTimer() {
    if (timerId) { window.clearInterval(timerId); timerId = 0; }
    if (segStart) { baseElapsed = currentElapsed(); segStart = 0; }
  }
  function fmtTime(sec) { var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function updateTime() { if (hudTimeEl) hudTimeEl.textContent = fmtTime(Math.floor(currentElapsed())); }
  function onVisibility() {
    if (document.hidden) { if (segStart) { baseElapsed = currentElapsed(); segStart = 0; } }
    else { if (phase === 'play' && !won && !segStart) { segStart = nowMs(); } }
  }

  /* ---------- Bestzeit pro Schwierigkeit (defensiv) ---------- */
  function bestKey(d) { return 'dailycode:grid9:best:' + d; }
  function loadBestVal(d) {
    if (!hasStorage) return null;
    try { var v = window.localStorage.getItem(bestKey(d)); if (v == null) return null; var n = parseInt(v, 10); return (isNaN(n) || n < 0) ? null : n; }
    catch (e) { return null; }
  }
  function saveBest(d, sec) { if (!hasStorage) return; try { window.localStorage.setItem(bestKey(d), String(sec)); } catch (e) {} }
  function updateBest() {
    if (!hudBestEl) return;
    var v = loadBestVal(difficulty);
    hudBestEl.textContent = (v == null) ? t('best_none') : fmtTime(v);
  }

  /* ---------- Ablauf: erzeugen, neustarten, neues Raetsel ---------- */
  function generate() {
    phase = 'loading';
    selected = -1;
    hideOverlay();
    announce(t('loading'));
    if (gridEl) gridEl.setAttribute('aria-busy', 'true');
    // Ladezustand zuerst rendern, Erzeugung auf den naechsten Tick legen,
    // damit der UI-Thread nicht waehrend der Eindeutigkeitspruefung blockt.
    window.setTimeout(function () {
      var res = makePuzzle(difficulty);
      solution = res.solution;
      current = res.puzzle.slice();
      givens = res.puzzle.map(function (v) { return v !== 0; });
      history = [];
      won = false;
      selected = firstEmptyIndex();
      phase = 'play';
      buildGridDOM();
      renderAll();
      if (gridEl) gridEl.removeAttribute('aria-busy');
      loadBestVal(difficulty); updateBest();
      startTimer();
      announce(t('msg_go'));
    }, 0);
  }
  function restartPuzzle() {
    if (phase !== 'play' && phase !== 'over') return;
    for (var i = 0; i < 81; i++) { current[i] = givens[i] ? solution[i] : 0; }
    history = []; won = false; phase = 'play';
    hideOverlay();
    selected = firstEmptyIndex();
    renderAll();
    startTimer();
    if (cellEls[selected]) cellEls[selected].focus();
    announce(t('msg_go'));
  }
  function newPuzzle() { generate(); }

  function buildDiffBar() {
    if (!diffbarEl) return;
    diffbarEl.innerHTML = '';
    diffBtns = {};
    for (var i = 0; i < DIFFS.length; i++) {
      (function (d) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'diff-btn' + (d === difficulty ? ' is-active' : '');
        b.textContent = t('diff_' + d);
        b.setAttribute('aria-pressed', d === difficulty ? 'true' : 'false');
        b.addEventListener('click', function () { selectDifficulty(d); });
        diffbarEl.appendChild(b);
        diffBtns[d] = b;
      })(DIFFS[i]);
    }
  }
  function refreshDiffBar() {
    for (var d in diffBtns) {
      if (!diffBtns.hasOwnProperty(d)) continue;
      var on = (d === difficulty);
      diffBtns[d].setAttribute('aria-pressed', on ? 'true' : 'false');
      diffBtns[d].classList.toggle('is-active', on);
    }
  }
  function selectDifficulty(d) {
    if (DIFFS.indexOf(d) === -1) return;
    difficulty = d;
    refreshDiffBar();
    updateBest();
    generate();
  }

  function buildNumpad() {
    if (!numpadEl) return;
    numpadEl.innerHTML = '';
    for (var n = 1; n <= 9; n++) {
      (function (num) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'num-btn';
        b.textContent = String(num);
        b.setAttribute('aria-label', fmt('aria_num', { n: num }));
        b.addEventListener('click', function () { setNumber(num); if (selected >= 0 && cellEls[selected]) cellEls[selected].focus(); });
        numpadEl.appendChild(b);
      })(n);
    }
    var er = document.createElement('button');
    er.type = 'button';
    er.className = 'num-btn num-erase';
    er.innerHTML = ICON.erase;
    er.setAttribute('aria-label', t('aria_erase'));
    er.addEventListener('click', function () { eraseSelected(); if (selected >= 0 && cellEls[selected]) cellEls[selected].focus(); });
    numpadEl.appendChild(er);
  }

  /* ---------- Statische Texte und Rechtslinks ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    setText('lblTime', t('lbl_time'));
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
    setText('undoBtn', t('btn_undo')); if (undoBtn) undoBtn.setAttribute('aria-label', t('aria_undo'));
    setText('restartBtn', t('btn_restart')); if (restartBtn) restartBtn.setAttribute('aria-label', t('aria_restart'));
    setText('newBtn', t('btn_new')); if (newBtn) newBtn.setAttribute('aria-label', t('aria_new'));
    if (gridEl) gridEl.setAttribute('aria-label', t('aria_grid'));
    if (diffbarEl) diffbarEl.setAttribute('aria-label', t('diff_group'));
    if (numpadEl) numpadEl.setAttribute('aria-label', t('num_group'));
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
     Reihenfolge penibel (Lehre aus cluster): Theme, Texte und die
     statischen Bedienleisten zuerst, dann Listener, DANN das Raetsel
     erzeugen (generate baut Datenstrukturen und Raster). Kein Render
     greift vorher auf ein noch nicht existierendes Gitter zu. */
  function init() {
    setFooterLinks();
    buildThemeBar();
    applyTheme();
    buildDiffBar();
    buildNumpad();
    applyTexts();
    updateBest();

    window.addEventListener('keydown', onKeyDown);
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (restartBtn) restartBtn.addEventListener('click', restartPuzzle);
    if (newBtn) newBtn.addEventListener('click', newPuzzle);
    if (overlayBtn) overlayBtn.addEventListener('click', function () { if (phase === 'over') newPuzzle(); });

    if (systemDarkMQ.addEventListener) systemDarkMQ.addEventListener('change', function () { if (theme === 'auto') applyTheme(); });
    else if (systemDarkMQ.addListener) systemDarkMQ.addListener(function () { if (theme === 'auto') applyTheme(); });
    document.addEventListener('visibilitychange', onVisibility);

    registerServiceWorker();

    generate();
  }

  init();
})();
