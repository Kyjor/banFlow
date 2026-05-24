use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn plugin_storage_path(
    app_handle: &tauri::AppHandle,
    plugin_id: &str,
) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data_dir.join("plugins").join(format!("{}.json", plugin_id)))
}

#[tauri::command]
pub async fn plugin_storage_get(
    plugin_id: String,
    app_handle: tauri::AppHandle,
) -> Result<Option<serde_json::Value>, String> {
    let path = plugin_storage_path(&app_handle, &plugin_id)?;
    if !path.exists() {
        return Ok(None);
    }
    let contents = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read plugin storage: {}", e))?;
    let value: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse plugin storage: {}", e))?;
    Ok(Some(value))
}

#[tauri::command]
pub async fn plugin_storage_set(
    plugin_id: String,
    data: serde_json::Value,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let path = plugin_storage_path(&app_handle, &plugin_id)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create plugin storage dir: {}", e))?;
    }
    let contents = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize plugin storage: {}", e))?;
    fs::write(&path, contents)
        .map_err(|e| format!("Failed to write plugin storage: {}", e))?;
    Ok(())
}
