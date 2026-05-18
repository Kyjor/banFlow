import React from 'react';
import { Button, Checkbox, message, Modal, Popconfirm, Tabs } from 'antd';
import PropTypes from 'prop-types';
import EditableTextArea from '../EditableTextArea/EditableTextArea';
import TimedItemHistory from '../TimedItemHistory/TimedItemHistory';

const { TabPane } = Tabs;

class ParentModal extends React.Component {
  handleConfirmParentDelete = () => {
    const { deleteParent, parent } = this.props;
    if (parent.nodeIds.length > 0) {
      message.error('Empty Parent before deleting');
      return;
    }
    deleteParent(parent.id);
    message.success('Deleted parent');
  };

  handleTimedCheckboxChange = (e) => {
    const { updateParentProperty, parent } = this.props;
    updateParentProperty('isTimed', parent.id, e.target.checked);
  };

  handleMarkAsDoneCheckboxChange = (e) => {
    const { updateParentProperty, parent } = this.props;
    updateParentProperty('markAsDoneOnDrag', parent.id, e.target.checked);
  };

  // eslint-disable-next-line class-methods-use-this
  handleCancelParentDelete = () => {
    message.error('Parent not deleted');
  };

  render() {
    const { handleCancel, updateParentProperty, visible, parent } = this.props;
    return (
      <Modal
        title={
          <div style={{ display: 'flex', marginBottom: '15px' }}>
            <span>#{parent.$loki}:</span>
            <EditableTextArea
              defaultValue={parent.title}
              style={{
                width: '430px',
                resize: 'none',
                height: '22px',
                border: 'none',
              }}
              maxLength={70}
              autoSize={{ maxRows: 1 }}
              updateText={(value) => {
                updateParentProperty('title', parent.id, value);
              }}
            />
          </div>
        }
        open={visible}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Return
          </Button>,
        ]}
      >
        <Tabs defaultActiveKey="1">
          <TabPane tab={<span>Settings</span>} key="1">
            <div style={{ marginBottom: '16px' }}>
              <Checkbox
                onChange={this.handleTimedCheckboxChange}
                checked={parent.isTimed || false}
              >
                Items in Parent are Timed
              </Checkbox>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Checkbox
                onChange={this.handleMarkAsDoneCheckboxChange}
                checked={parent.markAsDoneOnDrag || false}
              >
                Mark cards dragged here as done
              </Checkbox>
            </div>
            <div>
              <Popconfirm
                title="Are you sure delete this parent?"
                onConfirm={this.handleConfirmParentDelete}
                onCancel={this.handleCancelParentDelete}
                okText="Yes"
                cancelText="No"
              >
                <Button danger>Delete Parent</Button>
              </Popconfirm>
            </div>
          </TabPane>
          <TabPane tab={<span>History</span>} key="2">
            <TimedItemHistory parent={parent} />
          </TabPane>
        </Tabs>
      </Modal>
    );
  }
}

export default ParentModal;

ParentModal.propTypes = {
  deleteParent: PropTypes.func.isRequired,
  handleCancel: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parent: PropTypes.object.isRequired,
  updateParentProperty: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
};
