import React from 'react';
import { Button, Dropdown, Popconfirm } from 'antd';
import PropTypes from 'prop-types';

export default function ParentQuickActions({
  button,
  deleteParent,
  parent,
  showParentModal = () => {},
}) {
  const menu = {
    items: [
      {
        key: 'edit',
        label: (
          <Button
            type="text"
            block
            style={{ border: 'none', width: '100%' }}
            onClick={() => showParentModal(parent)}
          >
            Edit Parent
          </Button>
        ),
      },
      {
        key: 'delete',
        label: (
          <Popconfirm
            title="Are you sure delete this parent?"
            onConfirm={() => deleteParent(parent)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" block style={{ border: 'none', width: '100%' }}>
              Delete Parent
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

ParentQuickActions.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  button: PropTypes.any.isRequired,
  deleteParent: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parent: PropTypes.object.isRequired,
  showParentModal: PropTypes.func,
};
