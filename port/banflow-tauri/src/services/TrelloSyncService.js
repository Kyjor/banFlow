import axios from 'axios';
import { tauriInvoke } from '../utils/tauri';
import NodeService from './NodeService';
import TagController from '../api/tag/TagController';

const TRELLO_API = 'https://api.trello.com/1';

const TRELLO_LABEL_COLORS = [
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'blue',
  'sky',
  'lime',
  'pink',
  'black',
];

/** banFlow tags are Trello label names (string[]). */
export function trelloLabelsToTagNames(labels) {
  if (!Array.isArray(labels)) return [];
  return labels
    .map((label) => (typeof label === 'string' ? label : label?.name))
    .filter(Boolean);
}

export function normalizeTagNames(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter(Boolean);
}

let boardLabelsCache = { boardId: null, labels: null, fetchedAt: 0 };
const BOARD_LABELS_CACHE_MS = 60_000;

export function getTrelloAuth() {
  const key = localStorage.getItem('trelloKey');
  const token = localStorage.getItem('trelloToken');
  if (!key || !token) return null;
  return { key, token };
}

function getProjectName() {
  return localStorage.getItem('currentProject') || '';
}

async function fetchParents() {
  const projectName = getProjectName();
  if (!projectName) return {};
  return (await tauriInvoke('api:getParents', { projectName })) || {};
}

function trelloCardId(node) {
  return node?.trello?.id || node?.trello?.idCard;
}

function trelloListId(parent) {
  return parent?.trello?.id;
}

function buildAuthQuery(trelloAuth) {
  return `key=${trelloAuth.key}&token=${trelloAuth.token}`;
}

async function getTrelloBoardId() {
  try {
    const settings = await tauriInvoke('api:getProjectSettings');
    return settings?.trello?.id || null;
  } catch {
    return null;
  }
}

async function fetchBoardLabels(boardId, trelloAuth) {
  if (
    boardLabelsCache.boardId === boardId &&
    boardLabelsCache.labels &&
    Date.now() - boardLabelsCache.fetchedAt < BOARD_LABELS_CACHE_MS
  ) {
    return boardLabelsCache.labels;
  }
  const url = `${TRELLO_API}/boards/${boardId}/labels?${buildAuthQuery(trelloAuth)}`;
  const { data } = await axios.get(url, {
    headers: { Accept: 'application/json' },
  });
  boardLabelsCache = { boardId, labels: data, fetchedAt: Date.now() };
  return data;
}

async function createBoardLabel(boardId, name, trelloAuth) {
  const color =
    TRELLO_LABEL_COLORS[Math.floor(Math.random() * TRELLO_LABEL_COLORS.length)];
  const url = `${TRELLO_API}/labels?${buildAuthQuery(trelloAuth)}&name=${encodeURIComponent(name)}&color=${color}&idBoard=${boardId}`;
  const { data } = await axios.post(url, {}, {
    headers: { Accept: 'application/json' },
  });
  boardLabelsCache.labels = null;
  return data;
}

/** Resolve banFlow tag names to Trello label ids (create missing labels on the board). */
async function resolveTagNamesToLabelIds(tagNames, trelloAuth) {
  const boardId = await getTrelloBoardId();
  if (!boardId || !tagNames?.length) return '';

  const boardLabels = await fetchBoardLabels(boardId, trelloAuth);
  const ids = [];

  for (const name of tagNames) {
    let match = boardLabels.find((label) => label.name === name);
    if (!match) {
      try {
        match = await createBoardLabel(boardId, name, trelloAuth);
        boardLabels.push(match);
      } catch (err) {
        console.warn('[TrelloSyncService] Could not create Trello label:', name, err);
      }
    }
    if (match?.id) ids.push(match.id);
  }

  return ids.join(',');
}

function labelUpdatesFromCard(card) {
  const labels = card?.labels || [];
  return {
    tags: trelloLabelsToTagNames(labels),
    labels,
  };
}

async function syncTrelloLabelsToGlobalTags(card) {
  const labels = card?.labels;
  if (!Array.isArray(labels)) return;

  const existing = await TagController.getTags();
  const existingTitles = new Set(
    (existing || []).map((t) => t.title || t.id),
  );

  for (const label of labels) {
    const name = label?.name;
    if (!name) continue;
    const color = label.color || '';
    if (!existingTitles.has(name)) {
      await TagController.addTag(name, color);
      existingTitles.add(name);
    } else if (color) {
      await TagController.updateTagColor(name, color);
    }
  }
}

/**
 * Push a single node property change to Trello (Electron NodeService parity).
 */
export async function syncNodePropertyToTrello(
  node,
  propertyToUpdate,
  newValue,
  trelloAuth = getTrelloAuth(),
) {
  if (!trelloAuth?.key || !trelloAuth?.token || !node) return node;

  const cardId = trelloCardId(node);
  if (!cardId) return node;

  const parents = await fetchParents();
  const parent = parents[node.parent];
  if (!parent?.trello) return node;

  const params = [];

  if (propertyToUpdate === 'title') {
    params.push(`name=${encodeURIComponent(newValue)}`);
  }
  if (propertyToUpdate === 'timeSpent') {
    const currentDesc = node.trello?.desc || node.description || '';
    const newDesc = NodeService.setBanflowTimeSpentInDescription(
      currentDesc,
      newValue,
    );
    params.push(`desc=${encodeURIComponent(newDesc)}`);
  }
  if (propertyToUpdate === 'description') {
    const { description: cleanedDesc } =
      NodeService.extractBanflowTimeSpentFromDescription(newValue);
    const newDesc = NodeService.setBanflowTimeSpentInDescription(
      cleanedDesc,
      node.timeSpent || 0,
    );
    params.push(`desc=${encodeURIComponent(newDesc)}`);
  }
  if (propertyToUpdate === 'dueDate') {
    params.push(`due=${encodeURIComponent(newValue ?? '')}`);
  }
  if (propertyToUpdate === 'startDate') {
    params.push(`start=${encodeURIComponent(newValue ?? '')}`);
  }
  if (propertyToUpdate === 'tags' && Array.isArray(newValue)) {
    const tagNames = normalizeTagNames(newValue);
    const labelIds = await resolveTagNamesToLabelIds(tagNames, trelloAuth);
    params.push(`idLabels=${labelIds}`);
  } else if (propertyToUpdate === 'labels' && Array.isArray(newValue)) {
    const hasIds = newValue.some((item) => item && typeof item === 'object' && item.id);
    if (hasIds) {
      const labelIds = newValue.map((label) => label.id).filter(Boolean).join(',');
      params.push(`idLabels=${labelIds}`);
    } else {
      const tagNames = normalizeTagNames(newValue);
      const labelIds = await resolveTagNamesToLabelIds(tagNames, trelloAuth);
      params.push(`idLabels=${labelIds}`);
    }
  }

  if (params.length === 0) return node;

  const url = `${TRELLO_API}/cards/${cardId}?${buildAuthQuery(trelloAuth)}&${params.join('&')}`;

  try {
    const { data: card } = await axios.put(url, {}, {
      headers: { Accept: 'application/json' },
    });

    const projectName = getProjectName();
    if (!projectName) return node;

    const updates = { trello: card };
    if (propertyToUpdate === 'tags' || propertyToUpdate === 'labels') {
      Object.assign(updates, labelUpdatesFromCard(card));
    }
    if (propertyToUpdate === 'dueDate') {
      updates.dueDate = card.due;
    }
    if (propertyToUpdate === 'startDate') {
      updates.startDate = card.start;
    }

    let updatedNode = node;
    for (const [prop, val] of Object.entries(updates)) {
      updatedNode = await tauriInvoke('api:updateNodeProperty', {
        projectName,
        propertyToUpdate: prop,
        nodeId: node.id,
        newValue: val,
        trelloAuth: null,
      });
    }
    return updatedNode;
  } catch (err) {
    console.error('[TrelloSyncService] Failed to sync property to Trello:', err);
    return node;
  }
}

/**
 * Move a linked card to another list when dragging between parents.
 */
export async function syncCardListAfterMove(
  nodeId,
  destinationParent,
  trelloAuth = getTrelloAuth(),
) {
  if (!trelloAuth?.key || !trelloAuth?.token) return;

  const projectName = getProjectName();
  if (!projectName) return;

  const nodes = (await tauriInvoke('api:getNodes', { projectName })) || {};
  const node = nodes[nodeId];
  const cardId = trelloCardId(node);
  const listId = trelloListId(destinationParent);

  if (!node || !cardId || !listId) return;

  const url = `${TRELLO_API}/cards/${cardId}?${buildAuthQuery(trelloAuth)}&idList=${listId}`;

  try {
    await axios.put(url, {}, { headers: { Accept: 'application/json' } });
  } catch (err) {
    console.error('[TrelloSyncService] Failed to move Trello card:', err);
  }
}

/**
 * Create a Trello card for a new local node when parent column is linked.
 */
export async function createTrelloCardForNode(
  node,
  parent,
  trelloAuth = getTrelloAuth(),
) {
  if (!trelloAuth?.key || !trelloAuth?.token || !node || !parent?.trello) {
    return null;
  }

  const listId = trelloListId(parent);
  if (!listId) return null;

  const url = `${TRELLO_API}/cards?idList=${listId}&${buildAuthQuery(trelloAuth)}&name=${encodeURIComponent(node.title || 'Untitled')}`;

  try {
    const { data: card } = await axios.post(url, {}, {
      headers: { Accept: 'application/json' },
    });
    return card;
  } catch (err) {
    console.error('[TrelloSyncService] Failed to create Trello card:', err);
    return null;
  }
}

/**
 * Apply Trello card fields to local node after create/pull (no upstream sync).
 */
export async function applyTrelloCardToLocalNode(nodeId, card) {
  const projectName = getProjectName();
  if (!projectName || !card) return;

  const { description, timeSpent } =
    NodeService.extractBanflowTimeSpentFromDescription(card.desc || '');

  await tauriInvoke('api:updateNodeProperty', {
    projectName,
    propertyToUpdate: 'trello',
    nodeId,
    newValue: card,
    trelloAuth: null,
  });

  if (description) {
    await tauriInvoke('api:updateNodeProperty', {
      projectName,
      propertyToUpdate: 'description',
      nodeId,
      newValue: description,
      trelloAuth: null,
    });
  }
  if (typeof timeSpent === 'number') {
    await tauriInvoke('api:updateNodeProperty', {
      projectName,
      propertyToUpdate: 'timeSpent',
      nodeId,
      newValue: timeSpent,
      trelloAuth: null,
    });
  }
  const { tags, labels } = labelUpdatesFromCard(card);
  if (tags.length > 0) {
    await tauriInvoke('api:updateNodeProperty', {
      projectName,
      propertyToUpdate: 'tags',
      nodeId,
      newValue: tags,
      trelloAuth: null,
    });
  }
  if (labels.length > 0) {
    await tauriInvoke('api:updateNodeProperty', {
      projectName,
      propertyToUpdate: 'labels',
      nodeId,
      newValue: labels,
      trelloAuth: null,
    });
  }
  await syncTrelloLabelsToGlobalTags(card);
  if (card.due !== undefined) {
    await tauriInvoke('api:updateNodeProperty', {
      projectName,
      propertyToUpdate: 'dueDate',
      nodeId,
      newValue: card.due,
      trelloAuth: null,
    });
  }
  if (card.start !== undefined) {
    await tauriInvoke('api:updateNodeProperty', {
      projectName,
      propertyToUpdate: 'startDate',
      nodeId,
      newValue: card.start,
      trelloAuth: null,
    });
  }
}

/**
 * After local node create: create upstream card if parent list is linked.
 */
export async function syncNewNodeToTrello(node, parentId, trelloData) {
  if (trelloData || !node?.id) return node;

  const trelloAuth = getTrelloAuth();
  if (!trelloAuth) return node;

  const parents = await fetchParents();
  const parent = parents[parentId];
  if (!parent?.trello || node.trello) return node;

  const card = await createTrelloCardForNode(node, parent, trelloAuth);
  if (!card) return node;

  await applyTrelloCardToLocalNode(node.id, card);

  const nodes = (await tauriInvoke('api:getNodes', {
    projectName: getProjectName(),
  })) || {};
  return nodes[node.id] || node;
}

/**
 * Fetch Trello card by id.
 */
export async function fetchTrelloCard(cardId, trelloAuth = getTrelloAuth()) {
  if (!cardId || !trelloAuth?.key || !trelloAuth?.token) return null;
  const url = `${TRELLO_API}/cards/${cardId}?${buildAuthQuery(trelloAuth)}`;
  const { data } = await axios.get(url, {
    headers: { Accept: 'application/json' },
  });
  return data;
}

export default {
  getTrelloAuth,
  syncNodePropertyToTrello,
  syncCardListAfterMove,
  createTrelloCardForNode,
  applyTrelloCardToLocalNode,
  syncNewNodeToTrello,
  fetchTrelloCard,
};
