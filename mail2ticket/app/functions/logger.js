const logMessage = (type, message) => {
    const timestamp = new Date().toISOString();
    const logTypes = {
        info: '\x1b[34m[INFO]\x1b[0m',
        debug: '\x1b[36m[DEBUG]\x1b[0m',
        error: '\x1b[31m[ERROR]\x1b[0m',
        success: '\x1b[32m[SUCCESS]\x1b[0m'
    };
    const logPrefix = logTypes[type] || logTypes.info;
    console.log(`${timestamp} ${logPrefix} ${message}`);
};

module.exports = { logMessage };
