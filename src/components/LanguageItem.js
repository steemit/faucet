import React from 'react';
import locales from '../../helpers/locales.json';

const LanguageItem = ({ setLocale, locale, onClick }) => (
  <li>
    <button
      onClick={(e) => {
        setLocale(locale);
        onClick(e);
      }}
    >
      {locales[locale]}
    </button>
  </li>
);

LanguageItem.defaultProps = {
  onClick: () => {},
};

export default LanguageItem;
