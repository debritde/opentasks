const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { logMessage } = require('./logger');

async function setupDatabase(config) {
    logMessage("info", `🔧 Starte Datenbank-Setup für ${config.type}...`);
    
    if (config.type === 'mongodb') {
        try {
            logMessage("info", `📡 Verbinde zu: mongodb://${config.user}:${config.password}@${config.host}:27017/${config.name}`);
            
            // Verbinde dich zur **Admin-Datenbank**, um sicherzustellen, dass Auth funktioniert
            await mongoose.connect(`mongodb://${config.user}:${config.password}@${config.host}:27017/${config.name}`, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                authSource: "admin" // Authentifizierung über die Admin-Datenbank
            });

            // Wechsle zur gewünschten Datenbank
            const db = mongoose.connection.useDb(config.name);

            // Erstelle eine Test-Collection, damit die DB wirklich existiert
            const testSchema = new mongoose.Schema({ testField: String });
            const TestModel = db.model('TestCollection', testSchema);

            await TestModel.create({ testField: "Datenbank erstellt!" });

            logMessage("success", `✅ MongoDB-Datenbank '${config.name}' erfolgreich initialisiert`);

        } catch (error) {
            logMessage("error", `❌ Fehler beim MongoDB-Setup:`, error.message);
            throw error;
        }
    } 

    else if (config.type === 'mysql') {
        try {
            const connection = await mysql.createConnection({
                host: config.host,
                user: config.user,
                password: config.password
            });

            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.name}\``);
            logMessage("success", '✅ MySQL-Datenbank erstellt oder bereits vorhanden');

        } catch (error) {
            logMessage("error", `❌ Fehler beim MySQL-Setup:`, error.message);
            throw error;
        }
    } 

    else {
        throw new Error('❌ Ungültiger Datenbanktyp');
    }
}

module.exports = { setupDatabase };
