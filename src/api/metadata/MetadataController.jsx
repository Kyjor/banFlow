import { ipcRenderer } from 'electron';

/**
 * @class MetadataController
 * @desc creates a new Metadata with a set of given properties
 */
const MetadataController = {
  saveMetadataValue(enumValueTitle, parentEnum) {
    return ipcRenderer.sendSync(
      'api:saveMetadataValue',
      enumValueTitle,
      parentEnum,
    );
  },
};

export default MetadataController;
