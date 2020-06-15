import React, { PropTypes } from 'react';
import { injectIntl } from 'react-intl';
import { Button } from 'antd';

class SendCode extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            clickTimes: 0,
        };
    }

    getClassName = () => {
        const { clickTimes } = this.state;
        const { sending } = this.props;
        const dynamicList = {
            hasSend: 'has-send',
            sending: 'sending',
        }
        let className = ['send-code'];
        // has-send class
        className = this.addOrRemoveClass(dynamicList.hasSend, className, clickTimes > 0);
        // sending class
        className = this.addOrRemoveClass(dynamicList.sending, className, sending);
        // return
        return className.join(' ');
    }

    addOrRemoveClass = (needle, stack, condition) => {
        const isExist = stack.indexOf(needle);
        if (condition) {
            if (isExist === -1) {
                stack.push(needle);
            }
        } else if (isExist !== -1) {
            stack.slice(isExist, 1);
        }
        return stack;
    }

    render() {
        const {
            btnText,
            onClick,
        } = this.props;
        return (
            <Button
                className={this.getClassName()}
                onClick={(e) => {
                    this.setState({
                        clickTimes: this.state.clickTimes + 1,
                    });
                    onClick(e);
                }}
            >{btnText}</Button>
        );
    }
}

SendCode.propTypes = {
    onClick: PropTypes.func.isRequired,
    btnText: PropTypes.string.isRequired,
    sending: PropTypes.bool.isRequired,
};

SendCode.defaultProps = {
    btnText: '',
};

export default injectIntl(SendCode);
