import React from 'react';
import { Select } from 'antd';
import * as PropTypes from 'prop-types';

const { Option } = Select;

function CustomSelectOption(props) {
  const { item } = props;

  return <span style={{ whiteSpace: 'normal' }}>{item}</span>;
}

CustomSelectOption.propTypes = { item: PropTypes.string };

export default class CustomSelect extends React.Component {
  state = {
    items: this.props.items,
    isOpen: false,
    value: this.props.currentValue,
  };

  addItem = (newItem) => {
    const { items } = this.state;
    const newItems = [...items, `${newItem}`];
    this.setState({
      items: newItems,
      value: newItem,
    });
    this.props.saveMetadataValue(newItem, this.props.parentEnum);
    this.props.updateNodeEnum(newItem, this.props.parentEnum, this.props.node);
  };

  updateOption = () => {
    this.setState({ mustFocusOption: false });
  };

  onChange = (value) => {
    console.log(`selected ${value}`);
    if (this.state.items.includes(value)) {
      this.setState({ value });
      this.props.updateNodeEnum(value, this.props.parentEnum, this.props.node);
    }
  };

  onKeyDown = (e) => {
    if (e.key === 'Enter') {
      console.log(`add ${e.target.value}`);
      this.addItem(e.target.value);
    }
  };

  onBlur = () => {};

  onFocus = () => {};

  onSearch = (val) => {};

  onDelete(val) {
    console.log('delete:', val);
    const { items } = this.state;
    items.splice(items.indexOf(val), 1);
    this.setState({
      items,
      value: null,
    });
  }

  render() {
    return (
      <Select
        showSearch
        defaultValue={this.props.node.nodeType}
        ref={(select) => {
          this.select = select;
        }}
        style={{ width: 200 }}
        placeholder="Add an item"
        onChange={this.onChange}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        onInputKeyDown={this.onKeyDown}
        onSearch={this.onSearch}
        value={this.state.value}
        filterOption={(input, option) => true}
      >
        {this.state.items &&
          this.state.items.map((item) => (
            <Option style={{ width: '100%' }} key={item}>
              <CustomSelectOption item={item} onDelete={this.onDelete} />
            </Option>
          ))}
      </Select>
    );
  }
}
CustomSelect.propTypes = {
  currentValue: PropTypes.string,
  items: PropTypes.array,
  node: PropTypes.object,
  parentEnum: PropTypes.string,
};
