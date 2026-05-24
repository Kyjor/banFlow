use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};

use crate::database::{
    get_collection_data, load_project_database, save_project_database, update_collection_data,
};
use crate::models::{Node, Parent};
use crate::{get_project_dir, AppState};

fn get_iso8601_time() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
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
    let month_days = [
        31,
        if is_leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
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

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year, month, day, hour, minute, second, millis_part
    )
}

fn get_nodes(db: &Value) -> Vec<Node> {
    get_collection_data(db, "nodes")
        .iter()
        .filter_map(|v| serde_json::from_value::<Node>(v.clone()).ok())
        .collect()
}

fn get_parents(db: &Value) -> Vec<Parent> {
    get_collection_data(db, "parents")
        .iter()
        .filter_map(|v| serde_json::from_value::<Parent>(v.clone()).ok())
        .collect()
}

fn get_next_parent_id(parents: &[Parent]) -> u64 {
    if parents.is_empty() {
        return 1;
    }
    parents
        .iter()
        .filter_map(|p| p.loki_id)
        .max()
        .map(|max| max + 1)
        .unwrap_or(1)
}

fn get_next_node_id(nodes: &[Node]) -> u64 {
    if nodes.is_empty() {
        return 1;
    }
    nodes
        .iter()
        .filter_map(|n| n.loki_id)
        .max()
        .map(|max| max + 1)
        .unwrap_or(1)
}

fn trello_id(value: &Value) -> Option<String> {
    value.get("id").and_then(|v| v.as_str()).map(str::to_string)
}

fn parent_trello_id(parent: &Parent) -> Option<String> {
    parent.trello.as_ref().and_then(trello_id)
}

fn node_trello_id(node: &Node) -> Option<String> {
    node.trello.as_ref().and_then(trello_id)
}

fn apply_card_labels_to_node(node: &mut Node, card: &Value) {
    let labels = card
        .get("labels")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    node.labels = labels
        .iter()
        .cloned()
        .collect::<Vec<Value>>();

    node.tags = labels
        .iter()
        .filter_map(|label| {
            label
                .get("name")
                .and_then(|v| v.as_str())
                .map(str::to_string)
        })
        .collect();
}

fn parse_banflow_description(description: &str) -> (String, Option<i64>) {
    const SEPARATOR: &str = "---Banflow fields, do not edit this line or below it---";

    if description.is_empty() {
        return (String::new(), None);
    }

    let parts: Vec<&str> = description.split(SEPARATOR).collect();
    let clean = parts[0].trim().to_string();

    if parts.len() < 2 {
        return (clean, None);
    }

    let mut time_spent = None;
    for line in parts[1].trim().lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("banflow:") {
            if let Some((key, value)) = rest.split_once('=') {
                if key.trim() == "timeSpent" {
                    if let Ok(parsed) = value.trim().parse::<i64>() {
                        time_spent = Some(parsed);
                    }
                }
            }
        }
    }

    (clean, time_spent)
}

fn find_parent_by_trello_list_id<'a>(
    parents: &'a [Parent],
    list_id: &str,
) -> Option<&'a Parent> {
    parents
        .iter()
        .find(|parent| parent_trello_id(parent).as_deref() == Some(list_id))
}

fn move_node_between_parents(
    parents: &mut [Parent],
    node: &mut Node,
    from_parent_id: &str,
    to_parent_id: &str,
) {
    if from_parent_id == to_parent_id {
        return;
    }

    if let Some(origin) = parents.iter_mut().find(|p| p.id == from_parent_id) {
        origin.node_ids.retain(|id| id != &node.id);
    }
    if let Some(dest) = parents.iter_mut().find(|p| p.id == to_parent_id) {
        if !dest.node_ids.iter().any(|id| id == &node.id) {
            dest.node_ids.push(node.id.clone());
        }
        node.parent = to_parent_id.to_string();
    }
}

fn collections_to_state(
    nodes_json: &[Value],
    parents_json: &[Value],
    parent_order_data: &[Value],
) -> Value {
    let mut nodes_obj = serde_json::Map::new();
    for node_json in nodes_json {
        if let Some(id) = node_json.get("id").and_then(|v| v.as_str()) {
            nodes_obj.insert(id.to_string(), node_json.clone());
        }
    }

    let mut parents_obj = serde_json::Map::new();
    for parent_json in parents_json {
        if let Some(id) = parent_json.get("id").and_then(|v| v.as_str()) {
            parents_obj.insert(id.to_string(), parent_json.clone());
        }
    }

    let parent_order_array: Vec<Value> = parent_order_data
        .iter()
        .filter_map(|item| {
            item.get("parentId")
                .or_else(|| item.get("parent_id"))
                .cloned()
                .or_else(|| {
                    if item.is_string() {
                        Some(item.clone())
                    } else {
                        None
                    }
                })
        })
        .collect();

    serde_json::json!({
        "nodes": Value::Object(nodes_obj),
        "parents": Value::Object(parents_obj),
        "parentOrder": parent_order_array,
    })
}

#[tauri::command]
pub async fn api_sync_trello_board(
    project_name: String,
    lists: Vec<Value>,
    cards: Vec<Value>,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;

    let mut parents = get_parents(&db);
    let mut parent_order_data = get_collection_data(&db, "parentOrder");
    let mut nodes = get_nodes(&db);

    for list in &lists {
        let list_id = match trello_id(list) {
            Some(id) => id,
            None => continue,
        };
        let list_name = list
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled list")
            .to_string();

        if find_parent_by_trello_list_id(&parents, &list_id).is_some() {
            continue;
        }

        let next_id = get_next_parent_id(&parents);
        let parent_id = format!("parent-{}", next_id);
        let mut new_parent = Parent::new(parent_id.clone(), list_name, Some(list.clone()));
        new_parent.loki_id = Some(next_id);

        parents.push(new_parent);
        parent_order_data.push(serde_json::json!({ "parentId": parent_id }));
    }

    for card in &cards {
        let card_id = match trello_id(card) {
            Some(id) => id,
            None => continue,
        };
        let list_id = match card.get("idList").and_then(|v| v.as_str()) {
            Some(id) => id.to_string(),
            None => continue,
        };
        let card_name = card
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled card")
            .to_string();
        let card_desc = card
            .get("desc")
            .and_then(|v| v.as_str())
            .unwrap_or_default();

        let target_parent = match find_parent_by_trello_list_id(&parents, &list_id) {
            Some(parent) => parent.id.clone(),
            None => continue,
        };

        let (clean_description, banflow_time_spent) = parse_banflow_description(card_desc);

        if let Some(existing_index) = nodes
            .iter()
            .position(|node| node_trello_id(node).as_deref() == Some(card_id.as_str()))
        {
            let node_id = nodes[existing_index].id.clone();
            let current_parent_id = nodes[existing_index].parent.clone();

            if let Some(current_parent) = parents.iter().find(|p| p.id == current_parent_id) {
                if current_parent.trello.is_some()
                    && parent_trello_id(current_parent).as_deref() != Some(list_id.as_str())
                {
                    if find_parent_by_trello_list_id(&parents, &list_id).is_some() {
                        move_node_between_parents(
                            &mut parents,
                            &mut nodes[existing_index],
                            &current_parent_id,
                            &target_parent,
                        );
                    }
                }
            }

            if nodes[existing_index].title != card_name {
                nodes[existing_index].title = card_name;
            }
            if nodes[existing_index].description != clean_description {
                nodes[existing_index].description = clean_description;
            }
            if let Some(time_spent) = banflow_time_spent {
                nodes[existing_index].time_spent = time_spent;
            }
            nodes[existing_index].trello = Some(card.clone());
            apply_card_labels_to_node(&mut nodes[existing_index], card);
            nodes[existing_index].last_updated = get_iso8601_time();

            let _ = node_id;
        } else {
            let next_id = get_next_node_id(&nodes);
            let created = get_iso8601_time();
            let mut new_node = Node::new(
                "child".to_string(),
                card_name,
                target_parent.clone(),
                String::new(),
                created.clone(),
                created,
                next_id,
            );
            new_node.description = clean_description;
            if let Some(time_spent) = banflow_time_spent {
                new_node.time_spent = time_spent;
            }
            new_node.trello = Some(card.clone());
            apply_card_labels_to_node(&mut new_node, card);

            if let Some(parent) = parents.iter_mut().find(|p| p.id == target_parent) {
                parent.node_ids.push(new_node.id.clone());
            }

            nodes.push(new_node);
        }
    }

    let nodes_json: Vec<Value> = nodes
        .iter()
        .map(|n| serde_json::to_value(n).unwrap())
        .collect();
    let parents_json: Vec<Value> = parents
        .iter()
        .map(|p| serde_json::to_value(p).unwrap())
        .collect();

    update_collection_data(&mut db, "nodes", nodes_json.clone());
    update_collection_data(&mut db, "parents", parents_json.clone());
    update_collection_data(&mut db, "parentOrder", parent_order_data.clone());
    save_project_database(&project_path, &db)?;

    let state_payload =
        collections_to_state(&nodes_json, &parents_json, &parent_order_data);

    let app_state = app_handle.state::<tauri::async_runtime::Mutex<AppState>>();
    let mut state = app_state.lock().await;

    if let Some(cached_data) = state.cached_project_data.get_mut(&project_name) {
        cached_data.nodes = nodes_json.clone();
        cached_data.parents = parents_json.clone();
        cached_data.parent_order = parent_order_data.clone();
    }

    if let Some(project_state) = state.project_states.get_mut(&project_name) {
        if let Some(nodes) = state_payload.get("nodes") {
            project_state.nodes = Some(nodes.clone());
        }
        if let Some(parents) = state_payload.get("parents") {
            project_state.parents = Some(parents.clone());
        }
        if let Some(parent_order) = state_payload.get("parentOrder") {
            project_state.parent_order = Some(parent_order.clone());
        }
    }

    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.emit("UpdateProjectPageState", state_payload.clone());
    }

    Ok(state_payload)
}
