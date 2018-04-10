import { connect } from 'react-redux';
import Locale from '../components/Locale';
const mapStateToProps = (state, ownProps) => {
    return {
        locale: state.appLocale.locale,
        translations: state.appLocale.translations,
        antdLocales: state.appLocale.antdLocales,
    };
};
const LocaleWrapper = connect(mapStateToProps, null)(Locale);
export default LocaleWrapper;
