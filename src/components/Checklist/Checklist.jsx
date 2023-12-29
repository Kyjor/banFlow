import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'antd';
import Check from '../Check/Check';
import EditableTextArea from '../EditableTextArea/EditableTextArea';

// The callback will be called every 1000 milliseconds.
const Checklist = (props) => {
  const [checks, setChecks] = useState(
    props.checklist.checks ? props.checklist.checks : []
  );
  const [checklist, setChecklist] = useState(props.checklist ?? {});

  useEffect(() => {}, []);
  useEffect(() => {}, [props.checklist]);

  function handleNewCheck() {
    const newCheck = {
      title: 'new',
      isChecked: false,
      timeSpent: 0,
    };
    const newChecklist = {
      ...checklist,
      checks: [...checks, newCheck],
    };
    setChecks([...checks, newCheck]);
    setChecklist(newChecklist);

    props.updateNodeProperty(`checklist`, props.nodeId, newChecklist, true);
  }
  function deleteCheck(index) {
    const newChecks = [...checks];
    newChecks.splice(index, 1);
    const newChecklist = {
      ...checklist,
      checks: newChecks,
    };
    setChecks(newChecks);
    setChecklist(newChecklist);

    props.updateNodeProperty(`checklist`, props.nodeId, newChecklist, true);
  }
  function updateCheck(index, isChecked, title, timeSpent) {
    const newCheck = {
      title,
      isChecked,
      timeSpent,
    };
    const newChecks = [...checks];
    newChecks[index] = newCheck;
    const newChecklist = {
      ...checklist,
      checks: newChecks,
    };
    setChecks(newChecks);
    setChecklist(newChecklist);

    props.updateNodeProperty(`checklist`, props.nodeId, newChecklist, true);
  }
  return (
    <div>
      <EditableTextArea
        defaultValue={props.checklist.title}
        style={{
          width: '100%',
          resize: 'none',
          height: '12px',
          border: 'none',
        }}
        // showCount={this.state.textSelected}
        maxLength={70}
        autoSize={{ maxRows: 1 }}
        updateText={(value) => {
          props.updateNodeProperty(
            `checklist`,
            props.nodeId,
            { ...checklist, title: value },
            true
          );
        }}
      />
      {/* List of checks */}
      <div>
        {checks.map((check, index) => {
          return (
            <Check
              key={index}
              deleteCheck={deleteCheck}
              index={index}
              updateCheck={updateCheck}
              check={check}
            />
          );
        })}
      </div>
      <Button onClick={handleNewCheck}>+ New Check</Button>
    </div>
  );
};

Checklist.propTypes = {
  checklist: PropTypes.object.isRequired,
  nodeId: PropTypes.number.isRequired,
  updateNodeProperty: PropTypes.func.isRequired,
};

export default Checklist;
