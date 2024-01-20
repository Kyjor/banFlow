import React from 'react';
import { Input } from 'antd';
import * as PropTypes from 'prop-types';

const { TextArea } = Input;

class EditableTextArea extends React.Component {
  componentDidMount() {
    this.focus();
  }

  focus = () => {
    const { editing } = this.props;
    if (editing) {
      this.textInput.focus();
    }
  };

  // eslint-disable-next-line class-methods-use-this
  handleOnFocus = (event) => {
    if (
      event.target.value === `New Node` ||
      event.target.value === `New Parent`
    ) {
      event.target.select();
    }
  };

  render() {
    const {
      autoSize,
      maxLength,
      onChange,
      onMouseDown,
      placeholder,
      style,
      updateText,
    } = this.props;

    return (
      <TextArea
        ref={(input) => {
          this.textInput = input;
        }}
        // style={{border:"none"}}
        defaultValue={this.props.defaultValue}
        onClick={(e) => {
          e.preventDefault();
        }}
        onBlur={(evt) => updateText(evt.currentTarget.value)}
        // showCount={this.state.modalDescriptionSelected}
        onFocus={this.handleOnFocus}
        onChange={onChange}
        onMouseDown={onMouseDown}
        maxLength={maxLength}
        autoSize={autoSize}
        style={style}
        placeholder={placeholder}
        onPressEnter={(evt) => {
          // eslint-disable-next-line no-unused-expressions
          evt.keyCode === 13 && !evt.shiftKey
            ? (evt.currentTarget.blur(), updateText(evt.currentTarget.value))
            : console.log(`newline`);
        }}
      />
    );
  }
}

export default EditableTextArea;

EditableTextArea.propTypes = {
  autoSize: PropTypes.bool.isRequired,
  defaultValue: PropTypes.string.isRequired,
  editing: PropTypes.bool.isRequired,
  maxLength: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onMouseDown: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  style: PropTypes.object.isRequired,
  updateText: PropTypes.func.isRequired,
};
