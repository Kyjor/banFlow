import React from 'react';
import {
  Avatar,
  Button,
  Checkbox,
  Comment,
  DatePicker,
  Modal,
  Tabs,
  TimePicker,
} from 'antd';
import moment from 'moment';
import dateFormat from 'dateformat';
import {
  ClockCircleOutlined,
  FileAddOutlined,
  InfoCircleOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import * as PropTypes from 'prop-types';
import PictureWall from '../PictureWall/PictureWall';
import EditableTextArea from '../EditableTextArea/EditableTextArea';
import TimedItemHistory from '../TimedItemHistory/TimedItemHistory';
import ISO8601ServiceInstance from '../../services/ISO8601Service';
import CustomSelect from '../CustomSelect/CustomSelect';
import EditableTagGroup from '../EditableTagGroup/EditableTagGroup';
import Checklist from '../Checklist/Checklist';
import KanbanBoard from '../KanbanBoard/KanbanBoard';

const { TabPane } = Tabs;

class NodeModal extends React.Component {
  constructor(props) {
    super(props);
    this.node = this.props.node;
    this.nodeTypes = this.props.nodeTypes;
    this.nodeStates = this.props.nodeStates;
    this.state = {
      modalDescriptionSelected: false,
      modalNotesSelected: false,
      endOpen: false,
    };
  }

  handleEstimatedTimeChange = (time, timeString) => {
    const seconds = this.hmsToSecondsOnly(timeString);
    this.props.updateNodeProperty(`estimatedTime`, this.node.id, seconds, true);
  };

  handleEstimatedDateChange(date, dateString) {
    const dateToSave = `${`${dateString.split(` `)[0]}T${
      dateString.split(` `)[1]
    }:00`}`;
    this.props.updateNodeProperty(
      `estimatedDate`,
      this.node.id,
      dateToSave,
      true
    );
  }

  handleLockCheckboxChange = (e) => {
    this.props.updateNodeProperty(
      `isLocked`,
      this.node.id,
      e.target.checked,
      true
    );
  };

  handleCompleteCheckboxChange = (e) => {
    this.props.updateNodeProperty(
      `isComplete`,
      this.node.id,
      e.target.checked,
      true
    );
    this.props.updateNodeProperty(
      `completedDate`,
      this.node.id,
      e.target.checked ? ISO8601ServiceInstance.getISO8601Time() : ``,
      true
    );
  };

  setCoverImage = (imagePath) => {
    this.props.updateNodeProperty(`coverImage`, this.node.id, imagePath, true);
  };

  addImageToNode = (image) => {
    const newImages = this.node.images;
    newImages.push(image);
    this.props.updateNodeProperty(`images`, this.node.id, newImages, true);
  };

  hmsToSecondsOnly = (str) => {
    const p = str.split(':');
    let s = 0;
    let m = 1;

    while (p.length > 0) {
      s += m * parseInt(p.pop(), 10);
      m *= 60;
    }

    return s;
  };

  render() {
    const format = 'HH:mm:ss';

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
              // showCount={this.state.textSelected}
              maxLength={70}
              autoSize={{ maxRows: 1 }}
              updateText={(value) => {
                this.props.updateNodeProperty(
                  `title`,
                  this.node.id,
                  value,
                  true
                );
              }}
            />
          </div>
        }
        visible={this.props.visible}
        onOk={this.props.handleOk}
        onCancel={this.props.handleCancel}
        footer={[
          <Button key="back" onClick={this.props.handleCancel}>
            Return
          </Button>,
          this.props.parents && this.props.parents[this.node.parent].isTimed && (
            <Button key="submit" type="primary" onClick={this.props.handleOk}>
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
                Basic Info
              </span>
            }
            key="1"
          >
            {/* //TODO: Change node parent and index in parent with select */}
            {/* <div style={{width:"100%", display:"flex"}}> */}
            {/*  <div>Parent:</div> */}
            {/*  <Select */}
            {/*    style={{width:"50%", marginLeft:"20px", marginBottom:"10px"}} */}
            {/*  > */}
            {/*    <Option value="lucy">lucy</Option> */}
            {/*  </Select> */}
            {/* </div> */}
            <div>Description</div>
            <EditableTextArea
              defaultValue={this.node.description}
              // showCount={this.state.modalDescriptionSelected}
              maxLength={500}
              autoSize={{ minRows: 6 }}
              style={{
                marginBottom: '10px',
                backgroundColor: this.node.description
                  ? `transparent`
                  : `#eeeeee`,
                // backgroundColor: `#eeeeee`,
              }}
              placeholder="Add a more detailed description here..."
              updateText={(value) => {
                this.props.updateNodeProperty(
                  `description`,
                  this.node.id,
                  value,
                  true
                );
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
                // backgroundColor: this.node.notes ? `transparent` : `#eeeeee`,
                // backgroundColor: `#eeeeee`,
              }}
              placeholder="Take some notes here..."
              updateText={(value) => {
                this.props.updateNodeProperty(
                  `notes`,
                  this.node.id,
                  value,
                  true
                );
              }}
            />
            <div>Comments</div>
            <Comment
              actions={[<span key="comment-nested-reply-to">Reply to</span>]}
              author={<a>Han Solo</a>}
              avatar={
                <Avatar
                  src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png"
                  alt="Han Solo"
                />
              }
              content={
                <p>
                  We supply a series of design principles, practical patterns
                  and high quality design resources (Sketch and Axure).
                </p>
              }
            />
          </TabPane>

          <TabPane
            style={{ margin: '0 10px 0 0' }}
            tab={
              <span>
                <TagsOutlined />
                Tab 2
              </span>
            }
            key="2"
          >
            <div>
              <div>Tags</div>
              <EditableTagGroup
                addTagToNode={this.props.addTagToNode}
                createGlobalTag={this.props.createGlobalTag}
                node={this.node}
                tags={this.props.tags}
              />
              <div>Task Type</div>
              <CustomSelect
                parentEnum="nodeType"
                items={this.nodeTypes}
                saveMetadataValue={this.props.saveMetadataValue}
                updateNodeEnum={this.props.updateNodeEnum}
                node={this.node}
                currentValue={this.node.nodeType}
              />
              <div>Item State</div>
              <CustomSelect
                parentEnum="nodeState"
                items={this.nodeStates}
                saveMetadataValue={this.props.saveMetadataValue}
                updateNodeEnum={this.props.updateNodeEnum}
                node={this.node}
                currentValue={this.node.nodeState}
              />
              <div>Percent Done</div>
              <div>Priority</div>
              <div>
                <Checkbox
                  onChange={this.handleCompleteCheckboxChange.bind(this)}
                  defaultChecked={this.node.isComplete}
                >
                  Mark as complete
                </Checkbox>{' '}
              </div>
              <div>
                <Checkbox
                  onChange={this.handleLockCheckboxChange.bind(this)}
                  defaultChecked={this.node.isLocked}
                >
                  Lock Node
                </Checkbox>{' '}
              </div>{' '}
            </div>
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
                    'YYYY-MM-DD HH:mm'
                  )}
                  format="YYYY-MM-DD HH:mm"
                />
              </div>
              <div>
                Estimated Time To Complete:{' '}
                <TimePicker
                  defaultOpenValue={moment(
                    `${
                      this.node.estimatedTime
                        ? new Date(this.node.estimatedTime * 1000)
                            .toISOString()
                            .substr(11, 8)
                        : `00:00:00`
                    }`
                  )}
                  allowClear
                  format={format}
                  onChange={this.handleEstimatedTimeChange.bind(this)}
                  defaultValue={moment(
                    `${
                      this.node.estimatedTime
                        ? new Date(this.node.estimatedTime * 1000)
                            .toISOString()
                            .substr(11, 8)
                        : `00:00:00`
                    }`,
                    'HH:mm:ss'
                  )}
                />
              </div>
              <div>
                Time Spent:{' '}
                <TimePicker
                  disabled
                  value={moment(
                    `${new Date((this.node.timeSpent ?? 0) * 1000)
                      .toISOString()
                      .substr(11, 8)}`,
                    'HH:mm:ss'
                  )}
                />
              </div>
              <div>
                Estimated Date of Completion:{' '}
                <DatePicker
                  allowClear
                  defaultValue={
                    this.node.estimatedDate
                      ? moment(
                          `${dateFormat(
                            this.node.estimatedDate,
                            'yyyy-mm-dd HH:MM'
                          )}`,
                          'YYYY-MM-DD HH:mm'
                        )
                      : null
                  }
                  defaultOpenValue={moment(
                    `${dateFormat(
                      this.node.estimatedDate,
                      'yyyy-mm-dd HH:MM'
                    )}`,
                    'YYYY-MM-DD HH:mm'
                  )}
                  showTime
                  size="default"
                  onChange={this.handleEstimatedDateChange.bind(this)}
                  format="YYYY-MM-DD HH:mm"
                />
              </div>
              <div>
                Actual Date of Completion
                <DatePicker
                  picker="month"
                  allowClear
                  defaultValue={
                    this.node.completedDate
                      ? moment(
                          `${dateFormat(
                            this.node.completedDate,
                            'yyyy-mm-dd HH:MM'
                          )}`,
                          'YYYY-MM-DD HH:mm'
                        )
                      : null
                  }
                  defaultOpenValue={moment(
                    `${dateFormat(
                      this.node.completedDate,
                      'yyyy-mm-dd HH:MM'
                    )}`,
                    'YYYY-MM-DD HH:mm'
                  )}
                  showTime
                  size="default"
                  format="YYYY-MM-DD HH:mm"
                />
              </div>
              <div
                style={{
                  marginTop: '10px',
                  maxHeight: '350px',
                  maxWidth: '97%',
                  overflowY: 'auto',
                }}
              >
                <TimedItemHistory node={this.node} />
              </div>
            </div>
          </TabPane>
          <TabPane
            style={{ margin: '0 10px 0 0' }}
            tab={
              <span>
                <FileAddOutlined />
                Images
              </span>
            }
            key="4"
          >
            <PictureWall
              node={this.node}
              setCoverImage={this.setCoverImage}
              addImageToNode={this.addImageToNode}
            />
          </TabPane>
          <TabPane
            style={{ margin: '0 10px 0 0' }}
            tab={
              <span>
                <FileAddOutlined />
                Checklist
              </span>
            }
            key="5"
          >
            <Checklist
              nodeId={this.node.id}
              updateNodeProperty={this.props.updateNodeProperty}
              checklist={this.node.checklist}
            />
          </TabPane>
        </Tabs>
      </Modal>
    );
  }
}
export default NodeModal;

NodeModal.propTypes = {
  addTagToNode: PropTypes.func,
  createGlobalTag: PropTypes.func,
  handleCancel: PropTypes.func,
  handleOk: PropTypes.func,
  node: PropTypes.object,
  nodeStates: PropTypes.array,
  nodeTypes: PropTypes.array,
  parents: PropTypes.array,
  saveMetadataValue: PropTypes.func,
  tags: PropTypes.array,
  updateNodeEnum: PropTypes.func,
  updateNodeProperty: PropTypes.func,
  visible: PropTypes.bool,
};
