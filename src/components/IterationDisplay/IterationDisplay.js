import React from 'react';
import { Button, Select } from 'antd';
import * as PropTypes from 'prop-types';

const { Option } = Select;

export default class IterationDisplay extends React.Component {
  onKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.addItem(e.target.value);
    }
  };

  addItem = (newItem) => {
    const { createIteration, iterations, setSelectedIteration } = this.props;
    setSelectedIteration(iterations.length);
    createIteration(newItem);
  };

  // eslint-disable-next-line class-methods-use-this
  onClickEditIteration = (selectedIteration) => {
    const { editIteration } = this.props;
    editIteration(selectedIteration);
  };

  render() {
    const { iterations, selectedIteration, setSelectedIteration } = this.props;
    return (
      <>
        <span style={{ fontSize: `large`, marginLeft: `10px` }}>
          Iteration:
        </span>
        <Select
          onSelect={(newValue) => {
            setSelectedIteration(newValue);
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
            Object.values(iterations).map((item) => (
              <Option style={{ width: '100%' }} key={item.id} value={item.id}>
                <span style={{ whiteSpace: 'normal' }}>{item.title}</span>
              </Option>
            ))}
        </Select>
        {selectedIteration !== 0 && (
          <Button onClick={() => this.onClickEditIteration(selectedIteration)}>
            Edit
          </Button>
        )}
      </>
    );
  }
}

IterationDisplay.propTypes = {
  createIteration: PropTypes.func.isRequired,
  editIteration: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types,react/require-default-props
  iterations: PropTypes.object.isRequired,
  selectedIteration: PropTypes.string.isRequired,
  setSelectedIteration: PropTypes.func.isRequired,
};
