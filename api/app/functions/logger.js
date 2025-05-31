const logMessage = (type, message) => {
    const timestamp = new Date().toISOString();
    const logTypes = {
        info: '\x1b[34m[INFO]\x1b[0m ℹ️',
        debug: '\x1b[36m[DEBUG]\x1b[0m 🐞',
        error: '\x1b[31m[ERROR]\x1b[0m ❌',
        success: '\x1b[32m[SUCCESS]\x1b[0m ✅',
        fancy: '\x1b[35m[FANCY AS FUCK BOOOY]\x1b[0m 🦄✨'
    };
    const logPrefix = logTypes[type] || logTypes.info;

    if (type === 'fancy') {
        // Regenbogenfarben und Glitzer-Effekt
        const rainbow = [
            '\x1b[31m', // rot
            '\x1b[33m', // gelb
            '\x1b[32m', // grün
            '\x1b[36m', // cyan
            '\x1b[34m', // blau
            '\x1b[35m', // magenta
        ];
        let fancyMsg = '';
        for (let i = 0; i < message.length; i++) {
            fancyMsg += rainbow[i % rainbow.length] + message[i];
        }
        fancyMsg += '\x1b[0m ✨🌈✨';
        console.log(`${timestamp} ${logPrefix} ${fancyMsg}`);
    } else {
        console.log(`${timestamp} ${logPrefix} ${message}`);
    }
};

module.exports = { logMessage };
