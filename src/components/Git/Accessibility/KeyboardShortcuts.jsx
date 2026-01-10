import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Space, Typography, Tag, Divider } from 'antd';
import { KeyboardOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

function KeyboardShortcuts({ visible, onClose }) {
  const shortcuts = [
    {
      category: 'General',
      items: [
        { keys: ['Ctrl', 'S'], description: 'Save current file' },
        { keys: ['Ctrl', 'Z'], description: 'Undo last action' },
        { keys: ['Ctrl', 'Y'], description: 'Redo last action' },
        { keys: ['Ctrl', 'F'], description: 'Find and replace' },
        { keys: ['Ctrl', 'G'], description: 'Go to line' },
        { keys: ['Ctrl', '/'], description: 'Toggle comment' },
        { keys: ['F11'], description: 'Toggle fullscreen' },
        { keys: ['Esc'], description: 'Close dialogs/cancel operations' },
      ],
    },
    {
      category: 'Navigation',
      items: [
        { keys: ['Ctrl', 'Tab'], description: 'Switch between tabs' },
        { keys: ['Ctrl', '1'], description: 'Go to Changes tab' },
        { keys: ['Ctrl', '2'], description: 'Go to Editor tab' },
        { keys: ['Ctrl', '3'], description: 'Go to Staging tab' },
        { keys: ['Ctrl', '4'], description: 'Go to Conflicts tab' },
        { keys: ['Ctrl', '5'], description: 'Go to Operations tab' },
        { keys: ['Ctrl', 'B'], description: 'Toggle sidebar' },
        { keys: ['Ctrl', 'Shift', 'F'], description: 'Focus file search' },
      ],
    },
    {
      category: 'Git Operations',
      items: [
        { keys: ['Ctrl', 'Enter'], description: 'Commit staged changes' },
        { keys: ['Ctrl', 'Shift', 'P'], description: 'Push to remote' },
        { keys: ['Ctrl', 'Shift', 'L'], description: 'Pull from remote' },
        { keys: ['Ctrl', 'Shift', 'B'], description: 'Create new branch' },
        { keys: ['Ctrl', 'Shift', 'S'], description: 'Switch branch' },
        { keys: ['Ctrl', 'Shift', 'M'], description: 'Merge branch' },
        {
          keys: ['Ctrl', 'Shift', 'R'],
          description: 'Refresh repository status',
        },
      ],
    },
    {
      category: 'File Operations',
      items: [
        { keys: ['Ctrl', 'O'], description: 'Open file' },
        { keys: ['Ctrl', 'N'], description: 'New file' },
        { keys: ['Ctrl', 'W'], description: 'Close current file' },
        { keys: ['Ctrl', 'Shift', 'O'], description: 'Open repository' },
        { keys: ['Ctrl', 'R'], description: 'Reload current file' },
        { keys: ['Ctrl', 'Shift', 'S'], description: 'Save as' },
      ],
    },
    {
      category: 'Staging',
      items: [
        { keys: ['Ctrl', 'Shift', '+'], description: 'Stage selected file' },
        { keys: ['Ctrl', 'Shift', '-'], description: 'Unstage selected file' },
        { keys: ['Ctrl', 'Shift', 'A'], description: 'Stage all files' },
        { keys: ['Ctrl', 'Shift', 'U'], description: 'Unstage all files' },
        { keys: ['Space'], description: 'Stage/unstage current chunk' },
        { keys: ['Enter'], description: 'Stage current chunk' },
        { keys: ['Backspace'], description: 'Unstage current chunk' },
      ],
    },
    {
      category: 'Diff View',
      items: [
        { keys: ['Ctrl', 'D'], description: 'Toggle diff view mode' },
        {
          keys: ['Ctrl', 'Shift', 'W'],
          description: 'Toggle whitespace visibility',
        },
        { keys: ['Ctrl', 'Shift', 'L'], description: 'Toggle line numbers' },
        { keys: ['Ctrl', 'Shift', 'C'], description: 'Copy diff to clipboard' },
        { keys: ['Ctrl', 'Shift', 'E'], description: 'Export diff' },
        { keys: ['Up', 'Arrow'], description: 'Previous change' },
        { keys: ['Down', 'Arrow'], description: 'Next change' },
      ],
    },
    {
      category: 'Conflict Resolution',
      items: [
        {
          keys: ['Ctrl', 'Shift', 'I'],
          description: 'Accept incoming changes',
        },
        { keys: ['Ctrl', 'Shift', 'C'], description: 'Accept current changes' },
        { keys: ['Ctrl', 'Shift', 'B'], description: 'Accept both changes' },
        { keys: ['Ctrl', 'Shift', 'E'], description: 'Edit manually' },
        { keys: ['Ctrl', 'Shift', 'N'], description: 'Next conflict' },
        { keys: ['Ctrl', 'Shift', 'P'], description: 'Previous conflict' },
      ],
    },
  ];

  const renderKey = (key) => {
    return (
      <Tag
        key={key}
        style={{
          background: '#f0f0f0',
          border: '1px solid #d9d9d9',
          color: '#595959',
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '2px 6px',
          margin: '1px',
        }}
      >
        {key}
      </Tag>
    );
  };

  const renderShortcut = (shortcut) => {
    return (
      <div key={shortcut.description} style={{ marginBottom: '8px' }}>
        <Space>
          {shortcut.keys.map((key, index) => (
            <React.Fragment key={`${shortcut.description}-${key}-${index}`}>
              {renderKey(key)}
              {index < shortcut.keys.length - 1 && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  +
                </Text>
              )}
            </React.Fragment>
          ))}
          <Text style={{ marginLeft: '12px' }}>{shortcut.description}</Text>
        </Space>
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <KeyboardOutlined />
          <Title level={4} style={{ margin: 0 }}>
            Keyboard Shortcuts
          </Title>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      className="keyboard-shortcuts-modal"
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {shortcuts.map((category, index) => (
          <div key={category.category}>
            <Title
              level={5}
              style={{
                marginTop: index === 0 ? 0 : '24px',
                marginBottom: '12px',
              }}
            >
              {category.category}
            </Title>
            {category.items.map(renderShortcut)}
            {index < shortcuts.length - 1 && <Divider />}
          </div>
        ))}
      </div>
    </Modal>
  );
}

KeyboardShortcuts.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default KeyboardShortcuts;
