use banflow_tauri_lib::database::{load_project_database, save_project_database, get_collection_data, update_collection_data};
use banflow_tauri_lib::models::{Node, Parent, Tag, Iteration, NodeType, NodeState, TimerPreferences};
use std::fs;
use tempfile::TempDir;

fn create_test_project_file(project_dir: &std::path::PathBuf, project_name: &str) -> std::path::PathBuf {
    let project_path = project_dir.join(format!("{}.json", project_name));
    
    let db_json = serde_json::json!({
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
            },
            {
                "name": "tags",
                "data": [],
                "idIndex": {},
                "binaryIndices": {},
                "constraints": null,
                "uniqueNames": [],
                "transforms": [],
                "dirty": false
            },
            {
                "name": "iterations",
                "data": [],
                "idIndex": {},
                "binaryIndices": {},
                "constraints": null,
                "uniqueNames": [],
                "transforms": [],
                "dirty": false
            },
            {
                "name": "nodeTypes",
                "data": [],
                "idIndex": {},
                "binaryIndices": {},
                "constraints": null,
                "uniqueNames": [],
                "transforms": [],
                "dirty": false
            },
            {
                "name": "nodeStates",
                "data": [],
                "idIndex": {},
                "binaryIndices": {},
                "constraints": null,
                "uniqueNames": [],
                "transforms": [],
                "dirty": false
            },
            {
                "name": "timerPreferences",
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
    
    fs::write(&project_path, serde_json::to_string_pretty(&db_json).unwrap())
        .expect("Failed to create test project file");
    
    project_path
}

#[test]
fn test_tag_operations() {
    println!("\n=== Testing Tag Operations ===");
    
    let temp_dir = TempDir::new().unwrap();
    let project_path = create_test_project_file(&temp_dir.path().to_path_buf(), "tag_test");
    
    // Load database
    let mut db = load_project_database(&project_path).expect("Failed to load");
    println!("✓ Database loaded");
    
    // Create tag
    let tag = Tag::new("tag-1".to_string(), "Test Tag".to_string(), "#FF0000".to_string(), 1);
    let tag_json = serde_json::to_value(&tag).unwrap();
    
    let mut tags_data = get_collection_data(&db, "tags");
    tags_data.push(tag_json.clone());
    update_collection_data(&mut db, "tags", tags_data.clone());
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Tag created");
    
    // Verify tag
    let loaded_db = load_project_database(&project_path).expect("Failed to load");
    let loaded_tags = get_collection_data(&loaded_db, "tags");
    assert_eq!(loaded_tags.len(), 1);
    assert_eq!(loaded_tags[0]["id"], "tag-1");
    assert_eq!(loaded_tags[0]["title"], "Test Tag");
    println!("✓ Tag verified");
    
    // Update tag color
    let mut updated_tags = loaded_tags;
    updated_tags[0]["color"] = serde_json::json!("#00FF00");
    let mut updated_db = loaded_db;
    update_collection_data(&mut updated_db, "tags", updated_tags.clone());
    save_project_database(&project_path, &updated_db).expect("Failed to save");
    
    let final_db = load_project_database(&project_path).expect("Failed to load");
    let final_tags = get_collection_data(&final_db, "tags");
    assert_eq!(final_tags[0]["color"], "#00FF00");
    println!("✓ Tag color updated");
    
    println!("✅ Tag Operations Test PASSED\n");
}

#[test]
fn test_iteration_operations() {
    println!("\n=== Testing Iteration Operations ===");
    
    let temp_dir = TempDir::new().unwrap();
    let project_path = create_test_project_file(&temp_dir.path().to_path_buf(), "iteration_test");
    
    // Load database
    let mut db = load_project_database(&project_path).expect("Failed to load");
    println!("✓ Database loaded");
    
    // Create iteration
    let iteration = Iteration::new("iteration-1".to_string(), "Sprint 1".to_string(), 1);
    let iteration_json = serde_json::to_value(&iteration).unwrap();
    
    let mut iterations_data = get_collection_data(&db, "iterations");
    iterations_data.push(iteration_json.clone());
    update_collection_data(&mut db, "iterations", iterations_data.clone());
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Iteration created");
    
    // Verify iteration
    let loaded_db = load_project_database(&project_path).expect("Failed to load");
    let loaded_iterations = get_collection_data(&loaded_db, "iterations");
    assert_eq!(loaded_iterations.len(), 1);
    assert_eq!(loaded_iterations[0]["id"], "iteration-1");
    assert_eq!(loaded_iterations[0]["title"], "Sprint 1");
    println!("✓ Iteration verified");
    
    // Update iteration property
    let mut updated_iterations = loaded_iterations;
    updated_iterations[0]["title"] = serde_json::json!("Sprint 2");
    let mut updated_db = loaded_db;
    update_collection_data(&mut updated_db, "iterations", updated_iterations.clone());
    save_project_database(&project_path, &updated_db).expect("Failed to save");
    
    let final_db = load_project_database(&project_path).expect("Failed to load");
    let final_iterations = get_collection_data(&final_db, "iterations");
    assert_eq!(final_iterations[0]["title"], "Sprint 2");
    println!("✓ Iteration property updated");
    
    // Delete iteration
    let mut delete_db = final_db;
    let mut delete_iterations = final_iterations;
    delete_iterations.clear();
    update_collection_data(&mut delete_db, "iterations", delete_iterations.clone());
    save_project_database(&project_path, &delete_db).expect("Failed to save");
    
    let verify_db = load_project_database(&project_path).expect("Failed to load");
    let verify_iterations = get_collection_data(&verify_db, "iterations");
    assert_eq!(verify_iterations.len(), 0);
    println!("✓ Iteration deleted");
    
    println!("✅ Iteration Operations Test PASSED\n");
}

#[test]
fn test_timer_preferences() {
    println!("\n=== Testing Timer Preferences ===");
    
    let temp_dir = TempDir::new().unwrap();
    let project_path = create_test_project_file(&temp_dir.path().to_path_buf(), "timer_test");
    
    // Load database
    let mut db = load_project_database(&project_path).expect("Failed to load");
    println!("✓ Database loaded");
    
    // Create timer preferences
    let prefs = TimerPreferences::default();
    let prefs_json = serde_json::to_value(&prefs).unwrap();
    
    let mut prefs_data = get_collection_data(&db, "timerPreferences");
    prefs_data.push(prefs_json.clone());
    update_collection_data(&mut db, "timerPreferences", prefs_data.clone());
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Timer preferences created");
    
    // Verify preferences
    let loaded_db = load_project_database(&project_path).expect("Failed to load");
    let loaded_prefs = get_collection_data(&loaded_db, "timerPreferences");
    assert_eq!(loaded_prefs.len(), 1);
    println!("✓ Timer preferences verified");
    
    // Update preference property
    let mut updated_prefs = loaded_prefs;
    updated_prefs[0]["autoStart"] = serde_json::json!(true);
    let mut updated_db = loaded_db;
    update_collection_data(&mut updated_db, "timerPreferences", updated_prefs.clone());
    save_project_database(&project_path, &updated_db).expect("Failed to save");
    
    let final_db = load_project_database(&project_path).expect("Failed to load");
    let final_prefs = get_collection_data(&final_db, "timerPreferences");
    assert_eq!(final_prefs[0]["autoStart"], true);
    println!("✓ Timer preference property updated");
    
    println!("✅ Timer Preferences Test PASSED\n");
}

#[test]
fn test_metadata_operations() {
    println!("\n=== Testing Metadata Operations ===");
    
    let temp_dir = TempDir::new().unwrap();
    let project_path = create_test_project_file(&temp_dir.path().to_path_buf(), "metadata_test");
    
    // Load database
    let mut db = load_project_database(&project_path).expect("Failed to load");
    println!("✓ Database loaded");
    
    // Create node type
    let node_type = NodeType::new("nodeType-1".to_string(), "Task".to_string(), 1);
    let node_type_json = serde_json::to_value(&node_type).unwrap();
    
    let mut node_types_data = get_collection_data(&db, "nodeTypes");
    node_types_data.push(node_type_json.clone());
    update_collection_data(&mut db, "nodeTypes", node_types_data.clone());
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Node type created");
    
    // Verify node type
    let loaded_db = load_project_database(&project_path).expect("Failed to load");
    let loaded_node_types = get_collection_data(&loaded_db, "nodeTypes");
    assert_eq!(loaded_node_types.len(), 1);
    assert_eq!(loaded_node_types[0]["id"], "nodeType-1");
    assert_eq!(loaded_node_types[0]["title"], "Task");
    println!("✓ Node type verified");
    
    // Create node state
    let node_state = NodeState::new("nodeState-1".to_string(), "In Progress".to_string(), 1);
    let node_state_json = serde_json::to_value(&node_state).unwrap();
    
    let mut node_states_data = get_collection_data(&loaded_db, "nodeStates");
    node_states_data.push(node_state_json.clone());
    let mut updated_db = loaded_db;
    update_collection_data(&mut updated_db, "nodeStates", node_states_data.clone());
    save_project_database(&project_path, &updated_db).expect("Failed to save");
    println!("✓ Node state created");
    
    // Verify node state
    let final_db = load_project_database(&project_path).expect("Failed to load");
    let loaded_node_states = get_collection_data(&final_db, "nodeStates");
    assert_eq!(loaded_node_states.len(), 1);
    assert_eq!(loaded_node_states[0]["id"], "nodeState-1");
    assert_eq!(loaded_node_states[0]["title"], "In Progress");
    println!("✓ Node state verified");
    
    println!("✅ Metadata Operations Test PASSED\n");
}

#[test]
fn test_parent_operations() {
    println!("\n=== Testing Parent Operations ===");
    
    let temp_dir = TempDir::new().unwrap();
    let project_path = create_test_project_file(&temp_dir.path().to_path_buf(), "parent_test");
    
    // Load database
    let mut db = load_project_database(&project_path).expect("Failed to load");
    println!("✓ Database loaded");
    
    // Create parent
    let parent = Parent::new("parent-1".to_string(), "Test Parent".to_string(), None);
    let parent_json = serde_json::to_value(&parent).unwrap();
    
    let mut parents_data = get_collection_data(&db, "parents");
    parents_data.push(parent_json.clone());
    update_collection_data(&mut db, "parents", parents_data.clone());
    
    // Add to parentOrder
    let mut parent_order_data = get_collection_data(&db, "parentOrder");
    parent_order_data.push(serde_json::json!({"parentId": "parent-1"}));
    update_collection_data(&mut db, "parentOrder", parent_order_data.clone());
    
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Parent created");
    
    // Verify parent
    let loaded_db = load_project_database(&project_path).expect("Failed to load");
    let loaded_parents = get_collection_data(&loaded_db, "parents");
    assert_eq!(loaded_parents.len(), 1);
    assert_eq!(loaded_parents[0]["id"], "parent-1");
    assert_eq!(loaded_parents[0]["title"], "Test Parent");
    println!("✓ Parent verified");
    
    // Update parent property
    let mut updated_parents = loaded_parents;
    updated_parents[0]["title"] = serde_json::json!("Updated Parent");
    let mut updated_db = loaded_db;
    update_collection_data(&mut updated_db, "parents", updated_parents.clone());
    save_project_database(&project_path, &updated_db).expect("Failed to save");
    
    let final_db = load_project_database(&project_path).expect("Failed to load");
    let final_parents = get_collection_data(&final_db, "parents");
    assert_eq!(final_parents[0]["title"], "Updated Parent");
    println!("✓ Parent property updated");
    
    // Update parent order
    let mut updated_order = get_collection_data(&final_db, "parentOrder");
    updated_order.push(serde_json::json!({"parentId": "parent-2"}));
    let mut order_db = final_db;
    update_collection_data(&mut order_db, "parentOrder", updated_order.clone());
    save_project_database(&project_path, &order_db).expect("Failed to save");
    
    let verify_db = load_project_database(&project_path).expect("Failed to load");
    let verify_order = get_collection_data(&verify_db, "parentOrder");
    assert_eq!(verify_order.len(), 2);
    println!("✓ Parent order updated");
    
    println!("✅ Parent Operations Test PASSED\n");
}

#[test]
fn test_full_integration() {
    println!("\n=== Testing Full Integration ===");
    
    let temp_dir = TempDir::new().unwrap();
    let project_path = create_test_project_file(&temp_dir.path().to_path_buf(), "integration_test");
    
    // Create parent
    let mut db = load_project_database(&project_path).expect("Failed to load");
    let parent = Parent::new("parent-1".to_string(), "Parent".to_string(), None);
    let parent_json = serde_json::to_value(&parent).unwrap();
    let mut parents_data = get_collection_data(&db, "parents");
    parents_data.push(parent_json.clone());
    update_collection_data(&mut db, "parents", parents_data.clone());
    
    let mut parent_order_data = get_collection_data(&db, "parentOrder");
    parent_order_data.push(serde_json::json!({"parentId": "parent-1"}));
    update_collection_data(&mut db, "parentOrder", parent_order_data.clone());
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Step 1: Created parent");
    
    // Create node
    let mut db = load_project_database(&project_path).expect("Failed to load");
    let node = Node::new(
        "task".to_string(),
        "Test Node".to_string(),
        "parent-1".to_string(),
        "".to_string(),
        "2024-01-01T12:00:00.000Z".to_string(),
        "2024-01-01T12:00:00.000Z".to_string(),
        1,
    );
    let node_json = serde_json::to_value(&node).unwrap();
    let mut nodes_data = get_collection_data(&db, "nodes");
    nodes_data.push(node_json.clone());
    update_collection_data(&mut db, "nodes", nodes_data.clone());
    
    // Update parent's nodeIds
    let mut parents_data = get_collection_data(&db, "parents");
    if let Some(parent) = parents_data[0].as_object_mut() {
        let node_ids = parent.get_mut("nodeIds").unwrap().as_array_mut().unwrap();
        node_ids.push(serde_json::json!("node-1"));
    }
    update_collection_data(&mut db, "parents", parents_data.clone());
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Step 2: Created node and linked to parent");
    
    // Create tag
    let mut db = load_project_database(&project_path).expect("Failed to load");
    let tag = Tag::new("tag-1".to_string(), "Important".to_string(), "#FF0000".to_string(), 1);
    let tag_json = serde_json::to_value(&tag).unwrap();
    let mut tags_data = get_collection_data(&db, "tags");
    tags_data.push(tag_json.clone());
    update_collection_data(&mut db, "tags", tags_data.clone());
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Step 3: Created tag");
    
    // Create iteration
    let mut db = load_project_database(&project_path).expect("Failed to load");
    let iteration = Iteration::new("iteration-1".to_string(), "Sprint 1".to_string(), 1);
    let iteration_json = serde_json::to_value(&iteration).unwrap();
    let mut iterations_data = get_collection_data(&db, "iterations");
    iterations_data.push(iteration_json.clone());
    update_collection_data(&mut db, "iterations", iterations_data.clone());
    save_project_database(&project_path, &db).expect("Failed to save");
    println!("✓ Step 4: Created iteration");
    
    // Verify everything
    let final_db = load_project_database(&project_path).expect("Failed to load");
    let final_nodes = get_collection_data(&final_db, "nodes");
    let final_parents = get_collection_data(&final_db, "parents");
    let final_tags = get_collection_data(&final_db, "tags");
    let final_iterations = get_collection_data(&final_db, "iterations");
    
    assert_eq!(final_nodes.len(), 1);
    assert_eq!(final_parents.len(), 1);
    assert_eq!(final_tags.len(), 1);
    assert_eq!(final_iterations.len(), 1);
    assert_eq!(final_parents[0]["nodeIds"].as_array().unwrap().len(), 1);
    println!("✓ Step 5: Verified all data");
    
    println!("✅ Full Integration Test PASSED\n");
}
