import TronWeb from 'tronweb';
import { getLogChild } from './logger.js';
import { getEnv } from './common.js';
const logger = getLogChild({ module: 'helper_tron' });

export const walletUrl = getEnv('WALLET_URL');

export async function getTronAccount() {
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

export async function updateTronUser(username, data) {
  try {
    const apiUrl = `${walletUrl}/api/v1/tron/tron_user_from_internal`;
    const willUpData = {
      internal_api_token: getEnv('INTERNAL_API_TOKEN'),
      method: 'insert',
      data_from: 'faucet',
      username,
      will_update_data: {
        username,
        tron_addr: data.tron_addr,
        is_new_user: 1,
      },
    };
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(willUpData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    logger.info({ result }, 'update_tronuser_success');
    return true;
  } catch (err) {
    logger.error({ err }, 'update_tronuser_error_info:');
    return false;
  }
}

export default {
  walletUrl,
  getTronAccount,
  updateTronUser,
};
