import React from 'react';
import { AutoComplete, Input, Tag, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import * as PropTypes from 'prop-types';

export default class EditableTagGroup extends React.Component {
  constructor(props) {
    super();
    const { node, tags } = props;
    this.state = {
      tags: node.tags,
      inputVisible: false,
      inputValue: '',
      dataSource: tags,
    };
  }

  onSelect(value) {
    const { tags } = this.state;
    const { addTagToNode, node } = this.props;

    if (tags.includes(value)) {
      return;
    }
    addTagToNode([...tags, value], node.id);

    this.setState({ tags: [...tags, value] });
  }

  handleSearch = () => {
    this.setState({
      // dataSource: !value ? [] : [value, value + value, value + value + value],
    });
  };

  handleClose = (removedTag) => {
    const { tags } = this.state;
    const tags1 = tags.filter((tag) => tag !== removedTag);
    this.setState({ tags: tags1 });
  };

  showInput = () => {
    this.setState({ inputVisible: true }, () => this.input.focus());
  };

  handleInputChange = (e) => {
    this.setState({ inputValue: e });
  };

  handleInputConfirm = () => {
    const { addTagToNode, createGlobalTag, node } = this.props;
    const { dataSource, inputValue } = this.state;
    let { tags } = this.state;
    if (inputValue && tags.indexOf(inputValue) === -1) {
      tags = [...tags, inputValue];
      // add tag to node's tags
      addTagToNode(tags, node.id);
      // update global tags
      if (!dataSource.includes(inputValue)) {
        createGlobalTag(inputValue);
      }
    }
    this.setState({
      tags,
      inputVisible: false,
      inputValue: '',
    });
  };

  // eslint-disable-next-line no-return-assign
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
            onSelect={this.onSelect}
            onChange={this.handleInputChange}
            onSearch={this.handleSearch}
            filterOption={(inputValue1, option) =>
              option.props.children
                .toUpperCase()
                .indexOf(inputValue1.toUpperCase()) !== -1
            }
          >
            <Input
              ref={this.saveInputRef.bind(this)}
              type="text"
              size="small"
              style={{ width: 78 }}
              value={inputValue}
              // onBlur={this.handleInputConfirm.bind(this)}
              onPressEnter={this.handleInputConfirm}
            />
          </AutoComplete>
        )}
        {!inputVisible && (
          <Tag
            onClick={this.showInput}
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
  addTagToNode: PropTypes.func.isRequired,
  createGlobalTag: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  tags: PropTypes.array.isRequired,
};
