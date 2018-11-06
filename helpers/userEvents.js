var MobileDetect = require('mobile-detect');
var UserAnalytics = require('user-analytics');

function UserEvents() {}

UserEvents.trackSignup = function(req, user) {
    const endpoint = process.env.USER_ANALYTICS_ENDPOINT;
    const token = process.env.USER_ANALYTICS_TOKEN;
    const streamName = process.env.USER_ANALYTICS_STREAM_NAME;
    const env = process.env.NODE_ENV;
    console.log('options', endpoint, token);
    const userAnalytics = new UserAnalytics({
        token: token,
        endpoint: endpoint,
    });
    const mobileDetect = new MobileDetect(req.headers['user-agent']);
    const data = {
        distinct_id: '',
        time: UserAnalytics.toAthenaTimestamp(new Date()),
        ip: user.ip,
        env: env,
        event: 'sign_up',
        event_id: '',
        subcategory: '',
        source: 'faucet',
        client: mobileDetect.os(),
        os_version: '',
        app_version: '',
    };

    console.info(
        'UserEvents is posting to ' +
            streamName +
            ' with ' +
            JSON.stringify(data)
    );
    let promise = userAnalytics.post(streamName, data).catch(function(e) {
        // Uncaught JS promises will raise. Since this is fire-and-forget, we do
        // not want to raise if the request failed.
        console.error(e);
    });

    // Return a promise, so we can wait for completion if needed.
    return promise;
};

module.exports = {
    UserEvents: UserEvents,
};
