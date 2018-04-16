import { connect } from 'react-redux';
import { toJS } from '../utils/to-js';
import { setLocale } from '../reducers/app';
import {
    guessCountryCode,
    incrementStep,
    decrementStep,
    setStep,
    setUsername,
    setEmail,
    setPhone,
    setPhoneFormatted,
    setToken,
    setPrefix,
    setCompleted,
} from '../reducers/user';
import Signup from '../components/Signup';

const mapStateToProps = (state, ownProps) =>
    // TODO: Use selectors to access state here.
    // https://redux.js.org/introduction/learning-resources#selectors
    ({
        queryParams: ownProps.location.query,
        app: state.app,
        user: state.user,
    });

const mapDispatchToProps = dispatch => ({
    setLocale: locale => {
        dispatch(setLocale(locale));
    },
    guessCountryCode: () => {
        dispatch(guessCountryCode());
    },
    incrementStep: () => {
        dispatch(incrementStep());
    },
    decrementStep: () => {
        dispatch(decrementStep());
    },
    setStep: stepName => {
        dispatch(setStep(stepName));
    },
    setUsername: username => {
        dispatch(setUsername(username));
    },
    setEmail: email => {
        dispatch(setEmail(email));
    },
    setPhone: phone => {
        dispatch(setPhone(phone));
    },
    setPhoneFormatted: phoneFormatted => {
        dispatch(setPhoneFormatted(phoneFormatted));
    },
    setToken: token => {
        dispatch(setToken(token));
    },
    setPrefix: prefix => {
        dispatch(setPrefix(prefix));
    },
    setCompleted: completed => {
        dispatch(setCompleted(completed));
    },
});

const SignupSteps = connect(mapStateToProps, mapDispatchToProps)(toJS(Signup));
export default SignupSteps;
