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
        const dynamicList = {
            hasSend: 'has-send',
        }
        const className = ['send-code'];
        // has-send class
        const isExistHasSend = className.indexOf(dynamicList.hasSend);
        if (clickTimes > 0) {
            if (isExistHasSend === -1) {
                className.push(dynamicList.hasSend);
            }
        } else if (isExistHasSend !== -1) {
            className.slice(isExistHasSend, 1);
        }
        return className.join(' ');
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
};

SendCode.defaultProps = {
    btnText: '',
};

export default injectIntl(SendCode);
