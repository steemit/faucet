/* eslint-disable react/prop-types */
import React from 'react';
import steem from '@steemit/steem-js';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form, message, Input, Button, Checkbox } from 'antd';
import apiCall from '../../../utils/api';
import { signData } from '../../../utils/encrypted';
import getFingerprint from '../../../../helpers/fingerprint';

class CreateAccount extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fingerprint: '',
        };
    }

    componentWillMount() {
        this.setState({
            fingerprint: JSON.stringify(getFingerprint()),
        });
    }

    getBtnStatus = () => {
        const { form, password } = this.props;
        const tos = form.getFieldValue('agree_tos');
        const pp = form.getFieldValue('agree_pp');
        const isEqual = form.getFieldValue('password') === password;
        return !(isEqual && tos && pp);
    }

    passwordEquals = (rule, value, callback) => {
        const { init, password, intl } = this.props;
        if (init) {
            callback();
        } else if (password !== value) {
            callback(intl.formatMessage({ id: 'error_password_match' }));
        } else {
            callback();
        }
    };

    requireTerms = (rule, value, callback) => {
        if (value) {
            callback();
            return;
        }

        callback(false);
    };

    handleSubmit = e => {
        e.preventDefault();
        if (this.state.submitting) return;
        this.setState({ submitting: true });
        const {
            form: { validateFieldsAndScroll },
            username,
            token,
            password,
            intl,
            handleCreateAccount,
            trackingId,
            locale,
            tronAddr,
        } = this.props;
        const { fingerprint } = this.state;
        const roles = ['posting', 'active', 'owner', 'memo'];
        const pubKeys = steem.auth.generateKeys(username, password, roles);
        const privKeys = steem.auth.getPrivateKeys(username, password, roles);
        const tronBindData = signData({
            username,
            tron_addr: tronAddr.pubKey,
        }, privKeys.posting);
        validateFieldsAndScroll(err => {
            if (!err) {
                apiCall('/api/create_account_new', {
                    token,
                    public_keys: JSON.stringify(pubKeys),
                    fingerprint,
                    tron_bind_data: JSON.stringify(tronBindData),
                    xref: trackingId,
                    locale,
                })
                    .then(() => {
                        this.setState({ submitting: false });
                        handleCreateAccount();
                    })
                    .catch(error => {
                        this.setState({ submitting: false });
                        message.error(intl.formatMessage({ id: error.type }));
                    });
            } else {
                this.setState({ submitting: false });
            }
        });
    };

    render() {
        const { form: { getFieldDecorator }, intl, goBack } = this.props;
        return (
            <div>
                <Form onSubmit={this.handleSubmit} className="signup-form ">
                    <Form.Item style={{ marginBottom: '2rem' }}>
                        {getFieldDecorator('password', {
                            rules: [
                                {
                                    required: true,
                                    message: intl.formatMessage({
                                        id: 'error_password_required',
                                    }),
                                },
                                { validator: this.passwordEquals },
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
                        {getFieldDecorator('agree_tos', {
                            rules: [
                                {
                                    required: true,
                                    message: intl.formatMessage({
                                        id: 'must_agree_tos',
                                    }),
                                    validator: this.requireTerms,
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
                        {getFieldDecorator('agree_pp', {
                            rules: [
                                {
                                    required: true,
                                    message: intl.formatMessage({
                                        id: 'must_agree_pp',
                                    }),
                                    validator: this.requireTerms,
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
                    <div className="create-account-info" style={{ marginTop: '3rem', marginBottom: '1rem', }}>
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
                            loading={this.state.submitting}
                            disabled={this.getBtnStatus()}
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
                            ><FormattedMessage id="go_back" /></a>
                        </Form.Item>
                    )}
                </Form>
            </div>
        );
    }
}

export default Form.create()(injectIntl(CreateAccount));
