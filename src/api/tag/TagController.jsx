import { ipcRenderer } from 'electron';

const TagController = {
  addTag(tagTitle) {
    return ipcRenderer.sendSync('api:addTag', tagTitle);
  },
};

export default TagController;
