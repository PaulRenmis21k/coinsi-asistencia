const dotenv = require('dotenv');
const envConfig = process.env.NODE_ENV != 'production' ? (dotenv.config().parsed || {}) : {};

module.exports = {
    APP_NAME        : envConfig.APP_NAME || process.env.APP_NAME,
    APP_PORT        : envConfig.APP_PORT || process.env.APP_PORT,
    URL_RENIEC      : envConfig.URL_RENIEC || process.env.URL_RENIEC,
    URL_SUNAT       : envConfig.URL_SUNAT || process.env.URL_SUNAT
}