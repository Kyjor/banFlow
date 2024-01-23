import React from 'react';
import { Select } from 'antd';
import * as PropTypes from 'prop-types';

const { Option } = Select;

function CustomSelectOption(props) {
  const { item } = props;

  return <span style={{ whiteSpace: 'normal' }}>{item}</span>;
}

CustomSelectOption.propTypes = { item: PropTypes.string.isRequired };

export default class CustomSelect extends React.Component {
  constructor(props) {
    super();
    const { currentValue, items } = props;
    this.state = { items, value: currentValue };
  }

  onKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.addItem(e.target.value);
    }
  };

  onDelete(val) {
    const { items } = this.state;
    items.splice(items.indexOf(val), 1);
    this.setState({
      items,
      value: null,
    });
  }

  addItem = (newItem) => {
    const { node, parentEnum, saveMetadataValue, updateNodeEnum } = this.props;
    const { items } = this.state;
    const newItems = [...items, `${newItem}`];
    this.setState({
      items: newItems,
      value: newItem,
    });
    saveMetadataValue(newItem, parentEnum);
    updateNodeEnum(newItem, parentEnum, node);
  };

  render() {
    const { items, value } = this.state;
    const { node } = this.props;
    return (
      <Select
        showSearch
        defaultValue={node.nodeType}
        ref={(select) => {
          // eslint-disable-next-line react/no-unused-class-component-methods
          this.select = select;
        }}
        style={{ width: 200 }}
        placeholder="Add an item"
        onInputKeyDown={this.onKeyDown}
        onSearch={this.onSearch}
        value={value}
        // filterOption={(input, option) => true}
      >
        {items &&
          items.map((item) => (
            <Option style={{ width: '100%' }} key={item}>
              <CustomSelectOption item={item} onDelete={this.onDelete} />
            </Option>
          ))}
      </Select>
    );
  }
}
CustomSelect.propTypes = {
  currentValue: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types,react/require-default-props
  items: PropTypes.array,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
  parentEnum: PropTypes.string.isRequired,
  saveMetadataValue: PropTypes.func.isRequired,
  updateNodeEnum: PropTypes.func.isRequired,
};
