import { ipcRenderer } from 'electron';

/**
 * @class TagController
 * @desc Interacts with the ipcRenderer to perform CRUD operations on tags. This is the interface between the UI and the database.
 */
const TagController = {
  getTags() {
    return ipcRenderer.sendSync('api:getTags');
  },
  addTag(tagTitle) {
    return ipcRenderer.sendSync('api:addTag', tagTitle);
  },
};

export default TagController;
