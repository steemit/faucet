import { connect } from 'react-redux';
import ConfirmEmail from '../components/ConfirmEmail';
import { logCheckpoint } from '../reducers/tracking';
import { setTrackingId } from '../reducers/user';

const mapDispatchToProps = dispatch => ({
    setTrackingId: trackingId => {
        dispatch(setTrackingId(trackingId));
    },
    logCheckpoint: checkpoint => {
        dispatch(logCheckpoint(checkpoint));
    }
});

const ConfirmEmailStep = connect(null, mapDispatchToProps)(ConfirmEmail);
export default ConfirmEmailStep;
