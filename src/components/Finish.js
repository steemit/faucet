import React, { useEffect, useState } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, Button, Checkbox } from 'antd';
import PdfDownload from './PdfDownload.js';

const Finish = ({ form, intl, username, password, tronAddr }) => {
  const [dlPdf, setDlPdf] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDlPdf(true);
    }, 1000);
    return () => clearTimeout(timer); // 清理定时器
  }, []);

  const getBtnStatus = () => {
    const hasDownloaded = form.getFieldValue('has_downloaded');
    return !hasDownloaded;
  };

  const requireDownload = (rule, value, callback) => {
    if (value) {
      callback();
      return;
    }
    callback(false);
  };

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

  return (
    <div>
      <Form onSubmit={handleSubmit} className="signup-form">
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
        <Form.Item key="has_downloaded">
          {form.getFieldDecorator('has_downloaded', {
            rules: [
              {
                required: true,
                message: intl.formatMessage({ id: 'must_download' }),
                validator: requireDownload,
              },
            ],
            valuePropName: 'checked',
            initialValue: false,
          })(
            <Checkbox
              className="signup-checkbox"
              style={{ fontSize: '1.2rem', marginTop: '10px' }}
            >
              <FormattedMessage id="has_downloaded_pdf" />
            </Checkbox>
          )}
        </Form.Item>
        <div style={{ marginTop: '3.2px' }}>
          <FormattedMessage id="welcome_page_message_3" />
        </div>
        <div style={{ marginTop: '50px' }}>
          <Button
            className="custom-btn"
            style={{ width: '100%' }}
            type="primary"
            size="large"
            onClick={handleSubmit}
            disabled={getBtnStatus()}
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
        tron_address={tronAddr.pubKey}
        tron_key={tronAddr.privKey}
      />
    </div>
  );
};

export default injectIntl(Finish);
