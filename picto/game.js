/* ============================================================
   dailycode  Pixela  Nonogram Raetsel, v2
   Deterministisches Tagesraetsel je Datum und Stufe sowie ein
   unbegrenzter Modus mit stabiler Raetselnummer. Eindeutigkeit der
   Loesung per Constraint-Solver garantiert (kein Raten noetig). Vier
   Stufen (5x5, 10x10, 15x15, 20x20). Eingabe per Pointer Events,
   rechte Maustaste oder Shift markiert ein Feld als leer (X) statt
   es zu fuellen. Hinweis Button, optionaler Fehlerzaehler, Timer mit
   Pause im Hintergrund, Sternewertung nach dem Loesen, Spielstand,
   Tagesstatistik und Streak in localStorage.

   Dieses Projekt hat keinen Build Schritt, alle Spiele sind ein
   einzelnes game.js als IIFE ohne Modul System (gleiche Konvention
   wie flow8, cluster, echo). Vanilla JS, keine Libraries, keine
   externen Ressourcen, keine data-URI. Strikte CSP konform: keine
   Inline-Styles, Theme ueber data-Attribut.
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
      subtitle: 'Fülle das Gitter nach den Zahlenhinweisen an Zeilen und Spalten und decke das Bild auf.',
      level: function (n) { return 'Stufe ' + n; },
      solved: 'Gelöst',
      unsolved: 'noch nicht gelöst',
      btn_clear: 'Alles löschen',
      aria_clear: 'Alle Markierungen löschen',
      cell_filled: 'gefüllt',
      cell_marked: 'markiert',
      cell_empty: 'leer',
      aria_cell: function (r, c, state) { return 'Zelle ' + r + ', ' + c + ', ' + state; },
      aria_board: 'Bilderrätselgitter. Zeilenzahlen und Spaltenzahlen geben an, wie viele zusammenhängende Felder gefüllt werden. Tippen füllt ein Feld; die rechte Maustaste oder Umschalttaste markiert es als leer. Pfeiltasten bewegen den Fokus, Eingabe oder Leertaste füllt ein Feld, X oder Rücktaste markiert es.',
      win: 'Bild vollständig',
      theme_group: 'Darstellung',
      theme_auto: 'Auto',
      theme_light: 'Hell',
      theme_dark: 'Dunkel',
      aria_lang_group: 'Sprache',
      nav_privacy: 'Datenschutz',
      nav_imprint: 'Impressum',
      home: 'Startseite',
      home_aria: 'Zur Startseite',
      mode_daily: 'Tagesrätsel',
      mode_unlimited: 'Unbegrenzt',
      aria_mode_daily: 'Tagesrätsel wählen',
      aria_mode_unlimited: 'Unbegrenzten Modus wählen',
      puzzle_number: function (n) { return 'Rätsel Nr. ' + n; },
      aria_prev_puzzle: 'Voriges Rätsel anzeigen',
      aria_next_puzzle: 'Nächstes Rätsel anzeigen',
      aria_random_puzzle: 'Zufälliges Rätsel anzeigen',
      help_summary: 'So funktioniert es',
      help_1: 'Die Zahlen an jeder Zeile und Spalte zeigen, wie viele zusammenhängende Felder dort gefüllt werden müssen.',
      help_2: 'Tippen oder Klicken füllt ein Feld. Die rechte Maustaste oder die Umschalttaste markiert ein Feld stattdessen als leer.',
      help_3: 'Wechsle zwischen Tagesrätsel und Unbegrenzt, nutze bei Bedarf einen Hinweis und sieh nach dem Lösen deine Sternewertung.',
      btn_hint: 'Hinweis',
      aria_hint: 'Ein Hinweisfeld aufdecken',
      hint_count: function (n) { return 'Hinweise ' + n; },
      aria_toggle_errors: 'Fehleranzeige umschalten',
      error_count: function (n) { return 'Fehler ' + n; },
      stars_result: function (n) { return n + ' von 3 Sternen'; },
      stats_title: 'Statistik',
      stat_solved_cap: 'Gelöst',
      stat_current_cap: 'Serie',
      stat_best_cap: 'Beste Serie',
      stats_hint: 'Statistik nicht verfügbar, lokaler Speicher ist aus.'
    },
    en: {
      subtitle: 'Fill the grid using the row and column number clues to reveal the picture.',
      level: function (n) { return 'Level ' + n; },
      solved: 'Solved',
      unsolved: 'not solved yet',
      btn_clear: 'Clear all',
      aria_clear: 'Clear all marks',
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
      home: 'Home',
      home_aria: 'Go to home',
      mode_daily: 'Daily puzzle',
      mode_unlimited: 'Unlimited',
      aria_mode_daily: 'Choose daily puzzle',
      aria_mode_unlimited: 'Choose unlimited mode',
      puzzle_number: function (n) { return 'Puzzle number ' + n; },
      aria_prev_puzzle: 'Show previous puzzle',
      aria_next_puzzle: 'Show next puzzle',
      aria_random_puzzle: 'Show a random puzzle',
      help_summary: 'How it works',
      help_1: 'The numbers on each row and column show how many connected cells need to be filled there.',
      help_2: 'Tap or click fills a cell. Right click or Shift marks a cell as empty instead.',
      help_3: 'Switch between daily puzzle and unlimited mode, use a hint if you get stuck, and check your star rating after solving.',
      btn_hint: 'Hint',
      aria_hint: 'Reveal one hint cell',
      hint_count: function (n) { return 'Hints ' + n; },
      aria_toggle_errors: 'Toggle error display',
      error_count: function (n) { return 'Errors ' + n; },
      stars_result: function (n) { return n + ' out of 3 stars'; },
      stats_title: 'Statistics',
      stat_solved_cap: 'Solved',
      stat_current_cap: 'Streak',
      stat_best_cap: 'Best streak',
      stats_hint: 'Statistics unavailable, local storage is off.'
    },
    tr: {
      subtitle: 'Satır ve sütunlardaki sayı ipuçlarına göre ızgarayı doldur ve resmi ortaya çıkar.',
      level: function (n) { return 'Seviye ' + n; },
      solved: 'Çözüldü',
      unsolved: 'henüz çözülmedi',
      btn_clear: 'Tümünü temizle',
      aria_clear: 'Tüm işaretleri temizle',
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
      home: 'Ana sayfa',
      home_aria: 'Ana sayfaya git',
      mode_daily: 'Günlük bulmaca',
      mode_unlimited: 'Sınırsız',
      aria_mode_daily: 'Günlük bulmacayı seç',
      aria_mode_unlimited: 'Sınırsız modu seç',
      puzzle_number: function (n) { return 'Bulmaca numarası ' + n; },
      aria_prev_puzzle: 'Önceki bulmacayı göster',
      aria_next_puzzle: 'Sonraki bulmacayı göster',
      aria_random_puzzle: 'Rastgele bir bulmaca göster',
      help_summary: 'Nasıl çalışır',
      help_1: 'Her satır ve sütundaki sayılar, orada kaç bitişik hücrenin doldurulması gerektiğini gösterir.',
      help_2: 'Dokunma veya tıklama bir hücreyi doldurur. Sağ tık veya Shift tuşu bir hücreyi bunun yerine boş olarak işaretler.',
      help_3: 'Günlük bulmaca ile sınırsız mod arasında geçiş yap, gerekirse ipucu kullan ve çözdükten sonra yıldız puanını gör.',
      btn_hint: 'İpucu',
      aria_hint: 'Bir ipucu hücresini ortaya çıkar',
      hint_count: function (n) { return 'İpucu sayısı ' + n; },
      aria_toggle_errors: 'Hata görünümünü aç veya kapat',
      error_count: function (n) { return 'Hata sayısı ' + n; },
      stars_result: function (n) { return '3 üzerinden ' + n + ' yıldız'; },
      stats_title: 'İstatistik',
      stat_solved_cap: 'Çözülen',
      stat_current_cap: 'Seri',
      stat_best_cap: 'En iyi seri',
      stats_hint: 'İstatistik kullanılamıyor, yerel depolama kapalı.'
    }
  };
  function t(key) {
    var table = I18N[lang] || I18N.en;
    var v = table[key];
    if (v === undefined) v = I18N.en[key];
    return v === undefined ? key : v;
  }

  /* ---------- Lucide Bedien-Icons (ISC), wie in den anderen Spielen ----------
     Quelle: https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/<name>.svg
     Zur Buildzeit geholt und unveraendert eingebettet, kein Laufzeitnachladen. */
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" class="lucide" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  var ICON = {
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: svg('<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>'),
    monitor: svg('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'),
    globe: svg('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'),
    chevronLeft: svg('<path d="m15 18-6-6 6-6"/>'),
    chevronRight: svg('<path d="m9 18 6-6-6-6"/>'),
    shuffle: svg('<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>'),
    star: svg('<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'),
    eye: svg('<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: svg('<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>')
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
  var homeLinkEl     = document.getElementById('homeLink');

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
     Picto Logik v2. 0/1 Zellen, Zeilen- und Spaltenhinweise,
     deterministischer Seed fuer Tages- und Unbegrenzt-Modus, Solver
     fuer eindeutige Loesung. Vier Stufen: 5x5, 10x10, 15x15, 20x20.
     ============================================================ */
  var SIZE_BY_DIFFICULTY = {
    1: { size: 5, fillRatio: 0.50 },
    2: { size: 10, fillRatio: 0.45 },
    3: { size: 15, fillRatio: 0.42 },
    4: { size: 20, fillRatio: 0.38 }
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
  /* Gemeinsamer Kern fuer Tages- und Unbegrenzt-Modus: erzeugt Kandidaten aus
     einem Basis-Seed, bis eine eindeutige Loesung gefunden ist. */
  function buildPuzzle(baseSeed, size, fillRatio, maxAttempts) {
    maxAttempts = maxAttempts || 80;
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      var rng = mulberry32(baseSeed + attempt * 7919);
      var grid = randomConnectedPattern(rng, size, size, fillRatio);
      var clues = computeClues(grid);
      var n = countSolutions(clues.rows, clues.cols, size, size, 2);
      if (n === 1) {
        return { height: size, width: size, solution: grid, rowClues: clues.rows, colClues: clues.cols };
      }
    }
    // Fallback (in ausgiebigen Tests nie ausgeloest): niedrigere Fuellquote erzwingen
    var rngF = mulberry32(baseSeed + 999983);
    var gridF = randomConnectedPattern(rngF, size, size, Math.max(0.28, fillRatio - 0.12));
    var cluesF = computeClues(gridF);
    return { height: size, width: size, solution: gridF, rowClues: cluesF.rows, colClues: cluesF.cols };
  }
  /* Tagesraetsel: deterministisch je Datum (YYYY-MM-DD) und Stufe. */
  function generateDailyPuzzle(dateStr, difficulty) {
    var cfg = SIZE_BY_DIFFICULTY[difficulty];
    var baseSeed = hashStringToSeed('picto:daily:' + dateStr + ':' + cfg.size + 'x' + cfg.size + ':d' + difficulty);
    return buildPuzzle(baseSeed, cfg.size, cfg.fillRatio);
  }
  /* Unbegrenzter Modus: deterministisch je Raetselnummer und Stufe, unabhaengig vom Datum. */
  function generateUnlimitedPuzzle(index, difficulty) {
    var cfg = SIZE_BY_DIFFICULTY[difficulty];
    var idx = Math.max(0, Math.floor(index) || 0);
    var baseSeed = hashStringToSeed('picto:unlimited:' + idx + ':' + cfg.size + 'x' + cfg.size + ':d' + difficulty);
    return buildPuzzle(baseSeed, cfg.size, cfg.fillRatio);
  }
  function randomUnlimitedIndex() {
    return Math.floor(Math.random() * 1000000);
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
  /* Live Fehleranzahl: falsch gefuellte Zellen. Markierungen (X) zaehlen nie als Fehler. */
  function countErrors(player, solution) {
    var n = 0;
    for (var r = 0; r < solution.length; r++) {
      for (var c = 0; c < solution[0].length; c++) {
        if (player[r][c] === 1 && solution[r][c] !== 1) n++;
      }
    }
    return n;
  }
  /* Findet eine noch offene Zelle und liefert deren korrekten Zielwert (1 fuellen oder 2 markieren). */
  function getHint(player, solution) {
    var open = [];
    for (var r = 0; r < solution.length; r++) {
      for (var c = 0; c < solution[0].length; c++) {
        var shouldFill = solution[r][c] === 1;
        var isFilled = player[r][c] === 1;
        if (shouldFill !== isFilled) open.push({ r: r, c: c, value: shouldFill ? 1 : 2 });
      }
    }
    if (!open.length) return null;
    return open[Math.floor(Math.random() * open.length)];
  }
  /* 1 bis 3 Sterne aus Groesse, Zeit, Hinweisen und kumulierten Fehltritten. Nie 0 Sterne. */
  function starRating(size, elapsedSeconds, hintsUsed, mistakes) {
    var cells = size * size;
    var par = Math.round(cells * 1.1);
    var penalty = hintsUsed + mistakes;
    if (penalty === 0 && elapsedSeconds <= par) return 3;
    if (penalty <= 3 && elapsedSeconds <= par * 1.8) return 2;
    return 1;
  }

  /* ---------- Datum: YYYY-MM-DD in UTC, damit weltweit am selben Kalendertag dasselbe Raetsel gilt ---------- */
  function dateKeyUTC(d) {
    d = d || new Date();
    var y = d.getUTCFullYear();
    var m = String(d.getUTCMonth() + 1).padStart(2, '0');
    var day = String(d.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function prevDayKey(key) {
    var p = key.split('-');
    var dt = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    dt.setUTCDate(dt.getUTCDate() - 1);
    return dateKeyUTC(dt);
  }
  function isDateKey(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
  function intOr(v, d) {
    if (typeof v !== 'number' || !isFinite(v)) return d;
    v = Math.floor(v);
    return v < 0 ? d : v;
  }

  /* ============================================================
     Persistenz: Spielstand je Raetsel, Sitzungszustand, Tagesstatistik
     und Streak je Stufe. Alles defensiv gegen kaputte/fehlende Daten.
     ============================================================ */
  var PROGRESS_PREFIX = 'picto:progress:';
  var STATE_KEY = 'dailycode:pixela:state:v1';
  var STATS_KEY = 'dailycode:pixela:stats:v1';

  function puzzleId(mode, difficulty, dateOrIndex) {
    return mode === 'daily' ? ('daily:' + dateOrIndex + ':d' + difficulty) : ('unlimited:' + dateOrIndex + ':d' + difficulty);
  }
  function loadProgress(id) {
    if (!hasStorage) return null;
    try {
      var raw = window.localStorage.getItem(PROGRESS_PREFIX + id);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !Array.isArray(o.player)) return null;
      return o;
    } catch (e) { return null; }
  }
  function saveProgressEntry(id, data) {
    if (!hasStorage) return;
    try { window.localStorage.setItem(PROGRESS_PREFIX + id, JSON.stringify(data)); } catch (e) {}
  }

  function defaultState() {
    return { mode: 'daily', difficulty: 2, unlimitedIndexByDifficulty: { 1: 0, 2: 0, 3: 0, 4: 0 }, showErrors: false };
  }
  function loadState() {
    if (!hasStorage) return defaultState();
    try {
      var raw = window.localStorage.getItem(STATE_KEY);
      if (!raw) return defaultState();
      var o = JSON.parse(raw);
      var d = defaultState();
      if (o.mode === 'daily' || o.mode === 'unlimited') d.mode = o.mode;
      if ([1, 2, 3, 4].indexOf(o.difficulty) !== -1) d.difficulty = o.difficulty;
      if (o.unlimitedIndexByDifficulty && typeof o.unlimitedIndexByDifficulty === 'object') {
        for (var k = 1; k <= 4; k++) d.unlimitedIndexByDifficulty[k] = intOr(o.unlimitedIndexByDifficulty[k], 0);
      }
      d.showErrors = !!o.showErrors;
      return d;
    } catch (e) { return defaultState(); }
  }
  function saveState(s) { if (!hasStorage) return; try { window.localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) {} }

  function defaultDifficultyStats() { return { currentStreak: 0, maxStreak: 0, lastWinDate: null, totalSolved: 0 }; }
  function defaultStats() {
    return { byDifficulty: { 1: defaultDifficultyStats(), 2: defaultDifficultyStats(), 3: defaultDifficultyStats(), 4: defaultDifficultyStats() } };
  }
  function normalizeDifficultyStats(o) {
    var d = defaultDifficultyStats();
    if (!o || typeof o !== 'object') return d;
    d.currentStreak = intOr(o.currentStreak, 0);
    d.maxStreak = intOr(o.maxStreak, 0);
    d.lastWinDate = isDateKey(o.lastWinDate) ? o.lastWinDate : null;
    d.totalSolved = intOr(o.totalSolved, 0);
    if (d.currentStreak > d.maxStreak) d.maxStreak = d.currentStreak;
    return d;
  }
  function loadStats() {
    if (!hasStorage) return defaultStats();
    try {
      var raw = window.localStorage.getItem(STATS_KEY);
      if (!raw) return defaultStats();
      var o = JSON.parse(raw);
      var d = defaultStats();
      if (o && o.byDifficulty) { for (var k = 1; k <= 4; k++) d.byDifficulty[k] = normalizeDifficultyStats(o.byDifficulty[k]); }
      return d;
    } catch (e) { return defaultStats(); }
  }
  function saveStats(s) { if (!hasStorage) return; try { window.localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {} }
  function recordDailyWin(stats, difficulty, dateStr) {
    var ds = stats.byDifficulty[difficulty];
    if (ds.lastWinDate === dateStr) return stats; // bereits gezaehlt, Idempotenz
    ds.totalSolved += 1;
    ds.currentStreak = (ds.lastWinDate === prevDayKey(dateStr)) ? ds.currentStreak + 1 : 1;
    ds.lastWinDate = dateStr;
    if (ds.currentStreak > ds.maxStreak) ds.maxStreak = ds.currentStreak;
    saveStats(stats);
    return stats;
  }

  /* ============================================================
     Picto UI v2, gebunden an die Container Signatur mountPicto(container).
     ============================================================ */
  function mountPicto(container) {
    var state = loadState();
    var mode = state.mode;
    var difficulty = state.difficulty;
    var showErrors = state.showErrors;
    var dateStr = dateKeyUTC();
    var unlimitedIndex = state.unlimitedIndexByDifficulty[difficulty] || 0;
    var statsData = loadStats();

    var puzzle = null;
    var player = null;
    var won = false;
    var hintsUsed = 0;
    var mistakes = 0;
    var baseElapsed = 0;
    var segStart = 0;
    var timerStarted = false;
    var timerId = 0;
    var startedAt = null;
    var stars = 0;

    var pointerMode = null;
    var curR = 0; // Roving Tabindex: aktuell per Tastatur/Zeiger fokussierte Zelle
    var curC = 0;
    var focusAfterRender = false;
    var currentBoardEl = null;
    var resizeTimer = 0;

    container.replaceChildren();
    container.classList.add('picto-root');

    var modeRow = document.createElement('div');
    modeRow.className = 'picto-modes';
    var modeDailyBtn = modeButton('daily');
    var modeUnlimitedBtn = modeButton('unlimited');
    modeRow.append(modeDailyBtn, modeUnlimitedBtn);

    var levelRow = document.createElement('div');
    levelRow.className = 'picto-levels';
    [1, 2, 3, 4].forEach(function (lvl) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'picto-level-btn';
      b.textContent = t('level')(lvl);
      b.setAttribute('aria-pressed', String(lvl === difficulty));
      b.addEventListener('click', function () {
        if (lvl === difficulty) return; // Klick auf bereits aktive Stufe loescht keinen Fortschritt
        persistCurrentProgress();
        difficulty = lvl;
        state.difficulty = difficulty;
        unlimitedIndex = state.unlimitedIndexByDifficulty[difficulty] || 0;
        saveState(state);
        loadPuzzleForState();
        render();
      });
      levelRow.append(b);
    });

    var unlimitedNav = document.createElement('div');
    unlimitedNav.className = 'picto-unlimited-nav';
    var prevBtn = iconNavButton('chevronLeft', function () { goToIndex(Math.max(0, unlimitedIndex - 1)); }, 'aria_prev_puzzle');
    var numberEl = document.createElement('span');
    numberEl.className = 'picto-puzzle-number';
    var nextBtn = iconNavButton('chevronRight', function () { goToIndex(unlimitedIndex + 1); }, 'aria_next_puzzle');
    var randomBtn = iconNavButton('shuffle', function () { goToIndex(randomUnlimitedIndex()); }, 'aria_random_puzzle');
    unlimitedNav.append(prevBtn, numberEl, nextBtn, randomBtn);

    var statusLine = document.createElement('div');
    statusLine.className = 'picto-status';
    statusLine.setAttribute('role', 'status');
    statusLine.setAttribute('aria-live', 'polite');

    var boardWrap = document.createElement('div');
    boardWrap.className = 'picto-board-wrap';

    var hudRow = document.createElement('div');
    hudRow.className = 'picto-hud';
    var timerEl = document.createElement('span');
    timerEl.className = 'picto-timer';
    timerEl.setAttribute('aria-hidden', 'true');
    var hintBtn = button(t('btn_hint'), 'btn btn-ghost picto-hint-btn', t('aria_hint'), function () {
      if (won || !puzzle) return;
      var hint = getHint(player, puzzle.solution);
      if (!hint) return;
      startTimerIfNeeded();
      player[hint.r][hint.c] = hint.value;
      hintsUsed += 1;
      checkWinAndPersist();
      render();
    });
    var hintCountEl = document.createElement('span');
    hintCountEl.className = 'picto-hint-count';
    var errorsToggleBtn = document.createElement('button');
    errorsToggleBtn.type = 'button';
    errorsToggleBtn.className = 'icon-btn picto-errors-toggle';
    errorsToggleBtn.addEventListener('click', function () {
      showErrors = !showErrors;
      state.showErrors = showErrors;
      saveState(state);
      render();
    });
    var errorCountEl = document.createElement('span');
    errorCountEl.className = 'picto-error-count';
    hudRow.append(timerEl, hintBtn, hintCountEl, errorsToggleBtn, errorCountEl);

    var actions = document.createElement('div');
    actions.className = 'picto-actions';
    var clearBtn = button(t('btn_clear'), 'btn btn-ghost', t('aria_clear'), function () {
      player = makeEmptyPlayer(puzzle);
      won = false;
      hintsUsed = 0;
      mistakes = 0;
      baseElapsed = 0;
      segStart = 0;
      timerStarted = false;
      startedAt = null;
      stars = 0;
      persistCurrentProgress();
      render();
    });
    actions.append(clearBtn);

    var winBanner = document.createElement('div');
    winBanner.className = 'picto-win';
    winBanner.hidden = true;
    winBanner.setAttribute('role', 'status');
    winBanner.setAttribute('aria-live', 'polite');
    var winTextEl = document.createElement('p');
    winTextEl.className = 'picto-win-text';
    var starsEl = document.createElement('div');
    starsEl.className = 'picto-stars';
    winBanner.append(winTextEl, starsEl);

    var statsPanel = document.createElement('div');
    statsPanel.className = 'picto-stats';

    container.append(modeRow, levelRow, unlimitedNav, statusLine, boardWrap, hudRow, actions, winBanner, statsPanel);

    function modeButton(m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'picto-level-btn';
      b.textContent = t(m === 'daily' ? 'mode_daily' : 'mode_unlimited');
      b.setAttribute('aria-pressed', String(mode === m));
      b.setAttribute('aria-label', t(m === 'daily' ? 'aria_mode_daily' : 'aria_mode_unlimited'));
      b.addEventListener('click', function () {
        if (mode === m) return;
        persistCurrentProgress();
        mode = m;
        state.mode = mode;
        saveState(state);
        loadPuzzleForState();
        render();
      });
      return b;
    }
    function iconNavButton(iconKey, onClick, ariaKey) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'icon-btn picto-nav-btn';
      b.innerHTML = ICON[iconKey];
      b.setAttribute('aria-label', t(ariaKey));
      b.addEventListener('click', onClick);
      return b;
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
    function makeEmptyPlayer(p) {
      var rows = [];
      for (var r = 0; r < p.height; r++) rows.push(new Array(p.width).fill(0));
      return rows;
    }
    function goToIndex(idx) {
      persistCurrentProgress();
      unlimitedIndex = Math.max(0, idx);
      state.unlimitedIndexByDifficulty[difficulty] = unlimitedIndex;
      saveState(state);
      loadPuzzleForState();
      render();
    }
    function currentPuzzleId() {
      return mode === 'daily' ? puzzleId('daily', difficulty, dateStr) : puzzleId('unlimited', difficulty, unlimitedIndex);
    }

    function loadPuzzleForState() {
      puzzle = mode === 'daily' ? generateDailyPuzzle(dateStr, difficulty) : generateUnlimitedPuzzle(unlimitedIndex, difficulty);
      var saved = loadProgress(currentPuzzleId());
      if (saved && Array.isArray(saved.player) && saved.player.length === puzzle.height && saved.player[0] && saved.player[0].length === puzzle.width) {
        player = saved.player;
        hintsUsed = intOr(saved.hintsUsed, 0);
        mistakes = intOr(saved.mistakes, 0);
        baseElapsed = intOr(saved.elapsedSeconds, 0);
        startedAt = saved.startedAt || null;
        won = !!saved.completed;
        timerStarted = baseElapsed > 0 || won;
      } else {
        player = makeEmptyPlayer(puzzle);
        hintsUsed = 0;
        mistakes = 0;
        baseElapsed = 0;
        startedAt = null;
        won = false;
        timerStarted = false;
      }
      segStart = 0;
      curR = 0; curC = 0;
      stars = won ? starRating(puzzle.width, baseElapsed, hintsUsed, mistakes) : 0;
      stopTicker();
      if (!won && timerStarted && !document.hidden) { segStart = nowMs(); startTicker(); }
    }

    function persistCurrentProgress() {
      if (!puzzle) return;
      saveProgressEntry(currentPuzzleId(), {
        puzzleId: currentPuzzleId(),
        mode: mode,
        date: mode === 'daily' ? dateStr : null,
        puzzleNumber: mode === 'unlimited' ? unlimitedIndex : null,
        difficulty: difficulty,
        player: player,
        hintsUsed: hintsUsed,
        mistakes: mistakes,
        elapsedSeconds: Math.floor(currentElapsed()),
        startedAt: startedAt,
        completed: won
      });
    }

    /* ---------- Timer: startet erst bei echter Interaktion, pausiert im Hintergrund ---------- */
    function nowMs() { return window.performance && performance.now ? performance.now() : new Date().getTime(); }
    function currentElapsed() { return baseElapsed + (segStart ? (nowMs() - segStart) / 1000 : 0); }
    function startTimerIfNeeded() {
      if (!timerStarted) { timerStarted = true; startedAt = new Date().toISOString(); }
      if (!segStart) { segStart = nowMs(); startTicker(); }
    }
    function startTicker() {
      if (timerId) return;
      timerId = window.setInterval(function () { if (!won) updateTimerDisplay(); }, 500);
    }
    function stopTicker() { if (timerId) { window.clearInterval(timerId); timerId = 0; } }
    function stopTimer() {
      if (segStart) { baseElapsed = currentElapsed(); segStart = 0; }
      stopTicker();
    }
    function updateTimerDisplay() { if (timerEl) timerEl.textContent = fmtTime(Math.floor(currentElapsed())); }
    function fmtTime(sec) {
      sec = Math.max(0, sec);
      var m = Math.floor(sec / 60), s = sec % 60;
      return m + ':' + (s < 10 ? '0' : '') + s;
    }
    function onVisibility() {
      if (document.hidden) {
        if (segStart) { baseElapsed = currentElapsed(); segStart = 0; }
      } else if (timerStarted && !won && !segStart) {
        segStart = nowMs();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    window.addEventListener('pointerup', function () { pointerMode = null; });
    // Fenstergroesse oder Ausrichtung aendert sich: Zellgroesse neu messen, ohne den Spielstand anzufassen.
    window.addEventListener('resize', function () {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { if (currentBoardEl) sizeBoard(currentBoardEl); }, 150);
    });

    function setCell(r, c, val) {
      if (won) return;
      var prev = player[r][c];
      if (prev === val) return;
      startTimerIfNeeded();
      if (val === 1 && puzzle.solution[r][c] !== 1) mistakes += 1;
      player[r][c] = val;
      checkWinAndPersist();
      render();
    }
    function checkWinAndPersist() {
      if (!won && isSolved(player, puzzle.solution)) {
        won = true;
        stopTimer();
        stars = starRating(puzzle.width, Math.floor(currentElapsed()), hintsUsed, mistakes);
        if (mode === 'daily') recordDailyWin(statsData, difficulty, dateStr);
      }
      persistCurrentProgress();
    }

    /* Misst nach dem Anhaengen ans DOM die tatsaechlich verfuegbare Breite und die reale
       Breite der Zeilenhinweis Spalte (kein Schaetzwert), damit die Zellgroesse in jeder
       Stufe exakt in picto-board-wrap passt und nur bei 20x20 auf schmalen Screens ueberhaupt
       an die feste Untergrenze stoesst und Scroll ausloest. */
    function sizeBoard(table) {
      if (!table || !puzzle) return;
      var cols = puzzle.width;
      var floorPx = 15;
      var maxPx = Math.min(48, Math.max(18, Math.round(300 / cols)));
      var gapPx = parseFloat(window.getComputedStyle(table).columnGap) || 2;
      var clueW = 0;
      table.querySelectorAll('.picto-row-clue').forEach(function (el) {
        var w = el.getBoundingClientRect().width;
        if (w > clueW) clueW = w;
      });
      var available = boardWrap.clientWidth - clueW - gapPx * cols - 2; // 2px Sicherheitsabstand gegen Rundung
      var cellPx = Math.max(floorPx, Math.min(maxPx, Math.floor(available / cols)));
      table.style.setProperty('--picto-cell-size', cellPx + 'px');
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
              var st = player[r][c2];
              if (st === 1) cell.classList.add('is-filled');
              if (st === 2) cell.classList.add('is-marked');
              var stateKey = st === 1 ? 'cell_filled' : (st === 2 ? 'cell_marked' : 'cell_empty');
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

    function statCellHtml(num, cap) {
      return '<div class="stat-cell"><div class="stat-num">' + num + '</div><div class="stat-cap">' + cap + '</div></div>';
    }
    function renderStatsPanel() {
      if (!hasStorage) {
        statsPanel.innerHTML = '<p class="stats-hint">' + t('stats_hint') + '</p>';
        return;
      }
      var ds = statsData.byDifficulty[difficulty];
      var html = '<h2 class="picto-stats-title">' + t('stats_title') + '</h2>';
      html += '<div class="stat-grid">';
      html += statCellHtml(ds.totalSolved, t('stat_solved_cap'));
      html += statCellHtml(ds.currentStreak, t('stat_current_cap'));
      html += statCellHtml(ds.maxStreak, t('stat_best_cap'));
      html += '</div>';
      statsPanel.innerHTML = html;
    }

    function renderStars() {
      starsEl.innerHTML = '';
      starsEl.setAttribute('role', 'img');
      starsEl.setAttribute('aria-label', t('stars_result')(stars));
      for (var i = 1; i <= 3; i++) {
        var s = document.createElement('span');
        s.className = 'picto-star' + (i <= stars ? ' is-lit' : '');
        s.innerHTML = ICON.star;
        s.setAttribute('aria-hidden', 'true');
        starsEl.append(s);
      }
    }

    function render() {
      modeDailyBtn.setAttribute('aria-pressed', String(mode === 'daily'));
      modeUnlimitedBtn.setAttribute('aria-pressed', String(mode === 'unlimited'));
      unlimitedNav.hidden = mode !== 'unlimited';
      if (mode === 'unlimited') numberEl.textContent = t('puzzle_number')(unlimitedIndex + 1);

      levelRow.querySelectorAll('.picto-level-btn').forEach(function (b, i) {
        b.setAttribute('aria-pressed', String(i + 1 === difficulty));
      });

      var board = buildBoard();
      boardWrap.replaceChildren(board);
      currentBoardEl = board;
      sizeBoard(board);

      var modeLabel = mode === 'daily' ? (t('mode_daily') + ' ' + dateStr) : (t('mode_unlimited') + ' · ' + t('puzzle_number')(unlimitedIndex + 1));
      statusLine.textContent = modeLabel + ' · ' + t('level')(difficulty) + ' · ' + puzzle.width + 'x' + puzzle.height + ' · ' + (won ? t('solved') : t('unsolved'));

      updateTimerDisplay();
      hintBtn.disabled = won;
      hintCountEl.textContent = t('hint_count')(hintsUsed);
      errorsToggleBtn.innerHTML = ICON[showErrors ? 'eye' : 'eyeOff'];
      errorsToggleBtn.setAttribute('aria-pressed', String(showErrors));
      errorsToggleBtn.setAttribute('aria-label', t('aria_toggle_errors'));
      errorCountEl.hidden = !showErrors;
      if (showErrors) errorCountEl.textContent = t('error_count')(countErrors(player, puzzle.solution));

      winBanner.hidden = !won;
      if (won) { winTextEl.textContent = t('win'); renderStars(); }

      renderStatsPanel();

      if (focusAfterRender) {
        focusAfterRender = false;
        var sel = board.querySelector('.picto-cell[data-r="' + curR + '"][data-c="' + curC + '"]');
        if (sel) sel.focus();
      }
    }

    function relocalizeGame() {
      modeDailyBtn.textContent = t('mode_daily');
      modeDailyBtn.setAttribute('aria-label', t('aria_mode_daily'));
      modeUnlimitedBtn.textContent = t('mode_unlimited');
      modeUnlimitedBtn.setAttribute('aria-label', t('aria_mode_unlimited'));
      prevBtn.setAttribute('aria-label', t('aria_prev_puzzle'));
      nextBtn.setAttribute('aria-label', t('aria_next_puzzle'));
      randomBtn.setAttribute('aria-label', t('aria_random_puzzle'));
      levelRow.querySelectorAll('.picto-level-btn').forEach(function (b, i) { b.textContent = t('level')(i + 1); });
      hintBtn.textContent = t('btn_hint');
      hintBtn.setAttribute('aria-label', t('aria_hint'));
      clearBtn.textContent = t('btn_clear');
      clearBtn.setAttribute('aria-label', t('aria_clear'));
      render();
    }
    currentRelocalize = relocalizeGame;

    loadPuzzleForState();
    render();
  }

  /* ---------- Statische Texte ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    if (homeLinkEl) homeLinkEl.setAttribute('aria-label', t('home_aria'));
    setText('homeLabel', t('home'));
    setText('navPrivacy', t('nav_privacy'));
    setText('navImprint', t('nav_imprint'));
    setText('helpSummary', t('help_summary'));
    setText('help1', t('help_1'));
    setText('help2', t('help_2'));
    setText('help3', t('help_3'));
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

    if (stageEl) mountPicto(stageEl);
  }

  init();
})();
