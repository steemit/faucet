/* eslint-disable react/prop-types */
import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

export default class RecaptchaItem extends React.Component {
  componentDidMount() {
    this.captcha.execute();
  }

  verifyCallback = (result) => {
    console.log(result);
    this.props.onChange(result);
  };

  render() {
    return (
      <ReCAPTCHA
        ref={(el) => { this.captcha = el; }}
        sitekey={process.env.RECAPTCHA_SITE_KEY}
        size="invisible"
        onChange={this.verifyCallback}
      />
    );
  }
}
