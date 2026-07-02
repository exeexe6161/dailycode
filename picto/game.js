/* ============================================================
   dailycode  Pixela  Nonogram Tagesraetsel
   Deterministisches Tagesraetsel je Datum und Schwierigkeit, Eindeutigkeit
   der Loesung per Constraint-Solver garantiert (kein Raten noetig). Drei
   Stufen (8x8, 12x12, 15x15). Eingabe per Pointer Events, rechte Maustaste
   oder Shift markiert ein Feld als leer (X) statt zu fuellen.

   Herkunft: Logik und UI urspruenglich als zwei ES Module mit TypeScript
   Typen geliefert (picto-logic.ts, picto-ui.ts). Dieses Projekt hat keinen
   Build Schritt, alle Spiele sind ein einzelnes game.js als IIFE ohne
   Modul System (gleiche Konvention wie flow8, cluster, echo). Typen
   entfernt, Logik inhaltlich unveraendert uebernommen, UI an die
   bestehende Kopf/Fuss/Theme Bedienleiste angeglichen (ein deutscher
   Untertitel statt drei gestapelter Sprachzeilen, da auch die anderen
   Spiele nur Deutsch im Spielbereich zeigen).

   Vanilla JS, keine Libraries, keine externen Ressourcen, keine data-URI.
   Strikte CSP konform: keine Inline-Styles, Theme ueber data-Attribut.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Sprachen: DE/EN/TR, alle sichtbaren Strings und aria-labels ---------- */
  var LANGS = [
    { code: 'de', label: 'DE', name: 'Deutsch' },
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'tr', label: 'TR', name: 'Türkçe' }
  ];
  var I18N = {
    de: {
      subtitle: 'Fülle das Gitter und decke das Bild auf.',
      level: function (n) { return 'Stufe ' + n; },
      solved: 'Gelöst',
      unsolved: 'noch nicht gelöst',
      btn_clear: 'Alles löschen',
      btn_next: 'Nächste Stufe',
      aria_clear: 'Alle Markierungen löschen',
      aria_next: 'Nächste Stufe wählen',
      cell_filled: 'gefüllt',
      cell_marked: 'markiert',
      cell_empty: 'leer',
      aria_cell: function (r, c, state) { return 'Zelle ' + r + ', ' + c + ', ' + state; },
      aria_board: 'Bilderrätsel-Gitter. Zeilen- und Spaltenzahlen geben an, wie viele zusammenhängende Felder gefüllt werden. Tippen füllt ein Feld; die rechte Maustaste oder Umschalttaste markiert es als leer. Pfeiltasten bewegen den Fokus, Eingabe oder Leertaste füllt ein Feld, X oder Rücktaste markiert es.',
      win: 'Bild vollständig',
      theme_group: 'Darstellung',
      theme_auto: 'Auto',
      theme_light: 'Hell',
      theme_dark: 'Dunkel',
      aria_lang_group: 'Sprache',
      nav_privacy: 'Datenschutz',
      nav_imprint: 'Impressum',
      back: 'Zurück',
      back_aria: 'Zurück zur Startseite'
    },
    en: {
      subtitle: 'Fill the grid and reveal the picture.',
      level: function (n) { return 'Level ' + n; },
      solved: 'Solved',
      unsolved: 'not solved yet',
      btn_clear: 'Clear all',
      btn_next: 'Next level',
      aria_clear: 'Clear all marks',
      aria_next: 'Choose next level',
      cell_filled: 'filled',
      cell_marked: 'marked',
      cell_empty: 'empty',
      aria_cell: function (r, c, state) { return 'Cell ' + r + ', ' + c + ', ' + state; },
      aria_board: 'Picture puzzle grid. Row and column numbers show how many connected cells to fill. Tap fills a cell, right click or Shift marks it as empty. Arrow keys move focus, Enter or Space fills a cell, X or Backspace marks it.',
      win: 'Picture complete',
      theme_group: 'Appearance',
      theme_auto: 'Auto',
      theme_light: 'Light',
      theme_dark: 'Dark',
      aria_lang_group: 'Language',
      nav_privacy: 'Privacy',
      nav_imprint: 'Imprint',
      back: 'Back',
      back_aria: 'Back to start'
    },
    tr: {
      subtitle: 'Bulmaca ızgarasını doldur ve resmi ortaya çıkar.',
      level: function (n) { return 'Seviye ' + n; },
      solved: 'Çözüldü',
      unsolved: 'henüz çözülmedi',
      btn_clear: 'Tümünü temizle',
      btn_next: 'Sonraki seviye',
      aria_clear: 'Tüm işaretleri temizle',
      aria_next: 'Sonraki seviyeyi seç',
      cell_filled: 'dolu',
      cell_marked: 'işaretli',
      cell_empty: 'boş',
      aria_cell: function (r, c, state) { return 'Hücre ' + r + ', ' + c + ', ' + state; },
      aria_board: 'Resim bulmacası ızgarası. Satır ve sütun sayıları kaç bitişik hücrenin doldurulacağını gösterir. Dokunma bir hücreyi doldurur, sağ tık veya Shift tuşu onu boş olarak işaretler. Ok tuşları odağı taşır, Enter veya boşluk tuşu bir hücreyi doldurur, X veya Geri tuşu onu işaretler.',
      win: 'Resim tamamlandı',
      theme_group: 'Görünüm',
      theme_auto: 'Otomatik',
      theme_light: 'Açık',
      theme_dark: 'Koyu',
      aria_lang_group: 'Dil',
      nav_privacy: 'Gizlilik',
      nav_imprint: 'Künye',
      back: 'Geri',
      back_aria: 'Ana sayfaya dön'
    }
  };
  function t(key) {
    var table = I18N[lang] || I18N.en;
    var v = table[key];
    if (v === undefined) v = I18N.en[key];
    return v === undefined ? key : v;
  }

  /* ---------- Lucide Bedien-Icons (ISC), wie in den anderen Spielen ---------- */
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" class="lucide" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  var ICON = {
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: svg('<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>'),
    monitor: svg('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'),
    globe: svg('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>')
  };
  var THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };

  /* ---------- DOM ---------- */
  var langbarEl      = document.getElementById('langbar');
  var themebarEl     = document.getElementById('themebar');
  var themeColorEl   = document.getElementById('themeColor');
  var themeFeedbackEl = document.getElementById('themeFeedback');
  var subtitleEl     = document.getElementById('subtitle');
  var stageEl        = document.getElementById('stage');
  var linkPrivacyEl  = document.getElementById('linkPrivacy');
  var linkImprintEl  = document.getElementById('linkImprint');
  var backLinkEl     = document.getElementById('backLink');

  /* ---------- Theme und Sprache (geteilte Keys mit Portal und anderen Spielen) ---------- */
  var THEME_KEY = 'dailycode:theme';
  var LANG_KEY = 'dailycode:lang';
  var THEMES = ['auto', 'light', 'dark'];
  var hasStorage = storageOK();
  var theme = loadTheme();
  var lang = loadLang();
  var systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var themeToggleBtn = null;
  var langToggleBtn = null;
  var fbTimer = 0;
  var currentRelocalize = null; // vom aktiven mountPicto() gesetzt, fuer Sprachwechsel mitten im Spiel

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
  function saveLang(l) { if (!hasStorage) return; try { window.localStorage.setItem(LANG_KEY, l); } catch (e) {} }
  function setLang(l) {
    if (l !== 'de' && l !== 'en' && l !== 'tr') return;
    lang = l;
    saveLang(l);
    document.documentElement.lang = lang;
    applyTexts();
    refreshLangBar();
    refreshThemeBar();
    setFooterLinks();
    if (currentRelocalize) currentRelocalize();
  }
  function langName(c) {
    for (var i = 0; i < LANGS.length; i++) { if (LANGS[i].code === c) return LANGS[i].name; }
    return c;
  }
  function buildLangBar() {
    if (!langbarEl) return;
    langbarEl.innerHTML = '';
    langToggleBtn = document.createElement('button');
    langToggleBtn.type = 'button';
    langToggleBtn.className = 'icon-btn lang-toggle';
    langToggleBtn.addEventListener('click', cycleLang);
    langbarEl.appendChild(langToggleBtn);
    refreshLangBar();
  }
  function cycleLang() {
    var order = ['de', 'en', 'tr'];
    var i = order.indexOf(lang);
    setLang(order[(i + 1) % order.length]);
  }
  function refreshLangBar() {
    if (!langToggleBtn) return;
    langToggleBtn.innerHTML = ICON.globe + '<span class="lang-code">' + lang.toUpperCase() + '</span>';
    langToggleBtn.setAttribute('aria-label', t('aria_lang_group') + ': ' + langName(lang));
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
  function setFooterLinks() {
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

  /* ============================================================
     Picto Logik (vormals picto-logic.ts). 0/1 Zellen, Zeilen- und
     Spaltenhinweise, deterministischer Tagesseed, Solver fuer eindeutige
     Loesung. Inhaltlich unveraendert, nur ohne TypeScript Typen.
     ============================================================ */
  var SIZE_BY_DIFFICULTY = {
    1: { size: 8, fillRatio: 0.45 },
    2: { size: 12, fillRatio: 0.43 },
    3: { size: 15, fillRatio: 0.42 }
  };

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var tt = Math.imul(a ^ (a >>> 15), 1 | a);
      tt = (tt + Math.imul(tt ^ (tt >>> 7), 61 | tt)) ^ tt;
      return ((tt ^ (tt >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStringToSeed(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function dailySeed(dateStr, size, salt) {
    return hashStringToSeed('picto:' + dateStr + ':' + size + ':' + (salt || ''));
  }
  function rowClue(row) {
    var out = [];
    var run = 0;
    for (var i = 0; i < row.length; i++) {
      if (row[i]) run++;
      else { if (run > 0) out.push(run); run = 0; }
    }
    if (run > 0) out.push(run);
    return out.length ? out : [0];
  }
  function computeClues(grid) {
    var rows = grid.map(rowClue);
    var cols = [];
    for (var c = 0; c < grid[0].length; c++) {
      cols.push(rowClue(grid.map(function (r) { return r[c]; })));
    }
    return { rows: rows, cols: cols };
  }

  function lineArrangements(clue, length) {
    if (clue.length === 1 && clue[0] === 0) {
      return [new Array(length).fill(0)];
    }
    function helper(idx, pos, current) {
      if (idx === clue.length) {
        var rest = current.slice();
        for (var i = pos; i < length; i++) rest[i] = 0;
        return [rest];
      }
      var block = clue[idx];
      var remaining = clue.slice(idx + 1).reduce(function (a, b) { return a + b + 1; }, 0);
      var maxStart = length - remaining - block;
      var results = [];
      for (var s = pos; s <= maxStart; s++) {
        var next = current.slice();
        for (var i2 = pos; i2 < s; i2++) next[i2] = 0;
        for (var i3 = s; i3 < s + block; i3++) next[i3] = 1;
        var gapEnd = Math.min(s + block + 1, length);
        for (var i4 = s + block; i4 < gapEnd; i4++) next[i4] = 0;
        results.push.apply(results, helper(idx + 1, s + block + 1, next));
      }
      return results;
    }
    return helper(0, 0, new Array(length).fill(-1));
  }
  function solveLine(clue, known) {
    var length = known.length;
    var inter = null;
    var any = false;
    var arrangements = lineArrangements(clue, length);
    for (var a = 0; a < arrangements.length; a++) {
      var arr = arrangements[a];
      var ok = true;
      for (var i = 0; i < length; i++) {
        if (known[i] !== -1 && known[i] !== arr[i]) { ok = false; break; }
      }
      if (!ok) continue;
      any = true;
      if (inter === null) inter = arr.slice();
      else for (var j = 0; j < length; j++) if (inter[j] !== arr[j]) inter[j] = -1;
    }
    if (!any) return { line: known, contradiction: true };
    return { line: inter, contradiction: false };
  }
  function propagateFrom(rows, cols, height, width, known) {
    var grid = known.map(function (row) { return row.slice(); });
    var changed = true;
    while (changed) {
      changed = false;
      for (var r = 0; r < height; r++) {
        var res = solveLine(rows[r], grid[r]);
        if (res.contradiction) return { contradiction: true };
        for (var i = 0; i < width; i++)
          if (res.line[i] !== -1 && grid[r][i] === -1) { grid[r][i] = res.line[i]; changed = true; }
      }
      for (var c = 0; c < width; c++) {
        var known2 = grid.map(function (row) { return row[c]; });
        var res2 = solveLine(cols[c], known2);
        if (res2.contradiction) return { contradiction: true };
        for (var i2 = 0; i2 < height; i2++)
          if (res2.line[i2] !== -1 && grid[i2][c] === -1) { grid[i2][c] = res2.line[i2]; changed = true; }
      }
    }
    var solved = grid.every(function (row) { return row.every(function (v) { return v !== -1; }); });
    return { contradiction: false, solved: solved, grid: grid };
  }
  function countSolutions(rows, cols, height, width, limit) {
    limit = limit || 2;
    var count = 0;
    function recFromGrid(grid) {
      if (count >= limit) return;
      var br = -1, bc = -1;
      outer:
      for (var r = 0; r < height; r++)
        for (var c = 0; c < width; c++)
          if (grid[r][c] === -1) { br = r; bc = c; break outer; }
      if (br === -1) { count++; return; }
      for (var v = 0; v < 2; v++) {
        var val = [1, 0][v];
        var known = grid.map(function (row) { return row.slice(); });
        known[br][bc] = val;
        var r2 = propagateFrom(rows, cols, height, width, known);
        if (!r2.contradiction) {
          if (r2.solved) { count++; if (count >= limit) return; }
          else { recFromGrid(r2.grid); if (count >= limit) return; }
        }
      }
    }
    var empty = [];
    for (var i = 0; i < height; i++) empty.push(new Array(width).fill(-1));
    var start = propagateFrom(rows, cols, height, width, empty);
    if (start.contradiction) return 0;
    if (start.solved) return 1;
    recFromGrid(start.grid);
    return count;
  }
  function randomConnectedPattern(rng, height, width, fillRatio) {
    var grid = [];
    for (var i = 0; i < height; i++) grid.push(new Array(width).fill(0));
    var total = Math.round(height * width * fillRatio);
    var cy = Math.floor(height / 2);
    var cx = Math.floor(width / 2);
    var frontier = [[cy, cx]];
    grid[cy][cx] = 1;
    var filled = 1;
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    while (filled < total && frontier.length) {
      var idx = Math.floor(rng() * frontier.length);
      var r = frontier[idx][0], c = frontier[idx][1];
      var shuffled = dirs
        .map(function (d) { return [d, rng()]; })
        .sort(function (a, b) { return a[1] - b[1]; })
        .map(function (d) { return d[0]; });
      var placed = false;
      for (var k = 0; k < shuffled.length; k++) {
        var dr = shuffled[k][0], dc = shuffled[k][1];
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < height && nc >= 0 && nc < width && !grid[nr][nc]) {
          grid[nr][nc] = 1;
          filled++;
          frontier.push([nr, nc]);
          placed = true;
          break;
        }
      }
      if (!placed) frontier.splice(idx, 1);
    }
    return grid;
  }
  /* Erzeugt das Tagesraetsel fuer ein Datum (YYYY-MM-DD) und eine Schwierigkeit.
     Loesung ist eindeutig durch Constraint-Loesung garantiert (kein Raten noetig). */
  function generatePicto(dateStr, difficulty, maxAttempts) {
    maxAttempts = maxAttempts || 80;
    var cfg = SIZE_BY_DIFFICULTY[difficulty];
    var size = cfg.size, fillRatio = cfg.fillRatio;
    var baseSeed = dailySeed(dateStr, size + 'x' + size, 'd' + difficulty);
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      var rng = mulberry32(baseSeed + attempt * 7919);
      var grid = randomConnectedPattern(rng, size, size, fillRatio);
      var clues = computeClues(grid);
      var n = countSolutions(clues.rows, clues.cols, size, size, 2);
      if (n === 1) {
        return { height: size, width: size, solution: grid, rowClues: clues.rows, colClues: clues.cols };
      }
    }
    // Fallback (in 240 Testtagen nie ausgeloest): kleinste Stufe mit niedrigerer Fuellquote erzwingen
    var rngF = mulberry32(baseSeed + 999983);
    var gridF = randomConnectedPattern(rngF, size, size, 0.3);
    var cluesF = computeClues(gridF);
    return { height: size, width: size, solution: gridF, rowClues: cluesF.rows, colClues: cluesF.cols };
  }
  /* Prueft, ob ein Spielerstand (0=leer,1=voll,2=markiert-x) die Loesung erfuellt. Markierungen sind irrelevant. */
  function isSolved(playerGrid, solution) {
    for (var r = 0; r < solution.length; r++) {
      for (var c = 0; c < solution[0].length; c++) {
        var filled = playerGrid[r][c] === 1;
        if (filled !== (solution[r][c] === 1)) return false;
      }
    }
    return true;
  }
  /* Liefert, ob eine einzelne Zeilen-/Spalten-Clue durch den aktuellen Spielerstand bereits erfuellt ist. */
  function lineSatisfied(playerLine, clue) {
    var filled = playerLine.map(function (v) { return v === 1 ? 1 : 0; });
    return JSON.stringify(rowClue(filled)) === JSON.stringify(clue);
  }

  /* ============================================================
     Picto UI (vormals picto-ui.ts), an die Container Signatur aus der
     Aufgabe gebunden: mountPicto(container, anfangsSchwierigkeit).
     ============================================================ */
  function todayUTC() {
    return new Date().toISOString().slice(0, 10);
  }

  function mountPicto(container, initialDifficulty) {
    var difficulty = initialDifficulty || 2;
    var dateStr = todayUTC();
    var puzzle = generatePicto(dateStr, difficulty);
    var player = makeEmptyPlayer(puzzle);
    var won = false;
    var pointerMode = null;
    var curR = 0; // Roving Tabindex: aktuell per Tastatur/Zeiger fokussierte Zelle
    var curC = 0;
    var focusAfterRender = false;

    container.replaceChildren();
    container.classList.add('picto-root');

    var levelRow = document.createElement('div');
    levelRow.className = 'picto-levels';
    [1, 2, 3].forEach(function (lvl) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'picto-level-btn';
      b.textContent = t('level')(lvl);
      b.setAttribute('aria-pressed', String(lvl === difficulty));
      b.addEventListener('click', function () {
        if (lvl === difficulty) return; // Bugfix: Klick auf bereits aktive Stufe loescht keinen Fortschritt
        difficulty = lvl;
        puzzle = generatePicto(dateStr, difficulty);
        player = makeEmptyPlayer(puzzle);
        won = false;
        curR = 0; curC = 0;
        render();
      });
      levelRow.append(b);
    });

    var statusLine = document.createElement('div');
    statusLine.className = 'picto-status';
    statusLine.setAttribute('role', 'status');
    statusLine.setAttribute('aria-live', 'polite');

    var boardWrap = document.createElement('div');
    boardWrap.className = 'picto-board-wrap';

    var actions = document.createElement('div');
    actions.className = 'picto-actions';
    var clearBtn = button(t('btn_clear'), 'btn btn-ghost', t('aria_clear'), function () {
      player = makeEmptyPlayer(puzzle);
      won = false;
      render();
    });
    var nextBtn = button(t('btn_next'), 'btn btn-ghost', t('aria_next'), function () {
      difficulty = (difficulty % 3) + 1;
      puzzle = generatePicto(dateStr, difficulty);
      player = makeEmptyPlayer(puzzle);
      won = false;
      curR = 0; curC = 0;
      render();
    });
    actions.append(clearBtn, nextBtn);

    var winBanner = document.createElement('div');
    winBanner.className = 'picto-win';
    winBanner.textContent = t('win');
    winBanner.hidden = true;
    winBanner.setAttribute('role', 'status');
    winBanner.setAttribute('aria-live', 'polite');

    container.append(levelRow, statusLine, boardWrap, actions, winBanner);

    function makeEmptyPlayer(p) {
      var rows = [];
      for (var r = 0; r < p.height; r++) rows.push(new Array(p.width).fill(0));
      return rows;
    }

    function button(label, cls, ariaLabel, onClick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.textContent = label;
      b.setAttribute('aria-label', ariaLabel);
      b.addEventListener('click', onClick);
      return b;
    }

    function setCell(r, c, val) {
      if (won) return;
      player[r][c] = val;
      if (isSolved(player, puzzle.solution)) won = true;
      render();
    }

    function buildBoard() {
      var maxRowClueLen = Math.max.apply(null, puzzle.rowClues.map(function (c) { return c.length; }));
      var maxColClueLen = Math.max.apply(null, puzzle.colClues.map(function (c) { return c.length; }));

      var table = document.createElement('div');
      table.className = 'picto-table';
      table.style.setProperty('--picto-cols', String(puzzle.width));
      table.style.setProperty('--picto-rows', String(puzzle.height));
      table.style.setProperty('--picto-row-clue-w', String(maxRowClueLen));
      table.style.setProperty('--picto-col-clue-h', String(maxColClueLen));
      table.setAttribute('role', 'group');
      table.setAttribute('aria-label', t('aria_board'));

      var corner = document.createElement('div');
      corner.className = 'picto-corner';
      table.append(corner);

      for (var c = 0; c < puzzle.width; c++) {
        var colCell = document.createElement('div');
        colCell.className = 'picto-col-clue';
        var colFilled = player.map(function (row) { return row[c]; });
        if (lineSatisfied(colFilled, puzzle.colClues[c])) colCell.classList.add('is-satisfied');
        puzzle.colClues[c].forEach(function (n) {
          var s = document.createElement('span');
          s.textContent = String(n);
          colCell.append(s);
        });
        colCell.style.gridColumn = String(c + 2);
        table.append(colCell);
      }

      for (var r = 0; r < puzzle.height; r++) {
        (function (r) {
          var rowCell = document.createElement('div');
          rowCell.className = 'picto-row-clue';
          if (lineSatisfied(player[r], puzzle.rowClues[r])) rowCell.classList.add('is-satisfied');
          rowCell.textContent = puzzle.rowClues[r].join(' ');
          rowCell.style.gridRow = String(r + 2);
          table.append(rowCell);

          for (var c2 = 0; c2 < puzzle.width; c2++) {
            (function (c2) {
              var cell = document.createElement('button');
              cell.type = 'button';
              cell.className = 'picto-cell';
              cell.style.gridRow = String(r + 2);
              cell.style.gridColumn = String(c2 + 2);
              cell.dataset.r = String(r);
              cell.dataset.c = String(c2);
              var state = player[r][c2];
              if (state === 1) cell.classList.add('is-filled');
              if (state === 2) cell.classList.add('is-marked');
              var stateKey = state === 1 ? 'cell_filled' : (state === 2 ? 'cell_marked' : 'cell_empty');
              cell.setAttribute('aria-label', t('aria_cell')(r + 1, c2 + 1, t(stateKey)));
              // Roving Tabindex: nur die aktuelle Zelle ist per Tab erreichbar
              cell.tabIndex = (r === curR && c2 === curC) ? 0 : -1;

              cell.addEventListener('pointerdown', function (ev) {
                ev.preventDefault();
                var cur = player[r][c2];
                var next = (ev.button === 2 || ev.shiftKey) ? (cur === 2 ? 0 : 2) : (cur === 1 ? 0 : 1);
                pointerMode = next;
                curR = r; curC = c2;
                setCell(r, c2, next);
              });
              cell.addEventListener('pointerenter', function () {
                if (pointerMode !== null) setCell(r, c2, pointerMode);
              });
              cell.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
              cell.addEventListener('keydown', function (ev) {
                var k = ev.key;
                if (k === 'ArrowUp') { ev.preventDefault(); moveCursor(-1, 0); }
                else if (k === 'ArrowDown') { ev.preventDefault(); moveCursor(1, 0); }
                else if (k === 'ArrowLeft') { ev.preventDefault(); moveCursor(0, -1); }
                else if (k === 'ArrowRight') { ev.preventDefault(); moveCursor(0, 1); }
                else if (k === 'Enter' || k === ' ' || k === 'Spacebar') { ev.preventDefault(); toggleFill(r, c2); }
                else if (k === 'x' || k === 'X' || k === 'Backspace' || k === 'Delete') { ev.preventDefault(); toggleMark(r, c2); }
              });
              table.append(cell);
            })(c2);
          }
        })(r);
      }
      return table;
    }

    window.addEventListener('pointerup', function () { pointerMode = null; });

    // Bewegt den Tastaturfokus im Gitter, Grenzen des Gitters begrenzen die Bewegung.
    function moveCursor(dr, dc) {
      var nr = Math.max(0, Math.min(puzzle.height - 1, curR + dr));
      var nc = Math.max(0, Math.min(puzzle.width - 1, curC + dc));
      if (nr === curR && nc === curC) return;
      curR = nr; curC = nc;
      focusAfterRender = true;
      render();
    }
    // Entspricht Linksklick/Tippen: fuellt die Zelle oder leert sie wieder.
    function toggleFill(r, c) {
      curR = r; curC = c;
      focusAfterRender = true;
      var cur = player[r][c];
      setCell(r, c, cur === 1 ? 0 : 1);
    }
    // Entspricht Rechtsklick/Umschalttaste plus Klick: markiert die Zelle als leer (X) oder hebt die Markierung auf.
    function toggleMark(r, c) {
      curR = r; curC = c;
      focusAfterRender = true;
      var cur = player[r][c];
      setCell(r, c, cur === 2 ? 0 : 2);
    }

    function render() {
      var board = buildBoard();
      boardWrap.replaceChildren(board);
      statusLine.textContent = t('level')(difficulty) + ' · ' + puzzle.width + 'x' + puzzle.height + ' · ' + (won ? t('solved') : t('unsolved'));
      winBanner.hidden = !won;
      levelRow.querySelectorAll('.picto-level-btn').forEach(function (b, i) {
        b.setAttribute('aria-pressed', String(i + 1 === difficulty));
      });
      if (focusAfterRender) {
        focusAfterRender = false;
        var sel = board.querySelector('.picto-cell[data-r="' + curR + '"][data-c="' + curC + '"]');
        if (sel) sel.focus();
      }
    }

    function relocalizeGame() {
      levelRow.querySelectorAll('.picto-level-btn').forEach(function (b, i) {
        b.textContent = t('level')(i + 1);
      });
      clearBtn.textContent = t('btn_clear');
      clearBtn.setAttribute('aria-label', t('aria_clear'));
      nextBtn.textContent = t('btn_next');
      nextBtn.setAttribute('aria-label', t('aria_next'));
      winBanner.textContent = t('win');
      render();
    }
    currentRelocalize = relocalizeGame;

    render();
  }

  /* ---------- Statische Texte ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    if (backLinkEl) backLinkEl.setAttribute('aria-label', t('back_aria'));
    setText('backLabel', t('back'));
    setText('navPrivacy', t('nav_privacy'));
    setText('navImprint', t('nav_imprint'));
  }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

  /* ---------- Start ---------- */
  function init() {
    document.documentElement.lang = lang;
    setFooterLinks();
    buildLangBar();
    buildThemeBar();
    applyTheme();
    applyTexts();

    if (systemDarkMQ.addEventListener) systemDarkMQ.addEventListener('change', function () { if (theme === 'auto') applyTheme(); });
    else if (systemDarkMQ.addListener) systemDarkMQ.addListener(function () { if (theme === 'auto') applyTheme(); });

    registerServiceWorker();

    if (stageEl) mountPicto(stageEl, 2);
  }

  init();
})();
