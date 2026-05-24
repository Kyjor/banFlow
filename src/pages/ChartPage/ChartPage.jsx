// Libs
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { tauriInvoke, tauriSendSync, tauriOn } from '../../utils/tauri';
import {
  Layout,
  Card,
  Tree,
  Input,
  Button,
  Space,
  Modal,
  message,
  Tag,
  Typography,
  Divider,
  Popconfirm,
  Tooltip,
  Upload,
  List,
} from 'antd';
import {
  FileOutlined,
  FolderOutlined,
  FolderAddOutlined,
  FileAddOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  GlobalOutlined,
  ProjectOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import LayoutWrapper from '../../layouts/App';
import DiagramEditor from './diagram/DiagramEditor';
import { statusColorForNode } from './diagram/utils/diagramDefaults';
import './ChartPage.scss';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

class ChartPage extends Component {
  constructor(props) {
    super(props);

    const location = window.location.href;
    this.projectName = location.split('/').pop();
    [this.projectName] = this.projectName.split('?');
    this.projectName = this.projectName.replace(/[@]/g, '/');
    try {
      this.projectName = decodeURIComponent(this.projectName);
    } catch (e) {
      console.warn('[ChartPage] Failed to decode project name:', this.projectName);
    }
    localStorage.setItem('currentProject', this.projectName);

    this.state = {
      lokiLoaded: false,
      nodes: {},
      parents: {},
      diagrams: [],
      currentDiagram: null,
      diagramData: null,
      isGlobal: false,
      sidebarCollapsed: false,
      searchText: '',
      selectedKeys: [],
      expandedKeys: [],
      createDiagramModalVisible: false,
      createFolderModalVisible: false,
      renameModalVisible: false,
      renameTarget: null,
      newDiagramName: '',
      newFolderName: '',
      renameValue: '',
      isDirty: false,
      imageUploadVisible: false,
      images: [],
      autosaveTimer: null,
      autosaveEnabled: true,
    };
  }

  async componentDidMount() {
    const newState = await tauriSendSync('api:initializeProjectState', {
      projectName: this.projectName,
    });

    this.setState(
      (prevState) => ({
        ...prevState,
        ...newState,
        lokiLoaded: true,
      }),
      () => {
        this.loadDiagrams();
        this.loadImages();
      },
    );

    const unlisten = await tauriOn('UpdateProjectPageState', this.handleStateUpdate);
    this.unlistenUpdateProjectPageState = unlisten;
  }

  componentWillUnmount() {
    if (this.unlistenUpdateProjectPageState) {
      this.unlistenUpdateProjectPageState();
    }
    const { autosaveTimer } = this.state;
    if (autosaveTimer) clearTimeout(autosaveTimer);
  }

  handleStateUpdate = (e, newState) => {
    this.setState(newState);
  };

  loadDiagrams = async () => {
    try {
      const { isGlobal } = this.state;
      const diagrams = await tauriInvoke(
        'diagrams:list',
        this.projectName,
        isGlobal,
      );
      this.setState({ diagrams });
    } catch (error) {
      console.error('Error loading diagrams:', error);
      message.error('Failed to load diagrams');
    }
  };

  loadDiagram = async (diagramPath) => {
    try {
      const { isGlobal, nodes, parents } = this.state;
      const diagram = await tauriInvoke(
        'diagrams:read',
        diagramPath,
        this.projectName,
        isGlobal,
      );

      const restoredNodes = (diagram.content.nodes || []).map((node) => {
        const restoredData = { ...node.data };
        if (node.data.nodeReferenceId && nodes[node.data.nodeReferenceId]) {
          const ref = nodes[node.data.nodeReferenceId];
          restoredData.referencedNode = ref;
          restoredData.syncStatusColor =
            node.data.syncStatusColor !== false
              ? statusColorForNode(ref)
              : null;
        }
        if (
          node.data.parentReferenceId &&
          parents[node.data.parentReferenceId]
        ) {
          restoredData.referencedParent = parents[node.data.parentReferenceId];
        }
        restoredData.projectName = this.projectName;
        return { ...node, data: restoredData };
      });

      this.setState({
        currentDiagram: diagramPath,
        diagramData: { ...diagram.content, nodes: restoredNodes },
        isDirty: false,
      });
    } catch (error) {
      console.error('Error loading diagram:', error);
      message.error('Failed to load diagram');
    }
  };

  handleDiagramChange = (diagramData, isDirty = true) => {
    this.setState({ diagramData, isDirty }, () => {
      if (isDirty) this.autosaveDiagram();
    });
  };

  saveDiagram = async (showMessage = true) => {
    const { currentDiagram, diagramData, isGlobal } = this.state;
    if (!currentDiagram || !diagramData) {
      if (showMessage) message.warning('No diagram to save');
      return;
    }

    try {
      const dataToSave = {
        ...diagramData,
        nodes: (diagramData.nodes || []).map((node) => ({
          ...node,
          data: {
            ...node.data,
            nodeReferenceId: node.data.referencedNode?.id || node.data.nodeReferenceId || null,
            parentReferenceId:
              node.data.referencedParent?.id || node.data.parentReferenceId || null,
            referencedNode: undefined,
            referencedParent: undefined,
          },
        })),
      };

      await tauriInvoke(
        'diagrams:save',
        currentDiagram,
        dataToSave,
        this.projectName,
        isGlobal,
      );
      this.setState({ isDirty: false });
      if (showMessage) message.success('Diagram saved successfully');
    } catch (error) {
      console.error('Error saving diagram:', error);
      if (showMessage) message.error('Failed to save diagram');
    }
  };

  autosaveDiagram = () => {
    const { autosaveEnabled, autosaveTimer, isDirty, currentDiagram } = this.state;
    if (!autosaveEnabled) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    const timer = setTimeout(() => {
      if (this.state.isDirty && this.state.currentDiagram && this.state.autosaveEnabled) {
        this.saveDiagram(false);
      }
    }, 2000);
    this.setState({ autosaveTimer: timer });
  };

  createDiagram = async () => {
    const { newDiagramName, isGlobal } = this.state;
    if (!newDiagramName.trim()) {
      message.warning('Please enter a diagram name');
      return;
    }

    try {
      const diagramPath = newDiagramName.endsWith('.json')
        ? newDiagramName
        : `${newDiagramName}.json`;

      await tauriInvoke(
        'diagrams:save',
        diagramPath,
        { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, meta: {} },
        this.projectName,
        isGlobal,
      );

      this.setState(
        { createDiagramModalVisible: false, newDiagramName: '' },
        () => {
          this.loadDiagrams();
          this.loadDiagram(diagramPath);
        },
      );
      message.success('Diagram created successfully');
    } catch (error) {
      console.error('Error creating diagram:', error);
      message.error('Failed to create diagram');
    }
  };

  duplicateDiagram = async (item) => {
    const { isGlobal } = this.state;
    try {
      const result = await tauriInvoke(
        'diagrams:duplicate',
        item.path,
        this.projectName,
        isGlobal,
      );
      this.loadDiagrams();
      if (result?.path) this.loadDiagram(result.path);
      message.success('Diagram duplicated');
    } catch (error) {
      message.error('Failed to duplicate diagram');
    }
  };

  createFolder = async () => {
    const { newFolderName, isGlobal } = this.state;
    if (!newFolderName.trim()) {
      message.warning('Please enter a folder name');
      return;
    }

    try {
      await tauriInvoke(
        'diagrams:createFolder',
        newFolderName,
        this.projectName,
        isGlobal,
      );
      this.setState({ createFolderModalVisible: false, newFolderName: '' }, () =>
        this.loadDiagrams(),
      );
      message.success('Folder created successfully');
    } catch (error) {
      message.error('Failed to create folder');
    }
  };

  deleteItem = async (item) => {
    const { currentDiagram, isGlobal } = this.state;
    try {
      if (item.type === 'folder') {
        await tauriInvoke(
          'diagrams:deleteFolder',
          item.path,
          this.projectName,
          isGlobal,
        );
      } else {
        await tauriInvoke(
          'diagrams:delete',
          item.path,
          this.projectName,
          isGlobal,
        );
      }

      if (currentDiagram === item.path || currentDiagram?.startsWith(`${item.path}/`)) {
        this.setState({ currentDiagram: null, diagramData: null });
      }

      this.loadDiagrams();
      message.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      message.error('Failed to delete item');
    }
  };

  renameItem = async () => {
    const { renameTarget, renameValue, isGlobal } = this.state;
    if (!renameTarget || !renameValue.trim()) return;

    try {
      const newPath = renameValue.endsWith('.json')
        ? renameValue
        : `${renameValue}.json`;
      await tauriInvoke(
        'diagrams:rename',
        renameTarget.path,
        newPath,
        this.projectName,
        isGlobal,
      );
      const { currentDiagram } = this.state;
      this.setState({
        renameModalVisible: false,
        renameTarget: null,
        renameValue: '',
        currentDiagram: currentDiagram === renameTarget.path ? newPath : currentDiagram,
      });
      this.loadDiagrams();
      message.success('Renamed successfully');
    } catch (error) {
      message.error('Failed to rename');
    }
  };

  toggleGlobal = () => {
    this.setState(
      (prevState) => ({ isGlobal: !prevState.isGlobal }),
      () => {
        this.loadDiagrams();
        const { currentDiagram } = this.state;
        if (currentDiagram) this.loadDiagram(currentDiagram);
      },
    );
  };

  loadImages = async () => {
    try {
      const { isGlobal } = this.state;
      const images = await tauriInvoke('docs:listImages', this.projectName, isGlobal);
      this.setState({ images });
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  handleImageUpload = async (file) => {
    const { isGlobal } = this.state;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        await tauriInvoke(
          'docs:saveImage',
          file.name,
          e.target.result,
          this.projectName,
          isGlobal,
        );
        await this.loadImages();
        message.success('Image uploaded successfully');
      } catch (error) {
        message.error('Failed to upload image');
      }
    };
    reader.readAsDataURL(file);
    return false;
  };

  handleImageSelect = async (imagePath) => {
    const { isGlobal, diagramData } = this.state;
    if (!diagramData) return;
    try {
      const imageData = await tauriInvoke(
        'docs:getImage',
        imagePath,
        this.projectName,
        isGlobal,
      );
      const selectedNodeId = diagramData.nodes?.find((n) => n.selected)?.id;
      if (!selectedNodeId) {
        message.warning('Select a card node first');
        return;
      }
      const newNodes = diagramData.nodes.map((n) =>
        n.id === selectedNodeId
          ? { ...n, data: { ...n.data, image: imageData } }
          : n,
      );
      this.handleDiagramChange({ ...diagramData, nodes: newNodes });
      this.setState({ imageUploadVisible: false });
      message.success('Image added to node');
    } catch (error) {
      message.error('Failed to load image');
    }
  };

  render() {
    const {
      lokiLoaded,
      diagrams,
      currentDiagram,
      diagramData,
      isGlobal,
      sidebarCollapsed,
      searchText,
      selectedKeys,
      expandedKeys,
      createDiagramModalVisible,
      createFolderModalVisible,
      renameModalVisible,
      newDiagramName,
      newFolderName,
      renameValue,
      isDirty,
      autosaveEnabled,
      imageUploadVisible,
      images,
      nodes,
      parents,
    } = this.state;

    if (!lokiLoaded) {
      return (
        <LayoutWrapper>
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <Text>Loading...</Text>
          </div>
        </LayoutWrapper>
      );
    }

    const buildTreeData = (items) =>
      items
        .filter((item) => {
          if (!searchText) return true;
          const s = searchText.toLowerCase();
          return (
            item.name.toLowerCase().includes(s) ||
            item.children?.some((c) => c.name.toLowerCase().includes(s))
          );
        })
        .map((item) => ({
          title: (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                {item.type === 'folder' ? <FolderOutlined /> : <FileOutlined />}
                <span style={{ marginLeft: 8 }}>{item.name}</span>
              </span>
              <Space size="small">
                {item.type === 'file' && (
                  <>
                    <Tooltip title="Edit">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          this.loadDiagram(item.path);
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Rename">
                      <Button
                        type="text"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          this.setState({
                            renameModalVisible: true,
                            renameTarget: item,
                            renameValue: item.name,
                          });
                        }}
                      >
                        Rename
                      </Button>
                    </Tooltip>
                    <Tooltip title="Duplicate">
                      <Button
                        type="text"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          this.duplicateDiagram(item);
                        }}
                      >
                        Copy
                      </Button>
                    </Tooltip>
                  </>
                )}
                <Popconfirm
                  title="Delete this item?"
                  onConfirm={() => this.deleteItem(item)}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </Space>
            </div>
          ),
          key: item.path,
          isLeaf: item.type === 'file',
          children: item.children ? buildTreeData(item.children) : undefined,
        }));

    return (
      <LayoutWrapper>
        <Layout style={{ height: '100vh' }}>
          <Sider
            width={250}
            collapsible
            collapsed={sidebarCollapsed}
            onCollapse={(collapsed) => this.setState({ sidebarCollapsed: collapsed })}
            style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
          >
            <div style={{ padding: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Title level={5} style={{ margin: 0 }}>
                    {isGlobal ? 'Global' : 'Project'} Diagrams
                  </Title>
                  <Button
                    type="text"
                    size="small"
                    icon={isGlobal ? <ProjectOutlined /> : <GlobalOutlined />}
                    onClick={this.toggleGlobal}
                  />
                </div>
                <Input
                  placeholder="Search diagrams..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => this.setState({ searchText: e.target.value })}
                  size="small"
                />
                <Button
                  type="dashed"
                  icon={<FileAddOutlined />}
                  size="small"
                  block
                  onClick={() => this.setState({ createDiagramModalVisible: true })}
                >
                  New Diagram
                </Button>
                <Button
                  type="dashed"
                  icon={<FolderAddOutlined />}
                  size="small"
                  block
                  onClick={() => this.setState({ createFolderModalVisible: true })}
                >
                  New Folder
                </Button>
              </Space>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
              <Tree
                treeData={buildTreeData(diagrams)}
                selectedKeys={selectedKeys}
                expandedKeys={expandedKeys}
                onSelect={(keys, info) => {
                  this.setState({ selectedKeys: keys });
                  if (info?.node?.isLeaf) this.loadDiagram(info.node.key);
                }}
                onExpand={(keys) => this.setState({ expandedKeys: keys })}
              />
            </div>
          </Sider>

          <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {currentDiagram && diagramData ? (
              <>
                <div
                  style={{
                    padding: '8px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Text strong>{currentDiagram.replace('.json', '')}</Text>
                  {isDirty && <Tag color="orange">Unsaved</Tag>}
                </div>
                <DiagramEditor
                  diagramKey={currentDiagram}
                  diagramData={diagramData}
                  projectName={this.projectName}
                  banflowNodes={nodes}
                  banflowParents={parents}
                  isDirty={isDirty}
                  autosaveEnabled={autosaveEnabled}
                  onDiagramChange={this.handleDiagramChange}
                  onSave={() => this.saveDiagram(true)}
                  onAutosaveChange={(checked) => {
                    this.setState({ autosaveEnabled: checked });
                    if (checked && isDirty) this.autosaveDiagram();
                  }}
                  onOpenImagePicker={() => this.setState({ imageUploadVisible: true })}
                  images={images}
                />
              </>
            ) : (
              <div style={{ padding: 50, textAlign: 'center' }}>
                <Text type="secondary">
                  Select a diagram from the sidebar or create a new one. Use the toolbar to
                  draw shapes, connect nodes, and sketch with the pen tool.
                </Text>
              </div>
            )}
          </Content>
        </Layout>

        <Modal
          title="Create New Diagram"
          open={createDiagramModalVisible}
          onOk={this.createDiagram}
          onCancel={() =>
            this.setState({ createDiagramModalVisible: false, newDiagramName: '' })
          }
        >
          <Input
            placeholder="Diagram name"
            value={newDiagramName}
            onChange={(e) => this.setState({ newDiagramName: e.target.value })}
            onPressEnter={this.createDiagram}
          />
        </Modal>

        <Modal
          title="Create New Folder"
          open={createFolderModalVisible}
          onOk={this.createFolder}
          onCancel={() =>
            this.setState({ createFolderModalVisible: false, newFolderName: '' })
          }
        >
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => this.setState({ newFolderName: e.target.value })}
            onPressEnter={this.createFolder}
          />
        </Modal>

        <Modal
          title="Rename Diagram"
          open={renameModalVisible}
          onOk={this.renameItem}
          onCancel={() =>
            this.setState({ renameModalVisible: false, renameTarget: null, renameValue: '' })
          }
        >
          <Input
            value={renameValue}
            onChange={(e) => this.setState({ renameValue: e.target.value })}
            onPressEnter={this.renameItem}
          />
        </Modal>

        <Modal
          title="Select or Upload Image"
          open={imageUploadVisible}
          onCancel={() => this.setState({ imageUploadVisible: false })}
          footer={null}
          width={600}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong>Upload New Image</Text>
              <Upload beforeUpload={this.handleImageUpload} showUploadList={false} accept="image/*">
                <Button icon={<UploadOutlined />} block>
                  Upload Image
                </Button>
              </Upload>
            </div>
            <Divider />
            <div>
              <Text strong>Select Existing Image</Text>
              <List
                grid={{ gutter: 16, column: 3 }}
                dataSource={images}
                style={{ maxHeight: 400, overflow: 'auto', marginTop: 12 }}
                renderItem={(image) => (
                  <List.Item>
                    <Card
                      hoverable
                      cover={
                        <img
                          alt={image.name}
                          src={image.dataUrl}
                          style={{ height: 120, objectFit: 'cover' }}
                        />
                      }
                      onClick={() => this.handleImageSelect(image.path)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Card.Meta title={image.name} />
                    </Card>
                  </List.Item>
                )}
              />
            </div>
          </Space>
        </Modal>
      </LayoutWrapper>
    );
  }
}

export default ChartPage;
