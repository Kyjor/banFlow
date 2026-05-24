/** Central registry for plugin UI contributions (panels, sidebar, modals, preview). */

const sidebarActions = new Map();
const panels = new Map();
const modals = new Map();
let modalSeq = 0;
const panelOpenState = new Map();
const panelOpenListeners = new Set();

/** @type {{ proposal: import('banflow-plugin-api').ActionProposal, handlers: import('banflow-plugin-api').ActionPreviewHandlers } | null} */
let activePreview = null;
const previewListeners = new Set();

export function registerSidebarAction(reg) {
  sidebarActions.set(reg.id, reg);
  notifyUi();
  return () => {
    sidebarActions.delete(reg.id);
    notifyUi();
  };
}

export function registerPanel(reg) {
  panels.set(reg.id, reg);
  if (reg.defaultOpen) panelOpenState.set(reg.id, true);
  notifyUi();
  return () => {
    panels.delete(reg.id);
    panelOpenState.delete(reg.id);
    notifyUi();
  };
}

export function getSidebarActions() {
  return [...sidebarActions.values()];
}

export function getPanels() {
  return [...panels.values()];
}

export function setPanelOpen(panelId, open) {
  panelOpenState.set(panelId, open);
  panelOpenListeners.forEach((fn) => fn());
}

export function isPanelOpen(panelId) {
  return panelOpenState.get(panelId) ?? false;
}

export function subscribePanelOpen(fn) {
  panelOpenListeners.add(fn);
  return () => panelOpenListeners.delete(fn);
}

export function openModal({ id, title, content, width }) {
  const modalId = id || `modal-${++modalSeq}`;
  modals.set(modalId, { title, content, width });
  notifyUi();
  return modalId;
}

export function closeModal(modalId) {
  modals.delete(modalId);
  notifyUi();
}

export function getModals() {
  return [...modals.entries()].map(([id, m]) => ({ id, ...m }));
}

export function showActionPreview(proposal, handlers) {
  activePreview = { proposal, handlers };
  previewListeners.forEach((fn) => fn(activePreview));
}

export function getActivePreview() {
  return activePreview;
}

export function clearActionPreview() {
  activePreview = null;
  previewListeners.forEach((fn) => fn(null));
}

export function subscribePreview(fn) {
  previewListeners.add(fn);
  fn(activePreview);
  return () => previewListeners.delete(fn);
}

const uiListeners = new Set();
export function notifyUi() {
  uiListeners.forEach((fn) => fn());
}

export function subscribeUiRegistry(fn) {
  uiListeners.add(fn);
  fn();
  return () => uiListeners.delete(fn);
}
