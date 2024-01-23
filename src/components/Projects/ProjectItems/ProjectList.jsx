import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Button, Card, List, Popconfirm, Typography } from 'antd';
import '../ProjectListContainer.scss';
import {
  CalendarOutlined,
  DeleteTwoTone,
  InfoCircleOutlined,
} from '@ant-design/icons';

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
      .map(createTasks);
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
        pageSize: 3,
      }}
      renderItem={(item) => (
        <List.Item key={item.name}>
          <Card title={item.jsx} hoverable>
            <Button
              type="text"
              icon={
                <CalendarOutlined
                  onClick={() => openProjectDetails(item.name)}
                />
              }
            />
            <Link to={`/projectPage/${item.name}`}>
              <Button
                type="text"
                icon={
                  <InfoCircleOutlined
                    style={{ fontSize: '16px', color: 'green' }}
                  />
                }
              />
            </Link>
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
