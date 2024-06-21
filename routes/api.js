const express = require('express');

const { ApiError } = require('../helpers/errortypes.js');
const apiHandlers = require('./apiHandlers');
// const database = require('../helpers/database');

function apiMiddleware(handler) {
    return (req, res) => {
        handler(req, res)
            .then(result => {
                res.json(result);
            })
            .catch(error => {
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

const router = express.Router(); // eslint-disable-line new-cap

router.get(
    '/',
    apiMiddleware(async () => {
        const rv = { ok: true };
        return rv;
    })
);

// router.post(
//     '/request_email',
//     apiMiddleware(req =>
//         apiHandlers.handleRequestEmail(
//             req.ip,
//             req.body.recaptcha,
//             req.body.email,
//             JSON.parse(req.body.fingerprint),
//             JSON.parse(req.body.query),
//             req.body.username,
//             req.body.xref,
//             req.protocol,
//             req.get('host')
//         )
//     )
// );

// router.post('/request_sms', apiMiddleware(apiHandlers.handleRequestSms));

// router.get('/confirm_email', apiMiddleware(apiHandlers.handleConfirmEmail));

// router.post('/confirm_sms', apiMiddleware(apiHandlers.handleConfirmSms));

router.get('/guess_country', apiMiddleware(apiHandlers.handleGuessCountry));

// router.post(
//     '/confirm_account',
//     apiMiddleware(req => apiHandlers.handleConfirmAccount(req.body.token))
// );

// router.post('/create_account', apiMiddleware(apiHandlers.handleCreateAccount));

router.post('/check_username', apiMiddleware(apiHandlers.handleCheckUsername));

// This api is a temporary api. This will be removed in the future!
router.get('/analytics', apiMiddleware(apiHandlers.handleAnalytics));

router.post(
    '/request_email_new',
    apiMiddleware(req =>
        apiHandlers.handleRequestEmailCode(
            req.ip,
            req.body.email,
            req.log,
            req.body.locale
        )
    )
);
router.post('/request_sms_new', apiMiddleware(apiHandlers.handleRequestSmsNew));
router.post(
    '/check_email_code',
    apiMiddleware(apiHandlers.handleConfirmEmailCode)
);
router.post(
    '/check_phone_code',
    apiMiddleware(apiHandlers.handleConfirmSmsNew)
);
router.post(
    '/create_user_new',
    apiMiddleware(req =>
        apiHandlers.finalizeSignupNew(
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
router.post(
    '/create_account_new',
    apiMiddleware(apiHandlers.handleCreateAccountNew)
);

router.get(
    '/create_tron_addr',
    apiMiddleware(apiHandlers.handleCreateTronAddr)
);

router.get(
    '/create_twilio_rate_limit',
    apiMiddleware(apiHandlers.handleCreateTwilioRateLimit)
);

router.get(
    '/create_twilio_rate_limit_bucket',
    apiMiddleware(apiHandlers.handleCreateTwilioRateLimitBucket)
);

router.get(
    '/update_twilio_rate_limit_bucket',
    apiMiddleware(apiHandlers.handleUpdateTwilioRateLimitBucket)
);

module.exports = router;
