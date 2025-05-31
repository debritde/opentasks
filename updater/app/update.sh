#!/bin/bash


#######################################################################################
### VIELLEICHT updater.sh DURCHREICHEN PER MAPPING STATT IM IMAGE BUILD ZU KOPIEREN ###
#######################################################################################

echo "Progress: 15%"
echo "🚀 Start Update-Process..."

# In das Projektverzeichnis wechseln
cd /dockerProject || { echo "❌ Fehler: Projektverzeichnis nicht gefunden"; exit 1; }

# GitHub oder GitLab Repository-URL mit Token authentifizieren
gitRepoUrl=$(git config --get remote.origin.url)

# Prüfen, ob der API-Token vorhanden ist
if [ -n "$gitApiToken" ]; then
    if [[ "$gitRepoUrl" == https://* ]]; then
        AUTH_REPO_URL=$(echo "$gitRepoUrl" | sed -E "s#https://#https://oauth2:$gitApiToken@#")
    elif [[ "$gitRepoUrl" == git@* ]]; then
        echo "❌ Fehler: SSH-URLs werden nicht unterstützt, bitte https-URL verwenden!"
        exit 1
    else
        echo "❌ Fehler: Unbekannte Repository-URL!"
        exit 1
    fi
else 
    AUTH_REPO_URL = $gitRepoUrl
fi

echo -e "\n"
echo "Progress: 30%"
echo "🔄 Pull newst Version with Git Pull ..."
git pull "$AUTH_REPO_URL" main || { echo "❌ Fehler bei Git Pull"; exit 1; }

echo -e "\n"
echo "Progress: 45%"
echo "📦 Build all Docker-Containers ..."
docker compose -f ./docker-compose.prod.yml build --no-cache || { echo "❌ Fehler beim Builden der Container"; exit 1; }

echo -e "\n"
echo "Progress: 60%"
echo "🚀 Restart Docker-Container mainApp ..."
docker compose -f ./docker-compose.prod.yml down mainApp || { echo "❌ Fehler beim herunterfahren der Container"; exit 1; }
docker compose -f ./docker-compose.prod.yml rm -f mainApp || { echo "❌ Fehler beim löschen der Container"; exit 1; }
docker compose -f ./docker-compose.prod.yml up -d mainApp || { echo "❌ Fehler beim Neustart der Container"; exit 1; }

echo -e "\n"
echo "Progress: 75%"
echo "🚀 Restart Docker-Container mongodb ..."
docker compose -f ./docker-compose.prod.yml down mongodb || { echo "❌ Fehler beim herunterfahren der Container"; exit 1; }
docker compose -f ./docker-compose.prod.yml rm -f mongodb || { echo "❌ Fehler beim löschen der Container"; exit 1; }
docker compose -f ./docker-compose.prod.yml up -d mongodb || { echo "❌ Fehler beim Neustart der Container"; exit 1; }

echo -e "\n"
echo "Progress: 90%"
echo "🚀 Restart Docker-Container api ..."
docker compose -f ./docker-compose.prod.yml down api || { echo "❌ Fehler beim herunterfahren der Container"; exit 1; }
docker compose -f ./docker-compose.prod.yml rm -f api || { echo "❌ Fehler beim löschen der Container"; exit 1; }
docker compose -f ./docker-compose.prod.yml up -d api || { echo "❌ Fehler beim Neustart der Container"; exit 1; }


### Uncomment this and comment out the section below if updater should be updated
### ATTENTION: This will not work and will cause the updater to be stopped after script is finished  
# echo -e "\n"
# echo "Progress: 100%"
# echo "✅ Update abgeschlossen."
# echo "🚀 Starte Docker-Container neu..."
# docker compose -f ./docker-compose.prod.yml up -d updater || { echo "❌ Fehler beim Neustart der Container"; exit 1; }

echo -e "\n"
echo "Progress: 95%"
echo "🧹 System clean up Process..."
docker system prune -f || { echo "❌ Fehler beim Ausführen von docker system prune"; exit 1; }

### Uncomment this and comment out the docker compose up -d updater section if updater should not be updated
echo -e "\n"
echo "Progress: 100%"
echo "✅ Update finished."
