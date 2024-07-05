import React from 'react';
import { Button, Dropdown, Menu, Popconfirm } from 'antd';
import PropTypes from 'prop-types';

const { Item } = Menu;

function Content(props) {
  const { deleteParent, parent } = props;
  return (
    <Menu>
      <Item key="0">
        <Popconfirm
          title="Are you sure delete this parent?"
          onConfirm={() => deleteParent(parent)}
          onCancel={() => {}}
          okText="Yes"
          cancelText="No"
        >
          <Button style={{ border: 'none', width: '100%' }}>
            Delete Parent
          </Button>
        </Popconfirm>
      </Item>
    </Menu>
  );
}

Content.propTypes = {
  deleteParent: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parent: PropTypes.object.isRequired,
};

export default function ParentQuickActions(props) {
  const { button, deleteParent, parent } = props;

  return (
    <div>
      <Dropdown
        overlay={<Content parent={parent} deleteParent={deleteParent} />}
      >
        {button}
      </Dropdown>
    </div>
  );
}

ParentQuickActions.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  button: PropTypes.any.isRequired,
  deleteParent: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parent: PropTypes.object.isRequired,
};
