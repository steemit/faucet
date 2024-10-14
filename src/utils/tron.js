import apiCall from './api.js';

export default async function getTronAddr() {
  try {
    const tronAddr = await apiCall('/api/create_tron_addr', {}, 'GET');
    return tronAddr;
  } catch (e) {
    console.error(e);
    return {
      pubKey: '',
      privKey: '',
    };
  }
}
