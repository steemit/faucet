import { connect } from 'react-redux';
import toJS from '../utils/to-js';
import Locale from '../components/Locale';

const mapStateToProps = state => ({
    locale: state.app.get('locale'),
    translations: state.app.get('translations'),
    antdLocales: state.app.get('antdLocales')
});
const LocaleWrapper = connect(mapStateToProps, null)(toJS(Locale));
export default LocaleWrapper;
