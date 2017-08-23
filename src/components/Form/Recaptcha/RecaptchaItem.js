/* eslint-disable react/prop-types */
import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

export default class RecaptchaItem extends React.Component {
  componentDidMount() {
    this.captcha.execute();
  }

  verifyCallback = (result) => {
    this.props.onChange(result);
  };

  render() {
    return (
      <ReCAPTCHA
        ref={(el) => { this.captcha = el; }}
        sitekey={process.env.RECAPTCHA_SITE_KEY}
        type="image"
        size="invisible"
        onChange={this.verifyCallback}
      />
    );
  }
}
