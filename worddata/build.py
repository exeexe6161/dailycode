#!/usr/bin/env python3
# ============================================================
# dailycode  Wortdaten Aufbereitung (DE, EN)
# Laedt zwei freizuegig lizenzierte Wortlisten frisch von der Quelle,
# filtert sie fuer ein Wortbildungsspiel und legt sie in worddata/ ab.
# Reine Datenaufbereitung, kein Spiel, kein Portal. Nachvollziehbar:
# Quelle, Lizenz, sha256 von Roh- und Ausgabedatei werden festgehalten.
#
# Lizenzen (an der Quelle geprueft, Originaltexte unter licenses/):
#   DE  enz/german-wordlist  CC0 1.0 Universal (Public Domain Dedication), umlautreich
#   EN  dwyl/english-words   Unlicense (Public Domain)
#   TR  bewusst weggelassen  (keine zweifelsfrei permissive Quelle, offener Punkt)
#
# DE-Kleinschreibung: Die Quelle nutzt deutsche Originalschreibung (Substantive
# gross). Wir legen die Liste DURCHGAENGIG KLEIN ab (str.lower). Damit das Spiel
# konsistent ist, MUSS auch die Spielereingabe vor dem Abgleich kleingeschrieben
# werden, sonst scheitert ein klein eingegebenes korrektes Wort an einem zuvor
# gross gespeicherten Eintrag. Von Ortsnamen abgeleitete Formen (z.B. aachener)
# bleiben tolerierbar, kein aggressives Wegfiltern.
# ============================================================
import urllib.request, re, hashlib, os, random, datetime

BASE = os.path.dirname(os.path.abspath(__file__))
LIC = os.path.join(BASE, 'licenses')
os.makedirs(LIC, exist_ok=True)

# Tuerkisch-korrekte Kleinschreibung. JETZT ungenutzt (TR ausgelassen),
# hier dokumentiert fuer die spaetere Ergaenzung einer sauberen TR-Quelle:
# zuerst die punktbehafteten Grossbuchstaben gezielt mappen, DANN .lower(),
# damit aus "I" das punktlose "ı" und aus "İ" das "i" wird.
def turkish_lower(s):
    return s.replace('İ', 'i').replace('I', 'ı').lower()

SOURCES = {
    'de': {
        'name': 'Deutsch',
        'repo': 'enz/german-wordlist @ main',
        'url': 'https://raw.githubusercontent.com/enz/german-wordlist/main/words',
        'license': 'CC0 1.0 Universal (Public Domain Dedication)',
        'license_url': 'https://raw.githubusercontent.com/enz/german-wordlist/main/COPYING',
        'license_file': 'LICENSE-de-enz-german-wordlist-CC0.txt',
        'charset': re.compile(r'^[a-zäöüß]+$'),
        'lower': str.lower,
    },
    'en': {
        'name': 'Englisch',
        'repo': 'dwyl/english-words @ master',
        'url': 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt',
        'license': 'Unlicense (Public Domain)',
        'license_url': 'https://raw.githubusercontent.com/dwyl/english-words/master/LICENSE.md',
        'license_file': 'LICENSE-en-dwyl-english-words.md',
        'charset': re.compile(r'^[a-z]+$'),
        'lower': str.lower,
    },
}

MIN_LEN, MAX_LEN = 3, 9


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'dailycode-worddata'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def human(n):
    for unit in ('B', 'KB', 'MB'):
        if n < 1024:
            return f'{n:.0f} {unit}' if unit == 'B' else f'{n:.1f} {unit}'
        n /= 1024
    return f'{n:.1f} GB'


report = {}
for lang, cfg in SOURCES.items():
    raw = fetch(cfg['url'])
    raw_sha = hashlib.sha256(raw).hexdigest()
    text = raw.decode('utf-8', errors='replace')
    raw_lines = [ln for ln in text.replace('\r', '\n').split('\n') if ln.strip()]

    seen = set()
    dropped_len = dropped_charset = 0
    lower = cfg['lower']
    charset = cfg['charset']
    for ln in raw_lines:
        w = lower(ln.strip())
        # Ziffern, Leer- und Satzzeichen, Apostrophe, Bindestriche, Mehrworteintraege
        # werden durch den strengen charset-Match automatisch verworfen.
        if not (MIN_LEN <= len(w) <= MAX_LEN):
            dropped_len += 1
            continue
        if not charset.match(w):
            dropped_charset += 1
            continue
        seen.add(w)

    words = sorted(seen)
    out_path = os.path.join(BASE, f'words-{lang}.txt')
    out_bytes = ('\n'.join(words) + '\n').encode('utf-8')
    with open(out_path, 'wb') as f:
        f.write(out_bytes)
    out_sha = hashlib.sha256(out_bytes).hexdigest()

    # Original-Lizenztext als Nachweis ablegen
    lic = fetch(cfg['license_url'])
    with open(os.path.join(LIC, cfg['license_file']), 'wb') as f:
        f.write(lic)

    # 20 Stichproben, fester Seed je Sprache fuer Reproduzierbarkeit
    rnd = random.Random(42)
    sample = sorted(rnd.sample(words, min(20, len(words))))

    report[lang] = {
        'cfg': cfg, 'raw_count': len(raw_lines), 'count': len(words),
        'bytes': len(out_bytes), 'raw_sha': raw_sha, 'out_sha': out_sha,
        'dropped_len': dropped_len, 'dropped_charset': dropped_charset, 'sample': sample,
    }

# ---- PROVENANCE.md schreiben ----
today = datetime.datetime.utcnow().strftime('%Y-%m-%d')
prov = []
prov.append('# Wortdaten Provenienz und Lizenznachweis\n')
prov.append(f'Stand der Beschaffung: {today} (UTC). Reine Wortdaten fuer ein geplantes '
            'Wortbildungsspiel. Erzeugt durch `build.py` aus diesem Ordner.\n')
prov.append('## Quellen und Lizenzen\n')
for lang in ('de', 'en'):
    r = report[lang]; c = r['cfg']
    prov.append(f'### {c["name"]} (`words-{lang}.txt`)\n')
    prov.append(f'- Quelle: {c["repo"]}')
    prov.append(f'- Datei: {c["url"]}')
    prov.append(f'- Lizenz: **{c["license"]}** (Originaltext: `licenses/{c["license_file"]}`)')
    prov.append(f'- Lizenz-URL: {c["license_url"]}')
    prov.append(f'- sha256 Rohdatei: `{r["raw_sha"]}`')
    prov.append(f'- sha256 Ausgabe:  `{r["out_sha"]}`')
    prov.append(f'- Rohzeilen: {r["raw_count"]}  ->  nach Filter: {r["count"]} Woerter\n')
prov.append('## Aufbereitung (build.py)\n')
prov.append('- lowercase; Laenge 3 bis 9 Zeichen; dedupliziert; sortiert (Unicode); UTF-8, ein Wort pro Zeile.')
prov.append('- Erlaubte Zeichen strikt: DE `^[a-zäöüß]+$`, EN `^[a-z]+$`.')
prov.append('- Ziffern, Leer- und Satzzeichen, Apostrophe, Bindestriche und Mehrworteintraege '
            'werden durch den strengen Zeichensatz-Match verworfen.')
prov.append('- **DE durchgaengige Kleinschreibung:** Die enz-Quelle nutzt deutsche Originalschreibung '
            '(Substantive gross). Die abgelegte Liste ist KOMPLETT kleingeschrieben. Das Spiel MUSS die '
            'Spielereingabe vor dem Abgleich ebenfalls kleinschreiben, damit ein klein eingegebenes '
            'korrektes Wort nicht an einem gross gespeicherten Eintrag scheitert.')
prov.append('- Eigennamen: enz ist eine handgepflegte Liste nach Scrabble-Regeln (Eigennamen, Toponyme, '
            'Abkuerzungen ausgeschlossen); von Ortsnamen abgeleitete Formen (z.B. aachener) bleiben '
            'tolerierbar und werden NICHT aggressiv weggefiltert. Da im Deutschen alle Substantive gross '
            'geschrieben werden, ist eine Eigennamen-Erkennung ueber Grossschreibung ohnehin nicht moeglich; '
            'wir verlassen uns auf die Kuratierung der Quelle. dwyl (EN) ist grosszuegig und kann seltene '
            'Eintraege enthalten, fuer ein Wortbildungsspiel akzeptabel.\n')
prov.append('## Tuerkisch (offener Punkt)\n')
prov.append('TR wurde BEWUSST ausgelassen. Die gepruefte Kandidatenquelle '
            '`csariyildiz/turkish-wordlist` traegt formal MIT, ihre Daten stammen laut README jedoch aus '
            'Wikipedia-Text (CC-BY-SA). Das MIT-Label deckt die CC-BY-SA-Herkunft der Daten nicht '
            'zweifelsfrei. Hunspell/LibreOffice-TR sind ueblicherweise Copyleft (LGPL/GPL/MPL), '
            'TDK-basierte Listen sind eine geschuetzte Behoerdenquelle. Offen: eine zweifelsfrei '
            'permissive TR-Wortliste (CC0/MIT/BSD/ISC/Apache, NICHT aus Copyleft, NICHT aus TDK oder '
            'CC-BY-SA-Wikipedia) ist spaeter zu ergaenzen. Die Funktion `turkish_lower()` in build.py '
            'ist fuer diesen Fall bereits vorbereitet (locale-korrekte Kleinschreibung: İ->i, I->ı).\n')
with open(os.path.join(BASE, 'PROVENANCE.md'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(prov))

# ---- Konsolenbericht ----
print('=' * 60)
for lang in ('de', 'en'):
    r = report[lang]; c = r['cfg']
    print(f'\n[{c["name"]}]  Quelle: {c["repo"]}')
    print(f'  Lizenz: {c["license"]}')
    print(f'  Rohzeilen: {r["raw_count"]}  ->  final: {r["count"]} Woerter')
    print(f'  verworfen (Laenge): {r["dropped_len"]}   verworfen (Zeichensatz): {r["dropped_charset"]}')
    print(f'  Datei: worddata/words-{lang}.txt   Groesse: {human(r["bytes"])}')
    print(f'  20 Stichproben: {", ".join(r["sample"])}')
print('\n' + '=' * 60)
print('Ablage: worddata/words-de.txt, worddata/words-en.txt')
print('Lizenzen: worddata/licenses/  Provenienz: worddata/PROVENANCE.md')
