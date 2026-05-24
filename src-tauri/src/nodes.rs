use serde_json;
use tauri::{AppHandle, Manager, Emitter};
use crate::{AppState, get_project_dir};
use crate::models::{Node, Parent};
use crate::database::{load_project_database, save_project_database, get_collection_data, update_collection_data};

// Helper function to get ISO8601 timestamp (matching ISO8601Service.getISO8601Time())
fn get_iso8601_time() -> String {
    // Format as ISO8601 string (e.g., "2024-01-01T12:00:00.000Z")
    // Since chrono isn't available, use a JavaScript-compatible format
    // Return timestamp in milliseconds - JavaScript can convert: new Date(timestamp).toISOString()
    use std::time::{SystemTime, UNIX_EPOCH};
    
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap();
    
    let millis = now.as_secs() * 1000 + (now.subsec_nanos() / 1_000_000) as u64;
    
    // Format as ISO8601 manually (simpler, more reliable calculation)
    // Use a library-free approach: calculate date components from Unix timestamp
    let total_secs = now.as_secs();
    let days = total_secs / 86400;
    let secs_today = total_secs % 86400;
    
    // Calculate year (accounting for leap years)
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
    
    // Calculate month and day
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
    
    // Format as ISO8601: YYYY-MM-DDTHH:mm:ss.sssZ
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z", 
        year, month, day, hour, minute, second, millis_part)
}

// Helper function to get nodes from typed database
fn get_nodes(db: &serde_json::Value) -> Vec<Node> {
    let nodes_data = get_collection_data(db, "nodes");
    nodes_data.iter()
        .filter_map(|v| serde_json::from_value::<Node>(v.clone()).ok())
        .collect()
}

// Helper function to get parents from typed database
fn get_parents(db: &serde_json::Value) -> Vec<Parent> {
    let parents_data = get_collection_data(db, "parents");
    parents_data.iter()
        .filter_map(|v| serde_json::from_value::<Parent>(v.clone()).ok())
        .collect()
}

// Helper function to find next node ID (matching NodeService logic)
fn get_next_node_id(nodes: &[Node]) -> u64 {
    if nodes.is_empty() {
        return 1;
    }
    
    // Find the highest $loki value (LokiJS internal ID)
    // Matching: nodes.chain().simplesort('$loki', true).data()[0].$loki + 1
    nodes.iter()
        .filter_map(|node| node.loki_id)
        .max()
        .map(|max| max + 1)
        .unwrap_or(1)
}

#[tauri::command]
pub async fn api_create_node(
    project_name: String,
    node_type: String,
    node_title: String,
    parent_id: String,
    iteration_id: Option<String>,
    trello_data: Option<serde_json::Value>,
    _trello_auth: Option<serde_json::Value>,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    
    // Load project database from file (using typed structs)
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    
    // Load typed database structure
    let mut db = load_project_database(&project_path)?;
    
    // Get nodes and parents as typed structs
    let mut nodes = get_nodes(&db);
    let mut parents = get_parents(&db);
    
    // Find next node ID
    let next_id = get_next_node_id(&nodes);
    
    // Create node using typed struct (matching NodeService.createNode)
    let created = get_iso8601_time();
    let last_updated = get_iso8601_time();
    let mut new_node = Node::new(
        node_type,
        node_title,
        parent_id.clone(),
        iteration_id.unwrap_or_default(),
        created,
        last_updated,
        next_id,
    );
    
    // Handle Trello data if provided
    if let Some(trello) = trello_data {
        new_node.trello = Some(trello);
        // TODO: Parse banflow:timeSpent from Trello description if needed
    }
    
    // Add node to nodes vector
    nodes.push(new_node.clone());
    
    // Update parent's nodeIds array
    let mut parent_found = false;
    for parent in parents.iter_mut() {
        if parent.id == parent_id {
            parent.node_ids.push(new_node.id.clone());
            parent_found = true;
            break;
        }
    }
    
    if !parent_found && !parent_id.is_empty() {
        return Err(format!("Parent with id {} not found", parent_id));
    }
    
    // Convert typed structs back to JSON for storage
    let nodes_json: Vec<serde_json::Value> = nodes.iter()
        .map(|n| serde_json::to_value(n).unwrap())
        .collect();
    
    let parents_json: Vec<serde_json::Value> = parents.iter()
        .map(|p| serde_json::to_value(p).unwrap())
        .collect();
    
    // Update database collections
    update_collection_data(&mut db, "nodes", nodes_json.clone());
    update_collection_data(&mut db, "parents", parents_json.clone());
    
    // Save database back to file
    save_project_database(&project_path, &db)?;
    
    // Update central state and cache (like Electron's individualProjectStateValue)
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    // Update cache with new nodes and parents
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.nodes = nodes_json.clone();
        cached_data.parents = parents_json.clone();
    }
    
    // Convert nodes array to object keyed by ID for state
    let mut nodes_obj = serde_json::Map::new();
    for node_json in &nodes_json {
        if let Some(id) = node_json.get("id").and_then(|v| v.as_str()) {
            nodes_obj.insert(id.to_string(), node_json.clone());
        }
    }
    
    // Convert parents array to object keyed by ID for state
    let mut parents_obj = serde_json::Map::new();
    for parent_json in &parents_json {
        if let Some(id) = parent_json.get("id").and_then(|v| v.as_str()) {
            parents_obj.insert(id.to_string(), parent_json.clone());
        }
    }
    
    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        project_state.nodes = Some(serde_json::Value::Object(nodes_obj.clone()));
        project_state.parents = Some(serde_json::Value::Object(parents_obj.clone()));
    }
    
    // Emit event to frontend (like Electron's mainWindow.webContents.send)
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "nodes": serde_json::Value::Object(nodes_obj),
            "parents": serde_json::Value::Object(parents_obj),
        });
        let _ = window.emit("UpdateProjectPageState", updated_state);
    }
    
    // Return node as JSON (matching Electron return format)
    Ok(serde_json::to_value(&new_node).unwrap())
}

#[tauri::command]
pub async fn api_update_node_property(
    project_name: String,
    property_to_update: String,
    node_id: String,
    new_value: serde_json::Value,
    _trello_auth: Option<serde_json::Value>,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    use crate::database::{load_project_database, save_project_database, get_collection_data, update_collection_data};
    
    // Load project database from file (using typed structs)
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    
    // Load typed database structure
    let mut db = load_project_database(&project_path)?;
    
    // Get nodes as typed structs
    let mut nodes = get_nodes(&db);
    
    // Log raw node data from database for debugging
    let raw_nodes_data = get_collection_data(&db, "nodes");
    eprintln!("[api_update_node_property] Looking for node_id: '{}'", node_id);
    eprintln!("[api_update_node_property] Total raw nodes in database: {}", raw_nodes_data.len());
    eprintln!("[api_update_node_property] Total deserialized nodes: {}", nodes.len());
    
    // Log first few raw node IDs to see format
    for (i, raw_node) in raw_nodes_data.iter().take(5).enumerate() {
        if let Some(id_val) = raw_node.get("id") {
            eprintln!("[api_update_node_property] Raw node {} id: {:?} (type: {})", i, id_val, 
                if id_val.is_string() { "string" } else if id_val.is_number() { "number" } else { "other" });
        }
    }
    
    // Find and update the node
    let mut updated_node: Option<Node> = None;
    let mut node_found = false;
    
    // Log available node IDs for debugging
    let available_ids: Vec<String> = nodes.iter().map(|n| n.id.clone()).collect();
    eprintln!("[api_update_node_property] Available deserialized node IDs: {:?}", available_ids);
    
    // Normalize node_id for comparison (trim whitespace)
    let node_id_trimmed = node_id.trim();
    
    for node in nodes.iter_mut() {
        // Compare with trimmed version to handle any whitespace issues
        let node_id_trimmed_compare = node.id.trim();
        eprintln!("[api_update_node_property] Comparing '{}' == '{}'", node_id_trimmed, node_id_trimmed_compare);
        if node_id_trimmed_compare == node_id_trimmed {
            // Update the property using reflection/serde
            // Since we can't dynamically set fields, we'll use serde_json to update
            let mut node_json = serde_json::to_value(node).unwrap();
            node_json[&property_to_update] = new_value.clone();
            node_json["lastUpdated"] = serde_json::Value::String(get_iso8601_time());
            
            // Deserialize back to Node struct
            updated_node = serde_json::from_value::<Node>(node_json).ok();
            node_found = true;
            break;
        }
    }
    
    if !node_found {
        eprintln!("[api_update_node_property] Node with id '{}' not found in project '{}'", node_id, project_name);
        eprintln!("[api_update_node_property] Available node IDs: {:?}", available_ids);
        eprintln!("[api_update_node_property] Total nodes in database: {}", nodes.len());
        return Err(format!("Node with id '{}' not found in project '{}'. Available IDs: {:?}", node_id, project_name, available_ids));
    }
    
    // Replace the node in the vector and store the updated node for return
    let updated_node_for_return = updated_node.clone();
    if let Some(updated) = updated_node {
        if let Some(pos) = nodes.iter().position(|n| n.id == node_id) {
            nodes[pos] = updated;
        }
    }
    
    // Convert typed structs back to JSON for storage
    let nodes_json: Vec<serde_json::Value> = nodes.iter()
        .map(|n| serde_json::to_value(n).unwrap())
        .collect();
    
    // Update database collections
    update_collection_data(&mut db, "nodes", nodes_json.clone());
    
    // Save database back to file
    save_project_database(&project_path, &db)?;
    
    // Update central state and cache
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    // Update cache with new nodes
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.nodes = nodes_json.clone();
    }
    
    // Convert nodes array to object keyed by ID for state
    let mut nodes_obj = serde_json::Map::new();
    for node_json in &nodes_json {
        if let Some(id) = node_json.get("id").and_then(|v| v.as_str()) {
            nodes_obj.insert(id.to_string(), node_json.clone());
        }
    }
    
    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        project_state.nodes = Some(serde_json::Value::Object(nodes_obj.clone()));
    }
    
    // Emit event to frontend
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "nodes": serde_json::Value::Object(nodes_obj),
        });
        let _ = window.emit("UpdateProjectPageState", updated_state);
    }
    
    // Return updated node
    if let Some(updated) = updated_node_for_return {
        Ok(serde_json::to_value(&updated).unwrap())
    } else {
        Err("Failed to update node".to_string())
    }
}

#[tauri::command]
pub async fn api_delete_node(
    project_name: String,
    node_id: String,
    parent_id: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    use crate::database::{load_project_database, save_project_database, get_collection_data, update_collection_data};
    
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Get nodes and parents as typed structs
    let mut nodes = get_nodes(&db);
    let mut parents = get_parents(&db);
    
    // Remove node from nodes vector
    nodes.retain(|n| n.id != node_id);
    
    // Remove node ID from parent's nodeIds array
    for parent in parents.iter_mut() {
        if parent.id == parent_id {
            parent.node_ids.retain(|id| id != &node_id);
            break;
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
    let mut nodes_obj = serde_json::Map::new();
    for node_json in &nodes_json {
        if let Some(id) = node_json.get("id").and_then(|v| v.as_str()) {
            nodes_obj.insert(id.to_string(), node_json.clone());
        }
    }
    
    let mut parents_obj = serde_json::Map::new();
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
    
    Ok(())
}

#[tauri::command]
pub async fn api_get_node(
    project_name: String,
    node_id: String,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    use crate::database::load_project_database;
    
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let db = load_project_database(&project_path)?;
    
    let nodes = get_nodes(&db);
    
    if let Some(node) = nodes.iter().find(|n| n.id == node_id) {
        Ok(serde_json::to_value(node).unwrap())
    } else {
        Err(format!("Node with id {} not found", node_id))
    }
}

#[tauri::command]
pub async fn api_get_nodes(
    project_name: String,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    use crate::database::load_project_database;
    
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let db = load_project_database(&project_path)?;
    
    let nodes = get_nodes(&db);
    
    // Convert to object keyed by ID (matching NodeService.getNodes format)
    let mut nodes_obj = serde_json::Map::new();
    for node in nodes {
        nodes_obj.insert(node.id.clone(), serde_json::to_value(&node).unwrap());
    }
    
    Ok(serde_json::Value::Object(nodes_obj))
}

#[tauri::command]
pub async fn api_get_nodes_with_query(
    project_name: String,
    query: serde_json::Value,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    use crate::database::load_project_database;
    
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let db = load_project_database(&project_path)?;
    
    let nodes = get_nodes(&db);
    
    // Filter nodes based on query (simplified - matches basic LokiJS queries)
    // For now, handle common queries like { Id: { $ne: null } }
    let filtered_nodes: Vec<&Node> = if let Some(id_condition) = query.get("Id") {
        if let Some(ne_condition) = id_condition.get("$ne") {
            if ne_condition.is_null() {
                // Filter out nodes where Id is null (i.e., keep all valid nodes)
                nodes.iter().filter(|n| !n.id.is_empty()).collect()
            } else {
                nodes.iter().collect()
            }
        } else {
            nodes.iter().collect()
        }
    } else {
        nodes.iter().collect()
    };
    
    // Convert to object keyed by ID
    let mut nodes_obj = serde_json::Map::new();
    for node in filtered_nodes {
        nodes_obj.insert(node.id.clone(), serde_json::to_value(node).unwrap());
    }
    
    Ok(serde_json::Value::Object(nodes_obj))
}
