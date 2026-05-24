import { tauriInvoke, tauriSendSync, tauriSend, tauriOn } from '../../utils/tauri';

/**
 * @class MetadataController
 * @desc Tauri invoke layer for metadata (UI ↔ backend).
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
