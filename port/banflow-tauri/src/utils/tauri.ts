// Tauri IPC replacement utilities
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Command name mapping from Electron IPC to Tauri commands
const commandMap: Record<string, string> = {
  'InitializeLokiProject': 'initialize_loki_project',
  'api:initializeProjectState': 'api_initialize_project_state',
  'api:getProjectState': 'api_get_project_state',
  'api:setProjectState': 'api_set_project_state',
  'utils:closeTimerWindow': 'utils_close_timer_window',
  'api:getProjectSettings': 'api_get_project_settings',
  'api:setTrelloBoard': 'api_set_trello_board',
  'game:getState': 'game_get_state',
  'game:saveState': 'game_save_state',
  'loki:loadDatabase': 'loki_load_database',
  'loki:saveDatabase': 'loki_save_database',
  'MSG_FROM_RENDERER': 'msg_from_renderer',
  'git:switchRepository': 'git_switch_repository',
  'git:addRepository': 'git_add_repository',
  'git:getRepositoryStatus': 'git_get_repository_status',
};

// Helper to map Electron IPC command names to Tauri command names
function mapCommand(command: string): string {
  return commandMap[command] || command.replace(/:/g, '_').replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Replace electron's ipcRenderer.invoke with Tauri's invoke
export const tauriInvoke = async (command: string, ...args: any[]): Promise<any> => {
  const tauriCommand = mapCommand(command);
  console.log(`[tauri] Invoking command: ${command} -> ${tauriCommand}`, args.length > 0 ? 'with args' : 'no args');
  try {
    // Handle different argument formats
    let result;
    if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      // Single object argument
      console.log(`[tauri] Calling ${tauriCommand} with object:`, args[0]);
      result = await invoke(tauriCommand, args[0]);
    } else if (args.length > 0) {
      // Multiple arguments - pass as object with named fields or array
      console.log(`[tauri] Calling ${tauriCommand} with multiple args:`, args);
      result = await invoke(tauriCommand, { args });
    } else {
      // No arguments
      console.log(`[tauri] Calling ${tauriCommand} with no args`);
      result = await invoke(tauriCommand);
    }
    console.log(`[tauri] Command ${tauriCommand} succeeded`);
    return result;
  } catch (error) {
    console.error(`[tauri] Command ${tauriCommand} (${command}) failed:`, error);
    throw error;
  }
};

// Replace electron's ipcRenderer.sendSync with async invoke
// Note: This is async, so callers need to await or handle promises
export const tauriSendSync = async (command: string, ...args: any[]): Promise<any> => {
  console.log(`[tauri] tauriSendSync called: ${command}`, args.length > 0 ? 'with args' : 'no args');
  return tauriInvoke(command, ...args);
};

// Replace electron's ipcRenderer.send with invoke (fire and forget)
export const tauriSend = async (command: string, ...args: any[]): Promise<void> => {
  tauriInvoke(command, ...args).catch((error) => {
    console.error(`Tauri command ${command} failed:`, error);
  });
};

// Replace electron's ipcRenderer.on with Tauri event listener
// Returns a cleanup function (unlisten)
export const tauriOn = async (
  event: string,
  callback: (event: any, ...args: any[]) => void
): Promise<() => void> => {
  return listen(event, (event) => {
    // Tauri events have payload directly, Electron events have event and payload
    callback(event, event.payload);
  });
};
