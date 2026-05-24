import React from 'react';
import { Button, Dropdown, Popconfirm } from 'antd';
import PropTypes from 'prop-types';

export default function NodeQuickActions({ button, deleteNode, node }) {
  const menu = {
    items: [
      {
        key: 'delete',
        label: (
          <Popconfirm
            title="Are you sure delete this node?"
            onConfirm={() => deleteNode(node.id, node.parent)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" block style={{ border: 'none', width: '100%' }}>
              Delete Node
            </Button>
          </Popconfirm>
        ),
      },
    ],
  };

  return (
    <div>
      <Dropdown menu={menu} trigger={['click']}>
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
