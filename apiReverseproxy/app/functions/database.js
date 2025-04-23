
// Wähle die gewünschte Datenbank aus Umgebungsvariablen
const DB_TYPE = process.env.DB_TYPE || "mongodb"; // "mongodb" oder "mysql"

// MongoDB Setup
if (DB_TYPE === "mongodb") {
    const mongoose = require('mongoose');
    mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/mydb", {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    const LogSchema = new mongoose.Schema({
        authToken: String,
        username: String,
        method: String,
        url: String,
        body: String,
        timestamp: { type: Date, default: Date.now }
    });

    const Log = mongoose.model("Log", LogSchema);

    module.exports = {
        async logActivity(data) {
            return await Log.create(data);
        }
    };
}

// MySQL Setup (falls nötig)
else if (DB_TYPE === "mysql") {
    const mysql = require('mysql');
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST || "localhost",
        user: process.env.MYSQL_USER || "root",
        password: process.env.MYSQL_PASSWORD || "",
        database: process.env.MYSQL_DATABASE || "nodeApp"
    });

    module.exports = {
        logActivity(data) {
            return new Promise((resolve, reject) => {
                pool.query(
                    "INSERT INTO activityLog (authToken, username, method, url, body) VALUES (?, ?, ?, ?, ?)",
                    [data.authToken, data.username, data.method, data.url, data.body],
                    (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    }
                );
            });
        }
    };
}
