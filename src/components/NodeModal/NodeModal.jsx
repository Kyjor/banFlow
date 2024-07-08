import React, { useCallback } from 'react';
import { Button, DatePicker, Modal, Tabs, TimePicker } from 'antd';
import moment from 'moment';
import dateFormat from 'dateformat';
import { ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import EditableTextArea from '../EditableTextArea/EditableTextArea';
import './NodeModal.css';

const { TabPane } = Tabs;

function NodeModal({
  handleCancel,
  handleOk,
  isTimerRunning,
  node,
  parents,
  updateNodeProperty,
  visible,
}) {
  const handleEstimatedDateChange = useCallback(
    (date, dateString) => {
      const dateToSave = `${dateString.split(' ')[0]}T${
        dateString.split(' ')[1]
      }:00`;
      updateNodeProperty('estimatedDate', node.id, dateToSave, true);
    },
    [node.id, updateNodeProperty],
  );

  const onChangeTimeSpent = useCallback(
    (time, timeString) => {
      if (time === null) {
        return;
      }

      updateNodeProperty(
        'timeSpent',
        node.id,
        moment.duration(timeString).asSeconds(),
        true,
      );
    },
    [node.id, updateNodeProperty],
  );

  return (
    <Modal
      title={
        <div style={{ display: 'flex', marginBottom: '15px' }}>
          <span style={{ marginTop: '5px' }}>#{node.$loki}:</span>
          <EditableTextArea
            defaultValue={node.title}
            style={{
              width: '430px',
              resize: 'none',
              height: '22px',
              border: 'none',
            }}
            maxLength={70}
            autoSize={{ maxRows: 1 }}
            updateText={(value) => {
              updateNodeProperty('title', node.id, value, true);
            }}
          />
        </div>
      }
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      footer={[
        <Button
          key="back"
          onClick={handleCancel}
          style={{ borderRadius: '5px' }}
        >
          Return
        </Button>,
        parents && parents[node.parent] && parents[node.parent].isTimed && (
          <Button
            key="submit"
            type="primary"
            onClick={handleOk}
            style={{ borderRadius: '5px' }}
          >
            Start Working
          </Button>
        ),
      ]}
      bodyStyle={{ borderRadius: '20px' }}
    >
      <Tabs defaultActiveKey="1">
        <TabPane
          tab={
            <span>
              <InfoCircleOutlined />
              Details
            </span>
          }
          key="1"
        >
          <div>Description</div>
          <EditableTextArea
            defaultValue={node.description}
            maxLength={500}
            autoSize={{ minRows: 6 }}
            style={{
              marginBottom: '10px',
              borderRadius: '10px',
              backgroundColor: node.description ? 'transparent' : '#ffffff',
            }}
            placeholder="Add a more detailed description here..."
            updateText={(value) => {
              updateNodeProperty('description', node.id, value, true);
            }}
          />
          <div>Notes</div>
          <EditableTextArea
            defaultValue={node.notes}
            maxLength={100}
            autoSize={{ minRows: 3 }}
            style={{
              marginBottom: '10px',
              borderRadius: '10px',
            }}
            placeholder="Take some notes here..."
            updateText={(value) => {
              updateNodeProperty('notes', node.id, value, true);
            }}
          />
        </TabPane>
        <TabPane
          style={{ margin: '0 10px 0 0' }}
          tab={
            <span>
              <ClockCircleOutlined />
              Timing
            </span>
          }
          key="3"
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div>Creation Date</div>
            <DatePicker
              disabled
              showTime
              defaultValue={moment(
                `${dateFormat(node.created, 'yyyy-mm-dd HH:MM')}`,
                'YYYY-MM-DD HH:mm',
              )}
              style={{ borderRadius: '5px' }}
              format="YYYY-MM-DD HH:mm"
            />
            <div>Time Spent</div>
            <TimePicker
              disabled={isTimerRunning}
              onChange={onChangeTimeSpent}
              value={moment(
                `${new Date((node.timeSpent ?? 0) * 1000)
                  .toISOString()
                  .substr(11, 8)}`,
                'HH:mm:ss',
              )}
              style={{ borderRadius: '5px' }}
            />
            <div>Due Date</div>
            <DatePicker
              allowClear
              defaultValue={
                node.estimatedDate
                  ? moment(
                      `${dateFormat(node.estimatedDate, 'yyyy-mm-dd HH:MM')}`,
                      'YYYY-MM-DD HH:mm',
                    )
                  : null
              }
              defaultOpenValue={moment(
                `${dateFormat(node.estimatedDate, 'yyyy-mm-dd HH:MM')}`,
                'YYYY-MM-DD HH:mm',
              )}
              showTime
              size="default"
              onChange={handleEstimatedDateChange}
              format="YYYY-MM-DD HH:mm"
              style={{ borderRadius: '5px' }}
            />
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
}

export default NodeModal;

NodeModal.propTypes = {
  handleCancel: PropTypes.func.isRequired,
  handleOk: PropTypes.func.isRequired,
  isTimerRunning: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parents: PropTypes.array.isRequired,
  updateNodeProperty: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
};
