import React, { Component } from 'react';
import {
  Tabs,
  Card,
  Space,
  Button,
  Input,
  Switch,
  Select,
  Divider,
  Typography,
  Upload,
  message,
  Row,
  Col,
  InputNumber,
  Radio,
  Alert,
  Tag,
  Descriptions,
  Image,
  Modal,
} from 'antd';
import {
  SettingOutlined,
  BgColorsOutlined,
  ApiOutlined,
  FolderOutlined,
  DownloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined,
  PictureOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { ipcRenderer } from 'electron';
import Layout from '../../layouts/App';
import ProjectController from '../../api/project/ProjectController';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

class ProjectSettings extends Component {
  constructor(props) {
    super(props);
    const location = window.location.href;
    this.projectName = location.split('/').pop();
    this.projectName = this.projectName.split('?')[0];
    this.projectName = this.projectName.replace(/[@]/g, '/');
    
    this.currentProject = this.projectName;
    this.trelloToken = localStorage.getItem('trelloToken');
    this.trelloKey = `eeccec930a673bbbd5b6142ff96d85d9`;
    this.authLink = `https://trello.com/1/authorize?expiration=30days&scope=read,write&response_type=token&key=${this.trelloKey}`;

    this.state = {
      lokiLoaded: false,
      boards: [],
      selectedBoard: '',
      projectSettings: {},
      
      // General
      projectName: '',
      projectDescription: '',
      bannerImage: null,
      bannerImageUrl: null,
      logoImage: null,
      logoImageUrl: null,
      
      // Appearance
      themeOverride: false,
      primaryColor: '#1890ff',
      accentColor: '#52c41a',
      
      // Behavior
      defaultIteration: null,
      defaultParent: null,
      autoArchiveCompleted: false,
      archiveAfterDays: 30,
      
      // Integrations
      trelloBoard: null,
      trelloSyncEnabled: false,
      syncInterval: 60,
      
      // Data
      nodeCount: 0,
      parentCount: 0,
      tagCount: 0,
      totalTimeSpent: 0,
      createdDate: null,
      lastModified: null,
      
      // UI State
      activeTab: 'general',
      saving: false,
      previewBannerVisible: false,
    };
  }

  componentDidMount() {
    const newState = ipcRenderer.sendSync(
      'api:initializeProjectState',
      this.projectName,
    );

    this.setState({
      ...this.state,
      ...newState,
      lokiLoaded: newState.lokiLoaded || false,
      projectSettings: newState.projectSettings || {},
    }, () => {
      if (this.state.lokiLoaded) {
        this.loadProjectData();
        this.loadProjectSettings();
      }
    });
  }

  loadProjectData = () => {
    const { nodes, parents, tags } = this.state;
    
    const nodeCount = Object.keys(nodes || {}).length;
    const parentCount = Object.keys(parents || {}).length;
    const tagCount = Object.keys(tags || {}).length;
    
    let totalTimeSpent = 0;
    Object.values(nodes || {}).forEach(node => {
      totalTimeSpent += node.timeSpent || 0;
    });
    
    this.setState({
      nodeCount,
      parentCount,
      tagCount,
      totalTimeSpent,
    });
  };

  loadProjectSettings = () => {
    const { projectSettings } = this.state;
    
    if (projectSettings) {
      this.setState({
        projectName: this.currentProject,
        projectDescription: projectSettings.description || '',
        bannerImageUrl: projectSettings.bannerImage || null,
        logoImageUrl: projectSettings.logoImage || null,
        themeOverride: projectSettings.themeOverride || false,
        primaryColor: projectSettings.primaryColor || '#1890ff',
        accentColor: projectSettings.accentColor || '#52c41a',
        defaultIteration: projectSettings.defaultIteration || null,
        defaultParent: projectSettings.defaultParent || null,
        autoArchiveCompleted: projectSettings.autoArchiveCompleted || false,
        archiveAfterDays: projectSettings.archiveAfterDays || 30,
        trelloBoard: projectSettings.trello || null,
        trelloSyncEnabled: projectSettings.trelloSyncEnabled || false,
        syncInterval: projectSettings.syncInterval || 60,
        createdDate: projectSettings.createdDate || null,
        lastModified: projectSettings.lastModified || new Date().toISOString(),
      });
    }
  };

  saveProjectSetting = async (key, value) => {
    const { projectSettings } = this.state;
    const updatedSettings = {
      ...projectSettings,
      [key]: value,
      lastModified: new Date().toISOString(),
    };
    
    this.setState({ projectSettings: updatedSettings });
    
    // Save to database via IPC
    try {
      await ipcRenderer.invoke('api:updateProjectSettings', this.projectName, updatedSettings);
      this.setState({ [key]: value });
      message.success('Setting saved');
    } catch (error) {
      console.error('Error saving setting:', error);
      message.error('Failed to save setting');
    }
  };

  handleSaveAll = async () => {
    this.setState({ saving: true });
    
    const { projectSettings } = this.state;
    const updatedSettings = {
      ...projectSettings,
      description: this.state.projectDescription,
      bannerImage: this.state.bannerImageUrl,
      logoImage: this.state.logoImageUrl,
      themeOverride: this.state.themeOverride,
      primaryColor: this.state.primaryColor,
      accentColor: this.state.accentColor,
      defaultIteration: this.state.defaultIteration,
      defaultParent: this.state.defaultParent,
      autoArchiveCompleted: this.state.autoArchiveCompleted,
      archiveAfterDays: this.state.archiveAfterDays,
      trello: this.state.trelloBoard,
      trelloSyncEnabled: this.state.trelloSyncEnabled,
      syncInterval: this.state.syncInterval,
      lastModified: new Date().toISOString(),
    };
    
    try {
      await ipcRenderer.invoke('api:updateProjectSettings', this.projectName, updatedSettings);
      this.setState({ projectSettings: updatedSettings, saving: false });
      message.success('All settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error('Failed to save settings');
      this.setState({ saving: false });
    }
  };

  handleBannerUpload = async (file) => {
    try {
      // Save image to project images folder
      const imagePath = await ipcRenderer.invoke(
        'docs:saveImage',
        file,
        this.projectName,
        false
      );
      
      // Get image as data URL for preview
      const imageUrl = await ipcRenderer.invoke(
        'docs:getImage',
        imagePath,
        this.projectName,
        false
      );
      
      this.setState({
        bannerImageUrl: imageUrl,
      });
      
      message.success('Banner uploaded successfully');
    } catch (error) {
      console.error('Error uploading banner:', error);
      message.error('Failed to upload banner');
    }
    return false; // Prevent default upload
  };

  handleLogoUpload = async (file) => {
    try {
      // Save image to project images folder
      const imagePath = await ipcRenderer.invoke(
        'docs:saveImage',
        file,
        this.projectName,
        false
      );
      
      // Get image as data URL for preview
      const imageUrl = await ipcRenderer.invoke(
        'docs:getImage',
        imagePath,
        this.projectName,
        false
      );
      
      this.setState({
        logoImageUrl: imageUrl,
      });
      
      message.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      message.error('Failed to upload logo');
    }
    return false; // Prevent default upload
  };

  removeBanner = () => {
    this.setState({
      bannerImageUrl: null,
    });
    message.info('Banner removed');
  };

  removeLogo = () => {
    this.setState({
      logoImageUrl: null,
    });
    message.info('Logo removed');
  };

  displayAvailableBoards = () => {
    fetch(
      `https://api.trello.com/1/members/me/boards?key=${this.trelloKey}&token=${this.trelloToken}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    )
      .then((response) => response.json())
      .then((boards) => {
        this.setState({ boards });
        message.success(`Found ${boards.length} boards`);
      })
      .catch((err) => {
        console.error(err);
        message.error('Failed to load Trello boards');
      });
  };

  setSelectedBoard = (board) => {
    this.setState({ selectedBoard: board.name, trelloBoard: board });
    ProjectController.setTrelloBoard(board);
    message.success(`Synced with board: ${board.name}`);
  };

  handleAuthApp = () => {
    window.open(this.authLink, '_blank');
  };

  formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  render() {
    const {
      lokiLoaded,
      boards,
      selectedBoard,
      projectName,
      projectDescription,
      bannerImageUrl,
      logoImageUrl,
      themeOverride,
      primaryColor,
      accentColor,
      defaultIteration,
      defaultParent,
      autoArchiveCompleted,
      archiveAfterDays,
      trelloBoard,
      trelloSyncEnabled,
      syncInterval,
      nodeCount,
      parentCount,
      tagCount,
      totalTimeSpent,
      createdDate,
      lastModified,
      activeTab,
      saving,
      previewBannerVisible,
    } = this.state;

    const boardName = trelloBoard?.name || selectedBoard;

    const tabItems = [
      {
        key: 'general',
        label: (
          <span>
            <InfoCircleOutlined /> General
          </span>
        ),
        children: (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Project Information" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Project Name</Text>
                  <Input
                    value={projectName}
                    readOnly
                    style={{ marginTop: 8 }}
                  />
                </div>
                <div>
                  <Text strong>Description</Text>
                  <TextArea
                    value={projectDescription}
                    onChange={(e) => this.setState({ projectDescription: e.target.value })}
                    rows={4}
                    placeholder="Describe your project..."
                    style={{ marginTop: 8 }}
                  />
                </div>
              </Space>
            </Card>
            <Card title="Branding" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Banner Image</Text>
                  <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                    Display at the top of project pages (recommended: 1200x200px)
                  </Paragraph>
                  {bannerImageUrl && (
                    <div style={{ marginTop: 8, marginBottom: 8 }}>
                      <Image
                        src={bannerImageUrl}
                        alt="Banner preview"
                        style={{ maxHeight: 100, borderRadius: 4 }}
                        preview={{
                          visible: previewBannerVisible,
                          onVisibleChange: (visible) => this.setState({ previewBannerVisible: visible }),
                        }}
                      />
                    </div>
                  )}
                  <Space>
                    <Upload
                      accept="image/*"
                      beforeUpload={this.handleBannerUpload}
                      showUploadList={false}
                    >
                      <Button icon={<PictureOutlined />}>
                        {bannerImageUrl ? 'Replace Banner' : 'Upload Banner'}
                      </Button>
                    </Upload>
                    {bannerImageUrl && (
                      <Button danger icon={<DeleteOutlined />} onClick={this.removeBanner}>
                        Remove
                      </Button>
                    )}
                  </Space>
                </div>
                <Divider />
                <div>
                  <Text strong>Logo</Text>
                  <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                    Project logo (recommended: square, 200x200px)
                  </Paragraph>
                  {logoImageUrl && (
                    <div style={{ marginTop: 8, marginBottom: 8 }}>
                      <Image
                        src={logoImageUrl}
                        alt="Logo preview"
                        style={{ maxHeight: 80, maxWidth: 80, borderRadius: 4 }}
                      />
                    </div>
                  )}
                  <Space>
                    <Upload
                      accept="image/*"
                      beforeUpload={this.handleLogoUpload}
                      showUploadList={false}
                    >
                      <Button icon={<PictureOutlined />}>
                        {logoImageUrl ? 'Replace Logo' : 'Upload Logo'}
                      </Button>
                    </Upload>
                    {logoImageUrl && (
                      <Button danger icon={<DeleteOutlined />} onClick={this.removeLogo}>
                        Remove
                      </Button>
                    )}
                  </Space>
                </div>
              </Space>
            </Card>
            <Card title="Project Statistics" size="small">
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Nodes">{nodeCount}</Descriptions.Item>
                <Descriptions.Item label="Parents">{parentCount}</Descriptions.Item>
                <Descriptions.Item label="Tags">{tagCount}</Descriptions.Item>
                <Descriptions.Item label="Total Time Spent">
                  {this.formatTime(totalTimeSpent)}
                </Descriptions.Item>
                {createdDate && (
                  <Descriptions.Item label="Created">
                    {new Date(createdDate).toLocaleDateString()}
                  </Descriptions.Item>
                )}
                {lastModified && (
                  <Descriptions.Item label="Last Modified">
                    {new Date(lastModified).toLocaleDateString()}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Space>
        ),
      },
      {
        key: 'appearance',
        label: (
          <span>
            <BgColorsOutlined /> Appearance
          </span>
        ),
        children: (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Theme Override" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>Override App Theme</Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                      Use project-specific theme colors
                    </Paragraph>
                  </div>
                  <Switch
                    checked={themeOverride}
                    onChange={(checked) => this.setState({ themeOverride: checked })}
                  />
                </div>
                {themeOverride && (
                  <>
                    <Divider />
                    <Row gutter={16}>
                      <Col span={12}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text strong>Primary Color</Text>
                          <Select
                            value={primaryColor}
                            onChange={(value) => this.setState({ primaryColor: value })}
                            style={{ width: '100%' }}
                          >
                            <Option value="#1890ff">Blue</Option>
                            <Option value="#52c41a">Green</Option>
                            <Option value="#faad14">Orange</Option>
                            <Option value="#f5222d">Red</Option>
                            <Option value="#722ed1">Purple</Option>
                            <Option value="#13c2c2">Cyan</Option>
                            <Option value="#eb2f96">Pink</Option>
                            <Option value="#fa8c16">Gold</Option>
                          </Select>
                        </Space>
                      </Col>
                      <Col span={12}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text strong>Accent Color</Text>
                          <Select
                            value={accentColor}
                            onChange={(value) => this.setState({ accentColor: value })}
                            style={{ width: '100%' }}
                          >
                            <Option value="#52c41a">Green</Option>
                            <Option value="#1890ff">Blue</Option>
                            <Option value="#faad14">Orange</Option>
                            <Option value="#f5222d">Red</Option>
                            <Option value="#722ed1">Purple</Option>
                            <Option value="#13c2c2">Cyan</Option>
                            <Option value="#eb2f96">Pink</Option>
                            <Option value="#fa8c16">Gold</Option>
                          </Select>
                        </Space>
                      </Col>
                    </Row>
                  </>
                )}
              </Space>
            </Card>
          </Space>
        ),
      },
      {
        key: 'behavior',
        label: (
          <span>
            <SettingOutlined /> Behavior
          </span>
        ),
        children: (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Defaults" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Default Iteration</Text>
                  <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                    Default iteration for new nodes
                  </Paragraph>
                  <Select
                    value={defaultIteration}
                    onChange={(value) => this.setState({ defaultIteration: value })}
                    allowClear
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Select default iteration"
                  >
                    {Object.values(this.state.iterations || {}).map((iter) => (
                      <Option key={iter.id} value={iter.id}>
                        {iter.name || `Iteration ${iter.id}`}
                      </Option>
                    ))}
                  </Select>
                </div>
                <div style={{ marginTop: 16 }}>
                  <Text strong>Default Parent</Text>
                  <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                    Default parent column for new nodes
                  </Paragraph>
                  <Select
                    value={defaultParent}
                    onChange={(value) => this.setState({ defaultParent: value })}
                    allowClear
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Select default parent"
                  >
                    {Object.values(this.state.parents || {}).map((parent) => (
                      <Option key={parent.id} value={parent.id}>
                        {parent.title}
                      </Option>
                    ))}
                  </Select>
                </div>
              </Space>
            </Card>
            <Card title="Auto-Archive" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>Auto-Archive Completed Tasks</Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                      Automatically archive completed nodes after a period
                    </Paragraph>
                  </div>
                  <Switch
                    checked={autoArchiveCompleted}
                    onChange={(checked) => this.setState({ autoArchiveCompleted: checked })}
                  />
                </div>
                {autoArchiveCompleted && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong>Archive After (days)</Text>
                      <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                        Days after completion to archive
                      </Paragraph>
                    </div>
                    <InputNumber
                      value={archiveAfterDays}
                      onChange={(value) => this.setState({ archiveAfterDays: value })}
                      min={1}
                      max={365}
                    />
                  </div>
                )}
              </Space>
            </Card>
          </Space>
        ),
      },
      {
        key: 'integrations',
        label: (
          <span>
            <ApiOutlined /> Integrations
          </span>
        ),
        children: (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Trello Sync" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>Enable Trello Sync</Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                      Sync this project with a Trello board
                    </Paragraph>
                  </div>
                  <Switch
                    checked={trelloSyncEnabled}
                    onChange={(checked) => this.setState({ trelloSyncEnabled: checked })}
                  />
                </div>
                {trelloSyncEnabled && (
                  <>
                    <Divider />
                    {!this.trelloToken && (
                      <Alert
                        message="Trello token required"
                        description="Please authorize Trello in App Settings first"
                        type="warning"
                        showIcon
                        action={
                          <Button onClick={this.handleAuthApp} size="small">
                            Authorize
                          </Button>
                        }
                      />
                    )}
                    {this.trelloToken && (
                      <>
                        <div>
                          <Text strong>Synced Board</Text>
                          {boardName && (
                            <Tag color="green" style={{ marginLeft: 8 }}>
                              {boardName}
                            </Tag>
                          )}
                        </div>
                        <Space>
                          <Button onClick={this.displayAvailableBoards}>
                            {boards.length > 0 ? 'Refresh Boards' : 'Load Boards'}
                          </Button>
                          {boards.length > 0 && (
                            <Select
                              placeholder="Select a board"
                              style={{ width: 300 }}
                              onChange={(boardId) => {
                                const board = boards.find((b) => b.id === boardId);
                                if (board) this.setSelectedBoard(board);
                              }}
                            >
                              {boards.map((board) => (
                                <Option key={board.id} value={board.id}>
                                  {board.name}
                                </Option>
                              ))}
                            </Select>
                          )}
                        </Space>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                          <div>
                            <Text strong>Sync Interval (minutes)</Text>
                            <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                              How often to sync with Trello
                            </Paragraph>
                          </div>
                          <InputNumber
                            value={syncInterval}
                            onChange={(value) => this.setState({ syncInterval: value })}
                            min={1}
                            max={1440}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </Space>
            </Card>
          </Space>
        ),
      },
      {
        key: 'data',
        label: (
          <span>
            <FolderOutlined /> Data Management
          </span>
        ),
        children: (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Export" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Paragraph>
                  Export your project data in various formats for backup or migration.
                </Paragraph>
                <Space>
                  <Button icon={<DownloadOutlined />} type="primary">
                    Export as JSON
                  </Button>
                  <Button icon={<DownloadOutlined />}>
                    Export as CSV
                  </Button>
                </Space>
              </Space>
            </Card>
            <Card title="Import" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Paragraph>
                  Import project data from a backup or another source.
                </Paragraph>
                <Button icon={<UploadOutlined />}>
                  Import Data
                </Button>
              </Space>
            </Card>
            <Card title="Danger Zone" size="small" style={{ borderColor: '#ff4d4f' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  message="Delete Project"
                  description="This will permanently delete this project and all its data. This action cannot be undone."
                  type="error"
                  showIcon
                  action={
                    <Button danger icon={<DeleteOutlined />}>
                      Delete Project
                    </Button>
                  }
                />
              </Space>
            </Card>
          </Space>
        ),
      },
    ];

    return lokiLoaded ? (
      <Layout>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={2} style={{ margin: 0 }}>
                {projectName} Settings
              </Title>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={this.loadProjectSettings}>
                  Reload
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={this.handleSaveAll}
                  loading={saving}
                >
                  Save All
                </Button>
              </Space>
            </div>
            
            <Tabs
              activeKey={activeTab}
              onChange={(key) => this.setState({ activeTab: key })}
              items={tabItems}
              size="large"
            />
          </Space>
        </div>
      </Layout>
    ) : (
      <Layout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Title>Loading...</Title>
        </div>
      </Layout>
    );
  }
}

export default ProjectSettings;
