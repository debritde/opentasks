// version 1
const express = require('express');
const fs = require('fs');
const path = require('path');
const { setupDatabase } = require('./functions/database');
const { logMessage } = require('./functions/logger');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ldap = require('ldapjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage').GridFsStorage;
const Grid = require('gridfs-stream');
const { Readable } = require('stream');
const { GridFSBucket } = require('mongodb');
const { createGzip, createGunzip } = require('zlib');
const { MongoClient, ObjectId } = require('mongodb'); // ObjectId hinzufügen
const crypto = require('crypto');
const nodemailer = require('nodemailer');

function bytesToBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
}
const User = require('./models/User');
const LoginToken = require('./models/LoginToken');
const Group = require('./models/Group');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Mail2Ticket = require('./models/Mail2Ticket');
const Comment = require('./models/Comment');
const TimeTracking = require('./models/TimeTracking');
const ActionLog = require('./models/ActionLog');
const Config = require('./models/Config');
const TaskCustomField = require('./models/TaskCustomFields'); // TaskCustomField-Model

const cors = require("cors");
const app = express();
const PORT = 3001
const configDir = path.join(__dirname, 'data/config');
const configPath = path.join(__dirname, 'data/config/config.json');
const lockFilePath = path.join(__dirname, 'data/config/installed.lock');
const JWT_SECRET = process.env.JWT_SECRET || 'supergeheim';
const appName = process.env.appName || "openTasks"
const loginTokenDuration = process.env.LOGIN_TOKEN_DURATION || 99; // Beispiel: 1 Stunde (in Stunden), dies kann dynamisch gesetzt werden
const BACKUP_DIR = path.join(__dirname, 'data/backups');
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"; // URL des Frontends, kann in der .env Datei gesetzt werden
const i18next = require('i18next');
const middleware = require('i18next-http-middleware');

app.use(cors());

app.use(express.json());

app.use((req, res, next) => {
        logMessage("info", "NEW REQUEST TO URL: " + `${req.protocol}://${req.get('host')}${req.originalUrl}`);
        next();
    })
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

// **Middleware für Token-Prüfung**
const authMiddleware = (req, res, next) => {
    // Endpunkte, die KEIN Token benötigen:
    const openEndpoints = [
        "/install",
        "/register",
        "/login",
        "/check-installed",
        "/users/accept-invite"
    ];
    // Auch POST /users/accept-invite erlauben
    if (
        (openEndpoints.includes(req.url) && req.method === "POST") ||
        (req.url === "/check-installed" && req.method === "GET")
    ) {
        return next();
    }
    else if (!fs.existsSync(lockFilePath)) {
        res.redirect("/install")
    }
    else{
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
    }
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


// Prüfen, ob die Installation abgeschlossen ist
// Wenn Ja dann mongoDB verbinden
let gfsBucket;
let upload;

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
                    
                    // GridFSBucket initialisieren
                    gfsBucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
                    logMessage("info", '📂 GridFSBucket initialisiert!');

                    // Multer-Speicher (Dateien erst in RAM speichern, dann in GridFS schreiben)
                    const storage = multer.memoryStorage();
                    upload = multer({ storage });
                    
                    logMessage("info", '🚀 Multer-Upload bereit!');
                    
                    // Action Logger nur initialisieren wenn eine DB Connection besteht
                    app.use(actionLogger)
                
                });
                
                conn.on('error', (err) => {
                    logMessage("error", 'mongodb_connection_error' + err);
                });

            }
        } catch (error) {
            logMessage("error", req.t('error_reading_config') + error);
        }
    } else {
        logMessage("info", '📌 Installation nicht abgeschlossen. Datenbankverbindung wird nicht hergestellt.');
    }
} catch (error) {
    logMessage("error", req.t('error_reading_config') + error);
}

// GridFS initialisieren
if (fs.existsSync(lockFilePath)) {
    const conn = mongoose.connection;
    let gfs;
    
    conn.once('open', () => {
        gfs = Grid(conn.db, mongoose.mongo);
        gfs.collection('uploads'); // Benenne die Collection für Dateien
    });

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    const mongoUri = `mongodb://${config.database.user}:${config.database.password}@${config.database.host}:27017/${config.database.name}`
    // GridFS-Speicher für Multer einrichten
    const storage = new GridFsStorage({
        url: mongoUri,
        file: (req, file) => {
            return {
                filename: file.originalname,
                bucketName: 'uploads' // Muss mit `gfs.collection('uploads')` übereinstimmen
            };
        }
    });

    const upload = multer({ storage });
}

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    logMessage("info", `Folder '${BACKUP_DIR}' created.`);
} else {
    logMessage("info", `Folder '${BACKUP_DIR}' already exists.`);
}

// Prüfen, ob der Ordner existiert
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true }); // Erstellt den Ordner, falls er fehlt
    logMessage("info", '📂 Ordner "config" wurde erstellt.');
} else {
    logMessage("info", '✅ Ordner "config" existiert bereits.');
}

// Hilfsfunktion zur Datenbankverbindung
const getDatabaseConnection = async (dbConfig) => {
    const { MongoClient } = require('mongodb');
    const uri = `mongodb://${encodeURIComponent(dbConfig.user)}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}/${dbConfig.name}`;
    const client = new MongoClient(uri, { authSource: "admin" });
    await client.connect();
    return client.db(dbConfig.name);
};

// INSTALLATION ENDPOINT

const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
};

app.post('/install', async (req, res) => {
    logMessage('info', 'Installationsprozess gestartet...');

    if (fs.existsSync(lockFilePath)) {
        logMessage('error', req.t('installation_already_done'));
        return res.status(400).json({ status: "error", message: req.t('installation_already_done') });
    }

    let config = {};
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    const newConfig = {
        database: {
            type: req.body.databaseType || config.database?.type || 'mongodb',
            host: req.body.databaseHost || config.database?.host || 'localhost',
            user: req.body.databaseUser || config.database?.user || 'root',
            password: req.body.databasePassword || config.database?.password || '',
            name: req.body.databaseName || config.database?.name || 'openTasks',
        }
    };

    logMessage("info", newConfig);
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4));
    logMessage('success', 'Konfigurationsdatei gespeichert');

    try {
        await setupDatabase(newConfig.database);
        
        // Benutzer anlegen
        const adminUsername = req.body.adminUsername;
        let hashedAdminPassword = req.body.hashedAdminPassword;
        let adminPassword = req.body.adminPassword;
        if (!hashedAdminPassword) {
            hashedAdminPassword = await hashPassword(adminPassword)
        }

        if (!adminUsername || (!hashedAdminPassword && !adminPassword)) {
            return res.status(400).json({ status: "error", message: "Benutzername und Passwort sind erforderlich." });
        }

        // Datenbankverbindung herstellen und Admin-Benutzer speichern
        const db = await getDatabaseConnection(newConfig.database);
        const usersCollection = db.collection('User');

        await User.insertOne({ 
            username: adminUsername, 
            password: hashedAdminPassword	, // 🔥 bcrypt-gehashter Wert
            isAdmin: true,
            createdAt: new Date() 
        });

        logMessage('success', `Benutzer ${adminUsername} erfolgreich erstellt.`);
        
        fs.writeFileSync(lockFilePath, 'installed');

        logMessage('success', 'Installation erfolgreich abgeschlossen');
        return res.json({ status: "success", message: req.t('installation_success') });
    } catch (error) {
        logMessage('error', req.t('error_while_installing') + error);
        return res.status(500).json({ status: "error", message: req.t('installation_error'), error: error });
    }
});




app.get('/check-installed', (req, res) => {
    try{
console.log(lockFilePath)
        if (fs.existsSync(lockFilePath)) {
            res.json({ status: 'installed' });
        } else {
            res.json({ status: 'not_installed' });
        }
    }
    catch (err) {
        console.log(err)
        res.json({ status: 'error', message: err });

    }
});

// ✅ **LOGIN (E-Mail/Passwort oder LDAP)**
app.use(express.json());

app.post('/login', async (req, res) => {
    const { username, passwordHash, twoFactorCode } = req.body; // Expect hashed password
    const email = username;
    const user = await User.findOne({ username });
    
    if (!user) {
        return res.status(400).json({ status: "error", message: req.t('user_not_found') });
    }

    // ✅ **LDAP Authentication remains unchanged**
    if (user.isLDAPUser) {
        authenticateLDAP(email, passwordHash, async (err, success) => {
            if (err || !success) {
                return res.status(400).json({ status: "error", message: req.t('ldap_authentication_failed') });
            }

            let ldapUser = await User.findOne({ email });
            if (!ldapUser) {
                ldapUser = new User({ email, isLDAPUser: true });
                await ldapUser.save();
            }

            const token = jwt.sign({ id: ldapUser._id }, JWT_SECRET, { expiresIn: '1h' });

            const loginToken = new LoginToken({
                userId: ldapUser._id,
                token: token,
                createdAt: new Date()
            });
            await loginToken.save();

            return res.json({ status: "success", token: token });
        });

        return;
    }

    // ✅ **Hash Comparison using SHA-512**
    try {
        if (passwordHash !== user.password) {  // Compare stored SHA-512 hash
            return res.status(400).json({ status: "error", message: req.t('password_wrong') });
        }
    } catch (error) {
        return res.status(500).json({ status: "error", message: "Fehler bei der Passwortprüfung: " + error });
    }

    // ✅ **2FA Verification**
    if (user.twoFactorActivated) {
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: twoFactorCode
        });

        if (!verified) {
            return res.status(400).json({ status: "error", message: req.t('2fa_invalid') });
        }
    }

    // ✅ **JWT Token Generation**
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: `${loginTokenDuration}h` });

    const loginToken = new LoginToken({
        userId: user._id,
        token: token,
        createdAt: new Date()
    });
    await loginToken.save();

    return res.json({ status: "success", token: token });
});

app.post("/verify-token", async (req, res) => {
    const token = req.body.token;

    if (!token) {
        return res.status(400).json({ status: "error", message: "Token fehlt." });
    }

    try {
        // Token entschlüsseln
        const decoded = jwt.verify(token, JWT_SECRET);

        // Token in der Datenbank überprüfen
        const tokenRecord = await LoginToken.findOne({ token });
        if (!tokenRecord) {
            return res.status(401).json({ status: "error", message: "Ungültiger Token." });
        }

        // Benutzer abrufen
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ status: "error", message: "Benutzer nicht gefunden." });
        }

        return res.json({
            status: "success",
            userId: user._id,
            username: user.username,
        });
    } catch (error) {
        return res.status(401).json({ status: "error", message: "Token ungültig oder abgelaufen." });
    }
});



// ✅ **GESCHÜTZTE ROUTE (`GET /me`)**
app.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        console.log("DEBUG 1")
        console.log(authHeader)

        if (!authHeader) {
            return res.status(401).json({ status: "error", message: "Authorization token missing or malformed" });
        }
        console.log("DEBUG 2")

/*         const token = authHeader.split(' ')[1];
 */
        // Finde das Login-Token in der Datenbank
        const loginToken = await LoginToken.findOne({ token: authHeader });

        if (!loginToken) {
            return res.status(401).json({ status: "error", message: "Invalid or expired token" });
        }

        // Finde den Benutzer basierend auf der userId im Token
        const user = await User.findById(loginToken.userId);
        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        res.json({
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.username,
            email: user.email,
            phoneNumber: user.phoneNumber,
            registerDate: user.registerDate,
            isLDAPUser: user.isLDAPUser,
            twoFactorActivated: user.twoFactorActivated,
            image: user.image
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('get_user_error') });
    }
});

// ✅ **GESCHÜTZTE ROUTE (`PUT /me`)**
app.put('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader) {
            return res.status(401).json({ status: "error", message: "Authorization token missing or malformed" });
        }

        // Finde das Login-Token in der Datenbank
        const loginToken = await LoginToken.findOne({ token: authHeader });
        if (!loginToken) {
            return res.status(401).json({ status: "error", message: "Invalid or expired token" });
        }

        // Finde den Benutzer basierend auf der userId im Token
        let user = await User.findById(loginToken.userId);
        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        // Nur die Felder aktualisieren, die der Benutzer übermittelt hat
        const allowedUpdates = ["firstname", "lastname", "username", "email", "phoneNumber", "language", "image"];
        Object.keys(req.body).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                user[key] = req.body[key];
            }
        });

        await user.save();

        res.json({ status: "success", message: "User updated successfully", user });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('update_user_error') });
    }
});

// Benutzer anzeigen
app.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, '_id username firstname lastname email phoneNumber groups isAdmin').select('-password');;
        res.json({ status: 'success', users });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Fehler beim Abrufen der Benutzer', error: error.message });
    }
});

// Benutzer mit spezifischer ID abrufen
app.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id, '_id username firstname lastname email');

        if (!user) {
            return res.status(404).json({ status: 'error', message: 'Benutzer nicht gefunden' });
        }

        res.json({ status: 'success', user });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Fehler beim Abrufen des Benutzers', error: error.message });
    }
});


// Benutzer anhand des Login-Tokens abrufen
app.post('/users/byLoginToken', async (req, res) => {
    try {
        const { loginToken } = req.body;
        if (!loginToken) {
            return res.status(400).json({ status: 'error', message: 'Login-Token erforderlich' });
        }
        
        // Token in der LoginToken-Collection suchen
        const loginTokenEntry = await LoginToken.findOne({ token: loginToken });
        if (!loginTokenEntry) {
            return res.status(404).json({ status: 'error', message: 'Benutzer nicht gefunden' });
        }

        // Benutzer anhand der userId in der Users-Collection suchen
        const user = await User.findOne({ _id: loginTokenEntry.userId }).select('-password');
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'Benutzer nicht gefunden' });
        }

        res.json({ status: 'success', user });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Fehler beim Abrufen des Benutzers', error: error.message });
    }
});

// Benutzer erstellen
app.post('/user/create', async (req, res) => {
    try {
        const { firstname, lastname, username, email, phoneNumber, password, language, isAdmin } = req.body;

        if (!username || !password) {
            return res.status(400).json({ status: "error", message: req.t('missing_required_fields') });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ status: "error", message: req.t('user_already_exists') });
        }

        const newUser = new User({
            firstname,
            lastname,
            username,
            email,
            phoneNumber,
            password: password,
            language: language || 'en',
            isAdmin: isAdmin || false
        });
        await newUser.save();
        await delete newUser['password'];
        newUser.password = ""
        res.json({ status: "success", message: req.t('user_created'), user: newUser });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_creating_user'), error: error.message });
    }
});

app.post('/users/invite', async (req, res) => {
    const { email, username } = req.body;
    if (!email || !username) {
        return res.status(400).json({ status: 'error', message: 'Email und Username erforderlich.' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
        return res.status(400).json({ status: 'error', message: 'Nutzer existiert bereits.' });
    }
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h gültig

    const user = new User({
        username,
        email,
        invited: true,
        inviteToken,
        inviteExpires,
        isAdmin: false,
        password: crypto.randomBytes(64).toString('hex'), // Dummy-Passwort setzen!
        createdAt: new Date()
    });
    await user.save();

    // SMTP Settings aus der Config laden
    const smtpConfigEntry = await Config.findOne({ configName: 'systemsmtpsettings' });
    if (!smtpConfigEntry || !smtpConfigEntry.configValue) {
        return res.status(500).json({ status: 'error', message: 'SMTP-Konfiguration fehlt.' });
    }
    const smtpConfig = smtpConfigEntry.configValue;

    // E-Mail-Versand mit gespeicherten SMTP-Settings
    const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass
        }
    });
    const inviteLink = `${FRONTEND_URL}/invite/${inviteToken}`;
    await transporter.sendMail({
        from: `"OpenTasks" <${smtpConfig.user}>`,
        to: email,
        subject: 'You are invited to OpenTasks!',
        html: `
            <div style="font-family: Arial, sans-serif; background: #f6f8fa; padding: 10px;">
                <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 25px;">
                    <h2 style="color: #2d7ff9; margin-top: 0;">Welcome to OpenTasks!</h2>
                    <p style="font-size: 16px; color: #333;">
                        Hello,<br>
                        You have been invited to join <b>OpenTasks</b> as <b>${username}</b>.
                    </p>
                    <p style="font-size: 16px; color: #333;">
                        To activate your account and set your password, please click the button below:
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${inviteLink}" style="background: #2d7ff9; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 18px; font-weight: bold; display: inline-block;">
                            Set your password
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #888;">
                        If the button does not work, copy and paste this link into your browser:<br>
                        <a href="${inviteLink}" style="color: #2d7ff9;">${inviteLink}</a>
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
                    <p style="font-size: 12px; color: #aaa; text-align: center;">
                        This invitation is valid for 24 hours.<br>
                        If you did not expect this email, you can ignore it.
                    </p>
                </div>
            </div>
        `
    });

    res.json({ status: 'success', message: 'invite_sent' });
});

app.post('/users/accept-invite', async (req, res) => {
    const { token, password, firstname, lastname, phoneNumber, language } = req.body;
    const user = await User.findOne({ inviteToken: token, inviteExpires: { $gt: new Date() } });
    if (!user) {
        return res.status(400).json({ status: 'error', message: 'Ungültiger oder abgelaufener Token.' });
    }
    user.password = await hashPassword(password);
    user.invited = false;
    user.inviteToken = undefined;
    user.inviteExpires = undefined;
    if (firstname) user.firstname = firstname;
    if (lastname) user.lastname = lastname;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (language) user.language = language;
    await user.save();
    res.json({ status: 'success', message: 'Passwort gesetzt. Du kannst dich jetzt anmelden.' });
});

// Benutzerprofil aktualisieren
app.put('/ownUser/update', async (req, res) => {
    try {
        const token = req.headers['authorization'];
        if (!token) {
            return res.status(401).json({ status: "error", message: req.t('token_required') });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ status: "error", message: req.t('user_not_found') });
        }

        const { firstname, lastname, email, phoneNumber, language } = req.body;

        if (firstname) user.firstname = firstname;
        if (lastname) user.lastname = lastname;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (language) user.language = language;

        await user.save();

        res.json({ status: "success", message: req.t('user_updated'), user });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_updating_user'), error: error.message });
    }
});

// Passwort ändern (Eigenes Benutzerprofil)
app.post('/ownUser/change-password', async (req, res) => {
    try {
        const token = req.headers['authorization'];
        if (!token) {
            return res.status(401).json({ status: "error", message: req.t('token_required') });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ status: "error", message: req.t('user_not_found') });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ status: "error", message: req.t('fill_all_password_fields') });
        }
        if (user.password !== currentPassword) {
            return res.status(400).json({ status: "error", message: req.t('password_wrong') });
        }
        user.password = newPassword;
        await user.save();
        res.json({ status: "success", message: req.t('password_changed_success') });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_updating_user'), error: error.message });
    }
});

// Fremden Benutzer aktualisieren
app.put('/user/update/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { firstname, lastname, email, phoneNumber, language, password, isAdmin } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ status: "error", message: req.t('user_not_found') });
        }

        if (firstname) user.firstname = firstname;
        if (lastname) user.lastname = lastname;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (language) user.language = language;
        if (password) user.password = password;
        user.isAdmin = isAdmin;

        await user.save();
        user.password = ""
        res.json({ status: "success", message: req.t('user_updated'), user });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_updating_user'), error: error.message });
    }
});

// Benutzer löschen
app.delete('/user/:id', async (req, res) => {
    try {
        const userId = req.params.id
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ status: "error", message: req.t('user_not_found') });
        }

        res.json({ status: "success", message: req.t('user_deleted') });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_deleting_user'), error: error.message });
    }
});

// **LDAP-Authentifizierung**
function authenticateLDAP(email, password, callback) {
    const client = ldap.createClient({ url: process.env.LDAP_URL || 'ldap://ldap.example.com' });
    const userDn = `cn=${email},${process.env.LDAP_BASE_DN || 'dc=example,dc=com'}`;
    client.bind(userDn, password, (err) => {
        if (err) {
            logMessage("error", 'ldap_authentication_failed' + err);
            return callback(err, false);
        }
        logMessage("info", '✅ LDAP-Login erfolgreich');
        callback(null, true);
    });
}


// **API Endpoint für Benutzerberechtigungen**
app.get('/user/permissions', async (req, res) => {
    try {
        const token = req.headers.authorization || req.headers.Authorization;

        const tokenRecord = await LoginToken.findOne({ token }).populate('userId');
        if (!tokenRecord) {
            return res.status(401).json({ status: 'error', message: req.t('invalid_token') });
        }

        const user = await User.findById(tokenRecord.userId).populate('groups');
        if (!user) {
            return res.status(404).json({ status: 'error', message: req.t('user_not_found') });
        }

        const permissions = user.groups.flatMap(group => group.permissions);
        const isAdmin = user.isAdmin
        res.json({ status: 'success', permissions, isAdmin });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_fetching_permissions'), error: error.message });
    }
});


// Suchfunktion für Benutzer
app.get('/user/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ status: "error", message: req.t('search_query_required') });
        }

        const users = await User.find({
            $or: [
                { firstname: { $regex: query, $options: 'i' } },
                { lastname: { $regex: query, $options: 'i' } },
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).select('-password'); // Passwort nicht zurückgeben

        res.json({
            status: "success",
            results: users
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_searching_users'), error: error.message });
    }
});

app.post('/enable-2fa', async (req, res) => {
    try {
        const { userId } = req.body;
        logMessage("info", userId)
        const user = await User.findOne({ _id: userId });

        if (!user) {
            return res.status(404).json({ status: "error", message: req.t('user_not_found') });
        }

        // TOTP-Secret generieren
        const secret = speakeasy.generateSecret({ length: 20 });

        // Secret in der DB speichern
        user.twoFactorSecret = secret.base32;
        user.twoFactorActivated = true;
        await user.save();

        // QR-Code für Google Authenticator generieren
        logMessage("info", secret)
        const otpAuthUrl = speakeasy.otpauthURL({ secret: secret.ascii, label: `${appName}: ${user.username}` });
        qrcode.toDataURL(otpAuthUrl, (err, dataUrl) => {
            if (err) {
                return res.status(500).json({ status: "error", message: req.t('qrcode_creation_error') });
            }

            res.json({ message: req.t('2fa_activated'), qrCode: dataUrl });
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('2fa_activation_error'), error: error.message });
    }
});


// **Gruppe erstellen**
app.post('/groups', async (req, res) => {
    try {
        const { name, permissions, members } = req.body;
        if (!name) {
            return res.status(400).json({ status: 'error', message: req.t('groupname_required') });
        }
        
        // Gruppe erstellen
        const group = new Group({ name, permissions, members });
        await group.save();
        
        // Mitglieder updaten und Gruppen-ID hinzufügen
        await User.updateMany(
            { _id: { $in: members } }, 
            { $addToSet: { groups: group._id } } // $addToSet stellt sicher, dass keine Duplikate entstehen
        );

        res.json({ status: 'success', message: req.t('group_created'), group });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('group_creation_error'), error: error.message });
    }
});


// **Gruppe bearbeiten**
app.put('/groups/:id', async (req, res) => {
    try {
        const { name, permissions } = req.body;
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ status: 'error', message: req.t('group_not_found') });
        }
        
        if (name) group.name = name;
        group.permissions = permissions;
        await group.save();
        
        res.json({ status: 'success', message: req.t('group_updated'), group });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('group_update_error'), error: error.message });
    }
});

// **Gruppe löschen**
app.delete('/groups/:id', async (req, res) => {
    try {
        const group = await Group.findByIdAndDelete(req.params.id);
        if (!group) {
            return res.status(404).json({ status: 'error', message: req.t('group_not_found') });
        }
        res.json({ status: 'success', message: req.t('group_deleted') });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('group_delete_error'), error: error.message });
    }
});

// **Alle Gruppen abrufen**
app.get('/groups', async (req, res) => {
    try {
        const groups = await Group.find();
        res.json({ status: 'success', groups });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('group_get_error'), error: error.message });
    }
});

// **Benutzer einer Gruppe hinzufügen**
app.post('/groups/:id/add-user', async (req, res) => {
    try {
        const { userId } = req.body;
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ status: 'error', message: req.t('group_not_found') });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: req.t('user_not_found') });
        }

        // Sicherstellen, dass `groups` existiert
        if (!Array.isArray(user.groups)) {
            user.groups = [];
        }

        // Prüfen, ob Benutzer bereits in der Gruppe ist
        if (user.groups.includes(group._id)) {
            return res.status(400).json({ status: 'error', message: req.t('user_already_in_group') });
        }
        // Benutzer zur Gruppe hinzufügen
        user.groups.push(group._id);
        await user.save();

        res.json({ status: 'success', message: req.t('user_added_to_group'), group: group.name });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'error_adding_user', error: error.message });
    }
});


app.put('/groups/:id/update-members', async (req, res) => {
    try {
        const { userIds } = req.body; // Liste der Benutzer-IDs, die in der Gruppe sein sollen
        const groupId = req.params.id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ status: 'error', message: req.t('group_not_found') });
        }

        // Alle Benutzer der Gruppe abrufen
        const currentUsers = await User.find({ groups: groupId });
        const currentUserIds = currentUsers.map(user => user._id.toString());


        // Benutzer, die entfernt werden sollen
        const usersToRemove = currentUserIds.filter(id => !userIds.includes(id));

        // Benutzer, die hinzugefügt werden sollen
        const usersToAdd = userIds.filter(id => !currentUserIds.includes(id));

        // Entfernen der Benutzer aus der Gruppe
        if (usersToRemove.length > 0) {
            await User.updateMany(
                { _id: { $in: usersToRemove } },
                { $pull: { groups: groupId } }
            );
        }

        // Neue Benutzer zur Gruppe hinzufügen
        if (usersToAdd.length > 0) {
            await User.updateMany(
                { _id: { $in: usersToAdd } },
                { $addToSet: { groups: groupId } }
            );
        }

        // Überprüfung nach der Änderung
        const updatedUsers = await User.find({ groups: groupId });

        res.json({ status: 'success', message: req.t('group_members_updated'), groupId });
    } catch (error) {
        console.error("Fehler beim Aktualisieren der Gruppenmitglieder:", error);
        res.status(500).json({ status: 'error', message: req.t('group_update_error'), error: error.message });
    }
});



// **Benutzer aus einer Gruppe entfernen**

app.post('/groups/:id/remove-user', async (req, res) => {
    try {
        const { userId } = req.body;
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ status: 'error', message: req.t('group_not_found') });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: req.t('user_not_found') });
        }
        
        // Sicherstellen, dass `groups` existiert
        if (!Array.isArray(user.groups)) {
            user.groups = [];
        }

        // Prüfen, ob Benutzer in der Gruppe ist
        if (!user.groups.includes(group._id)) {
            return res.status(400).json({ status: 'error', message: req.t('user_not_in_group') });
        }

        // Benutzer aus der Gruppe entfernen
        user.groups = user.groups.filter(g => g.toString() !== group._id.toString());
        await user.save();

        res.json({ status: 'success', message: 'user_removed_from_group', group: group.name });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'user_remove_error', error: error.message });
    }
});



// **Projekt erstellen**
app.post('/projects', async (req, res) => {
    try {
        const { title, description, deadline, members, isServiceDesk, status, isDone } = req.body;
        if (!title || !description) {
            return res.status(400).json({ status: 'error', message: req.t('projects_values_required') });
        }

        // Token aus dem Header auslesen
        const token = req.headers.authorization || req.headers.Authorization;

        // Token in der Datenbank überprüfen
        const tokenRecord = await LoginToken.findOne({ token });

        if (!tokenRecord) {
            return res.status(401).json({ status: 'error', message: req.t('invalid_token') });
        }
        // Ersteller-ID setzen
        const creatorId = tokenRecord.userId;

        // Prüfen, ob alle Mitglieder existieren
        const users = await User.find({ _id: { $in: members } });
        if (users.length !== members.length) {
            return res.status(400).json({ status: 'error', message: req.t('one_or_more_users_not_exist') });
        }

        const project = new Project({
            title,
            description,
            deadline,
            members, 
            status,
            isDone,
            isServiceDesk,
            creatorId // Speichern des Erstellers
        });
        await project.save();

        res.json({ status: 'success', message: req.t('project_created'), project });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_creating_project'), error: error.message });
    }
});


// **API Endpoint für eigene Projekte**const mongoose = require('mongoose');
app.get('/projects/own', async (req, res) => {
    try {
        const token = req.headers.authorization || req.headers.Authorization;
        console.log("Received Token: ", token);  // Log token for debugging
        
        const tokenRecord = await LoginToken.findOne({ token });
        if (!tokenRecord) {
            return res.status(401).json({ status: 'error', message: req.t('invalid_token') });
        }

        const userId = tokenRecord.userId.toString();  // userId ist hier als String, keine Umwandlung in ObjectId nötig

        const projects = await Project.find({
            $or: [
                { creatorId: userId },  // creatorId als String behandeln
                { members: userId }
            ]
        });

        console.log("Found Projects: ", projects);  // Ausgabe für Debugging
        
        if (projects.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No projects found' });
        }
        
        res.json({ status: 'success', projects });
    } catch (error) {
        console.error("Error fetching projects: ", error);  // Fehlerprotokollierung
        res.status(500).json({ status: 'error', message: req.t('error_fetching_projects'), error: error.message });
    }
});




// **Projekt bearbeiten**
app.put('/projects/:id', async (req, res) => {
    try {
        const { title, description, deadline, members, isServiceDesk, status, isDone } = req.body;
        const project = await Project.findById(req.params.id);
        console.log('LOADED PROJECT:', project.toObject());
        console.log(project)
        if (!project) {
            return res.status(404).json({ status: 'error', message: req.t('project_not_found') });
        }

        if (title) project.title = title;
        if (description) project.description = description;
        if (deadline) project.deadline = deadline;
        if (members) {
            const users = await User.find({ _id: { $in: members } });
            if (users.length !== members.length) {
                return res.status(400).json({ status: 'error', message: req.t('one_or_more_users_not_exist') });
            }
            project.members = members;
        }
        project.isServiceDesk = isServiceDesk;
        project.status = status;
        project.isDone = isDone;
        await project.save();
        res.json({ status: 'success', message: 'Projekt aktualisiert', project });
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 'error', message: req.t('error_updating_project'), error: error.message });
    }
});

// **Projekt löschen**
app.delete('/projects/:id', authMiddleware, async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) {
            return res.status(404).json({ status: 'error', message: req.t('project_not_found') });
        }
        res.json({ status: 'success', message: 'Projekt gelöscht' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_deleting_project'), error: error.message });
    }
});

// **Alle Projekte abrufen**
app.get('/projects', authMiddleware, async (req, res) => {
    try {
        const projects = await Project.find().populate('members', 'firstname lastname username');
        res.json({ status: 'success', projects });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_get_projects'), error: error.message });
    }
});

// **Tasks anzeigen**
app.get('/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().populate('assignedUsers', 'name email').populate('project', 'name');
        res.json({ status: 'success', tasks });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_get_tasks'), error: error.message });
    }
});

// **Task erstellen**
app.post('/tasks', async (req, res) => {
    
    try {
        const { title, description, project, assignedUsers, status, priority, isSubTask, subtaskIds, parentTaskTicketNumber, startDate, endDate, isDone, parentTaskId, kanbanIndexVertical, createdByUserId, createdByEmailAddress, customFields } = req.body;
        // Prüfen, ob das zugewiesene Projekt existiert
        
        const existingProject = await Project.findById(project);
        if (!existingProject) {
            return res.status(400).json({ status: 'error', message: req.t('project_not_found') });
        }
        
        // Prüfen, ob alle zugewiesenen Benutzer existieren
        const users = await User.find({ _id: { $in: assignedUsers } });
        if (users.length !== assignedUsers.length) {
            return res.status(400).json({ status: 'error', message: req.t('one_or_more_users_not_exist') });
        }
        const task = await new Task({ 
            title, 
            description, 
            project, 
            assignedUsers, 
            status, 
            priority, 
            isSubTask,
            subtaskIds,
            parentTaskTicketNumber,
            startDate,
            endDate,
            isDone,
            createdByUserId,
            createdByEmailAddress,
            kanbanIndexVertical,
            customFields
        });
        // Falls der Task ein Subtask ist, dem Haupttask hinzufügen
        if (isSubTask && parentTaskId) {
            const parentTask = await Task.findById(parentTaskId);
            if (!parentTask) {
                return res.status(400).json({ status: 'error', message: req.t('main_task_not_found') });
            }
            task.isSubTask = true;
            await task.save();
            
            // Haupttask aktualisieren und Subtask-ID hinzufügen
            parentTask.subtaskIds.push(task._id);
            await parentTask.save();
        } else {
            await task.save();
        }
        
        res.json({ status: 'success', message: 'Task erstellt', task });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_creating_task'), error: error.message });
    }
});

// **Task bearbeiten**
app.put('/tasks/:id', async (req, res) => {
    try {
        const { title, description, assignedUsers, status, startDate, endDate, priority, isDone, kanbanIndexVertical, customFields } = req.body;
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ status: 'error', message: req.t('task_not_found') });
        }

        if (title) task.title = title;
        if (description) task.description = description;
        if (status) task.status = status;
        if (startDate) task.startDate = startDate;
        if (endDate) task.endDate = endDate;
        if (priority) task.priority = priority;
        if (!isDone) task.isDone = false;
        if (isDone) task.isDone = true;
        if (kanbanIndexVertical) task.kanbanIndexVertical = kanbanIndexVertical;
        if (customFields) task.customFields = customFields;
        
        if (assignedUsers) {
            const users = await User.find({ _id: { $in: assignedUsers } });
            if (users.length !== assignedUsers.length) {
                return res.status(400).json({ status: 'error', message: req.t('one_or_more_users_not_exist') });
            }
            task.assignedUsers = assignedUsers;
        }

        task.updatedAt = new Date();
        await task.save();
        res.json({ status: 'success', message: 'Task aktualisiert', task });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_updating_task'), error: error.message });
    }
});

// **Task löschen (inkl. Subtasks)**
app.delete('/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ status: 'error', message: req.t('task_not_found') });
        }

        if (!task.isSubTask) {
            // Alle Subtasks löschen
            await Task.deleteMany({ _id: { $in: task.subtaskIds } });
        }

        await Task.findByIdAndDelete(req.params.id);

        res.json({ status: 'success', message: req.t('task_deleted') });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_deleting_task'), error: error.message });
    }
});

// **Details eines Projekts abrufen**
app.get("/projects/:projectId", async (req, res) => {
    try {
      const project = await Project.findById(req.params.projectId).populate("members");
      if (!project) {
        return res.status(404).json({ status: "error", message: "Projekt nicht gefunden." });
      }
      res.json({ status: "success", project });
    } catch (error) {
      res.status(500).json({ status: "error", message: "Fehler beim Abrufen des Projekts." });
    }
  });

// **Alle Tasks eines Projekts abrufen**
app.get('/projects/:projectId/tasks', async (req, res) => {
    try {
        const tasks = await Task.find({ project: req.params.projectId })
            .populate('assignedUsers', 'firstname lastname username')
            .populate('subtaskIds', 'title status priority');
        res.json({ status: 'success', tasks });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_get_tasks'), error: error.message });
    }
});

// **Task einem Benutzer zuweisen**
app.post('/tasks/:id/assign-user', async (req, res) => {
    try {
        const { userId } = req.body;
        const task = await Task.findById(req.params.id);
        const user = await User.findById(userId);

        if (!task || !user) {
            return res.status(404).json({ status: 'error', message: req.t('task_or_user_not_found') });
        }

        // Überprüfen, ob der Benutzer bereits zugewiesen ist
        if (task.assignedUsers.includes(userId)) {
            return res.status(400).json({ status: 'error', message: req.t('user_already_assigned_to_task') });
        }

        task.assignedUsers.push(userId);
        await task.save();

        res.json({ status: 'success', message: 'Benutzer erfolgreich zugewiesen', task });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_assigning_user'), error: error.message });
    }
});

app.delete('/tasks/:id/remove-user', async (req, res) => {
    try {
        const { userId } = req.body;
        const task = await Task.findById(req.params.id);
        const user = await User.findById(userId);

        if (!task || !user) {
            return res.status(404).json({ status: 'error', message: req.t('task_or_user_not_found') });
        }

        // Überprüfen, ob der Benutzer überhaupt zugewiesen ist
        if (!task.assignedUsers.includes(userId)) {
            return res.status(400).json({ status: 'error', message: req.t('user_not_assigned_to_task') });
        }

        // Benutzer entfernen
        task.assignedUsers = task.assignedUsers.filter(id => id.toString() !== userId);
        await task.save();

        res.json({ status: 'success', message: req.t('user_remove_success'), task });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_removing_user'), error: error.message });
    }
});

// **Task-Status aktualisieren**
app.patch('/tasks/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ status: 'error', message: req.t('task_ot_found') });
        }

        task.status = status;
        task.updatedAt = new Date();
        await task.save();

        res.json({ status: 'success', message: 'Status aktualisiert', task });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_updating_status'), error: error.message });
    }
});

app.post('/mail2ticket', async (req, res) => {
    try {
        const { projects, imapHost, imapPort, imapUser, imapPassword, emailAddress, checkPeriodInMinutes, smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure } = req.body;

        // Prüfen, ob alle angegebenen Projekte existieren
        const existingProjects = await Project.find({ _id: { $in: projects } });
        if (existingProjects.length !== projects.length) {
            return res.status(400).json({ status: 'error', message: req.t('one_or_more_projects_not_exist') });
        }

        // Neuen Mail2Ticket-Connector erstellen
        const mail2Ticket = new Mail2Ticket({
            projects,
            imapHost,
            imapPort,
            imapUser,
            imapPassword,  // 🔴 Optional: Hier kannst du Verschlüsselung einbauen
            emailAddress,
            checkPeriodInMinutes,
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPassword,
            smtpSecure
        });

        await mail2Ticket.save();
        res.json({ status: 'success', message: req.t('mail2ticket_connector_created'), mail2Ticket });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_creating_mail2ticket_connector'), error: error.message });
    }
});

app.get('/mail2ticket', async (req, res) => {
    try {
        const connectors = await Mail2Ticket.find().populate('projects', 'name'); // Holt die Projektnamen mit rein
        res.json({ status: 'success', connectors });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_get_mail2ticket_connector'), error: error.message });
    }
});

app.get('/mail2ticket/:id', async (req, res) => {
    try {
        const connector = await Mail2Ticket.findById(req.params.id).populate('projects', 'name');

        if (!connector) {
            return res.status(404).json({ status: 'error', message: 'mail2ticket_connector_not_found' });
        }

        res.json({ status: 'success', connector });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_get_mail2ticket_connector'), error: error.message });
    }
});


app.get('/mail2ticket/byProjectId/:id', async (req, res) => {
    try {
        const connectors = await Mail2Ticket.find({ projects: req.params.id })

        if (!connectors.length) {
            return res.status(404).json({ status: 'error', message: 'mail2ticket_connectors_not_found' });
        }

        res.json({ status: 'success', connectors });
    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_get_mail2ticket_connectors'), error: error.message });
    }
});


app.put('/mail2ticket/:id', async (req, res) => {
    try {
        const { projects, imapHost, imapPort, imapUser, imapPassword, emailAddress } = req.body;

        // Prüfen, ob alle angegebenen Projekte existieren
        const existingProjects = await Project.find({ _id: { $in: projects } });
        if (existingProjects.length !== projects.length) {
            return res.status(400).json({ status: 'error', message: req.t('one_or_more_projects_not_exist') });
        }

        const updatedConnector = await Mail2Ticket.findByIdAndUpdate(
            req.params.id,
            { projects, imapHost, imapPort, imapUser, imapPassword, emailAddress, smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure},
            { new: true }
        );

        if (!updatedConnector) {
            return res.status(404).json({ status: 'error', message: req.t('mail2ticket_connector_not_found') });
        }

        res.json({ status: 'success', message: 'Mail2Ticket-Connector aktualisiert', updatedConnector });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'error_updating_mail2ticket_connector', error: error.message });
    }
});

app.delete('/mail2ticket/:id', async (req, res) => {
    try {
        const deletedConnector = await Mail2Ticket.findByIdAndDelete(req.params.id);
        if (!deletedConnector) {
            return res.status(404).json({ status: 'error', message: req.t('mail2ticket_connector_not_found') });
        }

        res.json({ status: 'success', message: 'Mail2Ticket-Connector gelöscht' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'error_deleting_mail2ticket_connector', error: error.message });
    }
});

// Füge eine Überprüfung hinzu, bevor die Route definiert wird
setTimeout(() => {
    if (!upload) {
        logMessage("error", 'upload_not_initialized_mongodb_not_connected');
    } else {
        // Erst hier die Upload-Route definieren, wenn `upload` sicher existiert
        app.post('/tasks/:id/upload', upload.single('file'), async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ status: 'error', message: req.t('no_file_uploaded') });
                }
        
                const task = await Task.findById(req.params.id);
                if (!task) {
                    return res.status(404).json({ status: 'error', message: req.t('task_not_found') });
                }
        
                // Datei in GridFS speichern
                const uploadStream = gfsBucket.openUploadStream(req.file.originalname);
                const readableStream = new Readable();
                readableStream.push(req.file.buffer);
                readableStream.push(null);
                readableStream.pipe(uploadStream);
        
                uploadStream.on('error', (err) => {
                    logMessage("error", 'error_writing_gridfs' + err);
                    return res.status(500).json({ status: 'error', message: req.t('error_uploading_file') });
                });
        
                uploadStream.on('finish', async () => {
                    logMessage("info", 'successfully_write_gridfs', uploadStream.id);
        
                    task.attachments.push({
                        filename: req.file.originalname,
                        fileId: uploadStream.id
                    });
                    await task.save();
        
                    res.json({ status: 'success', message: req.t('file_upload_success'), fileId: uploadStream.id });
                });
        
            } catch (error) {
                logMessage("error", req.t('error_uploading_file') + error);
                res.status(500).json({ status: 'error', message: req.t('error_uploading_file'), error: error.message });
            }
        });
        
    }
}, 5000); // Warte 5 Sekunden, um sicherzustellen, dass `upload` gesetzt wurde

// Ruft alle Dateianhänge eines Tasks ab.
app.get('/tasks/:id/attachments', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ status: 'error', message: req.t('task_not_found') });
        }

        res.json({ status: 'success', attachments: task.attachments });

    } catch (error) {
        logMessage("error", req.t('error_get_attachments'), error);
        res.status(500).json({ status: 'error', message: req.t('error_get_attachments'), error: error.message });
    }
});

//Lädt eine Datei aus GridFS herunter.
app.get('/attachments/:fileId', async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const downloadStream = gfsBucket.openDownloadStream(fileId);

        res.set('Content-Type', 'application/octet-stream');
        res.set('Content-Disposition', `attachment; filename="${fileId}"`);

        downloadStream.pipe(res);

        downloadStream.on('error', (err) => {
            logMessage("error", req.t('file_not_found'), err);
            res.status(404).json({ status: 'error', message: req.t('file_not_found') });
        });

    } catch (error) {
        logMessage("error", req.t('error_get_file'), error);
        res.status(500).json({ status: 'error', message: req.t('error_get_file'), error: error.message });
    }
});

// Datei löschen
app.delete('/tasks/:taskId/attachments/:fileId', async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) {
            return res.status(404).json({ status: 'error', message: req.t('task_not_found') });
        }

        // Datei aus Task-Anhängen entfernen
        task.attachments = task.attachments.filter(att => att.fileId.toString() !== req.params.fileId);
        await task.save();

        // Datei aus GridFS löschen
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        await gfsBucket.delete(fileId);

        res.json({ status: 'success', message: 'Datei gelöscht' });

    } catch (error) {
        logMessage("error", req.t('error_deleting_file'), error);
        res.status(500).json({ status: 'error', message: req.t('error_deleting_file'), error: error.message });
    }
});

// Dtei Vorschau direkt im Browser
app.get('/attachments/:fileId/view', async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const downloadStream = gfsBucket.openDownloadStream(fileId);

        downloadStream.pipe(res);

        downloadStream.on('error', (err) => {
            logMessage("error", req.t('file_not_found'), err);
            res.status(404).json({ status: 'error', message: req.t('file_not_found') });
        });

    } catch (error) {
        logMessage("error", req.t('error_get_file'), error);
        res.status(500).json({ status: 'error', message: req.t('error_get_file'), error: error.message });
    }
});


// **Kommentar zu einem Task hinzufügen**
app.post('/tasks/:ticketNumber/comments', async (req, res) => {
    try {
        const { ticketNumber, commentText, sendByMail, emailAddress, createdByUserId, createdByEmailAddress } = req.body;
        const task = await Task.findOne( {ticketNumber: req.params.ticketNumber});

        if (!task) {
            return res.status(404).json({ status: 'error', message: req.t('task_not_found') });
        }

        const newComment = new Comment({
            taskId: task._id,
            ticketNumber,
            commentText,
            sendByMail: sendByMail || false,
            emailAddress: sendByMail ? emailAddress : null,
            mailSent: false,
            createdByUserId, 
            createdByEmailAddress
        });

        await newComment.save();

        res.json({ status: 'success', message: 'Kommentar hinzugefügt', comment: newComment });

    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_creating_comment'), error: error.message });
    }
});

// **Kommentar löschen**
app.delete('/comments/:id', async (req, res) => {
    try {
        const comment = await Comment.findByIdAndDelete(req.params.id);

        if (!comment) {
            return res.status(404).json({ status: 'error', message: req.t('comment_not_found') });
        }

        res.json({ status: 'success', message: 'Kommentar gelöscht' });

    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_deleting_comment'), error: error.message });
    }
});

// **Alle Kommentare eines Tasks abrufen**
app.get('/tasks/:ticketNumber/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ ticketNumber: req.params.ticketNumber });

        if (!comments.length) {
            return res.status(404).json({ status: 'error', message: req.t('no_comments_found') });
        }

        res.json({ status: 'success', comments });

    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_get_comments'), error: error.message });
    }
});


// **Zeit für einen Task erfassen**
app.post('/tasks/:taskId/time-tracking', async (req, res) => {
    try {
        const { startTime, endTime, description } = req.body;
        const task = await Task.findById(req.params.taskId);
        const loginToken = req.headers.authorization
        
        // Token validieren und Benutzer-ID abrufen
        const tokenData = await LoginToken.findOne({ token: loginToken });
        if (!tokenData) {
            return res.status(401).json({ status: "error", message: req.t('invalid_token') });
        }
        const userId = tokenData.userId;


        if (!task) {
            return res.status(404).json({ status: 'error', message: req.t('task_not_found') });
        }

        if (!userId) {
            return res.status(404).json({ status: 'error', message: req.t('user_not_found') });
        }

        if (!startTime || !endTime) {
            return res.status(400).json({ status: 'error', message: req.t('start_end_time_required') });
        }
        const durationMinutes = Math.floor((new Date(endTime) - new Date(startTime)) / 60000);

        const newEntry = new TimeTracking({
            taskId: task._id,
            userId: userId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            duration: durationMinutes,
            description: description
        });

        await newEntry.save();

        res.json({ status: 'success', message: req.t('time_recorded'), timeEntry: newEntry });

    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_recording_time'), error: error.message });
    }
});


// **Alle erfassten Zeiten für einen Task abrufen**
app.get('/tasks/:taskId/time-tracking', async (req, res) => {
    try {
        const entries = await TimeTracking.find({ taskId: req.params.taskId });

        if (!entries.length) {
            return res.status(404).json({ status: 'error', message: req.t('no_time_records_found') });
        }

        res.json({ status: 'success', timeEntries: entries });

    } catch (error) {
        res.status(500).json({ status: 'error', message: req.t('error_get_time_records'), error: error.message });
    }
});

// **Einzelne erfasste Zeit löschen**
app.delete('/time-tracking/:id', async (req, res) => {
    console.log("DEBUG")
    try {
        const entry = await TimeTracking.findByIdAndDelete(req.params.id);

        if (!entry) {
            return res.status(404).json({ status: 'error', message: req.t('time_record_not_found') });
        }

        res.json({ status: 'success', message: 'Zeiterfassung gelöscht' });

    } catch (error) {
        res.status(500).json({ status: 'error', message: 'error_deleting_time_record', error: error.message });
    }
});

app.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        const loginToken = req.headers.authorization
        
        if (!query) {
            return res.status(400).json({ status: "error", message: req.t('search_query_required') });
        }
        
        // Token validieren und Benutzer-ID abrufen
        const tokenData = await LoginToken.findOne({ token: loginToken });
        if (!tokenData) {
            return res.status(401).json({ status: "error", message: req.t('invalid_token') });
        }
        const userId = tokenData.userId;
        
        // Suchkriterien für eine Volltextsuche über alle relevanten Felder
        const searchCriteria = {
            $or: [
                { name: { $regex: `${query}.*`, $options: 'i' } },
                { description: { $regex: `${query}.*`, $options: 'i' } },
                { title: { $regex: `${query}.*`, $options: 'i' } },
                { content: { $regex: `${query}.*`, $options: 'i' } },
                { text: { $regex: `${query}.*`, $options: 'i' } },
                { commentText: { $regex: `${query}.*`, $options: 'i' } }
            ]
        };
        
        // Projekte abrufen, bei denen der Benutzer Mitglied ist
        const projects = await Project.find({ ...searchCriteria, members: userId });
        const allProjects = await Project.find({ members: userId });
        
        // Tasks abrufen, die zu diesen Projekten gehören
        const projectIds = projects.map(p => p._id);
        const allProjectIds = allProjects.map(p => p._id);
        const tasks = await Task.find({ ...searchCriteria, project: { $in: allProjectIds } });
        const allTasks = await Task.find({ project: { $in: allProjectIds } });
        
        // Kommentare abrufen, die zu den gefilterten Tasks gehören
        const taskIds = tasks.map(t => t._id);
        const allTaskIds = allTasks.map(t => t._id);
        const comments = await Comment.find({ ...searchCriteria, taskId: { $in: allTaskIds } });

        res.json({
            status: "success",
            results: {
                projects,
                tasks,
                comments
            }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_searching'), error: error.message });
    }
});



// Backup-Liste abrufen
app.get('/backup/list', (req, res) => {
    try {
        const backupFiles = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.json.gz')); // Nur die Backups mit der Endung .json.gz auswählen

        if (backupFiles.length === 0) {
            return res.status(404).json({ status: "error", message: req.t('no_backups_found') });
        }

        res.json({ status: "success", backups: backupFiles });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_fetching_backups'), error: error.message });
    }
});

// Backup erstellen
app.post('/backup/create', async (req, res) => {
    try {
        const now = new Date();
        const formattedDate = 
          now.getDate().toString().padStart(2, '0') + '-' + 
          (now.getMonth() + 1).toString().padStart(2, '0') + '-' + 
          now.getFullYear() + '_' + 
          now.getHours().toString().padStart(2, '0') + ':' + 
          now.getMinutes().toString().padStart(2, '0');
        const backupFileName = `backup-${formattedDate}.json.gz`;
        const backupPath = path.join(BACKUP_DIR, backupFileName);
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        const mongoUri = `mongodb://${config.database.user}:${encodeURIComponent(config.database.password)}@${config.database.host}:27017/${config.database.name}`;
        const client = new MongoClient(mongoUri, { authSource: 'admin' });
        await client.connect();
        const db = client.db(config.database.name);
        const collections = await db.listCollections().toArray();

        const backupData = {};
        for (const collection of collections) {
            backupData[collection.name] = await db.collection(collection.name).find().toArray();
        }

        client.close();

        const gzip = createGzip();
        const writeStream = fs.createWriteStream(backupPath);
        writeStream.on('finish', () => res.json({ status: "success", message: req.t('backup_created'), backupFile: backupFileName }));
        writeStream.on('error', err => res.status(500).json({ status: "error", message: req.t('error_creating_backup'), error: err.message }));

        const jsonStream = JSON.stringify(backupData);
        const readableStream = require('stream').Readable.from(jsonStream);
        readableStream.pipe(gzip).pipe(writeStream);
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_creating_backup'), error: error.message });
    }
});
// Backup exportieren (herunterladen)
app.get('/backup/export/:fileName', (req, res) => {
    try {
        const { fileName } = req.params;
        const filePath = path.join(BACKUP_DIR, fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ status: "error", message: req.t('backup_not_found') });
        }

        res.download(filePath);
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_exporting_backup'), error: error.message });
    }
});

setTimeout(() => {
    if (!upload) {
        logMessage("error", 'upload_not_initialized_mongodb_not_connected');
    } else {
            // Backup importieren
            app.post('/backup/import', upload.single('backup'), async (req, res) => {
                try {
                    if (!req.file) {
                        return res.status(400).json({ status: "error", message: req.t('no_backup_file_provided') });
                    }

                    const backupPath = path.join(BACKUP_DIR, req.file.originalname);
                    
                    if (fs.existsSync(backupPath)) {
                        return res.status(400).json({ status: "error", message: req.t('backup_already_exists') });
                    }

                    fs.writeFileSync(backupPath, req.file.buffer);

                    res.json({ status: "success", message: req.t('backup_uploaded'), fileName: req.file.originalname });
                } catch (error) {
                    res.status(500).json({ status: "error", message: req.t('error_importing_backup'), error: error.message });
                }
            });



    }

}, 5000); // Warte 5 Sekunden, um sicherzustellen, dass `upload` gesetzt wurde
// Funktion, um alle Felder eines Dokuments rekursiv auf ObjectIds zu prüfen und zu konvertieren
const convertObjectIds = (obj) => {
    if (obj && typeof obj === 'object') {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (Array.isArray(obj[key])) {
                    obj[key] = obj[key].map(item => convertObjectIds(item));  // Rekursiv bei Arrays
                } else if (ObjectId.isValid(obj[key])) {
                    obj[key] = new ObjectId(obj[key]);  // Umwandlung zu ObjectId
                } else if (typeof obj[key] === 'object') {
                    obj[key] = convertObjectIds(obj[key]);  // Rekursiv bei verschachtelten Objekten
                }
            }
        }
    }
    return obj;
};

// Backup in die Datenbank einspielen
app.post('/backup/restore/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        const backupPath = path.join(BACKUP_DIR, fileName);

        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({ status: "error", message: req.t('backup_not_found') });
        }

        const gunzip = createGunzip();
        const readStream = fs.createReadStream(backupPath);
        let jsonData = "";

        readStream.pipe(gunzip);
        gunzip.on('data', chunk => jsonData += chunk.toString());
        gunzip.on('end', async () => {
            try {
                const backupData = JSON.parse(jsonData);
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                const mongoUri = `mongodb://${config.database.user}:${encodeURIComponent(config.database.password)}@${config.database.host}:27017/${config.database.name}`;
                const client = new MongoClient(mongoUri, { authSource: 'admin' });
                await client.connect();
                const db = client.db(config.database.name);

                for (const [collectionName, documents] of Object.entries(backupData)) {
                    if (documents.length > 0) {
                        const collection = db.collection(collectionName);

                        // Alle Dokumente werden durch die Funktion `convertObjectIds` überprüft und umgewandelt
                        const transformedDocs = documents.map(doc => convertObjectIds(doc));

                        // Leere Sammlung und Dokumente einfügen
                        await collection.deleteMany({});
                        await collection.insertMany(transformedDocs);
                    }
                }

                await client.close();
                res.json({ status: "success", message: req.t('backup_restored') });
            } catch (err) {
                res.status(500).json({ status: "error", message: req.t('error_restoring_backup'), error: err.message });
            }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_restoring_backup'), error: error.message });
    }
});

// Backup löschen
app.delete('/backup/delete/:fileName', (req, res) => {
    try {
        const { fileName } = req.params;
        const backupPath = path.join(BACKUP_DIR, fileName);

        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({ status: "error", message: req.t('backup_not_found') });
        }

        fs.unlinkSync(backupPath);  // Löscht die Datei

        res.json({ status: "success", message: req.t('backup_deleted'), fileName: fileName });
    } catch (error) {
        res.status(500).json({ status: "error", message: req.t('error_deleting_backup'), error: error.message });
    }
});

/**
 * 🔹 GET /config/:configName
 * Lädt eine spezifische Konfiguration basierend auf configName
 */
app.get("/config/:configName", async (req, res) => {
    try {
        const { configName } = req.params; // configName aus URL
        const config = await Config.findOne({ configName });

        if (!config) {
        return res.status(404).json({ message: `Konfiguration '${configName}' nicht gefunden.` });
        }
        res.json(config.configValue);
    } catch (error) {
        res.status(500).json({ message: "Fehler beim Abrufen der Konfiguration", error: error.message });
    }
});

/**
 * 🔹 POST /config
 * Erstellt oder aktualisiert eine Konfiguration basierend auf dem configName
 */
app.post("/config", async (req, res) => {
    try {
        const { configName, configValue } = req.body;
        
        if (!configName || !configValue) {
        return res.status(400).json({ message: "configName und configValue sind erforderlich" });
        }

        let config = await Config.findOne({ configName });

        if (config) {
        config.configValue = configValue;
        await config.save();
        } else {
        config = new Config({ configName, configValue });
        await config.save();
        }

        res.json({ message: `Konfiguration '${configName}' gespeichert`, config });
    } catch (error) {
        res.status(500).json({ message: "Fehler beim Speichern der Konfiguration", error: error.message });
    }
});

/**
 * 🔹 DELETE /config/:configName
 * Löscht eine Konfiguration aus der Datenbank
 */
app.delete("/config/:configName", async (req, res) => {
    try {
        const { configName } = req.params;
        const deletedConfig = await Config.findOneAndDelete({ configName });

        if (!deletedConfig) {
        return res.status(404).json({ message: `Konfiguration '${configName}' nicht gefunden.` });
        }

        res.json({ message: `Konfiguration '${configName}' wurde gelöscht.` });
    } catch (error) {
        res.status(500).json({ message: "Fehler beim Löschen der Konfiguration", error: error.message });
    }
});

// **Task Custom Field erstellen**
app.post('/customFields/tasks', async (req, res) => {
    try {
        const { projectId, title, type, options, required } = req.body;
        if (!projectId || !title || !type) {
            return res.status(400).json({
                status: 'error',
                message: req.t('task_custom_fields_values_required')
            });
        }

        // Token aus dem Header auslesen und validieren
        const token = req.headers.authorization || req.headers.Authorization;
        const tokenRecord = await LoginToken.findOne({ token });
        if (!tokenRecord) {
            return res.status(401).json({
                status: 'error',
                message: req.t('invalid_token')
            });
        }

        // Prüfen, ob das zugehörige Projekt existiert
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                status: 'error',
                message: req.t('project_not_found')
            });
        }

        const taskCustomField = new TaskCustomField({
            projectId,
            title,
            type,
            options: JSON.stringify(options),
            required
        });
        await taskCustomField.save();

        res.json({
            status: 'success',
            message: req.t('task_custom_field_created'),
            taskCustomField
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: req.t('error_creating_task_custom_field'),
            error: error.message
        });
    }
});

// **Alle Task Custom Fields abrufen**
// Optional: Filterung per Query-Parameter (z. B. ?projectId=...)
app.get('/customFields/tasks', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.query;
        let query = {};
        if (projectId) {
            query.projectId = projectId;
        }

        const taskCustomFields = await TaskCustomField.find(query);
        res.json({
            status: 'success',
            taskCustomFields
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: req.t('error_fetching_task_custom_fields'),
            error: error.message
        });
    }
});

// **Task Custom Field bearbeiten**
app.put('/customFields/tasks/:id', async (req, res) => {
    try {
        const { projectId, title, type, required } = req.body;
        const taskCustomField = await TaskCustomField.findById(req.params.id);
        if (!taskCustomField) {
            return res.status(404).json({
                status: 'error',
                message: req.t('task_custom_field_not_found')
            });
        }

        // Falls ein neuer projectId übergeben wurde, prüfen wir, ob das Projekt existiert
        if (projectId) {
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({
                    status: 'error',
                    message: req.t('project_not_found')
                });
            }
            taskCustomField.projectId = projectId;
        }
        if (title) taskCustomField.title = title;
        if (type) taskCustomField.type = type;
        if (required !== undefined) taskCustomField.required = required;

        await taskCustomField.save();
        res.json({
            status: 'success',
            message: req.t('task_custom_field_updated'),
            taskCustomField
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: req.t('error_updating_task_custom_field'),
            error: error.message
        });
    }
});

// **Task Custom Field löschen**
app.delete('/customFields/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const taskCustomField = await TaskCustomField.findByIdAndDelete(req.params.id);
        if (!taskCustomField) {
            return res.status(404).json({
                status: 'error',
                message: req.t('task_custom_field_not_found')
            });
        }
        res.json({
            status: 'success',
            message: req.t('task_custom_field_deleted')
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: req.t('error_deleting_task_custom_field'),
            error: error.message
        });
    }
});

// SERVER STARTEN
app.listen(PORT, () => {
    logMessage('success', `Server started on http://localhost:${PORT}`);
});
