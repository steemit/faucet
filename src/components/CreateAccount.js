import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Cookies from 'js-cookie';
import { steem } from '@steemit/steem-js';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, Input, Button, Checkbox } from 'antd';
import apiCall from '../utils/api.js';
import getHashParams from '../utils/url.js';
import { CHECKPOINTS } from '../../constants.js';

const CreateAccount = ({
  logCheckpoint,
  token,
  fingerprint,
  tracking_id,
  locale,
  goBack,
  messageApi,
  username,
  password,
  setStep,
  intl,
}) => {
  const [form] = Form.useForm();
  const urlParams = getHashParams();
  const [submitting, setSubmitting] = useState(false);
  const [btnDisabled, setBtnDisabled] = useState(true);
  const source = urlParams.source ? urlParams.source : null;
  const app = useSelector((state) => state.app);

  useEffect(() => {}, []);

  const formValuesChange = () => {
    const tos = form.getFieldValue('agree_tos');
    const pp = form.getFieldValue('agree_pp');
    const isEqual = password && form.getFieldValue('password') === password;
    setBtnDisabled(!(isEqual && tos && pp));
  };

  const passwordCheck = (_, value) => {
    console.log('password injected:', password);
    if (value.length > 0 && password !== value) {
      return Promise.reject(intl.formatMessage({ id: 'error_password_match' }));
    }
    if (value.length === 0) {
      return Promise.reject(
        intl.formatMessage({ id: 'error_password_required' })
      );
    }
    return Promise.resolve();
  };

  const requireTerms = (_, value) => {
    if (value) {
      return Promise.resolve();
    }
    return Promise.reject(false);
  };

  const onFinish = () => {
    if (submitting) return;
    setSubmitting(true);
    const roles = ['posting', 'active', 'owner', 'memo'];
    const pubKeys = steem.auth.generateKeys(username, password, roles);
    const activityTags = getActivityTags();
    apiCall('/api/create_account', {
      token,
      public_keys: JSON.stringify(pubKeys),
      fingerprint,
      tracking_id,
      locale,
      activityTags,
      source,
    })
      .then(() => {
        setSubmitting(false);
        logCheckpoint(CHECKPOINTS.user_created);
        setStep('finish');
      })
      .catch((error) => {
        setSubmitting(false);
        console.error('error', error);
        messageApi.open({
          type: 'error',
          content: intl.formatMessage({ id: error.type }),
        });
      });
  };

  const getActivityTags = () => {
    const cookieName = app.activityCookieName;
    const activityTags = Cookies.get(cookieName);
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

  return (
    <div>
      <Form
        form={form}
        onFinish={onFinish}
        variant="filled"
        scrollToFirstError={true}
        onValuesChange={formValuesChange}
        className="signup-form "
      >
        <Form.Item
          style={{ marginBottom: '2rem' }}
          name="password"
          rules={[
            {
              required: true,
              validator: passwordCheck,
            },
          ]}
          initialValue=""
        >
          <Input.TextArea
            className="input-password-textarea"
            placeholder={intl.formatMessage({
              id: 'master_password',
            })}
            name="password"
          />
        </Form.Item>
        <Form.Item
          name="agree_tos"
          valuePropName="checked"
          initialValue={false}
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'must_agree_tos',
              }),
              validator: requireTerms,
            },
          ]}
        >
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
        </Form.Item>
        <Form.Item
          name="agree_pp"
          valuePropName="checked"
          initialValue={false}
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'must_agree_pp',
              }),
              validator: requireTerms,
            },
          ]}
        >
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
            disabled={btnDisabled}
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

export default injectIntl(CreateAccount);
