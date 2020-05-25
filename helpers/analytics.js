import fetch from 'isomorphic-fetch';

const updateAnalytics = eventId => {
    fetch(`/api/analytics?event_id=${eventId}`)
        .then(() => {})
        .catch(() => {});
};

export default updateAnalytics;
