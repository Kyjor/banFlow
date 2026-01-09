import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Steps,
  Alert,
  Collapse,
  Tag,
  List,
  Tooltip,
  Modal,
  Progress,
} from 'antd';
import {
  BookOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  CodeOutlined,
  GitlabOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Step } = Steps;

function UserGuidance({ visible, onClose, userLevel = 'beginner' }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const beginnerSteps = [
    {
      title: 'Welcome to Git',
      description: 'Learn the basics of version control',
      content: (
        <div>
          <Paragraph>
            Git is a version control system that helps you track changes to your
            code over time. Think of it as a "save game" system for your code,
            where you can go back to any previous version.
          </Paragraph>
          <Alert
            message="Key Concepts"
            description={
              <ul>
                <li>
                  <strong>Repository:</strong> A folder that contains your
                  project and its history
                </li>
                <li>
                  <strong>Commit:</strong> A saved snapshot of your changes
                </li>
                <li>
                  <strong>Branch:</strong> A parallel version of your code
                </li>
                <li>
                  <strong>Merge:</strong> Combining changes from different
                  branches
                </li>
              </ul>
            }
            type="info"
            showIcon
          />
        </div>
      ),
    },
    {
      title: 'Add Your First Repository',
      description: 'Connect your project to Git',
      content: (
        <div>
          <Paragraph>
            To start using Git, you need to add a repository. This can be an
            existing project or a new one you want to track.
          </Paragraph>
          <Steps direction="vertical" size="small">
            <Step
              title="Click 'Add Repository'"
              description="Use the button in the sidebar to add a new repository"
            />
            <Step
              title="Select Your Project Folder"
              description="Choose the folder containing your code"
            />
            <Step
              title="Verify Git Repository"
              description="Make sure the folder contains a .git directory"
            />
          </Steps>
        </div>
      ),
    },
    {
      title: 'Understanding Changes',
      description: 'See what has changed in your files',
      content: (
        <div>
          <Paragraph>
            When you modify files, Git tracks these changes. The "Changes" tab
            shows you exactly what has been added, removed, or modified.
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="File Status Colors"
              description={
                <Space direction="vertical">
                  <Space>
                    <Tag color="green">Green</Tag> - New files or additions
                  </Space>
                  <Space>
                    <Tag color="red">Red</Tag> - Deleted lines
                  </Space>
                  <Space>
                    <Tag color="blue">Blue</Tag> - Modified files
                  </Space>
                  <Space>
                    <Tag color="orange">Orange</Tag> - Staged changes
                  </Space>
                </Space>
              }
              type="info"
              showIcon
            />
          </Space>
        </div>
      ),
    },
    {
      title: 'Staging Changes',
      description: 'Prepare changes for commit',
      content: (
        <div>
          <Paragraph>
            Before committing, you need to "stage" your changes. This tells Git
            which changes you want to include in your next commit.
          </Paragraph>
          <List
            size="small"
            dataSource={[
              'Click the "Stage" button next to files you want to commit',
              'Use "Stage All" to stage all changes at once',
              'Review staged changes in the staging area',
              'Unstage files if you change your mind',
            ]}
            renderItem={(item) => (
              <List.Item>
                <CheckCircleOutlined
                  style={{ color: '#52c41a', marginRight: '8px' }}
                />
                {item}
              </List.Item>
            )}
          />
        </div>
      ),
    },
    {
      title: 'Making Your First Commit',
      description: 'Save your changes with a commit',
      content: (
        <div>
          <Paragraph>
            A commit is like saving your game - it creates a permanent snapshot
            of your changes with a message describing what you did.
          </Paragraph>
          <Alert
            message="Commit Message Best Practices"
            description={
              <ul>
                <li>Use present tense: "Add feature" not "Added feature"</li>
                <li>Keep it concise but descriptive</li>
                <li>Start with a verb: "Fix", "Add", "Update", "Remove"</li>
                <li>
                  Examples: "Fix login bug", "Add user authentication", "Update
                  documentation"
                </li>
              </ul>
            }
            type="success"
            showIcon
          />
        </div>
      ),
    },
  ];

  const intermediateSteps = [
    {
      title: 'Working with Branches',
      description: 'Create and switch between branches',
      content: (
        <div>
          <Paragraph>
            Branches allow you to work on different features without affecting
            your main code. Think of them as parallel universes for your code.
          </Paragraph>
          <Steps direction="vertical" size="small">
            <Step
              title="Create a New Branch"
              description="Use the branch button to create a feature branch"
            />
            <Step
              title="Make Changes"
              description="Work on your feature in the new branch"
            />
            <Step
              title="Switch Branches"
              description="Use the branch selector to switch between branches"
            />
            <Step
              title="Merge Changes"
              description="Combine your feature branch back to main when ready"
            />
          </Steps>
        </div>
      ),
    },
    {
      title: 'Resolving Conflicts',
      description: 'Handle merge conflicts when they occur',
      content: (
        <div>
          <Paragraph>
            Conflicts happen when Git can't automatically merge changes. The
            three-pane view helps you choose which changes to keep.
          </Paragraph>
          <Alert
            message="Conflict Resolution Options"
            description={
              <Space direction="vertical">
                <Space>
                  <Tag color="blue">Accept Incoming</Tag> - Use changes from the
                  other branch
                </Space>
                <Space>
                  <Tag color="orange">Accept Current</Tag> - Keep your current
                  changes
                </Space>
                <Space>
                  <Tag color="green">Accept Both</Tag> - Keep both sets of
                  changes
                </Space>
                <Space>
                  <Tag color="purple">Edit Manually</Tag> - Create a custom
                  resolution
                </Space>
              </Space>
            }
            type="warning"
            showIcon
          />
        </div>
      ),
    },
    {
      title: 'Advanced Staging',
      description: 'Stage individual chunks and lines',
      content: (
        <div>
          <Paragraph>
            For more control, you can stage individual chunks or even specific
            lines within a file. This allows you to commit only the changes you
            want.
          </Paragraph>
          <List
            size="small"
            dataSource={[
              'Click on individual chunks to stage them',
              'Use the chunk staging interface for fine-grained control',
              'Preview changes before staging',
              'Undo staging decisions if needed',
            ]}
            renderItem={(item) => (
              <List.Item>
                <CheckCircleOutlined
                  style={{ color: '#52c41a', marginRight: '8px' }}
                />
                {item}
              </List.Item>
            )}
          />
        </div>
      ),
    },
  ];

  const advancedSteps = [
    {
      title: 'Git Workflows',
      description: 'Implement professional Git workflows',
      content: (
        <div>
          <Paragraph>
            Professional teams use specific Git workflows to coordinate their
            work. Common patterns include Git Flow, GitHub Flow, and GitLab
            Flow.
          </Paragraph>
          <Collapse>
            <Panel header="Git Flow" key="1">
              <Paragraph>
                A branching model with main, develop, feature, release, and
                hotfix branches. Good for projects with scheduled releases.
              </Paragraph>
            </Panel>
            <Panel header="GitHub Flow" key="2">
              <Paragraph>
                A simpler workflow with just main and feature branches. Good for
                continuous deployment.
              </Paragraph>
            </Panel>
            <Panel header="GitLab Flow" key="3">
              <Paragraph>
                Combines Git Flow with environment branches for deployment. Good
                for complex deployment pipelines.
              </Paragraph>
            </Panel>
          </Collapse>
        </div>
      ),
    },
    {
      title: 'Advanced Git Operations',
      description: 'Use advanced Git features',
      content: (
        <div>
          <Paragraph>
            Advanced users can leverage features like rebasing, cherry-picking,
            and stashing for more sophisticated version control.
          </Paragraph>
          <List
            size="small"
            dataSource={[
              'Rebase: Replay commits on top of another branch',
              'Cherry-pick: Apply specific commits to another branch',
              'Stash: Temporarily save uncommitted changes',
              'Reset: Move the branch pointer to a different commit',
              'Revert: Create a new commit that undoes changes',
            ]}
            renderItem={(item) => (
              <List.Item>
                <CodeOutlined
                  style={{ color: '#1890ff', marginRight: '8px' }}
                />
                {item}
              </List.Item>
            )}
          />
        </div>
      ),
    },
  ];

  const getSteps = () => {
    switch (userLevel) {
      case 'beginner':
        return beginnerSteps;
      case 'intermediate':
        return intermediateSteps;
      case 'advanced':
        return advancedSteps;
      default:
        return beginnerSteps;
    }
  };

  const steps = getSteps();
  const progress =
    ((completedSteps.size + (currentStep === steps.length - 1 ? 1 : 0)) /
      steps.length) *
    100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    onClose();
  };

  const handleStepClick = (step) => {
    setCurrentStep(step);
  };

  return (
    <Modal
      title={
        <Space>
          <BookOutlined />
          <Title level={4} style={{ margin: 0 }}>
            Git Client Guide
          </Title>
          <Tag color="blue" style={{ textTransform: 'capitalize' }}>
            {userLevel}
          </Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      className="user-guidance-modal"
    >
      <div className="guidance-content">
        <div className="progress-section">
          <Progress
            percent={progress}
            strokeColor="#52c41a"
            format={() =>
              `${completedSteps.size + (currentStep === steps.length - 1 ? 1 : 0)}/${steps.length} completed`
            }
          />
        </div>

        <div className="steps-navigation">
          <Steps
            current={currentStep}
            onChange={handleStepClick}
            size="small"
            items={steps.map((step, index) => ({
              title: step.title,
              status: completedSteps.has(index)
                ? 'finish'
                : index === currentStep
                  ? 'process'
                  : 'wait',
            }))}
          />
        </div>

        <div className="step-content">
          <Title level={3}>{steps[currentStep].title}</Title>
          <Text
            type="secondary"
            style={{ display: 'block', marginBottom: '16px' }}
          >
            {steps[currentStep].description}
          </Text>
          {steps[currentStep].content}
        </div>

        <div className="step-actions">
          <Space>
            <Button onClick={handlePrevious} disabled={currentStep === 0}>
              Previous
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleComplete}
              >
                Complete Guide
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Modal>
  );
}

export default UserGuidance;
