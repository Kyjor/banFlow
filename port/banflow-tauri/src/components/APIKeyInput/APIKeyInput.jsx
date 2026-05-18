/* eslint-disable react/no-unstable-nested-components */
import { Button, Input, Space } from 'antd';
import React from 'react';

function APIKeyInput() {
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const trelloToken = localStorage.getItem('trelloToken');

  return (
    <Space direction="vertical">
      <Space direction="horizontal">
        <Input.Password
          placeholder="input trello API key"
          defaultValue={trelloToken}
          visibilityToggle={{
            visible: passwordVisible,
            onVisibleChange: setPasswordVisible,
          }}
          id="trelloAPIKey"
        />
        <Button
          style={{
            width: 80,
          }}
          onClick={() => {
            localStorage.setItem(
              'trelloToken',
              document.getElementById('trelloAPIKey').value,
            );
            console.log(
              'value : ',
              document.getElementById('trelloAPIKey').value,
            );
          }}
        >
          Save
        </Button>
      </Space>
    </Space>
  );
}
export default APIKeyInput;
