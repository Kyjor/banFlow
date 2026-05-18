import React from 'react';
import PropTypes from 'prop-types';
import {
  Row,
  Col,
  Card,
  Space,
  Tag,
  Empty,
  Spin,
  Typography,
  List,
} from 'antd';

const { Title, Text } = Typography;

const renderProperties = (asepriteData, title) => {
  if (!asepriteData || !asepriteData.properties) {
    return (
      <Empty
        description="No data available"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const { properties: props, aseData } = asepriteData;

  return (
    <div style={{ padding: '16px' }}>
      <Title level={5} style={{ marginBottom: '12px' }}>
        {title}
      </Title>
      <Row gutter={[16, 8]}>
        <Col span={12}>
          <Text strong>File Size:</Text> {props.fileSize} bytes
        </Col>
        <Col span={12}>
          <Text strong>Dimensions:</Text> {props.width} × {props.height}
        </Col>
        <Col span={12}>
          <Text strong>Frames:</Text> {props.numFrames}
        </Col>
        <Col span={12}>
          <Text strong>Color Depth:</Text> {props.colorDepth} bpp
        </Col>
        <Col span={12}>
          <Text strong>Colors:</Text> {props.numColors}
        </Col>
        <Col span={12}>
          <Text strong>Pixel Ratio:</Text> {props.pixelRatio}
        </Col>
        <Col span={12}>
          <Text strong>Layers:</Text> {props.layers}
        </Col>
        <Col span={12}>
          <Text strong>Tags:</Text> {props.tags}
        </Col>
        <Col span={12}>
          <Text strong>Tilesets:</Text> {props.tilesets}
        </Col>
        <Col span={12}>
          <Text strong>Slices:</Text> {props.slices}
        </Col>
      </Row>

      {aseData && (
        <>
          {aseData.frames && aseData.frames.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Text strong>Frame Details:</Text>
              <List
                size="small"
                dataSource={aseData.frames.slice(0, 5)}
                renderItem={(frame) => (
                  <List.Item>
                    Frame {frame.index}: {frame.duration}ms ({frame.celCount}{' '}
                    cels)
                  </List.Item>
                )}
              />
              {aseData.frames.length > 5 && (
                <Text type="secondary">
                  ... and {aseData.frames.length - 5} more frames
                </Text>
              )}
            </div>
          )}

          {aseData.layers && aseData.layers.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Text strong>Layers:</Text>
              <List
                size="small"
                dataSource={aseData.layers}
                renderItem={(layer) => (
                  <List.Item>
                    {layer.name} (opacity: {layer.opacity}, type: {layer.type})
                  </List.Item>
                )}
              />
            </div>
          )}

          {aseData.tags && aseData.tags.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Text strong>Tags:</Text>
              <List
                size="small"
                dataSource={aseData.tags}
                renderItem={(tag) => (
                  <List.Item>
                    {tag.name}: frames {tag.from}-{tag.to} ({tag.animDirection})
                  </List.Item>
                )}
              />
            </div>
          )}

          {aseData.palette && (
            <div style={{ marginTop: '16px' }}>
              <Text strong>Palette:</Text>
              <Text>
                {' '}
                {aseData.palette.colorCount} colors (index{' '}
                {aseData.palette.firstColor}-{aseData.palette.lastColor})
              </Text>
            </div>
          )}

          {aseData.colorProfile && (
            <div style={{ marginTop: '16px' }}>
              <Text strong>Color Profile:</Text>
              <Text> {aseData.colorProfile.type}</Text>
              {aseData.colorProfile.fGamma && (
                <Text> (gamma: {aseData.colorProfile.fGamma})</Text>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default function AsepriteDiffRenderer({
  loadingAseprite,
  originalAseprite,
  modifiedAseprite,
}) {
  if (loadingAseprite) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading Aseprite files...</Text>
        </div>
      </div>
    );
  }

  const isNewAseprite = !originalAseprite && modifiedAseprite;
  const isDeletedAseprite = originalAseprite && !modifiedAseprite;
  const isModifiedAseprite = originalAseprite && modifiedAseprite;

  const origProps = originalAseprite?.properties || {};
  const modProps = modifiedAseprite?.properties || {};
  const changes = Object.keys(modProps)
    .filter((key) => origProps[key] !== modProps[key])
    .map((key) => ({
      property: key,
      original: origProps[key],
      modified: modProps[key],
    }));

  return (
    <div className="aseprite-diff-container" style={{ padding: '20px' }}>
      <Row gutter={16}>
        <Col span={isNewAseprite || isDeletedAseprite ? 24 : 12}>
          <Card
            size="small"
            title={
              <Space>
                <Text strong>Original</Text>
                {isDeletedAseprite && <Tag color="red">Deleted</Tag>}
                {isNewAseprite && <Tag color="blue">New File</Tag>}
              </Space>
            }
          >
            {originalAseprite ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <img
                    src={originalAseprite.dataUrl}
                    alt="Original Aseprite"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                {renderProperties(originalAseprite, 'Original Properties')}
              </div>
            ) : (
              <Empty
                description={
                  isNewAseprite ? 'New Aseprite file' : 'No original version'
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>

        {!isNewAseprite && !isDeletedAseprite && (
          <Col span={12}>
            <Card
              size="small"
              title={
                <Space>
                  <Text strong>Modified</Text>
                  {isModifiedAseprite && <Tag color="green">Changed</Tag>}
                </Space>
              }
            >
              {modifiedAseprite ? (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <img
                      src={modifiedAseprite.dataUrl}
                      alt="Modified Aseprite"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '400px',
                        objectFit: 'contain',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  {renderProperties(modifiedAseprite, 'Modified Properties')}
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

        {isNewAseprite && (
          <Col span={12}>
            <Card
              size="small"
              title={
                <Space>
                  <Text strong>New Aseprite</Text>
                  <Tag color="green">Added</Tag>
                </Space>
              }
            >
              {modifiedAseprite ? (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <img
                      src={modifiedAseprite.dataUrl}
                      alt="New Aseprite"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '400px',
                        objectFit: 'contain',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  {renderProperties(modifiedAseprite, 'New File Properties')}
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

      {isModifiedAseprite && changes.length > 0 && (
        <Card
          size="small"
          title={<Text strong>Property Changes</Text>}
          style={{ marginTop: '16px' }}
        >
          <List
            size="small"
            dataSource={changes}
            renderItem={(change) => (
              <List.Item>
                <Text strong>{change.property}:</Text>{' '}
                <Text delete style={{ color: '#cb2431' }}>
                  {change.original}
                </Text>{' '}
                → <Text style={{ color: '#22863a' }}>{change.modified}</Text>
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}

AsepriteDiffRenderer.propTypes = {
  loadingAseprite: PropTypes.bool,
  originalAseprite: PropTypes.shape({
    dataUrl: PropTypes.string,
    properties: PropTypes.shape({
      fileSize: PropTypes.number,
      numFrames: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number,
      colorDepth: PropTypes.number,
      paletteIndex: PropTypes.number,
      numColors: PropTypes.number,
      pixelRatio: PropTypes.string,
      name: PropTypes.string,
      layers: PropTypes.number,
      tags: PropTypes.number,
      tilesets: PropTypes.number,
      slices: PropTypes.number,
    }),
    aseData: PropTypes.shape({
      numFrames: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number,
      colorDepth: PropTypes.number,
      numColors: PropTypes.number,
      pixelRatio: PropTypes.string,
      frames: PropTypes.arrayOf(
        PropTypes.shape({
          index: PropTypes.number,
          duration: PropTypes.number,
          bytesInFrame: PropTypes.number,
          celCount: PropTypes.number,
        }),
      ),
      layers: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          type: PropTypes.number,
          opacity: PropTypes.number,
          flags: PropTypes.shape({
            visible: PropTypes.bool,
            editable: PropTypes.bool,
            lockMovement: PropTypes.bool,
            preferLinkedCels: PropTypes.bool,
            collapsedGroup: PropTypes.bool,
            reference: PropTypes.bool,
          }),
          layerChildLevel: PropTypes.number,
        }),
      ),
      tags: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          from: PropTypes.number,
          to: PropTypes.number,
          animDirection: PropTypes.string,
          repeat: PropTypes.number,
          color: PropTypes.string,
        }),
      ),
      palette: PropTypes.shape({
        paletteSize: PropTypes.number,
        firstColor: PropTypes.number,
        lastColor: PropTypes.number,
        colorCount: PropTypes.number,
      }),
      colorProfile: PropTypes.shape({
        type: PropTypes.string,
        flag: PropTypes.number,
        fGamma: PropTypes.number,
      }),
      tilesets: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number,
          name: PropTypes.string,
          tileCount: PropTypes.number,
          tileWidth: PropTypes.number,
          tileHeight: PropTypes.number,
        }),
      ),
      slices: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          flags: PropTypes.number,
          keyCount: PropTypes.number,
        }),
      ),
    }),
  }),
  modifiedAseprite: PropTypes.shape({
    dataUrl: PropTypes.string,
    properties: PropTypes.shape({
      fileSize: PropTypes.number,
      numFrames: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number,
      colorDepth: PropTypes.number,
      paletteIndex: PropTypes.number,
      numColors: PropTypes.number,
      pixelRatio: PropTypes.string,
      name: PropTypes.string,
      layers: PropTypes.number,
      tags: PropTypes.number,
      tilesets: PropTypes.number,
      slices: PropTypes.number,
    }),
    aseData: PropTypes.shape({
      numFrames: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number,
      colorDepth: PropTypes.number,
      numColors: PropTypes.number,
      pixelRatio: PropTypes.string,
      frames: PropTypes.arrayOf(
        PropTypes.shape({
          index: PropTypes.number,
          duration: PropTypes.number,
          bytesInFrame: PropTypes.number,
          celCount: PropTypes.number,
        }),
      ),
      layers: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          type: PropTypes.number,
          opacity: PropTypes.number,
          flags: PropTypes.shape({
            visible: PropTypes.bool,
            editable: PropTypes.bool,
            lockMovement: PropTypes.bool,
            preferLinkedCels: PropTypes.bool,
            collapsedGroup: PropTypes.bool,
            reference: PropTypes.bool,
          }),
          layerChildLevel: PropTypes.number,
        }),
      ),
      tags: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          from: PropTypes.number,
          to: PropTypes.number,
          animDirection: PropTypes.string,
          repeat: PropTypes.number,
          color: PropTypes.string,
        }),
      ),
      palette: PropTypes.shape({
        paletteSize: PropTypes.number,
        firstColor: PropTypes.number,
        lastColor: PropTypes.number,
        colorCount: PropTypes.number,
      }),
      colorProfile: PropTypes.shape({
        type: PropTypes.string,
        flag: PropTypes.number,
        fGamma: PropTypes.number,
      }),
      tilesets: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number,
          name: PropTypes.string,
          tileCount: PropTypes.number,
          tileWidth: PropTypes.number,
          tileHeight: PropTypes.number,
        }),
      ),
      slices: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          flags: PropTypes.number,
          keyCount: PropTypes.number,
        }),
      ),
    }),
  }),
};

AsepriteDiffRenderer.defaultProps = {
  loadingAseprite: false,
  originalAseprite: null,
  modifiedAseprite: null,
};
