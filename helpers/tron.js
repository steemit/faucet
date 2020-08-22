const TronWeb = require('tronweb');
const logger = require('./logger');

async function getTronAccount() {
    try {
        const account = await TronWeb.createAccount();
        return {
            pubKey: account.address.base58,
            privKey: account.privateKey,
        };
    } catch (error) {
        logger.error({ error }, 'create tron address failed');
        return false;
    }
}

module.exports = {
    getTronAccount,
};
