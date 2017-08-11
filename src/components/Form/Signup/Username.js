/* eslint-disable react/prop-types */
import React from 'react';
import { Form, Input, Checkbox, Button } from 'antd';

class Username extends React.Component {
  handleSubmit = (e) => {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        if (this.props.onSubmit) {
          this.props.onSubmit(values);
        }
      }
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;

    return (
      <Form onSubmit={this.handleSubmit}>
        <Form.Item
          label="Account Name"
          hasFeedback
        >
          {getFieldDecorator('username', {
            rules: [{
              required: true, message: 'Please input an username!',
            }],
          })(
            <Input />
          )}
        </Form.Item>
        <Form.Item style={{ marginBottom: 8 }}>
          {getFieldDecorator('agreement', {
            valuePropName: 'checked',
          })(
            <Checkbox>I have read the <a href="">agreement</a></Checkbox>
          )}
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Continue</Button>
        </Form.Item>
      </Form>
    );
  }
}

export default Form.create()(Username);
