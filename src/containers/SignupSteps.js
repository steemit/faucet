import { connect } from 'react-redux';
import { setLocale } from '../reducers/appLocale';
import Signup from '../components/Signup';
const mapStateToProps = (state, ownProps) => {
    return {
        locale: state.appLocale.locale,
        locales: state.appLocale.locales,
    };
};
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        setLocale: locale => {
            dispatch(setLocale(locale));
        },
    };
};
const SignupSteps = connect(mapStateToProps, mapDispatchToProps)(Signup);
export default SignupSteps;
