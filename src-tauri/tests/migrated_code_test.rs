use banflow_tauri_lib::database::{
    empty_project_db, load_project_database, load_project_database_typed,
    save_project_database, save_project_database_typed, get_collection_data, update_collection_data,
};
use banflow_tauri_lib::models::{Node, Parent, ProjectDatabase};
use std::fs;
use tempfile::TempDir;

#[test]
fn test_database_load_save_typed() {
    println!("\n=== Testing Database Load/Save with Typed Structs ===");
    
    let temp_dir = TempDir::new().unwrap();
    let project_path = temp_dir.path().join("test_project.json");
    
    // Create initial database
    let initial_db = empty_project_db();
    save_project_database(&project_path, &initial_db).expect("Failed to save initial database");
    println!("✓ Created initial database");
    
    // Load it back
    let loaded_db = load_project_database(&project_path).expect("Failed to load database");
    assert_eq!(loaded_db["databaseVersion"], 1.5);
    assert_eq!(loaded_db["engineVersion"], 1.5);
    println!("✓ Loaded database successfully");
    
    // Verify JSON format
    let contents = fs::read_to_string(&project_path).unwrap();
    let json: serde_json::Value = serde_json::from_str(&contents).unwrap();
    assert_eq!(json["databaseVersion"], 1.5);
    assert_eq!(json["engineVersion"], 1.5);
    println!("✓ JSON format is correct");
    
    println!("✅ Database Load/Save Test PASSED\n");
}

#[test]
fn test_node_creation_typed() {
    println!("\n=== Testing Node Creation with Typed Structs ===");
    
    let node = Node::new(
        "task".to_string(),
        "Test Node".to_string(),
        "parent-1".to_string(),
        "".to_string(),
        "2024-01-01T12:00:00.000Z".to_string(),
        "2024-01-01T12:00:00.000Z".to_string(),
        1,
    );
    
    assert_eq!(node.id, "node-1");
    assert_eq!(node.title, "Test Node");
    assert_eq!(node.node_type, "task");
    assert_eq!(node.parent, "parent-1");
    assert_eq!(node.loki_id, Some(1));
    println!("✓ Node created with correct properties");
    
    // Test serialization
    let json = serde_json::to_value(&node).expect("Failed to serialize");
    assert_eq!(json["id"], "node-1");
    assert_eq!(json["title"], "Test Node");
    assert_eq!(json["nodeType"], "task");
    assert_eq!(json["$loki"], 1);
    println!("✓ Node serializes correctly");
    
    // Test deserialization
    let deserialized: Node = serde_json::from_value(json).expect("Failed to deserialize");
    assert_eq!(deserialized.id, "node-1");
    assert_eq!(deserialized.title, "Test Node");
    println!("✓ Node deserializes correctly");
    
    println!("✅ Node Creation Test PASSED\n");
}

#[test]
fn test_parent_creation_typed() {
    println!("\n=== Testing Parent Creation with Typed Structs ===");
    
    let parent = Parent::new(
        "parent-1".to_string(),
        "Test Parent".to_string(),
        None,
    );
    
    assert_eq!(parent.id, "parent-1");
    assert_eq!(parent.title, "Test Parent");
    assert_eq!(parent.node_ids.len(), 0);
    assert_eq!(parent.time_spent, 0);
    assert_eq!(parent.is_timed, true);
    println!("✓ Parent created with correct properties");
    
    // Test serialization
    let json = serde_json::to_value(&parent).expect("Failed to serialize");
    assert_eq!(json["id"], "parent-1");
    assert_eq!(json["title"], "Test Parent");
    assert_eq!(json["timeSpent"], 0);
    assert_eq!(json["isTimed"], true);
    println!("✓ Parent serializes correctly");
    
    // Test deserialization
    let deserialized: Parent = serde_json::from_value(json).expect("Failed to deserialize");
    assert_eq!(deserialized.id, "parent-1");
    assert_eq!(deserialized.title, "Test Parent");
    println!("✓ Parent deserializes correctly");
    
    println!("✅ Parent Creation Test PASSED\n");
}

#[test]
fn test_collection_operations() {
    println!("\n=== Testing Collection Operations ===");
    
    let temp_dir = TempDir::new().unwrap();
    let project_path = temp_dir.path().join("test_project.json");
    
    // Create database with a collection
    let mut db = empty_project_db();
    update_collection_data(&mut db, "nodes", vec![
        serde_json::json!({"id": "node-1", "title": "Test"}),
        serde_json::json!({"id": "node-2", "title": "Test 2"}),
    ]);
    
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Created database with collections");
    
    // Load and verify
    let loaded_db = load_project_database(&project_path).expect("Failed to load");
    let nodes = get_collection_data(&loaded_db, "nodes");
    assert_eq!(nodes.len(), 2);
    assert_eq!(nodes[0]["id"], "node-1");
    assert_eq!(nodes[1]["id"], "node-2");
    println!("✓ Collections loaded correctly");
    
    // Update collection
    let mut updated_db = loaded_db;
    update_collection_data(&mut updated_db, "nodes", vec![
        serde_json::json!({"id": "node-1", "title": "Updated"}),
    ]);
    save_project_database(&project_path, &updated_db).expect("Failed to save update");
    
    // Verify update
    let final_db = load_project_database(&project_path).expect("Failed to load");
    let final_nodes = get_collection_data(&final_db, "nodes");
    assert_eq!(final_nodes.len(), 1);
    assert_eq!(final_nodes[0]["title"], "Updated");
    println!("✓ Collection update works correctly");
    
    println!("✅ Collection Operations Test PASSED\n");
}

#[test]
fn test_electron_compatibility() {
    println!("\n=== Testing Electron/LokiJS Compatibility ===");
    
    // Sample Electron/LokiJS format (with all required fields)
    let electron_format = r#"
{
  "databaseVersion": 1.5,
  "engineVersion": 1.5,
  "collections": [
    {
      "name": "nodes",
      "data": [
        {
          "id": "node-1",
          "title": "Test Node",
          "nodeType": "task",
          "nodeState": "",
          "scheduledDate": "",
          "tags": [],
          "description": "",
          "linkedNodes": "",
          "comments": [],
          "attachments": [],
          "coverImage": "",
          "images": [],
          "videos": [],
          "sessionHistory": [],
          "sessionStart": 0,
          "notes": "",
          "checklist": {"title": "Checklist", "checks": [], "timeSpent": 0},
          "timeSpent": 0,
          "parent": "parent-1",
          "isComplete": false,
          "created": "2024-01-01T12:00:00.000Z",
          "estimatedTime": 0,
          "estimatedDate": "",
          "completedDate": "",
          "isLocked": false,
          "isArchived": false,
          "iterationId": "",
          "lastUpdated": "2024-01-01T12:00:00.000Z",
          "labels": [],
          "dueDate": null,
          "startDate": null,
          "$loki": 1
        }
      ],
      "idIndex": {},
      "binaryIndices": {},
      "constraints": null,
      "uniqueNames": [],
      "transforms": [],
      "dirty": false
    },
    {
      "name": "parents",
      "data": [
        {
          "id": "parent-1",
          "title": "Test Parent",
          "timeSpent": 0,
          "isTimed": true,
          "nodeHistory": [],
          "sessionHistory": [],
          "nodeIds": [],
          "$loki": 1
        }
      ],
      "idIndex": {},
      "binaryIndices": {},
      "constraints": null,
      "uniqueNames": [],
      "transforms": [],
      "dirty": false
    }
  ]
}
"#;
    
    // Parse into our typed struct
    let db: ProjectDatabase = serde_json::from_str(electron_format)
        .expect("Failed to parse Electron format");
    
    assert_eq!(db.database_version, 1.5);
    assert_eq!(db.collections.len(), 2);
    println!("✓ Electron format parsed into typed struct");
    
    // Extract nodes and verify
    let db_value = serde_json::to_value(&db).expect("Failed to convert to JSON value");
    let nodes_data = get_collection_data(&db_value, "nodes");
    assert_eq!(nodes_data.len(), 1);
    assert_eq!(nodes_data[0]["id"], "node-1");
    assert_eq!(nodes_data[0]["title"], "Test Node");
    println!("✓ Nodes extracted correctly");
    
    // Try to deserialize node into typed Node struct
    let node: Node = serde_json::from_value(nodes_data[0].clone())
        .expect("Failed to deserialize node");
    assert_eq!(node.id, "node-1");
    assert_eq!(node.title, "Test Node");
    assert_eq!(node.node_type, "task");
    println!("✓ Node deserialized into typed struct");
    
    // Round-trip: serialize back to JSON
    let serialized = serde_json::to_string_pretty(&db).expect("Failed to serialize");
    let _parsed_again: ProjectDatabase = serde_json::from_str(&serialized)
        .expect("Failed to parse after round-trip");
    println!("✓ Round-trip serialization works");
    
    println!("✅ Electron Compatibility Test PASSED\n");
}

#[test]
fn test_full_workflow() {
    println!("\n=== Testing Full Workflow ===");
    
    let temp_dir = TempDir::new().unwrap();
    let project_path = temp_dir.path().join("workflow_test.json");
    
    // 1. Create empty database
    let mut db = empty_project_db();
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Step 1: Created empty database");
    
    // 2. Create a parent
    let parent = Parent::new("parent-1".to_string(), "Workflow Parent".to_string(), None);
    let parent_json = serde_json::to_value(&parent).unwrap();
    update_collection_data(&mut db, "parents", vec![parent_json.clone()]);
    update_collection_data(&mut db, "parentOrder", vec![serde_json::json!({"parentId": "parent-1"})]);
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Step 2: Created parent");
    
    // 3. Create a node
    let node = Node::new(
        "task".to_string(),
        "Workflow Node".to_string(),
        "parent-1".to_string(),
        "".to_string(),
        "2024-01-01T12:00:00.000Z".to_string(),
        "2024-01-01T12:00:00.000Z".to_string(),
        1,
    );
    let node_json = serde_json::to_value(&node).unwrap();
    
    // Load, update, save
    let mut db = load_project_database(&project_path).expect("Failed to load");
    let mut nodes = get_collection_data(&db, "nodes");
    nodes.push(node_json.clone());
    update_collection_data(&mut db, "nodes", nodes);
    
    // Update parent's nodeIds
    let mut parents = get_collection_data(&db, "parents");
    if let Some(parent) = parents[0].as_object_mut() {
        let node_ids = parent.get_mut("nodeIds").unwrap().as_array_mut().unwrap();
        node_ids.push(serde_json::json!("node-1"));
    }
    update_collection_data(&mut db, "parents", parents);
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Step 3: Created node and linked to parent");
    
    // 4. Verify everything
    let final_db = load_project_database(&project_path).expect("Failed to load");
    let final_nodes = get_collection_data(&final_db, "nodes");
    let final_parents = get_collection_data(&final_db, "parents");
    
    assert_eq!(final_nodes.len(), 1);
    assert_eq!(final_nodes[0]["id"], "node-1");
    assert_eq!(final_parents.len(), 1);
    assert_eq!(final_parents[0]["nodeIds"].as_array().unwrap().len(), 1);
    println!("✓ Step 4: Verified all data");
    
    println!("✅ Full Workflow Test PASSED\n");
}
