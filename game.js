/* ============================================================
   dailycode  Kernschleife
   Deduktives Code Knacken mit Treffer Feedback je Position.
   Vanilla JS, keine Frameworks, keine Libraries.
   ============================================================ */
(function () {
  'use strict';

  var POSITIONS = 4;
  var SYMBOL_COUNT = 6;
  var MAX_TRIES = 6;
  var STORAGE_KEY = 'dailycode:v1';
  var LANG_KEY = 'dailycode:lang';

  var SYMBOLS = [
    { id: 'sym-circle',   key: 'sym_circle' },
    { id: 'sym-triangle', key: 'sym_triangle' },
    { id: 'sym-square',   key: 'sym_square' },
    { id: 'sym-diamond',  key: 'sym_diamond' },
    { id: 'sym-star',     key: 'sym_star' },
    { id: 'sym-hexagon',  key: 'sym_hexagon' }
  ];

  var STATE_BADGE = { correct: '✓', present: '◐', absent: '✕' };
  var STATE_KEY = { correct: 'state_correct', present: 'state_present', absent: 'state_absent' };

  // Nur generische Unicode Quadrate, ueberall vorhanden, kein Code Spoiler.
  var SHARE_EMOJI = { correct: '🟩', present: '🟨', absent: '⬛' };

  var LANGS = [
    { code: 'de', label: 'DE', name: 'Deutsch' },
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'tr', label: 'TR', name: 'Türkçe' }
  ];

  /* ---------- Sprachen: alle sichtbaren Strings und aria-labels ---------- */
  // Werte sind Vorlagen mit {platzhalter} oder Funktionen (params) fuer Grammatik.
  var I18N = {
    de: {
      subtitle: 'Knacke den geheimen Code des Tages.',
      aria_board: 'Spielfeld',
      aria_palette: 'Symbolauswahl',
      btn_clear: 'Letztes entfernen',
      btn_check: 'Prüfen',
      aria_result: 'Ergebnis und Statistik',
      btn_copy: 'Ergebnis kopieren',
      btn_share: 'Teilen',
      help_summary: 'So funktioniert es',
      help_1: 'Der Code besteht aus 4 Positionen mit 6 möglichen Symbolen. Symbole können sich wiederholen.',
      help_2: 'Du hast 6 Versuche. Tippe 4 Symbole und bestätige mit Prüfen.',
      help_green: 'Grün bedeutet richtiges Symbol an richtiger Position.',
      help_yellow: 'Gelb bedeutet Symbol kommt im Code vor, aber an anderer Position.',
      help_gray: 'Grau bedeutet Symbol kommt im Code nicht vor.',
      help_keyboard: 'Tastatur: Tasten 1 bis 6 setzen Symbole, Rücktaste entfernt, Eingabe prüft.',
      sym_circle: 'Kreis',
      sym_triangle: 'Dreieck',
      sym_square: 'Quadrat',
      sym_diamond: 'Raute',
      sym_star: 'Stern',
      sym_hexagon: 'Sechseck',
      state_correct: 'richtig',
      state_present: 'vorhanden, andere Position',
      state_absent: 'nicht im Code',
      aria_row: 'Versuch {n} von {max}',
      aria_slot_empty: 'Position {n}, leer',
      aria_slot_filled: 'Position {n}, {name}. Antippen zum Entfernen.',
      aria_slot_eval: 'Position {n}, {name}, {state}',
      aria_sym_set: 'Symbol {name} setzen',
      aria_sym_plain: 'Symbol {name}',
      aria_reveal: 'Geheimer Code: {code}',
      reveal_label: 'Code:',
      status_fresh: 'Tagescode vom {date} nach UTC. {pos} Positionen, {sym} Symbole, {max} Versuche.',
      status_win: 'Geknackt in {n} von {max} Versuchen.',
      status_lose: 'Keine Versuche mehr. Der Code war: {code}.',
      status_evaluated: function (p) {
        return 'Versuch ' + p.n + ' ausgewertet. Noch ' + p.rest + ' ' + (p.rest === 1 ? 'Versuch' : 'Versuche') + '.';
      },
      status_restore_win: 'Bereits gelöst. Geknackt in {n} von {max} Versuchen.',
      status_restore_lose: 'Bereits gespielt. Der Code war: {code}.',
      status_resume: 'Spiel fortgesetzt. Versuch {n} von {max}.',
      result_lose: 'Nicht gelöst.',
      stat_played: 'Gespielt',
      stat_winrate: 'Siegquote',
      stat_streak: 'Streak',
      stat_max: 'Längste',
      dist_title: 'Versuche bei Sieg',
      dist_bar: function (p) {
        return p.row + ' ' + (p.row === 1 ? 'Versuch' : 'Versuche') + ': ' + p.wins + ' ' + (p.wins === 1 ? 'Sieg' : 'Siege');
      },
      stats_hint: 'Statistik nicht verfügbar, lokaler Speicher ist aus.',
      copy_done: 'Kopiert',
      share_done: 'Geteilt',
      copy_fail: 'Kopieren nicht möglich, bitte manuell markieren',
      aria_lang_group: 'Sprache',
      nav_privacy: 'Datenschutz',
      nav_imprint: 'Impressum'
    },
    en: {
      subtitle: 'Crack the secret code of the day.',
      aria_board: 'Game board',
      aria_palette: 'Symbol picker',
      btn_clear: 'Remove last',
      btn_check: 'Check',
      aria_result: 'Result and statistics',
      btn_copy: 'Copy result',
      btn_share: 'Share',
      help_summary: 'How it works',
      help_1: 'The code has 4 positions with 6 possible symbols. Symbols can repeat.',
      help_2: 'You have 6 tries. Place 4 symbols and confirm with Check.',
      help_green: 'Green means the right symbol in the right position.',
      help_yellow: 'Yellow means the symbol is in the code but in another position.',
      help_gray: 'Gray means the symbol is not in the code.',
      help_keyboard: 'Keyboard: keys 1 to 6 place symbols, Backspace removes, Enter checks.',
      sym_circle: 'Circle',
      sym_triangle: 'Triangle',
      sym_square: 'Square',
      sym_diamond: 'Diamond',
      sym_star: 'Star',
      sym_hexagon: 'Hexagon',
      state_correct: 'correct',
      state_present: 'present, wrong position',
      state_absent: 'not in the code',
      aria_row: 'Try {n} of {max}',
      aria_slot_empty: 'Position {n}, empty',
      aria_slot_filled: 'Position {n}, {name}. Tap to remove.',
      aria_slot_eval: 'Position {n}, {name}, {state}',
      aria_sym_set: 'Place symbol {name}',
      aria_sym_plain: 'Symbol {name}',
      aria_reveal: 'Secret code: {code}',
      reveal_label: 'Code:',
      status_fresh: 'Daily code for {date} in UTC. {pos} positions, {sym} symbols, {max} tries.',
      status_win: 'Cracked in {n} of {max} tries.',
      status_lose: 'No tries left. The code was: {code}.',
      status_evaluated: function (p) {
        return 'Try ' + p.n + ' checked. ' + p.rest + ' ' + (p.rest === 1 ? 'try' : 'tries') + ' left.';
      },
      status_restore_win: 'Already solved. Cracked in {n} of {max} tries.',
      status_restore_lose: 'Already played. The code was: {code}.',
      status_resume: 'Game resumed. Try {n} of {max}.',
      result_lose: 'Not solved.',
      stat_played: 'Played',
      stat_winrate: 'Win rate',
      stat_streak: 'Streak',
      stat_max: 'Longest',
      dist_title: 'Win distribution',
      dist_bar: function (p) {
        return p.row + ' ' + (p.row === 1 ? 'try' : 'tries') + ': ' + p.wins + ' ' + (p.wins === 1 ? 'win' : 'wins');
      },
      stats_hint: 'Statistics not available, local storage is off.',
      copy_done: 'Copied',
      share_done: 'Shared',
      copy_fail: 'Copy failed, please select manually',
      aria_lang_group: 'Language',
      nav_privacy: 'Privacy',
      nav_imprint: 'Imprint'
    },
    tr: {
      subtitle: 'Günün gizli kodunu çöz.',
      aria_board: 'Oyun alanı',
      aria_palette: 'Simge seçimi',
      btn_clear: 'Sonuncuyu sil',
      btn_check: 'Kontrol et',
      aria_result: 'Sonuç ve istatistik',
      btn_copy: 'Sonucu kopyala',
      btn_share: 'Paylaş',
      help_summary: 'Nasıl çalışır',
      help_1: 'Kod, 6 olası simgeden oluşan 4 konum içerir. Simgeler tekrarlanabilir.',
      help_2: '6 deneme hakkın var. 4 simge yerleştir ve Kontrol et ile onayla.',
      help_green: 'Yeşil, doğru konumda doğru simge demektir.',
      help_yellow: 'Sarı, simge kodda var ama başka konumda demektir.',
      help_gray: 'Gri, simge kodda yok demektir.',
      help_keyboard: 'Klavye: 1 ile 6 tuşları simge yerleştirir, Geri tuşu siler, Enter kontrol eder.',
      sym_circle: 'Daire',
      sym_triangle: 'Üçgen',
      sym_square: 'Kare',
      sym_diamond: 'Karo',
      sym_star: 'Yıldız',
      sym_hexagon: 'Altıgen',
      state_correct: 'doğru',
      state_present: 'var, yanlış konumda',
      state_absent: 'kodda yok',
      aria_row: 'Deneme {n} / {max}',
      aria_slot_empty: 'Konum {n}, boş',
      aria_slot_filled: 'Konum {n}, {name}. Kaldırmak için dokun.',
      aria_slot_eval: 'Konum {n}, {name}, {state}',
      aria_sym_set: '{name} simgesini yerleştir',
      aria_sym_plain: '{name} simgesi',
      aria_reveal: 'Gizli kod: {code}',
      reveal_label: 'Kod:',
      status_fresh: '{date} için UTC günlük kodu. {pos} konum, {sym} simge, {max} deneme.',
      status_win: '{n}. denemede çözüldü.',
      status_lose: 'Deneme kalmadı. Kod şuydu: {code}.',
      status_evaluated: 'Deneme {n} değerlendirildi. {rest} deneme kaldı.',
      status_restore_win: 'Zaten çözüldü, {n}. denemede.',
      status_restore_lose: 'Bugün zaten oynandı. Kod şuydu: {code}.',
      status_resume: 'Oyun sürdürüldü. Deneme {n} / {max}.',
      result_lose: 'Çözülemedi.',
      stat_played: 'Oynanan',
      stat_winrate: 'Kazanma oranı',
      stat_streak: 'Seri',
      stat_max: 'En uzun',
      dist_title: 'Galibiyet dağılımı',
      dist_bar: '{row}. deneme: {wins} galibiyet',
      stats_hint: 'İstatistik kullanılamıyor, yerel depolama kapalı.',
      copy_done: 'Kopyalandı',
      share_done: 'Paylaşıldı',
      copy_fail: 'Kopyalanamadı, lütfen elle seçin',
      aria_lang_group: 'Dil',
      nav_privacy: 'Gizlilik',
      nav_imprint: 'Künye'
    }
  };

  function fill(str, params) {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, function (m, k) {
      return (params[k] !== undefined) ? String(params[k]) : m;
    });
  }

  function t(key, params) {
    var table = I18N[lang] || I18N.en;
    var entry = table[key];
    if (entry === undefined) entry = I18N.en[key]; // Fallback en
    if (entry === undefined) return key;
    if (typeof entry === 'function') return entry(params || {});
    return fill(entry, params);
  }

  function symbolName(index) { return t(SYMBOLS[index].key); }

  /* ---------- Täglicher Code: deterministisch, UTC ---------- */

  // YYYY-MM-DD aus UTC, damit weltweit am selben Kalendertag derselbe Code gilt.
  function dateKeyUTC(d) {
    d = d || new Date();
    var y = d.getUTCFullYear();
    var m = String(d.getUTCMonth() + 1).padStart(2, '0');
    var day = String(d.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // Vortag zu einem YYYY-MM-DD Schluessel, robust ueber Monats und Jahresgrenzen, in UTC.
  function prevDayKey(key) {
    var p = key.split('-');
    var dt = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    dt.setUTCDate(dt.getUTCDate() - 1);
    return dateKeyUTC(dt);
  }

  // FNV 1a, 32 Bit. Einfache, nachvollziehbare Hashfunktion ohne Library.
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // mulberry32, deterministischer PRNG aus einem 32 Bit Seed.
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t2 = Math.imul(a ^ (a >>> 15), 1 | a);
      t2 = (t2 + Math.imul(t2 ^ (t2 >>> 7), 61 | t2)) ^ t2;
      return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCode(key) {
    var rng = mulberry32(fnv1a(key));
    var out = [];
    for (var i = 0; i < POSITIONS; i++) {
      out.push(Math.floor(rng() * SYMBOL_COUNT));
    }
    return out;
  }

  /* ---------- Feedback je Position, korrekte Duplikat Behandlung ---------- */
  function evaluate(guess, code) {
    var result = new Array(POSITIONS).fill('absent');
    var remaining = {};
    var i, g;
    for (i = 0; i < POSITIONS; i++) {
      if (guess[i] === code[i]) {
        result[i] = 'correct';
      } else {
        remaining[code[i]] = (remaining[code[i]] || 0) + 1;
      }
    }
    for (i = 0; i < POSITIONS; i++) {
      if (result[i] === 'correct') continue;
      g = guess[i];
      if (remaining[g] > 0) {
        result[i] = 'present';
        remaining[g] -= 1;
      }
    }
    return result;
  }

  /* ---------- Persistenz: localStorage, robust und defensiv ---------- */
  function storageOK() {
    try {
      var k = '__dc_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function isDateKey(v) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    var p = v.split('-');
    var dt = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    return dateKeyUTC(dt) === v;
  }

  function intOr(v, d) {
    if (typeof v !== 'number' || !isFinite(v)) return d;
    v = Math.floor(v);
    return v < 0 ? d : v;
  }

  function normalizeGuesses(g) {
    if (!Array.isArray(g)) return null;
    var rows = [];
    for (var i = 0; i < g.length && i < MAX_TRIES; i++) {
      var row = g[i];
      if (!Array.isArray(row) || row.length !== POSITIONS) return null;
      var clean = [];
      for (var c = 0; c < POSITIONS; c++) {
        var v = row[c];
        if (typeof v !== 'number' || !isFinite(v) || Math.floor(v) !== v || v < 0 || v >= SYMBOL_COUNT) {
          return null;
        }
        clean.push(v);
      }
      rows.push(clean);
    }
    return rows;
  }

  function normalizeDayRecord(o) {
    if (!o || typeof o !== 'object') return null;
    if (!isDateKey(o.date)) return null;
    var rows = normalizeGuesses(o.guesses);
    if (!rows || rows.length === 0) return null;
    return { date: o.date, guesses: rows };
  }

  function defaultStats() {
    return {
      currentStreak: 0,
      maxStreak: 0,
      lastPlayedDate: null,
      lastWinDate: null,
      played: 0,
      wins: 0,
      dist: [0, 0, 0, 0, 0, 0],
      last: null,
      progress: null
    };
  }

  function normalizeStats(o) {
    var d = defaultStats();
    if (!o || typeof o !== 'object') return d;
    d.currentStreak = intOr(o.currentStreak, 0);
    d.maxStreak = intOr(o.maxStreak, 0);
    d.lastPlayedDate = isDateKey(o.lastPlayedDate) ? o.lastPlayedDate : null;
    d.lastWinDate = isDateKey(o.lastWinDate) ? o.lastWinDate : null;
    d.played = intOr(o.played, 0);
    d.wins = intOr(o.wins, 0);
    if (Array.isArray(o.dist)) {
      for (var i = 0; i < 6; i++) { d.dist[i] = intOr(o.dist[i], 0); }
    }
    d.last = normalizeDayRecord(o.last);
    d.progress = normalizeDayRecord(o.progress);
    if (d.wins > d.played) d.played = d.wins;
    if (d.currentStreak > d.maxStreak) d.maxStreak = d.currentStreak;
    return d;
  }

  function loadStats() {
    if (!hasStorage) return defaultStats();
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultStats();
      return normalizeStats(JSON.parse(raw));
    } catch (e) {
      return defaultStats();
    }
  }

  function saveStats(s) {
    if (!hasStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {
      // Speicher voll oder gesperrt: Spiel laeuft ohne Persistenz weiter.
    }
  }

  function recordResult(won, tries) {
    if (stats.lastPlayedDate === todayKey) return; // bereits gezaehlt, Idempotenz
    stats.played += 1;
    if (won) {
      stats.wins += 1;
      if (tries >= 1 && tries <= MAX_TRIES) stats.dist[tries - 1] += 1;
      stats.currentStreak = (stats.lastWinDate === prevDayKey(todayKey)) ? stats.currentStreak + 1 : 1;
      stats.lastWinDate = todayKey;
    } else {
      stats.currentStreak = 0;
    }
    if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;
    stats.lastPlayedDate = todayKey;
    stats.last = { date: todayKey, guesses: playedGuesses.slice() };
    stats.progress = null;
    saveStats(stats);
  }

  function saveProgress() {
    stats.progress = { date: todayKey, guesses: playedGuesses.slice() };
    saveStats(stats);
  }

  /* ---------- Sprache: Wahl laden, speichern, setzen ---------- */
  function loadLang() {
    var stored = null;
    if (hasStorage) {
      try { stored = window.localStorage.getItem(LANG_KEY); } catch (e) { stored = null; }
    }
    if (stored && I18N[stored]) return stored;
    var navs = [];
    if (navigator.languages && navigator.languages.length) navs = navigator.languages;
    else if (navigator.language) navs = [navigator.language];
    for (var i = 0; i < navs.length; i++) {
      var two = String(navs[i]).slice(0, 2).toLowerCase();
      if (two === 'de' || two === 'en' || two === 'tr') return two;
    }
    return 'en';
  }

  function saveLang(l) {
    if (!hasStorage) return;
    try { window.localStorage.setItem(LANG_KEY, l); } catch (e) { /* nur Sitzung */ }
  }

  function setLang(l) {
    if (!I18N[l]) return;
    lang = l;
    saveLang(l);
    relocalize();
  }

  /* ---------- DOM ---------- */
  var boardEl        = document.getElementById('board');
  var paletteEl      = document.getElementById('palette');
  var statusEl       = document.getElementById('status');
  var checkBtn       = document.getElementById('check');
  var clearBtn       = document.getElementById('clear');
  var langbarEl      = document.getElementById('langbar');
  var resultEl       = document.getElementById('result');
  var resultLineEl   = document.getElementById('resultLine');
  var shareGridEl    = document.getElementById('shareGrid');
  var copyBtn        = document.getElementById('copyBtn');
  var copyFeedbackEl = document.getElementById('copyFeedback');
  var statsEl        = document.getElementById('stats');
  var linkPrivacyEl  = document.getElementById('linkPrivacy');
  var linkImprintEl  = document.getElementById('linkImprint');
  var shareActionsEl = resultEl ? resultEl.querySelector('.share-actions') : null;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Zustand ---------- */
  var hasStorage = storageOK();
  var lang = loadLang();
  var stats = loadStats();
  var todayKey = dateKeyUTC();
  var code = makeCode(todayKey);
  var currentRow = 0;
  var guess = new Array(POSITIONS).fill(null);
  var phase = 'playing'; // 'playing' | 'won' | 'lost'
  var slotRefs = [];
  var paletteButtons = [];
  var langButtons = [];
  var playedGuesses = [];
  var shareText = '';
  var lastStatus = null;     // { key, params } fuer Neu Lokalisieren
  var resultShown = false;
  var resultWon = false;
  var resultTries = 0;
  var shareBtnEl = null;
  var lastCopyFeedback = null;

  function symbolSVG(index) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
           '<use href="#' + SYMBOLS[index].id + '"/></svg>';
  }

  function codeNames() {
    return code.map(function (i) { return symbolName(i); }).join(', ');
  }

  function setStatus(key, params, tone) {
    lastStatus = { key: key, params: params || {} };
    statusEl.textContent = t(key, params);
    if (tone) { statusEl.dataset.tone = tone; }
    else { statusEl.removeAttribute('data-tone'); }
  }

  /* ---------- Statische Texte ---------- */
  function applyStaticI18n() {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }
    var aNodes = document.querySelectorAll('[data-i18n-aria]');
    for (var j = 0; j < aNodes.length; j++) {
      aNodes[j].setAttribute('aria-label', t(aNodes[j].getAttribute('data-i18n-aria')));
    }
  }

  /* ---------- Sprachumschalter ---------- */
  function buildLangBar() {
    if (!langbarEl) return;
    langbarEl.innerHTML = '';
    langButtons = [];
    for (var i = 0; i < LANGS.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lang-btn';
      b.dataset.lang = LANGS[i].code;
      b.textContent = LANGS[i].label;
      b.setAttribute('aria-label', LANGS[i].name);
      b.addEventListener('click', function () { setLang(this.dataset.lang); });
      langbarEl.appendChild(b);
      langButtons.push(b);
    }
  }

  function refreshLangBar() {
    if (langbarEl) langbarEl.setAttribute('aria-label', t('aria_lang_group'));
    for (var i = 0; i < langButtons.length; i++) {
      langButtons[i].setAttribute('aria-pressed', langButtons[i].dataset.lang === lang ? 'true' : 'false');
    }
  }

  /* ---------- Fusszeile: Rechtslinks sprachrichtig ---------- */
  // Beschriftung kommt ueber data-i18n (applyStaticI18n). Hier nur das Ziel je Sprache.
  function setFooterLinks() {
    if (linkPrivacyEl) linkPrivacyEl.setAttribute('href', 'datenschutz-' + lang + '.html');
    if (linkImprintEl) linkImprintEl.setAttribute('href', 'impressum-' + lang + '.html');
  }

  /* ---------- Aufbau ---------- */
  function buildPalette() {
    paletteEl.innerHTML = '';
    paletteButtons = [];
    for (var i = 0; i < SYMBOL_COUNT; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sym-btn';
      b.dataset.sym = String(i);
      b.setAttribute('aria-label', t('aria_sym_set', { name: symbolName(i) }));
      b.innerHTML = symbolSVG(i);
      b.addEventListener('click', function () {
        placeSymbol(Number(this.dataset.sym));
      });
      paletteEl.appendChild(b);
      paletteButtons.push(b);
    }
  }

  function refreshPaletteLabels() {
    var ended = (phase !== 'playing');
    for (var i = 0; i < paletteButtons.length; i++) {
      paletteButtons[i].setAttribute('aria-label',
        t(ended ? 'aria_sym_plain' : 'aria_sym_set', { name: symbolName(i) }));
    }
  }

  function buildBoard() {
    boardEl.innerHTML = '';
    slotRefs = [];
    for (var r = 0; r < MAX_TRIES; r++) {
      var row = document.createElement('div');
      row.className = 'row';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', t('aria_row', { n: r + 1, max: MAX_TRIES }));
      var refs = [];
      for (var c = 0; c < POSITIONS; c++) {
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'slot empty';
        cell.dataset.row = String(r);
        cell.dataset.pos = String(c);
        cell.disabled = true;
        cell.setAttribute('aria-label', t('aria_slot_empty', { n: c + 1 }));
        cell.addEventListener('click', onSlotClick);
        row.appendChild(cell);
        refs.push(cell);
      }
      boardEl.appendChild(row);
      slotRefs.push(refs);
    }
  }

  function onSlotClick() {
    if (phase !== 'playing') return;
    if (Number(this.dataset.row) !== currentRow) return;
    var hadFocus = (document.activeElement === this);
    clearSlot(Number(this.dataset.pos));
    if (hadFocus && this.disabled && paletteButtons.length) {
      paletteButtons[0].focus();
    }
  }

  /* ---------- Eingabe ---------- */
  function placeSymbol(symIndex) {
    if (phase !== 'playing') return;
    var pos = guess.indexOf(null);
    if (pos === -1) return;
    guess[pos] = symIndex;
    renderGuess();
  }

  function clearSlot(pos) {
    if (phase !== 'playing') return;
    if (guess[pos] === null) return;
    guess[pos] = null;
    renderGuess();
  }

  function clearLast() {
    if (phase !== 'playing') return;
    var pos = -1;
    for (var i = 0; i < POSITIONS; i++) {
      if (guess[i] !== null) pos = i;
    }
    if (pos === -1) return;
    guess[pos] = null;
    renderGuess();
  }

  function renderGuess() {
    markActiveRow();
    var refs = slotRefs[currentRow];
    for (var c = 0; c < POSITIONS; c++) {
      var cell = refs[c];
      var v = guess[c];
      if (v === null) {
        cell.className = 'slot empty';
        cell.innerHTML = '';
        cell.disabled = true;
        if (cell.dataset.state) delete cell.dataset.state;
        cell.setAttribute('aria-label', t('aria_slot_empty', { n: c + 1 }));
      } else {
        cell.className = 'slot filled';
        cell.innerHTML = symbolSVG(v);
        cell.disabled = false;
        cell.setAttribute('aria-label', t('aria_slot_filled', { n: c + 1, name: symbolName(v) }));
      }
    }
    checkBtn.disabled = (guess.indexOf(null) !== -1);
  }

  function markActiveRow() {
    for (var r = 0; r < slotRefs.length; r++) {
      var active = (r === currentRow && phase === 'playing');
      boardEl.children[r].dataset.active = active ? 'true' : 'false';
      if (r !== currentRow) {
        for (var c = 0; c < POSITIONS; c++) {
          slotRefs[r][c].disabled = true;
        }
      }
    }
  }

  /* ---------- Auswertung und Rendering ---------- */
  function renderEvaluatedRow(r, rowGuess, result, animate) {
    var refs = slotRefs[r];
    for (var c = 0; c < POSITIONS; c++) {
      var cell = refs[c];
      var st = result[c];
      cell.disabled = true;
      cell.className = 'slot' + (animate && !reduceMotion ? ' reveal' : '');
      cell.dataset.state = st;
      cell.innerHTML = symbolSVG(rowGuess[c]) +
        '<span class="badge" aria-hidden="true">' + STATE_BADGE[st] + '</span>';
      cell.setAttribute('aria-label',
        t('aria_slot_eval', { n: c + 1, name: symbolName(rowGuess[c]), state: t(STATE_KEY[st]) }));
      if (animate && !reduceMotion) { cell.style.animationDelay = (c * 70) + 'ms'; }
    }
  }

  function submitGuess() {
    if (phase !== 'playing') return;
    if (guess.indexOf(null) !== -1) return;

    var submitted = guess.slice();
    playedGuesses.push(submitted);
    var result = evaluate(submitted, code);
    renderEvaluatedRow(currentRow, submitted, result, true);

    var won = result.every(function (s) { return s === 'correct'; });
    if (won) {
      phase = 'won';
      recordResult(true, currentRow + 1);
      setStatus('status_win', { n: currentRow + 1, max: MAX_TRIES }, 'win');
      endGame();
      showResult(true, currentRow + 1);
      return;
    }

    currentRow += 1;
    if (currentRow >= MAX_TRIES) {
      phase = 'lost';
      recordResult(false, 0);
      setStatus('status_lose', { code: codeNames() }, 'lose');
      revealCode();
      endGame();
      showResult(false, MAX_TRIES);
      return;
    }

    saveProgress();
    guess = new Array(POSITIONS).fill(null);
    checkBtn.disabled = true;
    renderGuess();
    setStatus('status_evaluated', { n: currentRow, rest: MAX_TRIES - currentRow }, '');
  }

  function revealCode() {
    if (document.querySelector('.reveal-code')) return;
    var wrap = document.createElement('div');
    wrap.className = 'reveal-code';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', t('aria_reveal', { code: codeNames() }));
    var html = '<span class="reveal-label">' + t('reveal_label') + '</span>';
    for (var i = 0; i < POSITIONS; i++) {
      html += '<span class="slot mini" data-state="correct">' + symbolSVG(code[i]) + '</span>';
    }
    wrap.innerHTML = html;
    statusEl.insertAdjacentElement('afterend', wrap);
  }

  function updateRevealCode() {
    var rc = document.querySelector('.reveal-code');
    if (!rc) return;
    rc.setAttribute('aria-label', t('aria_reveal', { code: codeNames() }));
    var label = rc.querySelector('.reveal-label');
    if (label) label.textContent = t('reveal_label');
  }

  function endGame() {
    checkBtn.disabled = true;
    clearBtn.disabled = true;
    for (var i = 0; i < paletteButtons.length; i++) {
      paletteButtons[i].disabled = true;
    }
    refreshPaletteLabels();
    markActiveRow();
  }

  /* ---------- Ergebnis, Teilen, Statistik ---------- */
  function showResult(won, tries) {
    resultShown = true;
    resultWon = won;
    resultTries = tries;
    shareText = buildShareText(won, tries);
    if (shareGridEl) shareGridEl.textContent = shareText;
    renderResultTexts();
    if (resultEl) resultEl.hidden = false;
  }

  function renderResultTexts() {
    if (resultLineEl) {
      resultLineEl.textContent = resultWon
        ? t('status_win', { n: resultTries, max: MAX_TRIES })
        : t('result_lose');
    }
    renderStats(resultWon ? resultTries : 0);
  }

  // Kompaktes Emoji Raster, eine Zeile pro Versuch, sprachneutral, kein Code Spoiler.
  function buildShareText(won, tries) {
    var header = 'dailycode ' + todayKey + '  ' + (won ? String(tries) : 'X') + '/' + MAX_TRIES;
    var lines = [header, ''];
    for (var r = 0; r < playedGuesses.length; r++) {
      var result = evaluate(playedGuesses[r], code);
      var line = '';
      for (var c = 0; c < POSITIONS; c++) { line += SHARE_EMOJI[result[c]]; }
      lines.push(line);
    }
    return lines.join('\n');
  }

  function statCell(num, cap) {
    return '<div class="stat-cell"><div class="stat-num">' + num + '</div>' +
           '<div class="stat-cap">' + cap + '</div></div>';
  }

  function renderStats(highlightTries) {
    if (!statsEl) return;
    if (!hasStorage) {
      statsEl.innerHTML = '<p class="stats-hint">' + t('stats_hint') + '</p>';
      return;
    }
    var played = stats.played;
    var winPct = played ? Math.round((stats.wins / played) * 100) : 0;
    var maxDist = 1;
    for (var k = 0; k < 6; k++) { if (stats.dist[k] > maxDist) maxDist = stats.dist[k]; }

    var html = '<div class="stat-grid">';
    html += statCell(played, t('stat_played'));
    html += statCell(winPct + '%', t('stat_winrate'));
    html += statCell(stats.currentStreak, t('stat_streak'));
    html += statCell(stats.maxStreak, t('stat_max'));
    html += '</div>';
    html += '<h3 class="dist-title">' + t('dist_title') + '</h3>';
    for (var i = 0; i < 6; i++) {
      var count = stats.dist[i];
      var pct = Math.round((count / maxDist) * 100);
      var width = count > 0 ? Math.max(pct, 12) : 8;
      var hl = (highlightTries === i + 1) ? ' hl' : '';
      var barLabel = t('dist_bar', { row: i + 1, wins: count });
      html += '<div class="dist-row">' +
        '<span class="dist-label">' + (i + 1) + '</span>' +
        '<span class="dist-bar' + hl + '" data-width="' + width + '" role="img" ' +
        'aria-label="' + barLabel + '">' + count + '</span>' +
        '</div>';
    }
    statsEl.innerHTML = html;
    // Balkenbreite via CSSOM setzen, damit die strikte CSP ohne 'unsafe-inline' fuer styles auskommt.
    var bars = statsEl.querySelectorAll('.dist-bar');
    for (var b = 0; b < bars.length; b++) {
      bars[b].style.width = bars[b].getAttribute('data-width') + '%';
    }
  }

  function copyFeedback(key) {
    lastCopyFeedback = key || null;
    if (copyFeedbackEl) copyFeedbackEl.textContent = key ? t(key) : '';
  }

  function onCopy() {
    if (!shareText) shareText = buildShareText(phase === 'won', currentRow + 1);
    copyText(shareText);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { copyFeedback('copy_done'); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ok = false;
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) {}
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
    } catch (e) {
      ok = false;
    }
    copyFeedback(ok ? 'copy_done' : 'copy_fail');
  }

  function setupShareButton() {
    if (!shareActionsEl || !navigator.share) return;
    shareBtnEl = document.createElement('button');
    shareBtnEl.type = 'button';
    shareBtnEl.className = 'btn btn-ghost';
    shareBtnEl.id = 'shareBtn';
    shareBtnEl.textContent = t('btn_share');
    shareBtnEl.addEventListener('click', function () {
      if (!shareText) return;
      var p = navigator.share({ text: shareText });
      if (p && p.then) {
        p.then(
          function () { copyFeedback('share_done'); },
          function (err) { if (!err || err.name !== 'AbortError') copyText(shareText); }
        );
      }
    });
    shareActionsEl.appendChild(shareBtnEl);
  }

  /* ---------- Wiederherstellen ---------- */
  function restoreToday(rows) {
    playedGuesses = [];
    var won = false;
    for (var r = 0; r < rows.length && r < MAX_TRIES; r++) {
      var result = evaluate(rows[r], code);
      renderEvaluatedRow(r, rows[r], result, false);
      playedGuesses.push(rows[r].slice());
      if (result.every(function (s) { return s === 'correct'; })) { won = true; break; }
    }
    var used = playedGuesses.length;

    if (won) {
      phase = 'won';
      currentRow = used - 1;
      endGame();
      setStatus('status_restore_win', { n: used, max: MAX_TRIES }, 'win');
      showResult(true, used);
    } else if (used >= MAX_TRIES) {
      phase = 'lost';
      currentRow = MAX_TRIES - 1;
      endGame();
      revealCode();
      setStatus('status_restore_lose', { code: codeNames() }, 'lose');
      showResult(false, MAX_TRIES);
    } else {
      phase = 'playing';
      currentRow = used;
      guess = new Array(POSITIONS).fill(null);
      renderGuess();
      setStatus('status_resume', { n: currentRow + 1, max: MAX_TRIES }, '');
    }
  }

  /* ---------- Neu Lokalisieren bei Sprachwechsel ---------- */
  function renderBoardFull() {
    for (var r = 0; r < MAX_TRIES; r++) {
      boardEl.children[r].setAttribute('aria-label', t('aria_row', { n: r + 1, max: MAX_TRIES }));
      if (r < playedGuesses.length) {
        renderEvaluatedRow(r, playedGuesses[r], evaluate(playedGuesses[r], code), false);
      } else if (!(phase === 'playing' && r === currentRow)) {
        for (var c = 0; c < POSITIONS; c++) {
          var cell = slotRefs[r][c];
          cell.className = 'slot empty';
          cell.innerHTML = '';
          cell.disabled = true;
          if (cell.dataset.state) delete cell.dataset.state;
          cell.setAttribute('aria-label', t('aria_slot_empty', { n: c + 1 }));
        }
      }
    }
    if (phase === 'playing') renderGuess();
  }

  function relocalize() {
    document.documentElement.lang = lang;
    applyStaticI18n();
    refreshLangBar();
    setFooterLinks();
    refreshPaletteLabels();
    renderBoardFull();
    updateRevealCode();
    if (lastStatus) statusEl.textContent = t(lastStatus.key, lastStatus.params);
    if (shareBtnEl) shareBtnEl.textContent = t('btn_share');
    if (resultShown) renderResultTexts();
    if (copyFeedbackEl) copyFeedbackEl.textContent = lastCopyFeedback ? t(lastCopyFeedback) : '';
  }

  /* ---------- Tastatur ---------- */
  function onKeydown(e) {
    if (phase !== 'playing') return;
    if (e.key >= '1' && e.key <= '6') {
      placeSymbol(Number(e.key) - 1);
      e.preventDefault();
    } else if (e.key === 'Backspace') {
      clearLast();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      var ae = document.activeElement;
      if (ae && ae.tagName === 'BUTTON') return;
      if (!checkBtn.disabled) {
        submitGuess();
        e.preventDefault();
      }
    }
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
    buildLangBar();
    buildPalette();
    buildBoard();

    if (stats.last && stats.last.date === todayKey) {
      restoreToday(stats.last.guesses);
    } else if (stats.progress && stats.progress.date === todayKey) {
      restoreToday(stats.progress.guesses);
    } else {
      var dirty = false;
      if (stats.progress) { stats.progress = null; dirty = true; }
      if (stats.last && stats.last.date !== todayKey) { stats.last = null; dirty = true; }
      if (dirty) saveStats(stats);
      renderGuess();
      setStatus('status_fresh', { date: todayKey, pos: POSITIONS, sym: SYMBOL_COUNT, max: MAX_TRIES }, '');
    }

    document.documentElement.lang = lang;
    applyStaticI18n();
    refreshLangBar();
    setFooterLinks();

    document.addEventListener('keydown', onKeydown);
    checkBtn.addEventListener('click', submitGuess);
    clearBtn.addEventListener('click', clearLast);
    if (copyBtn) copyBtn.addEventListener('click', onCopy);
    setupShareButton();
    registerServiceWorker();
  }

  init();
})();
