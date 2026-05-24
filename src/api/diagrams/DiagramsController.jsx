import { tauriInvoke } from '../../utils/tauri';

function projectName() {
  return localStorage.getItem('currentProject') || '';
}

const DiagramsController = {
  async list(isGlobal = false) {
    const pn = projectName();
    if (!pn && !isGlobal) return [];
    return (await tauriInvoke('diagrams:list', pn, isGlobal)) || [];
  },

  async read(diagramPath, isGlobal = false) {
    const pn = projectName();
    return tauriInvoke('diagrams:read', diagramPath, pn, isGlobal);
  },

  async save(diagramPath, content, isGlobal = false) {
    const pn = projectName();
    return tauriInvoke('diagrams:save', diagramPath, content, pn, isGlobal);
  },

  async delete(diagramPath, isGlobal = false) {
    const pn = projectName();
    return tauriInvoke('diagrams:delete', diagramPath, pn, isGlobal);
  },
};

export default DiagramsController;
