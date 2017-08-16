/* eslint-disable react/prop-types */
import React from 'react';
import ReactRecaptcha from 'react-recaptcha';

export default class RecaptchaItem extends React.Component {
  verifyCallback = (result) => {
    this.props.onChange(result);
  };

  render() {
    return (
      <ReactRecaptcha
        render="explicit"
        sitekey={process.env.RECAPTCHA_SITE_KEY}
        onloadCallback={() => {}}
        verifyCallback={this.verifyCallback}
      />
    );
  }
}
