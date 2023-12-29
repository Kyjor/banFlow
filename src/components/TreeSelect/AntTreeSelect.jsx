import React from 'react';
import PropTypes from 'prop-types';
import { TreeSelect } from 'antd';

class AntTreeSelect extends React.Component {
  state = {
    value: undefined,
  };

  onChange = (value) => {
    this.setState({ value });
  };

  render() {
    const { nodes } = this.props;
    const { onSelect } = this.props;
    const { defaultValue } = this.props;
    const { value } = this.props;
    return (
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-around',
        }}
      >
        <TreeSelect
          showSearch
          style={{ width: '95%' }}
          defaultValue={defaultValue ?? undefined}
          value={value ?? undefined}
          dropdownStyle={{ maxHeight: 150, overflowY: 'auto' }}
          treeData={nodes}
          placeholder="Please select"
          // treeDefaultExpandAll
          onChange={this.onChange}
          onSelect={onSelect}
          treeNodeFilterProp="title"
        />
      </div>
    );
  }
}

export default AntTreeSelect;

AntTreeSelect.propTypes = {
  defaultValue: PropTypes.string,
  nodes: PropTypes.array,
  onSelect: PropTypes.func,
  value: PropTypes.string,
};
