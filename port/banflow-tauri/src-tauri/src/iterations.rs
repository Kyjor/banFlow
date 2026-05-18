use serde_json;
use tauri::{AppHandle, Manager, Emitter};
use crate::{AppState, get_project_dir};
use crate::models::Iteration;
use crate::database::{load_project_database, save_project_database, get_collection_data, update_collection_data};

// Helper function to get iterations from typed database
fn get_iterations(db: &crate::models::ProjectDatabase) -> Vec<Iteration> {
    let iterations_data = get_collection_data(db, "iterations");
    iterations_data.iter()
        .filter_map(|v| serde_json::from_value::<Iteration>(v.clone()).ok())
        .collect()
}

// Helper function to find next iteration ID
fn get_next_iteration_id(iterations: &[Iteration]) -> u64 {
    if iterations.is_empty() {
        return 1;
    }
    
    iterations.iter()
        .filter_map(|i| i.loki_id)
        .max()
        .map(|max| max + 1)
        .unwrap_or(1)
}

#[tauri::command]
pub async fn api_get_iterations(
    project_name: String,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    // Try to get from cache first
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get(&project_name) {
        // Convert to object keyed by ID (matching IterationService.getIterations format)
        let mut iterations_obj: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
        for iteration_json in &cached_data.iterations {
            if let Some(id) = iteration_json.get("id").or_else(|| iteration_json.get("Id")).and_then(|v| v.as_str()) {
                if id != "null" && !id.is_empty() {
                    iterations_obj.insert(id.to_string(), iteration_json.clone());
                }
            }
        }
        return Ok(serde_json::Value::Object(iterations_obj));
    }
    drop(state);
    
    // Fallback to reading file
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let db = load_project_database(&project_path)?;
    
    let iterations = get_iterations(&db);
    
    // Convert to object keyed by ID (matching IterationService.getIterations format)
    let mut iterations_obj: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    for iteration in iterations {
        if iteration.id != "null" && !iteration.id.is_empty() {
            iterations_obj.insert(iteration.id.clone(), serde_json::to_value(&iteration).unwrap());
        }
    }
    
    Ok(serde_json::Value::Object(iterations_obj))
}

#[tauri::command]
pub async fn api_create_iteration(
    project_name: String,
    iteration_title: String,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Get iterations as typed structs
    let mut iterations = get_iterations(&db);
    
    // Find next iteration ID
    let next_id = get_next_iteration_id(&iterations);
    let iteration_id = format!("iteration-{}", next_id);
    
    // Create iteration using typed struct
    let new_iteration = Iteration::new(iteration_id, iteration_title, next_id);
    
    // Add to iterations vector
    iterations.push(new_iteration.clone());
    
    // Convert back to JSON
    let iterations_json: Vec<serde_json::Value> = iterations.iter()
        .map(|i| serde_json::to_value(i).unwrap())
        .collect();
    
    // Update database
    update_collection_data(&mut db, "iterations", iterations_json.clone());
    save_project_database(&project_path, &db)?;
    
    // Update cache and state
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.iterations = iterations_json.clone();
    }
    
    // Convert to object for state
    let mut iterations_obj: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    for iteration_json in &iterations_json {
        if let Some(id) = iteration_json.get("id").and_then(|v| v.as_str()) {
            iterations_obj.insert(id.to_string(), iteration_json.clone());
        }
    }
    
    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        project_state.iterations = Some(serde_json::Value::Object(iterations_obj.clone()));
    }
    
    // Emit event
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "iterations": serde_json::Value::Object(iterations_obj),
        });
        let _ = window.emit("UpdateProjectPageState", updated_state);
    }
    
    Ok(serde_json::to_value(&new_iteration).unwrap())
}

#[tauri::command]
pub async fn api_delete_iteration(
    project_name: String,
    iteration_id: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Get iterations as typed structs
    let mut iterations = get_iterations(&db);
    
    // Remove iteration
    iterations.retain(|i| i.id != iteration_id);
    
    // Convert back to JSON
    let iterations_json: Vec<serde_json::Value> = iterations.iter()
        .map(|i| serde_json::to_value(i).unwrap())
        .collect();
    
    // Update database
    update_collection_data(&mut db, "iterations", iterations_json.clone());
    save_project_database(&project_path, &db)?;
    
    // Update cache and state
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.iterations = iterations_json.clone();
    }
    
    // Convert to object for state
    let mut iterations_obj: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    for iteration_json in &iterations_json {
        if let Some(id) = iteration_json.get("id").and_then(|v| v.as_str()) {
            iterations_obj.insert(id.to_string(), iteration_json.clone());
        }
    }
    
    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        project_state.iterations = Some(serde_json::Value::Object(iterations_obj.clone()));
    }
    
    // Emit event
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "iterations": serde_json::Value::Object(iterations_obj),
        });
        let _ = window.emit("UpdateProjectPageState", updated_state);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn api_update_iteration_property(
    project_name: String,
    property_to_update: String,
    iteration_id: String,
    new_value: serde_json::Value,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Get iterations as typed structs
    let mut iterations = get_iterations(&db);
    
    // Find and update the iteration
    let mut updated_iteration: Option<Iteration> = None;
    let mut iteration_found = false;
    
    for iteration in iterations.iter_mut() {
        if iteration.id == iteration_id {
            // Update the property using serde_json
            let mut iteration_json = serde_json::to_value(iteration).unwrap();
            iteration_json[&property_to_update] = new_value.clone();
            
            // Deserialize back to Iteration struct
            updated_iteration = serde_json::from_value::<Iteration>(iteration_json).ok();
            iteration_found = true;
            break;
        }
    }
    
    if !iteration_found {
        return Err(format!("Iteration with id {} not found", iteration_id));
    }
    
    // Replace the iteration in the vector
    let updated_iteration_for_return = updated_iteration.clone();
    if let Some(updated) = updated_iteration {
        if let Some(pos) = iterations.iter().position(|i| i.id == iteration_id) {
            iterations[pos] = updated;
        }
    }
    
    // Convert back to JSON
    let iterations_json: Vec<serde_json::Value> = iterations.iter()
        .map(|i| serde_json::to_value(i).unwrap())
        .collect();
    
    // Update database
    update_collection_data(&mut db, "iterations", iterations_json.clone());
    save_project_database(&project_path, &db)?;
    
    // Update cache and state
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.iterations = iterations_json.clone();
    }
    
    // Convert to object for state
    let mut iterations_obj: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    for iteration_json in &iterations_json {
        if let Some(id) = iteration_json.get("id").and_then(|v| v.as_str()) {
            iterations_obj.insert(id.to_string(), iteration_json.clone());
        }
    }
    
    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        project_state.iterations = Some(serde_json::Value::Object(iterations_obj.clone()));
    }
    
    // Emit event
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "iterations": serde_json::Value::Object(iterations_obj),
        });
        let _ = window.emit("UpdateProjectPageState", updated_state);
    }
    
    // Return updated iteration
    if let Some(updated) = updated_iteration_for_return {
        Ok(serde_json::to_value(&updated).unwrap())
    } else {
        Err("Failed to update iteration".to_string())
    }
}
