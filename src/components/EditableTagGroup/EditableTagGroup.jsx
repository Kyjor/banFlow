import React from 'react';
import { Tag, Input, Tooltip, Icon, AutoComplete } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import * as PropTypes from 'prop-types';
import CustomSelect from '../CustomSelect/CustomSelect';

export default class EditableTagGroup extends React.Component {
  state = {
    tags: this.props.node.tags,
    inputVisible: false,
    inputValue: '',
    dataSource: this.props.tags,
  };

  onSelect(value) {
    console.log('onSelect', value);
    if (this.state.tags.includes(value)) {
      return;
    }
    this.props.addTagToNode([...this.state.tags, value], this.props.node.id);

    this.setState({ tags: [...this.state.tags, value] });
  }

  handleSearch = (value) => {
    this.setState({
      // dataSource: !value ? [] : [value, value + value, value + value + value],
    });
  };

  handleKeyPress = (ev) => {
    console.log('handleKeyPress', ev);
  };

  handleClose = (removedTag) => {
    const tags = this.state.tags.filter((tag) => tag !== removedTag);
    console.log(tags);
    this.setState({ tags });
  };

  showInput = () => {
    this.setState({ inputVisible: true }, () => this.input.focus());
  };

  handleInputChange = (e) => {
    this.setState({ inputValue: e });
  };

  handleInputConfirm = () => {
    const { inputValue } = this.state;
    let { tags } = this.state;
    if (inputValue && tags.indexOf(inputValue) === -1) {
      tags = [...tags, inputValue];
      // add tag to node's tags
      this.props.addTagToNode(tags, this.props.node.id);
      // update global tags
      if (!this.state.dataSource.includes(inputValue)) {
        this.props.createGlobalTag(inputValue);
      }
    }
    console.log(tags);
    this.setState({
      tags,
      inputVisible: false,
      inputValue: '',
    });
  };

  saveInputRef = (input) => (this.input = input);

  render() {
    const { tags, inputVisible, inputValue, dataSource } = this.state;

    return (
      <div>
        {tags.map((tag, index) => {
          const isLongTag = tag.length > 20;
          const tagElem = (
            <Tag
              key={tag}
              closable={index !== 0}
              onClose={() => this.handleClose(tag)}
            >
              {isLongTag ? `${tag.slice(0, 20)}...` : tag}
            </Tag>
          );
          return isLongTag ? (
            <Tooltip title={tag} key={tag}>
              {tagElem}
            </Tooltip>
          ) : (
            tagElem
          );
        })}
        {inputVisible && (
          <AutoComplete
            dataSource={dataSource}
            style={{ width: 200 }}
            onSelect={this.onSelect.bind(this)}
            onChange={this.handleInputChange.bind(this)}
            onSearch={this.handleSearch.bind(this)}
            filterOption={(inputValue, option) =>
              option.props.children
                .toUpperCase()
                .indexOf(inputValue.toUpperCase()) !== -1
            }
          >
            <Input
              ref={this.saveInputRef.bind(this)}
              type="text"
              size="small"
              style={{ width: 78 }}
              value={inputValue}
              // onBlur={this.handleInputConfirm.bind(this)}
              onPressEnter={this.handleInputConfirm.bind(this)}
            />
          </AutoComplete>
        )}
        {!inputVisible && (
          <Tag
            onClick={this.showInput.bind(this)}
            style={{
              // background: '#fff',
              borderStyle: 'dashed',
            }}
          >
            <PlusOutlined /> New Tag
          </Tag>
        )}
      </div>
    );
  }
}

EditableTagGroup.propTypes = {
  addTagToNode: PropTypes.func,
  createGlobalTag: PropTypes.func,
  node: PropTypes.object,
  tags: PropTypes.array,
};
