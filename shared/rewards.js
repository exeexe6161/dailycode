/* ============================================================
   dailycode  PuzzlePure Rewards  Zentrale Effekt Logik
   Wird unveraendert von allen 10 Spielen und der Rangliste per
   <script src="../shared/rewards.js"> geladen, nach shared/score.js
   und vor dem jeweiligen game.js. Reine Anzeige Effekte, keine
   Spiellogik, keine Netzwerkzugriffe, keine personenbezogenen Daten.
   Nur transform und opacity animiert (siehe shared/rewards.css),
   prefers-reduced-motion wird sowohl hier (Count Up) als auch dort
   (CSS Animationen) beachtet.
   ============================================================ */
'use strict';

(function (root) {
  var I18N = {
    de: {
      toast_new_best: 'Neue Bestleistung',
      toast_daily_best: 'Neuer Tagesbestwert',
      toast_flawless: 'Fehlerfrei geloest',
      toast_fast_solve: 'Schnell geloest',
      toast_streak: 'Serie fortgesetzt',
      toast_trophy: 'Pokal freigeschaltet',
      toast_league_up: 'Neue Liga erreicht'
    },
    en: {
      toast_new_best: 'New Best Result',
      toast_daily_best: 'New Daily Best',
      toast_flawless: 'Flawless Solve',
      toast_fast_solve: 'Fast Solve',
      toast_streak: 'Streak Continued',
      toast_trophy: 'Trophy Unlocked',
      toast_league_up: 'New League Reached'
    },
    tr: {
      toast_new_best: 'Yeni En Iyi Sonuc',
      toast_daily_best: 'Yeni Gunun En Iyisi',
      toast_flawless: 'Hatasiz Cozuldu',
      toast_fast_solve: 'Hizli Cozuldu',
      toast_streak: 'Seri Devam Ediyor',
      toast_trophy: 'Kupa Acildi',
      toast_league_up: 'Yeni Liga Ulasildi'
    }
  };
  function t(lang, key) {
    var table = I18N[lang] || I18N.en;
    var v = table[key];
    if (v === undefined) v = I18N.en[key];
    return v === undefined ? key : v;
  }

  var reducedMotion = false;
  function refreshReducedMotion() {
    try { reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { reducedMotion = false; }
  }
  refreshReducedMotion();
  try {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.addEventListener) mq.addEventListener('change', refreshReducedMotion);
    else if (mq.addListener) mq.addListener(refreshReducedMotion);
  } catch (e) {}

  /* ---------- Toast Warteschlange: maximal einer sichtbar, Rest folgt zeitversetzt ---------- */
  var toastRegion = null;
  function ensureRegion() {
    if (toastRegion && toastRegion.parentNode) return toastRegion;
    toastRegion = document.createElement('div');
    toastRegion.className = 'pp-toast-region';
    toastRegion.setAttribute('role', 'status');
    toastRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastRegion);
    return toastRegion;
  }

  var queue = [];
  var showing = false;
  function processQueue() {
    if (showing || queue.length === 0) return;
    showing = true;
    var text = queue.shift();
    var region = ensureRegion();
    var card = document.createElement('div');
    card.className = 'pp-toast';
    card.textContent = text;
    region.appendChild(card);

    function settle() {
      var displayMs = reducedMotion ? 1300 : 1800;
      window.setTimeout(function () {
        card.classList.remove('pp-toast-in');
        card.classList.add('pp-toast-out');
        var outMs = reducedMotion ? 0 : 220;
        window.setTimeout(function () {
          if (card.parentNode) card.parentNode.removeChild(card);
          showing = false;
          processQueue();
        }, outMs);
      }, displayMs);
    }

    if (reducedMotion) {
      card.classList.add('pp-toast-in');
      settle();
    } else {
      window.requestAnimationFrame(function () {
        card.classList.add('pp-toast-in');
        settle();
      });
    }
  }
  function enqueueToast(text) {
    if (!text) return;
    queue.push(text);
    processQueue();
  }

  /* ---------- Stufe 1: sanftes Einblenden, bei jeder Runde ---------- */
  function reveal(el) {
    if (!el) return;
    el.classList.remove('pp-reveal');
    void el.offsetWidth;
    el.classList.add('pp-reveal');
  }

  /* ---------- Stufe 2/3: dezenter Glow, einmalig ---------- */
  function glow(el) {
    if (!el) return;
    el.classList.remove('pp-glow');
    void el.offsetWidth;
    el.classList.add('pp-glow');
    var handler = function () { el.classList.remove('pp-glow'); el.removeEventListener('animationend', handler); };
    el.addEventListener('animationend', handler);
  }

  function staggerStars(container) {
    if (!container) return;
    container.classList.add('pp-star-stagger');
  }

  function pulseTrophy(el) {
    if (!el) return;
    el.classList.remove('pp-trophy-pulse');
    void el.offsetWidth;
    el.classList.add('pp-trophy-pulse');
    var handler = function () { el.classList.remove('pp-trophy-pulse'); el.removeEventListener('animationend', handler); };
    el.addEventListener('animationend', handler);
  }

  function pulseBar(el) {
    if (!el) return;
    el.classList.remove('pp-bar-pulse');
    void el.offsetWidth;
    el.classList.add('pp-bar-pulse');
    var handler = function () { el.classList.remove('pp-bar-pulse'); el.removeEventListener('animationend', handler); };
    el.addEventListener('animationend', handler);
  }

  /* ---------- Punkte Count Up: reines Textnode Update per rAF, kein CSS Animation moeglich ---------- */
  function animateScoreLine(lineEl) {
    if (!lineEl) return;
    var text = lineEl.textContent || '';
    var m = text.match(/^(.*?)(\d+)(\D*)$/);
    if (!m) return;
    var prefix = m[1], target = parseInt(m[2], 10), suffix = m[3];
    if (!isFinite(target)) return;
    if (reducedMotion) { lineEl.textContent = prefix + target + suffix; return; }

    var duration = 650;
    var startTime = null;
    function step(ts) {
      if (startTime === null) startTime = ts;
      var p = Math.min(1, (ts - startTime) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      var current = Math.round(target * eased);
      lineEl.textContent = prefix + current + suffix;
      if (p < 1) window.requestAnimationFrame(step);
      else lineEl.textContent = prefix + target + suffix;
    }
    window.requestAnimationFrame(step);
  }

  /* ---------- Haupteinstieg: von jedem Spiel direkt nach PuzzlePureScore.recordResult() aufgerufen ----------
     opts: { ppResult, payload, lang, cardEl, starsEl, scoreLineEl }
     ppResult: Rueckgabewert von recordResult()
     payload:  dasselbe Objekt, das an recordResult() uebergeben wurde (fuer perfect/timeSeconds/parSeconds)
     cardEl:   das Ergebnis Element, das sanft eingeblendet und bei wichtigen Ereignissen dezent geglowt wird
     starsEl:  optional, Container der Sternanzeige (nur Pixela/Questra)
     scoreLineEl: optional, das Element mit dem Punktestext fuer den Count Up */
  function trigger(opts) {
    opts = opts || {};
    var ppResult = opts.ppResult, payload = opts.payload || {}, lang = opts.lang || 'de';
    refreshReducedMotion();

    reveal(opts.cardEl);
    if (opts.scoreLineEl) animateScoreLine(opts.scoreLineEl);
    if (!ppResult) return;

    var events = [];
    if (ppResult.isNewBest || ppResult.isNewDifficultyBest) events.push('new_best');
    else if (ppResult.isNewDailyBest) events.push('daily_best');

    if (payload.perfect) events.push('flawless');

    if (typeof payload.parSeconds === 'number' && payload.parSeconds > 0 && typeof payload.timeSeconds === 'number') {
      var frac = (payload.parSeconds - payload.timeSeconds) / payload.parSeconds;
      if (frac >= 0.5) events.push('fast_solve');
    }

    if (ppResult.streakContinued) events.push('streak');

    var hasTrophy = ppResult.newTrophies && ppResult.newTrophies.length > 0;
    var hasLeagueUp = !!(ppResult.previousLeague && ppResult.league && ppResult.previousLeague !== ppResult.league);

    if (events.length === 0 && !hasTrophy && !hasLeagueUp) return;

    glow(opts.cardEl);
    if (opts.starsEl) staggerStars(opts.starsEl);

    events.forEach(function (key) { enqueueToast(t(lang, 'toast_' + key)); });

    if (hasTrophy) {
      ppResult.newTrophies.forEach(function (trophyKey) {
        var name = (root.PuzzlePureScore && typeof root.PuzzlePureScore.t === 'function') ? root.PuzzlePureScore.t(lang, 'trophy_' + trophyKey) : trophyKey;
        enqueueToast(t(lang, 'toast_trophy') + ': ' + name);
      });
    }

    if (hasLeagueUp) {
      var leagueName = (root.PuzzlePureScore && typeof root.PuzzlePureScore.t === 'function') ? root.PuzzlePureScore.t(lang, 'league_' + ppResult.league) : ppResult.league;
      enqueueToast(t(lang, 'toast_league_up') + ': ' + leagueName);
    }
  }

  root.PuzzlePureRewards = {
    trigger: trigger,
    reveal: reveal,
    glow: glow,
    staggerStars: staggerStars,
    pulseTrophy: pulseTrophy,
    pulseBar: pulseBar,
    animateScoreLine: animateScoreLine
  };
})(typeof window !== 'undefined' ? window : this);
