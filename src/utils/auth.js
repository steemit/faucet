import { key_utils as keyUtils } from '@steemit/steem-js/lib/auth/ecc';

const createSuggestedPassword = () => `P${keyUtils.get_random_key().toWif()}`;

export default createSuggestedPassword;
