import React from 'react';
import { Button, Checkbox, message, Modal, Popconfirm, Tabs } from 'antd';
import PropTypes from 'prop-types';
import EditableTextArea from '../EditableTextArea/EditableTextArea';
import TimedItemHistory from '../TimedItemHistory/TimedItemHistory';

const { TabPane } = Tabs;

class ParentModal extends React.Component {
  constructor(props) {
    super(props);
    const { parent } = props;

    this.parent = parent;
  }

  handleConfirmParentDelete = () => {
    const { deleteParent } = this.props;
    if (this.parent.nodeIds.length > 0) {
      message.error('Empty Parent before deleting');
      return;
    }
    deleteParent(this.parent.id);
    message.success('Deleted parent');
  };

  handleTimedCheckboxChange = (e) => {
    const { updateParentProperty } = this.props;
    updateParentProperty(
      () => this.parent.isTimed,
      this.parent.id,
      e.target.checked,
      true,
    );
  };

  // eslint-disable-next-line class-methods-use-this
  handleCancelParentDelete = () => {
    message.error('Parent not deleted');
  };

  render() {
    const { handleCancel, updateParentProperty, visible } = this.props;
    return (
      <Modal
        title={
          <div style={{ display: 'flex', marginBottom: '15px' }}>
            <span>#{this.parent.$loki}:</span>
            <EditableTextArea
              defaultValue={this.parent.title}
              style={{
                width: '430px',
                resize: 'none',
                height: '22px',
                border: 'none',
              }}
              maxLength={70}
              autoSize={{ maxRows: 1 }}
              updateText={(value) => {
                updateParentProperty(
                  () => this.parent.title,
                  this.parent.id,
                  value,
                  true,
                );
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
          <TabPane tab={<span>Tab 1</span>} key="1">
            <Popconfirm
              title="Are you sure delete this parent?"
              onConfirm={this.handleConfirmParentDelete}
              onCancel={this.handleCancelParentDelete}
              okText="Yes"
              cancelText="No"
            >
              <Button>Delete Parent</Button>
            </Popconfirm>
            ,
            <div>
              <Checkbox
                onChange={this.handleTimedCheckboxChange}
                defaultChecked={this.parent.isTimed}
              >
                Items in Parent are Timed
              </Checkbox>{' '}
            </div>
          </TabPane>
          <TabPane tab={<span>Tab 2</span>} key="2">
            <TimedItemHistory parent={this.parent} />
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
