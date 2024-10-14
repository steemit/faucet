import React from 'react';
import { locales } from '../utils/locales.js';

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
