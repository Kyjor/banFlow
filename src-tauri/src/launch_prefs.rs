use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LaunchPrefs {
    pub prefer_x11: bool,
}

pub fn config_file_path() -> PathBuf {
    let base = std::env::var("XDG_CONFIG_HOME")
        .ok()
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var("HOME")
                .ok()
                .map(|home| PathBuf::from(home).join(".config"))
        })
        .unwrap_or_else(|| PathBuf::from(".config"));
    base.join("banFlow").join("launch.json")
}

pub fn load_launch_prefs() -> LaunchPrefs {
    let path = config_file_path();
    match fs::read_to_string(path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => LaunchPrefs::default(),
    }
}

pub fn save_launch_prefs(prefs: &LaunchPrefs) -> Result<(), String> {
    let path = config_file_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(prefs).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

/// Must run before `tauri::Builder` so GDK picks the backend on Linux.
pub fn apply_launch_prefs() {
    #[cfg(target_os = "linux")]
    {
        let prefs = load_launch_prefs();
        if prefs.prefer_x11 {
            std::env::set_var("GDK_BACKEND", "x11");
        } else {
            std::env::remove_var("GDK_BACKEND");
        }
    }
}

#[tauri::command]
pub fn utils_get_launch_prefs() -> LaunchPrefs {
    load_launch_prefs()
}

#[tauri::command]
pub fn utils_save_launch_prefs(prefer_x11: bool) -> Result<(), String> {
    save_launch_prefs(&LaunchPrefs { prefer_x11 })
}

#[tauri::command]
pub async fn utils_restart_app(app: tauri::AppHandle) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let prefs = load_launch_prefs();
    let mut cmd = std::process::Command::new(exe);
    cmd.args(std::env::args().skip(1));

    #[cfg(target_os = "linux")]
    if prefs.prefer_x11 {
        cmd.env("GDK_BACKEND", "x11");
    }

    cmd.spawn()
        .map_err(|e| format!("Failed to restart application: {}", e))?;
    app.exit(0);
    #[allow(unreachable_code)]
    Ok(())
}
