import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ipcRenderer } from 'electron';
import { Typography } from 'antd';

const { Text } = Typography;

// Image Thumbnail Component
class ImageThumbnail extends Component {
  constructor(props) {
    super(props);
    this.state = {
      imageSrc: null,
      loading: true,
      error: false,
    };
  }

  componentDidMount() {
    this.loadImage();
  }

  loadImage = async () => {
    try {
      const { image, projectName, isGlobal } = this.props;
      const dataUrl = await ipcRenderer.invoke(
        'docs:getImage',
        image.path,
        projectName,
        isGlobal,
      );
      this.setState({ imageSrc: dataUrl, loading: false });
    } catch (error) {
      console.error('Error loading image:', error);
      this.setState({ error: true, loading: false });
    }
  };

  render() {
    const { imageSrc, loading, error } = this.state;
    const { image } = this.props;

    if (error) {
      return (
        <div
          style={{
            height: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
          }}
        >
          <Text type="secondary">Failed to load</Text>
        </div>
      );
    }

    if (loading) {
      return (
        <div
          style={{
            height: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
          }}
        >
          <Text type="secondary">Loading...</Text>
        </div>
      );
    }

    return (
      <div
        style={{
          height: '150px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <img
          src={imageSrc}
          alt={image.name}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }
}

ImageThumbnail.propTypes = {
  image: PropTypes.shape({
    path: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  projectName: PropTypes.string.isRequired,
  isGlobal: PropTypes.bool.isRequired,
};

export default ImageThumbnail;
