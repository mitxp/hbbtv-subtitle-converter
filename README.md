# hbbtv-subtitle-converter

Server-side Untertitel-Verarbeitung für den HbbTV ARD.Player.

## Einführung

Der ARD.Player für HbbTV kann Untertitel nicht direkt abspielen, weil er keinen XML-Parser hat.
Dies muss serverseitig vor Auslieferung der MediaCollection an den Player erfolgen. Bei der
Verarbeitung wird die MediaCollection nur durch Hinzufügen von `subtitles@tv` Plugin-Daten
verändert, sodass es weiterhin kompatibel zu den anderen Varianten des ARD.Player ist.

## Benutzung

```
    const config = {timeout: 10000};
    await processHbbTvSubtitles(mediaCollection, config);
```

Erstes Argument ist die `MediaCollection`. Zweites Argument ist die Konfiguration (siehe unten).

Nach Aufruf der `processHbbTvSubtitles` Funktion kann die nun modifizierte MediaCollection
ausgeliefert werden.

## Konfiguration

Das Konfigurations-Objekt muss zwingend `timeout` enthalten. Das ist die Anzahl von Millisekunden,
innerhalb derer die EBU-TT / WebVTT URL heruntergeladen sein muss, sonst wird die Verarbeitung
abgebrochen und keine Untertitel sind verfügbar.

Zusätzlich kann das Attribut `headers` angegeben werden, das als Wert ein Objekt hat (Keys sind
Strings, Werte sind ebenfalls Strings). Dies sind zusätzliche HTTP-Header, die beim Abruf der
EBU-TT / WebVTT Untertitel URLs mitgesendet werden.
