use serde_json;
use tauri::{AppHandle, Manager, Emitter};
use crate::{AppState, get_project_dir};
use crate::models::{NodeType, NodeState};
use crate::database::{load_project_database, save_project_database, get_collection_data, update_collection_data};

// Helper function to get node types from typed database
fn get_node_types(db: &crate::models::ProjectDatabase) -> Vec<NodeType> {
    let node_types_data = get_collection_data(db, "nodeTypes");
    node_types_data.iter()
        .filter_map(|v| serde_json::from_value::<NodeType>(v.clone()).ok())
        .collect()
}

// Helper function to get node states from typed database
fn get_node_states(db: &crate::models::ProjectDatabase) -> Vec<NodeState> {
    let node_states_data = get_collection_data(db, "nodeStates");
    node_states_data.iter()
        .filter_map(|v| serde_json::from_value::<NodeState>(v.clone()).ok())
        .collect()
}

// Helper function to find next metadata ID
fn get_next_metadata_id(items: &[serde_json::Value]) -> u64 {
    if items.is_empty() {
        return 1;
    }
    
    items.iter()
        .filter_map(|item| item.get("$loki").and_then(|v| v.as_u64()))
        .max()
        .map(|max| max + 1)
        .unwrap_or(1)
}

#[tauri::command]
pub async fn api_get_node_types(
    project_name: String,
    app_handle: AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    // Try to get from cache first
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get(&project_name) {
        // Filter out null IDs
        let filtered: Vec<serde_json::Value> = cached_data.node_types.iter()
            .filter(|item| {
                item.get("id").or_else(|| item.get("Id"))
                    .and_then(|v| v.as_str())
                    .map(|id| id != "null" && !id.is_empty())
                    .unwrap_or(false)
            })
            .cloned()
            .collect();
        return Ok(filtered);
    }
    drop(state);
    
    // Fallback to reading file
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let db = load_project_database(&project_path)?;
    
    let node_types = get_node_types(&db);
    
    // Filter out null IDs and convert to JSON
    let filtered: Vec<serde_json::Value> = node_types.iter()
        .filter(|nt| nt.id != "null" && !nt.id.is_empty())
        .map(|nt| serde_json::to_value(nt).unwrap())
        .collect();
    
    Ok(filtered)
}

#[tauri::command]
pub async fn api_get_node_states(
    project_name: String,
    app_handle: AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    // Try to get from cache first
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get(&project_name) {
        // Filter out null IDs
        let filtered: Vec<serde_json::Value> = cached_data.node_states.iter()
            .filter(|item| {
                item.get("id").or_else(|| item.get("Id"))
                    .and_then(|v| v.as_str())
                    .map(|id| id != "null" && !id.is_empty())
                    .unwrap_or(false)
            })
            .cloned()
            .collect();
        return Ok(filtered);
    }
    drop(state);
    
    // Fallback to reading file
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let db = load_project_database(&project_path)?;
    
    let node_states = get_node_states(&db);
    
    // Filter out null IDs and convert to JSON
    let filtered: Vec<serde_json::Value> = node_states.iter()
        .filter(|ns| ns.id != "null" && !ns.id.is_empty())
        .map(|ns| serde_json::to_value(ns).unwrap())
        .collect();
    
    Ok(filtered)
}

#[tauri::command]
pub async fn api_save_metadata_value(
    project_name: String,
    enum_value_title: String,
    parent_enum: String,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Determine which collection to update based on parent_enum
    let collection_name = match parent_enum.as_str() {
        "nodeType" => "nodeTypes",
        "nodeState" => "nodeStates",
        _ => return Err(format!("Unknown parent enum: {}", parent_enum)),
    };
    
    // Get the collection data
    let mut collection_data = get_collection_data(&db, collection_name);
    
    // Find next ID
    let next_id = get_next_metadata_id(&collection_data);
    let enum_id = format!("{}-{}", parent_enum, next_id);
    
    // Create new metadata value
    let new_value = match parent_enum.as_str() {
        "nodeType" => {
            let node_type = NodeType::new(enum_id, enum_value_title, next_id);
            serde_json::to_value(&node_type).unwrap()
        },
        "nodeState" => {
            let node_state = NodeState::new(enum_id, enum_value_title, next_id);
            serde_json::to_value(&node_state).unwrap()
        },
        _ => return Err(format!("Unknown parent enum: {}", parent_enum)),
    };
    
    // Add to collection
    collection_data.push(new_value.clone());
    
    // Update database
    update_collection_data(&mut db, collection_name, collection_data.clone());
    save_project_database(&project_path, &db)?;
    
    // Update cache
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        match parent_enum.as_str() {
            "nodeType" => cached_data.node_types = collection_data.clone(),
            "nodeState" => cached_data.node_states = collection_data.clone(),
            _ => {},
        }
    }
    
    Ok(new_value)
}
