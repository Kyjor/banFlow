use serde_json;
use tauri::{AppHandle, Manager, Emitter};
use crate::{AppState, get_project_dir};
use crate::models::TimerPreferences;
use crate::database::{load_project_database, save_project_database, get_collection_data, update_collection_data};

#[tauri::command]
pub async fn api_get_timer_preferences(
    project_name: String,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let db = load_project_database(&project_path)?;
    
    // Get timerPreferences collection (should have only one item with $loki: 1)
    let timer_prefs_data = get_collection_data(&db, "timerPreferences");
    
    if let Some(first_pref) = timer_prefs_data.first() {
        // Try to deserialize into typed struct
        if let Ok(prefs) = serde_json::from_value::<TimerPreferences>(first_pref.clone()) {
            Ok(serde_json::to_value(&prefs).unwrap())
        } else {
            // Fallback to returning raw JSON if deserialization fails
            Ok(first_pref.clone())
        }
    } else {
        // Return default preferences if none exist
        let default_prefs = TimerPreferences::default();
        Ok(serde_json::to_value(&default_prefs).unwrap())
    }
}

#[tauri::command]
pub async fn api_update_timer_preference_property(
    project_name: String,
    property_to_update: String,
    new_value: serde_json::Value,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    // Load project database
    let project_dir = get_project_dir(&app_handle)?;
    let project_path = project_dir.join(format!("{}.json", project_name));
    let mut db = load_project_database(&project_path)?;
    
    // Get timerPreferences collection
    let mut timer_prefs_data = get_collection_data(&db, "timerPreferences");
    
    // Find or create the preferences (should have $loki: 1)
    let mut updated_prefs: Option<TimerPreferences> = None;
    
    if let Some(pref_json) = timer_prefs_data.first_mut() {
        // Update the property
        pref_json[&property_to_update] = new_value.clone();
        
        // Deserialize to typed struct
        if let Ok(prefs) = serde_json::from_value::<TimerPreferences>(pref_json.clone()) {
            updated_prefs = Some(prefs.clone());
            // Update the JSON with the typed struct
            *pref_json = serde_json::to_value(&prefs).unwrap();
        }
    } else {
        // Create new preferences with default values
        let mut default_prefs = TimerPreferences::default();
        
        // Update the property
        let mut pref_json = serde_json::to_value(&default_prefs).unwrap();
        pref_json[&property_to_update] = new_value.clone();
        
        // Deserialize back to update the struct
        if let Ok(prefs) = serde_json::from_value::<TimerPreferences>(pref_json) {
            updated_prefs = Some(prefs.clone());
            timer_prefs_data.push(serde_json::to_value(&prefs).unwrap());
        }
    }
    
    // Update database
    update_collection_data(&mut db, "timerPreferences", timer_prefs_data.clone());
    save_project_database(&project_path, &db)?;
    
    // Return updated preferences
    if let Some(prefs) = updated_prefs {
        Ok(serde_json::to_value(&prefs).unwrap())
    } else {
        Err("Failed to update timer preferences".to_string())
    }
}
