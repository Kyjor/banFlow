use crate::models::ProjectDatabase;
use std::fs;
use std::path::Path;

// Shared database helper functions

// Load project database from file (using typed structs)
pub fn load_project_database(project_path: &Path) -> Result<ProjectDatabase, String> {
    if !project_path.exists() {
        return Ok(ProjectDatabase::default());
    }
    
    let contents = fs::read_to_string(project_path)
        .map_err(|e| format!("Failed to read project file: {}", e))?;
    
    if contents.trim().is_empty() {
        return Ok(ProjectDatabase::default());
    }
    
    serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse LokiJS database: {}", e))
}

// Save project database to file (using typed structs)
pub fn save_project_database(project_path: &Path, db: &ProjectDatabase) -> Result<(), String> {
    fs::create_dir_all(project_path.parent().ok_or("Invalid project path")?)
        .map_err(|e| format!("Failed to create project dir: {}", e))?;
    
    // Serialize with pretty formatting (like LokiJS does)
    let serialized = serde_json::to_string_pretty(db)
        .map_err(|e| format!("Failed to serialize LokiJS database: {}", e))?;
    
    fs::write(project_path, serialized)
        .map_err(|e| format!("Failed to write LokiJS database: {}", e))
}

// Helper function to get a collection from typed database
pub fn get_collection_data(db: &ProjectDatabase, collection_name: &str) -> Vec<serde_json::Value> {
    db.collections.iter()
        .find_map(|c| {
            if c.name == collection_name {
                Some(c.data.clone())
            } else {
                None
            }
        })
        .unwrap_or_default()
}

// Helper function to update a collection in typed database
pub fn update_collection_data(db: &mut ProjectDatabase, collection_name: &str, data: Vec<serde_json::Value>) {
    use crate::models::Collection;
    
    if let Some(collection) = db.collections.iter_mut().find(|c| c.name == collection_name) {
        collection.data = data;
    } else {
        // Create collection if it doesn't exist
        db.collections.push(Collection {
            name: collection_name.to_string(),
            data,
            id_index: serde_json::json!({}),
            binary_indices: serde_json::json!({}),
            constraints: None,
            unique_names: Vec::new(),
            transforms: serde_json::json!({}),
            dirty: false,
            obj_type: None,
            cached_index: None,
            cached_binary_index: None,
            cached_data: None,
            adaptive_binary_indices: None,
            transactional: None,
            clone_objects: None,
            clone_method: None,
        });
    }
}
