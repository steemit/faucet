import { connect } from 'react-redux';
import { setLocale } from '../reducers/app';
import CreateAccount from '../components/CreateAccount';
import { logCheckpoint } from '../reducers/tracking';
import { setTrackingId } from '../reducers/user';

const mapStateToProps = state => ({
    locale: state.app.get('locale')
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
    }
});

const CreateAccountSteps = connect(mapStateToProps, mapDispatchToProps)(
    CreateAccount
);
export default CreateAccountSteps;
