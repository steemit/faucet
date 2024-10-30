import React, { useEffect, useState } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, Button, Checkbox } from 'antd';
import PdfDownload from './PdfDownload.js';

const Finish = ({ username, password, intl }) => {
  const [form] = Form.useForm();
  const [dlPdf, setDlPdf] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDlPdf(true);
    }, 1000);
    return () => clearTimeout(timer); // 清理定时器
  }, []);

  const downloadPdf = () => {
    setDlPdf(true);
  };

  const resetDlPdf = () => {
    setDlPdf(false);
  };

  const handleSubmit = () => {
    console.log('go to wallet');
    const url = `https://steemitwallet.com/@${username}/permissions`;
    window.location = url;
  };

  const handleCheckboxChange = (e) => {
    setHasDownloaded(e.target.checked);
  };

  return (
    <div>
      <Form form={form} onFinish={handleSubmit} className="signup-form">
        <h1>
          <FormattedMessage id="welcome_page_title" /> {username}
        </h1>
        <div style={{ marginTop: '3.2px' }}>
          <a role="button" tabIndex={0} onClick={downloadPdf}>
            <FormattedMessage id="click_here_to_download" />
          </a>
          <FormattedMessage id="welcome_page_message_1" />
        </div>
        <div style={{ marginTop: '3.2px' }}>
          <FormattedMessage id="welcome_page_message_2" />
        </div>
        <Form.Item
          name="has_downloaded"
          valuePropName="checked"
          initialValue={false}
          rules={[
            {
              required: true,
              message: intl.formatMessage({ id: 'must_download' }),
              validator: (_, value) => {
                if (!value) {
                  return Promise.reject(false);
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Checkbox className="signup-checkbox" onChange={handleCheckboxChange}>
            <FormattedMessage id="has_downloaded_pdf" />
          </Checkbox>
        </Form.Item>
        <div style={{ marginTop: '3.2px' }}>
          <FormattedMessage id="welcome_page_message_3" />
        </div>
        <div style={{ marginTop: '50px' }}>
          <Button
            className="custom-btn"
            style={{ width: '100%' }}
            type="primary"
            htmlType="submit"
            size="large"
            disabled={!hasDownloaded}
          >
            <FormattedMessage id="welcome_page_go_to_wallet" />
          </Button>
        </div>
      </Form>
      <PdfDownload
        widthInches={8.5}
        heightInches={11.0}
        name={username}
        password={password}
        dlPdf={dlPdf}
        resetDlPdf={resetDlPdf}
      />
    </div>
  );
};

export default injectIntl(Finish);
