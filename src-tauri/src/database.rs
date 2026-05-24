use serde::Deserialize;
use serde_json::Value;
use std::fs;
use std::path::Path;

/// Empty LokiJS database shell.
pub fn empty_project_db() -> Value {
    serde_json::json!({
        "databaseVersion": 1.5,
        "engineVersion": 1.5,
        "collections": []
    })
}

/// Parse project JSON, recovering from accidental duplicate documents on disk.
fn parse_project_json(contents: &str) -> Result<Value, String> {
    match serde_json::from_str::<Value>(contents) {
        Ok(db) => Ok(db),
        Err(err) if err.to_string().contains("trailing") => {
            let mut de = serde_json::Deserializer::from_str(contents);
            Value::deserialize(&mut de)
                .map_err(|e| format!("Failed to parse LokiJS database: {}", e))
        }
        Err(err) => Err(format!("Failed to parse LokiJS database: {}", err)),
    }
}

/// Load the on-disk LokiJS database as raw JSON so collection metadata is preserved.
pub fn load_project_database(project_path: &Path) -> Result<Value, String> {
    if !project_path.exists() {
        return Ok(empty_project_db());
    }

    let contents = fs::read_to_string(project_path)
        .map_err(|e| format!("Failed to read project file: {}", e))?;

    if contents.trim().is_empty() {
        return Ok(empty_project_db());
    }

    parse_project_json(&contents)
}

/// Save the database atomically (write temp file, then rename).
pub fn save_project_database(project_path: &Path, db: &Value) -> Result<(), String> {
    let parent = project_path
        .parent()
        .ok_or_else(|| format!("Invalid project path: {:?}", project_path))?;
    fs::create_dir_all(parent)
        .map_err(|e| format!("Failed to create project dir: {}", e))?;

    let serialized = serde_json::to_string_pretty(db)
        .map_err(|e| format!("Failed to serialize LokiJS database: {}", e))?;

    let stem = project_path
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| format!("Invalid project file name: {:?}", project_path))?;
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let temp_path = parent.join(format!("{}.{}.json.tmp", stem, unique));

    fs::write(&temp_path, &serialized)
        .map_err(|e| format!("Failed to write database temp file: {}", e))?;
    fs::rename(&temp_path, project_path).map_err(|e| {
        let _ = fs::remove_file(&temp_path);
        format!(
            "Failed to finalize database write ({} -> {}): {}",
            temp_path.display(),
            project_path.display(),
            e
        )
    })?;

    Ok(())
}

pub fn get_collection_data(db: &Value, collection_name: &str) -> Vec<Value> {
    db.get("collections")
        .and_then(|c| c.as_array())
        .and_then(|collections| {
            collections.iter().find_map(|collection| {
                if collection.get("name").and_then(|n| n.as_str()) == Some(collection_name) {
                    collection
                        .get("data")
                        .and_then(|d| d.as_array())
                        .map(|data| data.clone())
                } else {
                    None
                }
            })
        })
        .unwrap_or_default()
}

pub fn update_collection_data(db: &mut Value, collection_name: &str, data: Vec<Value>) {
    let collections = db
        .as_object_mut()
        .expect("project database root must be an object")
        .entry("collections")
        .or_insert_with(|| Value::Array(vec![]));

    let collections_array = collections
        .as_array_mut()
        .expect("collections must be an array");

    if let Some(collection) = collections_array.iter_mut().find(|collection| {
        collection.get("name").and_then(|n| n.as_str()) == Some(collection_name)
    }) {
        if let Some(collection_obj) = collection.as_object_mut() {
            collection_obj.insert("data".to_string(), Value::Array(data));
        }
        return;
    }

    collections_array.push(serde_json::json!({
        "name": collection_name,
        "data": data,
        "idIndex": null,
        "binaryIndices": {},
        "constraints": null,
        "uniqueNames": [],
        "transforms": {},
        "objType": "parent",
        "dirty": false,
        "adaptiveBinaryIndices": false,
        "transactional": false,
        "cloneObjects": false,
        "cloneMethod": "parse-string",
        "asyncAdaptiveBinaryIndices": true,
        "checksums": [],
        "autoupdate": false
    }));
}

pub fn get_project_settings(db: &Value) -> Option<Value> {
    get_collection_data(db, "projectSettings")
        .into_iter()
        .next()
}

fn merge_settings_into(existing: &mut Value, settings: &Value) {
    if let (Value::Object(ref mut existing_map), Value::Object(incoming)) =
        (existing, settings)
    {
        for (key, value) in incoming {
            if key == "$loki" || key == "meta" {
                continue;
            }
            existing_map.insert(key.clone(), value.clone());
        }
    }
}

/// Insert or merge project settings (mirrors Electron's projectSettings.update/insert).
pub fn upsert_project_settings(db: &mut Value, settings: Value) -> Value {
    let mut collection_data = get_collection_data(db, "projectSettings");

    let saved = if let Some(existing) = collection_data.first_mut() {
        merge_settings_into(existing, &settings);
        existing.clone()
    } else {
        let mut new_doc = settings;
        if let Value::Object(ref mut map) = new_doc {
            map.entry("$loki".to_string())
                .or_insert(Value::from(1));
            map.entry("meta".to_string()).or_insert(serde_json::json!({
                "revision": 0,
                "created": 0,
                "version": 0,
                "updated": 0
            }));
        }
        collection_data.push(new_doc.clone());
        new_doc
    };

    update_collection_data(db, "projectSettings", collection_data);
    saved
}

// Keep typed load for tests that use ProjectDatabase structs.
pub fn load_project_database_typed(
    project_path: &Path,
) -> Result<crate::models::ProjectDatabase, String> {
    let value = load_project_database(project_path)?;
    serde_json::from_value(value)
        .map_err(|e| format!("Failed to map LokiJS database to typed model: {}", e))
}

pub fn save_project_database_typed(
    project_path: &Path,
    db: &crate::models::ProjectDatabase,
) -> Result<(), String> {
    let value = serde_json::to_value(db)
        .map_err(|e| format!("Failed to convert typed database to JSON: {}", e))?;
    save_project_database(project_path, &value)
}
