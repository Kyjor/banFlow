import React from 'react';
import PropTypes from 'prop-types';
import { TreeSelect } from 'antd';

class AntTreeSelect extends React.Component {
  render() {
    const { nodes } = this.props;
    const { onSelect } = this.props;
    const { defaultValue } = this.props;
    const { value } = this.props;
    const { disabled } = this.props;
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
          disabled={disabled}
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
  defaultValue: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  nodes: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
};
