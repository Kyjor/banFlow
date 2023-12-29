import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Button, List, Popconfirm, Typography } from 'antd';
import '../ProjectListContainer.scss';
import { CaretRightOutlined, DeleteTwoTone } from '@ant-design/icons';

const { Paragraph } = Typography;

const ProjectList = (props) => {
  const [items, setItems] = useState([]);

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

  const onChange = (lastStr, currentStr) => {
    props.renameProject(lastStr, currentStr);
  };
  useEffect(() => {
    if (!props.items) return;
    const items = props.items
      .filter((item) => {
        return item.text != '.json' && !item.text.includes('.json~');
      })
      .map(createTasks);
    setItems(items);
  }, [props.items]);

  return (
    <List
      itemLayout="vertical"
      size="large"
      dataSource={items}
      pagination={{
        pageSize: 3,
      }}
      renderItem={(item) => (
        <List.Item key={item.name}>
          <List.Item.Meta title={item.jsx} />
          <Link to={`/projectPage/${item.name}`}>
            <Button
              type="text"
              icon={
                <CaretRightOutlined
                  style={{ fontSize: '16px', color: 'green' }}
                />
              }
            />
          </Link>
          <Popconfirm
            title="Are you sure delete this project?"
            onConfirm={() => props.deleteProject(item.name)}
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
        </List.Item>
      )}
    />
  );
};

ProjectList.propTypes = {
  deleteProject: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object])).isRequired,
  renameProject: PropTypes.func.isRequired,
};

export default ProjectList;
