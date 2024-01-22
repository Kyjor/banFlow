import * as fs from 'fs';
import { Button, Modal, Upload } from 'antd';
import React, { Component } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function getFileName(str) {
  return str.split('\\').pop().split('/').pop();
}

class PictureWall extends Component {
  constructor() {
    super();
    this.state = {
      previewVisible: false,
      previewImage: '',
      previewTitle: '',
      fileList: [],
    };
  }

  handleCancel = () => this.setState({ previewVisible: false });

  handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }

    this.setState({
      previewImage: file.url || file.preview,
      previewVisible: true,
      previewTitle:
        file.name || file.url.substring(file.url.lastIndexOf('/') + 1),
    });
  };

  handleChange = ({ file, fileList }) => {
    const { newFile } = this.state;
    if (file.status === `removed`) {
      return;
    }
    fileList.splice(fileList.length - 1, 1);
    const newFile1 = {
      uid: getFileName(newFile).split(`.`)[0],
      name: getFileName(newFile),
      status: 'done',
      url: `file:///images/${getFileName(newFile)}`,
    };
    fileList.push(newFile1);
    this.addImageToNode(newFile1);
    this.setState({ fileList });
  };

  // eslint-disable-next-line class-methods-use-this
  handleRemove = (file) => {
    console.log(file);
  };

  handleBeforeUpload = (file) => {
    const imageUpload = `./images/${getFileName(file.path)}`;
    fs.copyFile(file.path, imageUpload, () => {});
    this.setState({ newFile: imageUpload });
  };

  // eslint-disable-next-line class-methods-use-this,react/no-unused-class-component-methods
  convert = async (url) => {
    const data = await fetch(url);
    const blob = await data.blob();
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const base64data = reader.result;
      return base64data;
    };
  };

  render() {
    const { node, setCoverImage } = this.props;
    const { previewVisible, previewImage, fileList, previewTitle } = this.state;
    const uploadButton = (
      <div>
        <PlusOutlined />
        <div style={{ marginTop: 8 }}>Upload</div>
      </div>
    );
    return (
      <>
        <Upload
          // action="https://www.mocky.io/v2/5cc8019d300000980a055e76"
          listType="picture-node"
          fileList={node.images}
          onPreview={this.handlePreview}
          onChange={this.handleChange}
          onRemove={this.handleRemove}
          beforeUpload={this.handleBeforeUpload}
        >
          {fileList.length >= 8 ? null : uploadButton}
        </Upload>
        <Modal
          open={previewVisible}
          title={previewTitle}
          footer={[
            <Button key="setCover" onClick={() => setCoverImage(previewImage)}>
              Set As Cover
            </Button>,
            <Button key="back" onClick={this.handleCancel}>
              Return
            </Button>,
          ]}
          onCancel={this.handleCancel}
        >
          <img alt="example" style={{ width: '100%' }} src={previewImage} />
        </Modal>
      </>
    );
  }
}

export default PictureWall;

PictureWall.propTypes = {
  addImageToNode: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
  setCoverImage: PropTypes.func.isRequired,
};
