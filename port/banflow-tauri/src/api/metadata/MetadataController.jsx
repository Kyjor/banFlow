import { tauriInvoke, tauriSendSync, tauriSend, tauriOn } from '../../utils/tauri';

/**
 * @class MetadataController
 * @desc Interacts with the ipcRenderer to perform CRUD operations on metadata. This is the interface between the UI and the database.
 */
const MetadataController = {
  async saveMetadataValue(enumValueTitle, parentEnum) {
    return await tauriSendSync(
      'api:saveMetadataValue',
      enumValueTitle,
      parentEnum,
    );
  },
};

export default MetadataController;
