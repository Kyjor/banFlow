/* eslint-disable react/no-unstable-nested-components */
import { Button, Input, Space, message } from 'antd';
import React from 'react';

function APIKeyInput({ onSaved }) {
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [token, setToken] = React.useState(
    () => localStorage.getItem('trelloToken') || '',
  );

  const handleSave = () => {
    const trimmed = token.trim();
    localStorage.setItem('trelloToken', trimmed);
    setToken(trimmed);
    onSaved?.(trimmed);
    message.success('Trello token saved');
  };

  return (
    <Space direction="vertical">
      <Space direction="horizontal">
        <Input.Password
          placeholder="input trello API key"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          visibilityToggle={{
            visible: passwordVisible,
            onVisibleChange: setPasswordVisible,
          }}
          onPressEnter={handleSave}
        />
        <Button
          style={{
            width: 80,
          }}
          onClick={handleSave}
        >
          Save
        </Button>
      </Space>
    </Space>
  );
}
export default APIKeyInput;
