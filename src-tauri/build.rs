fn main() {
    tauri_build::build();

    // On iOS, the Swift symbols (HealthKitBridge.swift) don't exist yet when
    // Cargo links the dylib — Xcode resolves them at the final app link step.
    // `-undefined dynamic_lookup` defers those unresolved symbols so the build
    // succeeds, and Xcode provides them when it links the full iOS target.
    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    if target_os == "ios" {
        println!("cargo:rustc-cdylib-link-arg=-undefined");
        println!("cargo:rustc-cdylib-link-arg=dynamic_lookup");
        println!("cargo:rustc-link-lib=framework=HealthKit");
    }
}
