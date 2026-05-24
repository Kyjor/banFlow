use crate::get_project_dir;
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

fn backups_root(app_handle: &AppHandle) -> Result<PathBuf, String> {
    Ok(get_project_dir(app_handle)?.join("_backups"))
}

fn backup_project_key(project_name: &str) -> String {
    if project_name.contains('/') || project_name.contains('\\') || project_name.contains(':') {
        Path::new(project_name)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(project_name)
            .to_string()
    } else {
        project_name.to_string()
    }
}

fn project_json_path(app_handle: &AppHandle, project_name: &str) -> Result<PathBuf, String> {
    if project_name.contains('/') || project_name.contains('\\') || project_name.contains(':') {
        Ok(PathBuf::from(project_name))
    } else {
        Ok(get_project_dir(app_handle)?.join(format!("{}.json", project_name)))
    }
}

fn project_folder_path(project_json: &Path) -> PathBuf {
    let parent = project_json.parent().unwrap_or_else(|| Path::new("."));
    let stem = project_json
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("project");
    parent.join(stem)
}

fn copy_dir_recursive(src: &Path, dest: &Path) -> Result<(), String> {
    if !dest.exists() {
        fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    }
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dest_path = dest.join(entry.file_name());
        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            copy_dir_recursive(&src_path, &dest_path)?;
        } else {
            fs::copy(&src_path, &dest_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn backup_entry(path: &Path, project_name: &str) -> Result<Value, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    let created = meta
        .created()
        .or_else(|_| meta.modified())
        .map_err(|e| e.to_string())?;
    let modified = meta.modified().map_err(|e| e.to_string())?;
    let created: chrono::DateTime<chrono::Utc> = created.into();
    let modified: chrono::DateTime<chrono::Utc> = modified.into();

    Ok(json!({
        "name": path.file_name().and_then(|n| n.to_str()).unwrap_or(""),
        "path": path.to_string_lossy(),
        "projectName": project_name,
        "size": meta.len(),
        "created": created.to_rfc3339(),
        "modified": modified.to_rfc3339(),
    }))
}

#[tauri::command]
pub async fn backup_create(
    project_name: String,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let project_path = project_json_path(&app_handle, &project_name)?;
    if !project_path.exists() {
        return Err(format!("Project file not found: {}", project_path.display()));
    }

    let key = backup_project_key(&project_name);
    let backup_dir = backups_root(&app_handle)?.join(&key);
    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono::Utc::now().format("%Y-%m-%dT%H-%M-%S%.3fZ").to_string();
    let backup_file_name = format!("{}_{}.json", key, timestamp);
    let backup_path = backup_dir.join(&backup_file_name);
    fs::copy(&project_path, &backup_path).map_err(|e| e.to_string())?;

    let project_folder = project_folder_path(&project_path);
    if project_folder.is_dir() {
        let backup_folder = backup_dir.join(format!("{}_{}", key, timestamp));
        copy_dir_recursive(&project_folder, &backup_folder)?;
    }

    Ok(json!({
        "success": true,
        "path": backup_path.to_string_lossy(),
    }))
}

#[tauri::command]
pub async fn backup_list(
    project_name: Option<String>,
    app_handle: AppHandle,
) -> Result<Vec<Value>, String> {
    let root = backups_root(&app_handle)?;
    if !root.exists() {
        return Ok(vec![]);
    }

    let mut backups = Vec::new();

    if let Some(name) = project_name.filter(|n| !n.is_empty()) {
        let key = backup_project_key(&name);
        let dir = root.join(&key);
        if dir.is_dir() {
            collect_backups_in_dir(&dir, &key, &mut backups)?;
        }
    } else {
        for entry in fs::read_dir(&root).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
                let key = entry.file_name().to_string_lossy().to_string();
                collect_backups_in_dir(&entry.path(), &key, &mut backups)?;
            }
        }
    }

    backups.sort_by(|a, b| {
        let ac = a.get("created").and_then(|v| v.as_str()).unwrap_or("");
        let bc = b.get("created").and_then(|v| v.as_str()).unwrap_or("");
        bc.cmp(ac)
    });

    Ok(backups)
}

fn collect_backups_in_dir(
    dir: &Path,
    project_name: &str,
    backups: &mut Vec<Value>,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() {
            if path.extension().and_then(|e| e.to_str()) == Some("json") {
                backups.push(backup_entry(&path, project_name)?);
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn backup_restore(
    backup_path: String,
    project_name: String,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let backup = PathBuf::from(&backup_path);
    if !backup.exists() {
        return Err(format!("Backup file not found: {}", backup_path));
    }

    let project_path = project_json_path(&app_handle, &project_name)?;
    let safety_backup = format!(
        "{}.pre-restore-{}",
        project_path.display(),
        chrono::Utc::now().timestamp_millis()
    );

    if project_path.exists() {
        fs::copy(&project_path, &safety_backup).map_err(|e| e.to_string())?;
    }

    let restore_result = (|| {
        fs::copy(&backup, &project_path).map_err(|e| e.to_string())?;

        let backup_dir = backup.parent().unwrap_or_else(|| Path::new("."));
        let backup_stem = backup.file_stem().and_then(|s| s.to_str()).unwrap_or("");
        let backup_project_folder = backup_dir.join(backup_stem);

        if backup_project_folder.is_dir() {
            let project_folder = project_folder_path(&project_path);
            if project_folder.exists() {
                fs::remove_dir_all(&project_folder).map_err(|e| e.to_string())?;
            }
            copy_dir_recursive(&backup_project_folder, &project_folder)?;
        }
        Ok::<(), String>(())
    })();

    if restore_result.is_err() {
        let safety = PathBuf::from(&safety_backup);
        if safety.exists() {
            let _ = fs::copy(&safety, &project_path);
        }
        return Err(restore_result.err().unwrap_or_else(|| "Restore failed".to_string()));
    }

    Ok(json!({
        "success": true,
        "safetyBackup": safety_backup,
    }))
}

#[tauri::command]
pub async fn backup_delete(backup_path: String) -> Result<Value, String> {
    let backup = PathBuf::from(&backup_path);
    if !backup.exists() {
        return Err(format!("Backup file not found: {}", backup_path));
    }

    fs::remove_file(&backup).map_err(|e| e.to_string())?;

    let backup_dir = backup.parent().unwrap_or_else(|| Path::new("."));
    let backup_stem = backup.file_stem().and_then(|s| s.to_str()).unwrap_or("");
    let backup_project_folder = backup_dir.join(backup_stem);
    if backup_project_folder.is_dir() {
        fs::remove_dir_all(&backup_project_folder).map_err(|e| e.to_string())?;
    }

    Ok(json!({ "success": true }))
}

#[tauri::command]
pub async fn backup_start_schedule(
    _project_name: String,
    _interval_hours: u32,
    _max_backups: u32,
) -> Result<Value, String> {
    Ok(json!({ "success": true }))
}

#[tauri::command]
pub async fn backup_stop_schedule(_project_name: String) -> Result<Value, String> {
    Ok(json!({ "success": true }))
}
