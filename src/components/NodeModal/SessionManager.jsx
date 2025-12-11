import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Table,
  Button,
  Input,
  DatePicker,
  Select,
  Popconfirm,
  message,
  Space,
  Pagination,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import PropTypes from 'prop-types';
import './SessionManager.scss';

const { Option } = Select;
const { TextArea } = Input;

function SessionManager({ node, parents, updateNodeProperty, onSessionsChange }) {
  const [editingField, setEditingField] = useState(null); // Format: "rowIndex-fieldName"
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [tempSession, setTempSession] = useState(null); // Temporary new session being created
  const tableRef = useRef(null);

  // Handle click outside to cancel editing
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingField && tableRef.current && !tableRef.current.contains(event.target)) {
        setEditingField(null);
      }
    };

    if (editingField) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [editingField]);

  const sessions = node?.sessionHistory || [];

  // Calculate total timeSpent from all sessions
  const recalculateTimeSpent = (updatedSessions) => {
    const totalSeconds = updatedSessions.reduce((sum, session) => {
      return sum + (session.length || 0);
    }, 0);
    return totalSeconds;
  };

  // Calculate unallocated time (timeSpent - sum of all session lengths)
  const calculateUnallocatedTime = () => {
    const totalSessionTime = sessions.reduce((sum, session) => {
      return sum + (session.length || 0);
    }, 0);
    const unallocated = (node?.timeSpent || 0) - totalSessionTime;
    return Math.max(0, unallocated); // Don't show negative
  };

  const unallocatedTime = calculateUnallocatedTime();

  // Check for overlapping sessions
  const checkOverlap = (sessionIndex, startDateTime, finishDateTime, allSessions) => {
    const start = moment(startDateTime);
    const finish = moment(finishDateTime);

    return allSessions.some((session, index) => {
      if (index === sessionIndex || !session.startDateTime || !session.finishDateTime) {
        return false;
      }
      const sessionStart = moment(session.startDateTime);
      const sessionFinish = moment(session.finishDateTime);

      return (
        (start.isBefore(sessionFinish) && finish.isAfter(sessionStart)) ||
        (start.isSame(sessionStart) && finish.isSame(sessionFinish))
      );
    });
  };

  const isEditing = (record, fieldName) => {
    return editingField === `${record.key}-${fieldName}`;
  };

  const startEditing = (record, fieldName) => {
    setEditingField(`${record.key}-${fieldName}`);
  };

  const saveField = (record, fieldName, value) => {
    const updatedSessions = sessions.map((s, i) => (i === record.key ? { ...s } : s));
    const index = record.key;

    if (index < 0 || index >= updatedSessions.length) {
      setEditingField(null);
      return;
    }

    const session = updatedSessions[index];
    let shouldRecalculate = false;

    // Update the field
    if (fieldName === 'startDateTime') {
      session.startDateTime = value ? value.toISOString() : '';
      shouldRecalculate = true;
    } else if (fieldName === 'finishDateTime') {
      session.finishDateTime = value ? value.toISOString() : '';
      shouldRecalculate = true;
    } else if (fieldName === 'length') {
      const seconds = Math.max(0, parseFloat(value) || 0);
      session.length = seconds;
      shouldRecalculate = true;
    } else {
      session[fieldName] = value;
    }

    // Recalculate dependent fields
    if (shouldRecalculate) {
      if (fieldName === 'startDateTime' && session.length && session.startDateTime) {
        // Recalculate finishDateTime from startDateTime and length
        session.finishDateTime = moment(session.startDateTime)
          .add(session.length, 'seconds')
          .toISOString();
      } else if (fieldName === 'finishDateTime' && session.startDateTime && session.finishDateTime) {
        // Recalculate length from start and end times
        session.length = moment(session.finishDateTime).diff(
          moment(session.startDateTime),
          'seconds'
        );
      } else if (fieldName === 'length' && session.startDateTime) {
        // Recalculate finishDateTime from startDateTime and length
        session.finishDateTime = moment(session.startDateTime)
          .add(session.length, 'seconds')
          .toISOString();
      }
    }

    // Validation: finishDateTime must be after startDateTime
    if (session.startDateTime && session.finishDateTime) {
      const startMoment = moment(session.startDateTime);
      const finishMoment = moment(session.finishDateTime);

      if (!finishMoment.isAfter(startMoment)) {
        message.error('End time must be after start time');
        setEditingField(null);
        return;
      }

      // Check for overlaps (excluding current session)
      if (checkOverlap(index, session.startDateTime, session.finishDateTime, updatedSessions)) {
        message.error('This session overlaps with another session');
        setEditingField(null);
        return;
      }
    }

    updatedSessions[index] = session;

    // Recalculate total timeSpent
    const newTimeSpent = recalculateTimeSpent(updatedSessions);

    // Update both sessionHistory and timeSpent
    updateNodeProperty('sessionHistory', node.id, updatedSessions, false);
    updateNodeProperty('timeSpent', node.id, newTimeSpent, false);

    if (onSessionsChange) {
      onSessionsChange(updatedSessions, newTimeSpent);
    }

    setEditingField(null);
  };

  const deleteSession = (record) => {
    if (editingField) {
      message.warning('Please finish editing before deleting');
      return;
    }

    const updatedSessions = sessions.filter((_, i) => i !== record.key);
    const newTimeSpent = recalculateTimeSpent(updatedSessions);

    updateNodeProperty('sessionHistory', node.id, updatedSessions, false);
    updateNodeProperty('timeSpent', node.id, newTimeSpent, false);

    if (onSessionsChange) {
      onSessionsChange(updatedSessions, newTimeSpent);
    }

    message.success('Session deleted successfully');
  };

  const addSession = () => {
    // Only allow one temp session at a time
    if (tempSession) {
      message.warning('Please save or cancel the current session first');
      return;
    }

    // Create a temporary session entry (not saved yet)
    const newTempSession = {
      comment: '',
      parent: node.parent,
      item: node.title,
      finishDateTime: '',
      length: 0,
      startDateTime: '',
      startingSeconds: node.timeSpent || 0,
      isTemp: true, // Mark as temporary
    };

    setTempSession(newTempSession);
  };

  const cancelTempSession = () => {
    setTempSession(null);
    setEditingField(null);
  };

  const saveTempSession = () => {
    if (!tempSession) return;

    // Validation: must have both start and end times
    if (!tempSession.startDateTime || !tempSession.finishDateTime) {
      message.error('Please provide both start and end times');
      return;
    }

    // Validate end time is after start time
    const startMoment = moment(tempSession.startDateTime);
    const finishMoment = moment(tempSession.finishDateTime);

    if (!finishMoment.isAfter(startMoment)) {
      message.error('End time must be after start time');
      return;
    }

    // Recalculate length from start/end times
    const length = finishMoment.diff(startMoment, 'seconds');
    if (length <= 0) {
      message.error('Session duration must be greater than 0');
      return;
    }

    // Check for overlaps with existing sessions
    const allSessions = [...sessions];
    if (checkOverlap(-1, tempSession.startDateTime, tempSession.finishDateTime, allSessions)) {
      message.error('This session overlaps with an existing session');
      return;
    }

    // Create the actual session (remove isTemp flag)
    const newSession = {
      ...tempSession,
      length,
      isTemp: undefined, // Remove temp flag
    };
    delete newSession.isTemp;

    const updatedSessions = [...sessions, newSession];
    const newTimeSpent = recalculateTimeSpent(updatedSessions);

    // Update both sessionHistory and timeSpent
    updateNodeProperty('sessionHistory', node.id, updatedSessions, false);
    updateNodeProperty('timeSpent', node.id, newTimeSpent, false);

    // Fire session completed event for game system
    eventSystem.emit(EVENTS.SESSION_COMPLETED, {
      duration: length,
      nodeId: node.id,
      nodeTitle: node?.title || '',
    });

    if (onSessionsChange) {
      onSessionsChange(updatedSessions, newTimeSpent);
    }

    setTempSession(null);
    setEditingField(null);
    message.success('Session saved successfully');
  };

  const updateTempSession = (field, value) => {
    if (!tempSession) return;

    const updated = { ...tempSession };

    if (field === 'startDateTime') {
      updated.startDateTime = value ? value.toISOString() : '';
      // If length exists, calculate finishDateTime
      if (updated.length && updated.startDateTime) {
        updated.finishDateTime = moment(updated.startDateTime)
          .add(updated.length, 'seconds')
          .toISOString();
      }
    } else if (field === 'finishDateTime') {
      updated.finishDateTime = value ? value.toISOString() : '';
      // Recalculate length from start and end times
      if (updated.startDateTime && updated.finishDateTime) {
        updated.length = moment(updated.finishDateTime).diff(
          moment(updated.startDateTime),
          'seconds'
        );
      }
    } else if (field === 'length') {
      const seconds = Math.max(0, parseFloat(value) || 0);
      updated.length = seconds;
      // Calculate finishDateTime from startDateTime and length
      if (updated.startDateTime) {
        updated.finishDateTime = moment(updated.startDateTime)
          .add(seconds, 'seconds')
          .toISOString();
      }
    } else {
      updated[field] = value;
    }

    setTempSession(updated);
  };

  const createSessionFromUnallocated = () => {
    if (unallocatedTime <= 0) return;

    const now = moment();
    // Create a session with all unallocated time
    const newSession = {
      comment: 'Created from unallocated time',
      parent: node.parent,
      item: node.title,
      finishDateTime: now.toISOString(),
      length: unallocatedTime,
      startDateTime: now.clone().subtract(unallocatedTime, 'seconds').toISOString(),
      startingSeconds: (node.timeSpent || 0) - unallocatedTime,
    };

    const updatedSessions = [newSession, ...sessions]; // Add at the beginning
    // timeSpent stays the same, we're just allocating it to a session

    updateNodeProperty('sessionHistory', node.id, updatedSessions, false);

    if (onSessionsChange) {
      onSessionsChange(updatedSessions, node.timeSpent || 0);
    }

    message.success(`Created session with ${formatDuration(unallocatedTime)} from unallocated time`);
  };


  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 && hours === 0) parts.push(`${secs}s`);

    return parts.join(' ') || '0s';
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '';
    return moment(dateTime).format('YYYY-MM-DD HH:mm');
  };

  const getParentName = (parentId) => {
    if (!parents || !parentId) return 'Unknown';
    const parent = Object.values(parents).find((p) => p.id === parentId);
    return parent?.title || parentId;
  };

  const columns = [
    {
      title: 'Start Time',
      dataIndex: 'startDateTime',
      key: 'startDateTime',
      width: '20%',
      render: (text, record) => {
        if (record.isUnallocated) {
          return <span style={{ color: '#999', fontStyle: 'italic' }}>N/A</span>;
        }
        
        // Temp sessions are always editable
        if (record.isTemp) {
          return (
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              value={text ? moment(text) : null}
              onChange={(value) => {
                updateTempSession('startDateTime', value);
              }}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingField(null);
                }
              }}
              placeholder="Select start time"
              style={{ width: '100%' }}
            />
          );
        }

        const editable = isEditing(record, 'startDateTime');
        if (editable) {
          return (
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              value={text ? moment(text) : null}
              onChange={(value) => {
                if (value) {
                  saveField(record, 'startDateTime', value);
                }
              }}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingField(null);
                }
              }}
              autoFocus
              style={{ width: '100%' }}
            />
          );
        }
        return (
          <div
            onClick={() => startEditing(record, 'startDateTime')}
            style={{
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!editingField) e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {formatDateTime(text)}
          </div>
        );
      },
    },
    {
      title: 'End Time',
      dataIndex: 'finishDateTime',
      key: 'finishDateTime',
      width: '20%',
      render: (text, record) => {
        if (record.isUnallocated) {
          return <span style={{ color: '#999', fontStyle: 'italic' }}>N/A</span>;
        }
        
        // Temp sessions are always editable
        if (record.isTemp) {
          return (
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              value={text ? moment(text) : null}
              onChange={(value) => {
                updateTempSession('finishDateTime', value);
              }}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingField(null);
                }
              }}
              placeholder="Select end time"
              style={{ width: '100%' }}
            />
          );
        }

        const editable = isEditing(record, 'finishDateTime');
        if (editable) {
          return (
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              value={text ? moment(text) : null}
              onChange={(value) => {
                if (value) {
                  saveField(record, 'finishDateTime', value);
                }
              }}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingField(null);
                }
              }}
              autoFocus
              style={{ width: '100%' }}
            />
          );
        }
        return (
          <div
            onClick={() => startEditing(record, 'finishDateTime')}
            style={{
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!editingField) e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {formatDateTime(text)}
          </div>
        );
      },
    },
    {
      title: 'Duration',
      dataIndex: 'length',
      key: 'length',
      width: '15%',
      render: (text, record) => {
        if (record.isUnallocated) {
          return (
            <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
              {formatDuration(text)}
            </span>
          );
        }
        
        // Temp sessions - length auto-calculates, but show it
        if (record.isTemp) {
          return (
            <span style={{ color: record.length > 0 ? '#52c41a' : '#999' }}>
              {formatDuration(record.length || 0)}
            </span>
          );
        }

        const editable = isEditing(record, 'length');
        if (editable) {
          return (
            <Input
              type="number"
              value={text}
              onChange={(e) => {
                // Update immediately for visual feedback
                const updatedSessions = sessions.map((s, i) => 
                  i === record.key ? { ...s, length: parseFloat(e.target.value) || 0 } : s
                );
                updateNodeProperty('sessionHistory', node.id, updatedSessions, false);
              }}
              onBlur={(e) => {
                saveField(record, 'length', e.target.value);
              }}
              onPressEnter={(e) => {
                saveField(record, 'length', e.target.value);
              }}
              suffix="seconds"
              autoFocus
              style={{ width: '100%' }}
            />
          );
        }
        return (
          <div
            onClick={() => startEditing(record, 'length')}
            style={{
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!editingField) e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {formatDuration(text)}
          </div>
        );
      },
    },
    {
      title: 'Parent',
      dataIndex: 'parent',
      key: 'parent',
      width: '15%',
      render: (text, record) => {
        if (record.isUnallocated) {
          return <span style={{ color: '#999', fontStyle: 'italic' }}>N/A</span>;
        }
        
        // Temp sessions are always editable
        if (record.isTemp) {
          return (
            <Select
              value={text || node.parent}
              onChange={(value) => {
                updateTempSession('parent', value);
              }}
              style={{ width: '100%' }}
            >
              {Object.values(parents || {}).map((parent) => (
                <Option key={parent.id} value={parent.id}>
                  {parent.title}
                </Option>
              ))}
            </Select>
          );
        }

        const editable = isEditing(record, 'parent');
        if (editable) {
          return (
            <Select
              value={text}
              onChange={(value) => {
                saveField(record, 'parent', value);
                setEditingField(null);
              }}
              onBlur={() => setEditingField(null)}
              autoFocus
              style={{ width: '100%' }}
              defaultOpen
            >
              {Object.values(parents || {}).map((parent) => (
                <Option key={parent.id} value={parent.id}>
                  {parent.title}
                </Option>
              ))}
            </Select>
          );
        }
        return (
          <div
            onClick={() => startEditing(record, 'parent')}
            style={{
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!editingField) e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {getParentName(text)}
          </div>
        );
      },
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      width: '20%',
      render: (text, record) => {
        if (record.isUnallocated) {
          return (
            <span style={{ color: '#999', fontStyle: 'italic' }}>
              Unallocated time
            </span>
          );
        }
        
        // Temp sessions are always editable
        if (record.isTemp) {
          return (
            <TextArea
              value={text || ''}
              onChange={(e) => {
                updateTempSession('comment', e.target.value);
              }}
              rows={2}
              placeholder="Add a comment (optional)..."
            />
          );
        }

        const editable = isEditing(record, 'comment');
        if (editable) {
          return (
            <TextArea
              value={text || ''}
              onChange={(e) => {
                // Update immediately for visual feedback
                const updatedSessions = sessions.map((s, i) => 
                  i === record.key ? { ...s, comment: e.target.value } : s
                );
                updateNodeProperty('sessionHistory', node.id, updatedSessions, false);
              }}
              onBlur={(e) => {
                saveField(record, 'comment', e.target.value);
              }}
              rows={2}
              placeholder="Add a comment..."
              autoFocus
            />
          );
        }
        return (
          <div
            onClick={() => startEditing(record, 'comment')}
            style={{
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
              minHeight: '20px',
            }}
            onMouseEnter={(e) => {
              if (!editingField) e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {text || <span style={{ color: '#999' }}>Click to add comment</span>}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      render: (_, record) => {
        if (record.isUnallocated) {
          return (
            <Button
              type="primary"
              size="small"
              onClick={createSessionFromUnallocated}
              disabled={!!editingField || !!tempSession}
            >
              Create Session
            </Button>
          );
        }
        
        // Temp session has Save and Cancel buttons
        if (record.isTemp) {
          const canSave = record.startDateTime && record.finishDateTime;
          return (
            <Space>
              <Button
                type="primary"
                size="small"
                onClick={saveTempSession}
                disabled={!canSave}
              >
                Save
              </Button>
              <Button
                size="small"
                onClick={cancelTempSession}
              >
                Cancel
              </Button>
            </Space>
          );
        }
        
        return (
          <Popconfirm
            title="Are you sure you want to delete this session?"
            onConfirm={() => deleteSession(record)}
            okText="Yes"
            cancelText="No"
            disabled={!!editingField || !!tempSession}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              disabled={!!editingField || !!tempSession}
            >
              Delete
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  // Prepare data with keys, including unallocated time entry and temp session
  const dataSource = useMemo(() => {
    const sessionData = sessions.map((session, index) => ({
      key: index,
      ...session,
      isUnallocated: false,
      isTemp: false,
    }));

    const result = [];

    // Add unallocated time entry at the top if there's unallocated time
    if (unallocatedTime > 0) {
      result.push({
        key: 'unallocated',
        startDateTime: '',
        finishDateTime: '',
        length: unallocatedTime,
        parent: node.parent,
        comment: 'Unallocated time',
        item: node.title,
        isUnallocated: true,
        isTemp: false,
      });
    }

    // Add temp session if it exists (after unallocated, before regular sessions)
    if (tempSession) {
      result.push({
        key: 'temp',
        ...tempSession,
        isUnallocated: false,
      });
    }

    // Add regular sessions
    result.push(...sessionData);

    return result;
  }, [sessions, unallocatedTime, node, tempSession]);

  // Pagination - keep unallocated time entry and temp session always visible at top
  const paginatedData = useMemo(() => {
    const unallocatedEntry = dataSource.find(item => item.isUnallocated);
    const tempEntry = dataSource.find(item => item.isTemp);
    const regularSessions = dataSource.filter(item => !item.isUnallocated && !item.isTemp);
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const paginatedSessions = regularSessions.slice(start, end);
    
    // Always include unallocated entry and temp session at the top if they exist
    const result = [];
    if (unallocatedEntry) result.push(unallocatedEntry);
    if (tempEntry) result.push(tempEntry);
    result.push(...paginatedSessions);
    
    return result;
  }, [dataSource, currentPage, pageSize]);

  const regularSessionsCount = sessions.length;
  const totalPages = Math.ceil(regularSessionsCount / pageSize);

  return (
    <div className="session-manager">
      <div className="session-manager-header">
        <h4>Sessions ({sessions.length})</h4>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={addSession}
            size="small"
            disabled={!!editingField || !!tempSession}
          >
            Add Session
          </Button>
          <Select
            value={pageSize}
            onChange={(value) => {
              setPageSize(value);
              setCurrentPage(1);
            }}
            style={{ width: 100 }}
            size="small"
          >
            <Option value={5}>5 per page</Option>
            <Option value={10}>10 per page</Option>
            <Option value={20}>20 per page</Option>
            <Option value={50}>50 per page</Option>
          </Select>
        </Space>
      </div>

      <div ref={tableRef} style={{ overflowX: 'auto', width: '100%' }}>
        <Table
          columns={columns}
          dataSource={paginatedData}
          pagination={false}
          size="small"
          className="session-table"
          scroll={{ x: 'max-content' }}
          rowClassName={(record) => {
            if (record.isUnallocated) return 'unallocated-row';
            if (record.isTemp) return 'temp-session-row';
            return '';
          }}
        />
      </div>

      {totalPages > 1 && (
        <div className="session-pagination">
          <Pagination
            current={currentPage}
            total={regularSessionsCount}
            pageSize={pageSize}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
            showTotal={(total) => `Total ${total} sessions`}
          />
        </div>
      )}
    </div>
  );
}

SessionManager.propTypes = {
  node: PropTypes.object.isRequired,
  parents: PropTypes.object,
  updateNodeProperty: PropTypes.func.isRequired,
  onSessionsChange: PropTypes.func,
};

SessionManager.defaultProps = {
  parents: {},
  onSessionsChange: null,
};

export default SessionManager;

