import React from 'react';
import { Checkbox, Card, Space, Typography, Button, Input } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import PropTypes from 'prop-types';
import './ProjectSelector.scss';

const { Title, Text } = Typography;

function ProjectSelector({
  availableProjects,
  selectedProjects,
  onSelectionChange,
  onSelectAll,
  onDeselectAll,
}) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredProjects = availableProjects.filter((project) =>
    project.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggle = (projectName) => {
    const newSelection = selectedProjects.includes(projectName)
      ? selectedProjects.filter((p) => p !== projectName)
      : [...selectedProjects, projectName];
    onSelectionChange(newSelection);
  };

  return (
    <Card
      className="project-selector-card"
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            Select Projects
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ({selectedProjects.length} selected)
          </Text>
        </Space>
      }
      extra={
        <Space>
          <Button size="small" icon={<CheckOutlined />} onClick={onSelectAll}>
            Select All
          </Button>
          <Button size="small" icon={<CloseOutlined />} onClick={onDeselectAll}>
            Clear
          </Button>
        </Space>
      }
    >
      <Input
        placeholder="Search projects..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: '12px' }}
        allowClear
      />

      <div className="project-selector-list">
        {filteredProjects.length === 0 ? (
          <Text
            type="secondary"
            style={{ display: 'block', textAlign: 'center', padding: '20px' }}
          >
            {searchQuery ? 'No projects found' : 'No projects available'}
          </Text>
        ) : (
          filteredProjects.map((projectName) => (
            <div key={projectName} className="project-selector-item">
              <Checkbox
                checked={selectedProjects.includes(projectName)}
                onChange={() => handleToggle(projectName)}
              >
                <Text>{projectName}</Text>
              </Checkbox>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

ProjectSelector.propTypes = {
  availableProjects: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedProjects: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelectionChange: PropTypes.func.isRequired,
  onSelectAll: PropTypes.func.isRequired,
  onDeselectAll: PropTypes.func.isRequired,
};

export default ProjectSelector;
