import React, { useCallback } from 'react';
import { Button, DatePicker, Modal, Select, Tabs, TimePicker } from 'antd';
import PropTypes from 'prop-types';

function IterationModal({
  handleCancel,
  handleOk,
  iteration,
  updateIterationProperty,
}) {
  const test = 1;
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
      <span>Hi</span>
    </Modal>
  );
}

export default IterationModal;

IterationModal.propTypes = {
  handleCancel: PropTypes.func.isRequired,
  handleOk: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types,react/require-default-props
  iteration: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  updateIterationProperty: PropTypes.func.isRequired,
};
