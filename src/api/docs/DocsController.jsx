import { tauriInvoke } from '../../utils/tauri';

function projectName() {
  return localStorage.getItem('currentProject') || '';
}

const DocsController = {
  async list(isGlobal = false) {
    const pn = projectName();
    if (!pn && !isGlobal) return [];
    return (await tauriInvoke('docs:list', pn, isGlobal)) || [];
  },

  async read(docPath, isGlobal = false) {
    const pn = projectName();
    return tauriInvoke('docs:read', docPath, pn, isGlobal);
  },

  async save(docPath, content, isGlobal = false) {
    const pn = projectName();
    return tauriInvoke('docs:save', docPath, content, pn, isGlobal);
  },

  async delete(docPath, isGlobal = false) {
    const pn = projectName();
    return tauriInvoke('docs:delete', docPath, pn, isGlobal);
  },

  async createFolder(folderPath, isGlobal = false) {
    const pn = projectName();
    return tauriInvoke('docs:createFolder', folderPath, pn, isGlobal);
  },
};

export default DocsController;
