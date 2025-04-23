#!/bin/bash

# Überprüfen, ob die Umgebungsvariable API_URL gesetzt ist
if [ -z "$API_URL" ]; then
    echo "Fehler: Die Umgebungsvariable API_URL ist nicht gesetzt."
    exit 1
fi

# JSON-Datei schreiben
echo "{\n    \"apiUrl\": \"$API_URL\"\n}" > ./config/config.json

echo "JSON-Datei wurde erstellt: output.json"

serve -s dist