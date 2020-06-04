import { connect } from 'react-redux';
import { setLocale } from '../reducers/app';
import Welcome from '../components/Welcome';
import { logCheckpoint } from '../reducers/tracking';
import { setTrackingId } from '../reducers/user';

const mapStateToProps = state => ({
    locale: state.app.get('locale'),
    username: state.user.username,
});

const mapDispatchToProps = dispatch => ({
    setLocale: locale => {
        dispatch(setLocale(locale));
    },
    logCheckpoint: checkpoint => {
        dispatch(logCheckpoint(checkpoint));
    },
    setTrackingId: trackingId => {
        dispatch(setTrackingId(trackingId));
    },
});

const WelcomeSteps = connect(mapStateToProps, mapDispatchToProps)(Welcome);
export default WelcomeSteps;
