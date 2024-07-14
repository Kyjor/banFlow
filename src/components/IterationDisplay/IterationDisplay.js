import React from 'react';
import { Select } from 'antd';
import * as PropTypes from 'prop-types';

const { Option } = Select;

export default class IterationDisplay extends React.Component {
  constructor(props) {
    super(props);
    this.state = { selectedIteration: 0 };
  }

  onKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.addItem(e.target.value);
    }
  };

  addItem = (newItem) => {
    const { createIteration, iterations } = this.props;
    this.setState(
      {
        selectedIteration: iterations.length,
      },
      () => {
        createIteration(newItem);
      },
    );
  };

  render() {
    const { selectedIteration } = this.state;
    const { iterations } = this.props;
    console.log(iterations);
    return (
      <Select
        onSelect={(newValue, evt) => {
          // eslint-disable-next-line react/no-unused-class-component-methods
          const newState = {
            ...this.state,
            selectedIteration: newValue,
          };

          this.setState({ ...newState });
        }}
        showSearch
        style={{ width: 200 }}
        placeholder="Add an iteration by typing..."
        onInputKeyDown={this.onKeyDown}
        onSearch={this.onSearch}
        value={selectedIteration}
        // filterOption={(input, option) => true}
      >
        <Option style={{ width: '100%' }} key={0} value={0}>
          <span style={{ whiteSpace: 'normal' }}>Backlog</span>
        </Option>
        {iterations &&
          Object.values(iterations).map((item, index) => (
            <Option style={{ width: '100%' }} key={item.id} value={index + 1}>
              <span style={{ whiteSpace: 'normal' }}>{item.title}</span>
            </Option>
          ))}
      </Select>
    );
  }
}

IterationDisplay.propTypes = {
  currentValue: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types,react/require-default-props
  iterations: PropTypes.array,
  parentEnum: PropTypes.string.isRequired,
  saveMetadataValue: PropTypes.func.isRequired,
  updateNodeEnum: PropTypes.func.isRequired,
};
