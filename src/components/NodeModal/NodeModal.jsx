import React, { useCallback, useState, useEffect } from 'react';
import {
  Button,
  DatePicker,
  Modal,
  Select,
  Tabs,
  TimePicker,
  Switch,
  Space,
  Tag,
  Input,
  AutoComplete,
  Popover,
} from 'antd';
import moment from 'moment';
import dateFormat from 'dateformat';
import {
  ClockCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import PropTypes from 'prop-types';
import EditableTextArea from '../EditableTextArea/EditableTextArea';
import SessionManager from './SessionManager';
import TagController from '../../api/tag/TagController';
import './NodeModal.css';

const { TabPane } = Tabs;
const { Option } = Select;

function NodeModal({
  handleCancel,
  handleOk,
  isTimerRunning,
  iterations,
  node,
  parents,
  syncTrelloCard,
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
    [node?.id, updateNodeProperty],
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
    [node?.id, updateNodeProperty],
  );

  const onChangeIteration = useCallback(
    (value) => {
      updateNodeProperty('iterationId', node.id, value, true);
    },
    [node?.id, updateNodeProperty],
  );

  // Tag management
  const [tags, setTags] = useState(node?.tags || []);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [availableTags, setAvailableTags] = useState([]);
  const [tagColors, setTagColors] = useState({});

  useEffect(() => {
    // Load available tags from global tag list
    const globalTags = TagController.getTags();
    const tagTitles = globalTags
      ? globalTags.map((tag) => tag.title || tag.id)
      : [];
    setAvailableTags(tagTitles);

    // Build color map
    const colorMap = {};
    if (globalTags) {
      globalTags.forEach((tag) => {
        colorMap[tag.title || tag.id] = tag.color || '';
      });
    }
    setTagColors(colorMap);
  }, []);

  useEffect(() => {
    // Sync tags when node changes
    setTags(node?.tags || []);
  }, [node?.tags]);

  const handleTagClose = useCallback(
    (removedTag) => {
      const newTags = tags.filter((tag) => tag !== removedTag);
      setTags(newTags);
      updateNodeProperty('tags', node.id, newTags, true);
    },
    [tags, node?.id, updateNodeProperty],
  );

  const handleTagAdd = useCallback(
    (tagValue, color = '') => {
      if (!tagValue || tags.includes(tagValue)) {
        return;
      }
      const newTags = [...tags, tagValue];
      setTags(newTags);
      updateNodeProperty('tags', node.id, newTags, true);

      // Create global tag if it doesn't exist
      if (!availableTags.includes(tagValue)) {
        TagController.addTag(tagValue, color);
        setAvailableTags([...availableTags, tagValue]);
        setTagColors({ ...tagColors, [tagValue]: color });
      }
      setInputVisible(false);
      setInputValue('');
    },
    [tags, availableTags, tagColors, node?.id, updateNodeProperty],
  );

  const handleTagColorChange = useCallback(
    (tagValue, color) => {
      TagController.updateTagColor(tagValue, color);
      setTagColors({ ...tagColors, [tagValue]: color });
    },
    [tagColors],
  );

  const handleInputConfirm = useCallback(() => {
    if (inputValue.trim()) {
      handleTagAdd(inputValue.trim());
    }
  }, [inputValue, handleTagAdd]);

  const handleSelectTag = useCallback(
    (value) => {
      handleTagAdd(value);
    },
    [handleTagAdd],
  );

  const trelloToken = localStorage.getItem('trelloToken');
  const trelloKey = localStorage.getItem(`trelloKey`);

  return node ? (
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
      bodyStyle={{ borderRadius: '20px', maxHeight: '80vh', overflowY: 'auto' }}
      width={900}
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
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              background: '#f5f5f5',
              borderRadius: '8px',
            }}
          >
            <Space
              align="center"
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <div>
                <CheckCircleOutlined
                  style={{
                    marginRight: '8px',
                    color: node.isComplete ? '#52c41a' : '#999',
                  }}
                />
                <span style={{ fontWeight: 500, fontSize: '16px' }}>
                  Completion Status
                </span>
              </div>
              <Switch
                checked={node.isComplete || false}
                onChange={(checked) => {
                  updateNodeProperty('isComplete', node.id, checked, true);
                  // Update completedDate when marking as complete/incomplete
                  if (checked) {
                    updateNodeProperty(
                      'completedDate',
                      node.id,
                      new Date().toISOString(),
                      true,
                    );
                  } else {
                    updateNodeProperty('completedDate', node.id, '', true);
                  }
                }}
                checkedChildren="Complete"
                unCheckedChildren="Incomplete"
                style={{ minWidth: '100px' }}
              />
            </Space>
            {node.isComplete && node.completedDate && (
              <div
                style={{ marginTop: '8px', color: '#666', fontSize: '12px' }}
              >
                Completed on:{' '}
                {moment(node.completedDate).format('YYYY-MM-DD HH:mm')}
              </div>
            )}
          </div>
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
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>Tags</div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              {tags.map((tag) => (
                <Tag
                  key={tag}
                  closable
                  onClose={() => handleTagClose(tag)}
                  color={tagColors[tag] || 'default'}
                  style={{ margin: 0, padding: '4px 8px', fontSize: '13px' }}
                >
                  {tag}
                  <Popover
                    content={
                      <div style={{ padding: '8px', minWidth: '200px' }}>
                        <div style={{ marginBottom: '8px', fontWeight: 500 }}>
                          Tag Color:
                        </div>
                        <Select
                          value={tagColors[tag] || 'default'}
                          onChange={(color) => {
                            handleTagColorChange(
                              tag,
                              color === 'default' ? '' : color,
                            );
                          }}
                          style={{ width: '100%' }}
                          size="small"
                        >
                          <Select.Option value="default">Default</Select.Option>
                          <Select.Option value="red">Red</Select.Option>
                          <Select.Option value="orange">Orange</Select.Option>
                          <Select.Option value="gold">Gold</Select.Option>
                          <Select.Option value="green">Green</Select.Option>
                          <Select.Option value="cyan">Cyan</Select.Option>
                          <Select.Option value="blue">Blue</Select.Option>
                          <Select.Option value="purple">Purple</Select.Option>
                          <Select.Option value="magenta">Magenta</Select.Option>
                          <Select.Option value="volcano">Volcano</Select.Option>
                          <Select.Option value="lime">Lime</Select.Option>
                          <Select.Option value="geekblue">
                            Geek Blue
                          </Select.Option>
                        </Select>
                      </div>
                    }
                    trigger="click"
                    placement="bottom"
                  >
                    <BgColorsOutlined
                      style={{
                        marginLeft: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Tag>
              ))}
              {inputVisible ? (
                <AutoComplete
                  dataSource={availableTags
                    .filter((t) => !tags.includes(t))
                    .filter((t) =>
                      t.toUpperCase().includes(inputValue.toUpperCase()),
                    )}
                  style={{ width: 150 }}
                  onSelect={handleSelectTag}
                  onBlur={handleInputConfirm}
                  open={
                    inputValue.length > 0 &&
                    availableTags.filter(
                      (t) =>
                        !tags.includes(t) &&
                        t.toUpperCase().includes(inputValue.toUpperCase()),
                    ).length > 0
                  }
                  filterOption={false}
                >
                  <Input
                    type="text"
                    size="small"
                    style={{ width: 150 }}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onPressEnter={handleInputConfirm}
                    onBlur={handleInputConfirm}
                    autoFocus
                    placeholder="Type tag name"
                  />
                </AutoComplete>
              ) : (
                <Tag
                  onClick={() => setInputVisible(true)}
                  style={{
                    borderStyle: 'dashed',
                    cursor: 'pointer',
                    margin: 0,
                    padding: '4px 8px',
                    fontSize: '13px',
                  }}
                >
                  <PlusOutlined /> Add Tag
                </Tag>
              )}
            </div>
          </div>
          <div>
            <div>Iteration</div>
            <Select
              style={{ width: 200 }}
              value={node.iterationId}
              onChange={onChangeIteration}
            >
              <Option style={{ width: '100%' }} key={0} value={0}>
                <span style={{ whiteSpace: 'normal' }}>Backlog</span>
              </Option>
              {iterations &&
                Object.values(iterations).map((item) => (
                  <Option
                    style={{ width: '100%' }}
                    key={item.id}
                    value={item.id}
                  >
                    <span style={{ whiteSpace: 'normal' }}>{item.title}</span>
                  </Option>
                ))}
            </Select>
            {trelloKey && trelloToken && node.trello && (
              <Button
                style={{ marginLeft: `150px` }}
                onClick={() => {
                  syncTrelloCard(node);
                }}
              >
                Trello Sync
              </Button>
            )}
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
          {/* Session Manager in Timing tab */}
          <SessionManager
            node={node}
            parents={parents}
            updateNodeProperty={updateNodeProperty}
            onSessionsChange={(updatedSessions, newTimeSpent) => {
              // Update local node reference if needed
              if (node) {
                node.sessionHistory = updatedSessions;
                node.timeSpent = newTimeSpent;
              }
            }}
          />
        </TabPane>
      </Tabs>
    </Modal>
  ) : null;
}

export default NodeModal;

NodeModal.propTypes = {
  handleCancel: PropTypes.func.isRequired,
  handleOk: PropTypes.func.isRequired,
  isTimerRunning: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types,react/require-default-props
  iterations: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parents: PropTypes.object.isRequired,
  syncTrelloCard: PropTypes.func.isRequired,
  updateNodeProperty: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
};
