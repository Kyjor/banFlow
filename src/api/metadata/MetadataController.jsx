import { ipcRenderer } from 'electron';

/**
 * @class MetadataController
 * @desc Interacts with the ipcRenderer to perform CRUD operations on metadata. This is the interface between the UI and the database.
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
