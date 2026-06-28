# Wortdaten Provenienz und Lizenznachweis

Stand der Beschaffung: 2026-06-26 (UTC). Reine Wortdaten fuer ein geplantes Wortbildungsspiel. Erzeugt durch `build.py` aus diesem Ordner.

## Quellen und Lizenzen

### Deutsch (`words-de.txt`)

- Quelle: enz/german-wordlist @ main
- Datei: https://raw.githubusercontent.com/enz/german-wordlist/main/words
- Lizenz: **CC0 1.0 Universal (Public Domain Dedication)** (Originaltext: `licenses/LICENSE-de-enz-german-wordlist-CC0.txt`)
- Lizenz-URL: https://raw.githubusercontent.com/enz/german-wordlist/main/COPYING
- sha256 Rohdatei: `445c8e09e0efe63e76beadc25607f521c7e09893ac68d585a822c7c6ecbebf7b`
- sha256 Ausgabe:  `e3da9e50840b3cd6d93e92a340b6957b3fd1a467ef22512bf7aac3fdcebdd1b3`
- Rohzeilen: 685789  ->  nach Filter: 212777 Woerter

### Englisch (`words-en.txt`)

- Quelle: dwyl/english-words @ master
- Datei: https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt
- Lizenz: **Unlicense (Public Domain)** (Originaltext: `licenses/LICENSE-en-dwyl-english-words.md`)
- Lizenz-URL: https://raw.githubusercontent.com/dwyl/english-words/master/LICENSE.md
- sha256 Rohdatei: `3ed0c94610d8bcf7c11bbb49c56aa49c7234d32b66824df91f554169e572da48`
- sha256 Ausgabe:  `fa60df268f250b4e883b2fd37ce7f047c94b9f952e9a5138070856bceeb8b190`
- Rohzeilen: 370105  ->  nach Filter: 202138 Woerter

## Aufbereitung (build.py)

- lowercase; Laenge 3 bis 9 Zeichen; dedupliziert; sortiert (Unicode); UTF-8, ein Wort pro Zeile.
- Erlaubte Zeichen strikt: DE `^[a-zäöüß]+$`, EN `^[a-z]+$`.
- Ziffern, Leer- und Satzzeichen, Apostrophe, Bindestriche und Mehrworteintraege werden durch den strengen Zeichensatz-Match verworfen.
- **DE durchgaengige Kleinschreibung:** Die enz-Quelle nutzt deutsche Originalschreibung (Substantive gross). Die abgelegte Liste ist KOMPLETT kleingeschrieben. Das Spiel MUSS die Spielereingabe vor dem Abgleich ebenfalls kleinschreiben, damit ein klein eingegebenes korrektes Wort nicht an einem gross gespeicherten Eintrag scheitert.
- Eigennamen: enz ist eine handgepflegte Liste nach Scrabble-Regeln (Eigennamen, Toponyme, Abkuerzungen ausgeschlossen); von Ortsnamen abgeleitete Formen (z.B. aachener) bleiben tolerierbar und werden NICHT aggressiv weggefiltert. Da im Deutschen alle Substantive gross geschrieben werden, ist eine Eigennamen-Erkennung ueber Grossschreibung ohnehin nicht moeglich; wir verlassen uns auf die Kuratierung der Quelle. dwyl (EN) ist grosszuegig und kann seltene Eintraege enthalten, fuer ein Wortbildungsspiel akzeptabel.

## Tuerkisch (offener Punkt)

TR wurde BEWUSST ausgelassen. Die gepruefte Kandidatenquelle `csariyildiz/turkish-wordlist` traegt formal MIT, ihre Daten stammen laut README jedoch aus Wikipedia-Text (CC-BY-SA). Das MIT-Label deckt die CC-BY-SA-Herkunft der Daten nicht zweifelsfrei. Hunspell/LibreOffice-TR sind ueblicherweise Copyleft (LGPL/GPL/MPL), TDK-basierte Listen sind eine geschuetzte Behoerdenquelle. Offen: eine zweifelsfrei permissive TR-Wortliste (CC0/MIT/BSD/ISC/Apache, NICHT aus Copyleft, NICHT aus TDK oder CC-BY-SA-Wikipedia) ist spaeter zu ergaenzen. Die Funktion `turkish_lower()` in build.py ist fuer diesen Fall bereits vorbereitet (locale-korrekte Kleinschreibung: İ->i, I->ı).
