use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{Manager, Emitter};

// Module for data models
pub mod models;

// Module for database helpers
pub mod database;

// Module for node-related commands
pub mod nodes;

// Module for parent-related commands
pub mod parents;

// Module for tag-related commands
mod tags;

// Module for iteration-related commands
mod iterations;

// Module for timer-related commands
mod timer;

// Module for metadata-related commands
mod metadata;

// Project state structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectState {
    pub nodes: Option<serde_json::Value>,
    pub parents: Option<serde_json::Value>,
    #[serde(rename = "parentOrder")]
    pub parent_order: Option<serde_json::Value>,
    pub iterations: Option<serde_json::Value>,
    #[serde(rename = "lokiLoaded")]
    pub loki_loaded: Option<bool>,
    #[serde(rename = "projectName")]
    pub project_name: Option<String>,
    #[serde(rename = "projectSettings")]
    pub project_settings: Option<serde_json::Value>,
}

// Cached project data (parsed from LokiJS file)
#[derive(Debug, Clone)]
pub struct CachedProjectData {
    pub nodes: Vec<serde_json::Value>,
    pub parents: Vec<serde_json::Value>,
    pub parent_order: Vec<serde_json::Value>,
    pub iterations: Vec<serde_json::Value>,
    pub tags: Vec<serde_json::Value>,
    pub node_types: Vec<serde_json::Value>,
    pub node_states: Vec<serde_json::Value>,
}

// In-memory state storage (similar to Electron's individualProjectStateValue)
#[derive(Debug, Default)]
pub struct AppState {
    pub project_states: HashMap<String, ProjectState>,
    pub current_project: Option<String>,
    // Cache parsed project data to avoid re-reading files
    pub cached_project_data: HashMap<String, CachedProjectData>,
    // Timer window state
    pub timer_node: Option<serde_json::Value>,
    pub timer_project_name: Option<String>,
    pub timer_state_init: Option<serde_json::Value>,
    pub timer_prefs: Option<serde_json::Value>,
}

// Placeholder Tauri commands for banFlow
// These will be implemented to mirror Electron IPC handlers

#[tauri::command]
async fn ping() -> String {
    "pong".into()
}

#[tauri::command]
async fn initialize_loki_project(
    project_name: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    // In Electron, this just initializes the LokiService
    // In Tauri, we'll let the frontend handle LokiJS initialization
    // This command just acknowledges the initialization
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    state.current_project = Some(project_name.clone());
    drop(state); // Release lock before emitting event
    
    // Emit event to frontend (similar to Electron's webContents.send)
    if let Some(window) = app_handle.get_webview_window("main") {
        if let Err(e) = window.emit("UpdateCurrentProject", project_name.clone()) {
            eprintln!("[Rust] Failed to emit UpdateCurrentProject event: {:?}", e);
        }
    }
    
    Ok(project_name)
}

#[tauri::command]
async fn api_initialize_project_state(
    project_name: String,
    app_handle: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    // Load actual project data from LokiJS file
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    
    // Create file if it doesn't exist (empty project)
    use std::fs;
    if !project_path.exists() {
        fs::create_dir_all(&project_dir)
            .map_err(|e| format!("Failed to create project dir: {}", e))?;
        // Create empty LokiJS database structure
        let empty_db = serde_json::json!({
            "databaseVersion": 1.5,
            "engineVersion": 1.5,
            "collections": []
        });
        fs::write(&project_path, serde_json::to_string_pretty(&empty_db).unwrap())
            .map_err(|e| format!("Failed to create project file: {}", e))?;
    }
    
    // Load project database using typed structs
    use crate::database::load_project_database;
    use crate::database::get_collection_data;
    use crate::models::{Node, Parent, Iteration};
    
    let db = load_project_database(&project_path)?;
    
    // Get collections using typed structs
    let nodes_data = get_collection_data(&db, "nodes");
    let parents_data = get_collection_data(&db, "parents");
    let iterations_data = get_collection_data(&db, "iterations");
    let parent_order_data = get_collection_data(&db, "parentOrder");
    let tags_data = get_collection_data(&db, "tags");
    let node_types_data = get_collection_data(&db, "nodeTypes");
    let node_states_data = get_collection_data(&db, "nodeStates");
    
    // Convert to objects keyed by ID (frontend expects this format)
    let mut nodes_obj = serde_json::Map::new();
    for node_json in &nodes_data {
        if let Some(id) = node_json.get("id").or_else(|| node_json.get("Id")).and_then(|v| v.as_str()) {
            nodes_obj.insert(id.to_string(), node_json.clone());
        }
    }
    
    let mut parents_obj = serde_json::Map::new();
    for parent_json in &parents_data {
        if let Some(id) = parent_json.get("id").or_else(|| parent_json.get("Id")).and_then(|v| v.as_str()) {
            parents_obj.insert(id.to_string(), parent_json.clone());
        }
    }
    
    let mut iterations_obj = serde_json::Map::new();
    for iteration_json in &iterations_data {
        if let Some(id) = iteration_json.get("id").or_else(|| iteration_json.get("Id")).and_then(|v| v.as_str()) {
            iterations_obj.insert(id.to_string(), iteration_json.clone());
        }
    }
    
    // Convert parentOrder from array of objects [{parentId: "..."}] to array of strings ["..."]
    let mut parent_order_strings = Vec::new();
    for item in &parent_order_data {
        if let Some(parent_id) = item.get("parentId").and_then(|v| v.as_str()) {
            parent_order_strings.push(serde_json::Value::String(parent_id.to_string()));
        } else if let Some(parent_id) = item.as_str() {
            parent_order_strings.push(serde_json::Value::String(parent_id.to_string()));
        }
    }
    let parent_order_value = serde_json::Value::Array(parent_order_strings.clone());
    
    // Convert to ProjectState format
    let state = ProjectState {
        nodes: Some(serde_json::Value::Object(nodes_obj.clone())),
        parents: Some(serde_json::Value::Object(parents_obj.clone())),
        parent_order: Some(parent_order_value.clone()),
        iterations: Some(serde_json::Value::Object(iterations_obj.clone())),
        loki_loaded: Some(true),
        project_name: Some(project_name.clone()),
        project_settings: None, // TODO: Load from tags or separate collection
    };
    
    // Update central state (like Electron's individualProjectStateValue)
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut app_state_guard = app_state.lock().await;
    app_state_guard.project_states.insert(project_name.clone(), state.clone());
    app_state_guard.current_project = Some(project_name.clone());
    
    // Update cached_project_data with typed collections
    app_state_guard.cached_project_data.insert(project_name.clone(), CachedProjectData {
        nodes: nodes_data.clone(),
        parents: parents_data.clone(),
        parent_order: parent_order_data.clone(),
        iterations: iterations_data.clone(),
        tags: tags_data.clone(),
        node_types: node_types_data.clone(),
        node_states: node_states_data.clone(),
    });
    
    drop(app_state_guard); // Release lock before emitting event
    
    // Emit event to frontend (like Electron pattern - ensures UI updates)
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "nodes": serde_json::Value::Object(nodes_obj.clone()),
            "parents": serde_json::Value::Object(parents_obj.clone()),
            "parentOrder": parent_order_value.clone(),
            "iterations": serde_json::Value::Object(iterations_obj.clone()),
            "lokiLoaded": true,
            "projectName": project_name.clone(),
        });
        if let Err(e) = window.emit("UpdateProjectPageState", updated_state) {
            eprintln!("[Rust] Failed to emit UpdateProjectPageState event: {:?}", e);
        }
    }
    
    // Return as JSON value for compatibility
    let result = serde_json::to_value(state)
        .map_err(|e| format!("Failed to serialize state: {}", e))?;
    Ok(result)
}

#[tauri::command]
async fn api_get_project_state(
    app_handle: tauri::AppHandle,
) -> Result<Option<ProjectState>, String> {
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let state = app_state.lock().await;
    
    if let Some(project_name) = &state.current_project {
        Ok(state.project_states.get(project_name).cloned())
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn api_set_project_state(
    new_state: serde_json::Value,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    
    // Handle both direct object and wrapped object formats
    let state_value = if let Some(nested) = new_state.get("newState") {
        // If wrapped in { newState: {...} }, extract it
        nested.clone()
    } else if let Some(nested) = new_state.get("new_state") {
        // If wrapped in { new_state: {...} }, extract it
        nested.clone()
    } else {
        // Otherwise, assume the object itself is the state
        new_state
    };
    
    // Parse the JSON value into ProjectState
    let project_state: ProjectState = serde_json::from_value(state_value)
        .map_err(|e| format!("Failed to parse project state: {}", e))?;
    
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    if let Some(project_name) = &project_state.project_name {
        state.project_states.insert(project_name.clone(), project_state.clone());
        state.current_project = Some(project_name.clone());
        
        // Emit state update event
        // TODO: Fix event emission - need to import Emit trait
        // for window in app_handle.webview_windows().values() {
        //     let _ = window.emit("UpdateProjectPageState", &project_state);
        // }
    }
    
    Ok(())
}

// Parent-related commands moved to parents.rs module

#[tauri::command]
async fn api_create_parent_old(
    project_name: String,
    parent_title: String,
    trello_data: Option<serde_json::Value>,
    _trello_auth: Option<serde_json::Value>,
    app_handle: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    
    // Load current database (like Electron's currentLokiService)
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    
    // Load raw LokiJS file (not the parsed version)
    use std::fs;
    let contents = fs::read_to_string(&project_path)
        .map_err(|e| format!("Failed to read project file: {}", e))?;
    
    let mut db_json: serde_json::Value = if contents.trim().is_empty() {
        serde_json::json!({
            "databaseVersion": 1.5,
            "engineVersion": 1.5,
            "collections": []
        })
    } else {
        serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse project file: {}", e))?
    };
    
    // Get parents array from LokiJS collections structure
    let mut parents_array = if let Some(collections) = db_json.get("collections").and_then(|c| c.as_array()) {
        collections.iter()
            .find_map(|c| {
                if c.get("name").and_then(|n| n.as_str()) == Some("parents") {
                    c.get("data").and_then(|d| d.as_array()).cloned()
                } else {
                    None
                }
            })
            .unwrap_or_default()
    } else {
        vec![]
    };
    
    // Calculate next ID (like ParentService.createParent)
    let next_id = if parents_array.is_empty() {
        1
    } else {
        parents_array.iter()
            .filter_map(|p| {
                p.get("id").or_else(|| p.get("Id"))
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.strip_prefix("parent-"))
                    .and_then(|n| n.parse::<u64>().ok())
            })
            .max()
            .unwrap_or(0) + 1
    };
    
    
    // Create new parent (matching ParentService.createParent logic)
    let mut parent_data = serde_json::json!({
        "id": format!("parent-{}", next_id),
        "title": parent_title,
        "timeSpent": 0,
        "isTimed": true,
        "nodeHistory": [],
        "sessionHistory": [],
        "nodeIds": [],
    });
    
    if let Some(trello) = trello_data {
        parent_data["trello"] = trello;
    }
    
    // Add to parents array
    parents_array.push(parent_data.clone());
    
    // Update db_json with new parents in collections
    let collections = db_json.get_mut("collections")
        .and_then(|c| c.as_array_mut())
        .ok_or_else(|| "No collections array in database".to_string())?;
    
    // Find or create parents collection
    let mut found_parents = false;
    for collection in collections.iter_mut() {
        if collection.get("name").and_then(|n| n.as_str()) == Some("parents") {
            collection["data"] = serde_json::Value::Array(parents_array.clone());
            found_parents = true;
            break;
        }
    }
    
    if !found_parents {
        // Create parents collection if it doesn't exist
        collections.push(serde_json::json!({
            "name": "parents",
            "data": parents_array.clone(),
            "idIndex": {},
            "binaryIndices": {},
            "constraints": null,
            "uniqueNames": [],
            "transforms": [],
            "dirty": false
        }));
    }
    
    // Add to parentOrder (like ParentService.addParentToOrder)
    let mut parent_order = collections.iter()
        .find_map(|c| {
            if c.get("name").and_then(|n| n.as_str()) == Some("parentOrder") {
                c.get("data").and_then(|d| d.as_array()).cloned()
            } else {
                None
            }
        })
        .unwrap_or_default();
    
    parent_order.push(serde_json::json!({
        "parentId": format!("parent-{}", next_id)
    }));
    
    // Update parentOrder in collections
    let mut found_parent_order = false;
    for collection in collections.iter_mut() {
        if collection.get("name").and_then(|n| n.as_str()) == Some("parentOrder") {
            collection["data"] = serde_json::Value::Array(parent_order.clone());
            found_parent_order = true;
            break;
        }
    }
    
    if !found_parent_order {
        // Create parentOrder collection if it doesn't exist
        collections.push(serde_json::json!({
            "name": "parentOrder",
            "data": parent_order.clone(),
            "idIndex": {},
            "binaryIndices": {},
            "constraints": null,
            "uniqueNames": [],
            "transforms": [],
            "dirty": false
        }));
    }
    
    // Save back to file (like lokiService.saveDB())
    fs::write(&project_path, serde_json::to_string_pretty(&db_json).unwrap())
        .map_err(|e| format!("Failed to save project file: {}", e))?;
    
    // Update central state and cache (like Electron's individualProjectStateValue)
    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;
    
    // Update cache with new parents and parentOrder
    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.parents = parents_array.clone();
        cached_data.parent_order = parent_order.clone();
    }
    
    // Convert parents array to object keyed by ID for state
    let mut parents_obj = serde_json::Map::new();
    for parent in parents_array {
        if let Some(id) = parent.get("id").or_else(|| parent.get("Id")).and_then(|v| v.as_str()) {
            parents_obj.insert(id.to_string(), parent);
        }
    }
    
    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        project_state.parents = Some(serde_json::Value::Object(parents_obj.clone()));
        project_state.parent_order = Some(serde_json::Value::Array(parent_order.clone()));
    }
    
    // Emit event to frontend (like Electron's mainWindow.webContents.send)
    if let Some(window) = app_handle.get_webview_window("main") {
        let updated_state = serde_json::json!({
            "parents": serde_json::Value::Object(parents_obj),
            "parentOrder": serde_json::Value::Array(parent_order),
        });
        let _ = window.emit("UpdateProjectPageState", updated_state);
    }
    Ok(parent_data)
}

// Git commands using shell plugin
// Helper function to execute git command and return stdout
async fn git_command(repo_path: &str, args: &[&str]) -> Result<String, String> {
    let output = tokio::process::Command::new("git")
        .args(args)
        .current_dir(repo_path)
        .output()
        .await
        .map_err(|e| format!("Git command failed: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr));
    }
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
async fn git_get_repositories(
    _project_name: Option<String>,
) -> Result<Vec<serde_json::Value>, String> {
    // Return empty array for now - repositories are managed per-project
    // This could be enhanced to scan common git directories
    Ok(vec![])
}

#[tauri::command]
async fn git_load_project_repositories(
    project_name: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    // Load gitRepositories collection from the project's LokiJS database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    
    use std::fs;
    if !project_path.exists() {
        return Ok(vec![]);
    }
    
    let contents = fs::read_to_string(&project_path)
        .map_err(|e| format!("Failed to read project file: {}", e))?;
    
    if contents.trim().is_empty() {
        return Ok(vec![]);
    }
    
    let db_json: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse project file: {}", e))?;
    
    // Get gitRepositories array from LokiJS collections structure
    let git_repos_array = if let Some(collections) = db_json.get("collections").and_then(|c| c.as_array()) {
        collections.iter()
            .find_map(|c| {
                if c.get("name").and_then(|n| n.as_str()) == Some("gitRepositories") {
                    c.get("data").and_then(|d| d.as_array()).cloned()
                } else {
                    None
                }
            })
            .unwrap_or_default()
    } else {
        vec![]
    };
    
    // Filter repositories by projectName
    let project_repos: Vec<serde_json::Value> = git_repos_array
        .into_iter()
        .filter(|repo| {
            repo.get("projectName")
                .and_then(|pn| pn.as_str())
                .map(|pn| pn == project_name)
                .unwrap_or(false)
        })
        .collect();
    
    Ok(project_repos)
}

#[tauri::command]
async fn git_add_repository(
    repo_path: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    use std::path::Path;
    
    // If no path provided, open file dialog
    let repo_path = if let Some(path) = repo_path {
        path
    } else {
        // Open file dialog to select repository - use git_select_repository helper
        match git_select_repository(app_handle.clone()).await {
            Ok(Some(path)) => path,
            Ok(None) => return Err("No directory selected".to_string()),
            Err(e) => return Err(e),
        }
    };
    
    // Validate path exists
    if !Path::new(&repo_path).exists() {
        return Err("Repository path does not exist".to_string());
    }
    
    // Check if it's a git repository
    git_command(&repo_path, &["rev-parse", "--git-dir"]).await?;
    
    // Get current branch
    let current_branch = git_command(&repo_path, &["branch", "--show-current"]).await?
        .trim().to_string();
    
    // Get all branches
    let branches_output = git_command(&repo_path, &["branch", "-a"]).await?;
    let branches: Vec<String> = branches_output
        .lines()
        .map(|l| l.trim().replace("* ", "").replace("remotes/", "").trim().to_string())
        .filter(|l| !l.is_empty() && !l.starts_with("HEAD"))
        .collect();
    
    // Get remotes
    let remotes_output = git_command(&repo_path, &["remote", "-v"]).await?;
    let mut remotes_map: std::collections::HashMap<String, serde_json::Map<String, serde_json::Value>> = std::collections::HashMap::new();
    
    for line in remotes_output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let name = parts[0].to_string();
            let url = parts[1].to_string();
            let is_fetch = parts.len() > 2 && parts[2] == "(fetch)";
            let is_push = parts.len() > 2 && parts[2] == "(push)";
            
            let remote = remotes_map.entry(name.clone()).or_insert_with(|| {
                let mut r = serde_json::Map::new();
                r.insert("name".to_string(), serde_json::Value::String(name));
                let mut refs = serde_json::Map::new();
                refs.insert("fetch".to_string(), serde_json::Value::String(String::new()));
                refs.insert("push".to_string(), serde_json::Value::String(String::new()));
                r.insert("refs".to_string(), serde_json::Value::Object(refs));
                r
            });
            
            if let Some(refs) = remote.get_mut("refs").and_then(|r| r.as_object_mut()) {
                if is_fetch {
                    refs.insert("fetch".to_string(), serde_json::Value::String(url.clone()));
                }
                if is_push {
                    refs.insert("push".to_string(), serde_json::Value::String(url));
                }
            }
        }
    }
    
    // Get status
    let status_output = git_command(&repo_path, &["status", "--porcelain"]).await?;
    let mut staged = Vec::new();
    let mut modified = Vec::new();
    let mut deleted = Vec::new();
    let mut created = Vec::new();
    
    for line in status_output.lines() {
        if line.len() >= 3 {
            let status = &line[..2];
            let file = line[3..].trim().to_string();
            
            match status {
                s if s.starts_with('A') || (s.starts_with('M') && s.chars().nth(1) == Some(' ')) => {
                    staged.push(serde_json::Value::String(file.clone()));
                }
                s if s.starts_with('M') && s.chars().nth(1) != Some(' ') => {
                    modified.push(serde_json::Value::String(file.clone()));
                }
                s if s.starts_with('D') => {
                    deleted.push(serde_json::Value::String(file.clone()));
                }
                s if s == "??" => {
                    created.push(serde_json::Value::String(file.clone()));
                }
                _ => {}
            }
        }
    }
    
    // Get ahead/behind info (simplified - may fail if no tracking branch)
    let (ahead, behind) = if let Ok(output) = git_command(&repo_path, &["rev-list", "--left-right", "--count", 
        &format!("{}...origin/{}", current_branch, current_branch)]).await {
        let counts: Vec<&str> = output.trim().split_whitespace().collect();
        if counts.len() == 2 {
            (counts[0].parse().unwrap_or(0), counts[1].parse().unwrap_or(0))
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };
    
    let mut status_obj = serde_json::Map::new();
    status_obj.insert("staged".to_string(), serde_json::Value::Array(staged));
    status_obj.insert("modified".to_string(), serde_json::Value::Array(modified));
    status_obj.insert("deleted".to_string(), serde_json::Value::Array(deleted));
    status_obj.insert("created".to_string(), serde_json::Value::Array(created));
    status_obj.insert("conflicted".to_string(), serde_json::Value::Array(Vec::new()));
    status_obj.insert("ahead".to_string(), serde_json::Value::Number(ahead.into()));
    status_obj.insert("behind".to_string(), serde_json::Value::Number(behind.into()));
    status_obj.insert("current".to_string(), serde_json::Value::String(current_branch.clone()));
    status_obj.insert("tracking".to_string(), serde_json::Value::String(format!("origin/{}", current_branch)));
    
    use std::path::PathBuf;
    let repo_name = PathBuf::from(&repo_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("repository")
        .to_string();
    
    let mut repo_info = serde_json::Map::new();
    repo_info.insert("path".to_string(), serde_json::Value::String(repo_path));
    repo_info.insert("name".to_string(), serde_json::Value::String(repo_name));
    repo_info.insert("currentBranch".to_string(), serde_json::Value::String(current_branch));
    repo_info.insert("branches".to_string(), serde_json::Value::Array(
        branches.into_iter().map(|b| serde_json::Value::String(b)).collect()
    ));
    repo_info.insert("remotes".to_string(), serde_json::Value::Array(
        remotes_map.into_values().map(|r| serde_json::Value::Object(r)).collect()
    ));
    repo_info.insert("status".to_string(), serde_json::Value::Object(status_obj));
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    repo_info.insert("lastAccessed".to_string(), serde_json::Value::String(
        timestamp.to_string()
    ));
    
    Ok(serde_json::Value::Object(repo_info))
}

#[tauri::command]
async fn git_switch_repository(
    repo_path: String,
    app_handle: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    git_add_repository(Some(repo_path), app_handle).await
}

#[tauri::command]
async fn git_get_current_repository(
    repo_path: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<Option<serde_json::Value>, String> {
    if let Some(path) = repo_path {
        Ok(Some(git_add_repository(Some(path), app_handle).await?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn git_get_repository_status(repo_path: Option<String>) -> Result<serde_json::Value, String> {
    // If no repo_path provided, return empty status
    let repo_path = if let Some(path) = repo_path {
        path
    } else {
        return Err("No repository path provided".to_string());
    };
    let status_output = git_command(&repo_path, &["status", "--porcelain"]).await?;
    let mut staged = Vec::new();
    let mut modified = Vec::new();
    let mut deleted = Vec::new();
    let mut untracked = Vec::new();
    
    // Git status --porcelain format:
    // First char: index status (staging area)
    // Second char: working tree status
    // " M" = modified in working tree (unstaged)
    // "M " = modified in index (staged)
    // "MM" = modified in both
    // "??" = untracked
    // "D " = deleted in index (staged)
    // " D" = deleted in working tree (unstaged)
    // "A " = added in index (staged)
    
    for line in status_output.lines() {
        // Don't trim the line - we need to preserve leading spaces!
        // Git status --porcelain format: "XY filename"
        // X = index status, Y = working tree status
        if line.len() < 3 {
            continue;
        }
        
        let index_status = line.chars().nth(0).unwrap_or(' ');
        let working_status = line.chars().nth(1).unwrap_or(' ');
        // File path starts at position 3 (after "XY ")
        let file = if line.len() > 3 {
            line[3..].trim().to_string()
        } else {
            continue;
        };
        
        if file.is_empty() {
            continue;
        }
        
        // Staged files (index has changes, not space or ?)
        if index_status != ' ' && index_status != '?' {
            staged.push(serde_json::Value::String(file.clone()));
        }
        
        // Unstaged modified files (working tree has 'M' and index is unchanged)
        if working_status == 'M' && index_status == ' ' {
            modified.push(serde_json::Value::String(file.clone()));
        }
        
        // Files modified in both (MM) - already added to staged above
        // But also need to add to modified if working tree has changes
        if working_status == 'M' && index_status != ' ' {
            modified.push(serde_json::Value::String(file.clone()));
        }
        
        // Unstaged deleted files (working tree has 'D' and index is unchanged)
        if working_status == 'D' && index_status == ' ' {
            deleted.push(serde_json::Value::String(file.clone()));
        }
        
        // Untracked files
        if index_status == '?' && working_status == '?' {
            untracked.push(serde_json::Value::String(file.clone()));
        }
    }
    
    let current_branch = git_command(&repo_path, &["branch", "--show-current"]).await?
        .trim().to_string();
    
    let mut status_obj = serde_json::Map::new();
    status_obj.insert("staged".to_string(), serde_json::Value::Array(staged));
    status_obj.insert("modified".to_string(), serde_json::Value::Array(modified));
    status_obj.insert("deleted".to_string(), serde_json::Value::Array(deleted));
    status_obj.insert("created".to_string(), serde_json::Value::Array(untracked.clone()));
    status_obj.insert("untracked".to_string(), serde_json::Value::Array(untracked));
    status_obj.insert("conflicted".to_string(), serde_json::Value::Array(Vec::new()));
    status_obj.insert("current".to_string(), serde_json::Value::String(current_branch));
    
    Ok(serde_json::Value::Object(status_obj))
}

#[tauri::command]
async fn git_create_branch(
    repo_path: String,
    branch_name: String,
    start_point: Option<String>,
) -> Result<String, String> {
    let mut args: Vec<&str> = vec!["checkout", "-b", &branch_name];
    if let Some(ref start) = start_point {
        args.push(start);
    }
    git_command(&repo_path, &args).await?;
    Ok(branch_name)
}

#[tauri::command]
async fn git_switch_branch(repo_path: String, branch_name: String) -> Result<String, String> {
    git_command(&repo_path, &["checkout", &branch_name]).await?;
    Ok(branch_name)
}

#[tauri::command]
async fn git_delete_branch(
    repo_path: String,
    branch_name: String,
    force: bool,
) -> Result<(), String> {
    let mut args = vec!["branch"];
    if force {
        args.push("-D");
    } else {
        args.push("-d");
    }
    args.push(&branch_name);
    git_command(&repo_path, &args).await?;
    Ok(())
}

#[tauri::command]
async fn git_get_branches_with_dates(repo_path: String) -> Result<Vec<serde_json::Value>, String> {
    let output = git_command(&repo_path, &["for-each-ref", "--format=%(refname:short)|%(committerdate:iso8601)", "refs/heads/"]).await?;
    let mut branches = Vec::new();
    
    for line in output.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() == 2 {
            let mut branch_obj = serde_json::Map::new();
            branch_obj.insert("name".to_string(), serde_json::Value::String(parts[0].trim().to_string()));
            branch_obj.insert("date".to_string(), serde_json::Value::String(parts[1].trim().to_string()));
            branches.push(serde_json::Value::Object(branch_obj));
        }
    }
    
    Ok(branches)
}

#[tauri::command]
async fn git_get_commit_history(
    repo_path: String,
    max_count: Option<u32>,
    from: Option<String>,
    to: Option<String>,
) -> Result<Vec<serde_json::Value>, String> {
    let mut args: Vec<&str> = vec!["log"];
    let mut count_str = String::new();
    let mut range_str = String::new();
    
    if let Some(count) = max_count {
        count_str = count.to_string();
        args.push("--max-count");
        args.push(&count_str);
    } else {
        args.push("--max-count");
        args.push("50");
    }
    
    args.push("--format=%H|%ai|%s|%b|%an|%ae");
    
    if let (Some(from_ref), Some(to_ref)) = (from, to) {
        range_str = format!("{}..{}", from_ref, to_ref);
        args.push(&range_str);
    }
    
    let output = git_command(&repo_path, &args).await?;
    let mut commits = Vec::new();
    
    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(6, '|').collect();
        if parts.len() >= 6 {
            let mut commit_obj = serde_json::Map::new();
            commit_obj.insert("hash".to_string(), serde_json::Value::String(parts[0].trim().to_string()));
            commit_obj.insert("date".to_string(), serde_json::Value::String(parts[1].trim().to_string()));
            commit_obj.insert("message".to_string(), serde_json::Value::String(parts[2].trim().to_string()));
            commit_obj.insert("body".to_string(), serde_json::Value::String(parts[3].trim().to_string()));
            commit_obj.insert("author_name".to_string(), serde_json::Value::String(parts[4].trim().to_string()));
            commit_obj.insert("author_email".to_string(), serde_json::Value::String(parts[5].trim().to_string()));
            commits.push(serde_json::Value::Object(commit_obj));
        }
    }
    
    Ok(commits)
}

#[tauri::command]
async fn git_stage_files(repo_path: String, files: Vec<String>) -> Result<(), String> {
    let mut args = vec!["add"];
    args.extend(files.iter().map(|s| s.as_str()));
    git_command(&repo_path, &args).await?;
    Ok(())
}

#[tauri::command]
async fn git_unstage_files(repo_path: String, files: Vec<String>) -> Result<serde_json::Value, String> {
    let mut args = vec!["reset", "HEAD", "--"];
    args.extend(files.iter().map(|s| s.as_str()));
    git_command(&repo_path, &args).await?;
    
    // Get updated status
    let status = git_get_repository_status(Some(repo_path.clone())).await?;
    
    let mut result = serde_json::Map::new();
    result.insert("status".to_string(), status);
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
async fn git_commit(
    repo_path: String,
    message: String,
    description: Option<String>,
) -> Result<serde_json::Value, String> {
    let full_message = if let Some(desc) = description {
        format!("{}\n\n{}", message, desc)
    } else {
        message
    };
    
    git_command(&repo_path, &["commit", "-m", &full_message]).await?;
    
    let hash = git_command(&repo_path, &["rev-parse", "HEAD"]).await?
        .trim().to_string();
    
    // Get updated status
    let status = git_get_repository_status(Some(repo_path.clone())).await?;
    
    let mut result = serde_json::Map::new();
    result.insert("commit".to_string(), serde_json::Value::String(hash));
    result.insert("status".to_string(), status);
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
async fn git_fetch(
    repo_path: String,
    remote: Option<String>,
    prune: bool,
) -> Result<serde_json::Value, String> {
    let mut args: Vec<&str> = vec!["fetch"];
    if prune {
        args.push("--prune");
    }
    if let Some(ref r) = remote {
        args.push(r);
    }
    git_command(&repo_path, &args).await?;
    
    // Get updated status
    let status = git_get_repository_status(Some(repo_path.clone())).await?;
    
    let mut result = serde_json::Map::new();
    result.insert("status".to_string(), status);
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
async fn git_pull(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
    _strategy: Option<String>,
) -> Result<serde_json::Value, String> {
    let mut args: Vec<&str> = vec!["pull"];
    if let Some(ref r) = remote {
        args.push(r);
        if let Some(ref b) = branch {
            args.push(b);
        }
    }
    git_command(&repo_path, &args).await?;
    
    // Get updated status
    let status = git_get_repository_status(Some(repo_path.clone())).await?;
    
    let mut result = serde_json::Map::new();
    result.insert("status".to_string(), status);
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
async fn git_push(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<serde_json::Value, String> {
    let mut args: Vec<&str> = vec!["push"];
    if let Some(ref r) = remote {
        args.push(r);
        if let Some(ref b) = branch {
            args.push(b);
        }
    }
    git_command(&repo_path, &args).await?;
    
    // Get updated status
    let status = git_get_repository_status(Some(repo_path.clone())).await?;
    
    let mut result = serde_json::Map::new();
    result.insert("status".to_string(), status);
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
async fn git_get_diff(
    repo_path: String,
    file: Option<String>,
    staged: bool,
) -> Result<serde_json::Value, String> {
    let mut args: Vec<&str> = vec!["diff"];
    if staged {
        args.push("--cached");
    }
    if let Some(ref f) = file {
        args.push("--");
        args.push(f);
    }
    let diff_output = git_command(&repo_path, &args).await?;
    
    // Parse the diff output into structured format (matching Electron's parseDiff)
    let lines: Vec<&str> = diff_output.lines().collect();
    let mut files = Vec::new();
    let mut current_file: Option<serde_json::Map<String, serde_json::Value>> = None;
    let mut current_hunk: Option<serde_json::Map<String, serde_json::Value>> = None;
    
    for line in lines {
        if line.starts_with("diff --git") {
            // Save previous file if exists
            if let Some(mut file) = current_file.take() {
                if let Some(hunk) = current_hunk.take() {
                    if let Some(hunks) = file.get_mut("hunks") {
                        if let Some(hunks_array) = hunks.as_array_mut() {
                            hunks_array.push(serde_json::Value::Object(hunk));
                        }
                    }
                }
                files.push(serde_json::Value::Object(file));
            }
            
            // Extract filename from "diff --git a/path b/path"
            let file_name = if let Some(b_pos) = line.find(" b/") {
                line[b_pos + 3..].to_string()
            } else {
                "unknown".to_string()
            };
            
            let mut file_obj = serde_json::Map::new();
            file_obj.insert("name".to_string(), serde_json::Value::String(file_name));
            file_obj.insert("hunks".to_string(), serde_json::Value::Array(Vec::new()));
            file_obj.insert("added".to_string(), serde_json::Value::Number(0.into()));
            file_obj.insert("deleted".to_string(), serde_json::Value::Number(0.into()));
            current_file = Some(file_obj);
            current_hunk = None;
        } else if line.starts_with("@@") {
            // Save previous hunk if exists
            if let Some(mut file) = current_file.as_mut() {
                if let Some(hunk) = current_hunk.take() {
                    if let Some(hunks) = file.get_mut("hunks") {
                        if let Some(hunks_array) = hunks.as_array_mut() {
                            hunks_array.push(serde_json::Value::Object(hunk));
                        }
                    }
                }
            }
            
            // Start new hunk
            let mut hunk_obj = serde_json::Map::new();
            hunk_obj.insert("header".to_string(), serde_json::Value::String(line.to_string()));
            hunk_obj.insert("lines".to_string(), serde_json::Value::Array(Vec::new()));
            current_hunk = Some(hunk_obj);
        } else if let Some(ref mut file) = current_file {
            if let Some(ref mut hunk) = current_hunk {
                let line_type = if line.starts_with('+') {
                    if let Some(added) = file.get("added").and_then(|v| v.as_u64()) {
                        file.insert("added".to_string(), serde_json::Value::Number((added + 1).into()));
                    }
                    "added"
                } else if line.starts_with('-') {
                    if let Some(deleted) = file.get("deleted").and_then(|v| v.as_u64()) {
                        file.insert("deleted".to_string(), serde_json::Value::Number((deleted + 1).into()));
                    }
                    "deleted"
                } else {
                    "context"
                };
                
                let mut line_obj = serde_json::Map::new();
                line_obj.insert("content".to_string(), serde_json::Value::String(line.to_string()));
                line_obj.insert("type".to_string(), serde_json::Value::String(line_type.to_string()));
                
                if let Some(lines) = hunk.get_mut("lines") {
                    if let Some(lines_array) = lines.as_array_mut() {
                        lines_array.push(serde_json::Value::Object(line_obj));
                    }
                }
            }
        }
    }
    
    // Save last file and hunk
    if let Some(mut file) = current_file {
        if let Some(hunk) = current_hunk {
            if let Some(hunks) = file.get_mut("hunks") {
                if let Some(hunks_array) = hunks.as_array_mut() {
                    hunks_array.push(serde_json::Value::Object(hunk));
                }
            }
        }
        files.push(serde_json::Value::Object(file));
    }
    
    Ok(serde_json::Value::Array(files))
}

#[tauri::command]
async fn git_get_file_history(
    repo_path: String,
    file_path: String,
    max_count: Option<u32>,
) -> Result<Vec<serde_json::Value>, String> {
    let max = max_count.unwrap_or(50);
    let max_count_str = format!("--max-count={}", max);
    let mut args = vec![
        "log",
        "--follow",
        &max_count_str,
        "--format=%H|%ai|%s|%an",
        "--",
        &file_path,
    ];
    
    let output = git_command(&repo_path, &args).await?;
    
    if output.trim().is_empty() {
        return Ok(Vec::new());
    }
    
    let commits: Vec<serde_json::Value> = output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 4 {
                let mut commit_obj = serde_json::Map::new();
                commit_obj.insert("hash".to_string(), serde_json::Value::String(parts[0].trim().to_string()));
                commit_obj.insert("date".to_string(), serde_json::Value::String(parts[1].trim().to_string()));
                commit_obj.insert("message".to_string(), serde_json::Value::String(parts[2].trim().to_string()));
                commit_obj.insert("author".to_string(), serde_json::Value::String(parts[3].trim().to_string()));
                serde_json::Value::Object(commit_obj)
            } else {
                // Fallback for malformed lines
                let mut commit_obj = serde_json::Map::new();
                commit_obj.insert("hash".to_string(), serde_json::Value::String("".to_string()));
                commit_obj.insert("date".to_string(), serde_json::Value::String("".to_string()));
                commit_obj.insert("message".to_string(), serde_json::Value::String(line.to_string()));
                commit_obj.insert("author".to_string(), serde_json::Value::String("".to_string()));
                serde_json::Value::Object(commit_obj)
            }
        })
        .collect();
    
    Ok(commits)
}

#[tauri::command]
async fn git_get_commit_diff(
    repo_path: String,
    commit_hash: String,
    file: Option<String>,
) -> Result<serde_json::Value, String> {
    // Try to get diff with parent commit first
    let parent_hash = format!("{}^", commit_hash);
    let mut args = vec!["diff", &parent_hash, &commit_hash];
    if let Some(ref f) = file {
        args.push("--");
        args.push(f);
    }
    
    // Try the normal diff first (commit vs parent)
    let diff_output = match git_command(&repo_path, &args).await {
        Ok(output) => output,
        Err(e) => {
            // If it fails with "unknown revision", it might be the first commit
            if e.contains("unknown revision") || e.contains("fatal") {
                // Try with --root for first commit
                let mut root_args = vec!["diff", "--root", &commit_hash];
                if let Some(ref f) = file {
                    root_args.push("--");
                    root_args.push(f);
                }
                git_command(&repo_path, &root_args).await?
            } else {
                return Err(e);
            }
        }
    };
    
    // Parse the diff output into structured format (same as git_get_diff)
    let lines: Vec<&str> = diff_output.lines().collect();
    let mut files = Vec::new();
    let mut current_file: Option<serde_json::Map<String, serde_json::Value>> = None;
    let mut current_hunk: Option<serde_json::Map<String, serde_json::Value>> = None;
    
    for line in lines {
        if line.starts_with("diff --git") {
            // Save previous file if exists
            if let Some(mut file) = current_file.take() {
                if let Some(hunk) = current_hunk.take() {
                    if let Some(hunks) = file.get_mut("hunks") {
                        if let Some(hunks_array) = hunks.as_array_mut() {
                            hunks_array.push(serde_json::Value::Object(hunk));
                        }
                    }
                }
                files.push(serde_json::Value::Object(file));
            }
            
            // Extract filename from "diff --git a/path b/path"
            let file_name = if let Some(b_pos) = line.find(" b/") {
                line[b_pos + 3..].to_string()
            } else {
                "unknown".to_string()
            };
            
            let mut file_obj = serde_json::Map::new();
            file_obj.insert("name".to_string(), serde_json::Value::String(file_name));
            file_obj.insert("hunks".to_string(), serde_json::Value::Array(Vec::new()));
            file_obj.insert("added".to_string(), serde_json::Value::Number(0.into()));
            file_obj.insert("deleted".to_string(), serde_json::Value::Number(0.into()));
            current_file = Some(file_obj);
            current_hunk = None;
        } else if line.starts_with("@@") {
            // Save previous hunk if exists
            if let Some(mut file) = current_file.as_mut() {
                if let Some(hunk) = current_hunk.take() {
                    if let Some(hunks) = file.get_mut("hunks") {
                        if let Some(hunks_array) = hunks.as_array_mut() {
                            hunks_array.push(serde_json::Value::Object(hunk));
                        }
                    }
                }
            }
            
            // Start new hunk
            let mut hunk_obj = serde_json::Map::new();
            hunk_obj.insert("header".to_string(), serde_json::Value::String(line.to_string()));
            hunk_obj.insert("lines".to_string(), serde_json::Value::Array(Vec::new()));
            current_hunk = Some(hunk_obj);
        } else if let Some(ref mut file) = current_file {
            if let Some(ref mut hunk) = current_hunk {
                let line_type = if line.starts_with('+') {
                    if let Some(added) = file.get("added").and_then(|v| v.as_u64()) {
                        file.insert("added".to_string(), serde_json::Value::Number((added + 1).into()));
                    }
                    "added"
                } else if line.starts_with('-') {
                    if let Some(deleted) = file.get("deleted").and_then(|v| v.as_u64()) {
                        file.insert("deleted".to_string(), serde_json::Value::Number((deleted + 1).into()));
                    }
                    "deleted"
                } else {
                    "context"
                };
                
                let mut line_obj = serde_json::Map::new();
                line_obj.insert("content".to_string(), serde_json::Value::String(line.to_string()));
                line_obj.insert("type".to_string(), serde_json::Value::String(line_type.to_string()));
                
                if let Some(lines) = hunk.get_mut("lines") {
                    if let Some(lines_array) = lines.as_array_mut() {
                        lines_array.push(serde_json::Value::Object(line_obj));
                    }
                }
            }
        }
    }
    
    // Save last file and hunk
    if let Some(mut file) = current_file {
        if let Some(hunk) = current_hunk {
            if let Some(hunks) = file.get_mut("hunks") {
                if let Some(hunks_array) = hunks.as_array_mut() {
                    hunks_array.push(serde_json::Value::Object(hunk));
                }
            }
        }
        files.push(serde_json::Value::Object(file));
    }
    
    Ok(serde_json::Value::Array(files))
}

#[tauri::command]
async fn git_get_commit_files(
    repo_path: String,
    commit_hash: String,
) -> Result<Vec<serde_json::Value>, String> {
    let args = vec![
        "diff-tree",
        "--no-commit-id",
        "--name-status",
        "-r",
        &commit_hash,
    ];
    
    let output = git_command(&repo_path, &args).await?;
    
    if output.trim().is_empty() {
        return Ok(Vec::new());
    }
    
    let files: Vec<serde_json::Value> = output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| {
            // Split by tab - status is first field, rest is file path
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.is_empty() {
                return serde_json::json!({
                    "path": "",
                    "status": "changed"
                });
            }
            
            let status = parts[0];
            let file_path = if parts.len() > 1 {
                parts[1..].join("\t") // Handle paths with tabs
            } else {
                "".to_string()
            };
            
            let file_status = match status {
                "A" => "added",
                "D" => "deleted",
                "M" => "modified",
                s if s.starts_with("R") => "renamed",
                _ => "changed",
            };
            
            serde_json::json!({
                "path": file_path,
                "status": file_status
            })
        })
        .collect();
    
    Ok(files)
}

#[tauri::command]
async fn git_list_files(repo_path: String) -> Result<Vec<serde_json::Value>, String> {
    use std::fs;
    use std::path::Path;
    
    let repo_path_buf = Path::new(&repo_path);
    if !repo_path_buf.exists() {
        return Err("Repository path does not exist".to_string());
    }
    
    let mut files = Vec::new();
    
    fn walk_dir(dir: &Path, base: &Path, files: &mut Vec<serde_json::Value>) -> Result<(), String> {
        if dir.is_dir() {
            for entry in fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))? {
                let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
                let path = entry.path();
                
                // Skip .git directory
                if path.file_name().and_then(|n| n.to_str()) == Some(".git") {
                    continue;
                }
                
                if path.is_dir() {
                    walk_dir(&path, base, files)?;
                } else if path.is_file() {
                    let relative_path = path.strip_prefix(base)
                        .map_err(|e| format!("Failed to get relative path: {}", e))?
                        .to_string_lossy()
                        .to_string();
                    
                    let mut file_obj = serde_json::Map::new();
                    file_obj.insert("path".to_string(), serde_json::Value::String(relative_path.clone()));
                    file_obj.insert("name".to_string(), serde_json::Value::String(
                        path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string()
                    ));
                    
                    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to get file metadata: {}", e))?;
                    file_obj.insert("size".to_string(), serde_json::Value::Number(
                        serde_json::Number::from(metadata.len())
                    ));
                    
                    files.push(serde_json::Value::Object(file_obj));
                }
            }
        }
        Ok(())
    }
    
    walk_dir(repo_path_buf, repo_path_buf, &mut files)?;
    Ok(files)
}

#[tauri::command]
async fn git_stash_changes(
    repo_path: String,
    stash_message: Option<String>,
) -> Result<serde_json::Value, String> {
    let mut args: Vec<&str> = vec!["stash", "save"];
    let mut msg_str = String::new();
    
    if let Some(msg) = stash_message {
        msg_str = msg;
        args.push(&msg_str);
    }
    
    git_command(&repo_path, &args).await?;
    
    // Get updated status
    let status = git_get_repository_status(Some(repo_path.clone())).await?;
    
    let mut result = serde_json::Map::new();
    result.insert("status".to_string(), status);
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
async fn git_stash_files(
    repo_path: String,
    files: Vec<String>,
    stash_message: Option<String>,
) -> Result<serde_json::Value, String> {
    let mut args: Vec<&str> = vec!["stash", "push"];
    let mut msg_str = String::new();
    let mut file_strs: Vec<String> = Vec::new();
    
    if let Some(msg) = stash_message {
        msg_str = msg;
        args.push("-m");
        args.push(&msg_str);
    }
    args.push("--");
    
    // Store file strings to ensure they live long enough
    for file in files {
        file_strs.push(file);
    }
    for file in &file_strs {
        args.push(file);
    }
    
    git_command(&repo_path, &args).await?;
    
    // Get updated status
    let status = git_get_repository_status(Some(repo_path.clone())).await?;
    
    let mut result = serde_json::Map::new();
    result.insert("status".to_string(), status);
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
async fn git_get_stash_list(repo_path: String) -> Result<Vec<serde_json::Value>, String> {
    let output = git_command(&repo_path, &["stash", "list", "--format=%gd|%gs|%ai|%an|%ae"]).await?;
    let mut stashes = Vec::new();
    
    for (index, line) in output.lines().enumerate() {
        let parts: Vec<&str> = line.splitn(5, '|').collect();
        if parts.len() >= 3 {
            let mut stash_obj = serde_json::Map::new();
            stash_obj.insert("index".to_string(), serde_json::Value::Number(
                serde_json::Number::from(index)
            ));
            stash_obj.insert("message".to_string(), serde_json::Value::String(
                parts[1].trim().to_string()
            ));
            if parts.len() >= 3 {
                stash_obj.insert("date".to_string(), serde_json::Value::String(
                    parts[2].trim().to_string()
                ));
            }
            if parts.len() >= 4 {
                stash_obj.insert("author_name".to_string(), serde_json::Value::String(
                    parts[3].trim().to_string()
                ));
            }
            if parts.len() >= 5 {
                stash_obj.insert("author_email".to_string(), serde_json::Value::String(
                    parts[4].trim().to_string()
                ));
            }
            stashes.push(serde_json::Value::Object(stash_obj));
        }
    }
    
    Ok(stashes)
}

#[tauri::command]
async fn git_get_stash_files(
    repo_path: String,
    stash_index: u32,
) -> Result<serde_json::Value, String> {
    let stash_ref = format!("stash@{{{}}}", stash_index);
    let show_output = git_command(&repo_path, &["stash", "show", "--name-status", &stash_ref]).await?;
    let stat_output = git_command(&repo_path, &["stash", "show", "--stat", &stash_ref]).await?;
    
    let mut files = Vec::new();
    for line in show_output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() >= 2 {
            let status_code = parts[0];
            let filename = parts[1..].join(" ");
            
            let mut file_obj = serde_json::Map::new();
            file_obj.insert("statusCode".to_string(), serde_json::Value::String(status_code.to_string()));
            file_obj.insert("filename".to_string(), serde_json::Value::String(filename));
            
            // Map status code to readable status
            let status = match status_code {
                "M" => "modified",
                "A" => "added",
                "D" => "deleted",
                "R" => "renamed",
                "C" => "copied",
                "U" => "unmerged",
                _ => "unknown",
            };
            file_obj.insert("status".to_string(), serde_json::Value::String(status.to_string()));
            
            files.push(serde_json::Value::Object(file_obj));
        }
    }
    
    let mut result = serde_json::Map::new();
    result.insert("files".to_string(), serde_json::Value::Array(files));
    result.insert("stat".to_string(), serde_json::Value::String(stat_output));
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
async fn git_get_stash_file_diff(
    repo_path: String,
    filename: String,
    stash_index: u32,
) -> Result<String, String> {
    let stash_ref = format!("stash@{{{}}}", stash_index);
    let diff = git_command(&repo_path, &["diff", &format!("{}^", stash_ref), &stash_ref, "--", &filename]).await?;
    Ok(diff)
}

#[tauri::command]
async fn git_apply_stash(
    repo_path: String,
    stash_index: u32,
) -> Result<serde_json::Value, String> {
    let stash_ref = format!("stash@{{{}}}", stash_index);
    git_command(&repo_path, &["stash", "apply", &stash_ref]).await?;
    
    // Get updated status
    let status = git_get_repository_status(Some(repo_path.clone())).await?;
    
    let mut result = serde_json::Map::new();
    result.insert("status".to_string(), status);
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
async fn git_pop_stash(
    repo_path: String,
    stash_index: u32,
) -> Result<serde_json::Value, String> {
    let stash_ref = format!("stash@{{{}}}", stash_index);
    git_command(&repo_path, &["stash", "pop", &stash_ref]).await?;
    
    // Get updated status
    let status = git_get_repository_status(Some(repo_path.clone())).await?;
    
    let mut result = serde_json::Map::new();
    result.insert("status".to_string(), status);
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
async fn git_drop_stash(
    repo_path: String,
    stash_index: u32,
) -> Result<serde_json::Value, String> {
    let stash_ref = format!("stash@{{{}}}", stash_index);
    git_command(&repo_path, &["stash", "drop", &stash_ref]).await?;
    
    // Get updated status
    let status = git_get_repository_status(Some(repo_path.clone())).await?;
    
    let mut result = serde_json::Map::new();
    result.insert("status".to_string(), status);
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
async fn git_select_repository(
    app_handle: tauri::AppHandle,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::Arc;
    use tokio::sync::oneshot;
    
    if let Some(window) = app_handle.get_webview_window("main") {
        let (tx, rx) = oneshot::channel();
        let tx = Arc::new(tokio::sync::Mutex::new(Some(tx)));
        
        window.dialog()
            .file()
            .set_title("Select Git Repository Folder")
            .pick_folder(move |path_opt| {
                if let Ok(mut sender) = tx.try_lock() {
                    if let Some(s) = sender.take() {
                        let _ = s.send(path_opt);
                    }
                }
            });
        
        match rx.await {
            Ok(Some(path)) => {
                // FilePath is an enum - convert to string
                use tauri_plugin_dialog::FilePath;
                let path_str = match path {
                    FilePath::Path(path_buf) => path_buf.to_string_lossy().to_string(),
                    FilePath::Url(url) => url.to_string(),
                };
                Ok(Some(path_str))
            },
            Ok(None) => Ok(None),
            Err(_) => Err("Dialog channel closed".to_string()),
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn msg_from_renderer(
    node: serde_json::Value,
    project_name: String,
    state_init: serde_json::Value,
    timer_prefs: Option<serde_json::Value>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    // Get timer window (defined in tauri.conf.json)
    // The window is created at startup but might be hidden or closed
    let timer_window = app_handle.get_webview_window("timer")
        .ok_or("Timer window not found. Make sure it's defined in tauri.conf.json")?;
    
    // Show and focus the window
    let _ = timer_window.show();
    let _ = timer_window.set_focus();
    
    // Wait for window to be ready
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    // Navigate to timer route using JavaScript
    // Match Electron's pattern: use query parameter '?timer'
    // Use history.pushState to avoid full page reload which causes blank screen
    let navigate_script = r#"
        // Set query parameter to 'timer' (like Electron's pathCreator)
        // Use pushState to avoid full page reload
        const url = new URL(window.location.href);
        url.search = '?timer';
        window.history.pushState({}, '', url.toString());
        // Trigger popstate event to notify ViewManager
        window.dispatchEvent(new Event('popstate'));
        // Also manually trigger ViewManager update if available
        if (window.updateViewManager) {
          window.updateViewManager();
        }
        // Force a check after a short delay to ensure ViewManager updates
        setTimeout(() => {
          if (window.updateViewManager) {
            window.updateViewManager();
          }
        }, 100);
    "#;
    let _ = timer_window.eval(navigate_script);
    
    // Wait longer for navigation to complete and TimerPage component to mount
    // TimerPage needs time to set up event listeners before we send events
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    
    // Send UpdateProjectPageState FIRST to set lokiLoaded and other state
    // This is critical for TimerPage to show content instead of "Loading..."
    let _ = timer_window.emit("UpdateProjectPageState", &state_init);
    
    // Wait a bit for state to be processed
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
    
    // Then send timer-specific initialization events (matching Electron's pattern)
    let _ = timer_window.emit("DefaultNode", &node);
    let _ = timer_window.emit("RetrieveProjectName", &project_name);
    let _ = timer_window.emit("RetrieveProjectState", &state_init);
    if let Some(prefs) = timer_prefs {
        let _ = timer_window.emit("RetrieveTimerPrefs", &prefs);
    }
    
    // Listen for window close to send SaveBeforeClose event (like Electron)
    // Prevent window destruction by hiding instead of closing, so it can be reopened
    let timer_window_clone = timer_window.clone();
    timer_window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            let _ = timer_window_clone.emit("SaveBeforeClose", ());
            // Hide the window instead of closing it, so it can be reopened
            // This matches Electron's behavior where the window can be reopened
            let _ = timer_window_clone.hide();
            api.prevent_close();
        }
    });
    
    Ok(())
}

// Tag commands moved to tags.rs module

// Node types and node states commands moved to metadata.rs module

#[tauri::command]
async fn utils_close_timer_window() -> Result<(), String> {
    // Placeholder - in Electron this closes a timer window
    // In Tauri, we might need to track and close windows differently
    Ok(())
}

#[tauri::command]
async fn api_get_project_settings() -> Result<Option<serde_json::Value>, String> {
    // Placeholder - will be implemented based on actual project settings structure
    Ok(None)
}

#[tauri::command]
async fn api_set_trello_board(
    _trello_board: serde_json::Value,
) -> Result<(), String> {
    // Placeholder - Trello integration
    Ok(())
}

#[tauri::command]
async fn game_get_state(
    app_handle: tauri::AppHandle,
) -> Result<Option<serde_json::Value>, String> {
    // Get game state from app data directory
    use std::fs;
    
    let app_data_dir = app_handle.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let game_state_path = app_data_dir.join("game_state.json");
    
    if game_state_path.exists() {
        let contents = fs::read_to_string(&game_state_path)
            .map_err(|e| format!("Failed to read game state: {}", e))?;
        let state: serde_json::Value = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse game state: {}", e))?;
        Ok(Some(state))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn game_save_state(
    state: serde_json::Value,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    // Save game state to app data directory
    use std::fs;
    
    let app_data_dir = app_handle.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    // Create directory if it doesn't exist
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    
    let game_state_path = app_data_dir.join("game_state.json");
    let contents = serde_json::to_string_pretty(&state)
        .map_err(|e| format!("Failed to serialize game state: {}", e))?;
    
    fs::write(&game_state_path, contents)
        .map_err(|e| format!("Failed to write game state: {}", e))?;
    
    Ok(())
}

// Helper function to get project directory path
pub fn get_project_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    // Use document directory for projects
    let doc_dir = app_handle.path()
        .document_dir()
        .map_err(|e| format!("Failed to get document dir: {}", e))?;
    Ok(doc_dir.join("banFlowProjects"))
}

#[tauri::command]
async fn project_get_file_path(
    project_name: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    Ok(project_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn dashboard_get_all_project_names(
    app_handle: tauri::AppHandle,
) -> Result<Vec<String>, String> {
    use std::fs;
    
    let project_dir = get_project_dir(&app_handle)?;
    
    // Create directory if it doesn't exist
    if !project_dir.exists() {
        fs::create_dir_all(&project_dir)
            .map_err(|e| format!("Failed to create project dir: {}", e))?;
        return Ok(vec![]);
    }
    
    let entries = fs::read_dir(&project_dir)
        .map_err(|e| format!("Failed to read project dir: {}", e))?;
    
    let mut project_names = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if let Some(file_name) = path.file_name() {
                if let Some(name_str) = file_name.to_str() {
                    if name_str.ends_with(".json") && !name_str.ends_with(".json~") {
                        let project_name = name_str.replace(".json", "");
                        project_names.push(project_name);
                    }
                }
            }
        }
    }
    
    Ok(project_names)
}

#[tauri::command]
async fn project_get_projects(
    app_handle: tauri::AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    use std::fs;
    
    let project_dir = get_project_dir(&app_handle)?;
    
    // Create directory if it doesn't exist
    if !project_dir.exists() {
        fs::create_dir_all(&project_dir)
            .map_err(|e| format!("Failed to create project dir: {}", e))?;
        return Ok(vec![]);
    }
    
    let entries = fs::read_dir(&project_dir)
        .map_err(|e| format!("Failed to read project dir: {}", e))?;
    
    let mut projects = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if let Some(file_name) = path.file_name() {
                if let Some(name_str) = file_name.to_str() {
                    if name_str != "" {
                        projects.push(serde_json::json!({
                            "text": name_str,
                            "key": std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap()
                                .as_millis() as u64,
                        }));
                    }
                }
            }
        }
    }
    
    Ok(projects)
}

#[tauri::command]
async fn project_create_project(
    project_name: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    use std::fs;
    
    let project_dir = get_project_dir(&app_handle)?;
    fs::create_dir_all(&project_dir)
        .map_err(|e| format!("Failed to create project dir: {}", e))?;
    
    let project_path = project_dir.join(format!("{}.json", project_name));
    // Create empty LokiJS database structure
    let empty_db = serde_json::json!({
        "databaseVersion": 1.5,
        "engineVersion": 1.5,
        "collections": []
    });
    fs::write(&project_path, serde_json::to_string_pretty(&empty_db).unwrap())
        .map_err(|e| format!("Failed to create project file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn project_delete_project(
    project_name: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    use std::fs;
    
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let backup_path = project_dir.join(format!("{}.json~", project_name));
    
    // Try to delete main file
    if project_path.exists() {
        fs::remove_file(&project_path)
            .map_err(|e| format!("Failed to delete project file: {}", e))?;
    }
    
    // Try to delete backup file
    if backup_path.exists() {
        let _ = fs::remove_file(&backup_path);
    }
    
    Ok(())
}

#[tauri::command]
async fn project_rename_project(
    old_name: String,
    new_name: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    use std::fs;
    
    let project_dir = get_project_dir(&app_handle)?;
    let old_path = project_dir.join(format!("{}.json", old_name));
    let new_path = project_dir.join(format!("{}.json", new_name));
    
    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("Failed to rename project: {}", e))?;
    
    Ok(())
}

// Helper function to load project data from LokiJS file
fn load_project_data_from_file(project_path: &std::path::Path) -> Result<serde_json::Value, String> {
    use std::fs;
    
    if !project_path.exists() {
        return Err(format!("Project file not found: {:?}", project_path));
    }
    
    let contents = fs::read_to_string(project_path)
        .map_err(|e| format!("Failed to read project file: {}", e))?;
    
    // Handle empty file (newly created project)
    if contents.trim().is_empty() {
        // Return empty project structure
        return Ok(serde_json::json!({
            "nodes": [],
            "parents": [],
            "parentOrder": [],
            "iterations": [],
            "tags": [],
        }));
    }
    
    // Parse LokiJS database file (it's JSON with collections)
    let db_json: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse project file: {} (file path: {:?})", e, project_path))?;
    
    // Extract collections from LokiJS database structure
    let mut project_data = serde_json::json!({
        "nodes": [],
        "parents": [],
        "parentOrder": [],
        "iterations": [],
        "tags": [],
        "nodeTypes": [],
        "nodeStates": [],
    });
    
    // LokiJS files have a "collections" array
    if let Some(collections) = db_json.get("collections").and_then(|c| c.as_array()) {
        for collection in collections {
            if let Some(name) = collection.get("name").and_then(|n| n.as_str()) {
                if let Some(data) = collection.get("data").and_then(|d| d.as_array()) {
                    match name {
                        "nodes" => project_data["nodes"] = serde_json::Value::Array(data.clone()),
                        "parents" => project_data["parents"] = serde_json::Value::Array(data.clone()),
                        "parentOrder" => project_data["parentOrder"] = serde_json::Value::Array(data.clone()),
                        "iterations" => project_data["iterations"] = serde_json::Value::Array(data.clone()),
                        "tags" => project_data["tags"] = serde_json::Value::Array(data.clone()),
                        "nodeTypes" => project_data["nodeTypes"] = serde_json::Value::Array(data.clone()),
                        "nodeStates" => project_data["nodeStates"] = serde_json::Value::Array(data.clone()),
                        _ => {}
                    }
                }
            }
        }
    }
    
    // Extract project name from filename
    if let Some(file_stem) = project_path.file_stem().and_then(|s| s.to_str()) {
        project_data["projectName"] = serde_json::Value::String(file_stem.to_string());
    }
    
    Ok(project_data)
}

#[tauri::command]
async fn dashboard_load_project_data(
    project_name: String,
    app_handle: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    load_project_data_from_file(&project_path)
}

#[tauri::command]
async fn dashboard_load_multiple_projects_data(
    project_names: Vec<String>,
    app_handle: tauri::AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    let project_dir = get_project_dir(&app_handle)?;
    let mut results = Vec::new();
    
    for project_name in project_names {
        let project_path = project_dir.join(format!("{}.json", project_name));
        match load_project_data_from_file(&project_path) {
            Ok(data) => results.push(data),
            Err(_) => {
                // Skip files that don't exist or can't be read
                continue;
            }
        }
    }
    
    Ok(results)
}

#[tauri::command]
async fn loki_load_database(
    project_name: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    use std::fs;
    
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    
    if !project_path.exists() {
        // Return empty database structure for new projects
        return Ok(serde_json::json!({
            "databaseVersion": 1.5,
            "engineVersion": 1.5,
            "collections": []
        }).to_string());
    }
    
    let contents = fs::read_to_string(&project_path)
        .map_err(|e| format!("Failed to read database file: {}", e))?;
    
    // If file is empty, return empty database structure
    if contents.trim().is_empty() {
        return Ok(serde_json::json!({
            "databaseVersion": 1.5,
            "engineVersion": 1.5,
            "collections": []
        }).to_string());
    }
    Ok(contents)
}

#[tauri::command]
async fn loki_save_database(
    project_name: String,
    db_content: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    use std::fs;
    
    let project_dir = get_project_dir(&app_handle)?;
    fs::create_dir_all(&project_dir)
        .map_err(|e| format!("Failed to create project dir: {}", e))?;
    
    let project_path = project_dir.join(format!("{}.json", project_name));
    
    // Validate JSON before writing
    serde_json::from_str::<serde_json::Value>(&db_content)
        .map_err(|e| format!("Invalid database JSON: {}", e))?;
    
    fs::write(&project_path, db_content)
        .map_err(|e| format!("Failed to write database file: {}", e))?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(tauri::async_runtime::Mutex::new(AppState::default()))
        .invoke_handler(tauri::generate_handler![
            ping,
            initialize_loki_project,
            api_initialize_project_state,
            api_get_project_state,
            api_set_project_state,
            utils_close_timer_window,
            api_get_project_settings,
            api_set_trello_board,
            game_get_state,
            game_save_state,
            dashboard_get_all_project_names,
            dashboard_load_project_data,
            dashboard_load_multiple_projects_data,
            project_get_projects,
            project_get_file_path,
            project_create_project,
            project_delete_project,
            project_rename_project,
            loki_load_database,
            loki_save_database,
            parents::api_get_parents,
            parents::api_get_parent_order,
            parents::api_create_parent,
            parents::api_delete_parent,
            parents::api_update_parent_property,
            parents::api_update_parent_order,
            parents::api_update_nodes_in_parents,
            nodes::api_create_node,
            nodes::api_update_node_property,
            nodes::api_delete_node,
            nodes::api_get_node,
            nodes::api_get_nodes,
            nodes::api_get_nodes_with_query,
            tags::api_get_tags,
            tags::api_add_tag,
            tags::api_update_tag_color,
            metadata::api_get_node_types,
            metadata::api_get_node_states,
            metadata::api_save_metadata_value,
            timer::api_get_timer_preferences,
            timer::api_update_timer_preference_property,
            msg_from_renderer,
            git_get_repositories,
            git_add_repository,
            git_switch_repository,
            git_get_current_repository,
            git_get_repository_status,
            git_create_branch,
            git_switch_branch,
            git_delete_branch,
            git_get_branches_with_dates,
            git_get_commit_history,
            git_get_file_history,
            git_get_commit_files,
            git_get_commit_diff,
            git_list_files,
            git_stash_changes,
            git_stash_files,
            git_get_stash_list,
            git_get_stash_files,
            git_get_stash_file_diff,
            git_apply_stash,
            git_pop_stash,
            git_drop_stash,
            git_stage_files,
            git_unstage_files,
            git_commit,
            git_fetch,
            git_pull,
            git_push,
            git_get_diff,
            git_select_repository,
            git_load_project_repositories,
        ])
        .setup(|_app| {
            // Setup code here
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
