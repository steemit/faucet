import React, { PropTypes } from 'react';
import locales from '../../helpers/locales.json';

const LanguageItem = ({ setLocale, locale }) => (
  <li>
    <button onClick={() => setLocale(locale)}>
      {locales[locale]}
    </button>
  </li>
);

LanguageItem.propTypes = {
  setLocale: PropTypes.func.isRequired,
  locale: PropTypes.string.isRequired,
};

export default LanguageItem;
