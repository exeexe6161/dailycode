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

  /* ---------- Sprache: I18N Tabelle DE/EN/TR ---------- */
  var LANGS = [
    { code: 'de', label: 'DE', name: 'Deutsch' },
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'tr', label: 'TR', name: 'Türkçe' }
  ];
  var I18N = {
    de: {
      subtitle: 'Fülle das Gitter: jede Zahl einmal pro Zeile, Spalte und Block.',
      lbl_time: 'Zeit',
      lbl_best: 'Bestzeit',
      best_none: 'noch keine',
      diff_group: 'Schwierigkeit',
      diff_leicht: 'Leicht',
      diff_mittel: 'Mittel',
      diff_schwer: 'Schwer',
      num_group: 'Zahlen eins bis neun',
      btn_undo: 'Rückgängig',
      btn_restart: 'Neustart',
      btn_new: 'Neues Rätsel',
      aria_erase: 'Ausgewähltes Feld löschen',
      aria_undo: 'Letzten Zug zurücknehmen',
      aria_restart: 'Rätsel auf die Vorgaben zurücksetzen',
      aria_new: 'Neues Rätsel erzeugen',
      aria_grid: 'Zahlengitter neun mal neun. Mit den Pfeiltasten bewegen, Ziffer eins bis neun setzen; Entf löscht.',
      aria_num: 'Zahl {n} setzen',
      aria_lang_group: 'Sprache',
      loading: 'Erzeuge Rätsel',
      msg_go: 'Los, fülle das Gitter',
      msg_given: 'Vorgegebenes Feld, nicht änderbar',
      msg_conflict: 'Konflikt in Zeile, Spalte oder Block',
      msg_set: 'Gesetzt',
      msg_cleared: 'Gelöscht',
      msg_select: 'Feld gewählt',
      msg_nothing: 'Bitte zuerst ein Feld wählen',
      msg_undo_empty: 'Kein Zug zum Zurücknehmen',
      win_title: 'Gelöst',
      win_time: 'Zeit {t}',
      win_best: 'Bestzeit {t}',
      win_restart: 'Neues Rätsel',
      cell_pos: 'Zeile {r} Spalte {c}',
      cell_given: 'vorgegeben',
      cell_empty: 'leer',
      cell_conflict: 'Konflikt',
      theme_group: 'Darstellung',
      theme_auto: 'Auto',
      theme_light: 'Hell',
      theme_dark: 'Dunkel',
      help_summary: 'So funktioniert es',
      help_1: 'Tippe ein Feld an oder bewege dich mit den Pfeiltasten. Setze dann über die Leiste oder die Tastatur eine Zahl.',
      help_2: 'Jede Zahl von eins bis neun darf in jeder Zeile, jeder Spalte und jedem Dreierblock nur einmal stehen.',
      help_3: 'Verstößt eine Zahl gegen die Regeln, wird das Feld farbig mit einem Ausrufezeichen markiert. Vorgegebene Felder sind fett und nicht änderbar.',
      nav_privacy: 'Datenschutz',
      nav_imprint: 'Impressum',
      home: 'Startseite',
      home_aria: 'Zur Startseite'
    },
    en: {
      subtitle: 'Fill the grid, each number once per row, column and block.',
      lbl_time: 'Time',
      lbl_best: 'Best time',
      best_none: 'none yet',
      diff_group: 'Difficulty',
      diff_leicht: 'Easy',
      diff_mittel: 'Medium',
      diff_schwer: 'Hard',
      num_group: 'Numbers one to nine',
      btn_undo: 'Undo',
      btn_restart: 'Restart',
      btn_new: 'New puzzle',
      aria_erase: 'Clear selected cell',
      aria_undo: 'Undo last move',
      aria_restart: 'Reset puzzle to the givens',
      aria_new: 'Generate new puzzle',
      aria_grid: 'Number grid nine by nine. Move with the arrow keys, set digit one to nine, Delete clears.',
      aria_num: 'Set number {n}',
      aria_lang_group: 'Language',
      loading: 'Generating puzzle',
      msg_go: 'Go, fill the grid',
      msg_given: 'Given cell, cannot be changed',
      msg_conflict: 'Conflict in row, column or block',
      msg_set: 'Set',
      msg_cleared: 'Cleared',
      msg_select: 'Cell selected',
      msg_nothing: 'Please select a cell first',
      msg_undo_empty: 'No move to undo',
      win_title: 'Solved',
      win_time: 'Time {t}',
      win_best: 'Best time {t}',
      win_restart: 'New puzzle',
      cell_pos: 'Row {r} column {c}',
      cell_given: 'given',
      cell_empty: 'empty',
      cell_conflict: 'conflict',
      theme_group: 'Appearance',
      theme_auto: 'Auto',
      theme_light: 'Light',
      theme_dark: 'Dark',
      help_summary: 'How it works',
      help_1: 'Tap a cell or move with the arrow keys, then set a number with the bar or the keyboard.',
      help_2: 'Each number from one to nine may appear only once in every row, column and three by three block.',
      help_3: 'A violation marks the cell in color with an exclamation mark. Given cells are bold and cannot be changed.',
      nav_privacy: 'Privacy',
      nav_imprint: 'Imprint',
      home: 'Home',
      home_aria: 'Go to home'
    },
    tr: {
      subtitle: 'Izgarayı doldur, her sayı her satırda, sütunda ve blokta yalnız bir kez bulunur.',
      lbl_time: 'Süre',
      lbl_best: 'En iyi süre',
      best_none: 'henüz yok',
      diff_group: 'Zorluk',
      diff_leicht: 'Kolay',
      diff_mittel: 'Orta',
      diff_schwer: 'Zor',
      num_group: 'Bir ile dokuz arası sayılar',
      btn_undo: 'Geri al',
      btn_restart: 'Yeniden başlat',
      btn_new: 'Yeni bulmaca',
      aria_erase: 'Seçili hücreyi sil',
      aria_undo: 'Son hamleyi geri al',
      aria_restart: 'Bulmacayı verilen değerlere sıfırla',
      aria_new: 'Yeni bulmaca oluştur',
      aria_grid: 'Dokuza dokuz sayı ızgarası. Ok tuşlarıyla hareket et, bir ile dokuz arası rakam gir, Sil ile temizle.',
      aria_num: '{n} sayısını gir',
      aria_lang_group: 'Dil',
      loading: 'Bulmaca oluşturuluyor',
      msg_go: 'Hadi, ızgarayı doldur',
      msg_given: 'Verilen hücre, değiştirilemez',
      msg_conflict: 'Satırda, sütunda veya blokta çakışma',
      msg_set: 'Girildi',
      msg_cleared: 'Silindi',
      msg_select: 'Hücre seçildi',
      msg_nothing: 'Lütfen önce bir hücre seç',
      msg_undo_empty: 'Geri alınacak hamle yok',
      win_title: 'Çözüldü',
      win_time: 'Süre {t}',
      win_best: 'En iyi süre {t}',
      win_restart: 'Yeni bulmaca',
      cell_pos: '{r}. satır {c}. sütun',
      cell_given: 'verilmiş',
      cell_empty: 'boş',
      cell_conflict: 'çakışma',
      theme_group: 'Görünüm',
      theme_auto: 'Otomatik',
      theme_light: 'Açık',
      theme_dark: 'Koyu',
      help_summary: 'Nasıl çalışır',
      help_1: 'Bir hücreye dokun veya ok tuşlarıyla hareket et, sonra sayı çubuğuyla ya da klavyeyle bir sayı gir.',
      help_2: 'Birden dokuza kadar her sayı, her satırda, her sütunda ve her üçe üç blokta yalnızca bir kez bulunabilir.',
      help_3: 'Bir ihlalde hücre renkli ve ünlem işaretiyle işaretlenir. Verilen hücreler kalın ve değiştirilemez.',
      nav_privacy: 'Gizlilik',
      nav_imprint: 'Künye',
      home: 'Ana sayfa',
      home_aria: 'Ana sayfaya git'
    }
  };
  function t(key) {
    var table = I18N[lang] || I18N.en;
    var v = table[key];
    if (v === undefined) v = I18N.en[key];
    return v === undefined ? key : v;
  }
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
    erase: svg('<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l9.6-9.6a2 2 0 0 1 2.8 0l5.5 5.5a2 2 0 0 1 0 2.8L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>'),
    globe: svg('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>')
  };
  var THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };

  /* ---------- DOM ---------- */
  var langbarEl     = document.getElementById('langbar');
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
  var lang = loadLang();
  var systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var themeToggleBtn = null;
  var langToggleBtn = null;
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

  /* ---------- Sprache: Umschalter, zyklisch DE -> EN -> TR -> DE ---------- */
  function saveLang(l) { if (!hasStorage) return; try { window.localStorage.setItem(LANG_KEY, l); } catch (e) {} }
  function setLang(l) {
    if (!I18N[l]) return;
    lang = l;
    saveLang(l);
    relocalize();
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
  function langName(c) {
    for (var i = 0; i < LANGS.length; i++) { if (LANGS[i].code === c) return LANGS[i].name; }
    return c;
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
  var lastWinSec = null, lastWinBestSec = null;
  var numBtns = [];
  var eraseBtn = null;
  var newPuzzleClicks = 0;

  /* ---------- Tagesdeterministischer Zufall ----------
     Aus einem Textschluessel (Tag in UTC plus Schwierigkeit) wird per
     FNV-1a ein 32 Bit Seed gehasht, daraus liefert mulberry32 eine
     deterministische Zufallsfolge. Dieselbe rng Instanz wird durch den
     GESAMTEN Erzeugungsdurchlauf weitergereicht, damit Tag plus
     Schwierigkeit immer exakt dasselbe Raetsel ergeben. */
  function dateKeyUTC(d) {
    d = d || new Date();
    var y = d.getUTCFullYear();
    var m = String(d.getUTCMonth() + 1).padStart(2, '0');
    var day = String(d.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t2 = Math.imul(a ^ (a >>> 15), 1 | a);
      t2 = (t2 + Math.imul(t2 ^ (t2 >>> 7), 61 | t2)) ^ t2;
      return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Helfer ---------- */
  function shuffle(a, rng) {
    var rnd = rng || Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function randInt(lo, hi, rng) { var rnd = rng || Math.random; return lo + Math.floor(rnd() * (hi - lo + 1)); }
  function boxOf(r, c) { return Math.floor(r / 3) * 3 + Math.floor(c / 3); }
  function bitToNum(bit) { var n = 0; while (bit > 1) { bit >>= 1; n++; } return n; }
  function popcount(x) { var n = 0; while (x) { x &= x - 1; n++; } return n; }

  /* ---------- Generator: vollstaendige gueltige Loesung ----------
     Backtracking, je Position zufaellige Zahlenreihenfolge ueber die
     uebergebene rng. Damit ist die erzeugte Loesung deterministisch
     (gleicher Seed) und gueltig. */
  function buildSolved(rng) {
    var g = new Array(81).fill(0);
    var rows = new Array(9).fill(0);
    var cols = new Array(9).fill(0);
    var boxes = new Array(9).fill(0);
    function fill(pos) {
      if (pos === 81) return true;
      var r = Math.floor(pos / 9), c = pos % 9, b = boxOf(r, c);
      var nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
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
  function makePuzzle(diff, rng) {
    var sol = buildSolved(rng);
    var puzzle = sol.slice();
    var order = []; for (var i = 0; i < 81; i++) order.push(i);
    shuffle(order, rng);
    var target = randInt(GIVENS[diff].min, GIVENS[diff].max, rng);
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
    else if (k >= '1' && k <= '9') { if (cellFocused()) { e.preventDefault(); setNumber(parseInt(k, 10)); } }
    else if (k === 'Backspace' || k === 'Delete' || k === '0') { if (cellFocused()) { e.preventDefault(); eraseSelected(); } }
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
    lastWinSec = sec; lastWinBestSec = bestSec;
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
    if (overlayBtn) overlayBtn.focus();
  }
  function refreshOverlayIfShown() {
    if (phase !== 'over' || !overlayEl || overlayEl.hidden || lastWinSec == null) return;
    if (overlayTitleEl) overlayTitleEl.textContent = t('win_title');
    if (overlayScoreEl) overlayScoreEl.textContent =
      fmt('win_time', { t: fmtTime(lastWinSec) }) + '  ·  ' + fmt('win_best', { t: fmtTime(lastWinBestSec) });
    if (overlayBtn) overlayBtn.textContent = t('win_restart');
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

  /* ---------- Ablauf: erzeugen, neustarten, neues Raetsel ----------
     Der Seed setzt sich aus dem Tag (UTC) und der Schwierigkeit zusammen,
     damit die Erstladung eines Tages je Schwierigkeit IMMER dasselbe
     Raetsel ergibt. Der "Neues Raetsel" Button haengt zusaetzlich einen
     Klick-Zaehler an den Seed, damit er bewusst ein anderes Raetsel liefert,
     ohne die deterministische Erstladung zu veraendern (der Zaehler lebt
     nur zur Laufzeit, ein Neuladen der Seite zeigt wieder das Tagesraetsel). */
  function generate(extraSalt) {
    phase = 'loading';
    selected = -1;
    hideOverlay();
    announce(t('loading'));
    if (gridEl) gridEl.setAttribute('aria-busy', 'true');
    // Ladezustand zuerst rendern, Erzeugung auf den naechsten Tick legen,
    // damit der UI-Thread nicht waehrend der Eindeutigkeitspruefung blockt.
    window.setTimeout(function () {
      var seed = 'grid9:' + dateKeyUTC() + ':' + difficulty + (extraSalt ? (':' + extraSalt) : '');
      var rng = mulberry32(fnv1a(seed));
      var res = makePuzzle(difficulty, rng);
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
      if (cellEls[selected]) cellEls[selected].focus();
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
  function newPuzzle() { newPuzzleClicks += 1; generate(newPuzzleClicks); }

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
      diffBtns[d].textContent = t('diff_' + d);
      diffBtns[d].setAttribute('aria-pressed', on ? 'true' : 'false');
      diffBtns[d].classList.toggle('is-active', on);
    }
    if (diffbarEl) diffbarEl.setAttribute('aria-label', t('diff_group'));
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
    numBtns = [];
    for (var n = 1; n <= 9; n++) {
      (function (num) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'num-btn';
        b.textContent = String(num);
        b.setAttribute('aria-label', fmt('aria_num', { n: num }));
        b.addEventListener('click', function () { setNumber(num); if (selected >= 0 && cellEls[selected]) cellEls[selected].focus(); });
        numpadEl.appendChild(b);
        numBtns.push(b);
      })(n);
    }
    eraseBtn = document.createElement('button');
    eraseBtn.type = 'button';
    eraseBtn.className = 'num-btn num-erase';
    eraseBtn.innerHTML = ICON.erase;
    eraseBtn.setAttribute('aria-label', t('aria_erase'));
    eraseBtn.addEventListener('click', function () { eraseSelected(); if (selected >= 0 && cellEls[selected]) cellEls[selected].focus(); });
    numpadEl.appendChild(eraseBtn);
  }
  function refreshNumpadTexts() {
    for (var n = 0; n < numBtns.length; n++) {
      numBtns[n].setAttribute('aria-label', fmt('aria_num', { n: n + 1 }));
    }
    if (eraseBtn) eraseBtn.setAttribute('aria-label', t('aria_erase'));
    if (numpadEl) numpadEl.setAttribute('aria-label', t('num_group'));
  }

  /* ---------- Statische Texte und Rechtslinks ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    setText('lblTime', t('lbl_time'));
    setText('lblBest', t('lbl_best'));
    setText('navPrivacy', t('nav_privacy'));
    setText('navImprint', t('nav_imprint'));
    setText('homeLabel', t('home'));
    var homeLinkEl = document.getElementById('homeLink');
    if (homeLinkEl) homeLinkEl.setAttribute('aria-label', t('home_aria'));
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
    if (linkPrivacyEl) linkPrivacyEl.setAttribute('href', '../datenschutz-' + lang + '.html');
    if (linkImprintEl) linkImprintEl.setAttribute('href', '../impressum-' + lang + '.html');
  }

  /* ---------- Neu Lokalisieren bei Sprachwechsel ----------
     Aktualisiert alle sichtbaren Texte sofort, auch mitten im Spiel:
     Schwierigkeitsauswahl, Zahlenleiste, Gitter Aria Labels, Fusszeile
     und ein gerade offenes Sieg Overlay. */
  function relocalize() {
    document.documentElement.lang = lang;
    applyTexts();
    refreshLangBar();
    refreshThemeBar();
    refreshDiffBar();
    refreshNumpadTexts();
    setFooterLinks();
    updateBest();
    if (cellEls.length) renderAll();
    refreshOverlayIfShown();
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
    document.documentElement.lang = lang;
    setFooterLinks();
    buildLangBar();
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
