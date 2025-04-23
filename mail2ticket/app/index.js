const mongoose = require('mongoose');
const Imap = require('imap');
const nodemailer = require('nodemailer');
const Mail2Ticket = require('./models/Mail2Ticket');
const Task = require('./models/Task');
const Comment = require('./models/Comment');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const i18next = require('i18next');
const middleware = require('i18next-http-middleware');
const { logMessage } = require('./functions/logger');
const configPath = './data/config/config.json';
const lockFilePath = path.join(__dirname, 'data/config/installed.lock');
const { GridFSBucket } = require('mongodb');
const multer = require('multer');
const { simpleParser } = require('mailparser');

// i18n Setup
i18next.use(middleware.LanguageDetector).init({
    fallbackLng: 'en',
    preload: ['en', 'de'],
    resources: {
        en: { translation: require('./locales/en.json') },
        de: { translation: require('./locales/de.json') }
    }
});


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
                });
                
                conn.on('error', (err) => {
                    logMessage("error", 'mongodb_connection_error' + err);
                });

            }
        } catch (error) {
            logMessage("error", i18next.t('error_reading_config') + error);
        }
    } else {
        logMessage("info", '📌 Installation nicht abgeschlossen. Datenbankverbindung wird nicht hergestellt.');
    }
} catch (error) {
    logMessage("error", i18next.t('error_reading_config') + error);
}

async function fetchEmails(conn) {
    const imap = new Imap({
        user: conn.imapUser,
        password: conn.imapPassword,
        host: conn.imapHost,
        port: conn.imapPort,
        tls: false,
        autotls: "always",
        authTimeout: 5000,
    });

    imap.once('ready', function () {
        imap.openBox('INBOX', false, function (err, box) {
            if (err) {
                logMessage("error", i18next.t('error_mailbox_open', { error: err.message }));
                return;
            }

            imap.search(['UNSEEN'], function (err, results) {
                if (err || !results.length) {
                    logMessage("info", i18next.t('email_no_new'));
                    imap.end();
                    return;
                }

                const fetch = imap.fetch(results, { bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT'], struct: true, headers: true, body: true });
                fetch.on('message', function (msg) {
                    let emailBody = '';
                    let subject = '';
                    let ticketNumberMatch = null;
                    let uid = null;
                    let fromEmail = '';
                    let attachments = [];

                    msg.on('body', function (stream, info) {
                        let buffer = '';
                        stream.on('data', chunk => buffer += chunk.toString('utf8'));
                        stream.on('data', chunk => {
                    });
                    
                        emailProcessingPromise = new Promise(async (resolve, reject) => {
                            stream.on('end', async function () {
                                try {
                                    if (info.which !== 'TEXT') {
                                        const parsed = Imap.parseHeader(buffer);
                                        subject = parsed.subject?.[0]?.trim() || '';
                                        ticketNumberMatch = subject.match(/\[#(\d{6})\]/);
                                        fromEmail = await parsed.from?.[0]?.match(/<([^>]+)>/)?.[1] || '';
                                    } else {
                                        const parsed = await simpleParser(buffer); // Warten, bis parsing abgeschlossen ist
                                        emailBody = parsed.html || parsed.text || '';
                                        
                                        // Base64-Bilder durch Inline-Bilder ersetzen
                                        parsed.attachments.forEach(attachment => {
                                            if (attachment.contentDisposition === 'inline' && attachment.contentType.startsWith('image/')) {
                                                const base64Image = `data:${attachment.contentType};base64,${attachment.content.toString('base64')}`;
                                                emailBody = emailBody.replace(`cid:${attachment.cid}`, base64Image);
                                            }
                                        });
                                        // Bereinigung des Inhalts
                                        //emailBody = emailBody.replace(/--Apple-Webmail-\S+/g, '') // Entfernt Apple Mail MIME Grenzen
                                        //    .replace(/Content-Transfer-Encoding:.*/gi, '') // Entfernt Encoding Header
                                        //    .replace(/Content-Type:.*/gi, '') // Entfernt Content-Typ Header
                                        //    .replace(/\r\n/g, '<br>'); // Ersetzt Zeilenumbrüche durch HTML <br> 
                                    }
                                    resolve(); // Signalisiert, dass die Verarbeitung abgeschlossen ist
                                } catch (err) {
                                    reject(err);
                                }
                            });
                        });
                    });
                                        
                    msg.once('attributes', function (attrs) {
                        uid = attrs.uid;
                        function extractAttachments(parts) {
                            parts.forEach(part => {
                                if (Array.isArray(part)) {
                                    extractAttachments(part);
                                } else if (part.disposition && part.disposition.type.toLowerCase() === 'attachment') {
                                    attachments.push({
                                        partID: part.partID,
                                        filename: part.disposition.params.filename,
                                        encoding: part.encoding
                                    });
                                }
                            });
                        }
                        extractAttachments(attrs.struct);
                    });

                    msg.once('end', async function () {
                        try {
                            await emailProcessingPromise; // Warten, bis alle 'body' Streams verarbeitet wurden
                            let task;
                            if (ticketNumberMatch) {
                                task = await Task.findOne({ ticketNumber: ticketNumberMatch[1] });
                                if (task) {
                                    const comment = new Comment({
                                        ticketNumber: ticketNumberMatch[1],
                                        commentText: emailBody,
                                        sendByMail: false,
                                        mailSent: false,
                                        createdByEmailAddress: fromEmail
                                    });
                                    await comment.save();
                                    logMessage("info", i18next.t('comments_added', { id: ticketNumberMatch[1] }));
                                } else {
                                    logMessage("warn", i18next.t('error_task_not_found', { id: ticketNumberMatch[1] }));
                                }
                            } else {
                                const mail2Ticket = await Mail2Ticket.findOne({ projects: conn.projects });
                                if (!mail2Ticket || !mail2Ticket.projects) {
                                    logMessage("error", i18next.t('error_no_project_available'));
                                    return;
                                }
                                task = await Task.create({
                                    title: subject || 'Neue Aufgabe',
                                    project: mail2Ticket.projects,
                                    status: 'new',
                                    sendByMail: false,
                                    createdByEmailAddress: fromEmail,
                                    priority: "new",
                                    attachments: [],
                                    description: emailBody
                                });
                                logMessage("info", i18next.t('created_task', { id: task._id }));
                            }

                            if (attachments.length > 0) {
                                const attachmentPromises = attachments.map(attachment => {
                                    return new Promise((resolve, reject) => {
                                        imap.fetch(uid, { bodies: [attachment.partID], struct: true }).on('message', function (msg) {
                                            msg.on('body', function (stream) {
                                                const uploadStream = gfsBucket.openUploadStream(attachment.filename);
                                                stream.pipe(uploadStream);

                                                uploadStream.on('finish', async () => {
                                                    task.attachments.push({
                                                        filename: attachment.filename,
                                                        fileId: uploadStream.id
                                                    });
                                                    await task.save();
                                                    resolve();
                                                });
                                                uploadStream.on('error', reject);
                                            });
                                        });
                                    });
                                });

                                await Promise.all(attachmentPromises);
                                await task.save();
                            }

                            if (uid) {
                                imap.addFlags(uid, '\\Seen', function (err) {
                                    if (err) {
                                        logMessage("error", i18next.t('error_mailbox_read_status', { uid, error: err.message }));
                                    } else {
                                        logMessage("info", `✅ E-Mail UID ${uid} als gelesen markiert.`);
                                    }
                                });
                            }
                        } catch (error) {
                            logMessage("error", i18next.t('error_processing_email', { error: error.message }));
                        }
                    });
                });
            });
        });
    });

    imap.connect();
    imap.once('error', function(err) {
        console.log(err);
    });
}

    
    
    async function sendPendingEmails() {
        const comments = await Comment.find({ sendByMail: true, mailSent: false });
        for (const comment of comments) {
            if (!comment.emailAddress) {
                logMessage("warn", i18next.t('warning_no_recipient', { commentId: comment._id }));
                continue;
            }
            const task = await Task.findOne({ ticketNumber: comment.ticketNumber });
            if (!task) {
                logMessage("warn", i18next.t('warning_no_task_for_comment', { commentId: comment._id }));
                continue;
            }
    
            const mail2Ticket = await Mail2Ticket.findOne({ projects: task.project });
            if (!mail2Ticket) {
                logMessage("error", i18next.t('error_no_smtp_connector', { project: task.project }));
                continue;
            }
    
            const transporter = nodemailer.createTransport({
                host: mail2Ticket.smtpHost,
                port: mail2Ticket.smtpPort,
                secure: mail2Ticket.smtpSecure,
                auth: {
                    user: mail2Ticket.smtpUser,
                    pass: mail2Ticket.smtpPassword
                }
            });
    
            const mailOptions = {
                from: mail2Ticket.smtpUser,
                to: comment.emailAddress,
                subject: i18next.t('email_new_reply_subject', { ticketNumber: comment.ticketNumber }),
                text: comment.commentText,
            };
            
            try {
                await transporter.sendMail(mailOptions);
                comment.mailSent = true;
                await comment.save();
                logMessage("info", i18next.t('email_sent_for_comment', { commentId: comment._id }));
            } catch (error) {
                logMessage("error", i18next.t('error_sending_email', { error: error.message }));
            }
        }
    }


    async function startEmailCheck() {
        const connections = await Mail2Ticket.find();
        connections.forEach(conn => {
            // Berechne das Intervall in Millisekunden
            const interval = (conn.checkPeriodInMinutes || 5) * 60 * 1000;
    
            // Führe beide Funktionen direkt beim Start aus
            fetchEmails(conn);
            sendPendingEmails();
    
            // Setze ein gemeinsames Intervall für beide Funktionen
            setInterval(() => {
                fetchEmails(conn);
                sendPendingEmails();
            }, interval);
        });
    }
    

sendPendingEmails()
startEmailCheck();