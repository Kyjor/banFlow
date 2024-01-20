import React from 'react';
import { Button, Dropdown, Menu, Popconfirm } from 'antd';
import PropTypes from 'prop-types';

const { Item } = Menu;

function Content(props) {
  const { deleteNode, node } = props;
  return (
    <Menu>
      <Item key="0">
        <Popconfirm
          title="Are you sure delete this node?"
          onConfirm={() => deleteNode(node.id, node.parent)}
          onCancel={() => console.log('confirm')}
          okText="Yes"
          cancelText="No"
        >
          <Button style={{ border: 'none', width: '100%' }}>Delete Node</Button>
        </Popconfirm>
      </Item>
      <Item key="1">Archive Node (Coming soon)</Item>
      <Item key="2">Duplicate Node(Coming soon)</Item>
      <Item key="3">Attach File(Coming soon)</Item>
    </Menu>
  );
}

Content.propTypes = {
  deleteNode: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
};

export default function NodeQuickActions(props) {
  const { button, deleteNode, node } = props;

  return (
    <div>
      <Dropdown overlay={<Content node={node} deleteNode={deleteNode} />}>
        {button}
      </Dropdown>
    </div>
  );
}

NodeQuickActions.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  button: PropTypes.any.isRequired,
  deleteNode: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
};
