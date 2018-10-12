/* eslint dot-notation:0 */
import React from 'react';

export default class SiftTracker extends React.Component {
    static propTypes = {
        email: React.PropTypes.string.isRequired,
    };

    componentDidMount() {
        const key = window.config.SIFTSCIENCE_JS_SNIPPET_KEY;

        if (key) {
            const script = document.createElement('script');
            script.src = 'https://cdn.siftscience.com/s.js';
            script.async = true;
            script.onload = () => {
                window['_sift'] = window['_sift'] || [];
                window['_sift'].push(['_setAccount', key]);
                window['_sift'].push(['_setUserId', '']);
                window['_sift'].push([
                    '_setSessionId',
                    `${this.props.email}+faucetsession`,
                ]);
                window['_sift'].push(['_trackPageview']);
            };
            document.body.appendChild(script);
        }
    }
    render() {
        return <div>&nbsp;</div>;
    }
}
