import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Form,
  Select,
  Input,
  Space,
  Typography,
  Button,
  Checkbox,
  Alert,
} from 'antd';
import { MergeOutlined, WarningOutlined } from '@ant-design/icons';
import { useGit } from '../../../contexts/GitContext';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

function PRMergeModal({ visible, pr, onCancel, onSuccess }) {
  const { githubRepoInfo, mergePullRequest, pullRequestLoading } = useGit();

  const [form] = Form.useForm();
  const [mergeMethod, setMergeMethod] = useState('merge');
  const [deleteBranch, setDeleteBranch] = useState(false);

  const handleSubmit = async (values) => {
    try {
      await mergePullRequest(
        githubRepoInfo.owner,
        githubRepoInfo.repo,
        pr.number,
        mergeMethod,
        values.commitTitle || null,
        values.commitMessage || null,
      );
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      // Error handled by context
    }
  };

  if (!pr || !githubRepoInfo) return null;

  return (
    <Modal
      title="Merge Pull Request"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Alert
          message={`Merge #${pr.number}: ${pr.title}`}
          description={`This will merge ${pr.head.ref} into ${pr.base.ref}`}
          type="info"
          style={{ marginBottom: 16 }}
        />

        {!pr.mergeable && (
          <Alert
            message="Merge conflicts detected"
            description="This pull request has merge conflicts that must be resolved before merging."
            type="warning"
            icon={<WarningOutlined />}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item label="Merge Method" required>
          <Select value={mergeMethod} onChange={setMergeMethod}>
            <Option value="merge">
              <Space>
                <MergeOutlined />
                <Text>Create a merge commit</Text>
              </Space>
            </Option>
            <Option value="squash">
              <Text>Squash and merge</Text>
            </Option>
            <Option value="rebase">
              <Text>Rebase and merge</Text>
            </Option>
          </Select>
        </Form.Item>

        {mergeMethod === 'squash' && (
          <>
            <Form.Item name="commitTitle" label="Commit Title">
              <Input placeholder="Merge pull request #X from..." />
            </Form.Item>
            <Form.Item name="commitMessage" label="Commit Message">
              <TextArea rows={4} placeholder="Optional commit message..." />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <Checkbox
            checked={deleteBranch}
            onChange={(e) => setDeleteBranch(e.target.checked)}
          >
            Delete branch {pr.head.ref} after merging
          </Checkbox>
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={pullRequestLoading}
              disabled={!pr.mergeable}
              icon={<MergeOutlined />}
            >
              Merge Pull Request
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

PRMergeModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  pr: PropTypes.shape({
    number: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    head: PropTypes.shape({
      ref: PropTypes.string.isRequired,
    }).isRequired,
    base: PropTypes.shape({
      ref: PropTypes.string.isRequired,
    }).isRequired,
    mergeable: PropTypes.bool,
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default PRMergeModal;
