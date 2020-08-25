import apiCall from './api';

export default async function getTronAddr() {
    try {
        const tronAddr = await apiCall('/api/create_tron_addr', {}, 'GET');
        return tronAddr;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        return {
            pubKey: '',
            privKey: '',
        };
    }
}
