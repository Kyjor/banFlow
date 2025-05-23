/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Card, List, Popconfirm, Typography } from 'antd';
import '../ProjectListContainer.scss';
import { CalendarOutlined, DeleteTwoTone } from '@ant-design/icons';
import dateFormat from 'dateformat';

const { Paragraph } = Typography;

function ProjectList(props) {
  const { items } = props;
  const [listItemsWithoutFileExtension, setListItems] = useState([]);

  const onChange = (lastStr, currentStr) => {
    const { renameProject } = props;
    renameProject(lastStr, currentStr);
  };

  const createTasks = (item) => {
    const projectName = item.text.includes('.json')
      ? item.text.slice(0, item.text.indexOf('.'))
      : item.text;
    const lastOpened = localStorage.getItem(`projectLastOpened_${projectName}`);
    const lastOpenedFormatted = lastOpened ? dateFormat(new Date(parseInt(lastOpened, 10)), "mmm d, yyyy h:MM TT") : 'Never';
    const listItem = {
      jsx: (
        <Paragraph
          key={item.key}
          editable={{ onChange: (str) => onChange(projectName, str) }}
        >
          {projectName}
        </Paragraph>
      ),
      name: projectName,
      lastOpened: lastOpenedFormatted
    };

    return listItem;
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    if (!listItemsWithoutFileExtension) return;
    const items1 = items
      .filter((item) => {
        return item.text !== '.json' && !item.text.includes('.json~');
      })
      .map(createTasks)
      .sort((a, b) => {
        const dateA = a.lastOpened === 'Never' ? 0 : new Date(a.lastOpened).getTime();
        const dateB = b.lastOpened === 'Never' ? 0 : new Date(b.lastOpened).getTime();
        return dateB - dateA; // Sort in descending order (newest first)
      });
    setListItems(items1);
  }, [items]);

  const { deleteProject, openProjectDetails } = props;

  return (
    <List
      itemLayout="vertical"
      size="large"
      dataSource={listItemsWithoutFileExtension}
      bordered
      pagination={{
        pageSize: 5,
      }}
      renderItem={(item) => (
        <List.Item key={item.name}>
          <Card title={item.jsx} hoverable style={{ borderRadius: `20px` }}>
            <div style={{ marginBottom: '10px', color: '#666' }}>
              Last opened: {item.lastOpened}
            </div>
            <Button
              type="text"
              icon={
                <CalendarOutlined
                  onClick={() => {
                    localStorage.setItem(`projectLastOpened_${item.name}`, Date.now().toString());
                    openProjectDetails(item.name);
                  }}
                />
              }
            />
            <Popconfirm
              title="Are you sure delete this project?"
              onConfirm={() => deleteProject(item.name)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                icon={
                  <DeleteTwoTone
                    twoToneColor="#eb2f96"
                    style={{ fontSize: '16px' }}
                  />
                }
              />
            </Popconfirm>
          </Card>
        </List.Item>
      )}
    />
  );
}

ProjectList.propTypes = {
  deleteProject: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object])).isRequired,
  renameProject: PropTypes.func.isRequired,
  openProjectDetails: PropTypes.func.isRequired,
};

export default ProjectList;
