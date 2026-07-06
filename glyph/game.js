/* ============================================================
   dailycode  Fuenftes Spiel  (Lexiq)
   Wortbildung gegen die Uhr. Aus acht Buchstabenkacheln bildet der
   Spieler Woerter; gueltige Woerter geben Punkte und etwas Zeit
   zurueck. Wortlisten lokal (DE enz CC0, EN dwyl Unlicense), nur die
   aktive Sprache wird geladen. Vanilla JS, keine Libraries, keine
   externen Ressourcen ausser der gleich-Herkunft Wortliste ('self'),
   keine data-URI. Strikte CSP konform: keine Inline-Styles, Zustaende
   ueber Klassen. Theme und Sprache teilen die bestehenden Keys.

   Lehre aus dem dritten Spiel: in init() zuerst Theme/Texte/Listener,
   dann die Wortliste laden und ERST danach Rack erzeugen und Lauf
   starten. Render/Update sind defensiv gegen einen noch leeren
   Zustand abgesichert (kein Crash beim ersten Paint und beim Neustart).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Spielkonstanten ---------- */
  var RACK = 8;                 // Buchstabenkacheln
  var MIN_WORD = 3;
  var MIN_VOWELS = 3;           // Mindestanzahl Vokale im Rack (Spielbarkeit)
  var START_TIME = 90;          // Sekunden je Lauf, Mittel (bisheriges Verhalten)
  var TIME_CAP = 120;           // Obergrenze der Uhr bei Mittel (Zeitbonus deckelt hier)
  var LOW_WARN = [10, 5];       // Zeitwarnungen (Sekunden)

  /* Schwierigkeit ueber das Zeitlimit. Mittel (2) entspricht exakt dem
     bisherigen Verhalten (START_TIME/TIME_CAP oben). Die Deckelung der Uhr
     behaelt denselben Abstand von 30 Sekunden ueber dem Startwert wie bisher
     (90 zu 120), damit auch Leicht und Experte echten Spielraum fuer den
     Zeitbonus aus laengeren Woertern haben. */
  var TIME_BY_DIFF = { 1: 120, 2: START_TIME, 3: 70, 4: 55 };
  var CAP_HEADROOM = TIME_CAP - START_TIME;
  function capFor(d) { return (TIME_BY_DIFF[d] || START_TIME) + CAP_HEADROOM; }

  function scoreFor(len) { return len * len; }                 // progressiv (quadratisch)
  function bonusFor(len) { return 2 + (len - MIN_WORD) * 1.5; } // Sekunden, laenger = mehr

  /* ---------- Buchstabenhaeufigkeit je Sprache (Generator) ---------- */
  var FREQ = {
    de: { a:6, b:2, c:3, d:5, e:16, f:2, g:3, h:5, i:8, j:1, k:1, l:3, m:3, n:10, o:3, p:1, q:1, r:7, s:7, t:6, u:4, v:1, w:2, x:1, y:1, z:1, 'ä':1, 'ö':1, 'ü':1, 'ß':1 },
    en: { a:8, b:2, c:3, d:4, e:12, f:2, g:2, h:6, i:7, j:1, k:1, l:4, m:2, n:7, o:8, p:2, q:1, r:6, s:6, t:9, u:3, v:1, w:2, x:1, y:2, z:1 }
  };
  var VOWELS = { de: 'aeiouäöü', en: 'aeiou' };
  var bagCache = {};
  function bagFor(lang) {
    if (bagCache[lang]) return bagCache[lang];
    var f = FREQ[lang], bag = [];
    for (var ch in f) { if (f.hasOwnProperty(ch)) { for (var i = 0; i < f[ch]; i++) bag.push(ch); } }
    bagCache[lang] = bag;
    return bag;
  }
  function isVowel(ch, lang) { return VOWELS[lang].indexOf(ch) !== -1; }

  /* ---------- Profanitaetsfilter ----------
     Bewusst KLEINE, konservative Sperrliste je Sprache. Ein Wort, das
     zwar in der Wortliste steht, aber hier gelistet ist, wird NICHT als
     gueltige Loesung gewertet (gleiche Rueckmeldung wie ein ungueltiges
     Wort, ohne es hervorzuheben). Erweiterbar; bewusst knapp gehalten. */
  var BLOCK = {
    de: ['arsch', 'fotze', 'fick', 'ficken', 'scheisse', 'scheiße', 'wichser', 'hure', 'nutte', 'votze', 'penner'],
    en: ['fuck', 'shit', 'cunt', 'bitch', 'whore', 'dick', 'cock', 'pussy', 'slut', 'fag', 'nigger', 'retard']
  };
  function blockSet(lang) {
    var s = new Set();
    var arr = BLOCK[lang] || [];
    for (var i = 0; i < arr.length; i++) s.add(arr[i]);
    return s;
  }

  /* ---------- Sprache: minimaler t() Tisch (DE und EN) ---------- */
  var STR = {
    de: {
      subtitle: 'Bilde aus den Buchstaben so viele gültige Wörter wie möglich.',
      lbl_score: 'Punkte', lbl_best: 'Bestwert', best_none: 'noch keine', lbl_time: 'Zeit',
      btn_undo: 'Zurück', btn_clear: 'Leeren', btn_submit: 'Prüfen',
      btn_pause: 'Pause', btn_resume: 'Weiter', btn_restart: 'Neu',
      loading: 'Lade Wörterbuch',
      load_err: 'Wortliste konnte nicht geladen werden',
      choose_lang: 'Sprache wählen',
      go: 'Los, bilde Wörter',
      too_short: 'Zu kurz',
      invalid: 'Kein gültiges Wort',
      over_title: 'Zeit abgelaufen',
      over_restart: 'Neu starten',
      time_warn: 'Noch {n} Sekunden',
      tr_notice: 'Türkçe oyun dili yakında. Lütfen oyun için Almanca veya İngilizce seç.',
      aria_rack: 'Buchstabenfeld. Buchstaben tippen oder anklicken; Enter prüft das Wort.',
      help_summary: 'So funktioniert es',
      help_1: 'Buchstaben antippen oder über die Tastatur eingeben, dann mit Enter prüfen.',
      help_2: 'Jeder Buchstabe ist einmal nutzbar; nach einem Wort rücken neue nach.',
      help_3: 'Längere Wörter geben mehr Punkte und mehr Zeit. Die Leertaste pausiert.',
      help_4: 'Wörter brauchen mindestens 3 Buchstaben. Läuft die Zeit ab, endet die Runde.',
      diff_group: 'Schwierigkeit',
      diff_1: 'Leicht', diff_2: 'Mittel', diff_3: 'Schwer', diff_4: 'Experte',
      aria_diff_1: 'Leicht wählen', aria_diff_2: 'Mittel wählen', aria_diff_3: 'Schwer wählen', aria_diff_4: 'Experte wählen',
      nav_privacy: 'Datenschutz', nav_imprint: 'Impressum',
      home: 'Startseite', home_aria: 'Zur Startseite', rankings: 'Rangliste', rankings_aria: 'Zur Rangliste'
    },
    en: {
      subtitle: 'Build as many valid words as you can from the letters.',
      lbl_score: 'Score', lbl_best: 'Best', best_none: 'none yet', lbl_time: 'Time',
      btn_undo: 'Undo', btn_clear: 'Clear', btn_submit: 'Check',
      btn_pause: 'Pause', btn_resume: 'Resume', btn_restart: 'New',
      loading: 'Loading dictionary',
      load_err: 'Could not load the word list',
      choose_lang: 'Choose a language',
      go: 'Go, build words',
      too_short: 'Too short',
      invalid: 'Not a valid word',
      over_title: 'Time is up',
      over_restart: 'Play again',
      time_warn: '{n} seconds left',
      tr_notice: 'Türkçe oyun dili yakında. Lütfen oyun için Almanca veya İngilizce seç.',
      aria_rack: 'Letter board. Type or click letters, Enter checks the word.',
      help_summary: 'How it works',
      help_1: 'Tap letters or type them on the keyboard, then press Enter to check.',
      help_2: 'Each letter is used once; new letters slide in after a word.',
      help_3: 'Longer words give more points and more time. Space pauses.',
      help_4: 'Words need at least 3 letters. When time runs out, the round ends.',
      diff_group: 'Difficulty',
      diff_1: 'Easy', diff_2: 'Medium', diff_3: 'Hard', diff_4: 'Expert',
      aria_diff_1: 'Select easy', aria_diff_2: 'Select medium', aria_diff_3: 'Select hard', aria_diff_4: 'Select expert',
      nav_privacy: 'Privacy', nav_imprint: 'Imprint',
      home: 'Home', home_aria: 'Go to home', rankings: 'Rankings', rankings_aria: 'To the rankings'
    }
  };
  function uiTable() { return STR[uiLang] || STR.en; }   // tr-UI faellt auf en zurueck
  function t(key) {
    var tab = uiTable();
    return (tab[key] !== undefined) ? tab[key] : (STR.en[key] !== undefined ? STR.en[key] : key);
  }

  /* ---------- Lucide Bedien-Icons (ISC) ---------- */
  function svg(inner) { return '<svg viewBox="0 0 24 24" class="lucide" aria-hidden="true" focusable="false">' + inner + '</svg>'; }
  var ICON = {
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: svg('<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>'),
    monitor: svg('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>')
  };
  var THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };

  /* ---------- DOM ---------- */
  var themebarEl = document.getElementById('themebar');
  var themeColorEl = document.getElementById('themeColor');
  var themeFeedbackEl = document.getElementById('themeFeedback');
  var subtitleEl = document.getElementById('subtitle');
  var diffRowEl = document.getElementById('diffRow');
  var noticeEl = document.getElementById('langNotice');
  var noticeTextEl = document.getElementById('langNoticeText');
  var wlDeBtn = document.getElementById('wlDe');
  var wlEnBtn = document.getElementById('wlEn');
  var hudScoreEl = document.getElementById('hudScore');
  var hudBestEl = document.getElementById('hudBest');
  var hudTimeEl = document.getElementById('hudTime');
  var currentEl = document.getElementById('current');
  var statusEl = document.getElementById('status');
  var rackEl = document.getElementById('rack');
  var overlayEl = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlayTitle');
  var overlayScoreEl = document.getElementById('overlayScore');
  var overlayBtn = document.getElementById('overlayBtn');
  /* PuzzlePureScore: eigener Container zwischen Score-Text und Neustart-Button,
     einmalig eingehaengt, Inhalt wird erst in gameOver() befuellt. */
  var ppScoreEl = document.createElement('div');
  if (overlayEl && overlayBtn) overlayEl.insertBefore(ppScoreEl, overlayBtn);
  var undoBtn = document.getElementById('undoBtn');
  var clearBtn = document.getElementById('clearBtn');
  var submitBtn = document.getElementById('submitBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var restartBtn = document.getElementById('restartBtn');
  var linkPrivacyEl = document.getElementById('linkPrivacy');
  var linkImprintEl = document.getElementById('linkImprint');

  /* ---------- Theme Zustand ---------- */
  var THEME_KEY = 'dailycode:theme';
  var LANG_KEY = 'dailycode:lang';
  var DIFFICULTY_KEY = 'dailycode:glyph:difficulty';
  var THEMES = ['auto', 'light', 'dark'];
  var hasStorage = storageOK();
  var theme = loadTheme();
  var uiLang = loadLang();
  var difficulty = loadDifficulty();
  var diffButtons = [];
  var systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var themeToggleBtn = null, fbTimer = 0;

  function storageOK() { try { var k = '__dc_t__'; window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k); return true; } catch (e) { return false; } }
  function loadTheme() { if (hasStorage) { try { var v = window.localStorage.getItem(THEME_KEY); if (v === 'auto' || v === 'light' || v === 'dark') return v; } catch (e) {} } return 'auto'; }
  function saveTheme(v) { if (!hasStorage) return; try { window.localStorage.setItem(THEME_KEY, v); } catch (e) {} }
  function loadLang() { if (hasStorage) { try { var v = window.localStorage.getItem(LANG_KEY); if (v === 'de' || v === 'en' || v === 'tr') return v; } catch (e) {} } return 'de'; }
  function effectiveDark() { return theme === 'dark' || (theme === 'auto' && systemDarkMQ.matches); }
  function updateThemeColor() { if (themeColorEl) themeColorEl.setAttribute('content', effectiveDark() ? '#0a0c11' : '#f4f5f7'); }
  function applyTheme() { document.documentElement.setAttribute('data-theme', theme); updateThemeColor(); refreshThemeBar(); }
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
    themeFeedbackEl.textContent = (uiLang === 'de') ? ({ auto: 'Auto', light: 'Hell', dark: 'Dunkel' })[theme] : ({ auto: 'Auto', light: 'Light', dark: 'Dark' })[theme];
    themeFeedbackEl.classList.add('show');
    if (fbTimer) window.clearTimeout(fbTimer);
    fbTimer = window.setTimeout(function () { themeFeedbackEl.classList.remove('show'); }, 2200);
  }
  function refreshThemeBar() {
    if (!themeToggleBtn) return;
    themeToggleBtn.innerHTML = ICON[THEME_ICON[theme]];
    themeToggleBtn.setAttribute('aria-label', (uiLang === 'de' ? 'Darstellung' : 'Appearance'));
  }

  /* ---------- Schwierigkeit: Wahl laden, speichern, anzeigen ----------
     Steuert nur das Zeitlimit (TIME_BY_DIFF/capFor), keine neue Wortmechanik.
     Mittel (2) entspricht dem bisherigen, immer gleichen Verhalten. */
  function loadDifficulty() {
    if (hasStorage) {
      try { var v = parseInt(window.localStorage.getItem(DIFFICULTY_KEY), 10); if ([1, 2, 3, 4].indexOf(v) !== -1) return v; } catch (e) {}
    }
    return 2;
  }
  function saveDifficulty(v) { if (!hasStorage) return; try { window.localStorage.setItem(DIFFICULTY_KEY, String(v)); } catch (e) {} }

  function buildDiffRow() {
    if (!diffRowEl) return;
    diffRowEl.setAttribute('aria-label', t('diff_group'));
    diffRowEl.innerHTML = '';
    diffButtons = [1, 2, 3, 4].map(function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'diff-btn';
      b.textContent = t('diff_' + n);
      b.setAttribute('aria-pressed', String(difficulty === n));
      b.setAttribute('aria-label', t('aria_diff_' + n));
      b.addEventListener('click', function () { selectDifficulty(n); });
      diffRowEl.appendChild(b);
      return b;
    });
  }
  function refreshDiffButtons() {
    diffButtons.forEach(function (b, i) {
      var n = i + 1;
      b.textContent = t('diff_' + n);
      b.setAttribute('aria-pressed', String(difficulty === n));
      b.setAttribute('aria-label', t('aria_diff_' + n));
    });
  }
  // Wechsel startet immer eine frische Runde (wie der Neu-Knopf), daher kann
  // ein Schwierigkeitswechsel mitten im Lauf keine Teil- oder Mischwertung
  // erzeugen. Ohne geladene Wortliste (TR-Wartezustand) wird nur gespeichert.
  function selectDifficulty(n) {
    if (n === difficulty) return;
    difficulty = n;
    saveDifficulty(n);
    refreshDiffButtons();
    if (wordSet) startRun();
  }

  /* ---------- Wortdaten ---------- */
  var wordLang = 'en';          // tatsaechliche Spielsprache (DE oder EN)
  var wordSet = null;           // exakter Lookup
  var anagramKeys = null;       // sortierte-Buchstaben-Schluessel fuer Spielbarkeit
  var block = null;             // Sperrliste der aktiven Sprache

  function sortKey(s) { return s.split('').sort().join(''); }

  function buildSets(text) {
    var ws = new Set(), ak = new Set();
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var w = lines[i].trim();
      if (w.length < MIN_WORD) continue;
      ws.add(w);
      if (w.length <= RACK) ak.add(sortKey(w));   // nur was aus dem Rack bildbar waere
    }
    wordSet = ws; anagramKeys = ak;
  }

  /* ---------- Spielzustand ---------- */
  var phase = 'init';           // 'init' | 'await' | 'loading' | 'play' | 'pause' | 'over'
  var rack = [];                // RACK Buchstaben (lowercase)
  var freshFlags = [];          // fuer die Nachschub-Animation
  var selection = [];           // Indizes in rack, in Auswahlreihenfolge
  var score = 0, best = null, remaining = START_TIME;
  var invalidAttempts = 0; // Zaehlt zu kurze oder ungueltige Worteinreichungen, fuer PuzzlePureScore Payload
  var warnedAt = {};            // Zeitwarnungen nur einmal
  var ppResult = null;          // Ergebnis der letzten PuzzlePureScore Aufzeichnung
  var lastPpPayload = null;     // an recordResult() uebergebenes Payload, fuer PuzzlePureRewards
  var rewardsTriggered = false; // verhindert doppelten Rewards Trigger je Runde

  /* ---------- Generator mit Spielbarkeitsgarantie ---------- */
  function draw(lang) { var bag = bagFor(lang); return bag[Math.floor(Math.random() * bag.length)]; }

  function vowelCount(arr, lang) { var c = 0; for (var i = 0; i < arr.length; i++) if (isVowel(arr[i], lang)) c++; return c; }

  // Gibt es im aktuellen Rack mindestens ein gueltiges Wort? Alle Teilmengen
  // der Groesse MIN_WORD..RACK per Bitmaske, sortierter Schluessel-Lookup.
  function rackHasWord(arr) {
    if (!anagramKeys) return true;
    var n = arr.length;
    for (var mask = 1; mask < (1 << n); mask++) {
      var letters = [];
      for (var i = 0; i < n; i++) { if (mask & (1 << i)) letters.push(arr[i]); }
      if (letters.length < MIN_WORD) continue;
      if (anagramKeys.has(letters.slice().sort().join(''))) return true;
    }
    return false;
  }

  // Vollstaendiges, spielbares Rack von Grund auf.
  function generateRack() {
    for (var tries = 0; tries < 300; tries++) {
      var arr = [];
      for (var i = 0; i < RACK; i++) arr.push(draw(wordLang));
      ensureVowels(arr);
      if (rackHasWord(arr)) return arr;
    }
    // Fallback (praktisch nie): vokalbetont, irgendetwas Spielbares
    var fb = []; for (var k = 0; k < RACK; k++) fb.push(draw(wordLang)); ensureVowels(fb); return fb;
  }

  function ensureVowels(arr) {
    var guard = 0;
    while (vowelCount(arr, wordLang) < MIN_VOWELS && guard++ < 50) {
      // einen Konsonanten durch einen Vokal ersetzen
      var idx = -1;
      for (var i = 0; i < arr.length; i++) { if (!isVowel(arr[i], wordLang)) { idx = i; break; } }
      if (idx === -1) break;
      var v; do { v = draw(wordLang); } while (!isVowel(v, wordLang));
      arr[idx] = v;
    }
  }

  // Nachschub: verbrauchte Positionen neu ziehen, Spielbarkeit sichern.
  function refill(consumed) {
    for (var attempt = 0; attempt < 60; attempt++) {
      for (var c = 0; c < consumed.length; c++) { rack[consumed[c]] = draw(wordLang); }
      ensureVowels(rack);
      if (rackHasWord(rack)) { markFresh(consumed); return; }
    }
    rack = generateRack();           // Fallback: ganzes Rack neu, garantiert spielbar
    markFresh(rangeAll());
  }
  function rangeAll() { var a = []; for (var i = 0; i < RACK; i++) a.push(i); return a; }
  function markFresh(idxs) { freshFlags = []; for (var i = 0; i < idxs.length; i++) freshFlags[idxs[i]] = true; }

  /* ---------- Rendering (defensiv) ---------- */
  function buildRackDOM() {
    if (!rackEl) return;
    rackEl.innerHTML = '';
    for (var i = 0; i < rack.length; i++) {
      (function (idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'letter';
        btn.addEventListener('click', function () { onTile(idx); });
        rackEl.appendChild(btn);
      })(i);
    }
    renderRack();
  }
  function renderRack() {
    if (!rackEl || !rackEl.children) return;
    for (var i = 0; i < rack.length; i++) {
      var btn = rackEl.children[i];
      if (!btn) continue;
      var ch = rack[i];
      btn.textContent = ch;
      var sel = selection.indexOf(i) !== -1;
      btn.classList.toggle('is-selected', sel);
      if (freshFlags[i]) { btn.classList.remove('is-fresh'); void btn.offsetWidth; btn.classList.add('is-fresh'); }
      btn.setAttribute('aria-label', ch + (sel ? ', ' + (uiLang === 'de' ? 'gewaehlt' : 'selected') : ''));
    }
    freshFlags = [];
  }
  function renderCurrent() {
    if (!currentEl) return;
    var w = selection.map(function (i) { return rack[i]; }).join('');
    currentEl.textContent = w;
  }
  function updateHud() {
    if (hudScoreEl) hudScoreEl.textContent = String(score);
    if (hudBestEl) hudBestEl.textContent = (best == null) ? t('best_none') : String(best);
    if (hudTimeEl) {
      hudTimeEl.textContent = String(Math.max(0, Math.ceil(remaining)));
      hudTimeEl.classList.toggle('low', remaining <= 10);
    }
  }
  function announce(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.remove('good', 'bad');
    if (kind) statusEl.classList.add(kind);
  }

  /* ---------- Eingaben (Tippen UND Tastatur, gleicher Auswahlzustand) ---------- */
  function selected(i) { return selection.indexOf(i) !== -1; }
  function onTile(i) {
    if (phase !== 'play') return;
    if (selected(i)) return;
    selection.push(i);
    renderRack(); renderCurrent();
  }
  function selectByLetter(ch) {
    if (phase !== 'play') return;
    for (var i = 0; i < rack.length; i++) { if (rack[i] === ch && !selected(i)) { selection.push(i); renderRack(); renderCurrent(); return; } }
  }
  function undo() { if (phase !== 'play' || !selection.length) return; selection.pop(); renderRack(); renderCurrent(); }
  function clearSel() { if (phase !== 'play') return; selection = []; renderRack(); renderCurrent(); }

  function submit() {
    if (phase !== 'play') return;
    var word = selection.map(function (i) { return rack[i]; }).join('');
    if (word.length < MIN_WORD) { invalidAttempts += 1; announce(t('too_short'), 'bad'); clearSel(); return; }
    // Sperrliste UND Wortliste: Sperrwort wird wie ein ungueltiges behandelt.
    if ((block && block.has(word)) || !wordSet || !wordSet.has(word)) { invalidAttempts += 1; announce(t('invalid'), 'bad'); clearSel(); return; }
    // gueltig
    var pts = scoreFor(word.length);
    score += pts;
    remaining = Math.min(capFor(difficulty), remaining + bonusFor(word.length));
    if (best == null || score > best) { best = score; saveBest(); }
    var consumed = selection.slice();
    selection = [];
    refill(consumed);
    updateHud(); renderRack(); renderCurrent();
    announce('+' + pts, 'good');
  }

  /* ---------- Uhr (pausierbar, friert bei Pause und verstecktem Tab) ---------- */
  var rafId = 0, lastTs = 0;
  function clockFrame(now) {
    if (!lastTs) lastTs = now;
    var dt = now - lastTs;
    lastTs = now;
    var active = (phase === 'play' && !document.hidden);
    if (active) {
      remaining -= dt / 1000;
      if (remaining <= 0) { remaining = 0; updateHud(); gameOver(); return; }
      checkWarn();
      updateHud();
    }
    if (rafId) rafId = window.requestAnimationFrame(clockFrame);
  }
  function startClock() { stopClock(); lastTs = 0; rafId = window.requestAnimationFrame(clockFrame); }
  function stopClock() { if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; } }
  function checkWarn() {
    for (var i = 0; i < LOW_WARN.length; i++) {
      var s = LOW_WARN[i];
      if (!warnedAt[s] && remaining <= s) { warnedAt[s] = true; announce(t('time_warn').replace('{n}', String(s)), 'bad'); }
    }
  }

  /* ---------- Highscore (pro Wortsprache UND Schwierigkeit, defensiv) ----------
     Vor Batch 3 gab es nur einen Bestwert je Wortsprache (oldBestKey). Damit
     alte Ergebnisse nicht verloren gehen, wird dieser einmalig additiv (nur
     falls besser) in den Bestwert der Stufe Mittel uebernommen, siehe
     migrateOldBest(). Der alte Schluessel bleibt unveraendert bestehen. */
  function oldBestKey(lang) { return 'dailycode:glyph:best:' + lang; }
  function bestKey(lang, diff) { return 'dailycode:glyph:best:' + lang + ':' + diff; }
  function migrateOldBest(lang) {
    if (!hasStorage) return;
    try {
      var oldV = window.localStorage.getItem(oldBestKey(lang));
      if (oldV == null) return;
      var oldN = parseInt(oldV, 10);
      if (isNaN(oldN) || oldN < 0) return;
      var midKey = bestKey(lang, 2);
      var curV = window.localStorage.getItem(midKey);
      var curN = (curV == null) ? null : parseInt(curV, 10);
      if (curN == null || isNaN(curN) || oldN > curN) { window.localStorage.setItem(midKey, String(oldN)); }
    } catch (e) {}
  }
  // Einheitliches null-Muster (Vorbild grid9): kein gespeicherter Wert ergibt
  // null, nicht 0, damit "noch keine" sauber von einem echten 0-Wert getrennt ist.
  function loadBestVal() {
    if (!hasStorage) return null;
    try { var v = window.localStorage.getItem(bestKey(wordLang, difficulty)); if (v == null) return null; var n = parseInt(v, 10); return (isNaN(n) || n < 0) ? null : n; }
    catch (e) { return null; }
  }
  function loadBest() { best = loadBestVal(); }
  function saveBest() { if (!hasStorage || best == null) return; try { window.localStorage.setItem(bestKey(wordLang, difficulty), String(best)); } catch (e) {} }

  /* ---------- Lauf, Pause, Spielende ---------- */
  function setPauseLabel() { if (pauseBtn) pauseBtn.textContent = (phase === 'pause') ? t('btn_resume') : t('btn_pause'); }

  function startRun() {
    score = 0; remaining = TIME_BY_DIFF[difficulty] || START_TIME; selection = []; warnedAt = {}; invalidAttempts = 0;
    rack = generateRack(); freshFlags = rangeAll();
    phase = 'play';
    hideOverlay();
    loadBest();
    buildRackDOM();
    updateHud(); renderCurrent();
    announce(t('go'));
    setPauseLabel();
    startClock();
  }

  function togglePause() {
    if (phase === 'play') { phase = 'pause'; setPauseLabel(); announce(t('btn_pause')); }
    else if (phase === 'pause') { phase = 'play'; setPauseLabel(); announce(t('go')); }
  }

  function gameOver() {
    phase = 'over';
    stopClock();
    if (best == null || score > best) { best = score; saveBest(); }
    updateHud();
    // Rundenende ist rein zeitbasiert (kein Sieg/Niederlage Konzept), daher
    // immer 'complete'. Kein Zeitbonus: die Runde laeuft immer bis zum
    // gewaehlten Zeitlimit durch, timeSeconds/parSeconds bleiben bewusst
    // null (ein Vergleich waere zwischen unterschiedlichen Zeitlimits nicht
    // fair). difficulty kommt aus der vorab gewaehlten Stufe (Batch 3).
    // mistakes zaehlt echte zu kurze oder ungueltige Worteinreichungen.
    if (window.PuzzlePureScore) {
      lastPpPayload = { game: 'glyph', difficulty: difficulty, outcome: 'complete', timeSeconds: null, parSeconds: null, mistakes: invalidAttempts, hints: 0, perfect: invalidAttempts === 0 };
      ppResult = window.PuzzlePureScore.recordResult(lastPpPayload);
      rewardsTriggered = false;
    }
    showOverlay(t('over_title'), t('lbl_score') + ' ' + score + (best != null ? '  ·  ' + t('lbl_best') + ' ' + best : ''), t('over_restart'));
    ppScoreEl.replaceChildren();
    var ppBlock = null;
    if (ppResult && window.PuzzlePureScore) { ppBlock = window.PuzzlePureScore.buildResultBlock(uiLang, ppResult); ppScoreEl.append(ppBlock); }
    if (window.PuzzlePureRewards && !rewardsTriggered) {
      rewardsTriggered = true;
      window.PuzzlePureRewards.trigger({
        ppResult: ppResult,
        payload: lastPpPayload || {},
        lang: uiLang,
        cardEl: overlayEl,
        scoreLineEl: ppBlock ? ppBlock.querySelector('.pp-score-line') : null
      });
    }
    announce(t('over_title') + ', ' + t('lbl_score') + ' ' + score);
  }

  function showOverlay(title, sc, btn) {
    if (overlayTitleEl) overlayTitleEl.textContent = title;
    if (overlayScoreEl) { overlayScoreEl.textContent = sc || ''; overlayScoreEl.hidden = !sc; }
    if (overlayBtn) overlayBtn.textContent = btn;
    if (overlayEl) overlayEl.hidden = false;
  }
  function hideOverlay() { if (overlayEl) overlayEl.hidden = true; }

  /* ---------- Wortliste laden, dann Lauf starten ---------- */
  function loadWordlist(lang) {
    wordLang = lang;
    // Buchstaben-Anzeige an die SPIELSPRACHE koppeln (nicht an die UI-Sprache).
    // text-transform: uppercase ist locale-abhaengig; unter <html lang="tr">
    // wuerde aus 'i' ein tuerkisches 'İ'. Das lang-Attribut gezielt nur auf
    // den Buchstaben-Containern setzen laesst die uebrige UI unberuehrt.
    if (rackEl) rackEl.setAttribute('lang', lang);
    if (currentEl) currentEl.setAttribute('lang', lang);
    block = blockSet(lang);
    migrateOldBest(lang);
    phase = 'loading';
    announce(t('loading'));
    fetch('words-' + lang + '.txt', { credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.text(); })
      .then(function (text) { buildSets(text); startRun(); })
      .catch(function () { phase = 'init'; announce(t('load_err'), 'bad'); });
  }

  function switchWordLang(lang) {
    if (lang !== 'de' && lang !== 'en') return;
    loadWordlist(lang);
  }

  /* ---------- Neutraler Wartezustand (vor der Spielsprachwahl) ----------
     Kein Rack, keine laufende Uhr, HUD auf 0. Alle Render- und Eingabe-
     Funktionen sind gegen ein leeres Rack abgesichert (renderRack/buildRackDOM
     guarden, Eingaben verlangen phase==='play'). Aus diesem Zustand fuehrt nur
     ein Klick auf Deutsch oder English (wlDe/wlEn -> switchWordLang). */
  function enterAwait() {
    phase = 'await';
    stopClock();
    selection = []; rack = []; freshFlags = [];
    score = 0; best = 0; remaining = 0;
    if (rackEl) rackEl.innerHTML = '';
    updateHud();
    if (hudTimeEl) hudTimeEl.classList.remove('low');   // im Wartezustand kein Warn-Rot
    renderCurrent();
    announce(t('choose_lang'));
  }

  /* ---------- Sprachkopplung und TR-Hinweis ---------- */
  function resolveWordLang() {
    if (uiLang === 'de' || uiLang === 'en') {
      if (noticeEl) noticeEl.hidden = true;
      loadWordlist(uiLang);
    } else {
      // tr: KEIN Auto-Start. Hinweis zeigen und in den neutralen Wartezustand
      // gehen; das Rack entsteht erst nach Wahl von Deutsch oder English.
      if (noticeTextEl) noticeTextEl.textContent = t('tr_notice');
      if (noticeEl) noticeEl.hidden = false;
      enterAwait();
    }
  }

  /* ---------- Tastatur ---------- */
  function onKeyDown(e) {
    var k = e.key;
    if (k === 'Enter') { e.preventDefault(); submit(); return; }
    if (k === 'Backspace') { e.preventDefault(); undo(); return; }
    if (k === 'Escape') { clearSel(); return; }
    if (k === ' ' || k === 'Spacebar') { e.preventDefault(); togglePause(); return; }
    if (k && k.length === 1) {
      var ch = k.toLowerCase();
      if (/^[a-zäöüß]$/.test(ch)) { selectByLetter(ch); }
    }
  }

  /* ---------- Statische Texte und Rechtslinks ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    setText('lblScore', t('lbl_score')); setText('lblBest', t('lbl_best')); setText('lblTime', t('lbl_time'));
    setText('undoBtn', t('btn_undo')); setText('clearBtn', t('btn_clear')); setText('submitBtn', t('btn_submit'));
    setText('restartBtn', t('btn_restart'));
    setText('navPrivacy', t('nav_privacy')); setText('navImprint', t('nav_imprint'));
    setText('homeLabel', t('home'));
    var homeLinkEl = document.getElementById('homeLink');
    if (homeLinkEl) homeLinkEl.setAttribute('aria-label', t('home_aria'));
    setText('rankingsLabel', t('rankings'));
    var rankingsLinkEl = document.getElementById('rankingsLink');
    if (rankingsLinkEl) rankingsLinkEl.setAttribute('aria-label', t('rankings_aria'));
    setText('helpSummary', t('help_summary')); setText('help1', t('help_1')); setText('help2', t('help_2')); setText('help3', t('help_3')); setText('help4', t('help_4'));
    if (rackEl) rackEl.setAttribute('aria-label', t('aria_rack'));
    setPauseLabel();
    if (diffRowEl) diffRowEl.setAttribute('aria-label', t('diff_group'));
    refreshDiffButtons();
  }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  function setFooterLinks() {
    if (linkPrivacyEl) linkPrivacyEl.setAttribute('href', '../datenschutz-' + uiLang + '.html');
    if (linkImprintEl) linkImprintEl.setAttribute('href', '../impressum-' + uiLang + '.html');
  }

  /* ---------- Service Worker ---------- */
  function registerServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) return;
      var proto = location.protocol, host = location.hostname;
      var secure = (proto === 'https:') || (proto === 'http:' && (host === 'localhost' || host === '127.0.0.1' || host === '[::1]'));
      if (!secure) return;
      window.addEventListener('load', function () { try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {} });
    } catch (e) {}
  }

  /* ---------- Sichtbarkeit ---------- */
  function onVisibility() {
    // Bei verstecktem Tab friert die Uhr (clockFrame dekrementiert nur, wenn
    // !document.hidden). lastTs zuruecksetzen, damit beim Rueckkehren kein
    // Riesensprung nachgeholt wird.
    if (!document.hidden) { lastTs = 0; }
  }

  /* ---------- Start (Reihenfolge penibel) ---------- */
  function init() {
    buildThemeBar();
    applyTheme();
    document.documentElement.lang = (uiLang === 'tr') ? 'tr' : uiLang;
    buildDiffRow();
    applyTexts();
    setFooterLinks();

    window.addEventListener('keydown', onKeyDown);
    if (submitBtn) submitBtn.addEventListener('click', submit);
    if (clearBtn) clearBtn.addEventListener('click', clearSel);
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (restartBtn) restartBtn.addEventListener('click', function () { if (wordSet) startRun(); });
    if (overlayBtn) overlayBtn.addEventListener('click', function () { if (phase === 'over' && wordSet) startRun(); });
    if (wlDeBtn) wlDeBtn.addEventListener('click', function () { switchWordLang('de'); });
    if (wlEnBtn) wlEnBtn.addEventListener('click', function () { switchWordLang('en'); });

    if (systemDarkMQ.addEventListener) systemDarkMQ.addEventListener('change', function () { if (theme === 'auto') applyTheme(); });
    else if (systemDarkMQ.addListener) systemDarkMQ.addListener(function () { if (theme === 'auto') applyTheme(); });
    document.addEventListener('visibilitychange', onVisibility);

    registerServiceWorker();

    // Datenbasis laden, dann Rack erzeugen und Lauf starten (startRun).
    resolveWordLang();
  }

  init();
})();
