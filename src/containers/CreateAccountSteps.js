import { connect } from 'react-redux';
import { setLocale } from '../reducers/app';
import CreateAccount from '../components/CreateAccount';

const mapStateToProps = state => ({
    locale: state.app.locale,
});
const mapDispatchToProps = dispatch => ({
    setLocale: locale => {
        dispatch(setLocale(locale));
    },
});

const CreateAccountSteps = connect(mapStateToProps, mapDispatchToProps)(
    CreateAccount
);
export default CreateAccountSteps;
