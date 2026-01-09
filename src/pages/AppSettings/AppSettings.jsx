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
  Row,
  Col,
  InputNumber,
  Radio,
  Alert,
  Table,
  Popconfirm,
  Modal,
} from 'antd';
import {
  SettingOutlined,
  BgColorsOutlined,
  ApiOutlined,
  FolderOutlined,
  CodeOutlined,
  SaveOutlined,
  ReloadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { ipcRenderer } from 'electron';
import Layout from '../../layouts/App';
import APIKeyInput from '../../components/APIKeyInput/APIKeyInput';
import gameService from '../../services/GameService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

class AppSettings extends Component {
  constructor(props) {
    super(props);
    this.trelloKey = `eeccec930a673bbbd5b6142ff96d85d9`;
    this.authLink = `https://trello.com/1/authorize?expiration=30days&scope=read,write&response_type=token&key=${this.trelloKey}`;

    // Load app settings from localStorage
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');

    this.state = {
      // Appearance
      theme: appSettings.theme || 'light',
      primaryColor: appSettings.primaryColor || '#1890ff',
      sidebarColor: appSettings.sidebarColor || '#001529',
      headerColor: appSettings.headerColor || '#001529',
      backgroundGradient: appSettings.backgroundGradient || [
        '#3a7bd5',
        '#e5e5e5',
      ],
      customCSS: appSettings.customCSS || '',

      // General
      defaultPage: appSettings.defaultPage || 'dashboard',
      autoSave: appSettings.autoSave !== false,
      saveInterval: appSettings.saveInterval || 300,
      showNotifications: appSettings.showNotifications !== false,
      minimizeToTray: appSettings.minimizeToTray !== false,
      startMinimized: appSettings.startMinimized || false,

      // Integrations
      trelloToken: localStorage.getItem('trelloToken') || '',
      trelloEnabled: appSettings.trelloEnabled !== false,

      // Data & Storage
      dataPath: appSettings.dataPath || '',
      backupEnabled: appSettings.backupEnabled !== false,
      backupInterval: appSettings.backupInterval || 24,
      maxBackups: appSettings.maxBackups || 10,

      // Advanced
      debugMode: appSettings.debugMode || false,
      devTools: appSettings.devTools || false,

      // Game
      gameModeEnabled: appSettings.gameModeEnabled || false,

      // UI State
      activeTab: 'appearance',
      saving: false,
    };
  }

  componentDidMount() {
    // Load data path from main process if available
    ipcRenderer.invoke('app:getDataPath').then((path) => {
      if (path) {
        this.setState({ dataPath: path });
      }
    });

    // Load game mode state
    ipcRenderer.invoke('game:getState').then((state) => {
      if (state) {
        this.setState({ gameModeEnabled: state.isEnabled || false });
        gameService.setEnabled(state.isEnabled || false);
      }
    });

    // Apply theme on mount
    this.applyTheme();
  }

  saveSetting = (key, value) => {
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    appSettings[key] = value;
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
    this.setState({ [key]: value });

    // Apply theme changes immediately
    if (
      key === 'primaryColor' ||
      key === 'sidebarColor' ||
      key === 'headerColor' ||
      key === 'backgroundGradient' ||
      key === 'theme'
    ) {
      this.applyTheme();
    }

    // Update backup schedule when backup settings change
    if (
      key === 'backupEnabled' ||
      key === 'backupInterval' ||
      key === 'maxBackups'
    ) {
      this.updateBackupSchedule();
    }

    // Update game service when game mode changes
    if (key === 'gameModeEnabled') {
      gameService.setEnabled(value);
      ipcRenderer.invoke('game:saveState', {
        ...gameService.getInventory(),
        stats: gameService.getStats(),
        isEnabled: value,
      });
    }
  };

  updateBackupSchedule = async () => {
    const { backupEnabled, backupInterval, maxBackups } = this.state;

    if (backupEnabled && backupInterval && maxBackups) {
      // Get all projects and start/update backup schedules
      try {
        const projects = (await ipcRenderer.invoke('api:getProjects')) || [];
        await Promise.all(
          projects.map(async (project) => {
            const projectName = project.text || project.name || project;
            if (projectName && !projectName.startsWith('_')) {
              await ipcRenderer.invoke('backup:stopSchedule', projectName);
              await ipcRenderer.invoke(
                'backup:startSchedule',
                projectName,
                backupInterval,
                maxBackups,
              );
            }
          }),
        );
      } catch (error) {
        console.error('Error updating backup schedules:', error);
      }
    } else {
      // Stop all backup schedules
      try {
        const projects = (await ipcRenderer.invoke('api:getProjects')) || [];
        await Promise.all(
          projects.map(async (project) => {
            const projectName = project.text || project.name || project;
            if (projectName && !projectName.startsWith('_')) {
              await ipcRenderer.invoke('backup:stopSchedule', projectName);
            }
          }),
        );
      } catch (error) {
        console.error('Error stopping backup schedules:', error);
      }
    }
  };

  applyTheme = () => {
    const {
      primaryColor,
      sidebarColor,
      headerColor,
      backgroundGradient,
      theme,
    } = this.state;

    // Apply CSS variables
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--sidebar-color', sidebarColor);
    document.documentElement.style.setProperty('--header-color', headerColor);

    if (
      backgroundGradient &&
      Array.isArray(backgroundGradient) &&
      backgroundGradient.length >= 2
    ) {
      document.documentElement.style.setProperty(
        '--background-gradient',
        `linear-gradient(to top, ${backgroundGradient[0]}, ${backgroundGradient[1]})`,
      );
    }

    // Apply theme class
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme}`);
  };

  handleSaveAll = () => {
    const {
      theme,
      primaryColor,
      sidebarColor,
      headerColor,
      backgroundGradient,
      customCSS,
      defaultPage,
      autoSave,
      saveInterval,
      showNotifications,
      minimizeToTray,
      startMinimized,
      trelloEnabled,
      dataPath,
      backupEnabled,
      backupInterval,
      maxBackups,
      debugMode,
      devTools,
      gameModeEnabled,
    } = this.state;

    this.setState({ saving: true });

    // Save all settings
    const appSettings = {
      theme,
      primaryColor,
      sidebarColor,
      headerColor,
      backgroundGradient,
      customCSS,
      defaultPage,
      autoSave,
      saveInterval,
      showNotifications,
      minimizeToTray,
      startMinimized,
      trelloEnabled,
      dataPath,
      backupEnabled,
      backupInterval,
      maxBackups,
      debugMode,
      devTools,
      gameModeEnabled,
    };

    localStorage.setItem('appSettings', JSON.stringify(appSettings));
    this.applyTheme();

    setTimeout(() => {
      this.setState({ saving: false });
      message.success('Settings saved successfully!');
    }, 500);
  };

  handleReset = () => {
    this.setState({
      theme: 'light',
      primaryColor: '#1890ff',
      sidebarColor: '#001529',
      headerColor: '#001529',
      backgroundGradient: ['#3a7bd5', '#e5e5e5'],
      customCSS: '',
      defaultPage: 'dashboard',
      autoSave: true,
      saveInterval: 300,
      showNotifications: true,
      minimizeToTray: false,
      startMinimized: false,
      trelloEnabled: true,
      backupEnabled: true,
      backupInterval: 24,
      maxBackups: 10,
      debugMode: false,
      devTools: false,
      gameModeEnabled: false,
    });
    message.info('Settings reset to defaults');
  };

  handleAuthApp = () => {
    window.open(this.authLink, '_blank');
  };

  handleColorChange = (color, key) => {
    const colorValue = typeof color === 'string' ? color : color.toHexString();
    this.saveSetting(key, colorValue);
  };

  handleGradientChange = (index, color) => {
    const gradient = [...this.state.backgroundGradient];
    const colorValue = typeof color === 'string' ? color : color.toHexString();
    gradient[index] = colorValue;
    this.saveSetting('backgroundGradient', gradient);
  };

  render() {
    const {
      theme,
      primaryColor,
      sidebarColor,
      headerColor,
      backgroundGradient,
      customCSS,
      defaultPage,
      autoSave,
      saveInterval,
      showNotifications,
      minimizeToTray,
      startMinimized,
      trelloToken,
      trelloEnabled,
      dataPath,
      backupEnabled,
      backupInterval,
      maxBackups,
      debugMode,
      devTools,
      gameModeEnabled,
      activeTab,
      saving,
    } = this.state;

    const tabItems = [
      {
        key: 'appearance',
        label: (
          <span>
            <BgColorsOutlined /> Appearance
          </span>
        ),
        children: (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Theme" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Theme Mode</Text>
                  <Radio.Group
                    value={theme}
                    onChange={(e) => this.saveSetting('theme', e.target.value)}
                    style={{ marginLeft: 16 }}
                  >
                    <Radio value="light">Light</Radio>
                    <Radio value="dark">Dark</Radio>
                    <Radio value="auto">Auto (System)</Radio>
                  </Radio.Group>
                </div>
                <Divider />
                <Row gutter={16}>
                  <Col span={12}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>Primary Color</Text>
                      <Select
                        value={primaryColor}
                        onChange={(value) =>
                          this.saveSetting('primaryColor', value)
                        }
                        style={{ width: '100%' }}
                      >
                        <Option value="#1890ff">Blue (Default)</Option>
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
                      <Text strong>Sidebar Color</Text>
                      <Select
                        value={sidebarColor}
                        onChange={(value) =>
                          this.saveSetting('sidebarColor', value)
                        }
                        style={{ width: '100%' }}
                      >
                        <Option value="#001529">Dark (Default)</Option>
                        <Option value="#ffffff">White</Option>
                        <Option value="#f0f0f0">Light Gray</Option>
                        <Option value="#000000">Black</Option>
                      </Select>
                    </Space>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>Header Color</Text>
                      <Select
                        value={headerColor}
                        onChange={(value) =>
                          this.saveSetting('headerColor', value)
                        }
                        style={{ width: '100%' }}
                      >
                        <Option value="#001529">Dark (Default)</Option>
                        <Option value="#ffffff">White</Option>
                        <Option value="#f0f0f0">Light Gray</Option>
                      </Select>
                    </Space>
                  </Col>
                </Row>
                <Divider />
                <div>
                  <Text strong>Background Gradient</Text>
                  <Row gutter={16} style={{ marginTop: 8 }}>
                    <Col span={12}>
                      <Space>
                        <Text>Top:</Text>
                        <Select
                          value={backgroundGradient[0]}
                          onChange={(value) =>
                            this.handleGradientChange(0, value)
                          }
                          style={{ width: 150 }}
                        >
                          <Option value="#3a7bd5">Blue</Option>
                          <Option value="#667eea">Purple</Option>
                          <Option value="#f093fb">Pink</Option>
                          <Option value="#4facfe">Cyan</Option>
                          <Option value="#43e97b">Green</Option>
                          <Option value="#fa709a">Rose</Option>
                          <Option value="#fee140">Yellow</Option>
                          <Option value="#e5e5e5">Gray</Option>
                        </Select>
                      </Space>
                    </Col>
                    <Col span={12}>
                      <Space>
                        <Text>Bottom:</Text>
                        <Select
                          value={backgroundGradient[1]}
                          onChange={(value) =>
                            this.handleGradientChange(1, value)
                          }
                          style={{ width: 150 }}
                        >
                          <Option value="#e5e5e5">Light Gray</Option>
                          <Option value="#ffffff">White</Option>
                          <Option value="#f0f0f0">Off White</Option>
                          <Option value="#d9d9d9">Gray</Option>
                        </Select>
                      </Space>
                    </Col>
                  </Row>
                  <div
                    style={{
                      marginTop: 16,
                      height: 60,
                      borderRadius: 4,
                      background: `linear-gradient(to top, ${backgroundGradient[0]}, ${backgroundGradient[1]})`,
                      border: '1px solid #d9d9d9',
                    }}
                  />
                </div>
                <Divider />
                <div>
                  <Text strong>Custom CSS</Text>
                  <Paragraph
                    type="secondary"
                    style={{ fontSize: 12, marginTop: 4 }}
                  >
                    Add custom CSS to override default styles
                  </Paragraph>
                  <TextArea
                    value={customCSS}
                    onChange={(e) =>
                      this.saveSetting('customCSS', e.target.value)
                    }
                    rows={6}
                    placeholder="/* Your custom CSS here */"
                    style={{ fontFamily: 'monospace', marginTop: 8 }}
                  />
                </div>
              </Space>
            </Card>
          </Space>
        ),
      },
      {
        key: 'general',
        label: (
          <span>
            <SettingOutlined /> General
          </span>
        ),
        children: (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Startup & Navigation" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Default Page</Text>
                    <Paragraph
                      type="secondary"
                      style={{ margin: 0, fontSize: 12 }}
                    >
                      Page to open when app starts
                    </Paragraph>
                  </div>
                  <Select
                    value={defaultPage}
                    onChange={(value) => this.saveSetting('defaultPage', value)}
                    style={{ width: 200 }}
                  >
                    <Option value="dashboard">Dashboard</Option>
                    <Option value="lastProject">Last Project</Option>
                    <Option value="settings">Settings</Option>
                  </Select>
                </div>
                <Divider />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Start Minimized</Text>
                    <Paragraph
                      type="secondary"
                      style={{ margin: 0, fontSize: 12 }}
                    >
                      Start app in system tray
                    </Paragraph>
                  </div>
                  <Switch
                    checked={startMinimized}
                    onChange={(checked) =>
                      this.saveSetting('startMinimized', checked)
                    }
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Minimize to Tray</Text>
                    <Paragraph
                      type="secondary"
                      style={{ margin: 0, fontSize: 12 }}
                    >
                      Minimize to system tray instead of taskbar
                    </Paragraph>
                  </div>
                  <Switch
                    checked={minimizeToTray}
                    onChange={(checked) =>
                      this.saveSetting('minimizeToTray', checked)
                    }
                  />
                </div>
              </Space>
            </Card>
            <Card title="Auto-Save" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Enable Auto-Save</Text>
                    <Paragraph
                      type="secondary"
                      style={{ margin: 0, fontSize: 12 }}
                    >
                      Automatically save changes
                    </Paragraph>
                  </div>
                  <Switch
                    checked={autoSave}
                    onChange={(checked) =>
                      this.saveSetting('autoSave', checked)
                    }
                  />
                </div>
                {autoSave && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <Text strong>Save Interval (seconds)</Text>
                      <Paragraph
                        type="secondary"
                        style={{ margin: 0, fontSize: 12 }}
                      >
                        How often to auto-save
                      </Paragraph>
                    </div>
                    <InputNumber
                      value={saveInterval}
                      onChange={(value) =>
                        this.saveSetting('saveInterval', value)
                      }
                      min={10}
                      max={3600}
                      step={10}
                    />
                  </div>
                )}
              </Space>
            </Card>
            <Card title="Notifications" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Show Notifications</Text>
                    <Paragraph
                      type="secondary"
                      style={{ margin: 0, fontSize: 12 }}
                    >
                      Enable desktop notifications
                    </Paragraph>
                  </div>
                  <Switch
                    checked={showNotifications}
                    onChange={(checked) =>
                      this.saveSetting('showNotifications', checked)
                    }
                  />
                </div>
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
            <Card title="Trello" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Enable Trello Integration</Text>
                    <Paragraph
                      type="secondary"
                      style={{ margin: 0, fontSize: 12 }}
                    >
                      Sync with Trello boards
                    </Paragraph>
                  </div>
                  <Switch
                    checked={trelloEnabled}
                    onChange={(checked) =>
                      this.saveSetting('trelloEnabled', checked)
                    }
                  />
                </div>
                {trelloEnabled && (
                  <>
                    <Divider />
                    <div>
                      <Text strong>Trello API Token</Text>
                      <APIKeyInput />
                    </div>
                    <Button onClick={this.handleAuthApp} type="primary">
                      Authorize Trello
                    </Button>
                    {trelloToken && (
                      <Alert
                        message="Trello token is configured"
                        type="success"
                        showIcon
                        style={{ marginTop: 8 }}
                      />
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
            <FolderOutlined /> Data & Storage
          </span>
        ),
        children: (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Storage Location" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Data Path</Text>
                  <Paragraph
                    type="secondary"
                    style={{ margin: 0, fontSize: 12 }}
                  >
                    Location where project data is stored
                  </Paragraph>
                  <Input
                    value={dataPath}
                    readOnly
                    style={{ marginTop: 8 }}
                    suffix={
                      <Button
                        type="link"
                        onClick={() => {
                          ipcRenderer.invoke('app:openDataPath').then(() => {
                            message.info('Opening data folder');
                          });
                        }}
                      >
                        Open Folder
                      </Button>
                    }
                  />
                </div>
              </Space>
            </Card>
            <Card title="Backups" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Enable Automatic Backups</Text>
                    <Paragraph
                      type="secondary"
                      style={{ margin: 0, fontSize: 12 }}
                    >
                      Automatically backup project data
                    </Paragraph>
                  </div>
                  <Switch
                    checked={backupEnabled}
                    onChange={(checked) =>
                      this.saveSetting('backupEnabled', checked)
                    }
                  />
                </div>
                {backupEnabled && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <Text strong>Backup Interval (hours)</Text>
                        <Paragraph
                          type="secondary"
                          style={{ margin: 0, fontSize: 12 }}
                        >
                          How often to create backups
                        </Paragraph>
                      </div>
                      <InputNumber
                        value={backupInterval}
                        onChange={(value) =>
                          this.saveSetting('backupInterval', value)
                        }
                        min={1}
                        max={168}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <Text strong>Maximum Backups</Text>
                        <Paragraph
                          type="secondary"
                          style={{ margin: 0, fontSize: 12 }}
                        >
                          Number of backups to keep
                        </Paragraph>
                      </div>
                      <InputNumber
                        value={maxBackups}
                        onChange={(value) =>
                          this.saveSetting('maxBackups', value)
                        }
                        min={1}
                        max={100}
                      />
                    </div>
                    <Divider />
                    <Button
                      type="primary"
                      onClick={async () => {
                        try {
                          // Get all projects and backup each
                          const projects =
                            (await ipcRenderer.invoke('api:getProjects')) || [];

                          const results = await Promise.all(
                            projects.map(async (project) => {
                              const projectName =
                                project.text || project.name || project;
                              if (projectName && !projectName.startsWith('_')) {
                                try {
                                  const result = await ipcRenderer.invoke(
                                    'backup:create',
                                    projectName,
                                  );
                                  return result.success ? 'success' : 'fail';
                                } catch (err) {
                                  return 'fail';
                                }
                              }
                              return null;
                            }),
                          );

                          const successCount = results.filter(
                            (r) => r === 'success',
                          ).length;
                          const failCount = results.filter(
                            (r) => r === 'fail',
                          ).length;

                          if (successCount > 0) {
                            message.success(
                              `Created backups for ${successCount} project(s)`,
                            );
                          }
                          if (failCount > 0) {
                            message.warning(
                              `Failed to backup ${failCount} project(s)`,
                            );
                          }
                        } catch (error) {
                          message.error('Error creating backups');
                        }
                      }}
                    >
                      Create Manual Backup Now (All Projects)
                    </Button>
                  </>
                )}
              </Space>
            </Card>
            <Card title="Backup Management" size="small">
              <BackupManager />
            </Card>
          </Space>
        ),
      },
      {
        key: 'game',
        label: (
          <span>
            <PlayCircleOutlined /> Game
          </span>
        ),
        children: (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Game Mode" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  message="Game Mode"
                  description="Enable game mode to earn rewards for completing tasks and sessions. Your productivity actions will earn you gold and items!"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Enable Game Mode</Text>
                    <Paragraph
                      type="secondary"
                      style={{ margin: 0, fontSize: 12 }}
                    >
                      Turn on rewards and gamification features
                    </Paragraph>
                  </div>
                  <Switch
                    checked={gameModeEnabled}
                    onChange={(checked) =>
                      this.saveSetting('gameModeEnabled', checked)
                    }
                  />
                </div>
                {gameModeEnabled && (
                  <Card
                    size="small"
                    style={{ marginTop: 16, background: '#f0f2f5' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>Current Stats</Text>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text>Gold:</Text>
                        <Text strong>
                          {gameService.getInventory().gold.toFixed(2)}
                        </Text>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text>Total Sessions:</Text>
                        <Text strong>
                          {gameService.getStats().totalSessions}
                        </Text>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text>Tasks Completed:</Text>
                        <Text strong>
                          {gameService.getStats().totalTasksCompleted}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                )}
              </Space>
            </Card>
          </Space>
        ),
      },
      {
        key: 'advanced',
        label: (
          <span>
            <CodeOutlined /> Advanced
          </span>
        ),
        children: (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Developer Options" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Debug Mode</Text>
                    <Paragraph
                      type="secondary"
                      style={{ margin: 0, fontSize: 12 }}
                    >
                      Enable debug logging
                    </Paragraph>
                  </div>
                  <Switch
                    checked={debugMode}
                    onChange={(checked) =>
                      this.saveSetting('debugMode', checked)
                    }
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Developer Tools</Text>
                    <Paragraph
                      type="secondary"
                      style={{ margin: 0, fontSize: 12 }}
                    >
                      Enable DevTools menu
                    </Paragraph>
                  </div>
                  <Switch
                    checked={devTools}
                    onChange={(checked) =>
                      this.saveSetting('devTools', checked)
                    }
                  />
                </div>
              </Space>
            </Card>
            <Card
              title="Danger Zone"
              size="small"
              style={{ borderColor: '#ff4d4f' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  message="Reset All Settings"
                  description="This will reset all app settings to their default values. This action cannot be undone."
                  type="warning"
                  showIcon
                  action={
                    <Button danger onClick={this.handleReset}>
                      Reset
                    </Button>
                  }
                />
              </Space>
            </Card>
          </Space>
        ),
      },
    ];

    return (
      <Layout>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Title level={2} style={{ margin: 0 }}>
                <SettingOutlined /> App Settings
              </Title>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={this.handleReset}>
                  Reset
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
    );
  }
}

// Backup Manager Component
class BackupManager extends Component {
  constructor(props) {
    super(props);
    this.state = {
      backups: [],
      loading: false,
    };
  }

  componentDidMount() {
    this.loadBackups();
  }

  loadBackups = async () => {
    this.setState({ loading: true });
    try {
      const backups = await ipcRenderer.invoke('backup:list');
      this.setState({ backups: backups || [] });
    } catch (error) {
      console.error('Error loading backups:', error);
      message.error('Failed to load backups');
    } finally {
      this.setState({ loading: false });
    }
  };

  handleRestore = async (backup) => {
    Modal.confirm({
      title: 'Restore Backup',
      content: `Are you sure you want to restore "${backup.name}" for project "${backup.projectName}"? This will replace the current project data. A safety backup will be created before restoring.`,
      okText: 'Restore',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const result = await ipcRenderer.invoke(
            'backup:restore',
            backup.path,
            backup.projectName,
          );
          if (result.success) {
            message.success('Backup restored successfully');
            this.loadBackups();
          } else {
            message.error(`Restore failed: ${result.error}`);
          }
        } catch (error) {
          message.error('Error restoring backup');
        }
      },
    });
  };

  handleDelete = async (backup) => {
    try {
      const result = await ipcRenderer.invoke('backup:delete', backup.path);
      if (result.success) {
        message.success('Backup deleted');
        this.loadBackups();
      } else {
        message.error(`Delete failed: ${result.error}`);
      }
    } catch (error) {
      message.error('Error deleting backup');
    }
  };

  formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
  };

  render() {
    const { backups, loading } = this.state;

    const columns = [
      {
        title: 'Project',
        dataIndex: 'projectName',
        key: 'projectName',
      },
      {
        title: 'Backup Name',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: 'Size',
        dataIndex: 'size',
        key: 'size',
        render: (size) => this.formatFileSize(size),
      },
      {
        title: 'Created',
        dataIndex: 'created',
        key: 'created',
        render: (date) => new Date(date).toLocaleString(),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => this.handleRestore(record)}
            >
              Restore
            </Button>
            <Popconfirm
              title="Delete this backup?"
              onConfirm={() => this.handleDelete(record)}
              okText="Yes"
              cancelText="No"
            >
              <Button danger size="small" icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text strong>Available Backups</Text>
          <Button icon={<HistoryOutlined />} onClick={this.loadBackups}>
            Refresh
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={backups}
          rowKey="path"
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Space>
    );
  }
}

export default AppSettings;
