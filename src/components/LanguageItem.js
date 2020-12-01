import React, { PropTypes } from 'react';
import locales from '../../helpers/locales.json';

const LanguageItem = ({ setLocale, locale, onClick }) => (
    <li>
        <button onClick={(e) => {
            setLocale(locale);
            onClick(e);
        }}>{locales[locale]}</button>
    </li>
);

LanguageItem.propTypes = {
    setLocale: PropTypes.func.isRequired,
    locale: PropTypes.string.isRequired,
    onClick: PropTypes.func,
};

LanguageItem.defaultProps = {
    onClick: () => {},
};

export default LanguageItem;
