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
  Badge,
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
  SaveOutlined,
  GlobalOutlined,
  ProjectOutlined,
  PictureOutlined,
  TagsOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  UploadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import LayoutWrapper from '../../layouts/App';
import MetadataManager from '../../components/MetadataManager/MetadataManager';
import ImageThumbnail from './ImageThumbnail';
import './DocsPage.scss';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

// Helper component for markdown links
function MarkdownLink({ href, children, projectName, onLoadDoc }) {
  if (href?.startsWith('node:')) {
    const nodeId = href.replace('node:', '');
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          const normalizedProjectName = projectName.replace(/\//g, '@');
          window.location.hash = `#/projectPage/${normalizedProjectName}?node=${nodeId}`;
        }}
        style={{
          color: '#1890ff',
          textDecoration: 'none',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
        }}
      >
        {children}
      </button>
    );
  }
  if (href?.startsWith('parent:')) {
    const parentId = href.replace('parent:', '');
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          const normalizedProjectName = projectName.replace(/\//g, '@');
          window.location.hash = `#/projectPage/${normalizedProjectName}?parent=${parentId}`;
        }}
        style={{
          color: '#52c41a',
          textDecoration: 'none',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
        }}
      >
        {children}
      </button>
    );
  }
  if (href?.startsWith('doc:')) {
    const docName = href.replace('doc:', '');
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onLoadDoc(docName);
        }}
        style={{
          color: '#722ed1',
          textDecoration: 'none',
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
        }}
      >
        {children}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

MarkdownLink.propTypes = {
  href: PropTypes.string,
  children: PropTypes.node,
  projectName: PropTypes.string,
  onLoadDoc: PropTypes.func,
};

MarkdownLink.defaultProps = {
  href: null,
  children: null,
  projectName: '',
  onLoadDoc: () => {},
};

// Helper component for markdown link handling in editor
function MarkdownLinkHandler({ href, children, projectName, onLoadDoc }) {
  return (
    <MarkdownLink href={href} projectName={projectName} onLoadDoc={onLoadDoc}>
      {children}
    </MarkdownLink>
  );
}

MarkdownLinkHandler.propTypes = {
  href: PropTypes.string,
  children: PropTypes.node,
  projectName: PropTypes.string,
  onLoadDoc: PropTypes.func,
};

MarkdownLinkHandler.defaultProps = {
  href: null,
  children: null,
  projectName: '',
  onLoadDoc: () => {},
};

class DocsPage extends Component {
  constructor(props) {
    super(props);

    const location = window.location.href;
    this.projectName = location.split('/').pop();
    // Remove query parameters (everything after ?)
    [this.projectName] = this.projectName.split('?');
    this.projectName = this.projectName.replace(/[@]/g, '/');
    localStorage.setItem('currentProject', this.projectName);

    this.state = {
      lokiLoaded: false,
      nodes: {},
      parents: {},
      // Docs state
      docs: [],
      currentDoc: null,
      docContent: '',
      isGlobal: false,
      // UI state
      sidebarCollapsed: false,
      searchText: '',
      selectedKeys: [],
      expandedKeys: [],
      // Modal states
      createDocModalVisible: false,
      createFolderModalVisible: false,
      newDocName: '',
      newFolderName: '',
      // Editor state
      editorMode: 'split', // 'edit', 'preview', 'split'
      isDirty: false,
      // Metadata
      docMetadata: null,
      showMetadata: false,
      // Image gallery
      imageGalleryVisible: false,
      // Autocomplete
      mentionSuggestions: [],
      mentionPosition: null,
      wikiLinkSuggestions: [],
      // Metadata manager
      metadataManagerVisible: false,
      // Templates
      templateModalVisible: false,
      selectedTemplate: null,
      // Mention helper
      showMentionHelper: false,
      // Autocomplete
      mentionQuery: '',
      showMentionAutocomplete: false,
      mentionAutocompletePosition: { top: 0, left: 0 },
      selectedMentionIndex: 0,
    };

    this.templates = {
      blank: { name: 'Blank', content: '' },
      meeting: {
        name: 'Meeting Notes',
        content: `# Meeting Notes

**Date:** ${new Date().toLocaleDateString()}
**Attendees:** 

## Agenda
- 

## Discussion
- 

## Action Items
- [ ] 

## Next Steps
- 
`,
      },
      project: {
        name: 'Project Plan',
        content: `# Project Plan

## Overview


## Goals
- 

## Timeline
- 

## Resources
- 

## Risks
- 
`,
      },
      todo: {
        name: 'Todo List',
        content: `# Todo List

## High Priority
- [ ] 

## Medium Priority
- [ ] 

## Low Priority
- [ ] 
`,
      },
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
        this.loadDocs();
        this.loadImages();
        // Debug: Log nodes and parents to verify they're loaded
        const { nodes, parents } = this.state;
        console.log('Nodes loaded:', Object.keys(nodes || {}).length);
        console.log('Parents loaded:', Object.keys(parents || {}).length);
      },
    );

    ipcRenderer.on('UpdateProjectPageState', this.handleStateUpdate);
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners('UpdateProjectPageState');
  }

  // eslint-disable-next-line class-methods-use-this
  countWords = (text) => {
    if (!text) return 0;
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  handleStateUpdate = (e, newState) => {
    this.setState(newState);
  };

  loadDocs = async () => {
    try {
      const { isGlobal } = this.state;
      const docs = await ipcRenderer.invoke(
        'docs:list',
        this.projectName,
        isGlobal,
      );
      this.setState({ docs });
    } catch (error) {
      console.error('Error loading docs:', error);
      message.error('Failed to load documents');
    }
  };

  loadDoc = async (docPath) => {
    try {
      const { isGlobal } = this.state;
      const doc = await ipcRenderer.invoke(
        'docs:read',
        docPath,
        this.projectName,
        isGlobal,
      );
      const processedContent = this.processMarkdownLinks(doc.content);
      const backlinks = await this.getBacklinks(docPath);
      this.setState((prevState) => ({
        ...prevState,
        currentDoc: docPath,
        docContent: processedContent, // Keep original for editing
        isDirty: false,
        docMetadata: {
          ...doc,
          wordCount: this.countWords(doc.content),
          readingTime: this.calculateReadingTime(doc.content),
          backlinks,
          references: this.extractReferences(doc.content),
        },
      }));
    } catch (error) {
      console.error('Error loading doc:', error);
      message.error('Failed to load document');
    }
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

  processMarkdownLinks = (content) => {
    // Process @ mentions for nodes/parents
    const { nodes, parents } = this.state;
    let processed = content;

    // Build a map of all node and parent titles for quick lookup
    const allTitles = new Map();
    Object.values(nodes || {}).forEach((node) => {
      if (node.title) {
        const title = node.title.trim();
        allTitles.set(title.toLowerCase(), {
          type: 'node',
          id: node.id,
          title,
        });
      }
    });
    Object.values(parents || {}).forEach((parent) => {
      if (parent.title) {
        const title = parent.title.trim();
        allTitles.set(title.toLowerCase(), {
          type: 'parent',
          id: parent.id,
          title,
        });
      }
    });

    // Sort titles by length (longest first) to match longest possible names first
    const sortedTitles = Array.from(allTitles.entries()).sort(
      (a, b) => b[0].length - a[0].length,
    );

    // Replace @nodeName with clickable links
    // Match @ followed by word characters and spaces, but stop at newlines or certain delimiters
    // Use a pattern that stops at newlines, punctuation, or whitespace followed by lowercase (new sentence)
    processed = processed.replace(
      /@([\w]+(?:\s+[\w]+)*?)(?=\s*\n|\s+[a-z]|$|@|\[|\(|\)|,|\.|;|:|!|\?|{|})/g,
      (match, name) => {
        const trimmedName = name.trim();
        if (!trimmedName) return match;

        // Try exact match first (case-insensitive)
        const found = allTitles.get(trimmedName.toLowerCase());

        if (found) {
          if (found.type === 'node') {
            return `[@${found.title}](node:${found.id})`;
          }
          return `[@${found.title}](parent:${found.id})`;
        }

        // Try to find the longest matching title that the mention starts with
        // This handles cases like "@My Node" matching "My Node Name"
        const nameLower = trimmedName.toLowerCase();
        const sortedTitlesArray = Array.from(sortedTitles);
        for (let i = 0; i < sortedTitlesArray.length; i += 1) {
          const [titleLower, item] = sortedTitlesArray[i];
          if (
            nameLower === titleLower ||
            nameLower.startsWith(`${titleLower} `)
          ) {
            if (item.type === 'node') {
              return `[@${item.title}](node:${item.id})`;
            }
            return `[@${item.title}](parent:${item.id})`;
          }
        }

        // Try reverse: see if any title starts with the mention
        for (let i = 0; i < sortedTitlesArray.length; i += 1) {
          const [titleLower, item] = sortedTitlesArray[i];
          if (titleLower.startsWith(nameLower)) {
            if (item.type === 'node') {
              return `[@${item.title}](node:${item.id})`;
            }
            return `[@${item.title}](parent:${item.id})`;
          }
        }

        return match; // Keep original if not found
      },
    );

    // Process wiki-style [[docName]] links
    processed = processed.replace(/\[\[([^\]]+)\]\]/g, (match, docName) => {
      return `[${docName}](doc:${docName})`;
    });

    return processed;
  };

  extractReferences = (content) => {
    const references = {
      nodes: [],
      parents: [],
      docs: [],
    };
    const { nodes, parents } = this.state;

    // Extract @ mentions
    const nodeMatches = content.match(/@(\w+)/g) || [];
    nodeMatches.forEach((match) => {
      const name = match.substring(1);
      const node = Object.values(nodes || {}).find((n) => n.title === name);
      const parent = Object.values(parents || {}).find((p) => p.title === name);

      if (node && !references.nodes.find((n) => n.id === node.id)) {
        references.nodes.push({ id: node.id, title: node.title });
      } else if (
        parent &&
        !references.parents.find((p) => p.id === parent.id)
      ) {
        references.parents.push({ id: parent.id, title: parent.title });
      }
    });

    // Extract wiki links
    const docMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    docMatches.forEach((match) => {
      const docName = match.substring(2, match.length - 2);
      if (!references.docs.find((d) => d === docName)) {
        references.docs.push(docName);
      }
    });

    return references;
  };

  getBacklinks = async (docPath) => {
    try {
      const { isGlobal } = this.state;
      const allDocs = await ipcRenderer.invoke(
        'docs:list',
        this.projectName,
        isGlobal,
      );
      const backlinks = [];

      // Flatten docs tree
      const flattenDocs = (items) => {
        const result = [];
        items.forEach((item) => {
          if (item.type === 'file') {
            result.push(item);
          }
          if (item.children) {
            result.push(...flattenDocs(item.children));
          }
        });
        return result;
      };

      const flatDocs = flattenDocs(allDocs);

      // Check each doc for references to current doc
      const docChecks = flatDocs
        .filter((doc) => doc.path !== docPath)
        .map(async (doc) => {
          try {
            const { isGlobal: isGlobalState } = this.state;
            const docData = await ipcRenderer.invoke(
              'docs:read',
              doc.path,
              this.projectName,
              isGlobalState,
            );
            const docName = docPath.replace('.md', '');

            // Check for wiki links
            if (
              docData.content.includes(`[[${docName}]]`) ||
              docData.content.includes(`[[${docPath}]]`)
            ) {
              return {
                path: doc.path,
                name: doc.name,
              };
            }
          } catch (err) {
            // Skip if can't read
          }
          return null;
        });

      const results = await Promise.all(docChecks);
      results.forEach((result) => {
        if (result) {
          backlinks.push(result);
        }
      });

      return backlinks;
    } catch (error) {
      console.error('Error getting backlinks:', error);
      return [];
    }
  };

  getMentionSuggestions = (query) => {
    const { nodes, parents } = this.state;
    const suggestions = [];

    // Add nodes with fuzzy matching
    Object.values(nodes || {}).forEach((node) => {
      if (node.title) {
        const match = this.fuzzyMatch(node.title, query);
        if (match.match) {
          suggestions.push({
            type: 'node',
            id: node.id,
            title: node.title,
            label: `@${node.title}`,
            score: match.score,
          });
        }
      }
    });

    // Add parents with fuzzy matching
    Object.values(parents || {}).forEach((parent) => {
      if (parent.title) {
        const match = this.fuzzyMatch(parent.title, query);
        if (match.match) {
          suggestions.push({
            type: 'parent',
            id: parent.id,
            title: parent.title,
            label: `@${parent.title}`,
            score: match.score,
          });
        }
      }
    });

    // Sort by score (highest first) and limit to 10
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 10);
  };

  handleImageUpload = async (file) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        const imageName = file.name;
        const { isGlobal } = this.state;

        await ipcRenderer.invoke(
          'docs:saveImage',
          imageName,
          base64,
          this.projectName,
          isGlobal,
        );

        message.success('Image uploaded');
        await this.loadImages();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      message.error('Failed to upload image');
    }
  };

  insertImageMarkdown = (imageName) => {
    const { isGlobal, docContent } = this.state;
    const imagePath = isGlobal
      ? `global/images/${imageName}`
      : `${this.projectName}/images/${imageName}`;

    const markdown = `![${imageName}](${imagePath})`;
    const newContent = `${docContent}\n${markdown}`;

    this.setState({
      docContent: newContent,
      isDirty: true,
      imageGalleryVisible: false,
    });
  };

  saveDoc = async () => {
    const { currentDoc, docContent, isGlobal } = this.state;
    if (!currentDoc) return;

    try {
      await ipcRenderer.invoke(
        'docs:save',
        currentDoc,
        docContent,
        this.projectName,
        isGlobal,
      );
      this.setState({ isDirty: false });
      message.success('Document saved');
      this.loadDocs(); // Refresh list
    } catch (error) {
      console.error('Error saving doc:', error);
      message.error('Failed to save document');
    }
  };

  createDoc = async (templateContent = null) => {
    const { newDocName, selectedTemplate } = this.state;
    if (!newDocName.trim()) {
      message.warning('Please enter a document name');
      return;
    }

    try {
      const docPath = newDocName.endsWith('.md')
        ? newDocName
        : `${newDocName}.md`;
      const initialContent =
        templateContent || selectedTemplate
          ? this.templates[selectedTemplate]?.content || `# ${newDocName}\n\n`
          : `# ${newDocName}\n\n`;

      const { isGlobal: isGlobalState } = this.state;
      await ipcRenderer.invoke(
        'docs:save',
        docPath,
        initialContent,
        this.projectName,
        isGlobalState,
      );

      this.setState({
        createDocModalVisible: false,
        newDocName: '',
        selectedTemplate: null,
        templateModalVisible: false,
      });

      message.success('Document created');
      await this.loadDocs();
      await this.loadDoc(docPath);
    } catch (error) {
      console.error('Error creating doc:', error);
      message.error('Failed to create document');
    }
  };

  handleTemplateSelect = (templateKey) => {
    this.setState({ selectedTemplate: templateKey });
  };

  createFolder = async () => {
    const { newFolderName } = this.state;
    if (!newFolderName.trim()) {
      message.warning('Please enter a folder name');
      return;
    }

    try {
      const { isGlobal: isGlobalState } = this.state;
      await ipcRenderer.invoke(
        'docs:createFolder',
        newFolderName,
        this.projectName,
        isGlobalState,
      );

      this.setState({
        createFolderModalVisible: false,
        newFolderName: '',
      });

      message.success('Folder created');
      await this.loadDocs();
    } catch (error) {
      console.error('Error creating folder:', error);
      message.error('Failed to create folder');
    }
  };

  deleteItem = async (item) => {
    try {
      const { isGlobal } = this.state;
      if (item.type === 'file') {
        await ipcRenderer.invoke(
          'docs:delete',
          item.path,
          this.projectName,
          isGlobal,
        );
        message.success('Document deleted');
      } else {
        // TODO: Implement folder deletion (recursive)
        message.info('Folder deletion not yet implemented');
      }

      this.setState({
        deleteConfirmVisible: false,
        itemToDelete: null,
      });

      const { currentDoc } = this.state;
      if (currentDoc === item.path) {
        this.setState({
          currentDoc: null,
          docContent: '',
          docMetadata: null,
        });
      }

      await this.loadDocs();
    } catch (error) {
      console.error('Error deleting item:', error);
      message.error('Failed to delete item');
    }
  };

  calculateReadingTime = (text) => {
    const words = this.countWords(text);
    const wordsPerMinute = 200;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  };

  handleContentChange = (value) => {
    // Check for @ mentions and show autocomplete
    // Match @ followed by optional characters at the end of the string
    const cursorMatch = value.match(/@([\w\s]*?)$/);
    if (cursorMatch) {
      const query = cursorMatch[1].trim();
      const suggestions = this.getMentionSuggestions(query) || [];
      this.setState({
        docContent: value,
        isDirty: true,
        mentionQuery: query,
        showMentionAutocomplete: suggestions.length > 0 && query.length >= 0, // Show even with empty query
        selectedMentionIndex: 0,
      });
    } else {
      this.setState({
        docContent: value,
        isDirty: true,
        showMentionAutocomplete: false,
        mentionQuery: '',
      });
    }
  };

  insertMention = (mention) => {
    const { docContent, mentionQuery } = this.state;
    // Find the last @ followed by the query and replace it with @mention.title
    // Use regex to find @query at the end of the string
    const regex = new RegExp(
      `@${mentionQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
    );
    const newContent = docContent.replace(regex, `@${mention.title} `);
    this.setState({
      docContent: newContent,
      isDirty: true,
      showMentionAutocomplete: false,
      mentionQuery: '',
      selectedMentionIndex: 0,
    });
  };

  renderMarkdownLink = ({ href, children }) => (
    <MarkdownLink
      href={href}
      projectName={this.projectName}
      onLoadDoc={this.loadDoc}
    >
      {children}
    </MarkdownLink>
  );

  toggleGlobal = async () => {
    this.setState(
      (prevState) => ({
        isGlobal: !prevState.isGlobal,
        currentDoc: null,
        docContent: '',
        docMetadata: null,
      }),
      () => {
        this.loadDocs();
      },
    );
  };

  buildTreeData = (items, parentKey = '') => {
    if (!items || !Array.isArray(items)) {
      return [];
    }
    return items.map((item, index) => {
      const key = parentKey ? `${parentKey}-${index}` : `${index}`;

      if (item.type === 'folder') {
        return {
          title: (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                <FolderOutlined style={{ marginRight: 8 }} />
                {item.name}
              </span>
            </div>
          ),
          key,
          isLeaf: false,
          children: this.buildTreeData(item.children || [], key),
          data: item,
        };
      }

      return {
        title: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              <FileOutlined style={{ marginRight: 8 }} />
              {item.name}
            </span>
          </div>
        ),
        key,
        isLeaf: true,
        data: item,
      };
    });
  };

  onSelect = (selectedKeys, info) => {
    if (info.node.isLeaf && info.node.data.type === 'file') {
      this.loadDoc(info.node.data.path);
      this.setState({ selectedKeys });
    }
  };

  render() {
    const {
      lokiLoaded,
      docs,
      currentDoc,
      docContent,
      isGlobal,
      sidebarCollapsed,
      searchText,
      selectedKeys,
      expandedKeys,
      createDocModalVisible,
      createFolderModalVisible,
      newDocName,
      newFolderName,
      editorMode,
      isDirty,
      docMetadata,
      showMetadata,
      selectedTemplate,
      imageGalleryVisible,
      images,
      showMentionAutocomplete,
      mentionQuery,
      selectedMentionIndex,
      showMentionHelper,
      nodes,
      parents,
      templateModalVisible,
      metadataManagerVisible,
    } = this.state;

    if (!lokiLoaded) {
      return (
        <LayoutWrapper>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Text>Loading...</Text>
          </div>
        </LayoutWrapper>
      );
    }

    const treeData = this.buildTreeData(docs || []);
    const filteredTreeData = searchText
      ? treeData.filter((item) => {
          const searchLower = searchText.toLowerCase();
          const searchInTree = (node) => {
            if (
              node.title?.props?.children?.[0]?.props?.children
                ?.toLowerCase()
                .includes(searchLower)
            ) {
              return true;
            }
            if (node.children) {
              return node.children.some(searchInTree);
            }
            return false;
          };
          return searchInTree(item);
        })
      : treeData;

    return (
      <LayoutWrapper>
        <Layout style={{ height: 'calc(100vh - 64px)' }}>
          <Sider
            width={300}
            collapsible
            collapsed={sidebarCollapsed}
            onCollapse={(collapsed) =>
              this.setState((prevState) => ({
                ...prevState,
                sidebarCollapsed: collapsed,
              }))
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
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Title level={5} style={{ margin: 0 }}>
                    {isGlobal ? 'Global' : 'Project'} Docs
                  </Title>
                  <Tooltip
                    title={isGlobal ? 'Switch to Project' : 'Switch to Global'}
                  >
                    <Button
                      type={isGlobal ? 'primary' : 'default'}
                      icon={isGlobal ? <GlobalOutlined /> : <ProjectOutlined />}
                      size="small"
                      onClick={this.toggleGlobal}
                    />
                  </Tooltip>
                </div>

                <Input
                  placeholder="Search documents..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) =>
                    this.setState((prevState) => ({
                      ...prevState,
                      searchText: e.target.value,
                    }))
                  }
                  allowClear
                />

                <Space>
                  <Button
                    type="dashed"
                    icon={<FileAddOutlined />}
                    size="small"
                    onClick={() =>
                      this.setState({
                        templateModalVisible: true,
                        createDocModalVisible: false,
                      })
                    }
                    block
                  >
                    New Doc
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
                treeData={filteredTreeData}
                selectedKeys={selectedKeys}
                expandedKeys={expandedKeys}
                onSelect={this.onSelect}
                onExpand={(keys) => this.setState({ expandedKeys: keys })}
                showIcon
                blockNode
              />
            </div>
          </Sider>

          <Content
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
            }}
          >
            {currentDoc ? (
              <>
                <div
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Space>
                    <Text strong>{currentDoc}</Text>
                    {isDirty && <Badge status="processing" text="Unsaved" />}
                  </Space>
                  <Space>
                    <Button.Group>
                      <Button
                        type={editorMode === 'edit' ? 'primary' : 'default'}
                        onClick={() => this.setState({ editorMode: 'edit' })}
                      >
                        Edit
                      </Button>
                      <Button
                        type={editorMode === 'split' ? 'primary' : 'default'}
                        onClick={() => this.setState({ editorMode: 'split' })}
                      >
                        Split
                      </Button>
                      <Button
                        type={editorMode === 'preview' ? 'primary' : 'default'}
                        onClick={() => this.setState({ editorMode: 'preview' })}
                      >
                        Preview
                      </Button>
                    </Button.Group>
                    <Button
                      icon={<PictureOutlined />}
                      onClick={() =>
                        this.setState({ imageGalleryVisible: true })
                      }
                    >
                      Images
                    </Button>
                    <Button
                      icon={<TagsOutlined />}
                      onClick={() =>
                        this.setState({ metadataManagerVisible: true })
                      }
                    >
                      Metadata
                    </Button>
                    <Button
                      icon={<InfoCircleOutlined />}
                      onClick={() =>
                        this.setState({ showMetadata: !showMetadata })
                      }
                    >
                      Info
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={this.saveDoc}
                      disabled={!isDirty}
                    >
                      Save
                    </Button>
                    <Popconfirm
                      title="Are you sure you want to delete this document?"
                      onConfirm={() =>
                        this.deleteItem({ type: 'file', path: currentDoc })
                      }
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  {showMetadata && docMetadata && (
                    <div
                      style={{
                        width: '300px',
                        borderRight: '1px solid #f0f0f0',
                        padding: '16px',
                        overflow: 'auto',
                      }}
                    >
                      <Title level={5}>Document Info</Title>
                      <Space
                        direction="vertical"
                        style={{ width: '100%' }}
                        size="middle"
                      >
                        <div>
                          <Text type="secondary">Word Count</Text>
                          <div>
                            <Text strong>{docMetadata.wordCount}</Text>
                          </div>
                        </div>
                        <div>
                          <Text type="secondary">Reading Time</Text>
                          <div>
                            <Text strong>{docMetadata.readingTime} min</Text>
                          </div>
                        </div>
                        <div>
                          <Text type="secondary">Created</Text>
                          <div>
                            <Text>
                              {new Date(docMetadata.created).toLocaleString()}
                            </Text>
                          </div>
                        </div>
                        <div>
                          <Text type="secondary">Modified</Text>
                          <div>
                            <Text>
                              {new Date(docMetadata.modified).toLocaleString()}
                            </Text>
                          </div>
                        </div>
                        <div>
                          <Text type="secondary">Size</Text>
                          <div>
                            <Text>
                              {(docMetadata.size / 1024).toFixed(2)} KB
                            </Text>
                          </div>
                        </div>

                        {docMetadata.references && (
                          <>
                            <Divider style={{ margin: '8px 0' }} />
                            <div>
                              <Text strong>References</Text>
                              {docMetadata.references.nodes &&
                                docMetadata.references.nodes.length > 0 && (
                                  <div style={{ marginTop: '8px' }}>
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: '12px' }}
                                    >
                                      Nodes:
                                    </Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {docMetadata.references.nodes.map(
                                        (node) => (
                                          <Tag
                                            key={node.id}
                                            color="blue"
                                            style={{
                                              marginBottom: '4px',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            @{node.title}
                                          </Tag>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              {docMetadata.references.parents &&
                                docMetadata.references.parents.length > 0 && (
                                  <div style={{ marginTop: '8px' }}>
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: '12px' }}
                                    >
                                      Parents:
                                    </Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {docMetadata.references.parents.map(
                                        (parent) => (
                                          <Tag
                                            key={parent.id}
                                            color="green"
                                            style={{
                                              marginBottom: '4px',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            @{parent.title}
                                          </Tag>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              {docMetadata.references.docs &&
                                docMetadata.references.docs.length > 0 && (
                                  <div style={{ marginTop: '8px' }}>
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: '12px' }}
                                    >
                                      Docs:
                                    </Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {docMetadata.references.docs.map(
                                        (doc) => (
                                          <Tag
                                            key={doc}
                                            color="purple"
                                            style={{
                                              marginBottom: '4px',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            [[{doc}]]
                                          </Tag>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </>
                        )}

                        {docMetadata.backlinks &&
                          docMetadata.backlinks.length > 0 && (
                            <>
                              <Divider style={{ margin: '8px 0' }} />
                              <div>
                                <Text strong>Backlinks</Text>
                                <div style={{ marginTop: '8px' }}>
                                  {docMetadata.backlinks.map((link) => (
                                    <div
                                      key={link.path}
                                      style={{ marginBottom: '4px' }}
                                    >
                                      <Button
                                        type="link"
                                        size="small"
                                        icon={<LinkOutlined />}
                                        onClick={() => this.loadDoc(link.path)}
                                        style={{ padding: 0, height: 'auto' }}
                                      >
                                        {link.name}
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                      </Space>
                    </div>
                  )}

                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: editorMode === 'split' ? 'row' : 'column',
                      overflow: 'hidden',
                    }}
                  >
                    {(editorMode === 'edit' || editorMode === 'split') && (
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            overflow: 'auto',
                            borderRight:
                              editorMode === 'split'
                                ? '1px solid #f0f0f0'
                                : 'none',
                          }}
                        >
                          <MDEditor
                            value={docContent}
                            onChange={this.handleContentChange}
                            height="100%"
                            preview="edit"
                          />
                        </div>
                        {showMentionAutocomplete && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '60px',
                              left: '16px',
                              right: editorMode === 'split' ? '50%' : '16px',
                              background: '#fff',
                              border: '1px solid #d9d9d9',
                              borderRadius: '4px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              zIndex: 1000,
                              maxHeight: '200px',
                              overflow: 'auto',
                            }}
                          >
                            <List
                              size="small"
                              dataSource={this.getMentionSuggestions(
                                mentionQuery,
                              )}
                              renderItem={(item, index) => (
                                <List.Item
                                  style={{
                                    cursor: 'pointer',
                                    background:
                                      index === selectedMentionIndex
                                        ? '#e6f7ff'
                                        : 'transparent',
                                    padding: '8px 12px',
                                  }}
                                  onClick={() => this.insertMention(item)}
                                  onMouseEnter={() => {
                                    this.setState({
                                      selectedMentionIndex: index,
                                    });
                                  }}
                                >
                                  <Space>
                                    <Tag
                                      color={
                                        item.type === 'node' ? 'blue' : 'green'
                                      }
                                    >
                                      {item.type === 'node' ? 'Node' : 'Parent'}
                                    </Tag>
                                    <Text>{item.title}</Text>
                                  </Space>
                                </List.Item>
                              )}
                            />
                          </div>
                        )}
                        <div
                          style={{
                            padding: '8px 12px',
                            background: '#f5f5f5',
                            borderTop: '1px solid #e8e8e8',
                            fontSize: '12px',
                          }}
                        >
                          <Space size="small">
                            <Text type="secondary">Tip: Use</Text>
                            <Tag color="blue">@nodeName</Tag>
                            <Text type="secondary">
                              to mention nodes/parents, or
                            </Text>
                            <Tag color="purple">[[docName]]</Tag>
                            <Text type="secondary">for wiki links</Text>
                            <Button
                              type="link"
                              size="small"
                              onClick={() =>
                                this.setState((prevState) => ({
                                  showMentionHelper:
                                    !prevState.showMentionHelper,
                                }))
                              }
                            >
                              {showMentionHelper ? 'Hide' : 'Show'} suggestions
                            </Button>
                          </Space>
                        </div>
                        {showMentionHelper && (
                          <div
                            style={{
                              padding: '12px',
                              background: '#fff',
                              borderTop: '1px solid #e8e8e8',
                              maxHeight: '200px',
                              overflow: 'auto',
                            }}
                          >
                            <Space
                              direction="vertical"
                              style={{ width: '100%' }}
                              size="small"
                            >
                              <div>
                                <Text strong style={{ fontSize: '12px' }}>
                                  Available Nodes:
                                </Text>
                                <div
                                  style={{
                                    marginTop: '4px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '4px',
                                  }}
                                >
                                  {Object.values(nodes || {})
                                    .slice(0, 20)
                                    .map((node) => (
                                      <Tag
                                        key={node.id}
                                        color="blue"
                                        style={{
                                          cursor: 'pointer',
                                          fontSize: '11px',
                                        }}
                                        onClick={() => {
                                          const { docContent: currentContent } =
                                            this.state;
                                          const separator =
                                            currentContent.endsWith(' ')
                                              ? ''
                                              : ' ';
                                          const newContent = `${currentContent}${separator}@${node.title} `;
                                          this.setState({
                                            docContent: newContent,
                                            isDirty: true,
                                          });
                                        }}
                                      >
                                        @{node.title}
                                      </Tag>
                                    ))}
                                </div>
                              </div>
                              <div>
                                <Text strong style={{ fontSize: '12px' }}>
                                  Available Parents:
                                </Text>
                                <div
                                  style={{
                                    marginTop: '4px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '4px',
                                  }}
                                >
                                  {Object.values(parents || {})
                                    .slice(0, 20)
                                    .map((parent) => (
                                      <Tag
                                        key={parent.id}
                                        color="green"
                                        style={{
                                          cursor: 'pointer',
                                          fontSize: '11px',
                                        }}
                                        onClick={() => {
                                          const { docContent: currentContent } =
                                            this.state;
                                          const separator =
                                            currentContent.endsWith(' ')
                                              ? ''
                                              : ' ';
                                          const newContent = `${currentContent}${separator}@${parent.title} `;
                                          this.setState({
                                            docContent: newContent,
                                            isDirty: true,
                                          });
                                        }}
                                      >
                                        @{parent.title}
                                      </Tag>
                                    ))}
                                </div>
                              </div>
                            </Space>
                          </div>
                        )}
                      </div>
                    )}
                    {(editorMode === 'preview' || editorMode === 'split') && (
                      <div
                        style={{ flex: 1, overflow: 'auto', padding: '16px' }}
                      >
                        <MDEditor.Markdown
                          source={this.processMarkdownLinks(docContent)}
                          components={{
                            a: this.renderMarkdownLink,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{ padding: '40px', textAlign: 'center', color: '#999' }}
              >
                <FileOutlined
                  style={{ fontSize: '48px', marginBottom: '16px' }}
                />
                <div>Select a document to edit, or create a new one</div>
              </div>
            )}
          </Content>
        </Layout>

        {/* Template Selection Modal */}
        <Modal
          title="Choose Template"
          visible={templateModalVisible && !createDocModalVisible}
          onOk={() =>
            this.setState({
              templateModalVisible: false,
              createDocModalVisible: true,
            })
          }
          onCancel={() =>
            this.setState({
              templateModalVisible: false,
              selectedTemplate: null,
            })
          }
          okText="Next"
          cancelText="Cancel"
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {Object.entries(this.templates).map(([key, template]) => (
              <Card
                key={key}
                hoverable
                onClick={() => this.handleTemplateSelect(key)}
                style={{
                  border:
                    selectedTemplate === key
                      ? '2px solid #1890ff'
                      : '1px solid #d9d9d9',
                  cursor: 'pointer',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleTemplateSelect(key);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Select template ${template.name}`}
              >
                <Text strong>{template.name}</Text>
              </Card>
            ))}
          </Space>
        </Modal>

        {/* Create Document Modal */}
        <Modal
          title={`Create New Document${selectedTemplate ? ` - ${this.templates[selectedTemplate]?.name || ''}` : ''}`}
          visible={createDocModalVisible}
          onOk={() => this.createDoc()}
          onCancel={() =>
            this.setState({
              createDocModalVisible: false,
              newDocName: '',
              selectedTemplate: null,
            })
          }
          okText="Create"
          cancelText="Cancel"
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text type="secondary">
                Document name (without .md extension)
              </Text>
              <Input
                placeholder="Document name"
                value={newDocName}
                onChange={(e) => this.setState({ newDocName: e.target.value })}
                onPressEnter={() => this.createDoc()}
                autoFocus
                style={{ marginTop: '8px' }}
              />
            </div>
            {selectedTemplate && (
              <div>
                <Text type="secondary">
                  Template: {this.templates[selectedTemplate]?.name}
                </Text>
                <Button
                  type="link"
                  size="small"
                  onClick={() =>
                    this.setState({
                      templateModalVisible: true,
                      createDocModalVisible: false,
                    })
                  }
                >
                  Change template
                </Button>
              </div>
            )}
          </Space>
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
          okText="Create"
          cancelText="Cancel"
        >
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => this.setState({ newFolderName: e.target.value })}
            onPressEnter={this.createFolder}
            autoFocus
          />
        </Modal>

        {/* Image Gallery Modal */}
        <Modal
          title="Image Gallery"
          visible={imageGalleryVisible}
          onCancel={() => this.setState({ imageGalleryVisible: false })}
          footer={[
            <Button
              key="upload"
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => {
                const input = document.querySelector('input[type="file"]');
                if (input) input.click();
              }}
            >
              Upload Image
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files[0]) {
                    this.handleImageUpload(e.target.files[0]);
                  }
                }}
              />
            </Button>,
            <Button
              key="close"
              onClick={() => this.setState({ imageGalleryVisible: false })}
            >
              Close
            </Button>,
          ]}
          width={800}
        >
          {!images || images.length === 0 ? (
            <div
              style={{ textAlign: 'center', padding: '40px', color: '#999' }}
            >
              <PictureOutlined
                style={{ fontSize: '48px', marginBottom: '16px' }}
              />
              <div>No images yet. Upload one to get started.</div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '16px',
              }}
            >
              {images.map((image) => {
                const { isGlobal: isGlobalState } = this.state;
                return (
                  <Card
                    key={image.path}
                    hoverable
                    cover={
                      <ImageThumbnail
                        image={image}
                        projectName={this.projectName}
                        isGlobal={isGlobalState}
                      />
                    }
                    actions={[
                      <EyeOutlined
                        key="view"
                        onClick={() => {
                          window.open(`file://${image.fullPath}`, '_blank');
                        }}
                      />,
                      <EditOutlined
                        key="insert"
                        onClick={() => this.insertImageMarkdown(image.name)}
                      />,
                      <DeleteOutlined
                        key="delete"
                        onClick={() => {
                          Modal.confirm({
                            title: 'Delete Image',
                            content: `Are you sure you want to delete ${image.name}?`,
                            onOk: async () => {
                              try {
                                const { isGlobal: currentIsGlobal } =
                                  this.state;
                                await ipcRenderer.invoke(
                                  'docs:deleteImage',
                                  image.path,
                                  this.projectName,
                                  currentIsGlobal,
                                );
                                message.success('Image deleted');
                                await this.loadImages();
                              } catch (error) {
                                message.error('Failed to delete image');
                              }
                            },
                          });
                        }}
                      />,
                    ]}
                  >
                    <Card.Meta
                      title={
                        <Text ellipsis style={{ fontSize: '12px' }}>
                          {image.name}
                        </Text>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {image.size ? (image.size / 1024).toFixed(1) : '0'} KB
                        </Text>
                      }
                    />
                  </Card>
                );
              })}
            </div>
          )}
        </Modal>

        {/* Metadata Manager Modal */}
        <MetadataManager
          visible={metadataManagerVisible}
          isGlobal={isGlobal}
          projectName={this.projectName}
          onClose={() => {
            this.setState({ metadataManagerVisible: false });
          }}
        />
      </LayoutWrapper>
    );
  }
}

export default DocsPage;
