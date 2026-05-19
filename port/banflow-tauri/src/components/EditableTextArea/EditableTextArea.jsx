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
      defaultValue,
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
        defaultValue={defaultValue}
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
  autoSize: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.shape({
      minRows: PropTypes.number,
      maxRows: PropTypes.number,
    }),
  ]),
  defaultValue: PropTypes.string,
  editing: PropTypes.bool,
  maxLength: PropTypes.number,
  onChange: PropTypes.func,
  onMouseDown: PropTypes.func,
  placeholder: PropTypes.string,
  // eslint-disable-next-line react/forbid-prop-types
  style: PropTypes.object,
  updateText: PropTypes.func.isRequired,
};

EditableTextArea.defaultProps = {
  autoSize: false,
  defaultValue: '',
  editing: false,
  maxLength: undefined,
  onChange: undefined,
  onMouseDown: undefined,
  placeholder: '',
  style: {},
};
