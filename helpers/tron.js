const TronWeb = require('tronweb');
const logger = require('./logger');
const axios = require('axios');

const walletUrl = process.env.WALLET_URL;

async function getTronAccount() {
    try {
        const account = await TronWeb.createAccount();
        return {
            pubKey: account.address.base58,
            privKey: account.privateKey,
        };
    } catch (error) {
        logger.error({ error }, 'create tron address failed');
        return {
            pubKey: '',
            privKey: '',
        };
    }
}

async function updateTronUser(username, data) {
    try {
        const apiUrl = `${walletUrl}/api/v1/tron/tron_user`;
        // check if username has been created on Steem chain
        const user = await axios.get(`${apiUrl}?username=${username}`);
        if (user.data.error) {
            logger.error('update_tronuser_error_info:', user.data.error);
            return false;
        }
        const result = await axios.post(`${apiUrl}`, data);
        if (result.data.error) {
            logger.error('update_tronuser_error_info:', result.data.error);
            return false;
        }
        return true;
    } catch (error) {
        logger.error('update_tronuser_error_info:', error);
        return false;
    }
}

module.exports = {
    walletUrl,
    getTronAccount,
    updateTronUser,
};
