import express from 'express';
import ApiError from '../helpers/errortypes.js';
import apiHandlers from './apiHandlers.js';

function apiMiddleware(handler) {
  return (req, res) => {
    handler(req, res)
      .then((result) => {
        res.json(result);
      })
      .catch((error) => {
        let err = error;
        if (!(err instanceof ApiError)) {
          err = new ApiError({
            type: 'error_api_general',
            status: 500,
            cause: err,
          });
        }
        if (err.status >= 500) {
          req.log.error(err.cause || err, 'Unexpected API error');
        } else if (error.status >= 400) {
          req.log.warn(err.cause || err, 'API Error: %s', err.type);
        }
        res.status(err.status);
        res.json({ error: err });
      });
  };
}

const router = express.Router();

router.get(
  '/',
  apiMiddleware(async () => {
    return { ok: true };
  })
);

router.get('/guess_country', apiMiddleware(apiHandlers.handleGuessCountry));

router.post('/check_username', apiMiddleware(apiHandlers.handleCheckUsername));

router.post(
  '/request_email',
  apiMiddleware((req) =>
    apiHandlers.handleRequestEmailCode(req.ip, req.body.email, req.body.locale)
  )
);

router.post('/request_sms', apiMiddleware(apiHandlers.handleRequestSms));

router.post(
  '/check_email_code',
  apiMiddleware(apiHandlers.handleConfirmEmailCode)
);
router.post('/check_phone_code', apiMiddleware(apiHandlers.handleConfirmSms));
router.post(
  '/create_user',
  apiMiddleware((req) =>
    apiHandlers.finalizeSignup(
      req.ip,
      req.body.recaptcha,
      req.body.email,
      req.body.emailCode,
      req.body.phoneNumber,
      req.body.phoneCode,
      req.body.username
    )
  )
);
router.post('/create_account', apiMiddleware(apiHandlers.handleCreateAccount));

router.get(
  '/create_tron_addr',
  apiMiddleware(apiHandlers.handleCreateTronAddr)
);

// This api is a temporary api. This will be removed in the future!
router.get('/analytics', apiMiddleware(apiHandlers.handleAnalytics));

export default router;
