/* ============================================================
   dailycode  PuzzlePure Score  Zentrale Score, Liga und Pokal Logik
   Wird unveraendert per <script src> aus jedem Spielordner und aus
   rankings/ geladen (z.B. <script src="../shared/score.js">). Rein
   lokale Logik, keine Netzwerkzugriffe, keine personenbezogenen
   Daten, keine Nutzer ID. Alles ueber localStorage auf diesem Geraet.
   ============================================================ */
'use strict';

(function (root) {
  var SCORE_KEY = 'dailycode:puzzlepure:score:v1';
  var PROFILE_KEY = 'dailycode:puzzlepure:profile:v1';

  /* Technische Spielschluessel entsprechen den Ordnernamen, wie im
     Projekt bereits ueblich (z.B. dailycode:drift:best, dailycode:grid9:best). */
  var GAMES = ['code', 'drift', 'cluster', 'echo', 'glyph', 'grid9', 'react7', 'flow8', 'picto', 'questra'];

  var LEAGUES = [
    { key: 'bronze', from: 0 },
    { key: 'silver', from: 500 },
    { key: 'gold', from: 2000 },
    { key: 'platinum', from: 6000 },
    { key: 'diamond', from: 15000 }
  ];

  var TROPHIES = ['first_round', 'daily_record', 'flawless', 'fast_solve', 'all_games', 'week_streak', 'expert_cleared'];

  var I18N = {
    de: {
      pp_points: 'PuzzlePure Punkte',
      pp_best: 'Bester Wert',
      pp_daily_best: 'Tagesbestwert',
      pp_new_best: 'Neue Bestleistung',
      pp_league_label: 'Liga',
      pp_privacy_note: 'Deine Werte werden nur auf diesem Geraet gespeichert.',
      league_bronze: 'Bronze', league_silver: 'Silber', league_gold: 'Gold', league_platinum: 'Platin', league_diamond: 'Diamant',
      trophy_first_round: 'Erste Runde',
      trophy_daily_record: 'Tagesrekord',
      trophy_flawless: 'Fehlerfrei',
      trophy_fast_solve: 'Schnell geloest',
      trophy_all_games: 'Alle Spiele gespielt',
      trophy_week_streak: 'Sieben Tage Serie',
      trophy_expert_cleared: 'Experte gemeistert'
    },
    en: {
      pp_points: 'PuzzlePure Points',
      pp_best: 'Best Value',
      pp_daily_best: 'Daily Best',
      pp_new_best: 'New Best Result',
      pp_league_label: 'League',
      pp_privacy_note: 'Your values are only stored on this device.',
      league_bronze: 'Bronze', league_silver: 'Silver', league_gold: 'Gold', league_platinum: 'Platinum', league_diamond: 'Diamond',
      trophy_first_round: 'First Round',
      trophy_daily_record: 'Daily Record',
      trophy_flawless: 'Flawless',
      trophy_fast_solve: 'Fast Solve',
      trophy_all_games: 'All Games Played',
      trophy_week_streak: 'Seven Day Streak',
      trophy_expert_cleared: 'Expert Cleared'
    },
    tr: {
      pp_points: 'PuzzlePure Puan',
      pp_best: 'En Iyi Deger',
      pp_daily_best: 'Gunun En Iyisi',
      pp_new_best: 'Yeni En Iyi Sonuc',
      pp_league_label: 'Lig',
      pp_privacy_note: 'Degerlerin yalnizca bu cihazda saklanir.',
      league_bronze: 'Bronz', league_silver: 'Gumus', league_gold: 'Altin', league_platinum: 'Platin', league_diamond: 'Elmas',
      trophy_first_round: 'Ilk Tur',
      trophy_daily_record: 'Gunun Rekoru',
      trophy_flawless: 'Hatasiz',
      trophy_fast_solve: 'Hizli Cozum',
      trophy_all_games: 'Tum Oyunlar Oynandi',
      trophy_week_streak: 'Yedi Gun Serisi',
      trophy_expert_cleared: 'Uzman Tamamlandi'
    }
  };

  function t(lang, key) {
    var table = I18N[lang] || I18N.en;
    var v = table[key];
    if (v === undefined) v = I18N.en[key];
    return v === undefined ? key : v;
  }

  /* ---------- Datum, ohne new Date() Abhaengigkeit von aussen zu verstecken ---------- */
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
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------- localStorage, typisiert und defensiv, siehe LOCAL-STORAGE-STANDARD.md ---------- */
  function storageOK() {
    try {
      var k = '__dc_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }
  var hasStorage = storageOK();

  function defaultGameScore() {
    return {
      highscore: 0,
      highscoreByDifficulty: {},
      dailyBestDate: null,
      dailyBestScore: 0,
      roundsPlayed: 0,
      roundsSolved: 0,
      perfectRounds: 0
    };
  }
  function normalizeGameScore(o) {
    var d = defaultGameScore();
    if (!o || typeof o !== 'object') return d;
    d.highscore = intOr(o.highscore, 0);
    if (o.highscoreByDifficulty && typeof o.highscoreByDifficulty === 'object') {
      for (var k in o.highscoreByDifficulty) {
        if (Object.prototype.hasOwnProperty.call(o.highscoreByDifficulty, k)) {
          d.highscoreByDifficulty[k] = intOr(o.highscoreByDifficulty[k], 0);
        }
      }
    }
    d.dailyBestDate = isDateKey(o.dailyBestDate) ? o.dailyBestDate : null;
    d.dailyBestScore = intOr(o.dailyBestScore, 0);
    d.roundsPlayed = intOr(o.roundsPlayed, 0);
    d.roundsSolved = intOr(o.roundsSolved, 0);
    d.perfectRounds = intOr(o.perfectRounds, 0);
    return d;
  }
  function defaultScoreStore() {
    var games = {};
    GAMES.forEach(function (g) { games[g] = defaultGameScore(); });
    return { games: games };
  }
  function loadScoreStore() {
    if (!hasStorage) return defaultScoreStore();
    try {
      var raw = window.localStorage.getItem(SCORE_KEY);
      var d = defaultScoreStore();
      if (!raw) return d;
      var o = JSON.parse(raw);
      if (o && o.games && typeof o.games === 'object') {
        GAMES.forEach(function (g) { d.games[g] = normalizeGameScore(o.games[g]); });
      }
      return d;
    } catch (e) { return defaultScoreStore(); }
  }
  function saveScoreStore(s) {
    if (!hasStorage) return;
    try { window.localStorage.setItem(SCORE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function defaultProfile() {
    var trophies = {};
    TROPHIES.forEach(function (k) { trophies[k] = false; });
    return {
      totalScore: 0,
      roundsPlayed: 0,
      roundsSolved: 0,
      perfectRounds: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastPlayedDate: null,
      league: 'bronze',
      gamesPlayed: [],
      trophies: trophies
    };
  }
  function normalizeProfile(o) {
    var d = defaultProfile();
    if (!o || typeof o !== 'object') return d;
    d.totalScore = intOr(o.totalScore, 0);
    d.roundsPlayed = intOr(o.roundsPlayed, 0);
    d.roundsSolved = intOr(o.roundsSolved, 0);
    d.perfectRounds = intOr(o.perfectRounds, 0);
    d.currentStreak = intOr(o.currentStreak, 0);
    d.bestStreak = intOr(o.bestStreak, 0);
    d.lastPlayedDate = isDateKey(o.lastPlayedDate) ? o.lastPlayedDate : null;
    d.league = leagueForScore(d.totalScore).key;
    if (Array.isArray(o.gamesPlayed)) {
      d.gamesPlayed = o.gamesPlayed.filter(function (g) { return GAMES.indexOf(g) !== -1; });
    }
    if (o.trophies && typeof o.trophies === 'object') {
      TROPHIES.forEach(function (k) { d.trophies[k] = !!o.trophies[k]; });
    }
    if (d.currentStreak > d.bestStreak) d.bestStreak = d.currentStreak;
    return d;
  }
  function loadProfile() {
    if (!hasStorage) return defaultProfile();
    try {
      var raw = window.localStorage.getItem(PROFILE_KEY);
      if (!raw) return defaultProfile();
      return normalizeProfile(JSON.parse(raw));
    } catch (e) { return defaultProfile(); }
  }
  function saveProfile(p) {
    if (!hasStorage) return;
    try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {}
  }

  /* ---------- Liga ---------- */
  function leagueForScore(totalScore) {
    var current = LEAGUES[0];
    for (var i = 0; i < LEAGUES.length; i++) {
      if (totalScore >= LEAGUES[i].from) current = LEAGUES[i];
    }
    var idx = LEAGUES.indexOf(current);
    var next = LEAGUES[idx + 1] || null;
    return {
      key: current.key,
      next: next ? next.key : null,
      toNext: next ? Math.max(0, next.from - totalScore) : 0
    };
  }

  /* ---------- Score Formel ----------
     basePoints skaliert nach Schwierigkeit, Zeitbonus nur wenn eine
     Parzeit bekannt ist, Bonus fuer fehlerfreie Runden, Abzug fuer
     Fehler und Hinweise. Nie negativ. */
  function computeScore(payload) {
    var difficulty = [1, 2, 3, 4].indexOf(payload.difficulty) !== -1 ? payload.difficulty : 2;
    var multiplier = { 1: 1.0, 2: 1.25, 3: 1.5, 4: 2.0 }[difficulty];
    var basePoints = 100;
    var timeBonus = 0;
    if (typeof payload.parSeconds === 'number' && payload.parSeconds > 0 && typeof payload.timeSeconds === 'number') {
      timeBonus = clamp(Math.round((payload.parSeconds - payload.timeSeconds) / payload.parSeconds * 40), 0, 40);
    }
    var perfectBonus = payload.perfect ? 20 : 0;
    var mistakes = intOr(payload.mistakes, 0);
    var hints = intOr(payload.hints, 0);
    var mistakePenalty = mistakes * 8;
    var hintPenalty = hints * 12;
    var raw = (basePoints * multiplier) + timeBonus + perfectBonus - mistakePenalty - hintPenalty;
    return Math.max(0, Math.round(raw));
  }

  /* ---------- Rundenergebnis verbuchen ----------
     payload: { game, difficulty(1..4|null), outcome('win'|'loss'|'complete'),
                timeSeconds, parSeconds, mistakes, hints, perfect, rawGameScore }
     Gibt ein Ergebnisobjekt zurueck, das die UI direkt anzeigen kann. */
  function recordResult(payload) {
    var game = payload && payload.game;
    if (GAMES.indexOf(game) === -1) {
      return { score: 0, isNewBest: false, isNewDifficultyBest: false, isNewDailyBest: false, newTrophies: [], league: 'bronze', previousLeague: 'bronze', streakContinued: false, totalScore: 0 };
    }
    var outcome = payload.outcome === 'loss' ? 'loss' : (payload.outcome === 'complete' ? 'complete' : 'win');
    var today = dateKeyUTC();
    var scoreStore = loadScoreStore();
    var profile = loadProfile();
    var gs = scoreStore.games[game];
    var previousLeague = profile.league;
    var previousStreak = profile.currentStreak;

    var score = outcome === 'loss' ? 0 : computeScore(payload);
    var difficultyKey = [1, 2, 3, 4].indexOf(payload.difficulty) !== -1 ? String(payload.difficulty) : null;

    gs.roundsPlayed += 1;
    var solved = outcome !== 'loss';
    if (solved) gs.roundsSolved += 1;
    if (payload.perfect) gs.perfectRounds += 1;

    var isNewBest = false, isNewDifficultyBest = false, isNewDailyBest = false;
    if (solved) {
      if (score > gs.highscore) { gs.highscore = score; isNewBest = true; }
      if (difficultyKey) {
        var prevDiff = intOr(gs.highscoreByDifficulty[difficultyKey], 0);
        if (score > prevDiff) { gs.highscoreByDifficulty[difficultyKey] = score; isNewDifficultyBest = true; }
      }
      if (gs.dailyBestDate !== today) { gs.dailyBestDate = today; gs.dailyBestScore = 0; }
      if (score > gs.dailyBestScore) { gs.dailyBestScore = score; isNewDailyBest = true; }
    }
    scoreStore.games[game] = gs;
    saveScoreStore(scoreStore);

    profile.roundsPlayed += 1;
    if (solved) profile.roundsSolved += 1;
    if (payload.perfect) profile.perfectRounds += 1;
    profile.totalScore += score;
    if (profile.gamesPlayed.indexOf(game) === -1) profile.gamesPlayed.push(game);

    var streakContinued = false;
    if (profile.lastPlayedDate !== today) {
      profile.currentStreak = (profile.lastPlayedDate === prevDayKey(today)) ? profile.currentStreak + 1 : 1;
      profile.lastPlayedDate = today;
      if (profile.currentStreak > profile.bestStreak) profile.bestStreak = profile.currentStreak;
      streakContinued = profile.currentStreak > 1 && profile.currentStreak === previousStreak + 1;
    }
    profile.league = leagueForScore(profile.totalScore).key;

    var newTrophies = [];
    function grant(key) {
      if (!profile.trophies[key]) { profile.trophies[key] = true; newTrophies.push(key); }
    }
    if (profile.roundsPlayed >= 1) grant('first_round');
    if (isNewDailyBest) grant('daily_record');
    if (payload.perfect) grant('flawless');
    if (typeof payload.parSeconds === 'number' && payload.parSeconds > 0 && typeof payload.timeSeconds === 'number') {
      var frac = (payload.parSeconds - payload.timeSeconds) / payload.parSeconds;
      if (solved && frac >= 0.5) grant('fast_solve');
    }
    if (profile.gamesPlayed.length >= GAMES.length) grant('all_games');
    if (profile.currentStreak >= 7) grant('week_streak');
    if (solved && payload.difficulty === 4) grant('expert_cleared');

    saveProfile(profile);

    return {
      score: score,
      isNewBest: isNewBest,
      isNewDifficultyBest: isNewDifficultyBest,
      isNewDailyBest: isNewDailyBest,
      newTrophies: newTrophies,
      league: profile.league,
      previousLeague: previousLeague,
      streakContinued: streakContinued,
      totalScore: profile.totalScore,
      highscore: gs.highscore,
      dailyBestScore: gs.dailyBestScore
    };
  }

  function getProfile() { return loadProfile(); }
  function getAllScores() { return loadScoreStore(); }
  function getGameScore(game) { return normalizeGameScore(loadScoreStore().games[game]); }

  /* ---------- UI Hilfsfunktion ----------
     Baut ein kleines, ruhiges Ergebnis Fragment (kein Chart, keine
     Animation, nur Text) fuer den Ergebnisbildschirm eines Spiels. */
  function buildResultBlock(lang, result) {
    var wrap = document.createElement('div');
    wrap.className = 'pp-score';

    var line = document.createElement('p');
    line.className = 'pp-score-line';
    line.textContent = t(lang, 'pp_points') + ': ' + result.score;
    wrap.append(line);

    var best = document.createElement('p');
    best.className = 'pp-score-best';
    best.textContent = t(lang, 'pp_best') + ': ' + result.highscore;
    wrap.append(best);

    if (result.isNewBest || result.isNewDifficultyBest || result.isNewDailyBest) {
      var rec = document.createElement('p');
      rec.className = 'pp-score-record';
      rec.setAttribute('role', 'status');
      rec.setAttribute('aria-live', 'polite');
      rec.textContent = t(lang, 'pp_new_best');
      wrap.append(rec);
    }

    var league = document.createElement('p');
    league.className = 'pp-score-league';
    league.textContent = t(lang, 'pp_league_label') + ': ' + t(lang, 'league_' + result.league);
    wrap.append(league);

    return wrap;
  }

  root.PuzzlePureScore = {
    GAMES: GAMES.slice(),
    LEAGUES: LEAGUES.map(function (l) { return { key: l.key, from: l.from }; }),
    TROPHIES: TROPHIES.slice(),
    recordResult: recordResult,
    getProfile: getProfile,
    getAllScores: getAllScores,
    getGameScore: getGameScore,
    leagueForScore: leagueForScore,
    computeScore: computeScore,
    buildResultBlock: buildResultBlock,
    t: t
  };
})(typeof window !== 'undefined' ? window : this);
