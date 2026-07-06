/* ============================================================
   dailycode  Questra  Taegliches Denkraetsel Quiz
   Sieben kurze, neutrale Fragen pro Runde, vier Antworten, genau eine
   richtig. Eigene Fragenbank (Logik, Zahlenmuster, Wortverstaendnis,
   Formen und Farben, Alltagswissen, Mini Rechnen, neutrale Denkfragen),
   selbst verfasst, keine fremden Quellen. Tagesrunde deterministisch aus
   Datum, Unbegrenzt Modus deterministisch aus Raetselnummer, beide ueber
   denselben Fragenindex, damit ein Sprachwechsel mitten in der Runde die
   gleichen Fragen nur in anderer Sprache zeigt.

   Dieses Projekt hat keinen Build Schritt, alle Spiele sind ein
   einzelnes game.js als IIFE ohne Modul System (gleiche Konvention wie
   die anderen neun Spiele). Vanilla JS, keine Libraries, keine externen
   Ressourcen, keine data-URI. Strikte CSP konform: keine Inline-Styles,
   Theme ueber data-Attribut.
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
      subtitle: 'Beantworte sieben kurze Fragen und sieh, wie ruhig und klar du denkst.',
      level: function (n) { return ['Leicht', 'Mittel', 'Schwer', 'Experte'][n - 1] || 'Mittel'; },
      aria_difficulty_group: 'Schwierigkeit',
      aria_difficulty: function (n) { return t('level')(n) + ' wählen'; },
      result_difficulty: function (n) { return 'Schwierigkeit: ' + t('level')(n); },
      solved: 'Gelöst',
      unsolved: 'noch nicht gelöst',
      theme_group: 'Darstellung',
      theme_auto: 'Auto',
      theme_light: 'Hell',
      theme_dark: 'Dunkel',
      aria_lang_group: 'Sprache',
      nav_privacy: 'Datenschutz',
      nav_imprint: 'Impressum',
      home: 'Startseite',
      home_aria: 'Zur Startseite',
      rankings: 'Rangliste',
      rankings_aria: 'Zur Rangliste',
      help_summary: 'So funktioniert es',
      help_1: 'Jede Runde hat sieben Fragen mit je vier Antworten. Genau eine Antwort ist richtig.',
      help_2: 'Tippe eine Antwort an, du siehst sofort ob sie richtig war, und bestätigst mit Weiter.',
      help_3: 'Am Ende zeigt Questra deine Punktzahl, deine Zeit und eine ruhige Bewertung. Wechsle zwischen Tagesrätsel und Unbegrenzt für weitere Runden.',
      mode_daily: 'Tagesrätsel',
      mode_unlimited: 'Unbegrenzt',
      aria_mode_daily: 'Tagesrätsel wählen',
      aria_mode_unlimited: 'Unbegrenzten Modus wählen',
      round_number: function (n) { return 'Runde Nr. ' + n; },
      aria_prev_round: 'Vorige Runde anzeigen',
      aria_next_round: 'Nächste Runde anzeigen',
      aria_random_round: 'Zufällige Runde anzeigen',
      question_progress: function (n) { return 'Frage ' + n + ' von 7'; },
      feedback_correct: 'Richtig',
      feedback_wrong: 'Nicht richtig',
      reveal_correct: function (text) { return 'Richtige Antwort: ' + text; },
      btn_next: 'Weiter',
      btn_new_round: 'Neue Runde',
      result_heading: 'Runde beendet',
      result_text: function (score, time) { return 'Du hast ' + score + ' von 7 Fragen richtig beantwortet, in ' + time + '.'; },
      stars_result: function (n) { return n + ' von 3 Sternen'; },
      stats_title: 'Statistik',
      stat_solved_cap: 'Gelöst',
      stat_current_cap: 'Serie',
      stat_best_cap: 'Beste Serie',
      stat_bestscore_cap: 'Bestwert',
      stats_hint: 'Statistik nicht verfügbar, lokaler Speicher ist aus.',
      aria_option: function (n, text) { return 'Antwort ' + n + ', ' + text; },
      aria_quiz: 'Quiz Bereich. Waehle eine der vier Antworten, danach zeigt ein Text ob sie richtig war.'
    },
    en: {
      subtitle: 'Answer seven short questions and see how calm and clear your thinking is.',
      level: function (n) { return ['Easy', 'Medium', 'Hard', 'Expert'][n - 1] || 'Medium'; },
      aria_difficulty_group: 'Difficulty',
      aria_difficulty: function (n) { return 'Select ' + t('level')(n); },
      result_difficulty: function (n) { return 'Difficulty: ' + t('level')(n); },
      solved: 'Solved',
      unsolved: 'not solved yet',
      theme_group: 'Appearance',
      theme_auto: 'Auto',
      theme_light: 'Light',
      theme_dark: 'Dark',
      aria_lang_group: 'Language',
      nav_privacy: 'Privacy',
      nav_imprint: 'Imprint',
      home: 'Home',
      home_aria: 'Go to home',
      rankings: 'Rankings',
      rankings_aria: 'To the rankings',
      help_summary: 'How it works',
      help_1: 'Each round has seven questions with four answers each. Exactly one answer is correct.',
      help_2: 'Tap an answer, you see right away if it was correct, then confirm with Next.',
      help_3: 'At the end Questra shows your score, your time and a calm rating. Switch between daily puzzle and unlimited for more rounds.',
      mode_daily: 'Daily puzzle',
      mode_unlimited: 'Unlimited',
      aria_mode_daily: 'Choose daily puzzle',
      aria_mode_unlimited: 'Choose unlimited mode',
      round_number: function (n) { return 'Round number ' + n; },
      aria_prev_round: 'Show previous round',
      aria_next_round: 'Show next round',
      aria_random_round: 'Show a random round',
      question_progress: function (n) { return 'Question ' + n + ' of 7'; },
      feedback_correct: 'Correct',
      feedback_wrong: 'Not correct',
      reveal_correct: function (text) { return 'Correct answer: ' + text; },
      btn_next: 'Next',
      btn_new_round: 'New round',
      result_heading: 'Round complete',
      result_text: function (score, time) { return 'You answered ' + score + ' of 7 questions correctly, in ' + time + '.'; },
      stars_result: function (n) { return n + ' out of 3 stars'; },
      stats_title: 'Statistics',
      stat_solved_cap: 'Solved',
      stat_current_cap: 'Streak',
      stat_best_cap: 'Best streak',
      stat_bestscore_cap: 'Best score',
      stats_hint: 'Statistics unavailable, local storage is off.',
      aria_option: function (n, text) { return 'Answer ' + n + ', ' + text; },
      aria_quiz: 'Quiz area. Choose one of the four answers, then a text shows whether it was correct.'
    },
    tr: {
      subtitle: 'Yedi kısa soruyu yanıtla ve ne kadar sakin ve net düşündüğünü gör.',
      level: function (n) { return ['Kolay', 'Orta', 'Zor', 'Uzman'][n - 1] || 'Orta'; },
      aria_difficulty_group: 'Zorluk',
      aria_difficulty: function (n) { return t('level')(n) + ' seç'; },
      result_difficulty: function (n) { return 'Zorluk: ' + t('level')(n); },
      solved: 'Çözüldü',
      unsolved: 'henüz çözülmedi',
      theme_group: 'Görünüm',
      theme_auto: 'Otomatik',
      theme_light: 'Açık',
      theme_dark: 'Koyu',
      aria_lang_group: 'Dil',
      nav_privacy: 'Gizlilik',
      nav_imprint: 'Künye',
      home: 'Ana sayfa',
      home_aria: 'Ana sayfaya git',
      rankings: 'Sıralama',
      rankings_aria: 'Sıralamaya git',
      help_summary: 'Nasıl çalışır',
      help_1: 'Her turda dört seçenekli yedi soru vardır. Tam olarak bir cevap doğrudur.',
      help_2: 'Bir cevaba dokun, hemen doğru olup olmadığını gör, sonra İleri ile onayla.',
      help_3: 'Sonunda Questra puanını, süreni ve sakin bir değerlendirme gösterir. Daha fazla tur için günlük bulmaca ile sınırsız mod arasında geçiş yap.',
      mode_daily: 'Günlük bulmaca',
      mode_unlimited: 'Sınırsız',
      aria_mode_daily: 'Günlük bulmacayı seç',
      aria_mode_unlimited: 'Sınırsız modu seç',
      round_number: function (n) { return 'Tur numarası ' + n; },
      aria_prev_round: 'Önceki turu göster',
      aria_next_round: 'Sonraki turu göster',
      aria_random_round: 'Rastgele bir tur göster',
      question_progress: function (n) { return '7 sorudan ' + n + '. soru'; },
      feedback_correct: 'Doğru',
      feedback_wrong: 'Doğru değil',
      reveal_correct: function (text) { return 'Doğru cevap: ' + text; },
      btn_next: 'İleri',
      btn_new_round: 'Yeni tur',
      result_heading: 'Tur tamamlandı',
      result_text: function (score, time) { return '7 sorudan ' + score + ' tanesini doğru yanıtladın, süre ' + time + '.'; },
      stars_result: function (n) { return '3 üzerinden ' + n + ' yıldız'; },
      stats_title: 'İstatistik',
      stat_solved_cap: 'Çözülen',
      stat_current_cap: 'Seri',
      stat_best_cap: 'En iyi seri',
      stat_bestscore_cap: 'En iyi puan',
      stats_hint: 'İstatistik kullanılamıyor, yerel depolama kapalı.',
      aria_option: function (n, text) { return 'Cevap ' + n + ', ' + text; },
      aria_quiz: 'Quiz alanı. Dört cevaptan birini seç, ardından bir metin doğru olup olmadığını gösterir.'
    }
  };
  function t(key) {
    var table = I18N[lang] || I18N.en;
    var v = table[key];
    if (v === undefined) v = I18N.en[key];
    return v === undefined ? key : v;
  }

  /* ============================================================
     Fragenbank: sieben Kategorien, je sechs Fragen, selbst verfasst,
     keine fremden Quellen, keine Marken, keine Personen, keine
     riskanten Spezialfakten. DE/EN/TR sind Index fuer Index dieselbe
     Frage, nur uebersetzt, damit ein Sprachwechsel mitten in der Runde
     dieselbe Frage in anderer Sprache zeigt.
     ============================================================ */
  var POOL = {
    de: [
      { q: 'Alle Fische leben im Wasser. Ein Karpfen ist ein Fisch. Was folgt daraus?', o: ['Ein Karpfen lebt im Wasser', 'Ein Karpfen lebt an Land', 'Ein Karpfen ist kein Tier', 'Alle Tiere leben im Wasser'], c: 0 },
      { q: 'Wenn es regnet, wird die Straße nass. Die Straße ist nass. Was folgt sicher daraus?', o: ['Es hat sicher geregnet', 'Es könnte geregnet haben', 'Es regnet gerade', 'Es wird nie wieder regnen'], c: 1 },
      { q: 'Drei Freunde sitzen nebeneinander. Anna sitzt links von Ben. Ben sitzt links von Cem. Wer sitzt in der Mitte?', o: ['Anna', 'Ben', 'Cem', 'Keiner von ihnen'], c: 1 },
      { q: 'Wenn A größer ist als B, und B größer ist als C, welche Aussage stimmt sicher?', o: ['A ist größer als C', 'C ist größer als A', 'A ist gleich C', 'B ist am größten'], c: 0 },
      { q: 'In einer Reihe stehen nur rote und blaue Kugeln. Es gibt keine blauen Kugeln. Was folgt daraus?', o: ['Alle Kugeln sind rot', 'Alle Kugeln sind blau', 'Es gibt keine Kugeln', 'Die Hälfte ist rot'], c: 0 },
      { q: 'Jeder Kreis in der Box ist grün. Ein Objekt in der Box ist nicht grün. Was folgt daraus?', o: ['Das Objekt ist kein Kreis', 'Das Objekt ist ein Kreis', 'Die Box ist leer', 'Alle Objekte sind grün'], c: 0 },

      { q: 'Welche Zahl setzt die Reihe fort? 2, 4, 6, 8, ?', o: ['9', '10', '12', '16'], c: 1 },
      { q: 'Welche Zahl setzt die Reihe fort? 1, 2, 4, 8, ?', o: ['12', '14', '16', '10'], c: 2 },
      { q: 'Welche Zahl setzt die Reihe fort? 3, 6, 9, 12, ?', o: ['14', '15', '16', '18'], c: 1 },
      { q: 'Welche Zahl setzt die Reihe fort? 1, 4, 9, 16, ?', o: ['20', '24', '25', '30'], c: 2 },
      { q: 'Welche Zahl setzt die Reihe fort? 20, 17, 14, 11, ?', o: ['9', '8', '7', '6'], c: 1 },
      { q: 'Welche Zahl setzt die Reihe fort? 1, 1, 2, 3, 5, ?', o: ['6', '7', '8', '9'], c: 2 },

      { q: 'Welches Wort ist das Gegenteil von groß?', o: ['Klein', 'Schwer', 'Schnell', 'Hoch'], c: 0 },
      { q: 'Welches Wort ist das Gegenteil von hell?', o: ['Laut', 'Dunkel', 'Leise', 'Warm'], c: 1 },
      { q: 'Welches Wort ist das Gegenteil von schnell?', o: ['Stark', 'Langsam', 'Leicht', 'Kalt'], c: 1 },
      { q: 'Welches Wort ist das Gegenteil von voll?', o: ['Leer', 'Schwer', 'Neu', 'Nass'], c: 0 },
      { q: 'Welches Wort ist das Gegenteil von alt?', o: ['Neu', 'Klein', 'Kalt', 'Weich'], c: 0 },
      { q: 'Welches Wort ist das Gegenteil von offen?', o: ['Geschlossen', 'Rund', 'Weit', 'Kurz'], c: 0 },

      { q: 'Welche Form hat vier gleich lange Seiten und vier rechte Winkel?', o: ['Kreis', 'Dreieck', 'Quadrat', 'Raute'], c: 2 },
      { q: 'Welche Farbe entsteht, wenn man Blau und Gelb mischt?', o: ['Grün', 'Orange', 'Violett', 'Braun'], c: 0 },
      { q: 'Welche Form hat keine Ecken?', o: ['Dreieck', 'Quadrat', 'Kreis', 'Rechteck'], c: 2 },
      { q: 'Welche Farbe entsteht, wenn man Rot und Weiß mischt?', o: ['Rosa', 'Lila', 'Orange', 'Grau'], c: 0 },
      { q: 'Wie viele Seiten hat ein Dreieck?', o: ['Zwei', 'Drei', 'Vier', 'Fünf'], c: 1 },
      { q: 'Welche Form hat drei Ecken?', o: ['Quadrat', 'Kreis', 'Dreieck', 'Sechseck'], c: 2 },

      { q: 'Wie viele Tage hat eine normale Woche?', o: ['Fünf', 'Sechs', 'Sieben', 'Acht'], c: 2 },
      { q: 'Welche Jahreszeit kommt nach dem Winter?', o: ['Sommer', 'Frühling', 'Herbst', 'Es gibt keine feste Reihenfolge'], c: 1 },
      { q: 'Wie viele Monate hat ein Jahr?', o: ['Zehn', 'Elf', 'Zwölf', 'Dreizehn'], c: 2 },
      { q: 'Was braucht eine Pflanze zum Wachsen unbedingt?', o: ['Musik', 'Licht und Wasser', 'Süßigkeiten', 'Metall'], c: 1 },
      { q: 'Wie viele Stunden hat ein Tag?', o: ['Zwölf', 'Achtzehn', 'Vierundzwanzig', 'Dreißig'], c: 2 },
      { q: 'Welches Tier ist bekannt dafür, im Winter Winterschlaf zu halten?', o: ['Der Igel', 'Der Fisch', 'Die Ameise', 'Der Adler'], c: 0 },

      { q: 'Wie viel ist 7 plus 5?', o: ['11', '12', '13', '14'], c: 1 },
      { q: 'Wie viel ist 9 minus 4?', o: ['4', '5', '6', '3'], c: 1 },
      { q: 'Wie viel ist 6 mal 3?', o: ['16', '18', '21', '24'], c: 1 },
      { q: 'Wie viel ist 20 geteilt durch 4?', o: ['4', '5', '6', '8'], c: 1 },
      { q: 'Welche Rechnung ergibt denselben Wert wie 10 plus 5?', o: ['3 mal 5', '20 minus 6', '9 plus 4', '32 geteilt durch 2'], c: 0 },
      { q: 'Wie viel ist die Hälfte von 18?', o: ['8', '9', '10', '6'], c: 1 },

      { q: 'Wenn heute Montag ist, welcher Tag ist übermorgen?', o: ['Dienstag', 'Mittwoch', 'Donnerstag', 'Sonntag'], c: 1 },
      { q: 'Ein Behälter ist halb voll. Was ist gleichzeitig wahr?', o: ['Er ist auch halb leer', 'Er ist ganz voll', 'Er ist ganz leer', 'Er ist kaputt'], c: 0 },
      { q: 'Zwei Wege führen zum selben Ziel. Weg A ist kürzer als Weg B. Welcher Weg braucht normalerweise weniger Zeit?', o: ['Weg A', 'Weg B', 'Beide gleich', 'Das hängt nicht von der Länge ab'], c: 0 },
      { q: 'Eine Waage zeigt auf beiden Seiten das gleiche Gewicht. Was bedeutet das?', o: ['Beide Seiten sind gleich schwer', 'Die Waage ist kaputt', 'Eine Seite ist leer', 'Es gibt kein Ergebnis'], c: 0 },
      { q: 'Wenn man drei gleich große Teile aus einem Ganzen macht, wie nennt man jedes Teil?', o: ['Ein Viertel', 'Ein Drittel', 'Eine Hälfte', 'Ein Fünftel'], c: 1 },
      { q: 'Ein Ereignis passiert erst nach einem anderen Ereignis. Welches Ereignis war zuerst?', o: ['Das spätere Ereignis', 'Das frühere Ereignis', 'Beide gleichzeitig', 'Das hängt vom Zufall ab'], c: 1 }
    ],
    en: [
      { q: 'All fish live in water. A carp is a fish. What follows from this?', o: ['A carp lives in water', 'A carp lives on land', 'A carp is not an animal', 'All animals live in water'], c: 0 },
      { q: 'If it rains, the street gets wet. The street is wet. What follows for sure?', o: ['It definitely rained', 'It could have rained', 'It is raining right now', 'It will never rain again'], c: 1 },
      { q: 'Three friends sit next to each other. Anna sits to the left of Ben. Ben sits to the left of Cem. Who sits in the middle?', o: ['Anna', 'Ben', 'Cem', 'None of them'], c: 1 },
      { q: 'If A is bigger than B, and B is bigger than C, which statement is certainly true?', o: ['A is bigger than C', 'C is bigger than A', 'A equals C', 'B is the biggest'], c: 0 },
      { q: 'A row contains only red and blue balls. There are no blue balls. What follows from this?', o: ['All balls are red', 'All balls are blue', 'There are no balls', 'Half are red'], c: 0 },
      { q: 'Every circle in the box is green. An object in the box is not green. What follows from this?', o: ['The object is not a circle', 'The object is a circle', 'The box is empty', 'All objects are green'], c: 0 },

      { q: 'Which number continues the sequence? 2, 4, 6, 8, ?', o: ['9', '10', '12', '16'], c: 1 },
      { q: 'Which number continues the sequence? 1, 2, 4, 8, ?', o: ['12', '14', '16', '10'], c: 2 },
      { q: 'Which number continues the sequence? 3, 6, 9, 12, ?', o: ['14', '15', '16', '18'], c: 1 },
      { q: 'Which number continues the sequence? 1, 4, 9, 16, ?', o: ['20', '24', '25', '30'], c: 2 },
      { q: 'Which number continues the sequence? 20, 17, 14, 11, ?', o: ['9', '8', '7', '6'], c: 1 },
      { q: 'Which number continues the sequence? 1, 1, 2, 3, 5, ?', o: ['6', '7', '8', '9'], c: 2 },

      { q: 'Which word is the opposite of big?', o: ['Small', 'Heavy', 'Fast', 'Tall'], c: 0 },
      { q: 'Which word is the opposite of bright?', o: ['Loud', 'Dark', 'Quiet', 'Warm'], c: 1 },
      { q: 'Which word is the opposite of fast?', o: ['Strong', 'Slow', 'Light', 'Cold'], c: 1 },
      { q: 'Which word is the opposite of full?', o: ['Empty', 'Heavy', 'New', 'Wet'], c: 0 },
      { q: 'Which word is the opposite of old?', o: ['New', 'Small', 'Cold', 'Soft'], c: 0 },
      { q: 'Which word is the opposite of open?', o: ['Closed', 'Round', 'Wide', 'Short'], c: 0 },

      { q: 'Which shape has four equally long sides and four right angles?', o: ['Circle', 'Triangle', 'Square', 'Rhombus'], c: 2 },
      { q: 'Which color results from mixing blue and yellow?', o: ['Green', 'Orange', 'Purple', 'Brown'], c: 0 },
      { q: 'Which shape has no corners?', o: ['Triangle', 'Square', 'Circle', 'Rectangle'], c: 2 },
      { q: 'Which color results from mixing red and white?', o: ['Pink', 'Purple', 'Orange', 'Gray'], c: 0 },
      { q: 'How many sides does a triangle have?', o: ['Two', 'Three', 'Four', 'Five'], c: 1 },
      { q: 'Which shape has three corners?', o: ['Square', 'Circle', 'Triangle', 'Hexagon'], c: 2 },

      { q: 'How many days does a normal week have?', o: ['Five', 'Six', 'Seven', 'Eight'], c: 2 },
      { q: 'Which season comes after winter?', o: ['Summer', 'Spring', 'Autumn', 'There is no fixed order'], c: 1 },
      { q: 'How many months does a year have?', o: ['Ten', 'Eleven', 'Twelve', 'Thirteen'], c: 2 },
      { q: 'What does a plant absolutely need to grow?', o: ['Music', 'Light and water', 'Sweets', 'Metal'], c: 1 },
      { q: 'How many hours does a day have?', o: ['Twelve', 'Eighteen', 'Twenty four', 'Thirty'], c: 2 },
      { q: 'Which animal is known for hibernating in winter?', o: ['The hedgehog', 'The fish', 'The ant', 'The eagle'], c: 0 },

      { q: 'What is 7 plus 5?', o: ['11', '12', '13', '14'], c: 1 },
      { q: 'What is 9 minus 4?', o: ['4', '5', '6', '3'], c: 1 },
      { q: 'What is 6 times 3?', o: ['16', '18', '21', '24'], c: 1 },
      { q: 'What is 20 divided by 4?', o: ['4', '5', '6', '8'], c: 1 },
      { q: 'Which calculation gives the same value as 10 plus 5?', o: ['3 times 5', '20 minus 6', '9 plus 4', '32 divided by 2'], c: 0 },
      { q: 'What is half of 18?', o: ['8', '9', '10', '6'], c: 1 },

      { q: 'If today is Monday, what day is the day after tomorrow?', o: ['Tuesday', 'Wednesday', 'Thursday', 'Sunday'], c: 1 },
      { q: 'A container is half full. What is also true at the same time?', o: ['It is also half empty', 'It is completely full', 'It is completely empty', 'It is broken'], c: 0 },
      { q: 'Two paths lead to the same destination. Path A is shorter than path B. Which path usually takes less time?', o: ['Path A', 'Path B', 'Both the same', 'This does not depend on length'], c: 0 },
      { q: 'A scale shows the same weight on both sides. What does that mean?', o: ['Both sides weigh the same', 'The scale is broken', 'One side is empty', 'There is no result'], c: 0 },
      { q: 'If you make three equally sized parts from a whole, what is each part called?', o: ['A quarter', 'A third', 'A half', 'A fifth'], c: 1 },
      { q: 'One event happens only after another event. Which event was first?', o: ['The later event', 'The earlier event', 'Both at the same time', 'This depends on chance'], c: 1 }
    ],
    tr: [
      { q: 'Tüm balıklar suda yaşar. Sazan bir balıktır. Buradan ne çıkar?', o: ['Sazan suda yaşar', 'Sazan karada yaşar', 'Sazan bir hayvan değildir', 'Tüm hayvanlar suda yaşar'], c: 0 },
      { q: 'Yağmur yağarsa sokak ıslanır. Sokak ıslak. Kesin olarak ne çıkar?', o: ['Kesinlikle yağmur yağdı', 'Yağmur yağmış olabilir', 'Şu anda yağmur yağıyor', 'Bir daha asla yağmur yağmayacak'], c: 1 },
      { q: 'Üç arkadaş yan yana oturuyor. Anna, Ben in solunda oturuyor. Ben, Cem in solunda oturuyor. Ortada kim oturuyor?', o: ['Anna', 'Ben', 'Cem', 'Hiçbiri'], c: 1 },
      { q: 'A, B den büyükse ve B, C den büyükse, hangi ifade kesin doğrudur?', o: ['A, C den büyüktür', 'C, A den büyüktür', 'A, C ye eşittir', 'B en büyüğüdür'], c: 0 },
      { q: 'Bir sırada yalnızca kırmızı ve mavi toplar var. Mavi top yok. Buradan ne çıkar?', o: ['Tüm toplar kırmızı', 'Tüm toplar mavi', 'Hiç top yok', 'Yarısı kırmızı'], c: 0 },
      { q: 'Kutudaki her daire yeşildir. Kutudaki bir nesne yeşil değildir. Buradan ne çıkar?', o: ['Nesne bir daire değildir', 'Nesne bir dairedir', 'Kutu boştur', 'Tüm nesneler yeşildir'], c: 0 },

      { q: 'Diziyi hangi sayı tamamlar? 2, 4, 6, 8, ?', o: ['9', '10', '12', '16'], c: 1 },
      { q: 'Diziyi hangi sayı tamamlar? 1, 2, 4, 8, ?', o: ['12', '14', '16', '10'], c: 2 },
      { q: 'Diziyi hangi sayı tamamlar? 3, 6, 9, 12, ?', o: ['14', '15', '16', '18'], c: 1 },
      { q: 'Diziyi hangi sayı tamamlar? 1, 4, 9, 16, ?', o: ['20', '24', '25', '30'], c: 2 },
      { q: 'Diziyi hangi sayı tamamlar? 20, 17, 14, 11, ?', o: ['9', '8', '7', '6'], c: 1 },
      { q: 'Diziyi hangi sayı tamamlar? 1, 1, 2, 3, 5, ?', o: ['6', '7', '8', '9'], c: 2 },

      { q: 'Büyük kelimesinin zıttı hangisidir?', o: ['Küçük', 'Ağır', 'Hızlı', 'Yüksek'], c: 0 },
      { q: 'Aydınlık kelimesinin zıttı hangisidir?', o: ['Gürültülü', 'Karanlık', 'Sessiz', 'Sıcak'], c: 1 },
      { q: 'Hızlı kelimesinin zıttı hangisidir?', o: ['Güçlü', 'Yavaş', 'Hafif', 'Soğuk'], c: 1 },
      { q: 'Dolu kelimesinin zıttı hangisidir?', o: ['Boş', 'Ağır', 'Yeni', 'Islak'], c: 0 },
      { q: 'Eski kelimesinin zıttı hangisidir?', o: ['Yeni', 'Küçük', 'Soğuk', 'Yumuşak'], c: 0 },
      { q: 'Açık kelimesinin zıttı hangisidir?', o: ['Kapalı', 'Yuvarlak', 'Geniş', 'Kısa'], c: 0 },

      { q: 'Hangi şeklin dört eşit uzunlukta kenarı ve dört dik açısı vardır?', o: ['Daire', 'Üçgen', 'Kare', 'Eşkenar dörtgen'], c: 2 },
      { q: 'Mavi ve sarı karıştırılınca hangi renk oluşur?', o: ['Yeşil', 'Turuncu', 'Mor', 'Kahverengi'], c: 0 },
      { q: 'Hangi şeklin köşesi yoktur?', o: ['Üçgen', 'Kare', 'Daire', 'Dikdörtgen'], c: 2 },
      { q: 'Kırmızı ve beyaz karıştırılınca hangi renk oluşur?', o: ['Pembe', 'Mor', 'Turuncu', 'Gri'], c: 0 },
      { q: 'Bir üçgenin kaç kenarı vardır?', o: ['İki', 'Üç', 'Dört', 'Beş'], c: 1 },
      { q: 'Hangi şeklin üç köşesi vardır?', o: ['Kare', 'Daire', 'Üçgen', 'Altıgen'], c: 2 },

      { q: 'Normal bir haftanın kaç günü vardır?', o: ['Beş', 'Altı', 'Yedi', 'Sekiz'], c: 2 },
      { q: 'Kıştan sonra hangi mevsim gelir?', o: ['Yaz', 'İlkbahar', 'Sonbahar', 'Sabit bir sıra yoktur'], c: 1 },
      { q: 'Bir yılın kaç ayı vardır?', o: ['On', 'On bir', 'On iki', 'On üç'], c: 2 },
      { q: 'Bir bitkinin büyümek için kesinlikle neye ihtiyacı vardır?', o: ['Müzik', 'Işık ve su', 'Şeker', 'Metal'], c: 1 },
      { q: 'Bir günün kaç saati vardır?', o: ['On iki', 'On sekiz', 'Yirmi dört', 'Otuz'], c: 2 },
      { q: 'Kışın kış uykusuna yatmasıyla bilinen hayvan hangisidir?', o: ['Kirpi', 'Balık', 'Karınca', 'Kartal'], c: 0 },

      { q: '7 artı 5 kaç eder?', o: ['11', '12', '13', '14'], c: 1 },
      { q: '9 eksi 4 kaç eder?', o: ['4', '5', '6', '3'], c: 1 },
      { q: '6 çarpı 3 kaç eder?', o: ['16', '18', '21', '24'], c: 1 },
      { q: '20 bölü 4 kaç eder?', o: ['4', '5', '6', '8'], c: 1 },
      { q: 'Hangi işlem 10 artı 5 ile aynı değeri verir?', o: ['3 çarpı 5', '20 eksi 6', '9 artı 4', '32 bölü 2'], c: 0 },
      { q: '18 in yarısı kaçtır?', o: ['8', '9', '10', '6'], c: 1 },

      { q: 'Bugün pazartesiyse, öbür gün hangi gündür?', o: ['Salı', 'Çarşamba', 'Perşembe', 'Pazar'], c: 1 },
      { q: 'Bir kap yarı doludur. Aynı anda ne doğrudur?', o: ['Aynı zamanda yarı boştur', 'Tamamen doludur', 'Tamamen boştur', 'Kırıktır'], c: 0 },
      { q: 'İki yol aynı hedefe gidiyor. A yolu B yolundan kısadır. Hangi yol genelde daha az zaman alır?', o: ['A yolu', 'B yolu', 'İkisi de aynı', 'Bu uzunluğa bağlı değildir'], c: 0 },
      { q: 'Bir terazi her iki tarafta da aynı ağırlığı gösteriyor. Bu ne anlama gelir?', o: ['Her iki taraf da aynı ağırlıktadır', 'Terazi bozuktur', 'Bir taraf boştur', 'Sonuç yoktur'], c: 0 },
      { q: 'Bir bütünden üç eşit parça yapılırsa, her parçaya ne denir?', o: ['Dörtte bir', 'Üçte bir', 'Yarısı', 'Beşte bir'], c: 1 },
      { q: 'Bir olay ancak başka bir olaydan sonra gerçekleşir. Hangi olay daha önce oldu?', o: ['Sonraki olay', 'Önceki olay', 'İkisi aynı anda', 'Bu şansa bağlıdır'], c: 1 }
    ]
  };

  /* ============================================================
     Logik: gleiche mulberry32/hashStringToSeed wie in den anderen
     Spielen, damit Tagesrunde und Unbegrenzt Runde deterministisch
     und reproduzierbar sind.
     ============================================================ */
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
  /* ============================================================
     Kategorie Struktur fuer Schwierigkeit: sieben Kategorien in
     Poolreihenfolge (Logik, Zahlenmuster, Wortverstaendnis, Formen und
     Farben, Alltagswissen, Mini Rechnen, neutrale Denkfragen), je
     CATEGORY_SIZES Fragen. Groessen bewusst als Array, nicht als feste
     Indexbereiche im Code verstreut, damit spaeter einzelne Kategorien
     um weitere Fragen ergaenzt werden koennen, ohne die Auswahl Logik
     anzufassen (nur die Zahl in CATEGORY_SIZES aendert sich).
     ============================================================ */
  var CATEGORY_SIZES = [6, 6, 6, 6, 6, 6, 6];
  function categoryStart(catIndex) {
    var start = 0;
    for (var i = 0; i < catIndex; i++) start += CATEGORY_SIZES[i];
    return start;
  }
  /* Welche der sieben Kategorien liefert je Frage einer Runde, je Schwierigkeit.
     1 Leicht: Wortverstaendnis/Formen und Farben/Alltagswissen mehrfach, 1x Mini Rechnen.
     2 Mittel: eine Frage je Kategorie, nah am bisherigen, ungewichteten Verhalten.
     3 Schwer: Logik/Zahlenmuster/neutrale Denkfragen mehrfach, 1x Mini Rechnen.
     4 Experte: Logik/Zahlenmuster/neutrale Denkfragen maximal gewichtet, kein Mini Rechnen. */
  var CATEGORY_MIX_BY_DIFFICULTY = {
    1: [2, 3, 4, 2, 3, 4, 5],
    2: [0, 1, 2, 3, 4, 5, 6],
    3: [0, 1, 6, 0, 1, 6, 5],
    4: [0, 1, 6, 0, 1, 6, 0]
  };
  var PAR_SECONDS_BY_DIFFICULTY = { 1: 90, 2: 70, 3: 60, 4: 50 };
  function normalizeDifficulty(d) { return [1, 2, 3, 4].indexOf(d) !== -1 ? d : 2; }

  /* Waehlt sieben Fragenindizes gemaess der Kategorie Gewichtung der Schwierigkeit,
     deterministisch aus dem Seed, ohne dieselbe Frage zweimal in einer Runde. */
  function pickRoundIndices(seed, difficulty) {
    var rng = mulberry32(seed);
    var mix = CATEGORY_MIX_BY_DIFFICULTY[normalizeDifficulty(difficulty)];
    var usedByCategory = {};
    var result = [];
    mix.forEach(function (cat) {
      var size = CATEGORY_SIZES[cat];
      var start = categoryStart(cat);
      var used = usedByCategory[cat] || (usedByCategory[cat] = []);
      var localIdx, guard = 0;
      do {
        localIdx = Math.floor(rng() * size);
        guard++;
      } while (used.indexOf(localIdx) !== -1 && guard < 50);
      used.push(localIdx);
      result.push(start + localIdx);
    });
    return result;
  }
  function generateDailyRound(dateStr, difficulty) {
    var seed = hashStringToSeed('questra:daily:' + dateStr + ':d' + normalizeDifficulty(difficulty));
    return pickRoundIndices(seed, difficulty);
  }
  function generateUnlimitedRound(index, difficulty) {
    var idx = Math.max(0, Math.floor(index) || 0);
    var seed = hashStringToSeed('questra:unlimited:' + idx + ':d' + normalizeDifficulty(difficulty));
    return pickRoundIndices(seed, difficulty);
  }
  function randomUnlimitedIndex() { return Math.floor(Math.random() * 1000000); }
  /* 1 bis 3 Sterne aus Punktzahl und Zeit, ruhiger Richtwert, nie 0 Sterne. Parzeit sinkt mit steigender Schwierigkeit. */
  function ratingStars(score, elapsedSeconds, difficulty) {
    var par = PAR_SECONDS_BY_DIFFICULTY[normalizeDifficulty(difficulty)];
    if (score === 7 && elapsedSeconds <= par) return 3;
    if (score >= 5) return 2;
    return 1;
  }
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
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ---------- Lucide Bedien-Icons (ISC), wie in den anderen Spielen ---------- */
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
    house: svg('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>')
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
  var rankingsLinkEl = document.getElementById('rankingsLink');

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
  var currentRelocalize = null;

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
     Persistenz: Sitzungszustand (Modus, laufende Runde) und
     Tagesstatistik mit Streak, defensiv gegen kaputte/fehlende Daten.
     ============================================================ */
  var STATE_KEY = 'dailycode:questra:state:v2';
  var STATE_KEY_V1 = 'dailycode:questra:state:v1';
  var STATS_KEY = 'dailycode:questra:stats:v2';
  var STATS_KEY_V1 = 'dailycode:questra:stats:v1';

  /* ---------- Sperre gegen Mehrfachwertung ----------
     state.round ist nur EIN Slot fuer die jeweils zuletzt aktive Runde.
     Wechselt man die Schwierigkeit und zurueck, wird der alte Slot vorher
     ueberschrieben, loadRoundForState() findet dann keinen passenden key
     mehr und erzeugt ueber freshRound() dieselbe (deterministische) Runde
     erneut, obwohl sie schon gewertet war. Diese separate, vom state.round
     Slot unabhaengige Sperre merkt sich je Runden Schluessel (Modus, Tag
     oder Index, Schwierigkeit), ob schon an PuzzlePureScore gemeldet wurde. */
  var SCORED_KEY = 'dailycode:questra:scored:v1';
  function loadScoredSet() {
    if (!hasStorage) return {};
    try {
      var raw = window.localStorage.getItem(SCORED_KEY);
      if (!raw) return {};
      var o = JSON.parse(raw);
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }
  function markScored(key) {
    if (!hasStorage) return;
    try {
      var set = loadScoredSet();
      set[key] = true;
      window.localStorage.setItem(SCORED_KEY, JSON.stringify(set));
    } catch (e) { /* Speicher voll oder gesperrt, Spiel bleibt spielbar */ }
  }
  function isAlreadyScored(key) { return !!loadScoredSet()[key]; }

  function defaultState() {
    return {
      mode: 'daily',
      difficulty: 2,
      unlimitedIndexByDifficulty: { 1: 0, 2: 0, 3: 0, 4: 0 },
      round: {
        key: null,
        indices: [],
        answers: [],
        currentQ: 0,
        elapsedSeconds: 0,
        startedAt: null,
        finished: false
      }
    };
  }
  function normalizeRound(o) {
    var d = defaultState().round;
    if (!o || typeof o !== 'object') return d;
    if (typeof o.key === 'string') d.key = o.key;
    if (Array.isArray(o.indices) && o.indices.length === 7) d.indices = o.indices.map(function (v) { return intOr(v, 0); });
    if (Array.isArray(o.answers) && o.answers.length === 7) d.answers = o.answers.map(function (v) { return v === null ? null : intOr(v, null); });
    else d.answers = [null, null, null, null, null, null, null];
    d.currentQ = intOr(o.currentQ, 0);
    if (d.currentQ > 6) d.currentQ = 6;
    d.elapsedSeconds = intOr(o.elapsedSeconds, 0);
    d.startedAt = typeof o.startedAt === 'string' ? o.startedAt : null;
    d.finished = !!o.finished;
    return d;
  }
  /* Migration v1 zu v2: die alte Runde wird bewusst NICHT uebernommen, da das alte
     Auswahlverfahren (reiner Fisher Yates ueber den ganzen Pool) nicht mit der neuen
     Kategorie Gewichtung kompatibel ist. Eine frische Mittel Runde entsteht beim
     naechsten Laden automatisch, das ist sicherer als inkonsistente Indizes zu
     uebernehmen. Der bisherige Unbegrenzt Rundenzaehler wandert nach Mittel (Stufe 2),
     da Mittel dem bisherigen, ungewichteten Verhalten am naechsten kommt.  */
  function migrateStateFromV1() {
    if (!hasStorage) return null;
    try {
      var raw = window.localStorage.getItem(STATE_KEY_V1);
      if (!raw) return null;
      var o = JSON.parse(raw);
      var d = defaultState();
      if (o.mode === 'daily' || o.mode === 'unlimited') d.mode = o.mode;
      d.unlimitedIndexByDifficulty[2] = intOr(o.unlimitedIndexCurrent, 0);
      return d;
    } catch (e) { return null; }
  }
  function loadState() {
    if (!hasStorage) return defaultState();
    try {
      var raw = window.localStorage.getItem(STATE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        var d = defaultState();
        if (o.mode === 'daily' || o.mode === 'unlimited') d.mode = o.mode;
        if ([1, 2, 3, 4].indexOf(o.difficulty) !== -1) d.difficulty = o.difficulty;
        if (o.unlimitedIndexByDifficulty && typeof o.unlimitedIndexByDifficulty === 'object') {
          for (var k = 1; k <= 4; k++) d.unlimitedIndexByDifficulty[k] = intOr(o.unlimitedIndexByDifficulty[k], 0);
        }
        d.round = normalizeRound(o.round);
        return d;
      }
      var migrated = migrateStateFromV1();
      if (migrated) { saveState(migrated); return migrated; }
      return defaultState();
    } catch (e) { return defaultState(); }
  }
  function saveState(s) { if (!hasStorage) return; try { window.localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) {} }

  function defaultDifficultyStats() { return { currentStreak: 0, maxStreak: 0, lastWinDate: null, totalSolved: 0, bestScore: 0 }; }
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
    d.bestScore = intOr(o.bestScore, 0);
    if (d.currentStreak > d.maxStreak) d.maxStreak = d.currentStreak;
    return d;
  }
  /* Migration v1 zu v2: die bisherige, einzige Statistik ist inhaltlich am naehesten an
     Mittel (Stufe 2) und wandert dorthin, unveraendert. Leicht, Schwer und Experte
     starten leer, kein bestehender Wert geht dabei verloren. */
  function migrateStatsFromV1() {
    if (!hasStorage) return null;
    try {
      var raw = window.localStorage.getItem(STATS_KEY_V1);
      if (!raw) return null;
      var o = JSON.parse(raw);
      var d = defaultStats();
      d.byDifficulty[2] = normalizeDifficultyStats(o);
      return d;
    } catch (e) { return null; }
  }
  function loadStats() {
    if (!hasStorage) return defaultStats();
    try {
      var raw = window.localStorage.getItem(STATS_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        var d = defaultStats();
        if (o && o.byDifficulty) { for (var k = 1; k <= 4; k++) d.byDifficulty[k] = normalizeDifficultyStats(o.byDifficulty[k]); }
        return d;
      }
      var migrated = migrateStatsFromV1();
      if (migrated) { saveStats(migrated); return migrated; }
      return defaultStats();
    } catch (e) { return defaultStats(); }
  }
  function saveStats(s) { if (!hasStorage) return; try { window.localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {} }
  function recordDailyResult(stats, difficulty, dateStr, score) {
    var ds = stats.byDifficulty[normalizeDifficulty(difficulty)];
    if (ds.lastWinDate !== dateStr) {
      ds.totalSolved += 1;
      ds.currentStreak = (ds.lastWinDate === prevDayKey(dateStr)) ? ds.currentStreak + 1 : 1;
      ds.lastWinDate = dateStr;
      if (ds.currentStreak > ds.maxStreak) ds.maxStreak = ds.currentStreak;
    }
    if (score > ds.bestScore) ds.bestScore = score;
    saveStats(stats);
    return stats;
  }

  /* ============================================================
     Questra UI, gebunden an mountQuestra(container).
     ============================================================ */
  function mountQuestra(container) {
    var state = loadState();
    var mode = state.mode;
    var difficulty = state.difficulty;
    var dateStr = dateKeyUTC();
    var unlimitedIndex = state.unlimitedIndexByDifficulty[difficulty] || 0;
    var statsData = loadStats();

    var indices = [];
    var answers = [null, null, null, null, null, null, null];
    var currentQ = 0;
    var finished = false;
    var baseElapsed = 0;
    var segStart = 0;
    var timerStarted = false;
    var timerId = 0;
    var startedAt = null;
    var answeredThisQuestion = false;
    var stars = 0;
    var ppResult = null;
    var lastPpPayload = null;
    var rewardsTriggered = false;

    container.replaceChildren();
    container.classList.add('questra-root');

    var modeRow = document.createElement('div');
    modeRow.className = 'questra-modes';
    var modeDailyBtn = modeButton('daily');
    var modeUnlimitedBtn = modeButton('unlimited');
    modeRow.append(modeDailyBtn, modeUnlimitedBtn);

    var diffRow = document.createElement('div');
    diffRow.className = 'questra-diff';
    diffRow.setAttribute('role', 'group');
    diffRow.setAttribute('aria-label', t('aria_difficulty_group'));
    var diffButtons = [1, 2, 3, 4].map(function (n) { return difficultyButton(n); });
    diffRow.append.apply(diffRow, diffButtons);

    var unlimitedNav = document.createElement('div');
    unlimitedNav.className = 'questra-unlimited-nav';
    var prevBtn = iconNavButton('chevronLeft', function () { goToIndex(Math.max(0, unlimitedIndex - 1)); }, 'aria_prev_round');
    var numberEl = document.createElement('span');
    numberEl.className = 'questra-round-number';
    var nextRoundBtn = iconNavButton('chevronRight', function () { goToIndex(unlimitedIndex + 1); }, 'aria_next_round');
    var randomBtn = iconNavButton('shuffle', function () { goToIndex(randomUnlimitedIndex()); }, 'aria_random_round');
    unlimitedNav.append(prevBtn, numberEl, nextRoundBtn, randomBtn);

    var statusLine = document.createElement('div');
    statusLine.className = 'questra-status';
    statusLine.setAttribute('role', 'status');
    statusLine.setAttribute('aria-live', 'polite');

    var quizArea = document.createElement('div');
    quizArea.className = 'questra-quiz';
    quizArea.setAttribute('role', 'group');
    quizArea.setAttribute('aria-label', t('aria_quiz'));

    var questionEl = document.createElement('p');
    questionEl.className = 'questra-question';

    var optionsEl = document.createElement('div');
    optionsEl.className = 'questra-options';

    var feedbackEl = document.createElement('p');
    feedbackEl.className = 'questra-feedback';
    feedbackEl.setAttribute('role', 'status');
    feedbackEl.setAttribute('aria-live', 'polite');

    quizArea.append(questionEl, optionsEl, feedbackEl);

    var actions = document.createElement('div');
    actions.className = 'questra-actions';
    var nextBtn = button(t('btn_next'), 'btn', function () { goNext(); });
    nextBtn.hidden = true;
    var newRoundBtn = button(t('btn_new_round'), 'btn btn-ghost', function () { goToIndex(randomUnlimitedIndex()); });
    newRoundBtn.hidden = true;
    actions.append(nextBtn, newRoundBtn);

    var resultPanel = document.createElement('div');
    resultPanel.className = 'questra-result';
    resultPanel.hidden = true;
    resultPanel.setAttribute('role', 'status');
    resultPanel.setAttribute('aria-live', 'polite');
    var resultHeadingEl = document.createElement('h2');
    resultHeadingEl.className = 'questra-result-heading';
    var resultTextEl = document.createElement('p');
    resultTextEl.className = 'questra-result-text';
    var resultDifficultyEl = document.createElement('p');
    resultDifficultyEl.className = 'questra-result-difficulty';
    var starsEl = document.createElement('div');
    starsEl.className = 'questra-stars';
    var ppScoreEl = document.createElement('div');
    resultPanel.append(resultHeadingEl, resultTextEl, resultDifficultyEl, starsEl, ppScoreEl);

    var statsPanel = document.createElement('div');
    statsPanel.className = 'questra-stats';

    container.append(modeRow, diffRow, unlimitedNav, statusLine, quizArea, actions, resultPanel, statsPanel);

    function modeButton(m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'questra-mode-btn';
      b.textContent = t(m === 'daily' ? 'mode_daily' : 'mode_unlimited');
      b.setAttribute('aria-pressed', String(mode === m));
      b.setAttribute('aria-label', t(m === 'daily' ? 'aria_mode_daily' : 'aria_mode_unlimited'));
      b.addEventListener('click', function () {
        if (mode === m) return;
        persistState();
        mode = m;
        state.mode = mode;
        saveState(state);
        loadRoundForState(false);
        render();
      });
      return b;
    }
    function difficultyButton(n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'questra-diff-btn';
      b.textContent = t('level')(n);
      b.setAttribute('aria-pressed', String(difficulty === n));
      b.setAttribute('aria-label', t('aria_difficulty')(n));
      b.addEventListener('click', function () { selectDifficulty(n); });
      return b;
    }
    function refreshDiffButtons() {
      diffButtons.forEach(function (b, i) {
        b.textContent = t('level')(i + 1);
        b.setAttribute('aria-pressed', String(difficulty === i + 1));
        b.setAttribute('aria-label', t('aria_difficulty')(i + 1));
      });
    }
    function selectDifficulty(n) {
      if (difficulty === n) return;
      persistState();
      difficulty = n;
      state.difficulty = difficulty;
      unlimitedIndex = state.unlimitedIndexByDifficulty[difficulty] || 0;
      saveState(state);
      loadRoundForState(false);
      refreshDiffButtons();
      render();
    }
    function iconNavButton(iconKey, onClick, ariaKey) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'icon-btn questra-nav-btn';
      b.innerHTML = ICON[iconKey];
      b.setAttribute('aria-label', t(ariaKey));
      b.addEventListener('click', onClick);
      return b;
    }
    function button(label, cls, onClick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.textContent = label;
      b.addEventListener('click', onClick);
      return b;
    }

    function currentRoundKey() {
      return (mode === 'daily' ? ('daily:' + dateStr) : ('unlimited:' + unlimitedIndex)) + ':d' + difficulty;
    }

    function goToIndex(idx) {
      persistState();
      unlimitedIndex = Math.max(0, idx);
      state.unlimitedIndexByDifficulty[difficulty] = unlimitedIndex;
      saveState(state);
      loadRoundForState(true);
      render();
    }

    function freshRound() {
      indices = mode === 'daily' ? generateDailyRound(dateStr, difficulty) : generateUnlimitedRound(unlimitedIndex, difficulty);
      answers = [null, null, null, null, null, null, null];
      currentQ = 0;
      finished = false;
      baseElapsed = 0;
      startedAt = null;
      timerStarted = false;
      stars = 0;
    }

    function loadRoundForState(forceFresh) {
      var key = currentRoundKey();
      if (!forceFresh && state.round && state.round.key === key && state.round.indices.length === 7) {
        indices = state.round.indices;
        answers = state.round.answers;
        currentQ = state.round.currentQ;
        finished = state.round.finished;
        baseElapsed = state.round.elapsedSeconds;
        startedAt = state.round.startedAt;
        timerStarted = baseElapsed > 0 || finished;
        stars = finished ? ratingStars(computeScore(), baseElapsed, difficulty) : 0;
      } else {
        freshRound();
      }
      answeredThisQuestion = !finished && answers[currentQ] !== null;
      segStart = 0;
      stopTicker();
      if (!finished && timerStarted) { segStart = nowMs(); startTicker(); }
    }

    function computeScore() {
      var s = 0;
      for (var i = 0; i < 7; i++) {
        var qi = indices[i];
        if (answers[i] !== null && answers[i] === POOL.de[qi].c) s++;
      }
      return s;
    }

    function persistState() {
      state.round = {
        key: currentRoundKey(),
        indices: indices,
        answers: answers,
        currentQ: currentQ,
        elapsedSeconds: Math.floor(currentElapsed()),
        startedAt: startedAt,
        finished: finished
      };
      saveState(state);
    }

    /* ---------- Timer ---------- */
    function nowMs() { return window.performance && performance.now ? performance.now() : new Date().getTime(); }
    function currentElapsed() { return baseElapsed + (segStart ? (nowMs() - segStart) / 1000 : 0); }
    function startTimerIfNeeded() {
      if (!timerStarted) { timerStarted = true; startedAt = new Date().toISOString(); }
      if (!segStart) { segStart = nowMs(); startTicker(); }
    }
    function startTicker() {
      if (timerId) return;
      timerId = window.setInterval(function () { if (!finished) render(); }, 1000);
    }
    function stopTicker() { if (timerId) { window.clearInterval(timerId); timerId = 0; } }
    function stopTimer() {
      if (segStart) { baseElapsed = currentElapsed(); segStart = 0; }
      stopTicker();
    }
    function onVisibility() {
      if (document.hidden) {
        if (segStart) { baseElapsed = currentElapsed(); segStart = 0; }
      } else if (timerStarted && !finished && !segStart) {
        segStart = nowMs();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    function selectAnswer(optionIndex) {
      if (finished || answeredThisQuestion) return;
      startTimerIfNeeded();
      answers[currentQ] = optionIndex;
      answeredThisQuestion = true;
      persistState();
      render();
    }
    function goNext() {
      if (currentQ < 6) {
        currentQ += 1;
        answeredThisQuestion = answers[currentQ] !== null;
        persistState();
        render();
      } else {
        finished = true;
        stopTimer();
        var finalScore = computeScore();
        stars = ratingStars(finalScore, Math.floor(currentElapsed()), difficulty);
        if (mode === 'daily') recordDailyResult(statsData, difficulty, dateStr, finalScore);
        if (window.PuzzlePureScore && !isAlreadyScored(currentRoundKey())) {
          lastPpPayload = {
            game: 'questra',
            difficulty: difficulty,
            outcome: 'complete',
            timeSeconds: Math.floor(currentElapsed()),
            parSeconds: PAR_SECONDS_BY_DIFFICULTY[difficulty],
            mistakes: 7 - finalScore,
            hints: 0,
            perfect: finalScore === 7
          };
          ppResult = window.PuzzlePureScore.recordResult(lastPpPayload);
          markScored(currentRoundKey());
          rewardsTriggered = false;
        }
        persistState();
        render();
      }
    }

    function renderStars() {
      starsEl.innerHTML = '';
      starsEl.setAttribute('role', 'img');
      starsEl.setAttribute('aria-label', t('stars_result')(stars));
      for (var i = 1; i <= 3; i++) {
        var s = document.createElement('span');
        s.className = 'questra-star' + (i <= stars ? ' is-lit' : '');
        s.innerHTML = ICON.star;
        s.setAttribute('aria-hidden', 'true');
        starsEl.append(s);
      }
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
      var html = '<h2 class="questra-stats-title">' + t('stats_title') + '</h2>';
      html += '<div class="stat-grid">';
      html += statCellHtml(ds.totalSolved, t('stat_solved_cap'));
      html += statCellHtml(ds.currentStreak, t('stat_current_cap'));
      html += statCellHtml(ds.maxStreak, t('stat_best_cap'));
      html += statCellHtml(ds.bestScore, t('stat_bestscore_cap'));
      html += '</div>';
      statsPanel.innerHTML = html;
    }

    function render() {
      modeDailyBtn.setAttribute('aria-pressed', String(mode === 'daily'));
      modeUnlimitedBtn.setAttribute('aria-pressed', String(mode === 'unlimited'));
      unlimitedNav.hidden = mode !== 'unlimited';
      if (mode === 'unlimited') numberEl.textContent = t('round_number')(unlimitedIndex + 1);

      var modeLabel = mode === 'daily' ? (t('mode_daily') + ' ' + dateStr) : (t('mode_unlimited') + ' · ' + t('round_number')(unlimitedIndex + 1));
      modeLabel += ' · ' + t('level')(difficulty);
      statusLine.textContent = modeLabel + (finished ? '' : (' · ' + t('question_progress')(currentQ + 1)));

      quizArea.hidden = finished;
      actions.hidden = finished;
      resultPanel.hidden = !finished;
      newRoundBtn.hidden = mode !== 'unlimited';

      if (!finished) {
        var qi = indices[currentQ];
        var qData = POOL[lang][qi] || POOL.de[qi];
        questionEl.textContent = qData.q;
        optionsEl.replaceChildren();
        var picked = answers[currentQ];
        qData.o.forEach(function (optText, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'questra-option';
          b.textContent = optText;
          b.setAttribute('aria-label', t('aria_option')(i + 1, optText));
          if (picked !== null) {
            b.disabled = true;
            if (i === qData.c) b.classList.add('is-correct');
            else if (i === picked) b.classList.add('is-wrong');
          }
          b.addEventListener('click', function () { selectAnswer(i); });
          optionsEl.append(b);
        });
        if (picked !== null) {
          var correctNow = picked === qData.c;
          feedbackEl.textContent = correctNow ? t('feedback_correct') : (t('feedback_wrong') + '. ' + t('reveal_correct')(qData.o[qData.c]));
          nextBtn.hidden = false;
        } else {
          feedbackEl.textContent = '';
          nextBtn.hidden = true;
        }
      } else {
        var score = computeScore();
        resultHeadingEl.textContent = t('result_heading');
        resultTextEl.textContent = t('result_text')(score, fmtTime(baseElapsed));
        resultDifficultyEl.textContent = t('result_difficulty')(difficulty);
        renderStars();
        ppScoreEl.replaceChildren();
        if (ppResult && window.PuzzlePureScore) {
          var ppBlock = window.PuzzlePureScore.buildResultBlock(lang, ppResult);
          ppScoreEl.append(ppBlock);
          if (window.PuzzlePureRewards && !rewardsTriggered) {
            rewardsTriggered = true;
            window.PuzzlePureRewards.trigger({
              ppResult: ppResult,
              payload: lastPpPayload || {},
              lang: lang,
              cardEl: resultPanel,
              starsEl: starsEl,
              scoreLineEl: ppBlock.querySelector('.pp-score-line')
            });
          }
        }
      }

      renderStatsPanel();
    }

    function relocalizeGame() {
      modeDailyBtn.textContent = t('mode_daily');
      modeDailyBtn.setAttribute('aria-label', t('aria_mode_daily'));
      modeUnlimitedBtn.textContent = t('mode_unlimited');
      modeUnlimitedBtn.setAttribute('aria-label', t('aria_mode_unlimited'));
      diffRow.setAttribute('aria-label', t('aria_difficulty_group'));
      refreshDiffButtons();
      prevBtn.setAttribute('aria-label', t('aria_prev_round'));
      nextRoundBtn.setAttribute('aria-label', t('aria_next_round'));
      randomBtn.setAttribute('aria-label', t('aria_random_round'));
      nextBtn.textContent = t('btn_next');
      newRoundBtn.textContent = t('btn_new_round');
      quizArea.setAttribute('aria-label', t('aria_quiz'));
      render();
    }
    currentRelocalize = relocalizeGame;

    loadRoundForState(false);
    render();
  }

  /* ---------- Statische Texte ---------- */
  function applyTexts() {
    if (subtitleEl) subtitleEl.textContent = t('subtitle');
    if (homeLinkEl) homeLinkEl.setAttribute('aria-label', t('home_aria'));
    setText('homeLabel', t('home'));
    if (rankingsLinkEl) rankingsLinkEl.setAttribute('aria-label', t('rankings_aria'));
    setText('rankingsLabel', t('rankings'));
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

    if (stageEl) mountQuestra(stageEl);
  }

  init();
})();
