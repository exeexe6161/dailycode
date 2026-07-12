/* ============================================================
   dailycode  PuzzlePure Score  Zentrale Score, Liga und Pokal Logik
   Wird unveraendert per <script src> aus jedem Spielordner und aus
   rankings/ geladen (z.B. <script src="../shared/score.js">). Rein
   lokale Logik, keine Netzwerkzugriffe, keine personenbezogenen
   Daten, keine Nutzer ID. Alles ueber localStorage auf diesem Geraet.
   ============================================================ */
'use strict';

(function (root) {
  var SCORE_KEY = 'dailycode:puzzlepure:score:v2';
  var PROFILE_KEY = 'dailycode:puzzlepure:profile:v2';
  var LEGACY_SCORE_KEY = 'dailycode:puzzlepure:score:v1';
  var LEGACY_PROFILE_KEY = 'dailycode:puzzlepure:profile:v1';
  var MAX_RESULT_IDS = 1000;

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
      pp_best: 'Beste PuzzlePure Wertung',
      pp_game_best: 'Spielbestwert',
      pp_daily_best: 'Tagesbestwert',
      pp_new_best: 'Neue Bestleistung',
      pp_league_label: 'Liga',
      pp_privacy_note: 'Deine Werte werden nur auf diesem Gerät gespeichert.',
      league_bronze: 'Bronze', league_silver: 'Silber', league_gold: 'Gold', league_platinum: 'Platin', league_diamond: 'Diamant',
      trophy_first_round: 'Erste Runde',
      trophy_daily_record: 'Tagesrekord',
      trophy_flawless: 'Fehlerfrei',
      trophy_fast_solve: 'Schnell gelöst',
      trophy_all_games: 'Alle Spiele gespielt',
      trophy_week_streak: 'Sieben Tage Serie',
      trophy_expert_cleared: 'Experte gemeistert'
    },
    en: {
      pp_points: 'PuzzlePure Points',
      pp_best: 'Best Value',
      pp_game_best: 'Game Best',
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
      pp_best: 'En İyi PuzzlePure Değeri',
      pp_game_best: 'Oyun Rekoru',
      pp_daily_best: 'Günün En İyisi',
      pp_new_best: 'Yeni En İyi Sonuç',
      pp_league_label: 'Lig',
      pp_privacy_note: 'Değerlerin yalnızca bu cihazda saklanır.',
      league_bronze: 'Bronz', league_silver: 'Gümüş', league_gold: 'Altın', league_platinum: 'Platin', league_diamond: 'Elmas',
      trophy_first_round: 'İlk Tur',
      trophy_daily_record: 'Günün Rekoru',
      trophy_flawless: 'Hatasız',
      trophy_fast_solve: 'Hızlı Çözüm',
      trophy_all_games: 'Tüm Oyunlar Oynandı',
      trophy_week_streak: 'Yedi Gün Serisi',
      trophy_expert_cleared: 'Uzman Tamamlandı'
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
      platformBest: 0,
      platformBestByDifficulty: {},
      gameBest: null,
      gameBestMode: 'max',
      gameBestByDifficulty: {},
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
    d.platformBest = intOr(o.platformBest, intOr(o.highscore, 0));
    var platformByDifficulty = o.platformBestByDifficulty || o.highscoreByDifficulty;
    if (platformByDifficulty && typeof platformByDifficulty === 'object') {
      for (var k in platformByDifficulty) {
        if (Object.prototype.hasOwnProperty.call(platformByDifficulty, k)) {
          d.platformBestByDifficulty[k] = intOr(platformByDifficulty[k], 0);
        }
      }
    }
    d.gameBestMode = o.gameBestMode === 'min' ? 'min' : 'max';
    if (typeof o.gameBest === 'number' && isFinite(o.gameBest) && o.gameBest >= 0) d.gameBest = o.gameBest;
    if (o.gameBestByDifficulty && typeof o.gameBestByDifficulty === 'object') {
      for (var gd in o.gameBestByDifficulty) {
        if (Object.prototype.hasOwnProperty.call(o.gameBestByDifficulty, gd)) {
          var gv = o.gameBestByDifficulty[gd];
          if (typeof gv === 'number' && isFinite(gv) && gv >= 0) d.gameBestByDifficulty[gd] = gv;
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
    return { version: 2, games: games, processedResultIds: [] };
  }
  function storedNumber(key) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw == null) return null;
      var value = Number(raw);
      return isFinite(value) && value >= 0 ? value : null;
    } catch (e) { return null; }
  }
  function seedLegacyBest(game, score) {
    if (score.gameBest !== null) return;
    var values = [];
    var byDifficulty = {};
    var mode = (game === 'grid9') ? 'min' : 'max';
    var prefixes = {
      drift: 'dailycode:drift:best:', echo: 'dailycode:echo:best:',
      react7: 'dailycode:react7:best:'
    };
    function add(value, difficulty) {
      if (value === null) return;
      values.push(value);
      if (difficulty != null) byDifficulty[String(difficulty)] = value;
    }
    if (prefixes[game]) {
      for (var d = 1; d <= 4; d++) add(storedNumber(prefixes[game] + d), d);
      add(storedNumber(prefixes[game].slice(0, -1)), null);
    } else if (game === 'glyph') {
      ['de', 'en'].forEach(function (lang) {
        for (var gd = 1; gd <= 4; gd++) add(storedNumber('dailycode:glyph:best:' + lang + ':' + gd), gd);
        add(storedNumber('dailycode:glyph:best:' + lang), null);
      });
    } else if (game === 'grid9') {
      ['leicht', 'mittel', 'schwer'].forEach(function (difficulty) {
        add(storedNumber('dailycode:grid9:best:' + difficulty), difficulty);
      });
    } else if (game === 'cluster' || game === 'flow8') {
      add(storedNumber('dailycode:' + game + ':best'), null);
    } else if (game === 'questra') {
      try {
        var rawStats = window.localStorage.getItem('dailycode:questra:stats:v2') || window.localStorage.getItem('dailycode:questra:stats:v1');
        var stats = rawStats ? JSON.parse(rawStats) : null;
        if (stats && stats.byDifficulty) {
          for (var qd = 1; qd <= 4; qd++) add(storedStatBest(stats.byDifficulty[qd]), qd);
        } else add(storedStatBest(stats), 2);
      } catch (e) {}
    }
    if (!values.length) return;
    score.gameBestMode = mode;
    score.gameBestByDifficulty = byDifficulty;
    score.gameBest = mode === 'min' ? Math.min.apply(Math, values) : Math.max.apply(Math, values);
  }
  function storedStatBest(stats) {
    if (!stats || typeof stats.bestScore !== 'number' || !isFinite(stats.bestScore) || stats.bestScore < 0) return null;
    return stats.bestScore;
  }
  function loadScoreStore() {
    if (!hasStorage) return defaultScoreStore();
    try {
      var raw = window.localStorage.getItem(SCORE_KEY) || window.localStorage.getItem(LEGACY_SCORE_KEY);
      var d = defaultScoreStore();
      var o = raw ? JSON.parse(raw) : null;
      if (o && o.games && typeof o.games === 'object') {
        GAMES.forEach(function (g) { d.games[g] = normalizeGameScore(o.games[g]); });
      }
      if (o && Array.isArray(o.processedResultIds)) {
        d.processedResultIds = o.processedResultIds.filter(function (id) { return typeof id === 'string' && id.length <= 160; }).slice(-MAX_RESULT_IDS);
      }
      GAMES.forEach(function (g) { seedLegacyBest(g, d.games[g]); });
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
      var raw = window.localStorage.getItem(PROFILE_KEY) || window.localStorage.getItem(LEGACY_PROFILE_KEY);
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

  function newRoundId(game) {
    var uuid = '';
    try {
      if (root.crypto && typeof root.crypto.randomUUID === 'function') uuid = root.crypto.randomUUID();
    } catch (e) {}
    if (!uuid) uuid = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
    return String(game || 'game') + ':' + uuid;
  }

  function isBetterGameValue(value, previous, mode) {
    if (previous === null) return true;
    return mode === 'min' ? value < previous : value > previous;
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
    var roundId = payload && typeof payload.roundId === 'string' ? payload.roundId.slice(0, 160) : '';
    if (!roundId) {
      return { score: 0, accepted: false, duplicate: false, reason: 'missing_round_id', isNewBest: false, isNewDifficultyBest: false, isNewDailyBest: false, isNewGameBest: false, newTrophies: [], league: 'bronze', previousLeague: 'bronze', streakContinued: false, totalScore: 0 };
    }
    var outcome = payload.outcome === 'loss' ? 'loss' : (payload.outcome === 'complete' ? 'complete' : 'win');
    var today = dateKeyUTC();
    var scoreStore = loadScoreStore();
    var profile = loadProfile();
    var gs = scoreStore.games[game];
    var previousLeague = profile.league;
    var previousStreak = profile.currentStreak;

    if (scoreStore.processedResultIds.indexOf(roundId) !== -1) {
      return {
        score: 0, accepted: false, duplicate: true, reason: 'duplicate_round_id',
        isNewBest: false, isNewDifficultyBest: false, isNewDailyBest: false, isNewGameBest: false,
        newTrophies: [], league: profile.league, previousLeague: profile.league,
        streakContinued: false, totalScore: profile.totalScore,
        highscore: gs.platformBest, platformBest: gs.platformBest, gameBest: gs.gameBest,
        dailyBestScore: gs.dailyBestScore
      };
    }

    var score = outcome === 'loss' ? 0 : computeScore(payload);
    var difficultyKey = [1, 2, 3, 4].indexOf(payload.difficulty) !== -1 ? String(payload.difficulty) : null;

    gs.roundsPlayed += 1;
    var solved = outcome !== 'loss';
    if (solved) gs.roundsSolved += 1;
    if (payload.perfect) gs.perfectRounds += 1;

    var isNewBest = false, isNewDifficultyBest = false, isNewDailyBest = false, isNewGameBest = false;
    if (solved) {
      if (score > gs.platformBest) { gs.platformBest = score; isNewBest = true; }
      if (difficultyKey) {
        var prevDiff = intOr(gs.platformBestByDifficulty[difficultyKey], 0);
        if (score > prevDiff) { gs.platformBestByDifficulty[difficultyKey] = score; isNewDifficultyBest = true; }
      }
      if (typeof payload.rawGameScore === 'number' && isFinite(payload.rawGameScore) && payload.rawGameScore >= 0) {
        var gameMode = payload.gameScoreMode === 'min' ? 'min' : 'max';
        gs.gameBestMode = gameMode;
        if (isBetterGameValue(payload.rawGameScore, gs.gameBest, gameMode)) {
          gs.gameBest = payload.rawGameScore;
          isNewGameBest = true;
        }
        if (difficultyKey) {
          var previousGameDiff = Object.prototype.hasOwnProperty.call(gs.gameBestByDifficulty, difficultyKey) ? gs.gameBestByDifficulty[difficultyKey] : null;
          if (isBetterGameValue(payload.rawGameScore, previousGameDiff, gameMode)) gs.gameBestByDifficulty[difficultyKey] = payload.rawGameScore;
        }
      }
      if (gs.dailyBestDate !== today) { gs.dailyBestDate = today; gs.dailyBestScore = 0; }
      if (score > gs.dailyBestScore) { gs.dailyBestScore = score; isNewDailyBest = true; }
    }
    scoreStore.games[game] = gs;
    scoreStore.processedResultIds.push(roundId);
    if (scoreStore.processedResultIds.length > MAX_RESULT_IDS) scoreStore.processedResultIds = scoreStore.processedResultIds.slice(-MAX_RESULT_IDS);
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
      accepted: true,
      duplicate: false,
      isNewBest: isNewBest,
      isNewDifficultyBest: isNewDifficultyBest,
      isNewDailyBest: isNewDailyBest,
      isNewGameBest: isNewGameBest,
      newTrophies: newTrophies,
      league: profile.league,
      previousLeague: previousLeague,
      streakContinued: streakContinued,
      totalScore: profile.totalScore,
      highscore: gs.platformBest,
      platformBest: gs.platformBest,
      gameBest: gs.gameBest,
      dailyBestScore: gs.dailyBestScore
    };
  }

  function getProfile() { return loadProfile(); }
  function getAllScores() { return loadScoreStore(); }
  function getGameScore(game) { return normalizeGameScore(loadScoreStore().games[game]); }

  function resetProgress() {
    if (!hasStorage) return false;
    try {
      var keep = { 'dailycode:lang': true, 'dailycode:theme': true };
      var remove = [];
      for (var i = 0; i < window.localStorage.length; i++) {
        var key = window.localStorage.key(i);
        if (!key || keep[key]) continue;
        if (key.indexOf('dailycode:') === 0 || key.indexOf('picto:progress:') === 0) remove.push(key);
      }
      remove.forEach(function (key) { window.localStorage.removeItem(key); });
      return true;
    } catch (e) { return false; }
  }

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
    best.textContent = t(lang, 'pp_best') + ': ' + result.platformBest;
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
    newRoundId: newRoundId,
    resetProgress: resetProgress,
    leagueForScore: leagueForScore,
    computeScore: computeScore,
    buildResultBlock: buildResultBlock,
    t: t
  };
})(typeof window !== 'undefined' ? window : this);
