// Libs
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ipcRenderer } from 'electron';
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
  AutoComplete,
  Upload,
  Drawer,
  List,
  Switch,
} from 'antd';
import {
  FileOutlined,
  FolderOutlined,
  FolderAddOutlined,
  FileAddOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  SaveOutlined,
  GlobalOutlined,
  ProjectOutlined,
  PlusOutlined,
  CloseOutlined,
  PictureOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import LayoutWrapper from '../../layouts/App';
import './ChartPage.scss';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

// Custom Node Component with Node/Parent Reference
function CustomNode({ data, selected }) {
  const { referencedNode: node, referencedParent: parent } = data;

  const handleNodeClick = (e, nodeId) => {
    e.stopPropagation();
    const projectName = data.projectName?.replace(/\//g, '@') || '';
    window.location.hash = `#/projectPage/${projectName}?node=${nodeId}`;
  };

  const handleParentClick = (e, parentId) => {
    e.stopPropagation();
    const projectName = data.projectName?.replace(/\//g, '@') || '';
    window.location.hash = `#/projectPage/${projectName}?parent=${parentId}`;
  };

  return (
    <div
      className={`custom-node ${selected ? 'selected' : ''}`}
      style={{
        background: data.color || '#fff',
        border: `2px solid ${selected ? '#1890ff' : data.borderColor || '#d9d9d9'}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '150px',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 4px 12px rgba(24, 144, 255, 0.3)'
          : '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {data.image && (
        <img
          src={data.image}
          alt=""
          style={{
            width: '100%',
            height: '100px',
            objectFit: 'cover',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
        />
      )}
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        {data.label || 'Node'}
      </div>
      {node && (
        <Tag
          color="blue"
          style={{ marginTop: '4px', cursor: 'pointer' }}
          onClick={(e) => handleNodeClick(e, node.id)}
        >
          @{node.title}
        </Tag>
      )}
      {parent && (
        <Tag
          color="green"
          style={{ marginTop: '4px', cursor: 'pointer' }}
          onClick={(e) => handleParentClick(e, parent.id)}
        >
          @{parent.title}
        </Tag>
      )}
      {data.description && (
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          {data.description}
        </div>
      )}
    </div>
  );
}

CustomNode.propTypes = {
  data: PropTypes.shape({
    referencedNode: PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    }),
    referencedParent: PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    }),
    projectName: PropTypes.string,
    color: PropTypes.string,
    borderColor: PropTypes.string,
    image: PropTypes.string,
    label: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
};

CustomNode.defaultProps = {
  selected: false,
};

const nodeTypes = {
  custom: CustomNode,
};

class ChartPage extends Component {
  constructor(props) {
    super(props);

    const location = window.location.href;
    this.projectName = location.split('/').pop();
    // Remove query parameters
    [this.projectName] = this.projectName.split('?');
    this.projectName = this.projectName.replace(/[@]/g, '/');
    localStorage.setItem('currentProject', this.projectName);

    this.state = {
      lokiLoaded: false,
      nodes: {},
      parents: {},
      // Diagrams state
      diagrams: [],
      currentDiagram: null,
      diagramData: null,
      isGlobal: false,
      // UI state
      sidebarCollapsed: false,
      searchText: '',
      selectedKeys: [],
      expandedKeys: [],
      // Modal states
      createDiagramModalVisible: false,
      createFolderModalVisible: false,
      deleteConfirmVisible: false,
      itemToDelete: null,
      newDiagramName: '',
      newFolderName: '',
      // Editor state
      isDirty: false,
      // Node editing
      selectedNodeId: null,
      nodeEditPanelVisible: false,
      // Image upload
      imageUploadVisible: false,
      images: [],
      // Autosave
      autosaveTimer: null,
      autosaveEnabled: true, // Default to enabled
    };
  }

  componentDidMount() {
    const newState = ipcRenderer.sendSync(
      'api:initializeProjectState',
      this.projectName,
    );

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

    ipcRenderer.on('UpdateProjectPageState', this.handleStateUpdate);
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners('UpdateProjectPageState');
    // Clear autosave timer
    const { autosaveTimer } = this.state;
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
    }
  }

  handleStateUpdate = (e, newState) => {
    this.setState(newState);
  };

  loadDiagrams = async () => {
    try {
      const { isGlobal } = this.state;
      const diagrams = await ipcRenderer.invoke(
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
      const diagram = await ipcRenderer.invoke(
        'diagrams:read',
        diagramPath,
        this.projectName,
        isGlobal,
      );

      // Restore node/parent references from IDs
      const restoredNodes = (diagram.content.nodes || []).map((node) => {
        const restoredData = { ...node.data };

        // Restore node reference
        if (node.data.nodeReferenceId && nodes[node.data.nodeReferenceId]) {
          restoredData.referencedNode = nodes[node.data.nodeReferenceId];
        }

        // Restore parent reference
        if (
          node.data.parentReferenceId &&
          parents[node.data.parentReferenceId]
        ) {
          restoredData.referencedParent = parents[node.data.parentReferenceId];
        }

        // Ensure projectName is set
        restoredData.projectName = this.projectName;

        return {
          ...node,
          data: restoredData,
        };
      });

      this.setState({
        currentDiagram: diagramPath,
        diagramData: {
          ...diagram.content,
          nodes: restoredNodes,
        },
        isDirty: false,
        selectedNodeId: null,
        nodeEditPanelVisible: false,
      });
    } catch (error) {
      console.error('Error loading diagram:', error);
      message.error('Failed to load diagram');
    }
  };

  saveDiagram = async (showMessage = true) => {
    const { currentDiagram, diagramData, isGlobal } = this.state;
    if (!currentDiagram || !diagramData) {
      if (showMessage) {
        message.warning('No diagram to save');
      }
      return;
    }

    try {
      // Save only IDs for references, not full objects
      const dataToSave = {
        ...diagramData,
        nodes: (diagramData.nodes || []).map((node) => ({
          ...node,
          data: {
            ...node.data,
            nodeReferenceId: node.data.referencedNode?.id || null,
            parentReferenceId: node.data.referencedParent?.id || null,
            referencedNode: undefined, // Don't save full object
            referencedParent: undefined, // Don't save full object
          },
        })),
      };

      await ipcRenderer.invoke(
        'diagrams:save',
        currentDiagram,
        dataToSave,
        this.projectName,
        isGlobal,
      );
      this.setState({ isDirty: false });
      if (showMessage) {
        message.success('Diagram saved successfully');
      }
    } catch (error) {
      console.error('Error saving diagram:', error);
      if (showMessage) {
        message.error('Failed to save diagram');
      }
    }
  };

  autosaveDiagram = () => {
    const { autosaveEnabled, autosaveTimer, isDirty, currentDiagram } =
      this.state;
    // Don't autosave if disabled
    if (!autosaveEnabled) return;

    // Clear existing timer
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
    }

    // Set new timer for autosave (2 seconds after last change)
    const timer = setTimeout(() => {
      if (isDirty && currentDiagram && autosaveEnabled) {
        this.saveDiagram(false); // Save without showing message
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

      const initialData = {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };

      await ipcRenderer.invoke(
        'diagrams:save',
        diagramPath,
        initialData,
        this.projectName,
        isGlobal,
      );

      this.setState(
        {
          createDiagramModalVisible: false,
          newDiagramName: '',
        },
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

  createFolder = async () => {
    const { newFolderName, isGlobal } = this.state;
    if (!newFolderName.trim()) {
      message.warning('Please enter a folder name');
      return;
    }

    try {
      await ipcRenderer.invoke(
        'diagrams:createFolder',
        newFolderName,
        this.projectName,
        isGlobal,
      );

      this.setState(
        {
          createFolderModalVisible: false,
          newFolderName: '',
        },
        () => {
          this.loadDiagrams();
        },
      );

      message.success('Folder created successfully');
    } catch (error) {
      console.error('Error creating folder:', error);
      message.error('Failed to create folder');
    }
  };

  deleteItem = async (item) => {
    const { currentDiagram, isGlobal } = this.state;
    try {
      if (item.type === 'folder') {
        // For folders, we'd need a recursive delete - for now just show a message
        message.warning('Folder deletion not yet implemented');
        return;
      }

      await ipcRenderer.invoke(
        'diagrams:delete',
        item.path,
        this.projectName,
        isGlobal,
      );

      if (currentDiagram === item.path) {
        this.setState({
          currentDiagram: null,
          diagramData: null,
        });
      }

      this.loadDiagrams();
      message.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      message.error('Failed to delete item');
    }
  };

  toggleGlobal = () => {
    this.setState(
      (prevState) => ({ isGlobal: !prevState.isGlobal }),
      () => {
        this.loadDiagrams();
        const { currentDiagram } = this.state;
        if (currentDiagram) {
          this.loadDiagram(currentDiagram);
        }
      },
    );
  };

  onNodesChange = (changes) => {
    const { diagramData, selectedNodeId } = this.state;
    if (!diagramData) return;

    const newNodes = [...diagramData.nodes];
    let shouldUpdateState = false;

    changes.forEach((change) => {
      if (change.type === 'position' && change.position) {
        const node = newNodes.find((n) => n.id === change.id);
        if (node) {
          node.position = change.position;
          shouldUpdateState = true;
        }
      } else if (change.type === 'remove') {
        const index = newNodes.findIndex((n) => n.id === change.id);
        if (index !== -1) {
          newNodes.splice(index, 1);
          if (selectedNodeId === change.id) {
            this.setState({
              selectedNodeId: null,
              nodeEditPanelVisible: false,
            });
          }
          shouldUpdateState = true;
        }
      } else if (change.type === 'select') {
        // Handle node selection
        if (change.selected) {
          this.setState({
            selectedNodeId: change.id,
            nodeEditPanelVisible: true,
          });
        } else if (selectedNodeId === change.id) {
          this.setState({
            selectedNodeId: null,
            nodeEditPanelVisible: false,
          });
        }
      } else if (change.type === 'dimensions' && change.dimensions) {
        const node = newNodes.find((n) => n.id === change.id);
        if (node) {
          node.width = change.dimensions.width;
          node.height = change.dimensions.height;
          shouldUpdateState = true;
        }
      }
    });

    if (shouldUpdateState) {
      this.setState(
        (prevState) => ({
          diagramData: {
            ...prevState.diagramData,
            nodes: newNodes,
          },
          isDirty: true,
        }),
        () => {
          this.autosaveDiagram();
        },
      );
    }
  };

  onEdgesChange = (changes) => {
    const { diagramData } = this.state;
    if (!diagramData) return;

    const newEdges = [...diagramData.edges];
    changes.forEach((change) => {
      if (change.type === 'remove') {
        const index = newEdges.findIndex((e) => e.id === change.id);
        if (index !== -1) {
          newEdges.splice(index, 1);
        }
      }
    });

    this.setState(
      (prevState) => ({
        diagramData: {
          ...prevState.diagramData,
          edges: newEdges,
        },
        isDirty: true,
      }),
      () => {
        this.autosaveDiagram();
      },
    );
  };

  onConnect = (params) => {
    const { diagramData } = this.state;
    if (!diagramData) return;

    const newEdge = {
      ...params,
      id: `edge-${Date.now()}`,
      type: 'smoothstep',
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    };

    this.setState(
      (prevState) => ({
        diagramData: {
          ...prevState.diagramData,
          edges: [...prevState.diagramData.edges, newEdge],
        },
        isDirty: true,
      }),
      () => {
        this.autosaveDiagram();
      },
    );
  };

  onMove = (event, viewport) => {
    const { diagramData } = this.state;
    if (!diagramData) return;

    this.setState(
      (prevState) => ({
        diagramData: {
          ...prevState.diagramData,
          viewport,
        },
        isDirty: true,
      }),
      () => {
        this.autosaveDiagram();
      },
    );
  };

  addNode = (type = 'custom') => {
    const { diagramData } = this.state;
    if (!diagramData) return;

    const newNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: 'New Node',
        color: '#fff',
        borderColor: '#d9d9d9',
        projectName: this.projectName,
      },
    };

    this.setState(
      (prevState) => ({
        diagramData: {
          ...prevState.diagramData,
          nodes: [...prevState.diagramData.nodes, newNode],
        },
        selectedNodeId: newNode.id,
        nodeEditPanelVisible: true,
        isDirty: true,
      }),
      () => {
        this.autosaveDiagram();
      },
    );
  };

  loadImages = async () => {
    try {
      const { isGlobal } = this.state;
      const images = await ipcRenderer.invoke(
        'docs:listImages',
        this.projectName,
        isGlobal,
      );
      this.setState({ images });
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  handleImageUpload = async (file) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        const imageName = file.name;

        await ipcRenderer.invoke(
          'docs:saveImage',
          imageName,
          base64,
          this.projectName,
          this.state.isGlobal,
        );

        await this.loadImages();
        message.success('Image uploaded successfully');
      };
      reader.readAsDataURL(file);
      return false; // Prevent default upload
    } catch (error) {
      console.error('Error uploading image:', error);
      message.error('Failed to upload image');
      return false; // Ensure a return value in case of error
    }
  };

  handleImageSelect = (imagePath) => {
    const { selectedNodeId, diagramData, isGlobal } = this.state;
    if (!selectedNodeId || !diagramData) return;

    ipcRenderer
      .invoke('docs:getImage', imagePath, this.projectName, isGlobal)
      .then((imageData) => {
        this.updateNodeData(selectedNodeId, { image: imageData });
        this.setState({ imageUploadVisible: false });
        message.success('Image added to node');
        return imageData; // Explicitly return a value
      })
      .catch((error) => {
        console.error('Error loading image:', error);
        message.error('Failed to load image');
        throw error; // Re-throw the error to ensure proper promise chain
      });
  };

  updateNodeData = (nodeId, newData) => {
    const { diagramData } = this.state;
    if (!diagramData) return;

    const newNodes = diagramData.nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...newData,
          },
        };
      }
      return node;
    });

    this.setState(
      (prevState) => ({
        diagramData: {
          ...prevState.diagramData,
          nodes: newNodes,
        },
        isDirty: true,
      }),
      () => {
        this.autosaveDiagram();
      },
    );
  };

  getNodeSuggestions = (query) => {
    const { nodes } = this.state;
    const queryLower = query.toLowerCase();
    return Object.values(nodes || {})
      .filter(
        (node) => node.title && node.title.toLowerCase().includes(queryLower),
      )
      .slice(0, 10)
      .map((node) => ({ value: node.id, label: node.title, node }));
  };

  getParentSuggestions = (query) => {
    const { parents } = this.state;
    const queryLower = query.toLowerCase();
    return Object.values(parents || {})
      .filter(
        (parent) =>
          parent.title && parent.title.toLowerCase().includes(queryLower),
      )
      .slice(0, 10)
      .map((parent) => ({ value: parent.id, label: parent.title, parent }));
  };

  handleNodeReferenceSelect = (nodeId) => {
    const { selectedNodeId, nodes } = this.state;
    if (!selectedNodeId) return;
    const node = nodes[nodeId];
    if (node) {
      this.updateNodeData(selectedNodeId, {
        referencedNode: node,
        nodeReferenceId: nodeId,
      });
    }
  };

  handleParentReferenceSelect = (parentId) => {
    const { selectedNodeId, parents } = this.state;
    if (!selectedNodeId) return;
    const parent = parents[parentId];
    if (parent) {
      this.updateNodeData(selectedNodeId, {
        referencedParent: parent,
        parentReferenceId: parentId,
      });
    }
  };

  removeNodeReference = () => {
    const { selectedNodeId } = this.state;
    if (!selectedNodeId) return;
    this.updateNodeData(selectedNodeId, {
      referencedNode: null,
      nodeReferenceId: null,
    });
  };

  removeParentReference = () => {
    const { selectedNodeId } = this.state;
    if (!selectedNodeId) return;
    this.updateNodeData(selectedNodeId, {
      referencedParent: null,
      parentReferenceId: null,
    });
  };

  removeImage = () => {
    const { selectedNodeId } = this.state;
    if (!selectedNodeId) return;
    this.updateNodeData(selectedNodeId, { image: null });
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
      newDiagramName,
      newFolderName,
      isDirty,
      autosaveEnabled,
      nodeEditPanelVisible,
      selectedNodeId,
      images,
      imageUploadVisible,
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

    // Build tree data
    const buildTreeData = (items) => {
      return items
        .filter((item) => {
          if (!searchText) return true;
          const searchLower = searchText.toLowerCase();
          return (
            item.name.toLowerCase().includes(searchLower) ||
            (item.children &&
              item.children.some((child) =>
                child.name.toLowerCase().includes(searchLower),
              ))
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
                <span style={{ marginLeft: '8px' }}>{item.name}</span>
              </span>
              <Space>
                {item.type === 'file' && (
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
                )}
                <Popconfirm
                  title="Are you sure you want to delete this item?"
                  onConfirm={() => this.deleteItem(item)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Tooltip title="Delete">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                </Popconfirm>
              </Space>
            </div>
          ),
          key: item.path,
          isLeaf: item.type === 'file',
          children: item.children ? buildTreeData(item.children) : undefined,
        }));
    };

    return (
      <LayoutWrapper>
        <Layout style={{ height: '100vh' }}>
          <Sider
            width={250}
            collapsible
            collapsed={sidebarCollapsed}
            onCollapse={(collapsed) =>
              this.setState({ sidebarCollapsed: collapsed })
            }
            style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
          >
            <div style={{ padding: '16px' }}>
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="small"
              >
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
                    title={isGlobal ? 'Switch to Project' : 'Switch to Global'}
                  />
                </div>

                <Input
                  placeholder="Search diagrams..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) =>
                    this.setState({ searchText: e.target.value })
                  }
                  size="small"
                />

                <Space
                  direction="vertical"
                  style={{ width: '100%' }}
                  size="small"
                >
                  <Button
                    type="dashed"
                    icon={<FileAddOutlined />}
                    size="small"
                    onClick={() =>
                      this.setState({ createDiagramModalVisible: true })
                    }
                    block
                  >
                    New Diagram
                  </Button>
                  <Button
                    type="dashed"
                    icon={<FolderAddOutlined />}
                    size="small"
                    onClick={() =>
                      this.setState({ createFolderModalVisible: true })
                    }
                    block
                  >
                    New Folder
                  </Button>
                </Space>
              </Space>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
              <Tree
                treeData={buildTreeData(diagrams)}
                selectedKeys={selectedKeys}
                expandedKeys={expandedKeys}
                onSelect={(keys) => this.setState({ selectedKeys: keys })}
                onExpand={(keys) => this.setState({ expandedKeys: keys })}
                onSelect={(keys, info) => {
                  if (info.node.isLeaf) {
                    this.loadDiagram(info.node.key);
                  }
                }}
              />
            </div>
          </Sider>

          <Content
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {currentDiagram && diagramData ? (
              <>
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Space>
                    <Text strong>{currentDiagram.replace('.json', '')}</Text>
                    {isDirty && <Tag color="orange">Unsaved</Tag>}
                  </Space>
                  <Space>
                    <Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Autosave
                      </Text>
                      <Switch
                        checked={autosaveEnabled}
                        onChange={(checked) => {
                          this.setState({ autosaveEnabled: checked });
                          if (checked && isDirty) {
                            // If enabling autosave and there are unsaved changes, save immediately
                            this.autosaveDiagram();
                          }
                        }}
                        size="small"
                      />
                    </Space>
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => this.addNode()}
                    >
                      Add Node
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={this.saveDiagram}
                      disabled={!isDirty}
                    >
                      Save
                    </Button>
                  </Space>
                </div>

                <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <ReactFlow
                      nodes={diagramData.nodes || []}
                      edges={diagramData.edges || []}
                      onNodesChange={this.onNodesChange}
                      onEdgesChange={this.onEdgesChange}
                      onConnect={this.onConnect}
                      onMove={this.onMove}
                      onNodeClick={(event, node) => {
                        this.setState({
                          selectedNodeId: node.id,
                          nodeEditPanelVisible: true,
                        });
                      }}
                      nodeTypes={nodeTypes}
                      defaultViewport={
                        diagramData.viewport || { x: 0, y: 0, zoom: 1 }
                      }
                      fitView
                    >
                      <Background />
                      <Controls />
                      <MiniMap />
                    </ReactFlow>
                  </div>

                  {nodeEditPanelVisible &&
                    selectedNodeId &&
                    (() => {
                      const selectedNode = (diagramData.nodes || []).find(
                        (n) => n.id === selectedNodeId,
                      );
                      if (!selectedNode) return null;

                      return (
                        <Drawer
                          title="Edit Node"
                          placement="right"
                          width={350}
                          onClose={() =>
                            this.setState({
                              nodeEditPanelVisible: false,
                              selectedNodeId: null,
                            })
                          }
                          visible={nodeEditPanelVisible}
                        >
                          <Space
                            direction="vertical"
                            style={{ width: '100%' }}
                            size="middle"
                          >
                            <div>
                              <Text strong>Label</Text>
                              <Input
                                value={selectedNode.data?.label || ''}
                                onChange={(e) =>
                                  this.updateNodeData(selectedNodeId, {
                                    label: e.target.value,
                                  })
                                }
                                placeholder="Node label"
                              />
                            </div>

                            <div>
                              <Text strong>Description</Text>
                              <Input.TextArea
                                value={selectedNode.data?.description || ''}
                                onChange={(e) =>
                                  this.updateNodeData(selectedNodeId, {
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Node description"
                                rows={3}
                              />
                            </div>

                            <Divider />

                            <div>
                              <Text strong>Background Color</Text>
                              <Input
                                type="color"
                                value={selectedNode.data?.color || '#ffffff'}
                                onChange={(e) =>
                                  this.updateNodeData(selectedNodeId, {
                                    color: e.target.value,
                                  })
                                }
                                style={{ width: '100%', height: '40px' }}
                              />
                            </div>

                            <div>
                              <Text strong>Border Color</Text>
                              <Input
                                type="color"
                                value={
                                  selectedNode.data?.borderColor || '#d9d9d9'
                                }
                                onChange={(e) =>
                                  this.updateNodeData(selectedNodeId, {
                                    borderColor: e.target.value,
                                  })
                                }
                                style={{ width: '100%', height: '40px' }}
                              />
                            </div>

                            <Divider />

                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '8px',
                                }}
                              >
                                <Text strong>Image</Text>
                                <Space>
                                  <Button
                                    size="small"
                                    icon={<PictureOutlined />}
                                    onClick={() =>
                                      this.setState({
                                        imageUploadVisible: true,
                                      })
                                    }
                                  >
                                    {selectedNode.data?.image
                                      ? 'Change'
                                      : 'Add'}{' '}
                                    Image
                                  </Button>
                                  {selectedNode.data?.image && (
                                    <Button
                                      size="small"
                                      danger
                                      icon={<CloseOutlined />}
                                      onClick={this.removeImage}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </Space>
                              </div>
                              {selectedNode.data?.image && (
                                <img
                                  src={selectedNode.data.image}
                                  alt="Node"
                                  style={{
                                    width: '100%',
                                    maxHeight: '200px',
                                    objectFit: 'contain',
                                    borderRadius: '4px',
                                    border: '1px solid #d9d9d9',
                                  }}
                                />
                              )}
                            </div>

                            <Divider />

                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '8px',
                                }}
                              >
                                <Text strong>Node Reference</Text>
                                {selectedNode.data?.referencedNode && (
                                  <Button
                                    size="small"
                                    danger
                                    icon={<CloseOutlined />}
                                    onClick={this.removeNodeReference}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                              {selectedNode.data?.referencedNode ? (
                                <Tag
                                  color="blue"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    const projectName =
                                      this.projectName.replace(/\//g, '@');
                                    window.location.hash = `#/projectPage/${projectName}?node=${selectedNode.data.referencedNode.id}`;
                                  }}
                                >
                                  @{selectedNode.data.referencedNode.title}
                                </Tag>
                              ) : (
                                <AutoComplete
                                  style={{ width: '100%' }}
                                  options={this.getNodeSuggestions('')}
                                  onSelect={(value, option) =>
                                    this.handleNodeReferenceSelect(value)
                                  }
                                  onSearch={(text) =>
                                    this.getNodeSuggestions(text)
                                  }
                                  placeholder="Search for a node..."
                                  filterOption={(inputValue, option) =>
                                    option.label
                                      .toLowerCase()
                                      .includes(inputValue.toLowerCase())
                                  }
                                />
                              )}
                            </div>

                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '8px',
                                }}
                              >
                                <Text strong>Parent Reference</Text>
                                {selectedNode.data?.referencedParent && (
                                  <Button
                                    size="small"
                                    danger
                                    icon={<CloseOutlined />}
                                    onClick={this.removeParentReference}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                              {selectedNode.data?.referencedParent ? (
                                <Tag
                                  color="green"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    const projectName =
                                      this.projectName.replace(/\//g, '@');
                                    window.location.hash = `#/projectPage/${projectName}?parent=${selectedNode.data.referencedParent.id}`;
                                  }}
                                >
                                  @{selectedNode.data.referencedParent.title}
                                </Tag>
                              ) : (
                                <AutoComplete
                                  style={{ width: '100%' }}
                                  options={this.getParentSuggestions('')}
                                  onSelect={(value, option) =>
                                    this.handleParentReferenceSelect(value)
                                  }
                                  onSearch={(text) =>
                                    this.getParentSuggestions(text)
                                  }
                                  placeholder="Search for a parent..."
                                  filterOption={(inputValue, option) =>
                                    option.label
                                      .toLowerCase()
                                      .includes(inputValue.toLowerCase())
                                  }
                                />
                              )}
                            </div>

                            <Divider />

                            <Button
                              danger
                              block
                              onClick={() => {
                                if (!diagramData) return;
                                const newNodes = (
                                  diagramData.nodes || []
                                ).filter((n) => n.id !== selectedNodeId);
                                this.setState((prevState) => ({
                                  diagramData: {
                                    ...prevState.diagramData,
                                    nodes: newNodes,
                                  },
                                  selectedNodeId: null,
                                  nodeEditPanelVisible: false,
                                  isDirty: true,
                                }));
                              }}
                            >
                              Delete Node
                            </Button>
                          </Space>
                        </Drawer>
                      );
                    })()}
                </div>
              </>
            ) : (
              <div style={{ padding: '50px', textAlign: 'center' }}>
                <Text type="secondary">
                  Select a diagram from the sidebar or create a new one
                </Text>
              </div>
            )}
          </Content>
        </Layout>

        {/* Create Diagram Modal */}
        <Modal
          title="Create New Diagram"
          visible={createDiagramModalVisible}
          onOk={this.createDiagram}
          onCancel={() =>
            this.setState({
              createDiagramModalVisible: false,
              newDiagramName: '',
            })
          }
        >
          <Input
            placeholder="Diagram name"
            value={newDiagramName}
            onChange={(e) => this.setState({ newDiagramName: e.target.value })}
            onPressEnter={this.createDiagram}
          />
        </Modal>

        {/* Create Folder Modal */}
        <Modal
          title="Create New Folder"
          visible={createFolderModalVisible}
          onOk={this.createFolder}
          onCancel={() =>
            this.setState({
              createFolderModalVisible: false,
              newFolderName: '',
            })
          }
        >
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => this.setState({ newFolderName: e.target.value })}
            onPressEnter={this.createFolder}
          />
        </Modal>

        {/* Image Upload/Select Modal */}
        <Modal
          title="Select or Upload Image"
          visible={imageUploadVisible}
          onCancel={() => this.setState({ imageUploadVisible: false })}
          footer={null}
          width={600}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong>Upload New Image</Text>
              <Upload
                beforeUpload={this.handleImageUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />} block>
                  Upload Image
                </Button>
              </Upload>
            </div>

            <Divider />

            <div>
              <Text strong>Select Existing Image</Text>
              <div
                style={{
                  maxHeight: '400px',
                  overflow: 'auto',
                  marginTop: '12px',
                }}
              >
                <List
                  grid={{ gutter: 16, column: 3 }}
                  dataSource={images}
                  renderItem={(image) => (
                    <List.Item>
                      <Card
                        hoverable
                        cover={
                          <img
                            alt={image.name}
                            src={image.dataUrl}
                            style={{ height: '120px', objectFit: 'cover' }}
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
            </div>
          </Space>
        </Modal>
      </LayoutWrapper>
    );
  }
}

export default ChartPage;
