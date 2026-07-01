/* ============================================================
   dailycode  Siebtes Spiel  (Reflexa)
   Schnell-Reaktionsspiel: Oben ein ZIEL aus Form und Farbe (z. B. Dreieck
   in Blau). Unten Optionen als antippbare Knoepfe. Genau EINE Option passt.

   EINDEUTIGKEIT (Fairness, zentral): Jede Option traegt eine eigene Form.
   Genau eine Option traegt die Zielform, daher ist sie zwingend die einzige
   korrekte. Die Form allein reicht zum Erkennen (gut bei Farbsehschwaeche).
   Genau eine Ablenkung traegt zusaetzlich die Zielfarbe, damit die Farbe
   kein Alleinverraeter ist. Ein Distraktor kann strukturell nie zufaellig
   korrekt sein, weil keiner ausser der Loesung die Zielform fuehrt.

   TIMING (zentral): Die Restzeit wird aus echter Zeit (performance.now)
   als absolute Differenz zum Rundenstart berechnet, nicht aus Frames.
   Damit laeuft das Tempo auf 60 Hz und 120 Hz gleich. Die Zeitleiste
   animiert per requestAnimationFrame und friert bei Pause und verstecktem
   Tab ein (kein Leben-Verlust durch Tabwechsel).

   Beschleunigung fair mit Untergrenze: T = max(1200, 3000 - (runde-1)*80) ms.
   Optionen gestaffelt: R1..5 drei, R6..12 vier, R13..20 fuenf, ab R21 sechs.

   Vanilla JS, keine Libraries, keine externen Ressourcen, keine data-URI.
   Strikte CSP konform: keine Inline-Styles, Zustaende ueber Klassen, der
   einzige dynamische Wert (Breite der Zeitleiste) ueber eine CSS Variable
   per CSSOM. Theme und Sprache teilen die bestehenden Keys.

   Lehre aus dem dritten Spiel (cluster): in init() erst Theme, Texte und
   die statischen Bedienleisten, DANN die Datenstrukturen und der erste
   Render. Render und Update sind defensiv gegen einen leeren Zustand.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Sprache: minimaler t() Tisch (Deutsch) ---------- */
  var STR = {
    subtitle: 'Waehle blitzschnell die passende Form und Farbe.',
    lbl_score: 'Punkte',
    lbl_lives: 'Leben',
    lbl_round: 'Runde',
    lbl_best: 'Bestwert',
    best_none: 'noch keine',
    target_lead: 'Finde:',
    in_color: ' in ',
    timebar_aria: 'Verbleibende Zeit der Runde',
    opt_group: 'Optionen, waehle die passende Form und Farbe',
    aria_opt: 'Option {n}: {desc}',
    btn_pause: 'Pause',
    btn_resume: 'Fortsetzen',
    btn_restart: 'Neu starten',
    aria_pause: 'Spiel pausieren',
    aria_resume: 'Spiel fortsetzen',
    aria_restart: 'Lauf neu starten',
    msg_go: 'Los',
    msg_correct: 'Richtig',
    msg_wrong: 'Daneben',
    msg_timeout: 'Zeit abgelaufen',
    msg_lives_left: 'Noch {n} Leben',
    msg_paused: 'Pausiert',
    msg_resumed: 'Weiter',
    over_title: 'Vorbei',
    over_score: 'Punkte {s}, Runde {r}',
    over_restart: 'Neu starten',
    theme_group: 'Darstellung',
    theme_auto: 'Auto',
    theme_light: 'Hell',
    theme_dark: 'Dunkel',
    help_summary: 'Hilfe',
    help_1: 'Oben siehst du ein Ziel aus Form und Farbe. Tippe unten die Option mit genau dieser Form an. Nur eine passt.',
    help_2: 'Mit der Tastatur: Ziffer eins bis sechs waehlt direkt, Pfeiltasten wandern, Enter oder Leertaste bestaetigt.',
    help_3: 'Die Zeitleiste wird mit den Runden kuerzer. Eine falsche Wahl oder abgelaufene Zeit kostet ein Leben. Bei null Leben ist der Lauf vorbei.',
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

  /* ---------- Formen: je eine eigene, klar verschiedene Silhouette ----------
     Gefuellte Form (fill currentColor), Farbe kommt aus einer Klasse. Die
     Form ist das tragende Merkmal, daher reicht sie allein zum Erkennen. */
  function shapeSvg(inner) {
    return '<svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  var SHAPES = [
    { key: 'dreieck',  name: 'Dreieck',  svg: shapeSvg('<path d="M50 14 L88 82 H12 Z"/>') },
    { key: 'kreis',    name: 'Kreis',    svg: shapeSvg('<circle cx="50" cy="50" r="38"/>') },
    { key: 'quadrat',  name: 'Quadrat',  svg: shapeSvg('<rect x="16" y="16" width="68" height="68" rx="8"/>') },
    { key: 'raute',    name: 'Raute',    svg: shapeSvg('<path d="M50 10 L86 50 L50 90 L14 50 Z"/>') },
    { key: 'stern',    name: 'Stern',    svg: shapeSvg('<path d="M50 10 L59.4 37.1 L88 37.6 L65.2 54.9 L73.5 82.4 L50 66 L26.5 82.4 L34.8 54.9 L12 37.6 L40.6 37.1 Z"/>') },
    { key: 'sechseck', name: 'Sechseck', svg: shapeSvg('<path d="M50 12 L86 32 V68 L50 88 L14 68 V32 Z"/>') }
  ];

  /* ---------- Farben: Okabe-Ito-nah, gut unterscheidbar ---------- */
  var COLORS = [
    { key: 'blau',      name: 'Blau' },
    { key: 'bernstein', name: 'Bernstein' },
    { key: 'tuerkis',   name: 'Tuerkis' },
    { key: 'violett',   name: 'Violett' },
    { key: 'magenta',   name: 'Magenta' },
    { key: 'schiefer',  name: 'Schiefer' }
  ];

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
  var hudScoreEl    = document.getElementById('hudScore');
  var hudLivesEl    = document.getElementById('hudLives');
  var hudRoundEl    = document.getElementById('hudRound');
  var hudBestEl     = document.getElementById('hudBest');
  var targetLeadEl  = document.getElementById('targetLead');
  var targetChipEl  = document.getElementById('targetChip');
  var targetNameEl  = document.getElementById('targetName');
  var timebarEl     = document.getElementById('timebar');
  var timebarFillEl = document.getElementById('timebarFill');
  var optionsEl     = document.getElementById('options');
  var overlayEl     = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlayTitle');
  var overlayScoreEl = document.getElementById('overlayScore');
  var overlayBtn    = document.getElementById('overlayBtn');
  var pauseBtn      = document.getElementById('pauseBtn');
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

  /* ---------- Spielzustand ----------
     phase: 'init' | 'play' | 'paused' | 'reveal' | 'over'
       play   Runde laeuft, Zeitleiste schrumpft, Eingabe aktiv
       paused eingefroren (Pause-Knopf oder versteckter Tab)
       reveal kurze Rueckmeldung nach einer Antwort, Eingabe gesperrt
       over   Lauf beendet, Overlay sichtbar */
  var phase = 'init';
  var score = 0;
  var lives = 3;
  var round = 1;
  var options = [];        // [{ shape, color }]
  var correctIndex = -1;
  var optEls = [];
  var roundDuration = 3000;
  var roundStart = 0;
  var pauseOffset = 0;     // aufsummierte Pausenzeit der laufenden Runde
  var pauseBegin = 0;
  var manualPause = false; // true nur bei Pause ueber den Knopf
  var rafId = 0;
  var revealTimer = 0;

  var START_MS = 3000, STEP_MS = 80, MIN_MS = 1200;
  function roundMs(r) { var v = START_MS - (r - 1) * STEP_MS; return v < MIN_MS ? MIN_MS : v; }
  function optionCount(r) {
    if (r <= 5) return 3;
    if (r <= 12) return 4;
    if (r <= 20) return 5;
    return 6;
  }

  /* ---------- Helfer ---------- */
  function nowMs() { return (window.performance && window.performance.now) ? window.performance.now() : Date.now(); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function randInt(n) { return Math.floor(Math.random() * n); }
  function shapeByKey(k) { for (var i = 0; i < SHAPES.length; i++) { if (SHAPES[i].key === k) return SHAPES[i]; } return SHAPES[0]; }
  function colorByKey(k) { for (var i = 0; i < COLORS.length; i++) { if (COLORS[i].key === k) return COLORS[i]; } return COLORS[0]; }
  function describe(opt) {
    return shapeByKey(opt.shape).name + t('in_color') + colorByKey(opt.color).name;
  }
  function announce(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.remove('is-good', 'is-bad');
    if (kind === 'good') statusEl.classList.add('is-good');
    else if (kind === 'bad') statusEl.classList.add('is-bad');
  }

  /* ---------- Runde erzeugen (Eindeutigkeit garantiert) ----------
     Korrekte Option = Zielform + Zielfarbe. Distraktoren bekommen JE EINE
     der uebrigen Formen (alle verschieden, keiner traegt die Zielform).
     Genau ein Distraktor bekommt zusaetzlich die Zielfarbe (Farbe ist so
     kein Alleinverraeter), die uebrigen eine zufaellige Farbe. */
  function makeRound(r) {
    var n = optionCount(r);
    var targetShape = SHAPES[randInt(SHAPES.length)].key;
    var targetColor = COLORS[randInt(COLORS.length)].key;

    var correct = { shape: targetShape, color: targetColor };

    // Uebrige Formen mischen und n-1 als Distraktorformen nehmen.
    var others = [];
    for (var i = 0; i < SHAPES.length; i++) { if (SHAPES[i].key !== targetShape) others.push(SHAPES[i].key); }
    shuffle(others);
    var distractorShapes = others.slice(0, n - 1);

    var distractors = [];
    for (var d = 0; d < distractorShapes.length; d++) {
      var col;
      if (d === 0) {
        col = targetColor;                 // genau eine Farb-Ablenkung
      } else {
        col = COLORS[randInt(COLORS.length)].key; // beliebig, Form trennt ohnehin
      }
      distractors.push({ shape: distractorShapes[d], color: col });
    }

    var all = [correct].concat(distractors);
    shuffle(all);
    var ci = -1;
    for (var k = 0; k < all.length; k++) {
      if (all[k].shape === targetShape && all[k].color === targetColor) { ci = k; break; }
    }

    return { target: { shape: targetShape, color: targetColor }, options: all, correctIndex: ci };
  }

  /* ---------- Render (defensiv gegen leeren Zustand) ---------- */
  function renderTarget(target) {
    if (!target) return;
    var sh = shapeByKey(target.shape), co = colorByKey(target.color);
    if (targetLeadEl) targetLeadEl.textContent = t('target_lead');
    if (targetChipEl) {
      targetChipEl.className = 'target-chip col-' + target.color;
      targetChipEl.innerHTML = sh.svg;
    }
    if (targetNameEl) targetNameEl.textContent = sh.name + t('in_color') + co.name;
  }

  function buildOptionsDOM() {
    if (!optionsEl) return;
    optionsEl.innerHTML = '';
    optEls = [];
    for (var i = 0; i < options.length; i++) {
      (function (idx) {
        var opt = options[idx];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opt';
        btn.tabIndex = (idx === 0) ? 0 : -1;   // roving tabindex
        btn.setAttribute('aria-label', fmt('aria_opt', { n: idx + 1, desc: describe(opt) }));

        var num = document.createElement('span');
        num.className = 'opt-num';
        num.setAttribute('aria-hidden', 'true');
        num.textContent = String(idx + 1);
        btn.appendChild(num);

        var shp = document.createElement('span');
        shp.className = 'shape col-' + opt.color;
        shp.innerHTML = shapeByKey(opt.shape).svg;
        btn.appendChild(shp);

        btn.addEventListener('click', function () { choose(idx); });
        btn.addEventListener('keydown', onOptionKey);
        btn.addEventListener('focus', function () { setRoving(idx); });

        optionsEl.appendChild(btn);
        optEls.push(btn);
      })(i);
    }
  }
  function setRoving(idx) {
    for (var i = 0; i < optEls.length; i++) { optEls[i].tabIndex = (i === idx) ? 0 : -1; }
  }

  /* ---------- Zeitleiste: framerate-unabhaengig ueber echte Zeit ---------- */
  function elapsedMs() { return nowMs() - roundStart - pauseOffset; }
  function remainingFrac() {
    var f = 1 - elapsedMs() / roundDuration;
    if (f < 0) f = 0; else if (f > 1) f = 1;
    return f;
  }
  function setBar(frac) {
    if (timebarFillEl) timebarFillEl.style.setProperty('--p', String(frac));
    if (timebarEl) {
      if (frac <= 0.3) timebarEl.classList.add('is-low'); else timebarEl.classList.remove('is-low');
      timebarEl.setAttribute('aria-label', t('timebar_aria') + ': ' + Math.round(frac * 100) + '%');
    }
  }
  function scheduleTick() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(tick);
  }
  function stopTick() {
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
  }
  function tick() {
    rafId = 0;
    if (phase !== 'play') return;     // bei Pause/Reveal/Over nicht neu planen
    var frac = remainingFrac();
    setBar(frac);
    if (elapsedMs() >= roundDuration) { onTimeout(); return; }
    rafId = window.requestAnimationFrame(tick);
  }

  /* ---------- Rundenablauf ---------- */
  function startRound() {
    var data = makeRound(round);
    options = data.options;
    correctIndex = data.correctIndex;
    roundDuration = roundMs(round);

    clearReveal();
    buildOptionsDOM();
    renderTarget(data.target);
    updateHud();
    setBar(1);
    if (timebarEl) timebarEl.classList.remove('is-paused');

    phase = 'play';
    pauseOffset = 0;
    manualPause = false;
    roundStart = nowMs();
    scheduleTick();
    // Startet eine Runde, waehrend der Tab versteckt ist (der Reveal-Timer
    // kann im Hintergrund feuern), sofort einfrieren. Sonst liefe die Uhr
    // unsichtbar weiter und kostete bei Rueckkehr ein Leben. onVisibility
    // setzt sie beim Wiedererscheinen automatisch fort (manualPause bleibt false).
    if (document.hidden) doPause();
    announce(t('msg_go') + ': ' + shapeByKey(data.target.shape).name + t('in_color') + colorByKey(data.target.color).name);
  }

  function choose(idx) {
    if (phase !== 'play') return;
    if (idx < 0 || idx >= options.length) return;
    stopTick();
    var frac = remainingFrac();
    var ok = (idx === correctIndex);
    phase = 'reveal';

    if (optEls[idx]) optEls[idx].classList.add(ok ? 'is-correct' : 'is-wrong');
    if (!ok && optEls[correctIndex]) optEls[correctIndex].classList.add('is-correct');

    if (ok) {
      var gain = 100 + Math.round(frac * 100);
      score += gain;
      announce(t('msg_correct') + ' +' + gain, 'good');
    } else {
      loseLife(t('msg_wrong'));
    }
    updateHud();
    afterReveal();
  }

  function onTimeout() {
    if (phase !== 'play') return;
    stopTick();
    setBar(0);
    phase = 'reveal';
    if (optEls[correctIndex]) optEls[correctIndex].classList.add('is-correct');
    loseLife(t('msg_timeout'));
    updateHud();
    afterReveal();
  }

  function loseLife(reason) {
    lives -= 1;
    var msg = reason + (lives > 0 ? ', ' + fmt('msg_lives_left', { n: lives }) : '');
    announce(msg, 'bad');
  }

  function afterReveal() {
    clearReveal();
    revealTimer = window.setTimeout(function () {
      revealTimer = 0;
      if (lives <= 0) { gameOver(); return; }
      round += 1;
      startRound();
    }, 480);
  }
  function clearReveal() { if (revealTimer) { window.clearTimeout(revealTimer); revealTimer = 0; } }

  function updateHud() {
    if (hudScoreEl) hudScoreEl.textContent = String(score);
    if (hudRoundEl) hudRoundEl.textContent = String(round);
    if (hudLivesEl) {
      var shown = lives < 0 ? 0 : lives;
      hudLivesEl.textContent = String(shown);
      hudLivesEl.classList.toggle('lives-low', shown <= 1);
    }
    updateBest();
  }

  /* ---------- Bestwert (einheitliches null-Muster, Vorbild grid9) ----------
     Score, hoeher ist besser. Kein gespeicherter Wert ergibt null, daher
     "noch keine" statt 0. hasStorage-Preflight, try/catch, Bereichspruefung. */
  function bestKey() { return 'dailycode:react7:best'; }
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

  /* ---------- Ende und Neustart ----------
     Highscore ist bewusst noch nicht persistent. Der Lauf-Score wird in
     einer Variablen gefuehrt und am Ende angezeigt; eine spaetere Bestwert
     Persistenz haengt sich hier (gameOver) und beim Start an, analog der
     loadBest/saveBest Logik der anderen Spiele. */
  function gameOver() {
    phase = 'over';
    stopTick();
    var prev = loadBestVal();
    if (prev == null || score > prev) saveBest(score);
    var best = loadBestVal();
    updateBest();
    var scoreText = fmt('over_score', { s: score, r: round }) +
      (best != null ? '  ·  ' + t('lbl_best') + ' ' + best : '');
    showOverlay(t('over_title'), scoreText, t('over_restart'));
    announce(t('over_title') + ', ' + fmt('over_score', { s: score, r: round }), 'bad');
    setPauseLabel();
  }
  function showOverlay(title, scoreText, btnText) {
    if (overlayTitleEl) overlayTitleEl.textContent = title;
    if (overlayScoreEl) { overlayScoreEl.textContent = scoreText || ''; overlayScoreEl.hidden = !scoreText; }
    if (overlayBtn) overlayBtn.textContent = btnText;
    if (overlayEl) overlayEl.hidden = false;
  }
  function hideOverlay() { if (overlayEl) overlayEl.hidden = true; }

  function restartRun() {
    clearReveal();
    stopTick();
    hideOverlay();
    score = 0;
    lives = 3;
    round = 1;
    manualPause = false;
    setPauseLabel();
    startRound();
  }

  /* ---------- Pause: Knopf und versteckter Tab ----------
     doPause/doResume frieren die Runde ein, indem die Pausendauer in
     pauseOffset aufsummiert wird. Die Restzeit bleibt dadurch exakt
     erhalten, es geht kein Leben durch einen Tabwechsel verloren. */
  function doPause() {
    if (phase !== 'play') return;
    phase = 'paused';
    pauseBegin = nowMs();
    stopTick();
    if (timebarEl) timebarEl.classList.add('is-paused');
  }
  function doResume() {
    if (phase !== 'paused') return;
    phase = 'play';
    pauseOffset += nowMs() - pauseBegin;
    if (timebarEl) timebarEl.classList.remove('is-paused');
    scheduleTick();
  }
  function onPauseBtn() {
    if (phase === 'play') {
      manualPause = true;
      doPause();
      announce(t('msg_paused'));
    } else if (phase === 'paused' && manualPause) {
      manualPause = false;
      doResume();
      announce(t('msg_resumed'));
    }
    setPauseLabel();
  }
  function setPauseLabel() {
    if (!pauseBtn) return;
    var resumeMode = (phase === 'paused' && manualPause);
    pauseBtn.textContent = resumeMode ? t('btn_resume') : t('btn_pause');
    pauseBtn.setAttribute('aria-label', resumeMode ? t('aria_resume') : t('aria_pause'));
    pauseBtn.disabled = (phase === 'over');
  }
  function onVisibility() {
    if (document.hidden) {
      if (phase === 'play') doPause();   // auto, manualPause bleibt false
    } else {
      if (phase === 'paused' && !manualPause) doResume();
    }
  }

  /* ---------- Tastatur ----------
     Global: Ziffern 1 bis n waehlen direkt. Auf einer Option: Pfeile
     wandern (roving tabindex), Enter/Leertaste loesen die Wahl nativ aus. */
  function onGlobalKey(e) {
    if (phase !== 'play') return;
    var k = e.key;
    if (k >= '1' && k <= '9') {
      var idx = parseInt(k, 10) - 1;
      if (idx >= 0 && idx < options.length) { e.preventDefault(); choose(idx); }
    }
  }
  function onOptionKey(e) {
    var k = e.key;
    var cur = optEls.indexOf(e.currentTarget);
    if (cur === -1) return;
    if (k === 'ArrowRight' || k === 'ArrowDown') {
      e.preventDefault();
      var nx = (cur + 1) % optEls.length;
      setRoving(nx); optEls[nx].focus();
    } else if (k === 'ArrowLeft' || k === 'ArrowUp') {
      e.preventDefault();
      var pv = (cur - 1 + optEls.length) % optEls.length;
      setRoving(pv); optEls[pv].focus();
    }
    // Enter und Leertaste: native Knopf-Aktivierung loest click -> choose aus.
  }

  /* ---------- Statische Texte und Rechtslinks ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    setText('lblScore', t('lbl_score'));
    setText('lblLives', t('lbl_lives'));
    setText('lblRound', t('lbl_round'));
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
    if (optionsEl) optionsEl.setAttribute('aria-label', t('opt_group'));
    if (timebarEl) timebarEl.setAttribute('aria-label', t('timebar_aria'));
    if (restartBtn) { restartBtn.textContent = t('btn_restart'); restartBtn.setAttribute('aria-label', t('aria_restart')); }
    setPauseLabel();
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
     Reihenfolge penibel (Lehre aus cluster): Theme, Texte und die statischen
     Bedienleisten zuerst, dann Listener, DANN die erste Runde erzeugen.
     Kein Render greift vorher auf noch nicht existierende Optionen zu. */
  function init() {
    setFooterLinks();
    buildThemeBar();
    applyTheme();
    applyTexts();
    updateHud();
    setBar(1);

    window.addEventListener('keydown', onGlobalKey);
    if (pauseBtn) pauseBtn.addEventListener('click', onPauseBtn);
    if (restartBtn) restartBtn.addEventListener('click', restartRun);
    if (overlayBtn) overlayBtn.addEventListener('click', function () { if (phase === 'over') restartRun(); });

    if (systemDarkMQ.addEventListener) systemDarkMQ.addEventListener('change', function () { if (theme === 'auto') applyTheme(); });
    else if (systemDarkMQ.addListener) systemDarkMQ.addListener(function () { if (theme === 'auto') applyTheme(); });
    document.addEventListener('visibilitychange', onVisibility);

    registerServiceWorker();

    startRound();
  }

  init();
})();
