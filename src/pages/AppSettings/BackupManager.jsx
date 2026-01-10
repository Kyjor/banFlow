import React, { Component } from 'react';
import { Space, Button, Table, Popconfirm, Modal, message } from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { ipcRenderer } from 'electron';

class BackupManager extends Component {
  static formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
  };

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
        render: (size) => this.constructor.formatFileSize(size),
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
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '4px',
              }}
            >
              Available Backups
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              View and manage your project backups
            </div>
          </div>
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

export default BackupManager;
