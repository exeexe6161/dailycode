/* ============================================================
   dailycode  Rangliste
   Zeigt Gesamtpunkte, Liga, Pokale und Highscores aller Spiele aus
   dem gemeinsamen PuzzlePureScore System (siehe ../shared/score.js).
   Reine Anzeige, keine eigene Spiellogik. Alles ausschliesslich aus
   localStorage auf diesem Geraet, keine Netzwerkzugriffe, keine
   personenbezogenen Daten, keine Nutzer ID.

   Dieses Projekt hat keinen Build Schritt, jede Seite ist ein
   einzelnes game.js als IIFE ohne Modul System (gleiche Konvention
   wie die zehn Spiele). Vanilla JS, keine Libraries, keine externen
   Ressourcen, keine data URI. Strikte CSP konform: keine Inline
   Styles, Theme ueber data Attribut.
   ============================================================ */
(function () {
  'use strict';

  var I18N = {
    de: {
      subtitle: 'Gesamtpunkte, Liga, Pokale und Highscores aller Spiele.',
      theme_group: 'Darstellung', theme_auto: 'Automatisch', theme_light: 'Hell', theme_dark: 'Dunkel',
      aria_lang_group: 'Sprache',
      nav_privacy: 'Datenschutz', nav_imprint: 'Impressum',
      home: 'Startseite', home_aria: 'Zur Startseite',
      help_summary: 'So funktioniert es',
      help_1: 'Jede abgeschlossene Runde in einem Spiel bringt PuzzlePure Punkte, die sich zu deinen Gesamtpunkten addieren.',
      help_2: 'Aus den Gesamtpunkten ergibt sich deine Liga, aus besonderen Leistungen ergeben sich Pokale.',
      help_3: 'Alle Werte werden nur auf diesem Geraet gespeichert und nirgendwo hochgeladen.',
      rk_total_points: 'Gesamtpunkte',
      rk_league_to_next: function (n, name) { return 'Noch ' + n + ' Punkte bis ' + name; },
      rk_league_max: 'Hoechste Liga erreicht',
      rk_rounds_played: 'Gespielt',
      rk_rounds_solved: 'Geloest',
      rk_perfect_rounds: 'Perfekt',
      rk_current_streak: 'Serie',
      rk_best_streak: 'Beste Serie',
      rk_trophies_title: 'Pokale',
      rk_games_title: 'Highscores je Spiel',
      rk_not_played: 'Noch nicht gespielt',
      rk_rounds_meta: function (played, solved) { return 'Gespielt ' + played + ' · Geloest ' + solved; }
    },
    en: {
      subtitle: 'Total points, league, trophies and highscores across all games.',
      theme_group: 'Appearance', theme_auto: 'Auto', theme_light: 'Light', theme_dark: 'Dark',
      aria_lang_group: 'Language',
      nav_privacy: 'Privacy', nav_imprint: 'Imprint',
      home: 'Home', home_aria: 'Go to home',
      help_summary: 'How it works',
      help_1: 'Every completed round in a game earns PuzzlePure Points, which add up to your total score.',
      help_2: 'Your total score determines your league, and special achievements unlock trophies.',
      help_3: 'All values are only stored on this device and are never uploaded anywhere.',
      rk_total_points: 'Total Points',
      rk_league_to_next: function (n, name) { return n + ' points to ' + name; },
      rk_league_max: 'Highest league reached',
      rk_rounds_played: 'Played',
      rk_rounds_solved: 'Solved',
      rk_perfect_rounds: 'Perfect',
      rk_current_streak: 'Streak',
      rk_best_streak: 'Best Streak',
      rk_trophies_title: 'Trophies',
      rk_games_title: 'Highscores per Game',
      rk_not_played: 'Not played yet',
      rk_rounds_meta: function (played, solved) { return 'Played ' + played + ' · Solved ' + solved; }
    },
    tr: {
      subtitle: 'Tum oyunlarda toplam puan, lig, kupalar ve en iyi skorlar.',
      theme_group: 'Gorunum', theme_auto: 'Otomatik', theme_light: 'Acik', theme_dark: 'Koyu',
      aria_lang_group: 'Dil',
      nav_privacy: 'Gizlilik', nav_imprint: 'Kunye',
      home: 'Ana sayfa', home_aria: 'Ana sayfaya git',
      help_summary: 'Nasil calisir',
      help_1: 'Bir oyundaki her tamamlanan tur PuzzlePure Puan kazandirir, bunlar toplam puanina eklenir.',
      help_2: 'Toplam puanin liginizi belirler, ozel basarilar da kupa kazandirir.',
      help_3: 'Tum degerler yalnizca bu cihazda saklanir ve hicbir yere yuklenmez.',
      rk_total_points: 'Toplam Puan',
      rk_league_to_next: function (n, name) { return name + ' e ' + n + ' puan kaldi'; },
      rk_league_max: 'En yuksek liga ulasildi',
      rk_rounds_played: 'Oynanan',
      rk_rounds_solved: 'Cozulen',
      rk_perfect_rounds: 'Mukemmel',
      rk_current_streak: 'Seri',
      rk_best_streak: 'En Iyi Seri',
      rk_trophies_title: 'Kupalar',
      rk_games_title: 'Oyun Basina En Iyi Skorlar',
      rk_not_played: 'Henuz oynanmadi',
      rk_rounds_meta: function (played, solved) { return 'Oynanan ' + played + ' · Cozulen ' + solved; }
    }
  };
  function t(key) {
    var table = I18N[lang] || I18N.en;
    var v = table[key];
    if (v === undefined) v = I18N.en[key];
    return v === undefined ? key : v;
  }

  /* Anzeigenamen sind Eigennamen und bleiben in allen Sprachen gleich,
     wie schon in portal.js fuer die Kacheln. Technische Schluessel
     entsprechen den Ordnernamen, wie in shared/score.js. */
  var GAME_NAME = {
    code: 'Ciphera', drift: 'Serpix', cluster: 'Nexa', echo: 'Memora', glyph: 'Lexiq',
    grid9: 'Numora', react7: 'Reflexa', flow8: 'Fluxa', picto: 'Pixela', questra: 'Questra'
  };
  var GAME_HREF = {
    code: '../code/index.html', drift: '../drift/index.html', cluster: '../cluster/index.html',
    echo: '../echo/index.html', glyph: '../glyph/index.html', grid9: '../grid9/index.html',
    react7: '../react7/index.html', flow8: '../flow8/index.html', picto: '../picto/index.html',
    questra: '../questra/index.html'
  };

  /* ---------- Lucide Bedien-Icons (ISC), wie in den anderen Spielen ---------- */
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" class="lucide" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  var ICON = {
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: svg('<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>'),
    monitor: svg('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'),
    globe: svg('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'),
    star: svg('<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'),
    circle: svg('<circle cx="12" cy="12" r="9"/>'),
    house: svg('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>')
  };
  var THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };

  /* ---------- DOM ---------- */
  var langbarEl       = document.getElementById('langbar');
  var themebarEl       = document.getElementById('themebar');
  var themeColorEl     = document.getElementById('themeColor');
  var themeFeedbackEl  = document.getElementById('themeFeedback');
  var subtitleEl       = document.getElementById('subtitle');
  var privacyNoteEl    = document.getElementById('privacyNote');
  var stageEl          = document.getElementById('stage');
  var linkPrivacyEl    = document.getElementById('linkPrivacy');
  var linkImprintEl    = document.getElementById('linkImprint');
  var homeLinkEl       = document.getElementById('homeLink');

  /* ---------- Theme und Sprache (geteilte Keys mit Portal und allen Spielen) ---------- */
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
    renderRankings();
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
    langToggleBtn.setAttribute('aria-label', t('aria_lang_group'));
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

  /* ---------- Anzeige ---------- */
  function statCellHtml(num, cap) {
    return '<div class="stat-cell"><div class="stat-num">' + num + '</div><div class="stat-cap">' + cap + '</div></div>';
  }

  function renderRankings() {
    if (!stageEl) return;
    if (!window.PuzzlePureScore) { stageEl.innerHTML = '<p class="rk-empty">' + t('rk_not_played') + '</p>'; return; }

    var PP = window.PuzzlePureScore;
    var profile = PP.getProfile();
    var scores = PP.getAllScores();
    var leagueInfo = PP.leagueForScore(profile.totalScore);

    var html = '';

    html += '<section class="rk-section rk-summary">';
    html += '<div class="rk-total-score">' + profile.totalScore + '</div>';
    html += '<div class="rk-total-cap">' + t('rk_total_points') + '</div>';
    html += '<div class="rk-league-row">';
    html += '<span class="rk-league-badge">' + PP.t(lang, 'league_' + profile.league) + '</span>';
    html += '<span class="rk-league-next">' + (leagueInfo.next ? t('rk_league_to_next')(leagueInfo.toNext, PP.t(lang, 'league_' + leagueInfo.next)) : t('rk_league_max')) + '</span>';
    html += '</div></section>';

    html += '<section class="rk-section"><div class="stat-grid">';
    html += statCellHtml(profile.roundsPlayed, t('rk_rounds_played'));
    html += statCellHtml(profile.roundsSolved, t('rk_rounds_solved'));
    html += statCellHtml(profile.perfectRounds, t('rk_perfect_rounds'));
    html += statCellHtml(profile.currentStreak, t('rk_current_streak'));
    html += statCellHtml(profile.bestStreak, t('rk_best_streak'));
    html += '</div></section>';

    html += '<section class="rk-section">';
    html += '<h2 class="rk-section-title">' + t('rk_trophies_title') + '</h2>';
    html += '<div class="rk-trophies">';
    PP.TROPHIES.forEach(function (key) {
      var earned = !!profile.trophies[key];
      html += '<div class="rk-trophy' + (earned ? ' is-earned' : '') + '">';
      html += '<span class="rk-trophy-icon">' + (earned ? ICON.star : ICON.circle) + '</span>';
      html += '<span class="rk-trophy-name">' + PP.t(lang, 'trophy_' + key) + '</span>';
      html += '</div>';
    });
    html += '</div></section>';

    html += '<section class="rk-section">';
    html += '<h2 class="rk-section-title">' + t('rk_games_title') + '</h2>';
    html += '<div class="rk-games">';
    PP.GAMES.forEach(function (g) {
      var gs = scores.games[g];
      var name = GAME_NAME[g] || g;
      var href = GAME_HREF[g] || '#';
      html += '<a class="rk-game-row" href="' + href + '">';
      html += '<span class="rk-game-name">' + name + '</span>';
      html += '<span class="rk-game-score">' + gs.highscore + '</span>';
      if (gs.roundsPlayed > 0) {
        html += '<span class="rk-game-meta">' + PP.t(lang, 'pp_daily_best') + ': ' + gs.dailyBestScore + ' · ' + t('rk_rounds_meta')(gs.roundsPlayed, gs.roundsSolved) + '</span>';
      } else {
        html += '<span class="rk-game-meta">' + t('rk_not_played') + '</span>';
      }
      html += '</a>';
    });
    html += '</div></section>';

    stageEl.innerHTML = html;
  }

  /* ---------- Statische Texte ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    if (privacyNoteEl && window.PuzzlePureScore) privacyNoteEl.textContent = window.PuzzlePureScore.t(lang, 'pp_privacy_note');
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

    renderRankings();
  }

  init();
})();
