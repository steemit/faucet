import { connect } from 'react-redux';
import { toJS } from '../utils/to-js';
import Locale from '../components/Locale';
const mapStateToProps = (state, ownProps) => {
    return {
        app: state.app,
    };
};
const LocaleWrapper = connect(mapStateToProps, null)(toJS(Locale));
export default LocaleWrapper;
