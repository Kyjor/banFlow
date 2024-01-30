import { ipcRenderer } from 'electron';

const TagController = {
  getTags() {
    return ipcRenderer.sendSync('api:getTags');
  },
  addTag(tagTitle) {
    return ipcRenderer.sendSync('api:addTag', tagTitle);
  },
};

export default TagController;
