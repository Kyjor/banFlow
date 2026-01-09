import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Button,
  Tag,
  Divider,
  Alert,
} from 'antd';
import { BranchesOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useGit } from '../../../contexts/GitContext';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

function PRCreate({ visible, onCancel, onSuccess }) {
  const {
    currentBranch,
    branches,
    githubRepoInfo,
    createPullRequest,
    pullRequestLoading,
    repositoryStatus,
  } = useGit();

  const [form] = Form.useForm();
  const [baseBranch, setBaseBranch] = useState('main');

  useEffect(() => {
    if (visible && currentBranch) {
      // Auto-detect base branch (main, master, or develop)
      const defaultBase =
        branches.find((b) => ['main', 'master', 'develop'].includes(b)) ||
        branches[0] ||
        'main';
      setBaseBranch(defaultBase);
      form.setFieldsValue({
        head: currentBranch,
        base: defaultBase,
        title: currentBranch
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
      });
    }
  }, [visible, currentBranch, branches, form]);

  const handleSubmit = async (values) => {
    try {
      const pr = await createPullRequest(
        githubRepoInfo.owner,
        githubRepoInfo.repo,
        values.title,
        values.body || '',
        values.head,
        values.base,
        values.draft || false,
      );
      form.resetFields();
      onSuccess?.(pr);
    } catch (error) {
      // Error handled by context
    }
  };

  if (!githubRepoInfo) {
    return (
      <Modal
        title="Create Pull Request"
        open={visible}
        onCancel={onCancel}
        footer={null}
      >
        <Alert
          message="Repository not linked to GitHub"
          description="The current repository is not linked to a GitHub repository."
          type="warning"
        />
      </Modal>
    );
  }

  return (
    <Modal
      title="Create Pull Request"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Base Repository"
          tooltip="The repository where you want to merge your changes"
        >
          <Text strong>{githubRepoInfo.fullName}</Text>
        </Form.Item>

        <Space style={{ width: '100%' }} size="large">
          <Form.Item
            name="base"
            label="Base Branch"
            rules={[{ required: true, message: 'Please select base branch' }]}
            style={{ flex: 1 }}
          >
            <Select
              value={baseBranch}
              onChange={setBaseBranch}
              placeholder="Select base branch"
            >
              {branches
                .filter((b) => b !== currentBranch)
                .map((branch) => (
                  <Option key={branch} value={branch}>
                    <Space>
                      <BranchesOutlined />
                      {branch}
                    </Space>
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="head"
            label="Compare Branch"
            rules={[{ required: true, message: 'Please select head branch' }]}
            style={{ flex: 1 }}
          >
            <Select placeholder="Select head branch" disabled>
              <Option value={currentBranch}>
                <Space>
                  <BranchesOutlined />
                  {currentBranch}
                </Space>
              </Option>
            </Select>
          </Form.Item>
        </Space>

        {repositoryStatus &&
          (repositoryStatus.ahead > 0 || repositoryStatus.behind > 0) && (
            <Alert
              message="Branch Status"
              description={
                <Space>
                  {repositoryStatus.ahead > 0 && (
                    <Text>↑ {repositoryStatus.ahead} commits ahead</Text>
                  )}
                  {repositoryStatus.behind > 0 && (
                    <Text>↓ {repositoryStatus.behind} commits behind</Text>
                  )}
                </Space>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />
          )}

        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter PR title' }]}
        >
          <Input placeholder="Pull request title" />
        </Form.Item>

        <Form.Item name="body" label="Description">
          <TextArea rows={6} placeholder="Describe your changes..." />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={pullRequestLoading}
            >
              Create Pull Request
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default PRCreate;
