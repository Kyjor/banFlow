use serde_json;
use tauri::{AppHandle, Manager, Emitter};
use crate::{AppState, get_project_dir};
use crate::models::Tag;
use crate::database::{load_project_database, save_project_database, get_collection_data, update_collection_data};

// Helper function to get tags from typed database
fn get_tags(db: &crate::models::ProjectDatabase) -> Vec<Tag> {
    let tags_data = get_collection_data(db, "tags");
    tags_data.iter()
        .filter_map(|v| serde_json::from_value::<Tag>(v.clone()).ok())
        .collect()
}

// Helper function to find next tag ID
fn get_next_tag_id(tags: &[Tag]) -> u64 {
    if tags.is_empty() {
        return 1;
    }
    
    tags.iter()
        .filter_map(|t| t.loki_id)
        .max()
        .map(|max| max + 1)
        .unwrap_or(1)
}

#[tauri::command]
pub async fn api_get_tags(
    project_name: String,
    app_handle: AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    // Try to get from cache first
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get(&project_name) {
        // Filter out null IDs (matching TagService.getTags)
        let filtered_tags: Vec<serde_json::Value> = cached_data.tags.iter()
            .filter(|tag| {
                tag.get("id").or_else(|| tag.get("Id"))
                    .and_then(|v| v.as_str())
                    .map(|id| id != "null" && !id.is_empty())
                    .unwrap_or(false)
            })
            .cloned()
            .collect();
        return Ok(filtered_tags);
    }
    drop(state);
    
    // Fallback to reading file
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    
    if !project_path.exists() {
        return Ok(vec![]);
    }
    
    let db = load_project_database(&project_path)?;
    let tags = get_tags(&db);
    
    // Filter out null IDs and convert to JSON
    let filtered_tags: Vec<serde_json::Value> = tags.iter()
        .filter(|tag| tag.id != "null" && !tag.id.is_empty())
        .map(|tag| serde_json::to_value(tag).unwrap())
        .collect();
    
    Ok(filtered_tags)
}

#[tauri::command]
pub async fn api_add_tag(
    project_name: String,
    tag_title: String,
    color: String,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Get tags as typed structs
    let mut tags = get_tags(&db);
    
    // Find next tag ID
    let next_id = get_next_tag_id(&tags);
    let tag_id = format!("tag-{}", next_id);
    
    // Create tag using typed struct
    let new_tag = Tag::new(tag_id, tag_title, color, next_id);
    
    // Add to tags vector
    tags.push(new_tag.clone());
    
    // Convert back to JSON
    let tags_json: Vec<serde_json::Value> = tags.iter()
        .map(|t| serde_json::to_value(t).unwrap())
        .collect();
    
    // Update database
    update_collection_data(&mut db, "tags", tags_json.clone());
    save_project_database(&project_path, &db)?;
    
    // Update cache and state
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.tags = tags_json.clone();
    }
    
    Ok(serde_json::to_value(&new_tag).unwrap())
}

#[tauri::command]
pub async fn api_update_tag_color(
    project_name: String,
    tag_title: String,
    color: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Get tags as typed structs
    let mut tags = get_tags(&db);
    
    // Find and update the tag
    let mut tag_found = false;
    for tag in tags.iter_mut() {
        if tag.title == tag_title {
            tag.color = color.clone();
            tag_found = true;
            break;
        }
    }
    
    if !tag_found {
        return Err(format!("Tag with title {} not found", tag_title));
    }
    
    // Convert back to JSON
    let tags_json: Vec<serde_json::Value> = tags.iter()
        .map(|t| serde_json::to_value(t).unwrap())
        .collect();
    
    // Update database
    update_collection_data(&mut db, "tags", tags_json.clone());
    save_project_database(&project_path, &db)?;
    
    // Update cache
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.tags = tags_json;
    }
    
    Ok(())
}
