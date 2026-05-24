use serde_json;
use tauri::{AppHandle, Manager, Emitter};
use crate::{AppState, get_project_dir};
use crate::models::{Node, Parent};
use crate::database::{load_project_database, save_project_database, get_collection_data, update_collection_data};

// Helper function to get ISO8601 timestamp
fn get_iso8601_time() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap();
    
    let total_secs = now.as_secs();
    let days = total_secs / 86400;
    let secs_today = total_secs % 86400;
    
    let mut year = 1970u32;
    let mut remaining_days = days;
    
    loop {
        let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let days_in_year = if is_leap { 366 } else { 365 };
        if remaining_days >= days_in_year {
            remaining_days -= days_in_year;
            year += 1;
        } else {
            break;
        }
    }
    
    let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let month_days = [31, if is_leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month = 1u32;
    let mut day = remaining_days as u32 + 1;
    
    for &md in &month_days {
        if day > md {
            day -= md;
            month += 1;
        } else {
            break;
        }
    }
    
    let hour = (secs_today / 3600) as u32;
    let minute = ((secs_today % 3600) / 60) as u32;
    let second = (secs_today % 60) as u32;
    let millis_part = now.subsec_nanos() / 1_000_000;
    
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z", 
        year, month, day, hour, minute, second, millis_part)
}

// Helper function to get parents from typed database
fn get_parents(db: &serde_json::Value) -> Vec<Parent> {
    let parents_data = get_collection_data(db, "parents");
    parents_data.iter()
        .filter_map(|v| serde_json::from_value::<Parent>(v.clone()).ok())
        .collect()
}

// Helper function to find next parent ID
fn get_next_parent_id(parents: &[Parent]) -> u64 {
    if parents.is_empty() {
        return 1;
    }
    
    parents.iter()
        .filter_map(|p| p.loki_id)
        .max()
        .map(|max| max + 1)
        .unwrap_or(1)
}

#[tauri::command]
pub async fn api_get_parents(
    project_name: String,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    use crate::database::load_project_database;
    
    // Try to get from cache first
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get(&project_name) {
        // Use cached data
        let mut parents_obj = serde_json::Map::new();
        for parent_json in &cached_data.parents {
            if let Some(id) = parent_json.get("id").or_else(|| parent_json.get("Id")).and_then(|v| v.as_str()) {
                parents_obj.insert(id.to_string(), parent_json.clone());
            }
        }
        return Ok(serde_json::Value::Object(parents_obj));
    }
    drop(state); // Release lock before potentially reading file
    
    // Fallback to reading file if not cached
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let db = load_project_database(&project_path)?;
    
    let parents = get_parents(&db);
    
    // Convert to object keyed by ID (matching ParentService.getParents format)
    let mut parents_obj = serde_json::Map::new();
    for parent in parents {
        parents_obj.insert(parent.id.clone(), serde_json::to_value(&parent).unwrap());
    }
    
    Ok(serde_json::Value::Object(parents_obj))
}

#[tauri::command]
pub async fn api_get_parent_order(
    project_name: String,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    use crate::database::load_project_database;
    
    // Try to get from cache first
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get(&project_name) {
        // Return parentOrder as array of strings (parent IDs)
        let parent_order: Vec<serde_json::Value> = cached_data.parent_order.iter()
            .filter_map(|item| {
                // Handle both object format {parentId: "..."} and string format
                if let Some(parent_id) = item.get("parentId").or_else(|| item.get("parent_id")) {
                    Some(parent_id.clone())
                } else if item.is_string() {
                    Some(item.clone())
                } else {
                    None
                }
            })
            .collect();
        return Ok(serde_json::Value::Array(parent_order));
    }
    drop(state);
    
    // Fallback to reading file
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let db = load_project_database(&project_path)?;
    
    let parent_order_data = get_collection_data(&db, "parentOrder");
    
    // Convert to array of strings (parent IDs)
    let parent_order: Vec<serde_json::Value> = parent_order_data.iter()
        .filter_map(|item| {
            if let Some(parent_id) = item.get("parentId").or_else(|| item.get("parent_id")) {
                Some(parent_id.clone())
            } else if item.is_string() {
                Some(item.clone())
            } else {
                None
            }
        })
        .collect();
    
    Ok(serde_json::Value::Array(parent_order))
}

#[tauri::command]
pub async fn api_create_parent(
    project_name: String,
    parent_title: String,
    trello_data: Option<serde_json::Value>,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Get parents as typed structs
    let mut parents = get_parents(&db);
    
    // Find next parent ID
    let next_id = get_next_parent_id(&parents);
    let parent_id = format!("parent-{}", next_id);
    
    // Create parent using typed struct
    let mut new_parent = Parent::new(parent_id.clone(), parent_title, trello_data);
    new_parent.loki_id = Some(next_id);
    
    // Add to parents vector
    parents.push(new_parent.clone());
    
    // Get parentOrder collection
    let mut parent_order_data = get_collection_data(&db, "parentOrder");
    
    // Add to parentOrder (as object with parentId field)
    parent_order_data.push(serde_json::json!({
        "parentId": parent_id.clone()
    }));
    
    // Convert back to JSON
    let parents_json: Vec<serde_json::Value> = parents.iter()
        .map(|p| serde_json::to_value(p).unwrap())
        .collect();
    
    // Update database
    update_collection_data(&mut db, "parents", parents_json.clone());
    update_collection_data(&mut db, "parentOrder", parent_order_data.clone());
    save_project_database(&project_path, &db)?;
    
    // Update cache and state
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.parents = parents_json.clone();
        cached_data.parent_order = parent_order_data.clone();
    }
    
    // Convert to objects for state
    let mut parents_obj = serde_json::Map::new();
    for parent_json in &parents_json {
        if let Some(id) = parent_json.get("id").and_then(|v| v.as_str()) {
            parents_obj.insert(id.to_string(), parent_json.clone());
        }
    }
    
    // Convert parentOrder to array of strings
    let parent_order_array: Vec<serde_json::Value> = parent_order_data.iter()
        .filter_map(|item| {
            item.get("parentId").or_else(|| item.get("parent_id")).cloned()
                .or_else(|| if item.is_string() { Some(item.clone()) } else { None })
        })
        .collect();
    
    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        project_state.parents = Some(serde_json::Value::Object(parents_obj.clone()));
        project_state.parent_order = Some(serde_json::Value::Array(parent_order_array.clone()));
    }
    
    // Emit event
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "parents": serde_json::Value::Object(parents_obj),
            "parentOrder": serde_json::Value::Array(parent_order_array),
        });
        let _ = window.emit("UpdateProjectPageState", updated_state);
    }
    
    Ok(serde_json::to_value(&new_parent).unwrap())
}

#[tauri::command]
pub async fn api_delete_parent(
    project_name: String,
    parent_id: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Get parents and parentOrder as typed structs
    let mut parents = get_parents(&db);
    let mut parent_order_data = get_collection_data(&db, "parentOrder");
    
    // Remove parent from parents vector
    parents.retain(|p| p.id != parent_id);
    
    // Remove from parentOrder
    parent_order_data.retain(|item| {
        item.get("parentId").or_else(|| item.get("parent_id"))
            .and_then(|v| v.as_str())
            .map(|id| id != parent_id)
            .unwrap_or(false)
    });
    
    // Convert back to JSON
    let parents_json: Vec<serde_json::Value> = parents.iter()
        .map(|p| serde_json::to_value(p).unwrap())
        .collect();
    
    // Update database
    update_collection_data(&mut db, "parents", parents_json.clone());
    update_collection_data(&mut db, "parentOrder", parent_order_data.clone());
    save_project_database(&project_path, &db)?;
    
    // Update cache and state
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.parents = parents_json.clone();
        cached_data.parent_order = parent_order_data.clone();
    }
    
    // Convert to objects for state
    let mut parents_obj = serde_json::Map::new();
    for parent_json in &parents_json {
        if let Some(id) = parent_json.get("id").and_then(|v| v.as_str()) {
            parents_obj.insert(id.to_string(), parent_json.clone());
        }
    }
    
    let parent_order_array: Vec<serde_json::Value> = parent_order_data.iter()
        .filter_map(|item| {
            item.get("parentId").or_else(|| item.get("parent_id")).cloned()
                .or_else(|| if item.is_string() { Some(item.clone()) } else { None })
        })
        .collect();
    
    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        project_state.parents = Some(serde_json::Value::Object(parents_obj.clone()));
        project_state.parent_order = Some(serde_json::Value::Array(parent_order_array.clone()));
    }
    
    // Emit event
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "parents": serde_json::Value::Object(parents_obj),
            "parentOrder": serde_json::Value::Array(parent_order_array),
        });
        let _ = window.emit("UpdateProjectPageState", updated_state);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn api_update_parent_property(
    project_name: String,
    property_to_update: String,
    parent_id: String,
    new_value: serde_json::Value,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Get parents as typed structs
    let mut parents = get_parents(&db);
    
    // Find and update the parent
    let mut updated_parent: Option<Parent> = None;
    let mut parent_found = false;
    
    for parent in parents.iter_mut() {
        if parent.id == parent_id {
            // Update the property using serde_json
            let mut parent_json = serde_json::to_value(parent).unwrap();
            parent_json[&property_to_update] = new_value.clone();
            
            // Deserialize back to Parent struct
            updated_parent = serde_json::from_value::<Parent>(parent_json).ok();
            parent_found = true;
            break;
        }
    }
    
    if !parent_found {
        return Err(format!("Parent with id {} not found", parent_id));
    }
    
    // Replace the parent in the vector
    let updated_parent_for_return = updated_parent.clone();
    if let Some(updated) = updated_parent {
        if let Some(pos) = parents.iter().position(|p| p.id == parent_id) {
            parents[pos] = updated;
        }
    }
    
    // Convert back to JSON
    let parents_json: Vec<serde_json::Value> = parents.iter()
        .map(|p| serde_json::to_value(p).unwrap())
        .collect();
    
    // Update database
    update_collection_data(&mut db, "parents", parents_json.clone());
    save_project_database(&project_path, &db)?;
    
    // Update cache and state
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.parents = parents_json.clone();
    }
    
    // Convert to objects for state
    let mut parents_obj = serde_json::Map::new();
    for parent_json in &parents_json {
        if let Some(id) = parent_json.get("id").and_then(|v| v.as_str()) {
            parents_obj.insert(id.to_string(), parent_json.clone());
        }
    }
    
    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        project_state.parents = Some(serde_json::Value::Object(parents_obj.clone()));
    }
    
    // Emit event
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "parents": serde_json::Value::Object(parents_obj),
        });
        let _ = window.emit("UpdateProjectPageState", updated_state);
    }
    
    // Return updated parent
    if let Some(updated) = updated_parent_for_return {
        Ok(serde_json::to_value(&updated).unwrap())
    } else {
        Err("Failed to update parent".to_string())
    }
}

#[tauri::command]
pub async fn api_update_parent_order(
    project_name: String,
    parent_order: Vec<String>,
    app_handle: AppHandle,
) -> Result<(), String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Convert parent order array to collection format
    let parent_order_data: Vec<serde_json::Value> = parent_order.iter()
        .map(|parent_id| serde_json::json!({"parentId": parent_id}))
        .collect();
    
    // Update database
    update_collection_data(&mut db, "parentOrder", parent_order_data.clone());
    save_project_database(&project_path, &db)?;
    
    // Update cache and state
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.parent_order = parent_order_data.clone();
    }
    
    // Convert to array of strings for state
    let parent_order_array: Vec<serde_json::Value> = parent_order_data.iter()
        .filter_map(|item| item.get("parentId").cloned())
        .collect();
    
    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        project_state.parent_order = Some(serde_json::Value::Array(parent_order_array.clone()));
    }
    
    // Emit event
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "parentOrder": serde_json::Value::Array(parent_order_array),
        });
        let _ = window.emit("UpdateProjectPageState", updated_state);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn api_update_nodes_in_parents(
    project_name: String,
    updated_origin_parent: serde_json::Value,
    updated_destination_parent: serde_json::Value,
    node_id: String,
    _trello_auth: Option<serde_json::Value>,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Get nodes and parents as typed structs
    let nodes_data = get_collection_data(&db, "nodes");
    let mut nodes: Vec<Node> = nodes_data.iter()
        .filter_map(|v| serde_json::from_value::<Node>(v.clone()).ok())
        .collect();
    
    let mut parents = get_parents(&db);
    
    // Update origin parent
    if let Some(origin_id) = updated_origin_parent.get("id").and_then(|v| v.as_str()) {
        if let Some(parent) = parents.iter_mut().find(|p| p.id == origin_id) {
            if let Some(node_ids) = updated_origin_parent.get("nodeIds").and_then(|v| v.as_array()) {
                parent.node_ids = node_ids.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect();
            }
        }
    }
    
    // Update destination parent
    if let Some(dest_id) = updated_destination_parent.get("id").and_then(|v| v.as_str()) {
        if let Some(parent) = parents.iter_mut().find(|p| p.id == dest_id) {
            if let Some(node_ids) = updated_destination_parent.get("nodeIds").and_then(|v| v.as_array()) {
                parent.node_ids = node_ids.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect();
            }
        }
    }
    
    // Update node's parent
    if let Some(node) = nodes.iter_mut().find(|n| n.id == node_id) {
        if let Some(dest_id) = updated_destination_parent.get("id").and_then(|v| v.as_str()) {
            node.parent = dest_id.to_string();
            
            // Check if destination parent has markAsDoneOnDrag
            if updated_destination_parent.get("markAsDoneOnDrag").and_then(|v| v.as_bool()).unwrap_or(false) {
                node.is_complete = true;
                if node.completed_date.is_empty() {
                    node.completed_date = get_iso8601_time();
                }
            }
        }
    }
    
    // Convert back to JSON
    let nodes_json: Vec<serde_json::Value> = nodes.iter()
        .map(|n| serde_json::to_value(n).unwrap())
        .collect();
    
    let parents_json: Vec<serde_json::Value> = parents.iter()
        .map(|p| serde_json::to_value(p).unwrap())
        .collect();
    
    // Update database
    update_collection_data(&mut db, "nodes", nodes_json.clone());
    update_collection_data(&mut db, "parents", parents_json.clone());
    save_project_database(&project_path, &db)?;
    
    // Update cache and state
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.nodes = nodes_json.clone();
        cached_data.parents = parents_json.clone();
    }
    
    // Convert to objects for state
    let mut nodes_obj: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    for node_json in &nodes_json {
        if let Some(id) = node_json.get("id").and_then(|v| v.as_str()) {
            nodes_obj.insert(id.to_string(), node_json.clone());
        }
    }
    
    let mut parents_obj: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    for parent_json in &parents_json {
        if let Some(id) = parent_json.get("id").and_then(|v| v.as_str()) {
            parents_obj.insert(id.to_string(), parent_json.clone());
        }
    }
    
    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        project_state.nodes = Some(serde_json::Value::Object(nodes_obj.clone()));
        project_state.parents = Some(serde_json::Value::Object(parents_obj.clone()));
    }
    
    // Emit event
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "nodes": serde_json::Value::Object(nodes_obj),
            "parents": serde_json::Value::Object(parents_obj),
        });
        let _ = window.emit("UpdateProjectPageState", updated_state);
    }
    
    // Return updated node
    if let Some(node) = nodes.iter().find(|n| n.id == node_id) {
        Ok(serde_json::to_value(node).unwrap())
    } else {
        Err(format!("Node with id {} not found", node_id))
    }
}
