const express = require("express");
const { exec, spawn } = require("child_process");
const i18next = require('i18next');
const middleware = require('i18next-http-middleware');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require("cors");
const { logMessage } = require('./functions/logger');
const path = require('path');
const { Gitlab } = require('@gitbeaker/node');
const jwt = require('jsonwebtoken');
const LoginToken = require('./models/LoginToken');
const util = require("util");
const execPromise = util.promisify(exec);

const JWT_SECRET = process.env.JWT_SECRET || 'supergeheim';

const configDir = path.join(__dirname, 'data/config');
const configPath = path.join(__dirname, 'data/config/config.json');
const lockFilePath = path.join(__dirname, 'data/config/installed.lock');
const loginTokenDuration = process.env.LOGIN_TOKEN_DURATION || 99; // Beispiel: 1 Stunde (in Stunden), dies kann dynamisch gesetzt werden

const app = express();
const PORT = 3002; // Wähle einen Port für den Updater-Container

const gitApiToken = process.env.gitApiToken || "tokenMissing"
const gitRepo = process.env.gitRepo || "repoMissing"

app.use(cors());
app.use(express.json());

// Sprachdateien laden
i18next.use(middleware.LanguageDetector).init({
    fallbackLng: 'en',
    preload: ['en', 'de'],
    resources: {
        en: {
            translation: require('./locales/en.json')
        },
        de: {
            translation: require('./locales/de.json')
        }
    }
});

app.use(middleware.handle(i18next));

// **Middleware für Token-Prüfung**
const authMiddleware = (req, res, next) => {
        const token = req.headers['authorization'] || req.headers['Authorization'];

        // Überprüfen, ob der Authorization-Header vorhanden ist
        if (!token) {
            return res.status(401).json({ status: "error", message: req.t('token_required') });
        }

        // Überprüfen und Verifizieren des Tokens
        jwt.verify(token, JWT_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ status: "error", message: err });
            }

            // Den verifizierten Benutzer in die Request-Objekt setzen
            req.user = user;

            // Überprüfen, ob der Token in der DB existiert
            const loginToken = await LoginToken.findOne({ userId: user.id, token });

            if (!loginToken) {
                return res.status(401).json({ status: "error", message: 'token_not_found' });
            }

            // Berechnung des Zeitunterschieds
            const tokenCreatedAt = new Date(loginToken.createdAt);
            const tokenExpirationTime = new Date(tokenCreatedAt.getTime() + loginTokenDuration * 60 * 60 * 1000); // $tokenDuration Stunden

            // Prüfen, ob der Token abgelaufen ist
            if (new Date() > tokenExpirationTime) {
                return res.status(401).json({ status: "logout", message: req.t('token_expired') });
            }

            // Token ist gültig und nicht abgelaufen
            next(); // Weiter mit der nächsten Middleware oder dem Handler
        });
};

app.use(authMiddleware);


const actionLogger = async (req, res, next) => {

  try {
      let userId = null; // Standardmäßig kein User (falls nicht authentifiziert)

      // Prüfen, ob ein Authorization-Token vorhanden ist
      const token = req.headers['authorization'];

      if (token) {

          try {
              const decoded = jwt.verify(token, JWT_SECRET);
              const user = await User.findOne({ _id: decoded.id });

              if (user) {
                  userId = user._id; // User-ID speichern
              }
          } catch (err) {
              logMessage("warn", req.t('error_decoding_token') + err.message);
          }
      }

      // Log speichern
      try {
          await ActionLog.create({
              userId,
              method: req.method,
              route: req.originalUrl,
              requestBody: Object.keys(req.body).length ? req.body : undefined
          });
      }
      catch (err) {
          logMessage("error", err)
      }

  } catch (error) {
      logMessage("error", req.t('error_logging') + error);
  }

  next();
};

try {
  if (fs.existsSync(lockFilePath)) {
      try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (config && config.database.type && config.database.type === 'mongodb') {
                  const mongoUri = `mongodb://${config.database.user}:${config.database.password}@${config.database.host}/${config.database.name}`;
                  logMessage("info", `🔗 Verbinde mit MongoDB: ${mongoUri}`);
                  
                  mongoose.connect(mongoUri, {
                  authSource: "admin"
              });

              const conn = mongoose.connection;
              
              conn.once('open', () => {
                  logMessage("info", '✅ MongoDB erfolgreich verbunden!');
                  
                  // Action Logger nur initialisieren wenn eine DB Connection besteht
                  app.use(actionLogger)
              
              });
              
              conn.on('error', (err) => {
                  logMessage("error", 'mongodb_connection_error ' + err);
              });

          }
      } catch (error) {
          logMessage("error", req.t('error_reading_config') + error);
      }
  } else {
      logMessage("info", '📌 Installation nicht abgeschlossen. Datenbankverbindung wird nicht hergestellt.');
  }
} catch (error) {
  logMessage("error", 'error_reading_config ' + error);
}

// Middleware zur Sprachauswahl basierend auf Token
app.use(async (req, res, next) => {
  const token = req.headers['authorization'];
  if (token) {
      try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const user = await User.findById(decoded.id);
          if (user && user.language) {
              req.language = user.language;
              req.i18n.changeLanguage(user.language); // Richtig die Sprache für die Anfrage setzen
          } else {
              req.language = 'en';
              req.i18n.changeLanguage('en');
          }
      } catch (error) {
          req.language = 'en';
          req.i18n.changeLanguage('en');
      }
  } else {
      req.language = 'en';
      req.i18n.changeLanguage('en');
  }
  next();
});

app.use(cors());

app.post("/update", (req, res) => {
  exec("/bin/bash /usr/src/app/update.sh", (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Update Fehler: ${stderr}`);
      return res.status(500).json({ status: "error", message: req.t('update_failed') });
    }
    res.json({ status: "success", message: req.t('update_successfull') });
  });
});


app.get("/update/stream", (req, res) => {
    // SSE-Header setzen
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
  
    // Starte den Update-Prozess (update.sh)
    const updateProcess = spawn("bash", ["/usr/src/app/update.sh"]);
  
    // Stream stdout
    updateProcess.stdout.on("data", (data) => {
      res.write(`data: ${data.toString()}\n\n`);
    });
  
    // Stream stderr
    updateProcess.stderr.on("data", (data) => {
      res.write(`data: ${data.toString()}\n\n`);
    });
  
    // Bei Prozessende
    updateProcess.on("close", (code) => {
      res.write(`data: Update abgeschlossen mit Code ${code}\n\n`);
      res.end();
    });
});

// ✅ Aktuelle lokale Version abrufen
const getLocalVersion = () => {
    return new Promise((resolve, reject) => {
        exec("git rev-list --count HEAD", { cwd: "/dockerProject", shell: true }, (error, stdout) => {
            if (error) return reject(error);
            const commits = parseInt(stdout.trim(), 10); // stdout in eine Zahl umwandeln
            const result = (commits / 100).toFixed(2); // durch 100 teilen, 2 Nachkommastellen, Punkt durch Komma ersetzen
            resolve(result);
        });
    });
};

const getRemoteVersion = async () => {
    try {
        if (!gitApiToken) {
            throw new Error("❌ Fehler: GIT_API_TOKEN ist nicht gesetzt!");
        }

        const projectDir = "/dockerProject";

        
        // Remote-URL aus Git-Config abrufen
        const { stdout: gitRepoUrlRaw } = await execPromise("git config --get remote.origin.url", { cwd: projectDir, shell: true });
        const gitRepoUrl = gitRepoUrlRaw.trim();
        
        if (!gitRepoUrl) {
            throw new Error("❌ Fehler: Konnte die Repository-URL nicht ermitteln!");
        }
        
        let authRepoUrl = "";
        if (gitRepoUrl.startsWith("https://")) {
            authRepoUrl = gitRepoUrl.replace(/^https:\/\//, `https://oauth2:${gitApiToken}@`);
        } else if (gitRepoUrl.startsWith("git@")) {
            throw new Error("❌ Fehler: SSH-URLs werden nicht unterstützt, bitte https-URL verwenden!");
        } else {
            throw new Error("❌ Fehler: Unbekannte Repository-URL!");
        }
        
        // Zuerst das Repository aktualisieren
        await execPromise(`git fetch ${authRepoUrl}`, { cwd: projectDir, shell: true });

        // Anzahl der Commits im Online-Repo holen
        const { stdout: commitCountRaw } = await execPromise(`git ls-remote ${authRepoUrl} refs/heads/main | cut -f1`, { cwd: projectDir, shell: true });
        const latestCommitHash = commitCountRaw.trim();
        if (!latestCommitHash) {
            throw new Error("❌ Fehler: Konnte die letzte Commit-Hash nicht abrufen!");
        }

        // Jetzt zählen, wie viele Commits es bis zu diesem Hash gibt
        const { stdout: remoteCommitCountRaw } = await execPromise(`git rev-list --count ${latestCommitHash}`, { cwd: projectDir, shell: true });
        const remoteCommitCount = remoteCommitCountRaw.trim();

        const commits = parseInt(remoteCommitCount.trim(), 10); // stdout in eine Zahl umwandeln
        const result = (commits / 100).toFixed(2); // durch 100 teilen, 2 Nachkommastellen, Punkt durch Komma ersetzen
        return result;
    } catch (error) {
        throw new Error(`❌ Fehler beim Abrufen der Remote-Version: ${error.message}`);
    }
};

// ✅ API-Route zum Update-Check
app.get("/checkUpdate", async (req, res) => {
    try {
        const localVersion = await getLocalVersion();
        const remoteVersion = await getRemoteVersion();
        if (!remoteVersion) return res.status(500).json({ status: "error", message: req.t('error_getting_github_version') });

        const updateAvailable = localVersion !== remoteVersion;

        res.json({ updateAvailable, localVersion, remoteVersion });
    } catch (error) {
        console.error("❌ Fehler beim Update-Check:", error);
        res.status(500).json({ status: "error", message: req.t("update_check_failed") });
    }
});

app.listen(PORT, () => console.log(`✅ Updater API läuft auf Port ${PORT}`));
