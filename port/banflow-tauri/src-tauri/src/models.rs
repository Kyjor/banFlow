use serde::{Deserialize, Serialize};

// Node data structure (matching NodeService.createNode)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    #[serde(rename = "nodeType")]
    pub node_type: String,
    #[serde(rename = "nodeState")]
    pub node_state: String,
    #[serde(rename = "scheduledDate")]
    pub scheduled_date: String,
    pub tags: Vec<String>,
    pub id: String,
    pub title: String,
    pub description: String,
    #[serde(rename = "linkedNodes")]
    pub linked_nodes: String,
    pub comments: Vec<serde_json::Value>,
    pub attachments: Vec<String>,
    #[serde(rename = "coverImage")]
    pub cover_image: String,
    pub images: Vec<String>,
    pub videos: Vec<String>,
    #[serde(rename = "sessionHistory")]
    pub session_history: Vec<serde_json::Value>,
    #[serde(rename = "sessionStart")]
    pub session_start: i64,
    pub notes: String,
    pub checklist: Checklist,
    #[serde(rename = "timeSpent")]
    pub time_spent: i64,
    pub parent: String,
    #[serde(rename = "isComplete")]
    pub is_complete: bool,
    pub created: String,
    #[serde(rename = "estimatedTime")]
    pub estimated_time: i64,
    #[serde(rename = "estimatedDate")]
    pub estimated_date: String,
    #[serde(rename = "completedDate")]
    pub completed_date: String,
    #[serde(rename = "isLocked")]
    pub is_locked: bool,
    #[serde(rename = "isArchived")]
    pub is_archived: bool,
    #[serde(rename = "iterationId")]
    pub iteration_id: String,
    #[serde(rename = "lastUpdated")]
    pub last_updated: String,
    pub labels: Vec<serde_json::Value>,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    // Optional fields
    pub trello: Option<serde_json::Value>,
    // LokiJS internal fields
    #[serde(rename = "$loki")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loki_id: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checklist {
    pub title: String,
    pub checks: Vec<serde_json::Value>,
    #[serde(rename = "timeSpent")]
    pub time_spent: i64,
}

impl Default for Checklist {
    fn default() -> Self {
        Checklist {
            title: "Checklist".to_string(),
            checks: Vec::new(),
            time_spent: 0,
        }
    }
}

impl Node {
    pub fn new(
        node_type: String,
        node_title: String,
        parent_id: String,
        iteration_id: String,
        created: String,
        last_updated: String,
        loki_id: u64,
    ) -> Self {
        Node {
            node_type,
            node_state: String::new(),
            scheduled_date: String::new(),
            tags: Vec::new(),
            id: format!("node-{}", loki_id),
            title: node_title,
            description: String::new(),
            linked_nodes: String::new(),
            comments: Vec::new(),
            attachments: Vec::new(),
            cover_image: String::new(),
            images: Vec::new(),
            videos: Vec::new(),
            session_history: Vec::new(),
            session_start: 0,
            notes: String::new(),
            checklist: Checklist::default(),
            time_spent: 0,
            parent: parent_id,
            is_complete: false,
            created,
            estimated_time: 0,
            estimated_date: String::new(),
            completed_date: String::new(),
            is_locked: false,
            is_archived: false,
            iteration_id,
            last_updated,
            labels: Vec::new(),
            due_date: None,
            start_date: None,
            trello: None,
            loki_id: Some(loki_id),
        }
    }
}

// Parent data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parent {
    pub id: String,
    pub title: String,
    #[serde(rename = "timeSpent")]
    pub time_spent: i64,
    #[serde(rename = "isTimed")]
    pub is_timed: bool,
    #[serde(rename = "nodeHistory")]
    pub node_history: Vec<serde_json::Value>,
    #[serde(rename = "sessionHistory")]
    pub session_history: Vec<serde_json::Value>,
    #[serde(rename = "nodeIds")]
    pub node_ids: Vec<String>,
    pub trello: Option<serde_json::Value>,
    // LokiJS internal fields
    #[serde(rename = "$loki")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loki_id: Option<u64>,
}

impl Parent {
    pub fn new(id: String, title: String, trello: Option<serde_json::Value>) -> Self {
        Parent {
            id,
            title,
            time_spent: 0,
            is_timed: true,
            node_history: Vec::new(),
            session_history: Vec::new(),
            node_ids: Vec::new(),
            trello,
            loki_id: None,
        }
    }
}

// Project database structure (LokiJS format)
#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectDatabase {
    #[serde(rename = "databaseVersion")]
    pub database_version: f64,
    #[serde(rename = "engineVersion")]
    pub engine_version: f64,
    pub collections: Vec<Collection>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Collection {
    pub name: String,
    pub data: Vec<serde_json::Value>,
    #[serde(rename = "idIndex")]
    #[serde(default)]
    pub id_index: serde_json::Value,
    #[serde(rename = "binaryIndices")]
    #[serde(default)]
    pub binary_indices: serde_json::Value,
    #[serde(default)]
    pub constraints: Option<serde_json::Value>,
    #[serde(rename = "uniqueNames")]
    #[serde(default)]
    pub unique_names: Vec<String>,
    #[serde(default)]
    pub transforms: serde_json::Value, // Can be object {} or array []
    #[serde(default)]
    pub dirty: bool,
    // Additional LokiJS fields that may be present
    #[serde(rename = "objType")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub obj_type: Option<String>,
    #[serde(rename = "cachedIndex")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cached_index: Option<serde_json::Value>,
    #[serde(rename = "cachedBinaryIndex")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cached_binary_index: Option<serde_json::Value>,
    #[serde(rename = "cachedData")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cached_data: Option<serde_json::Value>,
    #[serde(rename = "adaptiveBinaryIndices")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub adaptive_binary_indices: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transactional: Option<bool>,
    #[serde(rename = "cloneObjects")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clone_objects: Option<bool>,
    #[serde(rename = "cloneMethod")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clone_method: Option<String>,
}

impl Default for ProjectDatabase {
    fn default() -> Self {
        ProjectDatabase {
            database_version: 1.5,
            engine_version: 1.5,
            collections: Vec::new(),
        }
    }
}

// Tag data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub title: String,
    pub description: String,
    pub color: String,
    // LokiJS internal fields
    #[serde(rename = "$loki")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loki_id: Option<u64>,
}

impl Tag {
    pub fn new(id: String, title: String, color: String, loki_id: u64) -> Self {
        Tag {
            id,
            title,
            description: String::new(),
            color,
            loki_id: Some(loki_id),
        }
    }
}

// Iteration data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Iteration {
    pub id: String,
    pub title: String,
    pub description: String,
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
    #[serde(rename = "isComplete")]
    pub is_complete: bool,
    // LokiJS internal fields
    #[serde(rename = "$loki")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loki_id: Option<u64>,
}

impl Iteration {
    pub fn new(id: String, title: String, loki_id: u64) -> Self {
        Iteration {
            id,
            title,
            description: String::new(),
            start_date: None,
            end_date: None,
            is_complete: false,
            loki_id: Some(loki_id),
        }
    }
}

// NodeType data structure (metadata)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeType {
    pub id: String,
    pub title: String,
    pub description: String,
    // LokiJS internal fields
    #[serde(rename = "$loki")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loki_id: Option<u64>,
}

impl NodeType {
    pub fn new(id: String, title: String, loki_id: u64) -> Self {
        NodeType {
            id,
            title,
            description: String::new(),
            loki_id: Some(loki_id),
        }
    }
}

// NodeState data structure (metadata)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeState {
    pub id: String,
    pub title: String,
    pub description: String,
    // LokiJS internal fields
    #[serde(rename = "$loki")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loki_id: Option<u64>,
}

impl NodeState {
    pub fn new(id: String, title: String, loki_id: u64) -> Self {
        NodeState {
            id,
            title,
            description: String::new(),
            loki_id: Some(loki_id),
        }
    }
}

// TimerPreferences data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerPreferences {
    pub time: i64,
    #[serde(rename = "shortBreak")]
    pub short_break: i64,
    #[serde(rename = "longBreak")]
    pub long_break: i64,
    #[serde(rename = "autoCycle")]
    pub auto_cycle: bool,
    // LokiJS internal fields
    #[serde(rename = "$loki")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loki_id: Option<u64>,
}

impl Default for TimerPreferences {
    fn default() -> Self {
        TimerPreferences {
            time: 25,
            short_break: 5,
            long_break: 10,
            auto_cycle: false,
            loki_id: Some(1),
        }
    }
}

// ProjectSettings data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSettings {
    pub trello: serde_json::Value,
    // LokiJS internal fields
    #[serde(rename = "$loki")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loki_id: Option<u64>,
}

impl Default for ProjectSettings {
    fn default() -> Self {
        ProjectSettings {
            trello: serde_json::json!({}),
            loki_id: Some(1),
        }
    }
}

// GitRepository data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitRepository {
    pub id: String,
    #[serde(rename = "projectName")]
    pub project_name: String,
    pub path: String,
    pub branch: String,
    pub remotes: Vec<serde_json::Value>,
    // LokiJS internal fields
    #[serde(rename = "$loki")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loki_id: Option<u64>,
}

impl GitRepository {
    pub fn new(id: String, project_name: String, path: String, branch: String, loki_id: u64) -> Self {
        GitRepository {
            id,
            project_name,
            path,
            branch,
            remotes: Vec::new(),
            loki_id: Some(loki_id),
        }
    }
}
