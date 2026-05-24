use crate::database::{
    get_collection_data, load_project_database, save_project_database, update_collection_data,
};
use crate::get_project_dir;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const COLLECTION: &str = "gitRepositories";

fn project_db_path(app_handle: &AppHandle, project_name: &str) -> Result<PathBuf, String> {
    let dir = get_project_dir(app_handle)?;
    Ok(dir.join(format!("{}.json", project_name)))
}

fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    secs.to_string()
}

fn repos_for_project(db: &Value, project_name: &str) -> Vec<Value> {
    get_collection_data(db, COLLECTION)
        .into_iter()
        .filter(|r| {
            r.get("projectName")
                .and_then(|v| v.as_str())
                .map(|pn| pn == project_name)
                .unwrap_or(false)
        })
        .collect()
}

fn write_project_repos(db: &mut Value, project_name: &str, project_repos: Vec<Value>) {
    let mut all = get_collection_data(db, COLLECTION);
    all.retain(|r| {
        r.get("projectName")
            .and_then(|v| v.as_str())
            .map(|pn| pn != project_name)
            .unwrap_or(true)
    });
    all.extend(project_repos);
    update_collection_data(db, COLLECTION, all);
}

fn repo_path_value(repo: &Value) -> Option<&str> {
    repo.get("path").and_then(|v| v.as_str())
}

#[tauri::command]
pub async fn git_load_project_repositories(
    project_name: String,
    app_handle: AppHandle,
) -> Result<Vec<Value>, String> {
    let project_path = project_db_path(&app_handle, &project_name)?;
    if !project_path.exists() {
        return Ok(vec![]);
    }
    let db = load_project_database(&project_path)?;
    Ok(repos_for_project(&db, &project_name))
}

#[tauri::command]
pub async fn git_link_repository_to_project(
    project_name: String,
    repo_info: Value,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let repo_path = repo_info
        .get("path")
        .and_then(|v| v.as_str())
        .ok_or("repo_info.path is required")?
        .to_string();

    if !Path::new(&repo_path).is_dir() {
        return Err(format!("Repository path does not exist: {}", repo_path));
    }

    let project_path = project_db_path(&app_handle, &project_name)?;
    let mut db = load_project_database(&project_path)?;
    let mut repos = repos_for_project(&db, &project_name);
    let now = now_iso();
    let make_active = repo_info
        .get("isActive")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    if make_active {
        for r in repos.iter_mut() {
            if let Some(obj) = r.as_object_mut() {
                obj.insert("isActive".to_string(), Value::Bool(false));
            }
        }
    }

    let mut record = match repo_info.as_object() {
        Some(obj) => Value::Object(obj.clone()),
        None => json!({ "path": repo_path }),
    };

    if let Some(obj) = record.as_object_mut() {
        obj.insert("projectName".to_string(), Value::String(project_name.clone()));
        obj.insert("path".to_string(), Value::String(repo_path.clone()));
        obj.entry("addedAt")
            .or_insert_with(|| Value::String(now.clone()));
        obj.insert("lastAccessed".to_string(), Value::String(now));
        obj.insert("isActive".to_string(), Value::Bool(make_active));
    }

    if let Some(idx) = repos
        .iter()
        .position(|r| repo_path_value(r) == Some(repo_path.as_str()))
    {
        repos[idx] = record.clone();
    } else {
        repos.push(record.clone());
    }

    write_project_repos(&mut db, &project_name, repos);
    save_project_database(&project_path, &db)?;
    Ok(record)
}

#[tauri::command]
pub async fn git_unlink_repository_from_project(
    project_name: String,
    repo_path: String,
    app_handle: AppHandle,
) -> Result<bool, String> {
    let project_path = project_db_path(&app_handle, &project_name)?;
    let mut db = load_project_database(&project_path)?;
    let mut repos = repos_for_project(&db, &project_name);
    let before = repos.len();
    repos.retain(|r| repo_path_value(r) != Some(repo_path.as_str()));
    if repos.len() == before {
        return Ok(false);
    }
    write_project_repos(&mut db, &project_name, repos);
    save_project_database(&project_path, &db)?;
    Ok(true)
}

#[tauri::command]
pub async fn git_set_active_project_repository(
    project_name: String,
    repo_path: String,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let project_path = project_db_path(&app_handle, &project_name)?;
    let mut db = load_project_database(&project_path)?;
    let mut repos = repos_for_project(&db, &project_name);
    let now = now_iso();
    let mut found = None;

    for r in repos.iter_mut() {
        let is_match = repo_path_value(r) == Some(repo_path.as_str());
        if let Some(obj) = r.as_object_mut() {
            obj.insert("isActive".to_string(), Value::Bool(is_match));
            if is_match {
                obj.insert("lastAccessed".to_string(), Value::String(now.clone()));
                found = Some(r.clone());
            }
        }
    }

    let record = found.ok_or_else(|| {
        format!(
            "Repository \"{}\" is not linked to project \"{}\". Add it from the Git tab first.",
            repo_path, project_name
        )
    })?;

    write_project_repos(&mut db, &project_name, repos);
    save_project_database(&project_path, &db)?;
    Ok(record)
}

#[tauri::command]
pub async fn git_get_project_repository_stats(
    project_name: String,
    app_handle: AppHandle,
) -> Result<Value, String> {
    let repos = git_load_project_repositories(project_name.clone(), app_handle).await?;
    let active = repos.iter().filter(|r| r.get("isActive").and_then(|v| v.as_bool()) == Some(true)).count();
    let last_added = repos
        .iter()
        .max_by_key(|r| r.get("addedAt").and_then(|v| v.as_str()).unwrap_or(""))
        .cloned();
    Ok(json!({
        "total": repos.len(),
        "active": active,
        "recentlyAccessed": repos.len(),
        "lastAdded": last_added,
    }))
}

#[tauri::command]
pub async fn git_cleanup_project_repositories(
    project_name: String,
    app_handle: AppHandle,
) -> Result<Vec<String>, String> {
    let project_path = project_db_path(&app_handle, &project_name)?;
    let mut db = load_project_database(&project_path)?;
    let repos = repos_for_project(&db, &project_name);
    let mut removed = Vec::new();
    let mut kept = Vec::new();

    for r in repos {
        match repo_path_value(&r) {
            Some(path) if Path::new(path).is_dir() => kept.push(r),
            Some(path) => removed.push(path.to_string()),
            None => {}
        }
    }

    if !removed.is_empty() {
        write_project_repos(&mut db, &project_name, kept);
        save_project_database(&project_path, &db)?;
    }

    Ok(removed)
}
