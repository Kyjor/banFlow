import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import {
  Modal,
  Tabs,
  Card,
  Space,
  Button,
  Tag,
  Input,
  Select,
  DatePicker,
  Typography,
  Table,
  Upload,
  message,
  Popconfirm,
  Tooltip,
  Divider,
} from 'antd';
import {
  TagsOutlined,
  PictureOutlined,
  FolderOutlined,
  GlobalOutlined,
  ProjectOutlined,
  DeleteOutlined,
  UploadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import moment from 'moment';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { TextArea } = Input;

class MetadataManager extends Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      activeTab: 'images',
      images: [],
      tags: [],
      categories: [],
      isGlobal: props.isGlobal || false,
      projectName: props.projectName || null,
      // Image upload
      uploading: false,
      // Tag management
      newTagName: '',
      newTagColor: 'default',
      // Category management
      newCategoryName: '',
    };
  }

  componentDidMount() {
    if (this.props.visible) {
      this.loadData();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.visible && !prevProps.visible) {
      this.loadData();
    }
    if (
      this.props.isGlobal !== prevProps.isGlobal ||
      this.props.projectName !== prevProps.projectName
    ) {
      this.setState(
        {
          isGlobal: this.props.isGlobal || false,
          projectName: this.props.projectName || null,
        },
        () => {
          if (this.props.visible) {
            this.loadData();
          }
        },
      );
    }
  }

  loadData = async () => {
    await Promise.all([
      this.loadImages(),
      this.loadTags(),
      this.loadCategories(),
    ]);
  };

  loadImages = async () => {
    try {
      const images = await ipcRenderer.invoke(
        'docs:listImages',
        this.state.projectName,
        this.state.isGlobal,
      );
      this.setState({ images });
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  loadTags = async () => {
    // TODO: Load tags from metadata store
    // For now, get from project tags
    try {
      const tags = ipcRenderer.sendSync('api:getTags') || [];
      this.setState({ tags });
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  loadCategories = async () => {
    // TODO: Load categories from metadata store
    this.setState({ categories: [] });
  };

  handleImageUpload = async (file) => {
    this.setState({ uploading: true });
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        await ipcRenderer.invoke(
          'docs:saveImage',
          file.name,
          base64,
          this.state.projectName,
          this.state.isGlobal,
        );
        message.success('Image uploaded');
        await this.loadImages();
        this.setState({ uploading: false });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      message.error('Failed to upload image');
      this.setState({ uploading: false });
    }
    return false; // Prevent default upload
  };

  handleImageDelete = async (imagePath) => {
    try {
      await ipcRenderer.invoke(
        'docs:deleteImage',
        imagePath,
        this.state.projectName,
        this.state.isGlobal,
      );
      message.success('Image deleted');
      await this.loadImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      message.error('Failed to delete image');
    }
  };

  handleTagCreate = async () => {
    const { newTagName, newTagColor } = this.state;
    if (!newTagName.trim()) {
      message.warning('Please enter a tag name');
      return;
    }

    try {
      // TODO: Create tag in metadata store
      message.success('Tag created');
      this.setState({ newTagName: '', newTagColor: 'default' });
      await this.loadTags();
    } catch (error) {
      console.error('Error creating tag:', error);
      message.error('Failed to create tag');
    }
  };

  handleCategoryCreate = async () => {
    const { newCategoryName } = this.state;
    if (!newCategoryName.trim()) {
      message.warning('Please enter a category name');
      return;
    }

    try {
      // TODO: Create category in metadata store
      message.success('Category created');
      this.setState({ newCategoryName: '' });
      await this.loadCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      message.error('Failed to create category');
    }
  };

  toggleGlobal = async () => {
    const newIsGlobal = !this.state.isGlobal;
    this.setState({ isGlobal: newIsGlobal }, () => {
      this.loadData();
    });
  };

  render() {
    const {
      activeTab,
      images,
      tags,
      categories,
      isGlobal,
      uploading,
      newTagName,
      newTagColor,
      newCategoryName,
    } = this.state;

    const visible = this.props.visible || false;

    const imageColumns = [
      {
        title: 'Image',
        dataIndex: 'name',
        key: 'name',
        render: (text, record) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={`file://${record.fullPath}`}
              alt={text}
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'cover',
                borderRadius: '4px',
              }}
              onError={(e) => {
                ipcRenderer
                  .invoke(
                    'docs:getImage',
                    record.path,
                    this.state.projectName,
                    isGlobal,
                  )
                  .then((dataUrl) => {
                    e.target.src = dataUrl;
                  })
                  .catch(() => {
                    e.target.style.display = 'none';
                  });
              }}
            />
            <div>
              <div>
                <Text strong>{text}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {(record.size / 1024).toFixed(1)} KB
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: 'Created',
        dataIndex: 'created',
        key: 'created',
        render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Tooltip title="View">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() =>
                  window.open(`file://${record.fullPath}`, '_blank')
                }
              />
            </Tooltip>
            <Popconfirm
              title="Delete this image?"
              onConfirm={() => this.handleImageDelete(record.path)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <Modal
        title={
          <Space>
            <span>Metadata Manager</span>
            <Button
              type={isGlobal ? 'primary' : 'default'}
              icon={isGlobal ? <GlobalOutlined /> : <ProjectOutlined />}
              size="small"
              onClick={this.toggleGlobal}
            >
              {isGlobal ? 'Global' : 'Project'}
            </Button>
          </Space>
        }
        visible={visible}
        onCancel={() => this.props.onClose && this.props.onClose()}
        footer={null}
        width={900}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => this.setState({ activeTab: key })}
        >
          <TabPane
            tab={
              <span>
                <PictureOutlined />
                Images
              </span>
            }
            key="images"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Title level={5} style={{ margin: 0 }}>
                  Image Gallery ({images.length})
                </Title>
                <Upload
                  beforeUpload={this.handleImageUpload}
                  showUploadList={false}
                  accept="image/*"
                >
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    loading={uploading}
                  >
                    Upload Image
                  </Button>
                </Upload>
              </div>
              <Table
                dataSource={images}
                columns={imageColumns}
                rowKey="path"
                pagination={{ pageSize: 10 }}
              />
            </Space>
          </TabPane>

          <TabPane
            tab={
              <span>
                <TagsOutlined />
                Tags
              </span>
            }
            key="tags"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Title level={5}>Create Tag</Title>
                <Space>
                  <Input
                    placeholder="Tag name"
                    value={newTagName}
                    onChange={(e) =>
                      this.setState({ newTagName: e.target.value })
                    }
                    onPressEnter={this.handleTagCreate}
                    style={{ width: 200 }}
                  />
                  <Select
                    value={newTagColor}
                    onChange={(val) => this.setState({ newTagColor: val })}
                    style={{ width: 120 }}
                  >
                    <Select.Option value="default">Default</Select.Option>
                    <Select.Option value="red">Red</Select.Option>
                    <Select.Option value="orange">Orange</Select.Option>
                    <Select.Option value="gold">Gold</Select.Option>
                    <Select.Option value="green">Green</Select.Option>
                    <Select.Option value="cyan">Cyan</Select.Option>
                    <Select.Option value="blue">Blue</Select.Option>
                    <Select.Option value="purple">Purple</Select.Option>
                  </Select>
                  <Button type="primary" onClick={this.handleTagCreate}>
                    Create
                  </Button>
                </Space>
              </div>
              <Divider />
              <div>
                <Title level={5}>All Tags</Title>
                <div style={{ marginTop: '12px' }}>
                  {tags.length === 0 ? (
                    <Text type="secondary">No tags yet</Text>
                  ) : (
                    tags.map((tag) => (
                      <Tag
                        key={tag.id || tag.title || tag}
                        color={tag.color || 'default'}
                        style={{ marginBottom: '8px', cursor: 'pointer' }}
                      >
                        {tag.title || tag}
                      </Tag>
                    ))
                  )}
                </div>
              </div>
            </Space>
          </TabPane>

          <TabPane
            tab={
              <span>
                <FolderOutlined />
                Categories
              </span>
            }
            key="categories"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Title level={5}>Create Category</Title>
                <Space>
                  <Input
                    placeholder="Category name"
                    value={newCategoryName}
                    onChange={(e) =>
                      this.setState({ newCategoryName: e.target.value })
                    }
                    onPressEnter={this.handleCategoryCreate}
                    style={{ width: 200 }}
                  />
                  <Button type="primary" onClick={this.handleCategoryCreate}>
                    Create
                  </Button>
                </Space>
              </div>
              <Divider />
              <div>
                <Title level={5}>All Categories</Title>
                <div style={{ marginTop: '12px' }}>
                  {categories.length === 0 ? (
                    <Text type="secondary">No categories yet</Text>
                  ) : (
                    categories.map((cat) => (
                      <Tag key={cat.id || cat} style={{ marginBottom: '8px' }}>
                        {cat.name || cat}
                      </Tag>
                    ))
                  )}
                </div>
              </div>
            </Space>
          </TabPane>
        </Tabs>
      </Modal>
    );
  }
}

export default MetadataManager;
