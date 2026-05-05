use axum::{routing::post, Json, Router, extract::State};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use bs58;
use ed25519_dalek::{Signature as EdSignature, Verifier, VerifyingKey};

#[derive(Deserialize, Debug)]
struct McpRequest {
    method: String,
    params: Option<Value>,
    client_id: String,
    timestamp: u64,
    nonce: String,
    signature: String,
}

struct AppState {
    used_nonces: Mutex<HashSet<String>>,
}

#[tokio::main]
async fn main() {
    let shared_state = Arc::new(AppState {
        used_nonces: Mutex::new(HashSet::new()),
    });

    let app = Router::new()
        .route("/mcp", post(handle_mcp))
        .with_state(shared_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("==================================================");
    println!(" [MCP] NEURAL GATEWAY IGNITED");
    println!(" [PORT] 0.0.0.0:3000");
    println!("[SEC] Ed25519 Sig | Nonce-Replay | Timestamp-Lock");
    println!("==================================================");
    axum::serve(listener, app).await.unwrap();
}

async fn handle_mcp(
    State(state): State<Arc<AppState>>,
    Json(req): Json<McpRequest>,
) -> Json<Value> {
    // 1. TEMPORAL BOUNDARY (60 Second Window)
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    if req.timestamp > now + 60 || req.timestamp < now.saturating_sub(60) {
        println!("[REJECT] Temporal boundary violation: {}", req.timestamp);
        return Json(json!({"error": "Temporal boundary violation. Request expired."}));
    }

    // 2. KINETIC REPLAY PROTECTION (Nonce caching)
    {
        let mut nonces = state.used_nonces.lock().unwrap();
        if nonces.contains(&req.nonce) {
            println!("[REJECT] Replay attack detected. Nonce: {}", req.nonce);
            return Json(json!({"error": "Replay attack detected. Nonce already consumed."}));
        }
        nonces.insert(req.nonce.clone());
    }

    // 3. CRYPTOGRAPHIC VERIFICATION (Ed25519)
    let params_str = match &req.params {
        Some(p) => serde_json::to_string(p).unwrap_or_default(),
        None => "".to_string(),
    };
    let signable_payload = format!("{}|{}|{}|{}", req.method, params_str, req.timestamp, req.nonce);

    let pubkey_bytes = match bs58::decode(&req.client_id).into_vec() {
        Ok(b) if b.len() == 32 => b,
        _ => return Json(json!({"error": "Invalid client_id base58 format"})),
    };
    
    let pubkey = match VerifyingKey::from_bytes(pubkey_bytes.as_slice().try_into().unwrap()) {
        Ok(k) => k,
        Err(_) => return Json(json!({"error": "Invalid public key bounds"})),
    };

    let sig_bytes = match bs58::decode(&req.signature).into_vec() {
        Ok(b) if b.len() == 64 => b,
        _ => return Json(json!({"error": "Invalid signature base58 format"})),
    };
    
    let signature = match EdSignature::from_slice(&sig_bytes) {
        Ok(s) => s,
        Err(_) => return Json(json!({"error": "Invalid signature length"})),
    };

    if pubkey.verify(signable_payload.as_bytes(), &signature).is_err() {
        println!("[REJECT] Invalid signature from agent: {}", req.client_id);
        return Json(json!({"error": "Cryptographic signature rejected."}));
    }

    // 4. PAYLOAD ROUTING
    println!("[MCP] Authorized Agent ({}) executed: {}", req.client_id, req.method);
    
    match req.method.as_str() {
        "exergynet_open_job" => {
            Json(json!({"status": "proxy_initiated", "verified": true}))
        },
        "exergynet_settle_exergy" => {
            Json(json!({"status": "settlement_initiated", "verified": true}))
        },
        _ => Json(json!({"error": "Method not found on Neural Gateway"})),
    }
}
