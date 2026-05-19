// Tauri IPC replacement utilities
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-shell';

// Command name mapping from Electron IPC to Tauri commands
const commandMap: Record<string, string> = {
  InitializeLokiProject: 'initialize_loki_project',
  'api:initializeProjectState': 'api_initialize_project_state',
  'api:getProjectState': 'api_get_project_state',
  'api:setProjectState': 'api_set_project_state',
  'utils:closeTimerWindow': 'utils_close_timer_window',
  'api:getProjectSettings': 'api_get_project_settings',
  'api:updateProjectSettings': 'api_update_project_settings',
  'api:setTrelloBoard': 'api_set_trello_board',
  'api:createParent': 'api_create_parent',
  'api:deleteParent': 'api_delete_parent',
  'api:updateParentOrder': 'api_update_parent_order',
  'api:getParents': 'api_get_parents',
  'api:getParentOrder': 'api_get_parent_order',
  'api:getNodes': 'api_get_nodes',
  'api:getTags': 'api_get_tags',
  'game:getState': 'game_get_state',
  'game:saveState': 'game_save_state',
  'loki:loadDatabase': 'loki_load_database',
  'loki:saveDatabase': 'loki_save_database',
  MSG_FROM_RENDERER: 'msg_from_renderer',
  'git:switchRepository': 'git_switch_repository',
  'git:addRepository': 'git_add_repository',
  'git:getRepositoryStatus': 'git_get_repository_status',
  'project:getProjects': 'project_get_projects',
  'project:createProject': 'project_create_project',
};

/** Electron IPC arg order -> Tauri camelCase parameter names */
const multiArgCommands: Record<string, string[]> = {
  'api:updateProjectSettings': ['projectName', 'settings'],
};

/** Single primitive/string arg -> Tauri parameter name */
const singleArgCommands: Record<string, string> = {
  'backup:stopSchedule': 'projectName',
  'backup:delete': 'path',
  'project:deleteProject': 'projectName',
  'git:switchBranch': 'branchName',
  'git:discardChanges': 'files',
};

function mapCommand(command: string): string {
  return (
    commandMap[command] ||
    command.replace(/:/g, '_').replace(/([A-Z])/g, '_$1').toLowerCase()
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildInvokePayload(
  command: string,
  args: unknown[],
): Record<string, unknown> | undefined {
  if (args.length === 0) {
    return undefined;
  }

  if (args.length === 1) {
    const arg = args[0];
    if (isPlainObject(arg)) {
      if (command === 'api:setTrelloBoard' && !('trelloBoard' in arg)) {
        return { trelloBoard: arg };
      }
      return arg;
    }
    const paramName = singleArgCommands[command];
    if (paramName) {
      return { [paramName]: arg };
    }
    return { value: arg };
  }

  const paramNames = multiArgCommands[command];
  if (paramNames) {
    const payload: Record<string, unknown> = {};
    paramNames.forEach((name, index) => {
      if (args[index] !== undefined) {
        payload[name] = args[index];
      }
    });
    return payload;
  }

  console.warn(
    `[tauri] Unmapped multi-arg command "${command}" — pass a single object with camelCase keys`,
    args,
  );
  return { args };
}

export const tauriInvoke = async (
  command: string,
  ...args: unknown[]
): Promise<unknown> => {
  const tauriCommand = mapCommand(command);
  const payload = buildInvokePayload(command, args);

  try {
    const result =
      payload === undefined
        ? await invoke(tauriCommand)
        : await invoke(tauriCommand, payload);
    return result;
  } catch (error) {
    console.error(`[tauri] Command ${tauriCommand} (${command}) failed:`, error);
    throw error;
  }
};

export const tauriSendSync = async (
  command: string,
  ...args: unknown[]
): Promise<unknown> => {
  return tauriInvoke(command, ...args);
};

export const tauriSend = async (
  command: string,
  ...args: unknown[]
): Promise<void> => {
  tauriInvoke(command, ...args).catch((error) => {
    console.error(`Tauri command ${command} failed:`, error);
  });
};

export const tauriOn = async (
  event: string,
  callback: (event: unknown, ...args: unknown[]) => void,
): Promise<() => void> => {
  return listen(event, (event) => {
    callback(event, event.payload);
  });
};

/** Open a URL in the system browser (Electron used setWindowOpenHandler for window.open). */
export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    await open(url);
    return;
  }
  window.open(url, '_blank');
}
