/* eslint no-console: ["error", { allow: ["warn", "error"] }] */

const serviceWrapper = (service, fn, debugMode) => {
    const services = {
        twilio: (phoneNumber, phoneCode = false) => {
            if (phoneCode) console.warn('\x1b[33m%s\x1b[0m', `\n DEBUG MODE, PHONE CODE: \n ${phoneCode} \n`);
            return true;
        },
        sendGrid: (email, type, content) => {
            console.warn('\x1b[33m%s\x1b[0m', `\n DEBUG MODE, CONFIRMATION EMAIL: \n ${content.url} \n`);
            return true;
        },
        actionLimit: () => {
            console.warn('\x1b[33m%s\x1b[0m', '\n DEBUG MODE, ACTION LIMIT SKIPPED. \n');
            return true;
        },
        recaptcha: () => {
            console.warn('\x1b[33m%s\x1b[0m', '\n DEBUG MODE, RECAPTCHA SKIPPED. \n');
            return true;
        },
        steem: endpoint => {
            const endpoints = {
                'conveyor.is_email_registered': false,
                'conveyor.is_phone_registered': false,
                'conveyor.set_user_data': Promise.resolve(),
            };
            console.warn('\x1b[33m%s\x1b[0m', `\n DEBUG MODE, CONVEYOR SKIPPED: \n ${endpoint} \n`);
            return endpoints[endpoint];
        },
        steemUser: () => [],
        steemBroadcast: () => true,
        condenser: () => Promise.resolve({
            status: 200
        }),
    };
    const fnToCall = debugMode ? services[service] : fn;
    return fnToCall;
};

module.exports = {
    serviceWrapper,
};
