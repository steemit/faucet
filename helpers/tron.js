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
        const apiUrl = `${walletUrl}/api/v1/tron/tron_user_from_internal`;
        const willUpData = {
            internal_api_token: process.env.INTERNAL_API_TOKEN,
            method: 'insert',
            data_from: 'faucet',
            username,
            will_update_data: {
                username,
                tron_addr: data.tron_addr,
                is_new_user: 1,
                tron_addr_create_count: 1,
            }
        };
        const result = await axios.post(`${apiUrl}`, willUpData);
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
