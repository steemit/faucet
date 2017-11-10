import { key_utils as keyUtils } from 'steem/lib/auth/ecc';

// https://github.com/steemit/condenser/blob/634c13cd0d2fafa28592e9d5f43589e201198248/app/components/elements/SuggestPassword.jsx#L97
const createSuggestedPassword = () => {
  const PASSWORD_LENGTH = 32;
  const privateKey = keyUtils.get_random_key();
  return privateKey.toWif().substring(3, 3 + PASSWORD_LENGTH);
};

export default createSuggestedPassword;
