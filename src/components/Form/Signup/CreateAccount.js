/* eslint-disable no-console */
/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
// import steem from '@steemit/steem-js';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, message, Input, Button, Checkbox } from 'antd';
// import { signData } from '@steemfans/auth-data';
import apiCall from '../../../utils/api.js';
import getFingerprint from '../../../utils/fingerprint.js';
import getHashParams from '../../../utils/url.js';

// TODO: Mock steem-js for testing
const steem = {
  auth: {
    generateKeys: () => ({}),
    getPrivateKeys: () => ({}),
  },
};

// TODO: Mock signData for testing
const signData = () => ({});

const CreateAccount = (props) => {
  const { form, password, intl, handleCreateAccount, goBack } = props;
  const urlParams = getHashParams();
  const [fingerprint, setFingerprint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const source = urlParams.source ? urlParams.source : null;

  useEffect(() => {
    setFingerprint(JSON.stringify(getFingerprint()));
  }, []);

  const getBtnStatus = () => {
    const tos = form.getFieldValue('agree_tos');
    const pp = form.getFieldValue('agree_pp');
    const isEqual = form.getFieldValue('password') === password;
    return !(isEqual && tos && pp);
  };

  const passwordEquals = (rule, value, callback) => {
    const { init, password, intl } = props;
    if (init) {
      callback();
    } else if (password !== value) {
      callback(intl.formatMessage({ id: 'error_password_match' }));
    } else {
      callback();
    }
  };

  const requireTerms = (rule, value, callback) => {
    if (value) {
      callback();
      return;
    }

    callback(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const { username, token, trackingId, locale, tronAddr } = props;
    const roles = ['posting', 'active', 'owner', 'memo'];
    const pubKeys = steem.auth.generateKeys(username, password, roles);
    const privKeys = steem.auth.getPrivateKeys(username, password, roles);
    const tronBindData = signData(
      {
        username,
        tron_addr: tronAddr.pubKey,
        is_new_user: true,
      },
      privKeys.posting
    );
    const activityTags = getActivityTags();
    form.validateFieldsAndScroll((err) => {
      if (!err) {
        apiCall('/api/create_account_new', {
          token,
          public_keys: JSON.stringify(pubKeys),
          fingerprint,
          tron_bind_data: JSON.stringify(tronBindData),
          xref: trackingId,
          locale,
          activityTags,
          source,
        })
          .then(() => {
            setSubmitting(false);
            updateActivityTags();
            handleCreateAccount();
          })
          .catch((error) => {
            setSubmitting(false);
            message.error(intl.formatMessage({ id: error.type }));
          });
      } else {
        setSubmitting(false);
      }
    });
  };

  const getActivityTags = () => {
    const cookieName = props.app.activityCookieName;
    const activityTags = Cookies.getJSON(cookieName);
    const result = [];
    if (activityTags !== undefined) {
      Object.keys(activityTags).forEach((tag) => {
        if (activityTags[tag].isReg === 0) {
          result.push(tag);
        }
      });
    }
    return result;
  };

  const updateActivityTags = () => {
    const cookieName = props.app.activityCookieName;
    const expiresTime = props.app.activityCookieExpiresTime;
    const activityTags = Cookies.getJSON(cookieName);
    const trackingId = props.trackingId;
    if (activityTags !== undefined) {
      // location info
      const hostname = window.location.hostname;
      const locationInfo = hostname.split('.').reverse();
      const domain =
        ['localhost', '127.0.0.1'].indexOf(hostname) === -1
          ? `.${locationInfo[1]}.${locationInfo[0]}`
          : hostname;
      console.log(
        'cookies update:',
        activityTags,
        trackingId,
        domain,
        cookieName,
        expiresTime
      );
      Object.keys(activityTags).forEach((tag) => {
        if (activityTags[tag].isReg === 0) {
          activityTags[tag].isReg = 1;
        }
      });
      Cookies.set(cookieName, activityTags, { expires: expiresTime, domain });
    }
  };

  return (
    <div>
      <Form onSubmit={handleSubmit} className="signup-form ">
        <Form.Item style={{ marginBottom: '2rem' }}>
          {form.getFieldDecorator('password', {
            rules: [
              {
                required: true,
                message: intl.formatMessage({
                  id: 'error_password_required',
                }),
              },
              { validator: passwordEquals },
            ],
            initialValue: '',
          })(
            <Input.TextArea
              className="input-password-textarea"
              placeholder={intl.formatMessage({
                id: 'master_password',
              })}
              id="password"
            />
          )}
        </Form.Item>
        <Form.Item key="agree_tos">
          {form.getFieldDecorator('agree_tos', {
            rules: [
              {
                required: true,
                message: intl.formatMessage({
                  id: 'must_agree_tos',
                }),
                validator: requireTerms,
              },
            ],
            valuePropName: 'checked',
            initialValue: false,
          })(
            <Checkbox className="signup-checkbox">
              <FormattedMessage
                id="i_agree_to_document"
                values={{
                  document: (
                    <a
                      className="doc-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      href="https://steemit.com/tos.html"
                    >
                      <FormattedMessage id="terms_of_service" />
                    </a>
                  ),
                }}
              />
            </Checkbox>
          )}
        </Form.Item>
        <Form.Item key="agree_pp">
          {form.getFieldDecorator('agree_pp', {
            rules: [
              {
                required: true,
                message: intl.formatMessage({
                  id: 'must_agree_pp',
                }),
                validator: requireTerms,
              },
            ],
            valuePropName: 'checked',
            initialValue: false,
          })(
            <Checkbox className="signup-checkbox">
              <FormattedMessage
                id="i_agree_to_document"
                values={{
                  document: (
                    <a
                      className="doc-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      href="https://steemit.com/privacy.html"
                    >
                      <FormattedMessage id="privacy_policy" />
                    </a>
                  ),
                }}
              />
            </Checkbox>
          )}
        </Form.Item>
        <div
          className="create-account-info"
          style={{ marginTop: '3rem', marginBottom: '1rem' }}
        >
          <p style={{ paddingBottom: '0.2rem' }}>
            <FormattedMessage id="create_account_tip1" />
          </p>
          <p style={{ paddingBottom: '0.2rem' }}>
            <FormattedMessage id="create_account_tip2" />
          </p>
          <p style={{ paddingBottom: '0.2rem' }}>
            <FormattedMessage id="create_account_tip3" />
          </p>
          <p style={{ paddingBottom: '0.2rem' }}>
            <FormattedMessage id="create_account_tip4" />
          </p>
        </div>
        <Form.Item>
          <Button
            className="create-account custom-btn"
            style={{
              fontSize: '16px',
            }}
            type="primary"
            htmlType="submit"
            loading={submitting}
            disabled={getBtnStatus()}
          >
            <FormattedMessage id={'create_account_and_download_pdf'} />
          </Button>
        </Form.Item>
        {goBack && (
          <Form.Item>
            <a
              role="button"
              tabIndex={0}
              className="back"
              onClick={(e) => {
                e.preventDefault();
                goBack();
              }}
            >
              <FormattedMessage id="go_back" />
            </a>
          </Form.Item>
        )}
      </Form>
    </div>
  );
};

export default Form.create()(injectIntl(CreateAccount));
