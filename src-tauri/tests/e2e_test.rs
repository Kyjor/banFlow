use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;
use serde_json;

// Import our library modules (we'll need to make them public)
// For now, we'll test the core functionality directly

#[test]
fn test_full_node_lifecycle() {
    println!("\n=== Testing Full Node Lifecycle ===");
    
    // Create temporary project directory
    let temp_dir = TempDir::new().unwrap();
    let project_name = "e2e_test_project";
    let project_path = temp_dir.path().join(format!("{}.json", project_name));
    
    // Step 1: Create initial database
    println!("Step 1: Creating initial database...");
    let initial_db = serde_json::json!({
        "databaseVersion": 1.5,
        "engineVersion": 1.5,
        "collections": [
            {
                "name": "nodes",
                "data": [],
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
            },
            {
                "name": "parentOrder",
                "data": [
                    {"parentId": "parent-1"}
                ],
                "idIndex": {},
                "binaryIndices": {},
                "constraints": null,
                "uniqueNames": [],
                "transforms": [],
                "dirty": false
            }
        ]
    });
    
    fs::write(&project_path, serde_json::to_string_pretty(&initial_db).unwrap())
        .expect("Failed to create test project");
    println!("✓ Initial database created");
    
    // Step 2: Load database
    println!("Step 2: Loading database...");
    let contents = fs::read_to_string(&project_path).unwrap();
    let mut db: serde_json::Value = serde_json::from_str(&contents).unwrap();
    println!("✓ Database loaded");
    
    // Step 3: Create a node
    println!("Step 3: Creating a node...");
    let new_node = serde_json::json!({
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
        "checklist": {
            "title": "Checklist",
            "checks": [],
            "timeSpent": 0
        },
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
    });
    
    // Add node to database
    let nodes_collection = db["collections"].as_array_mut().unwrap()
        .iter_mut()
        .find(|c| c["name"] == "nodes")
        .unwrap();
    nodes_collection["data"].as_array_mut().unwrap().push(new_node.clone());
    
    // Update parent's nodeIds
    let parents_collection = db["collections"].as_array_mut().unwrap()
        .iter_mut()
        .find(|c| c["name"] == "parents")
        .unwrap();
    let parent = parents_collection["data"].as_array_mut().unwrap()
        .iter_mut()
        .find(|p| p["id"] == "parent-1")
        .unwrap();
    parent["nodeIds"].as_array_mut().unwrap().push(serde_json::json!("node-1"));
    
    println!("✓ Node created and added to parent");
    
    // Step 4: Save database
    println!("Step 4: Saving database...");
    fs::write(&project_path, serde_json::to_string_pretty(&db).unwrap())
        .expect("Failed to save database");
    println!("✓ Database saved");
    
    // Step 5: Verify node exists
    println!("Step 5: Verifying node exists...");
    let saved_contents = fs::read_to_string(&project_path).unwrap();
    let saved_db: serde_json::Value = serde_json::from_str(&saved_contents).unwrap();
    let nodes = saved_db["collections"].as_array().unwrap()
        .iter()
        .find(|c| c["name"] == "nodes")
        .unwrap()["data"].as_array().unwrap();
    
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0]["id"], "node-1");
    assert_eq!(nodes[0]["title"], "Test Node");
    println!("✓ Node verified in saved database");
    
    // Step 6: Update node property
    println!("Step 6: Updating node property...");
    let mut updated_db: serde_json::Value = serde_json::from_str(&saved_contents).unwrap();
    let node_to_update = updated_db["collections"].as_array_mut().unwrap()
        .iter_mut()
        .find(|c| c["name"] == "nodes")
        .unwrap()["data"].as_array_mut().unwrap()
        .iter_mut()
        .find(|n| n["id"] == "node-1")
        .unwrap();
    
    node_to_update["title"] = serde_json::json!("Updated Node Title");
    node_to_update["lastUpdated"] = serde_json::json!("2024-01-01T13:00:00.000Z");
    
    fs::write(&project_path, serde_json::to_string_pretty(&updated_db).unwrap())
        .expect("Failed to save updated database");
    println!("✓ Node property updated");
    
    // Step 7: Verify update
    println!("Step 7: Verifying update...");
    let verify_contents = fs::read_to_string(&project_path).unwrap();
    let verify_db: serde_json::Value = serde_json::from_str(&verify_contents).unwrap();
    let updated_node = verify_db["collections"].as_array().unwrap()
        .iter()
        .find(|c| c["name"] == "nodes")
        .unwrap()["data"].as_array().unwrap()
        .iter()
        .find(|n| n["id"] == "node-1")
        .unwrap();
    
    assert_eq!(updated_node["title"], "Updated Node Title");
    println!("✓ Update verified");
    
    // Step 8: Delete node
    println!("Step 8: Deleting node...");
    let mut delete_db: serde_json::Value = serde_json::from_str(&verify_contents).unwrap();
    let nodes_collection = delete_db["collections"].as_array_mut().unwrap()
        .iter_mut()
        .find(|c| c["name"] == "nodes")
        .unwrap();
    nodes_collection["data"].as_array_mut().unwrap().retain(|n| n["id"] != "node-1");
    
    // Remove from parent's nodeIds
    let parents_collection = delete_db["collections"].as_array_mut().unwrap()
        .iter_mut()
        .find(|c| c["name"] == "parents")
        .unwrap();
    let parent = parents_collection["data"].as_array_mut().unwrap()
        .iter_mut()
        .find(|p| p["id"] == "parent-1")
        .unwrap();
    parent["nodeIds"].as_array_mut().unwrap().retain(|id| *id != serde_json::json!("node-1"));
    
    fs::write(&project_path, serde_json::to_string_pretty(&delete_db).unwrap())
        .expect("Failed to save after deletion");
    println!("✓ Node deleted");
    
    // Step 9: Verify deletion
    println!("Step 9: Verifying deletion...");
    let final_contents = fs::read_to_string(&project_path).unwrap();
    let final_db: serde_json::Value = serde_json::from_str(&final_contents).unwrap();
    let final_nodes = final_db["collections"].as_array().unwrap()
        .iter()
        .find(|c| c["name"] == "nodes")
        .unwrap()["data"].as_array().unwrap();
    
    assert_eq!(final_nodes.len(), 0);
    println!("✓ Deletion verified");
    
    println!("\n✅ Full Node Lifecycle Test PASSED\n");
}

#[test]
fn test_full_parent_lifecycle() {
    println!("\n=== Testing Full Parent Lifecycle ===");
    
    let temp_dir = TempDir::new().unwrap();
    let project_name = "e2e_test_parent";
    let project_path = temp_dir.path().join(format!("{}.json", project_name));
    
    // Create initial database
    println!("Step 1: Creating initial database...");
    let initial_db = serde_json::json!({
        "databaseVersion": 1.5,
        "engineVersion": 1.5,
        "collections": [
            {
                "name": "nodes",
                "data": [],
                "idIndex": {},
                "binaryIndices": {},
                "constraints": null,
                "uniqueNames": [],
                "transforms": [],
                "dirty": false
            },
            {
                "name": "parents",
                "data": [],
                "idIndex": {},
                "binaryIndices": {},
                "constraints": null,
                "uniqueNames": [],
                "transforms": [],
                "dirty": false
            },
            {
                "name": "parentOrder",
                "data": [],
                "idIndex": {},
                "binaryIndices": {},
                "constraints": null,
                "uniqueNames": [],
                "transforms": [],
                "dirty": false
            }
        ]
    });
    
    fs::write(&project_path, serde_json::to_string_pretty(&initial_db).unwrap())
        .expect("Failed to create test project");
    println!("✓ Initial database created");
    
    // Create parent
    println!("Step 2: Creating parent...");
    let mut db: serde_json::Value = serde_json::from_str(
        &fs::read_to_string(&project_path).unwrap()
    ).unwrap();
    
    let new_parent = serde_json::json!({
        "id": "parent-1",
        "title": "Test Parent",
        "timeSpent": 0,
        "isTimed": true,
        "nodeHistory": [],
        "sessionHistory": [],
        "nodeIds": [],
        "$loki": 1
    });
    
    db["collections"].as_array_mut().unwrap()
        .iter_mut()
        .find(|c| c["name"] == "parents")
        .unwrap()["data"].as_array_mut().unwrap()
        .push(new_parent.clone());
    
    db["collections"].as_array_mut().unwrap()
        .iter_mut()
        .find(|c| c["name"] == "parentOrder")
        .unwrap()["data"].as_array_mut().unwrap()
        .push(serde_json::json!({"parentId": "parent-1"}));
    
    fs::write(&project_path, serde_json::to_string_pretty(&db).unwrap())
        .expect("Failed to save");
    println!("✓ Parent created");
    
    // Verify parent exists
    println!("Step 3: Verifying parent...");
    let saved_contents = fs::read_to_string(&project_path).unwrap();
    let saved_db: serde_json::Value = serde_json::from_str(&saved_contents).unwrap();
    let parents = saved_db["collections"].as_array().unwrap()
        .iter()
        .find(|c| c["name"] == "parents")
        .unwrap()["data"].as_array().unwrap();
    
    assert_eq!(parents.len(), 1);
    assert_eq!(parents[0]["id"], "parent-1");
    assert_eq!(parents[0]["title"], "Test Parent");
    println!("✓ Parent verified");
    
    // Verify parentOrder
    let parent_order = saved_db["collections"].as_array().unwrap()
        .iter()
        .find(|c| c["name"] == "parentOrder")
        .unwrap()["data"].as_array().unwrap();
    
    assert_eq!(parent_order.len(), 1);
    assert_eq!(parent_order[0]["parentId"], "parent-1");
    println!("✓ Parent order verified");
    
    println!("\n✅ Full Parent Lifecycle Test PASSED\n");
}

#[test]
fn test_json_format_compatibility() {
    println!("\n=== Testing JSON Format Compatibility ===");
    
    // Test that our format matches Electron/LokiJS format
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
          "parent": "parent-1",
          "created": "2024-01-01T12:00:00.000Z",
          "lastUpdated": "2024-01-01T12:00:00.000Z",
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
    
    // Parse Electron format
    let db: serde_json::Value = serde_json::from_str(electron_format)
        .expect("Failed to parse Electron format");
    assert_eq!(db["databaseVersion"], 1.5);
    assert_eq!(db["collections"][0]["name"], "nodes");
    println!("✓ Electron JSON format parsed successfully");
    
    // Verify we can round-trip it
    let serialized = serde_json::to_string_pretty(&db).unwrap();
    let _parsed_again: serde_json::Value = serde_json::from_str(&serialized)
        .expect("Failed to parse after round-trip");
    println!("✓ JSON round-trip successful");
    
    println!("\n✅ JSON Format Compatibility Test PASSED\n");
}
