import { connect } from 'react-redux';
import { setLocale } from '../reducers/appLocale';
import CreateAccount from '../components/CreateAccount';

const mapStateToProps = (state, ownProps) => {
    return {
        locale: state.appLocale.locale,
    };
};
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        setLocale: locale => {
            dispatch(setLocale(locale));
        },
    };
};

const CreateAccountSteps = connect(mapStateToProps, mapDispatchToProps)(
    CreateAccount
);
export default CreateAccountSteps;
