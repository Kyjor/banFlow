use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use serde_json::{json, Value};
use tauri::AppHandle;

use crate::get_project_dir;

struct DocsPaths {
    docs_path: PathBuf,
    images_path: PathBuf,
}

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

fn resolve_docs_paths(
    app_handle: &AppHandle,
    project_name: Option<String>,
    is_global: bool,
) -> Result<DocsPaths, String> {
    let project_dir = get_project_dir(app_handle)?;
    let base_path = if is_global {
        project_dir.join("global")
    } else {
        project_dir.join(project_name.unwrap_or_default())
    };

    let docs_path = base_path.join("docs");
    let images_path = base_path.join("images");

    fs::create_dir_all(&docs_path).map_err(|e| format!("Failed to create docs dir: {}", e))?;
    fs::create_dir_all(&images_path).map_err(|e| format!("Failed to create images dir: {}", e))?;

    Ok(DocsPaths {
        docs_path,
        images_path,
    })
}

fn list_docs_recursive(dir: &Path, base_dir: &str) -> Result<Vec<Value>, String> {
    let mut items: Vec<Value> = Vec::new();

    if !dir.exists() {
        return Ok(items);
    }

    let mut entries: Vec<_> = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read docs directory: {}", e))?
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
            let children = list_docs_recursive(&full_path, &relative_path)?;
            items.push(json!({
                "name": name,
                "path": relative_path,
                "type": "folder",
                "children": children,
            }));
        } else if name.ends_with(".md") {
            let meta = fs::metadata(&full_path).ok();
            let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
            let (created, modified) = file_times(&full_path);
            let display_name = name.trim_end_matches(".md").to_string();
            items.push(json!({
                "name": display_name,
                "path": relative_path,
                "type": "file",
                "fullPath": full_path.to_string_lossy(),
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

fn doc_full_path(docs_path: &Path, doc_path: &str) -> PathBuf {
    if doc_path.ends_with(".md") {
        docs_path.join(doc_path)
    } else {
        docs_path.join(format!("{}.md", doc_path))
    }
}

#[tauri::command]
pub async fn docs_list(
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Vec<Value>, String> {
    let paths = resolve_docs_paths(&app_handle, project_name, is_global)?;
    list_docs_recursive(&paths.docs_path, "")
}

#[tauri::command]
pub async fn docs_read(
    doc_path: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let paths = resolve_docs_paths(&app_handle, project_name, is_global)?;
    let full_path = doc_full_path(&paths.docs_path, &doc_path);

    if !full_path.exists() {
        return Err(format!("Document not found: {}", doc_path));
    }

    let content = fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read document: {}", e))?;
    let size = fs::metadata(&full_path).map(|m| m.len()).unwrap_or(0);
    let (created, modified) = file_times(&full_path);

    Ok(json!({
        "content": content,
        "path": doc_path,
        "created": created,
        "modified": modified,
        "size": size,
    }))
}

#[tauri::command]
pub async fn docs_save(
    doc_path: String,
    content: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let paths = resolve_docs_paths(&app_handle, project_name, is_global)?;
    let full_path = doc_full_path(&paths.docs_path, &doc_path);

    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create document directory: {}", e))?;
    }

    fs::write(&full_path, content).map_err(|e| format!("Failed to save document: {}", e))?;

    let size = fs::metadata(&full_path).map(|m| m.len()).unwrap_or(0);
    let (created, modified) = file_times(&full_path);

    Ok(json!({
        "path": doc_path,
        "created": created,
        "modified": modified,
        "size": size,
    }))
}

#[tauri::command]
pub async fn docs_delete(
    doc_path: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let paths = resolve_docs_paths(&app_handle, project_name, is_global)?;
    let full_path = doc_full_path(&paths.docs_path, &doc_path);

    if full_path.exists() {
        fs::remove_file(&full_path).map_err(|e| format!("Failed to delete document: {}", e))?;
        return Ok(json!({ "success": true }));
    }

    Err(format!("Document not found: {}", doc_path))
}

#[tauri::command]
pub async fn docs_create_folder(
    folder_path: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let paths = resolve_docs_paths(&app_handle, project_name, is_global)?;
    let full_path = paths.docs_path.join(&folder_path);

    if !full_path.exists() {
        fs::create_dir_all(&full_path)
            .map_err(|e| format!("Failed to create folder: {}", e))?;
    }

    Ok(json!({ "success": true, "path": folder_path }))
}

#[tauri::command]
pub async fn docs_list_images(
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Vec<Value>, String> {
    let paths = resolve_docs_paths(&app_handle, project_name, is_global)?;

    if !paths.images_path.exists() {
        return Ok(vec![]);
    }

    let mut images = Vec::new();
    for entry in fs::read_dir(&paths.images_path)
        .map_err(|e| format!("Failed to read images directory: {}", e))?
    {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let lower = name.to_lowercase();
        if !lower.ends_with(".jpg")
            && !lower.ends_with(".jpeg")
            && !lower.ends_with(".png")
            && !lower.ends_with(".gif")
            && !lower.ends_with(".webp")
            && !lower.ends_with(".svg")
        {
            continue;
        }

        let full_path = entry.path();
        let size = fs::metadata(&full_path).map(|m| m.len()).unwrap_or(0);
        let (created, modified) = file_times(&full_path);

        images.push(json!({
            "name": name,
            "path": name,
            "fullPath": full_path.to_string_lossy(),
            "size": size,
            "created": created,
            "modified": modified,
        }));
    }

    Ok(images)
}

#[tauri::command]
pub async fn docs_get_image(
    image_path: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<String, String> {
    let paths = resolve_docs_paths(&app_handle, project_name, is_global)?;
    let full_path = paths.images_path.join(&image_path);

    if !full_path.exists() {
        return Err(format!("Image not found: {}", image_path));
    }

    let image_buffer =
        fs::read(&full_path).map_err(|e| format!("Failed to read image: {}", e))?;
    let ext = full_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mime_type = if ext == "svg" {
        "image/svg+xml".to_string()
    } else {
        format!("image/{}", ext)
    };

    let base64 = base64_encode(&image_buffer);
    Ok(format!("data:{};base64,{}", mime_type, base64))
}

#[tauri::command]
pub async fn docs_save_image(
    image_name: String,
    image_data: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let paths = resolve_docs_paths(&app_handle, project_name, is_global)?;
    let full_path = paths.images_path.join(&image_name);

    let buffer = if image_data.starts_with("data:") {
        let base64_data = image_data
            .split(',')
            .nth(1)
            .ok_or_else(|| "Invalid image data URL".to_string())?;
        base64_decode(base64_data)?
    } else {
        base64_decode(&image_data)?
    };

    fs::write(&full_path, buffer).map_err(|e| format!("Failed to save image: {}", e))?;

    let size = fs::metadata(&full_path).map(|m| m.len()).unwrap_or(0);
    let (created, modified) = file_times(&full_path);

    Ok(json!({
        "name": image_name,
        "path": image_name,
        "size": size,
        "created": created,
        "modified": modified,
    }))
}

#[tauri::command]
pub async fn docs_delete_image(
    image_path: String,
    project_name: Option<String>,
    is_global: bool,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let paths = resolve_docs_paths(&app_handle, project_name, is_global)?;
    let full_path = paths.images_path.join(&image_path);

    if full_path.exists() {
        fs::remove_file(&full_path).map_err(|e| format!("Failed to delete image: {}", e))?;
        return Ok(json!({ "success": true }));
    }

    Err(format!("Image not found: {}", image_path))
}

fn base64_encode(data: &[u8]) -> String {
    const TABLE: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        out.push(TABLE[((triple >> 18) & 63) as usize] as char);
        out.push(TABLE[((triple >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 {
            TABLE[((triple >> 6) & 63) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            TABLE[(triple & 63) as usize] as char
        } else {
            '='
        });
    }
    out
}

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    let input = input.trim();
    let mut buf = Vec::with_capacity(input.len() * 3 / 4);
    let mut acc = 0u32;
    let mut bits = 0u32;

    for ch in input.chars() {
        if ch == '=' {
            break;
        }
        let val = match ch {
            'A'..='Z' => (ch as u8) - b'A',
            'a'..='z' => (ch as u8) - b'a' + 26,
            '0'..='9' => (ch as u8) - b'0' + 52,
            '+' => 62,
            '/' => 63,
            _ => continue,
        };
        acc = (acc << 6) | val as u32;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            buf.push((acc >> (bits - 8)) as u8);
            acc &= (1 << bits) - 1;
        }
    }

    Ok(buf)
}
