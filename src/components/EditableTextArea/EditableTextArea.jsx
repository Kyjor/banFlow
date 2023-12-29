import React from 'react';
import { Input } from 'antd';
import * as PropTypes from 'prop-types';

const { TextArea } = Input;

class EditableTextArea extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      textSelected: false,
    };
  }

  componentDidMount() {
    this.focus();
  }

  focus = () => {
    if (this.props.editing) {
      this.textInput.focus();
    }
  };

  handleOnFocus = (event) => {
    if (
      event.target.value === `New Node` ||
      event.target.value === `New Parent`
    ) {
      event.target.select();
    }
  };

  render() {
    return (
      <TextArea
        ref={(input) => {
          this.textInput = input;
        }}
        // style={{border:"none"}}
        defaultValue={this.props.defaultValue}
        onClick={(e) => {
          e.preventDefault();
          this.setState({
            textSelected: true,
          });
        }}
        onBlur={(evt) => (
          this.setState({ textSelected: false }),
          this.props.updateText(evt.currentTarget.value)
        )}
        // showCount={this.state.modalDescriptionSelected}
        onFocus={this.handleOnFocus}
        onChange={this.props.onChange}
        onMouseDown={this.props.onMouseDown}
        maxLength={this.props.maxLength}
        autoSize={this.props.autoSize}
        style={this.props.style}
        placeholder={this.props.placeholder}
        onPressEnter={(evt) => {
          evt.keyCode == 13 && !evt.shiftKey
            ? (evt.currentTarget.blur(),
              this.props.updateText(evt.currentTarget.value))
            : console.log(`newline`);
        }}
      />
    );
  }
}

export default EditableTextArea;

EditableTextArea.propTypes = {
  autoSize: PropTypes.bool,
  defaultValue: PropTypes.string,
  editing: PropTypes.bool,
  maxLength: PropTypes.number,
  onChange: PropTypes.func,
  onMouseDown: PropTypes.func,
  placeholder: PropTypes.string,
  style: PropTypes.object,
  updateText: PropTypes.func,
};
