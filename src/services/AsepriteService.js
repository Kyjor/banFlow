const Aseprite = require('ase-parser');
const sharp = require('sharp');

class AsepriteService {
  /**
   * Parse an Aseprite file and generate a PNG preview of the first frame
   * @param {Buffer} buffer - The Aseprite file buffer
   * @param {string} filename - The filename (for error messages)
   * @returns {Promise<Object>} - Object containing parsed data and PNG preview
   */
  static async parseAsepriteFile(buffer, filename) {
    try {
      const ase = new Aseprite(buffer, filename);
      ase.parse();

      // Generate PNG preview of first frame
      const pngBuffer = await this.generateFramePreview(ase, 0);

      // Convert PNG buffer to data URL
      const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;

      // Extract all properties for display
      const properties = this.extractProperties(ase);

      return {
        success: true,
        dataUrl,
        properties,
        aseData: {
          numFrames: ase.numFrames,
          width: ase.width,
          height: ase.height,
          colorDepth: ase.colorDepth,
          numColors: ase.numColors,
          pixelRatio: ase.pixelRatio,
          frames: ase.frames?.map((frame, index) => ({
            index,
            duration: frame.frameDuration,
            bytesInFrame: frame.bytesInFrame,
            celCount: frame.cels?.length || 0,
          })),
          layers: ase.layers?.map((layer) => ({
            name: layer.name,
            type: layer.type,
            opacity: layer.opacity,
            flags: layer.flags,
            layerChildLevel: layer.layerChildLevel,
          })),
          tags: ase.tags?.map((tag) => ({
            name: tag.name,
            from: tag.from,
            to: tag.to,
            animDirection: tag.animDirection,
            repeat: tag.repeat,
            color: tag.color,
          })),
          palette: ase.palette
            ? {
                paletteSize: ase.palette.paletteSize,
                firstColor: ase.palette.firstColor,
                lastColor: ase.palette.lastColor,
                colorCount: ase.palette.colors?.length || 0,
              }
            : null,
          colorProfile: ase.colorProfile
            ? {
                type: ase.colorProfile.type,
                flag: ase.colorProfile.flag,
                fGamma: ase.colorProfile.fGamma,
              }
            : null,
          tilesets: ase.tilesets?.map((tileset) => ({
            id: tileset.id,
            name: tileset.name,
            tileCount: tileset.tileCount,
            tileWidth: tileset.tileWidth,
            tileHeight: tileset.tileHeight,
          })),
          slices: ase.slices?.map((slice) => ({
            name: slice.name,
            flags: slice.flags,
            keyCount: slice.keys?.length || 0,
          })),
        },
      };
    } catch (error) {
      console.error('Error parsing Aseprite file:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate a PNG preview of a specific frame
   * @param {Aseprite} ase - Parsed Aseprite object
   * @param {number} frameIndex - Index of the frame to render
   * @returns {Promise<Buffer>} - PNG buffer
   */
  static async generateFramePreview(ase, frameIndex = 0) {
    if (!ase.frames || frameIndex >= ase.frames.length) {
      throw new Error(`Frame ${frameIndex} does not exist`);
    }

    const frame = ase.frames[frameIndex];
    const cels = frame.cels
      ? [...frame.cels].sort((a, b) => {
          const orderA = a.layerIndex + a.zIndex;
          const orderB = b.layerIndex + b.zIndex;
          return orderA - orderB || a.zIndex - b.zIndex;
        })
      : [];

    // Create a blank PNG image buffer
    const bgBuffer = await sharp({
      create: {
        width: ase.width,
        height: ase.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    // Create PNG buffers for each cel
    const celPromises = cels.map((cel) => {
      if (!cel.rawCelData || cel.w === 0 || cel.h === 0) {
        return null;
      }
      return sharp(cel.rawCelData, {
        raw: { width: cel.w, height: cel.h, channels: 4 },
      })
        .png()
        .toBuffer();
    });

    const celBuffers = await Promise.all(celPromises);

    // Composite all cels onto the base image
    const composite = celBuffers
      .map((img, index) => {
        if (!img) return null;
        const cel = cels[index];
        return {
          input: img,
          top: cel.ypos,
          left: cel.xpos,
        };
      })
      .filter(Boolean);

    const finalBuffer = await sharp(bgBuffer)
      .composite(composite)
      .png()
      .toBuffer();

    return finalBuffer;
  }

  /**
   * Extract all properties from an Aseprite file for display
   * @param {Aseprite} ase - Parsed Aseprite object
   * @returns {Object} - Formatted properties object
   */
  static extractProperties(ase) {
    return {
      fileSize: ase.fileSize,
      numFrames: ase.numFrames,
      width: ase.width,
      height: ase.height,
      colorDepth: ase.colorDepth,
      paletteIndex: ase.paletteIndex,
      numColors: ase.numColors,
      pixelRatio: ase.pixelRatio,
      name: ase.name,
      layers: ase.layers?.length || 0,
      tags: ase.tags?.length || 0,
      tilesets: ase.tilesets?.length || 0,
      slices: ase.slices?.length || 0,
    };
  }

  /**
   * Compare two Aseprite files and return differences
   * @param {Object} original - Original file data
   * @param {Object} modified - Modified file data
   * @returns {Object} - Comparison result
   */
  static compareAsepriteFiles(original, modified) {
    if (!original || !modified) {
      return {
        hasChanges: true,
        changes: [],
      };
    }

    const changes = [];
    const origProps = original.properties || {};
    const modProps = modified.properties || {};

    // Compare properties
    const propertyKeys = [
      'numFrames',
      'width',
      'height',
      'colorDepth',
      'numColors',
      'pixelRatio',
      'layers',
      'tags',
      'tilesets',
      'slices',
    ];

    propertyKeys.forEach((key) => {
      if (origProps[key] !== modProps[key]) {
        changes.push({
          type: 'property',
          property: key,
          original: origProps[key],
          modified: modProps[key],
        });
      }
    });

    // Compare frame data
    if (original.aseData?.frames && modified.aseData?.frames) {
      const origFrames = original.aseData.frames;
      const modFrames = modified.aseData.frames;

      if (origFrames.length !== modFrames.length) {
        changes.push({
          type: 'frames',
          property: 'frameCount',
          original: origFrames.length,
          modified: modFrames.length,
        });
      }

      // Compare frame durations
      origFrames.forEach((frame, index) => {
        if (modFrames[index] && frame.duration !== modFrames[index].duration) {
          changes.push({
            type: 'frame',
            property: `frame[${index}].duration`,
            original: frame.duration,
            modified: modFrames[index].duration,
          });
        }
      });
    }

    // Compare layers
    if (original.aseData?.layers && modified.aseData?.layers) {
      const origLayers = original.aseData.layers;
      const modLayers = modified.aseData.layers;

      if (origLayers.length !== modLayers.length) {
        changes.push({
          type: 'layers',
          property: 'layerCount',
          original: origLayers.length,
          modified: modLayers.length,
        });
      }
    }

    return {
      hasChanges: changes.length > 0,
      changes,
    };
  }
}

module.exports = AsepriteService;
