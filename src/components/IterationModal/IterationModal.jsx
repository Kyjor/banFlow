import React, { useCallback } from 'react';
import {
  Button,
  DatePicker,
  message,
  Modal,
  Popconfirm,
  Select,
  Tabs,
  TimePicker,
} from 'antd';
import PropTypes from 'prop-types';

function IterationModal({
  deleteIteration,
  handleCancel,
  handleOk,
  iteration,
  updateIterationProperty,
}) {
  // eslint-disable-next-line class-methods-use-this
  const handleCancelDelete = () => {
    message.error('Iteration not deleted');
  };

  const handleConfirmDelete = () => {
    deleteIteration(iteration.id);
  };

  if (!iteration) {
    return null;
  }

  return (
    <Modal
      footer={[
        <Button key="back" onClick={handleCancel}>
          Cancel
        </Button>,
      ]}
      onCancel={handleCancel}
      title={
        <div style={{ display: 'flex', marginBottom: '15px' }}>
          <span style={{ marginTop: '5px' }}>{iteration.title}:</span>
        </div>
      }
      visible
    >
      <span>{iteration.startDate}</span>
      <span>{iteration.endDate}</span>
      <span>{iteration.description}</span>
      <Popconfirm
        title="Are you sure delete this iteration?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        okText="Yes"
        cancelText="No"
      >
        <Button>Delete</Button>
      </Popconfirm>
    </Modal>
  );
}

export default IterationModal;

IterationModal.propTypes = {
  deleteIteration: PropTypes.func.isRequired,
  handleCancel: PropTypes.func.isRequired,
  handleOk: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types,react/require-default-props
  iteration: PropTypes.object.isRequired,
  updateIterationProperty: PropTypes.func.isRequired,
};
