/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Card, List, Popconfirm, Typography, Empty, Tag, Space } from 'antd';
import '../ProjectListContainer.scss';
import {
  CalendarOutlined,
  DeleteTwoTone,
  FolderOutlined,
  EditOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dateFormat from 'dateformat';

const { Paragraph, Text } = Typography;

// Generate a color based on project name for consistent icon colors
const getProjectColor = (name) => {
  const colors = [
    '#1890ff', // Blue
    '#52c41a', // Green
    '#faad14', // Orange
    '#f5222d', // Red
    '#722ed1', // Purple
    '#13c2c2', // Cyan
    '#eb2f96', // Pink
    '#fa8c16', // Orange
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Format time ago
const getTimeAgo = (timestamp) => {
  if (!timestamp) return 'Never';
  const date = new Date(parseInt(timestamp, 10));
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return dateFormat(date, "mmm d, yyyy");
};

function ProjectList(props) {
  const { items, selectedProject } = props;
  const [listItemsWithoutFileExtension, setListItems] = useState([]);

  const onChange = (lastStr, currentStr) => {
    const { renameProject } = props;
    if (currentStr && currentStr.trim() && currentStr !== lastStr) {
      renameProject(lastStr, currentStr.trim());
    }
  };

  const createTasks = (item) => {
    // Only process files ending with .json
    if (!item.text.endsWith('.json') || item.text.endsWith('.json~')) {
      return null;
    }
    
    // Extract project name (remove .json extension)
    const projectName = item.text.slice(0, item.text.lastIndexOf('.json'));
    
    // Skip items with empty or invalid project names
    if (!projectName || !projectName.trim()) {
      return null;
    }
    
    const trimmedName = projectName.trim();
    const lowerName = trimmedName.toLowerCase();
    
    // Filter out system files
    const systemFiles = ['.ds_store', 'thumbs.db', '.gitignore', '.gitkeep'];
    if (systemFiles.includes(lowerName)) {
      return null;
    }
    
    const lastOpened = localStorage.getItem(`projectLastOpened_${trimmedName}`);
    const lastOpenedFormatted = lastOpened
      ? dateFormat(new Date(parseInt(lastOpened, 10)), "mmm d, yyyy h:MM TT")
      : null;
    const timeAgo = getTimeAgo(lastOpened);
    const projectColor = getProjectColor(trimmedName);

    const listItem = {
      name: trimmedName,
      lastOpened: lastOpenedFormatted,
      timeAgo,
      color: projectColor,
      key: trimmedName, // Use project name as key for proper deduplication
    };

    return listItem;
  };

  useEffect(() => {
    const items1 = items
      .map(createTasks)
      .filter((item) => item !== null && item.name); // Remove null items and items without names
    
    // Deduplicate by project name (case-insensitive)
    const uniqueItemsMap = new Map();
    items1.forEach((item) => {
      if (item && item.name) {
        const lowerName = item.name.toLowerCase();
        // Keep first occurrence of each project name
        if (!uniqueItemsMap.has(lowerName)) {
          uniqueItemsMap.set(lowerName, item);
        }
      }
    });
    
    setListItems(Array.from(uniqueItemsMap.values()));
  }, [items]);

  const { deleteProject, openProjectDetails } = props;

  if (listItemsWithoutFileExtension.length === 0) {
    return (
      <div className="project-list-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                No projects yet
              </Text>
              <Text type="secondary">
                Create your first project using the form above to get started!
              </Text>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="project-list-wrapper">
      <List
        itemLayout="vertical"
        size="large"
        dataSource={listItemsWithoutFileExtension}
        pagination={{
          pageSize: 8,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} project${total > 1 ? 's' : ''}`,
        }}
        renderItem={(item) => {
          // Normalize comparison - case-insensitive and trimmed
          const normalizedSelected = selectedProject ? selectedProject.trim().toLowerCase() : '';
          const normalizedItemName = item.name ? item.name.trim().toLowerCase() : '';
          const isSelected = normalizedSelected && normalizedItemName && 
            normalizedSelected === normalizedItemName;
          
          return (
            <List.Item key={`project-${item.name}`} className="project-list-item">
              <Card
                className={`project-card ${isSelected ? 'project-card-selected' : ''}`}
                hoverable
                onClick={() => {
                  localStorage.setItem(`projectLastOpened_${item.name}`, Date.now().toString());
                  openProjectDetails(item.name);
                }}
              actions={[
                <Button
                  key="edit"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  title="Rename project"
                />,
                <Popconfirm
                  key="delete"
                  title="Delete this project?"
                  description="This action cannot be undone."
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    deleteProject(item.name);
                  }}
                  onCancel={(e) => {
                    e?.stopPropagation();
                  }}
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    title="Delete project"
                  />
                </Popconfirm>,
              ]}
            >
              <div className="project-card-content">
                <div className="project-card-header">
                  <div
                    className="project-icon"
                    style={{
                      backgroundColor: `${item.color}15`,
                      color: item.color,
                    }}
                  >
                    <FolderOutlined style={{ fontSize: '24px' }} />
                  </div>
                  <div className="project-title-wrapper">
                    <Paragraph
                      className="project-title"
                      editable={{
                        onChange: (str) => onChange(item.name, str),
                        tooltip: 'Click to edit',
                        triggerType: ['icon'],
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {item.name}
                    </Paragraph>
                  </div>
                </div>
                <div className="project-card-meta">
                  <Space size="small" wrap>
                    <Tag icon={<ClockCircleOutlined />} color="default">
                      {item.timeAgo}
                    </Tag>
                    {item.lastOpened && (
                      <Tag icon={<CalendarOutlined />} color="default">
                        {item.lastOpened}
                      </Tag>
                    )}
                  </Space>
                </div>
              </div>
            </Card>
          </List.Item>
          );
        }}
      />
    </div>
  );
}

ProjectList.propTypes = {
  deleteProject: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object])).isRequired,
  renameProject: PropTypes.func.isRequired,
  openProjectDetails: PropTypes.func.isRequired,
  selectedProject: PropTypes.string,
};

export default ProjectList;
