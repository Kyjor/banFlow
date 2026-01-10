import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Avatar,
  Typography,
  Badge,
  Tooltip,
  Empty,
  Spin,
  Popconfirm,
} from 'antd';
import {
  PullRequestOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useGit } from '../../../contexts/GitContext';
import './PRList.scss';

const { Text } = Typography;
const { Option } = Select;

function PRList({ onCreatePR, onViewPR }) {
  const {
    pullRequests,
    pullRequestLoading,
    githubRepoInfo,
    loadPullRequests,
    closePullRequest,
    isGitHubAuthenticated,
  } = useGit();

  const [filters, setFilters] = useState({
    state: 'open',
    search: '',
  });

  useEffect(() => {
    if (githubRepoInfo && isGitHubAuthenticated) {
      loadPullRequests(githubRepoInfo.owner, githubRepoInfo.repo, {
        state: filters.state,
      });
    }
  }, [githubRepoInfo, filters.state, isGitHubAuthenticated, loadPullRequests]);

  const filteredPRs = useMemo(() => {
    if (!filters.search) return pullRequests;
    const search = filters.search.toLowerCase();
    return pullRequests.filter(
      (pr) =>
        pr.title.toLowerCase().includes(search) ||
        pr.user.login.toLowerCase().includes(search) ||
        `#${pr.number}`.includes(search),
    );
  }, [pullRequests, filters.search]);

  const handleClosePR = async (pr) => {
    try {
      await closePullRequest(
        githubRepoInfo.owner,
        githubRepoInfo.repo,
        pr.number,
      );
    } catch (error) {
      // Error handled by context
    }
  };

  const columns = [
    {
      title: 'PR',
      key: 'number',
      width: 80,
      render: (_, pr) => (
        <Space>
          <PullRequestOutlined
            style={{
              color: pr.merged
                ? '#1890ff'
                : pr.state === 'open'
                  ? '#52c41a'
                  : '#999',
            }}
          />
          <Text strong>#{pr.number}</Text>
        </Space>
      ),
    },
    {
      title: 'Title',
      key: 'title',
      ellipsis: true,
      render: (_, pr) => (
        <Space direction="vertical" size={0}>
          <Text
            strong
            style={{ cursor: 'pointer' }}
            onClick={() => onViewPR(pr)}
          >
            {pr.title}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {pr.head.ref} → {pr.base.ref}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Author',
      key: 'user',
      width: 150,
      render: (_, pr) => (
        <Space>
          <Avatar size="small" src={pr.user.avatar_url} />
          <Text>{pr.user.login}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'state',
      width: 120,
      render: (_, pr) => {
        if (pr.merged) {
          return (
            <Tag color="blue" icon={<CheckCircleOutlined />}>
              Merged
            </Tag>
          );
        }
        if (pr.state === 'open') {
          return (
            <Tag color="green" icon={<PullRequestOutlined />}>
              Open
            </Tag>
          );
        }
        return (
          <Tag color="default" icon={<CloseCircleOutlined />}>
            Closed
          </Tag>
        );
      },
    },
    {
      title: 'Labels',
      key: 'labels',
      width: 200,
      render: (_, pr) => (
        <Space size={[0, 4]} wrap>
          {pr.labels?.slice(0, 3).map((label) => (
            <Tag key={label.name} color={`#${label.color}`}>
              {label.name}
            </Tag>
          ))}
          {pr.labels?.length > 3 && <Tag>+{pr.labels.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Changes',
      key: 'changes',
      width: 120,
      render: (_, pr) => (
        <Text type="secondary">
          {pr.additions ? `+${pr.additions}` : ''}{' '}
          {pr.deletions ? `-${pr.deletions}` : ''}
          {pr.changed_files ? ` (${pr.changed_files} files)` : ''}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, pr) => (
        <Space>
          <Tooltip title="View PR">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onViewPR(pr)}
            />
          </Tooltip>
          {pr.state === 'open' && (
            <Popconfirm
              title="Close this pull request?"
              onConfirm={() => handleClosePR(pr)}
              okText="Close"
              cancelText="Cancel"
            >
              <Tooltip title="Close PR">
                <Button size="small" danger icon={<CloseCircleOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!isGitHubAuthenticated) {
    return (
      <Empty
        description="Please authenticate with GitHub to view pull requests"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  if (!githubRepoInfo) {
    return (
      <Empty
        description="Current repository is not linked to GitHub"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="pr-list">
      <div className="pr-list-header">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Text strong>Pull Requests</Text>
            <Badge count={filteredPRs.length} showZero />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreatePR}>
            Create PR
          </Button>
        </Space>
      </div>

      <div className="pr-list-filters">
        <Space>
          <Select
            value={filters.state}
            onChange={(value) => setFilters({ ...filters, state: value })}
            style={{ width: 120 }}
          >
            <Option value="open">Open</Option>
            <Option value="closed">Closed</Option>
            <Option value="all">All</Option>
          </Select>
          <Input
            placeholder="Search PRs..."
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ width: 300 }}
            allowClear
          />
        </Space>
      </div>

      <Spin spinning={pullRequestLoading}>
        <Table
          columns={columns}
          dataSource={filteredPRs}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          size="small"
          onRow={(pr) => ({
            onClick: () => onViewPR(pr),
            style: { cursor: 'pointer' },
          })}
        />
      </Spin>
    </div>
  );
}

PRList.propTypes = {
  onCreatePR: PropTypes.func.isRequired,
  onViewPR: PropTypes.func.isRequired,
};

export default PRList;
