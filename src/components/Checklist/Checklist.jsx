import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'antd';
import Check from '../Check/Check';
import EditableTextArea from '../EditableTextArea/EditableTextArea';

// The callback will be called every 1000 milliseconds.
function Checklist(props) {
  const { checklist, nodeId, updateNodeProperty } = props;
  const [checks, setChecks] = useState(
    checklist.checks ? checklist.checks : [],
  );
  const [checklist_, setChecklist] = useState(checklist ?? {});

  useEffect(() => {}, []);
  useEffect(() => {}, [checklist]);

  function handleNewCheck() {
    const newCheck = {
      title: 'new',
      isChecked: false,
      timeSpent: 0,
    };
    const newChecklist = {
      ...checklist_,
      checks: [...checks, newCheck],
    };
    setChecks([...checks, newCheck]);
    setChecklist(newChecklist);

    updateNodeProperty(`checklist`, nodeId, newChecklist, true);
  }

  function deleteCheck(index) {
    const newChecks = [...checks];
    newChecks.splice(index, 1);
    const newChecklist = {
      ...checklist_,
      checks: newChecks,
    };
    setChecks(newChecks);
    setChecklist(newChecklist);

    updateNodeProperty(`checklist`, nodeId, newChecklist, true);
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
      ...checklist_,
      checks: newChecks,
    };
    setChecks(newChecks);
    setChecklist(newChecklist);

    updateNodeProperty(`checklist`, nodeId, newChecklist, true);
  }

  return (
    <div>
      <EditableTextArea
        defaultValue={checklist.title}
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
          updateNodeProperty(
            `checklist`,
            nodeId,
            { ...checklist_, title: value },
            true,
          );
        }}
      />
      {/* List of checks */}
      <div>
        {checks.map((check, index) => {
          const key = `${index}`;

          return (
            <Check
              key={key}
              deleteCheck={deleteCheck}
              index={index}
              updateCheck={updateCheck}
              check={check}
            />
          );
        })}
      </div>
      {/* eslint-disable-next-line react/jsx-no-bind */}
      <Button onClick={handleNewCheck}>+ New Check</Button>
    </div>
  );
}

Checklist.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types,react/no-unused-prop-types
  check: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  checklist: PropTypes.object.isRequired,
  nodeId: PropTypes.number.isRequired,
  updateNodeProperty: PropTypes.func.isRequired,
};

export default Checklist;
