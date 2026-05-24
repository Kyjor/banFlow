use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn plugin_storage_path(
    app_handle: &tauri::AppHandle,
    plugin_id: &str,
) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data_dir
        .join("plugins")
        .join(format!("{}.json", plugin_id)))
}

fn read_storage_value(
    app_handle: &tauri::AppHandle,
    plugin_id: &str,
) -> Result<serde_json::Value, String> {
    let path = plugin_storage_path(app_handle, plugin_id)?;
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    let contents = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read plugin storage: {}", e))?;
    serde_json::from_str(&contents).map_err(|e| format!("Failed to parse plugin storage: {}", e))
}

#[tauri::command]
pub async fn plugin_storage_get(
    plugin_id: String,
    app_handle: tauri::AppHandle,
) -> Result<Option<serde_json::Value>, String> {
    let path = plugin_storage_path(&app_handle, &plugin_id)?;
    if !path.exists() {
        return Ok(None);
    }
    let contents = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read plugin storage: {}", e))?;
    let value: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse plugin storage: {}", e))?;
    Ok(Some(value))
}

#[tauri::command]
pub async fn plugin_storage_set(
    plugin_id: String,
    data: serde_json::Value,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let path = plugin_storage_path(&app_handle, &plugin_id)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create plugin storage dir: {}", e))?;
    }
    let contents = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize plugin storage: {}", e))?;
    fs::write(&path, contents)
        .map_err(|e| format!("Failed to write plugin storage: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn plugin_openrouter_chat(
    plugin_id: String,
    request: serde_json::Value,
    app_handle: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    let storage = read_storage_value(&app_handle, &plugin_id)?;
    let api_key = storage
        .get("openRouterApiKey")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or("OpenRouter API key not configured in plugin settings")?;

    let model = request
        .get("model")
        .and_then(|v| v.as_str())
        .unwrap_or(
            storage
                .get("model")
                .and_then(|v| v.as_str())
                .unwrap_or("anthropic/claude-sonnet-4"),
        );

    let mut body = request.clone();
    if body.get("model").is_none() {
        body["model"] = serde_json::Value::String(model.to_string());
    }

    let client = reqwest::Client::new();
    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://banflow.app")
        .header("X-Title", "banFlow")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("OpenRouter request failed: {}", e))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("OpenRouter response read failed: {}", e))?;

    if !status.is_success() {
        return Err(format!("OpenRouter error {}: {}", status, text));
    }

    let parsed: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("OpenRouter JSON parse failed: {}", e))?;

    let choice = parsed
        .get("choices")
        .and_then(|c| c.get(0))
        .ok_or("OpenRouter response missing choices")?;

    let message = choice
        .get("message")
        .cloned()
        .ok_or("OpenRouter response missing message")?;

    let usage = parsed.get("usage").cloned();

    Ok(serde_json::json!({
        "message": message,
        "usage": usage,
    }))
}

#[tauri::command]
pub async fn plugin_audit_append(
    plugin_id: String,
    entry: serde_json::Value,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let audit_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("plugins")
        .join(format!("{}.audit.jsonl", plugin_id));

    if let Some(parent) = audit_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create audit dir: {}", e))?;
    }

    let line = serde_json::to_string(&entry)
        .map_err(|e| format!("Failed to serialize audit entry: {}", e))?;
    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&audit_path)
        .map_err(|e| format!("Failed to open audit log: {}", e))?;
    writeln!(file, "{}", line).map_err(|e| format!("Failed to write audit log: {}", e))?;
    Ok(())
}
