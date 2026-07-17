'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');

function memoryStorage(seed) {
  var data = Object.assign({}, seed || {});
  return {
    get length() { return Object.keys(data).length; },
    key: function (i) { return Object.keys(data)[i] || null; },
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem: function (key, value) { data[key] = String(value); },
    removeItem: function (key) { delete data[key]; }
  };
}

function loadScore(storage) {
  var windowObject = {
    localStorage: storage,
    crypto: { randomUUID: function () { return '00000000-0000-4000-8000-000000000001'; } }
  };
  var context = { window: windowObject, Date: Date, Math: Math, console: console, isFinite: isFinite };
  windowObject.window = windowObject;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'shared/score.js'), 'utf8'), context);
  return windowObject.PuzzlePureScore;
}

function testScoreIdempotencyAndMetrics() {
  var storage = memoryStorage();
  var score = loadScore(storage);
  var first = score.recordResult({
    game: 'drift', roundId: 'drift:test:1', difficulty: 2, outcome: 'complete',
    mistakes: 0, hints: 0, perfect: false, rawGameScore: 12, gameScoreMode: 'max'
  });
  var duplicate = score.recordResult({
    game: 'drift', roundId: 'drift:test:1', difficulty: 2, outcome: 'complete',
    mistakes: 0, hints: 0, perfect: false, rawGameScore: 99, gameScoreMode: 'max'
  });
  assert.strictEqual(first.accepted, true);
  assert.strictEqual(duplicate.duplicate, true);
  assert.strictEqual(score.getProfile().roundsPlayed, 1);
  assert.strictEqual(score.getProfile().totalScore, first.score);
  assert.strictEqual(score.getGameScore('drift').gameBest, 12);

  score.recordResult({
    game: 'grid9', roundId: 'grid9:test:1', difficulty: 2, outcome: 'win',
    timeSeconds: 200, parSeconds: 480, mistakes: 0, hints: 0, perfect: false,
    rawGameScore: 200, gameScoreMode: 'min'
  });
  score.recordResult({
    game: 'grid9', roundId: 'grid9:test:2', difficulty: 2, outcome: 'win',
    timeSeconds: 180, parSeconds: 480, mistakes: 0, hints: 0, perfect: false,
    rawGameScore: 180, gameScoreMode: 'min'
  });
  assert.strictEqual(score.getGameScore('grid9').gameBest, 180);
}

function testLegacyMigration() {
  var legacyScore = { games: { drift: { highscore: 150, roundsPlayed: 2, roundsSolved: 2 } } };
  var legacyProfile = { totalScore: 300, roundsPlayed: 2, roundsSolved: 2, league: 'bronze' };
  var storage = memoryStorage({
    'dailycode:puzzlepure:score:v1': JSON.stringify(legacyScore),
    'dailycode:puzzlepure:profile:v1': JSON.stringify(legacyProfile)
  });
  var score = loadScore(storage);
  assert.strictEqual(score.getGameScore('drift').platformBest, 150);
  assert.strictEqual(score.getProfile().totalScore, 300);
}

function testMissingRoundIdRejected() {
  var score = loadScore(memoryStorage());
  var result = score.recordResult({ game: 'drift', difficulty: 2, outcome: 'complete' });
  assert.strictEqual(result.accepted, false);
  assert.strictEqual(result.reason, 'missing_round_id');
  assert.strictEqual(score.getProfile().roundsPlayed, 0);
}

function testCorruptStorageAndReset() {
  var storage = memoryStorage({
    'dailycode:lang': 'tr',
    'dailycode:theme': 'dark',
    'dailycode:puzzlepure:score:v2': '{broken',
    'dailycode:drift:best:2': '42',
    'picto:progress:daily:test': '{}',
    'unrelated:key': 'keep'
  });
  var score = loadScore(storage);
  assert.strictEqual(score.getProfile().roundsPlayed, 0);
  assert.strictEqual(score.resetProgress(), true);
  assert.strictEqual(storage.getItem('dailycode:lang'), 'tr');
  assert.strictEqual(storage.getItem('dailycode:theme'), 'dark');
  assert.strictEqual(storage.getItem('unrelated:key'), 'keep');
  assert.strictEqual(storage.getItem('dailycode:drift:best:2'), null);
  assert.strictEqual(storage.getItem('picto:progress:daily:test'), null);
}

function listFiles(dir, predicate) {
  var out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var full = path.join(dir, entry.name);
    if (entry.name === '.git' || entry.name === '.venv') return;
    if (entry.isDirectory()) out = out.concat(listFiles(full, predicate));
    else if (predicate(full)) out.push(full);
  });
  return out;
}

function testSyntaxAndJson() {
  listFiles(root, function (file) { return file.endsWith('.js'); }).forEach(function (file) {
    childProcess.execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  });
  listFiles(root, function (file) { return file.endsWith('.json') || file.endsWith('.webmanifest'); }).forEach(function (file) {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  });
}

function testHtmlResourcesAndZoom() {
  listFiles(root, function (file) { return file.endsWith('.html'); }).forEach(function (file) {
    var html = fs.readFileSync(file, 'utf8');
    assert.strictEqual(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(html), false, file + ' deaktiviert Zoom');
    Array.from(html.matchAll(/(?:src|href)="([^"#?]+)"/g)).forEach(function (match) {
      var ref = match[1];
      if (ref.charAt(0) === '/') {
        assert.ok(fs.existsSync(path.join(root, ref.slice(1))), file + ' referenziert fehlende Root Datei ' + ref);
        return;
      }
      if (/^(https?:|mailto:)/.test(ref)) return;
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), ref)), file + ' referenziert fehlende Datei ' + ref);
    });
  });
}

function testScorePayloadsAndWorkerIsolation() {
  var gameFiles = ['code', 'drift', 'cluster', 'echo', 'glyph', 'grid9', 'react7', 'flow8', 'picto', 'questra'];
  gameFiles.forEach(function (game) {
    var source = fs.readFileSync(path.join(root, game, 'game.js'), 'utf8');
    assert.ok(source.indexOf('roundId:') !== -1, game + ' hat keine Rundenkennung');
    assert.ok(source.indexOf('rawGameScore:') !== -1, game + ' meldet keinen echten Spielwert');
  });
  gameFiles.concat(['rankings']).forEach(function (scope) {
    var worker = fs.readFileSync(path.join(root, scope, 'sw.js'), 'utf8');
    assert.strictEqual(worker.indexOf('caches.match(req)'), -1, scope + ' liest cacheübergreifend');
    assert.ok(worker.indexOf('cache.match(req)') !== -1, scope + ' liest nicht aus dem eigenen Cache');
  });
}

function testReleaseConfiguration() {
  var vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  var globalHeaders = vercel.headers.find(function (entry) { return entry.source === '/(.*)'; });
  var names = globalHeaders.headers.map(function (header) { return header.key; });
  ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy'].forEach(function (name) {
    assert.ok(names.indexOf(name) !== -1, 'Sicherheitsheader fehlt: ' + name);
  });
  ['fonts/LICENSE-Inter.txt', 'licenses/LICENSE-LUCIDE.txt', 'worddata/PROVENANCE.md'].forEach(function (file) {
    assert.ok(fs.existsSync(path.join(root, file)), 'Lizenznachweis fehlt: ' + file);
  });
  var portalHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  ['og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'].forEach(function (field) {
    assert.ok(portalHtml.indexOf('"' + field + '"') !== -1, 'Portal SEO Metadatum fehlt: ' + field);
  });
  var portalOgImage = portalHtml.match(/property="og:image" content="https:\/\/www\.puzzlepure\.com([^"]+)"/);
  assert.ok(portalOgImage && fs.existsSync(path.join(root, portalOgImage[1].slice(1))), 'Portal Open Graph Bild fehlt');
}

function testGamePwaMetadataAndOfflineIcons() {
  var games = ['code', 'drift', 'cluster', 'echo', 'glyph', 'grid9', 'react7', 'flow8', 'picto'];
  games.forEach(function (game) {
    var manifest = JSON.parse(fs.readFileSync(path.join(root, game, 'manifest.json'), 'utf8'));
    assert.strictEqual(manifest.lang, 'en', game + ' kennzeichnet englische PWA Metadaten nicht als Englisch');
    manifest.icons.forEach(function (icon) {
      assert.ok(fs.existsSync(path.join(root, game, icon.src)), game + ' Manifest referenziert fehlendes Symbol ' + icon.src);
    });
    var worker = fs.readFileSync(path.join(root, game, 'sw.js'), 'utf8');
    assert.ok(worker.indexOf("'./icon-192.png'") !== -1, game + ' cached das installierte App Symbol nicht offline');
    var assetsBlock = worker.match(/var ASSETS = \[([\s\S]*?)\];/);
    assert.ok(assetsBlock, game + ' Service Worker hat keine App Shell Liste');
    Array.from(assetsBlock[1].matchAll(/'([^']+)'/g)).forEach(function (match) {
      assert.ok(fs.existsSync(path.resolve(root, game, match[1])), game + ' Service Worker referenziert fehlendes Asset ' + match[1]);
    });
    var html = fs.readFileSync(path.join(root, game, 'index.html'), 'utf8');
    ['og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'].forEach(function (field) {
      assert.ok(html.indexOf('"' + field + '"') !== -1, game + ' SEO Metadatum fehlt: ' + field);
    });
    var ogImage = html.match(/property="og:image" content="https:\/\/www\.puzzlepure\.com([^"]+)"/);
    assert.ok(ogImage && fs.existsSync(path.join(root, ogImage[1].slice(1))), game + ' Open Graph Bild fehlt');
  });
}

function testGlyphGuaranteedFallback() {
  var source = fs.readFileSync(path.join(root, 'glyph/game.js'), 'utf8');
  var freqStart = source.indexOf('var FREQ');
  var freqEnd = source.indexOf('/* ---------- Profanitaetsfilter', freqStart);
  var setsStart = source.indexOf('function sortKey');
  var setsEnd = source.indexOf('/* ---------- Spielzustand', setsStart);
  var generatorStart = source.indexOf('/* ---------- Generator', setsEnd);
  var generatorEnd = source.indexOf('/* ---------- Rendering', generatorStart);
  assert.ok(freqStart >= 0 && freqEnd > freqStart && setsStart >= 0 && setsEnd > setsStart && generatorStart >= 0 && generatorEnd > generatorStart);

  var deterministicMath = Object.create(Math);
  deterministicMath.random = function () { return 0; };
  var context = { Math: deterministicMath, Set: Set, console: console };
  vm.createContext(context);
  vm.runInContext(
    'var RACK=8, MIN_WORD=3, MIN_VOWELS=3, wordLang="de", wordSet=null, anagramKeys=null, playableWords=[], block=new Set(), rack=[], freshFlags=[];\n' +
    source.slice(freqStart, freqEnd) + '\n' +
    source.slice(setsStart, setsEnd) + '\n' +
    source.slice(generatorStart, generatorEnd),
    context
  );
  context.buildSets(fs.readFileSync(path.join(root, 'glyph/words-de.txt'), 'utf8'));
  var rack = Array.from(context.generateRack());
  assert.strictEqual(rack.length, 8);
  assert.strictEqual(context.rackHasWord(rack), true, 'Glyph Fallback erzeugt kein spielbares Rack');
  assert.ok(context.vowelCount(rack, 'de') >= 3, 'Glyph Fallback enthält zu wenige Vokale');
}

function testQuizRandomUnlimitedEntry() {
  var source = fs.readFileSync(path.join(root, 'questra', 'game.js'), 'utf8');
  assert.ok(source.indexOf("if (mode === 'unlimited')") !== -1, 'Quiz prüft den unbegrenzten Modus beim Einstieg nicht');
  assert.ok(source.indexOf('unlimitedIndex = nextRandomUnlimitedIndex();') !== -1, 'Quiz startet beim Einstieg keine zufällige Runde');
  assert.ok(source.indexOf('loadRoundForState(true);') !== -1, 'Quiz erzwingt für die zufällige Runde keinen frischen Zustand');
}

testScoreIdempotencyAndMetrics();
testLegacyMigration();
testMissingRoundIdRejected();
testCorruptStorageAndReset();
testSyntaxAndJson();
testHtmlResourcesAndZoom();
testScorePayloadsAndWorkerIsolation();
testReleaseConfiguration();
testGamePwaMetadataAndOfflineIcons();
testGlyphGuaranteedFallback();
testQuizRandomUnlimitedEntry();

console.log('PuzzlePure Plattformprüfungen bestanden');
