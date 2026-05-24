use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use serde_json::{json, Value};
use tauri::AppHandle;

use crate::get_project_dir;

fn system_time_to_iso(time: SystemTime) -> String {
    chrono::DateTime::<chrono::Utc>::from(time).to_rfc3339()
}

fn file_times(path: &Path) -> (String, String) {
    let meta = fs::metadata(path).ok();
    let modified = meta
        .as_ref()
        .and_then(|m| m.modified().ok())
        .map(system_time_to_iso)
        .unwrap_or_default();
    let created = meta
        .as_ref()
        .and_then(|m| m.created().ok())
        .map(system_time_to_iso)
        .unwrap_or_else(|| modified.clone());
    (created, modified)
}

fn resolve_diagrams_path(
    app_handle: &AppHandle,
    project_name: Option<String>,
    is_global: bool,
) -> Result<PathBuf, String> {
    let project_dir = get_project_dir(app_handle)?;
    let base_path = if is_global {
        project_dir.join("global")
    } else {
        project_dir.join(project_name.unwrap_or_default())
    };
    let diagrams_path = base_path.join("diagrams");
    fs::create_dir_all(&diagrams_path)
        .map_err(|e| format!("Failed to create diagrams dir: {}", e))?;
    Ok(diagrams_path)
}

fn list_diagrams_recursive(dir: &Path, base_dir: &str) -> Result<Vec<Value>, String> {
    let mut items: Vec<Value> = Vec::new();

    if !dir.exists() {
        return Ok(items);
    }

    let mut entries: Vec<_> = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read diagrams directory: {}", e))?
        .filter_map(|e| e.ok())
        .collect();

    entries.sort_by_key(|e| e.file_name());

    for entry in entries {
        let name = entry.file_name().to_string_lossy().to_string();
        let full_path = entry.path();
        let relative_path = if base_dir.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", base_dir, name)
        };

        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            let children = list_diagrams_recursive(&full_path, &relative_path)?;
            items.push(json!({
                "name": name,
                "path": relative_path,
                "type": "folder",
                "children": children,
            }));
        } else if name.ends_with(".json") {
            let size = fs::metadata(&full_path).map(|m| m.len()).unwrap_or(0);
            let (created, modified) = file_times(&full_path);
            let display_name = name.trim_end_matches(".json").to_string();
            items.push(json!({
                "name": display_name,
                "path": relative_path,
                "type": "file",
                "size": size,
                "created": created,
                "modified": modified,
            }));
        }
    }

    items.sort_by(|a, b| {
        let type_a = a.get("type").and_then(|v| v.as_str()).unwrap_or("");
        let type_b = b.get("type").and_then(|v| v.as_str()).unwrap_or("");
        if type_a != type_b {
            return if type_a == "folder" {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            };
        }
        let name_a = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let name_b = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
        name_a.cmp(name_b)
    });

    Ok(items)
}

fn diagram_full_path(diagrams_path: &Path, diagram_path: &str) -> PathBuf {
    if diagram_path.ends_with(".json") {
        diagrams_path.join(diagram_path)
    } else {
        diagrams_path.join(format!("{}.json", diagram_path))
    }
}

#[tauri::command]
pub async fn diagrams_list(
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Vec<Value>, String> {
    let diagrams_path = resolve_diagrams_path(&app_handle, project_name, is_global)?;
    list_diagrams_recursive(&diagrams_path, "")
}

#[tauri::command]
pub async fn diagrams_read(
    diagram_path: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let diagrams_path = resolve_diagrams_path(&app_handle, project_name, is_global)?;
    let full_path = diagram_full_path(&diagrams_path, &diagram_path);

    if !full_path.exists() {
        return Err(format!("Diagram not found: {}", diagram_path));
    }

    let raw = fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read diagram: {}", e))?;
    let content: Value = serde_json::from_str(&raw)
        .map_err(|e| format!("Failed to parse diagram JSON: {}", e))?;
    let size = fs::metadata(&full_path).map(|m| m.len()).unwrap_or(0);
    let (created, modified) = file_times(&full_path);
    let name = full_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(&diagram_path)
        .to_string();

    Ok(json!({
        "content": content,
        "path": diagram_path,
        "name": name,
        "size": size,
        "created": created,
        "modified": modified,
    }))
}

#[tauri::command]
pub async fn diagrams_save(
    diagram_path: String,
    content: Value,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let diagrams_path = resolve_diagrams_path(&app_handle, project_name, is_global)?;
    let full_path = diagram_full_path(&diagrams_path, &diagram_path);

    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create diagram directory: {}", e))?;
    }

    let serialized = serde_json::to_string_pretty(&content)
        .map_err(|e| format!("Failed to serialize diagram: {}", e))?;
    fs::write(&full_path, serialized).map_err(|e| format!("Failed to save diagram: {}", e))?;

    Ok(json!({ "success": true, "path": diagram_path }))
}

#[tauri::command]
pub async fn diagrams_delete(
    diagram_path: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let diagrams_path = resolve_diagrams_path(&app_handle, project_name, is_global)?;
    let full_path = diagram_full_path(&diagrams_path, &diagram_path);

    if full_path.exists() {
        fs::remove_file(&full_path).map_err(|e| format!("Failed to delete diagram: {}", e))?;
        return Ok(json!({ "success": true }));
    }

    Err(format!("Diagram not found: {}", diagram_path))
}

#[tauri::command]
pub async fn diagrams_create_folder(
    folder_path: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let diagrams_path = resolve_diagrams_path(&app_handle, project_name, is_global)?;
    let full_path = diagrams_path.join(&folder_path);

    if !full_path.exists() {
        fs::create_dir_all(&full_path)
            .map_err(|e| format!("Failed to create folder: {}", e))?;
    }

    Ok(json!({ "success": true, "path": folder_path }))
}

fn remove_dir_recursive(path: &Path) -> Result<(), String> {
    if path.is_dir() {
        for entry in fs::read_dir(path).map_err(|e| format!("Failed to read dir: {}", e))? {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            remove_dir_recursive(&entry.path())?;
        }
        fs::remove_dir(path).map_err(|e| format!("Failed to remove dir: {}", e))?;
    } else {
        fs::remove_file(path).map_err(|e| format!("Failed to remove file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn diagrams_delete_folder(
    folder_path: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let diagrams_path = resolve_diagrams_path(&app_handle, project_name, is_global)?;
    let full_path = diagrams_path.join(&folder_path);

    if !full_path.exists() {
        return Err(format!("Folder not found: {}", folder_path));
    }

    remove_dir_recursive(&full_path)?;
    Ok(json!({ "success": true }))
}

#[tauri::command]
pub async fn diagrams_rename(
    old_path: String,
    new_path: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let diagrams_path = resolve_diagrams_path(&app_handle, project_name, is_global)?;
    let from = diagram_full_path(&diagrams_path, &old_path);
    let to = diagram_full_path(&diagrams_path, &new_path);

    if !from.exists() {
        return Err(format!("Diagram not found: {}", old_path));
    }
    if to.exists() {
        return Err(format!("Target already exists: {}", new_path));
    }
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create target dir: {}", e))?;
    }
    fs::rename(&from, &to).map_err(|e| format!("Failed to rename diagram: {}", e))?;
    Ok(json!({ "success": true, "path": new_path }))
}

#[tauri::command]
pub async fn diagrams_duplicate(
    diagram_path: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let diagrams_path = resolve_diagrams_path(&app_handle, project_name, is_global)?;
    let from = diagram_full_path(&diagrams_path, &diagram_path);

    if !from.exists() {
        return Err(format!("Diagram not found: {}", diagram_path));
    }

    let stem = from
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("diagram");
    let parent_rel = Path::new(&diagram_path).parent();
    let new_name = format!("{}-copy.json", stem);
    let new_rel = parent_rel
        .map(|p| p.join(&new_name))
        .unwrap_or_else(|| PathBuf::from(&new_name));
    let new_rel_str = new_rel.to_string_lossy().to_string();
    let to = diagram_full_path(&diagrams_path, &new_rel_str);

    let mut counter = 2;
    let mut final_path = to.clone();
    let mut final_rel = new_rel_str.clone();
    while final_path.exists() {
        let alt = format!("{}-copy-{}.json", stem, counter);
        final_rel = parent_rel
            .map(|p| p.join(&alt))
            .unwrap_or_else(|| PathBuf::from(&alt))
            .to_string_lossy()
            .to_string();
        final_path = diagram_full_path(&diagrams_path, &final_rel);
        counter += 1;
    }

    fs::copy(&from, &final_path).map_err(|e| format!("Failed to duplicate diagram: {}", e))?;
    Ok(json!({ "success": true, "path": final_rel }))
}
