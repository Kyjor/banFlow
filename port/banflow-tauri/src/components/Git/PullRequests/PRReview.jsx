import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  Typography,
  Tag,
  Avatar,
  Space,
  Button,
  Divider,
  List,
  Tabs,
  Spin,
  Empty,
  Input,
} from 'antd';
import {
  PullRequestOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MergeOutlined,
  UserOutlined,
  FileTextOutlined,
  CommentOutlined,
  ClockCircleOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import { useGit } from '../../../contexts/GitContext';
import EnhancedDiffViewer from '../EnhancedDiffViewer/EnhancedDiffViewer';
import PRMergeModal from './PRMergeModal';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

function PRReview({ pr, onRefresh }) {
  const {
    githubRepoInfo,
    getPullRequestFiles,
    getPullRequestCommits,
    getPullRequestReviews,
    addPullRequestComment,
  } = useGit();

  const [files, setFiles] = useState([]);
  const [commits, setCommits] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [comment, setComment] = useState('');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const getReviewStateColor = (state) => {
    switch (state) {
      case 'APPROVED':
        return 'green';
      case 'CHANGES_REQUESTED':
        return 'red';
      default:
        return 'default';
    }
  };

  const loadPRDetails = useCallback(async () => {
    if (!pr || !githubRepoInfo) return;

    setLoading(true);
    try {
      const [filesData, commitsData, reviewsData] = await Promise.all([
        getPullRequestFiles(
          githubRepoInfo.owner,
          githubRepoInfo.repo,
          pr.number,
        ),
        getPullRequestCommits(
          githubRepoInfo.owner,
          githubRepoInfo.repo,
          pr.number,
        ),
        getPullRequestReviews(
          githubRepoInfo.owner,
          githubRepoInfo.repo,
          pr.number,
        ),
      ]);
      setFiles(filesData || []);
      setCommits(commitsData || []);
      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Failed to load PR details:', error);
    } finally {
      setLoading(false);
    }
  }, [
    pr,
    githubRepoInfo,
    getPullRequestFiles,
    getPullRequestCommits,
    getPullRequestReviews,
  ]);

  useEffect(() => {
    if (pr && githubRepoInfo) {
      loadPRDetails();
    }
  }, [pr, githubRepoInfo, loadPRDetails]);

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      await addPullRequestComment(
        githubRepoInfo.owner,
        githubRepoInfo.repo,
        pr.number,
        comment,
      );
      setComment('');
      await loadPRDetails();
    } catch (error) {
      // Error handled by context
    }
  };

  if (!pr) {
    return <Empty description="No pull request selected" />;
  }

  const canMerge = pr.state === 'open' && pr.mergeable && !pr.merged;

  return (
    <div className="pr-review">
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* PR Header */}
          <div>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <PullRequestOutlined style={{ fontSize: 24 }} />
                <Title level={3} style={{ margin: 0 }}>
                  {pr.title} <Text type="secondary">#{pr.number}</Text>
                </Title>
              </Space>
              <Space>
                {pr.merged && (
                  <Tag color="blue" icon={<CheckCircleOutlined />}>
                    Merged
                  </Tag>
                )}
                {!pr.merged && pr.state === 'open' && (
                  <Tag color="green" icon={<PullRequestOutlined />}>
                    Open
                  </Tag>
                )}
                {!pr.merged && pr.state === 'closed' && (
                  <Tag color="default" icon={<CloseCircleOutlined />}>
                    Closed
                  </Tag>
                )}
                {canMerge && (
                  <Button
                    type="primary"
                    icon={<MergeOutlined />}
                    onClick={() => setShowMergeModal(true)}
                  >
                    Merge
                  </Button>
                )}
              </Space>
            </Space>
          </div>

          {/* PR Metadata */}
          <Space>
            <Avatar src={pr.user.avatar_url} icon={<UserOutlined />} />
            <Text strong>{pr.user.login}</Text>
            <Text type="secondary">opened this PR</Text>
            <Text type="secondary">
              {new Date(pr.created_at).toLocaleDateString()}
            </Text>
          </Space>

          {/* Branch Info */}
          <Space>
            <Tag icon={<BranchesOutlined />}>{pr.head.ref}</Tag>
            <Text>→</Text>
            <Tag icon={<BranchesOutlined />}>{pr.base.ref}</Tag>
          </Space>

          {/* Description */}
          {pr.body && (
            <Card size="small" title="Description">
              <Paragraph>{pr.body}</Paragraph>
            </Card>
          )}

          {/* Stats */}
          <Space>
            <Text type="secondary">
              <FileTextOutlined /> {files.length} files changed
            </Text>
            <Text type="secondary">
              +{pr.additions || 0} -{pr.deletions || 0} lines
            </Text>
            <Text type="secondary">
              <CommentOutlined /> {pr.comments || 0} comments
            </Text>
          </Space>

          <Divider />

          {/* Tabs */}
          <Tabs defaultActiveKey="files">
            <TabPane tab={`Files (${files.length})`} key="files">
              <Spin spinning={loading}>
                <List
                  dataSource={files}
                  renderItem={(file) => (
                    <List.Item
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedFile(file)}
                    >
                      <List.Item.Meta
                        avatar={<FileTextOutlined />}
                        title={file.filename}
                        description={
                          <Space>
                            <Text type="secondary">
                              +{file.additions} -{file.deletions}
                            </Text>
                            <Tag>{file.status}</Tag>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
                {selectedFile && (
                  <Card
                    title={selectedFile.filename}
                    extra={
                      <Button onClick={() => setSelectedFile(null)}>
                        Close
                      </Button>
                    }
                    style={{ marginTop: 16 }}
                  >
                    <EnhancedDiffViewer
                      diffData={[
                        {
                          name: selectedFile.filename,
                          hunks: [],
                          added: selectedFile.additions,
                          deleted: selectedFile.deletions,
                        },
                      ]}
                      readOnly
                    />
                  </Card>
                )}
              </Spin>
            </TabPane>

            <TabPane tab={`Commits (${commits.length})`} key="commits">
              <List
                dataSource={commits}
                renderItem={(commit) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          src={commit.author?.avatar_url}
                          icon={<UserOutlined />}
                        />
                      }
                      title={commit.commit.message.split('\n')[0]}
                      description={
                        <Space>
                          <Text>{commit.author?.login}</Text>
                          <Text type="secondary">
                            <ClockCircleOutlined />{' '}
                            {new Date(
                              commit.commit.author.date,
                            ).toLocaleString()}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </TabPane>

            <TabPane tab="Comments" key="comments">
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="middle"
              >
                <TextArea
                  rows={4}
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button
                  type="primary"
                  onClick={handleAddComment}
                  disabled={!comment.trim()}
                >
                  Comment
                </Button>
                <Divider />
                {reviews.map((review) => (
                  <Card key={review.id} size="small">
                    <Space>
                      <Avatar src={review.user.avatar_url} />
                      <Text strong>{review.user.login}</Text>
                      <Tag color={getReviewStateColor(review.state)}>
                        {review.state}
                      </Tag>
                      <Text type="secondary">
                        {new Date(review.submitted_at).toLocaleString()}
                      </Text>
                    </Space>
                    {review.body && (
                      <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                        {review.body}
                      </Paragraph>
                    )}
                  </Card>
                ))}
              </Space>
            </TabPane>
          </Tabs>
        </Space>
      </Card>

      <PRMergeModal
        visible={showMergeModal}
        pr={pr}
        onCancel={() => setShowMergeModal(false)}
        onSuccess={() => {
          setShowMergeModal(false);
          onRefresh?.();
        }}
      />
    </div>
  );
}

PRReview.propTypes = {
  pr: PropTypes.shape({
    number: PropTypes.number,
    title: PropTypes.string,
    state: PropTypes.string,
    mergeable: PropTypes.bool,
    merged: PropTypes.bool,
    user: PropTypes.shape({
      avatar_url: PropTypes.string,
      login: PropTypes.string,
    }),
    created_at: PropTypes.string,
    head: PropTypes.shape({
      ref: PropTypes.string,
    }),
    base: PropTypes.shape({
      ref: PropTypes.string,
    }),
    body: PropTypes.string,
    additions: PropTypes.number,
    deletions: PropTypes.number,
    comments: PropTypes.number,
  }),
  onRefresh: PropTypes.func,
};

PRReview.defaultProps = {
  pr: null,
  onRefresh: () => {},
};

export default PRReview;
