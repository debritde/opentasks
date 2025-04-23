////////////////////////////////////////////////////
// INCLUDE NECESSARY PACKAGES
////////////////////////////////////////////////////
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const express = require('express');
const app = express();
const morgan = require("morgan");
const cors = require('cors');
const mysql = require('mysql');

////////////////////////////////////////////////////
// DEFINE VARIABLES
////////////////////////////////////////////////////
const apiToken = process.env.apiToken || "123"
const mainApiIP = process.env.mainApiIP || "http://localhost"
const mainApiPort = process.env.mainApiPort || 9002
const PORT = process.env.apiReverseproxyPort || 9001

const databaseHost = process.env.databaseHost || "localhost"
const databaseUser = process.env.databaseUser || "root"
const databasePassword = process.env.databasePassword || ""
const databaseName = process.env.databaseName || "nodeApp"


////////////////////////////////////////////////////
// DEFINE DATABASE CONNECTIONS
////////////////////////////////////////////////////
const connection = mysql.createPool({
  host     : databaseHost, // Your connection adress (localhost).
  user     : databaseUser,     // Your database's username.
  password : databasePassword,        // Your database's password.
  database : databaseName   // Your database's name.
});

////////////////////////////////////////////////////
// DEFINE LOGGING TO DATABASE FUNCTION
////////////////////////////////////////////////////
const mongoose = require('mongoose');
const LogSchema = new mongoose.Schema({
    authToken: String,
    username: String,
    method: String,
    url: String,
    body: String
});
const db = mongoose.model('Log', LogSchema);

async function dbLogMiddleware(req, res, next) {
    try {
        await db.create({
            authToken: "test",
            username: "placeholder",
            method: req.method,
            url: req.protocol + '://' + req.get('host') + req.originalUrl,
            body: JSON.stringify(req.body)
        });
    } catch (err) {
        console.error("Log error:", err);
    }
    next();
}


////////////////////////////////////////////////////
// DEFINE MIDDLEWARE
////////////////////////////////////////////////////
app.use(cors())

app.use(express.json({
    inflatible: true,
    type: () => true, // this matches all content types
  }))


////////////////////////////
// IMPLEMENT AUTHORIZATION
////////////////////////////
app.use(function(req, res, next) {
    if (req.headers.authorization !== apiToken) {
        console.log("# API Not authorized")
        res.status(403).json({"message": "Not authorized"});
    }

    else if (req.headers.authorization == apiToken) {
        console.log("# API Authorized")
        next();
    }
    console.log(req.headers)
});

app.use(function(req, res, next) {
  var allowedOrigins = ['*'];
  var origin = req.headers.origin;

  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Expose-Headers", "*");
  res.header('Access-Control-Request-Method', '*');
  return next();
});

// Logging
app.use(morgan('dev'));
app.use(dbLogMiddleware);


////////////////////////////////////////////////////
// DEFINE PROXY ROUTES
////////////////////////////////////////////////////
app.use(
    '/mainApi/*',
    createProxyMiddleware({
        target: `${mainApiIP}:${mainApiPort}`,
      changeOrigin: true,
      pathRewrite: {
        '^/mainApi/': '/'
      },
      onProxyReq: fixRequestBody,
    })
);

////////////////////////////////////////////////////
// START SERVER
////////////////////////////////////////////////////
app.listen(PORT,() => {
	console.log("running")
})
