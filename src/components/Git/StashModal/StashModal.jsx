import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Space,
  Typography,
  Button,
  Checkbox,
  Divider,
  Alert,
} from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  PlusOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useGit } from '../../../contexts/GitContext';

const { Text } = Typography;

function StashModal({ visible, onCancel, onSuccess }) {
  const { repositoryStatus, stashFiles, operationInProgress } = useGit();
  const [form] = Form.useForm();
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  // Get all files that can be stashed
  const getStashableFiles = () => {
    if (!repositoryStatus) return [];

    const files = [];

    // Add modified files
    if (repositoryStatus.modified) {
      repositoryStatus.modified.forEach((file) => {
        files.push({
          path: file,
          type: 'modified',
          label: `${file} (modified)`,
          checked: true,
        });
      });
    }

    // Add staged files
    if (repositoryStatus.staged) {
      repositoryStatus.staged.forEach((file) => {
        files.push({
          path: file,
          type: 'staged',
          label: `${file} (staged)`,
          checked: true,
        });
      });
    }

    // Add untracked files
    if (repositoryStatus.created) {
      repositoryStatus.created.forEach((file) => {
        files.push({
          path: file,
          type: 'untracked',
          label: `${file} (untracked)`,
          checked: true,
        });
      });
    }

    return files;
  };

  const stashableFiles = getStashableFiles();

  // Initialize selected files when modal opens
  useEffect(() => {
    if (visible && stashableFiles.length > 0) {
      const initialSelected = new Set(
        stashableFiles.filter((file) => file.checked).map((file) => file.path),
      );
      setSelectedFiles(initialSelected);
    }
  }, [visible]);

  const handleFileToggle = (filePath, checked) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(filePath);
    } else {
      newSelected.delete(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedFiles(new Set(stashableFiles.map((file) => file.path)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (selectedFiles.size === 0) {
        // If no files selected, stash all changes (original behavior)
        await stashFiles(
          Array.from(stashableFiles.map((f) => f.path)),
          values.message || null,
        );
      } else {
        await stashFiles(Array.from(selectedFiles), values.message || null);
      }
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      // Error handled by context
    }
  };

  const groupFilesByType = (files) => {
    const groups = {
      modified: [],
      staged: [],
      untracked: [],
    };

    files.forEach((file) => {
      if (groups[file.type]) {
        groups[file.type].push(file);
      }
    });

    return groups;
  };

  const fileGroups = groupFilesByType(stashableFiles);

  if (stashableFiles.length === 0) {
    return (
      <Modal
        title="Stash Changes"
        open={visible}
        onCancel={onCancel}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancel
          </Button>,
        ]}
      >
        <Alert
          message="No changes to stash"
          description="There are no modified, staged, or untracked files to stash."
          type="info"
        />
      </Modal>
    );
  }

  const allSelected = selectedFiles.size === stashableFiles.length;
  const noneSelected = selectedFiles.size === 0;

  return (
    <Modal
      title={
        <Space>
          <InboxOutlined />
          <span>Stash Changes</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Alert
          message={`${stashableFiles.length} file${stashableFiles.length > 1 ? 's' : ''} available to stash`}
          description="Select which files you want to stash. All files are selected by default."
          type="info"
          style={{ marginBottom: 16 }}
        />

        {/* Select All / Deselect All */}
        <div style={{ marginBottom: 16 }}>
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && !noneSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </Checkbox>
        </div>

        {/* File Groups */}
        {Object.entries(fileGroups).map(([type, files]) => {
          if (files.length === 0) return null;

          const getIcon = (type) => {
            switch (type) {
              case 'modified':
                return <EditOutlined />;
              case 'staged':
                return <FileTextOutlined />;
              case 'untracked':
                return <PlusOutlined />;
              default:
                return <FileTextOutlined />;
            }
          };

          const getTitle = (type) => {
            switch (type) {
              case 'modified':
                return 'Modified Files';
              case 'staged':
                return 'Staged Files';
              case 'untracked':
                return 'Untracked Files';
              default:
                return 'Files';
            }
          };

          return (
            <div key={type} style={{ marginBottom: 16 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                {getIcon(type)} {getTitle(type)} ({files.length})
              </Text>
              <div style={{ paddingLeft: 20 }}>
                {files.map((file) => (
                  <div key={file.path} style={{ marginBottom: 4 }}>
                    <Checkbox
                      checked={selectedFiles.has(file.path)}
                      onChange={(e) =>
                        handleFileToggle(file.path, e.target.checked)
                      }
                    >
                      <Text ellipsis style={{ maxWidth: 400 }}>
                        {file.path}
                      </Text>
                    </Checkbox>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <Divider />

        <Form.Item name="message" label="Stash Message (optional)">
          <Input
            placeholder="Describe what you're stashing..."
            prefix={<FileTextOutlined />}
          />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={operationInProgress}
              disabled={selectedFiles.size === 0}
              icon={<InboxOutlined />}
            >
              Stash{' '}
              {selectedFiles.size > 0
                ? `${selectedFiles.size} File${selectedFiles.size > 1 ? 's' : ''}`
                : 'Changes'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default StashModal;
