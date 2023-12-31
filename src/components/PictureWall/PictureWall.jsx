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

function getCurrentFilenames() {
  console.log('\nCurrent filenames:');
  fs.readdirSync(__dirname).forEach((file) => {
    console.log(file);
  });
}

function getFileName(str) {
  return str.split('\\').pop().split('/').pop();
}

class PictureWall extends Component {
  setCoverImage = this.props.setCoverImage;

  addImageToNode = this.props.addImageToNode;

  state = {
    previewVisible: false,
    previewImage: '',
    previewTitle: '',
    fileList: [],
  };

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
    if (file.status === `removed`) {
      return;
    }
    fileList.splice(fileList.length - 1, 1);
    const newFile = {
      uid: getFileName(this.state.newFile).split(`.`)[0],
      name: getFileName(this.state.newFile),
      status: 'done',
      url: `file:///images/${getFileName(this.state.newFile)}`,
    };
    fileList.push(newFile);
    this.addImageToNode(newFile);
    this.setState({ fileList });
  };

  handleRemove = (file) => {
    console.log(file);
  };

  handleBeforeUpload = (file, fileList) => {
    const imageUpload = `./images/${getFileName(file.path)}`;
    fs.copyFile(file.path, imageUpload, (err) => {
      if (err) {
        console.log('Error Found:', err);
      } else {
        // Get the current filenames
        // after the function
        // console.log("\nFile Contents of copied_file:",
        //   fs.readFileSync(imageUpload));
      }
    });
    this.setState({ newFile: imageUpload });
  };

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
    const { node } = this.props;
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
          visible={previewVisible}
          title={previewTitle}
          footer={[
            <Button
              key="setCover"
              onClick={() => this.setCoverImage(previewImage)}
            >
              Set As Cover
            </Button>,
            <Button key="back" onClick={this.handleCancel}>
              Return
            </Button>,
          ]}
          onCancel={this.handleCancel}
        >
          <img alt="example" style={{ width: '100%' }} src={previewImage} />

          {/* <img id="image-1" data-path="../images/Block.png" /> */}
        </Modal>
      </>
    );
  }
}

export default PictureWall;

PictureWall.propTypes = {
  addImageToNode: PropTypes.func,
  node: PropTypes.object,
  setCoverImage: PropTypes.func,
};
