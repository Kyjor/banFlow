import React from 'react';
import { Button, DatePicker, Modal, Tabs, TimePicker } from 'antd';
import moment from 'moment';
import dateFormat from 'dateformat';
import { ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import * as PropTypes from 'prop-types';
import EditableTextArea from '../EditableTextArea/EditableTextArea';

const { TabPane } = Tabs;

class NodeModal extends React.Component {
  constructor(props) {
    super(props);

    const { node } = this.props;
    this.node = node;
  }

  handleEstimatedDateChange = (date, dateString) => {
    const { updateNodeProperty } = this.props;

    const dateToSave = `${`${dateString.split(` `)[0]}T${
      dateString.split(` `)[1]
    }:00`}`;
    updateNodeProperty(`estimatedDate`, this.node.id, dateToSave, true);
  };

  render() {
    const { handleCancel, handleOk, parents, updateNodeProperty, visible } =
      this.props;

    const onChangeTimeSpent = (time, timeString) => {
      if (time === null) {
        return;
      }

      updateNodeProperty(
        `timeSpent`,
        this.node.id,
        moment.duration(timeString).asSeconds(),
      );
    };

    return (
      <Modal
        title={
          <div style={{ display: 'flex', marginBottom: '15px' }}>
            <span>#{this.node.$loki}:</span>
            <EditableTextArea
              defaultValue={this.node.title}
              style={{
                width: '430px',
                resize: 'none',
                height: '22px',
                border: 'none',
              }}
              maxLength={70}
              autoSize={{ maxRows: 1 }}
              updateText={(value) => {
                updateNodeProperty(`title`, this.node.id, value, true);
              }}
            />
          </div>
        }
        visible={visible}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Return
          </Button>,
          parents &&
            parents[this.node.parent] &&
            parents[this.node.parent].isTimed && (
              <Button key="submit" type="primary" onClick={handleOk}>
                Start Working
              </Button>
            ),
        ]}
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
              defaultValue={this.node.description}
              maxLength={500}
              autoSize={{ minRows: 6 }}
              style={{
                marginBottom: '10px',
                backgroundColor: this.node.description
                  ? `transparent`
                  : `#eeeeee`,
              }}
              placeholder="Add a more detailed description here..."
              updateText={(value) => {
                updateNodeProperty(`description`, this.node.id, value, true);
              }}
            />
            <div>Notes</div>
            <EditableTextArea
              defaultValue={this.node.notes}
              // showCount={this.state.modalNotesSelected}
              maxLength={100}
              autoSize={{ minRows: 3 }}
              style={{
                marginBottom: '10px',
              }}
              placeholder="Take some notes here..."
              updateText={(value) => {
                updateNodeProperty(`notes`, this.node.id, value, true);
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
            <div>
              <div>
                Creation Date:
                <DatePicker
                  disabled
                  showTime
                  defaultValue={moment(
                    `${dateFormat(this.node.created, 'yyyy-mm-dd HH:MM')}`,
                    'YYYY-MM-DD HH:mm',
                  )}
                  format="YYYY-MM-DD HH:mm"
                />
              </div>
              <div>
                Time Spent:{' '}
                <TimePicker
                  onChange={onChangeTimeSpent}
                  value={moment(
                    `${new Date((this.node.timeSpent ?? 0) * 1000)
                      .toISOString()
                      .substr(11, 8)}`,
                    'HH:mm:ss',
                  )}
                />
              </div>
              <div>
                Due Date:{' '}
                <DatePicker
                  allowClear
                  defaultValue={
                    this.node.estimatedDate
                      ? moment(
                          `${dateFormat(
                            this.node.estimatedDate,
                            'yyyy-mm-dd HH:MM',
                          )}`,
                          'YYYY-MM-DD HH:mm',
                        )
                      : null
                  }
                  defaultOpenValue={moment(
                    `${dateFormat(
                      this.node.estimatedDate,
                      'yyyy-mm-dd HH:MM',
                    )}`,
                    'YYYY-MM-DD HH:mm',
                  )}
                  showTime
                  size="default"
                  onChange={this.handleEstimatedDateChange}
                  format="YYYY-MM-DD HH:mm"
                />
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Modal>
    );
  }
}

export default NodeModal;

NodeModal.propTypes = {
  handleCancel: PropTypes.func.isRequired,
  handleOk: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parents: PropTypes.array.isRequired,
  updateNodeProperty: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
};
