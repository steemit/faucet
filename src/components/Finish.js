import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, Button, Checkbox } from 'antd';
import PdfDownload from './PdfDownload.js';

class Finish extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dlPdf: false,
    };
  }

  componentWillMount() {}

  componentDidMount() {
    setTimeout(() => {
      this.setState({ dlPdf: true });
    }, 1000);
  }

  getBtnStatus = () => {
    const { form } = this.props;
    const hasDownloaded = form.getFieldValue('has_downloaded');
    return !hasDownloaded;
  };

  requireDownload = (rule, value, callback) => {
    if (value) {
      callback();
      return;
    }
    callback(false);
  };

  downloadPdf = () => {
    this.setState({ dlPdf: true });
  };

  resetDlPdf = () => {
    this.setState({ dlPdf: false });
  };

  handleSubmit = () => {
    // this.downloadPdf();
    console.log('go to wallet');
    const { username } = this.props;
    const url = `https://steemitwallet.com/@${username}/permissions`;
    window.location = url;
  };

  render() {
    const {
      form: { getFieldDecorator },
      intl,
      username,
      password,
      tronAddr,
    } = this.props;
    const { dlPdf } = this.state;
    return (
      <div>
        <Form onSubmit={this.handleSubmit} className="signup-form">
          <h1>
            <FormattedMessage id="welcome_page_title" /> {username}
          </h1>
          <div
            style={{
              marginTop: '3.2px',
            }}
          >
            <a role="button" tabIndex={0} onClick={() => this.downloadPdf()}>
              <FormattedMessage id="click_here_to_download" />
            </a>
            <FormattedMessage id="welcome_page_message_1" />
          </div>
          <div
            style={{
              marginTop: '3.2px',
            }}
          >
            <FormattedMessage id="welcome_page_message_2" />
          </div>
          <Form.Item key="has_downloaded">
            {getFieldDecorator('has_downloaded', {
              rules: [
                {
                  required: true,
                  message: intl.formatMessage({
                    id: 'must_download',
                  }),
                  validator: this.requireDownload,
                },
              ],
              valuePropName: 'checked',
              initialValue: false,
            })(
              <Checkbox
                className="signup-checkbox"
                style={{
                  fontSize: '1.2rem',
                  marginTop: '10px',
                }}
              >
                <FormattedMessage id="has_downloaded_pdf" />
              </Checkbox>
            )}
          </Form.Item>
          <div
            style={{
              marginTop: '3.2px',
            }}
          >
            <FormattedMessage id="welcome_page_message_3" />
          </div>
          <div
            style={{
              marginTop: '50px',
            }}
          >
            <Button
              className="custom-btn"
              style={{ width: '100%' }}
              type="primary"
              size="large"
              onClick={this.handleSubmit}
              disabled={this.getBtnStatus()}
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
          resetDlPdf={this.resetDlPdf}
          tron_address={tronAddr.pubKey}
          tron_key={tronAddr.privKey}
        />
      </div>
    );
  }
}

export default Form.create()(injectIntl(Finish));
