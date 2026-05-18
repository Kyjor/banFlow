import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Card, Space, Tag, Empty, Spin, Typography } from 'antd';

const { Text } = Typography;

export default function ImageDiffRenderer({
  loadingImages,
  originalImage,
  modifiedImage,
}) {
  if (loadingImages) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading images...</Text>
        </div>
      </div>
    );
  }

  const isNewImage = !originalImage && modifiedImage;
  const isDeletedImage = originalImage && !modifiedImage;
  const isModifiedImage = originalImage && modifiedImage;

  return (
    <div className="image-diff-container" style={{ padding: '20px' }}>
      <Row gutter={16}>
        <Col span={isNewImage || isDeletedImage ? 24 : 12}>
          <Card
            size="small"
            title={
              <Space>
                <Text strong>Original</Text>
                {isDeletedImage && <Tag color="red">Deleted</Tag>}
                {isNewImage && <Tag color="blue">New File</Tag>}
              </Space>
            }
          >
            {originalImage ? (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={originalImage}
                  alt="Original"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '500px',
                    objectFit: 'contain',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                  }}
                />
              </div>
            ) : (
              <Empty
                description={
                  isNewImage ? 'New image file' : 'No original version'
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>

        {!isNewImage && !isDeletedImage && (
          <Col span={12}>
            <Card
              size="small"
              title={
                <Space>
                  <Text strong>Modified</Text>
                  {isModifiedImage && <Tag color="green">Changed</Tag>}
                </Space>
              }
            >
              {modifiedImage ? (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={modifiedImage}
                    alt="Modified"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '500px',
                      objectFit: 'contain',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              ) : (
                <Empty
                  description="No modified version"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Col>
        )}

        {isNewImage && (
          <Col span={12}>
            <Card
              size="small"
              title={
                <Space>
                  <Text strong>New Image</Text>
                  <Tag color="green">Added</Tag>
                </Space>
              }
            >
              {modifiedImage ? (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={modifiedImage}
                    alt="New"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '500px',
                      objectFit: 'contain',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              ) : (
                <Empty
                  description="Loading..."
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}

ImageDiffRenderer.propTypes = {
  loadingImages: PropTypes.bool,
  originalImage: PropTypes.string,
  modifiedImage: PropTypes.string,
};

ImageDiffRenderer.defaultProps = {
  loadingImages: false,
  originalImage: null,
  modifiedImage: null,
};
