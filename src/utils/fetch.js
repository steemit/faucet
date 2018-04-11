// TODO: Sagas make this obsolete.
const checkStatus = response => {
    if (response.status >= 200 && response.status < 300) {
        return response;
    }

    const error = new Error(response.statusText);
    error.response = response;
    throw error;
};

// TODO: suggest not abstracting as a util.
const parseJSON = response => response.json();

module.exports = {
    checkStatus,
    parseJSON,
};
