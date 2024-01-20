import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import EditableTextArea from '../EditableTextArea/EditableTextArea';

// The callback will be called every 1000 milliseconds.
function Check(props) {
  const { check, deleteCheck, index, updateCheck } = props;

  const [isChecked, setIsChecked] = useState(
    check.isChecked ? check.isChecked : false,
  );
  const [checkTitle, setCheckTitle] = useState(check.title ?? '');
  const [checkTimeSpent] = useState(check.timeSpent ?? 0);
  const [isHoveringContainer, setIsHoveringContainer] = useState(false);
  const [isHoveringClose, setIsHoveringClose] = useState(false);

  function handleDeleteCheck() {
    console.log('delete check');
    deleteCheck(index);
  }

  useEffect(() => {}, []);
  useEffect(() => {}, [check]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '400px',
        borderRadius: '5px',
        backgroundColor: `${isHoveringContainer ? `#e4e4e4` : `transparent`}`,
        alignItems: 'baseline',
        paddingLeft: '5px',
      }}
      onMouseOver={() => {
        setIsHoveringContainer(true);
      }}
      onMouseOut={() => {
        setIsHoveringContainer(false);
      }}
      onFocus={() => {
        console.log('todo: blur ally');
      }}
      onBlur={() => {
        console.log('todo: blur ally');
      }}
    >
      <Checkbox
        defaultChecked={isChecked}
        onChange={(e) => {
          setIsChecked(e.target.checked);
          updateCheck(index, e.target.checked, checkTitle, checkTimeSpent);
        }}
      />
      <EditableTextArea
        defaultValue={checkTitle}
        style={{
          width: '300px',
          resize: 'none',
          height: '12px',
          border: 'none',
          // backgroundColor: 'transparent',
        }}
        // showCount={this.state.textSelected}
        maxLength={70}
        autoSize={{ maxRows: 1 }}
        updateText={(value) => {
          setCheckTitle(value);
          updateCheck(index, isChecked, value, checkTimeSpent);
        }}
      />
      <div
        style={{
          marginLeft: 'auto',
          marginRight: '5px',
        }}
      >
        00:00:00
      </div>
      <CloseOutlined
        style={{
          alignSelf: 'center',
          cursor: 'pointer',
          color: `${isHoveringClose ? `black` : `inherit`}`,
          marginRight: '5px',
        }}
        onMouseOver={() => {
          setIsHoveringClose(true);
        }}
        onMouseOut={() => {
          setIsHoveringClose(false);
        }}
        onClick={handleDeleteCheck}
      />
    </div>
  );
}

Check.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  check: PropTypes.object.isRequired,
  deleteCheck: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  updateCheck: PropTypes.func.isRequired,
};

export default Check;
