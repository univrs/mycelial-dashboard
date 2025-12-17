//! WebSocket connection handling
//!
//! This module handles WebSocket connections from dashboard clients,
//! including support for economics protocol messages.

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use std::sync::Arc;
use tracing::{info, warn, error};
use uuid::Uuid;

use crate::AppState;
use super::messages::{WsMessage, ClientMessage, PeerListEntry};
use mycelial_protocol::{
    topics,
    VouchMessage, VouchRequest, VouchAck as ProtocolVouchAck,
    CreditMessage, CreateCreditLine as ProtocolCreateCreditLine, CreditTransfer as ProtocolCreditTransfer,
    GovernanceMessage, CreateProposal as ProtocolCreateProposal, CastVote as ProtocolCastVote, Vote,
    ResourceMessage, ResourceContribution as ProtocolResourceContribution, ResourceType,
};

/// Handle WebSocket upgrade
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

/// Handle individual WebSocket connection
async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    info!("New WebSocket connection established");
    let (mut sender, mut receiver) = socket.split();

    // Subscribe to broadcast events
    let mut event_rx = state.event_tx.subscribe();

    // Send initial peer list
    match state.store.list_peers().await {
        Ok(peers) => {
            let entries: Vec<PeerListEntry> = peers.into_iter().map(Into::into).collect();
            let init_msg = WsMessage::PeersList { peers: entries };
            if let Ok(json) = serde_json::to_string(&init_msg) {
                let _ = sender.send(Message::Text(json.into())).await;
            }
        }
        Err(e) => {
            warn!("Failed to get initial peer list: {}", e);
        }
    }

    // Spawn task to forward broadcast events to this client
    let mut send_task = tokio::spawn(async move {
        while let Ok(event) = event_rx.recv().await {
            if let Ok(json) = serde_json::to_string(&event) {
                if sender.send(Message::Text(json.into())).await.is_err() {
                    break;
                }
            }
        }
    });

    // Handle incoming messages from client
    let state_clone = state.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    info!("Received WebSocket text: {}", text);
                    match serde_json::from_str::<ClientMessage>(&text) {
                        Ok(client_msg) => {
                            handle_client_message(client_msg, &state_clone).await;
                        }
                        Err(e) => {
                            warn!("Failed to parse client message: {} - raw: {}", e, text);
                        }
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = &mut send_task => recv_task.abort(),
        _ = &mut recv_task => send_task.abort(),
    }

    info!("WebSocket connection closed");
}

/// Handle messages from the client
async fn handle_client_message(msg: ClientMessage, state: &AppState) {
    info!("Received client message: {:?}", msg);

    match msg {
        ClientMessage::SendChat { content, to } => {
            info!("SendChat: content='{}', to={:?}", content, to);

            // Generate message ID and timestamp for local echo
            let message_id = Uuid::new_v4().to_string();
            let timestamp = chrono::Utc::now().timestamp_millis();

            // Create chat message using core Message type
            let chat_msg = mycelial_core::message::Message::new(
                mycelial_core::message::MessageType::Content,
                state.local_peer_id.clone(),
                content.as_bytes().to_vec(),
            );

            // Serialize and publish to network
            match serde_json::to_vec(&chat_msg) {
                Ok(data) => {
                    let topic = if to.is_some() {
                        "/mycelial/1.0.0/direct"
                    } else {
                        "/mycelial/1.0.0/chat"
                    };

                    info!("Publishing to topic: {}", topic);

                    if let Err(e) = state.network.publish(topic, data).await {
                        error!("Failed to publish chat: {}", e);
                    } else {
                        info!("Chat message published successfully");

                        // LOCAL ECHO: Send the message back to the sender immediately
                        // Gossipsub doesn't deliver messages back to the sender, so we
                        // need to broadcast to all WebSocket clients including the sender
                        let echo_msg = WsMessage::ChatMessage {
                            id: message_id,
                            from: state.local_peer_id.to_string(),
                            from_name: state.node_name.clone(),
                            to: to.clone(),
                            content: content.clone(),
                            timestamp,
                        };

                        if let Err(e) = state.event_tx.send(echo_msg) {
                            error!("Failed to broadcast local echo: {}", e);
                        } else {
                            info!("Local echo sent to WebSocket clients");
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to serialize chat message: {}", e);
                }
            }
        }

        ClientMessage::GetPeers => {
            // Peer list is sent on connect, but can be requested again
            if let Ok(peers) = state.store.list_peers().await {
                let entries: Vec<PeerListEntry> = peers.into_iter().map(Into::into).collect();
                let msg = WsMessage::PeersList { peers: entries };
                let _ = state.event_tx.send(msg);
            }
        }

        ClientMessage::GetStats => {
            let stats = WsMessage::Stats {
                peer_count: state.store.list_peers().await.map(|p| p.len()).unwrap_or(0),
                message_count: state.message_count.load(std::sync::atomic::Ordering::Relaxed),
                uptime_seconds: state.start_time.elapsed().as_secs(),
            };
            let _ = state.event_tx.send(stats);
        }

        ClientMessage::Subscribe { topic } => {
            if let Err(e) = state.network.subscribe(&topic).await {
                error!("Failed to subscribe to topic {}: {}", topic, e);
            }
        }

        // ============ Economics Protocol Handlers ============

        ClientMessage::SendVouch { vouchee, weight, message } => {
            info!("SendVouch: vouchee='{}', weight={}", vouchee, weight);

            let timestamp = chrono::Utc::now().timestamp_millis();

            // Create vouch request message (uses stake, not weight)
            let mut vouch_req = VouchRequest::new(
                state.local_peer_id.to_string(),
                vouchee.clone(),
                weight, // VouchRequest calls this 'stake'
            );
            if let Some(msg) = message {
                vouch_req = vouch_req.with_message(msg);
            }
            let request_id = vouch_req.id.to_string();
            let vouch_msg = VouchMessage::VouchRequest(vouch_req);

            // Serialize and publish to network
            match serde_json::to_vec(&vouch_msg) {
                Ok(data) => {
                    if let Err(e) = state.network.publish(topics::VOUCH, data).await {
                        error!("Failed to publish vouch request: {}", e);
                    } else {
                        info!("Vouch request published successfully");

                        // Local echo for the sender
                        let echo_msg = WsMessage::VouchRequest {
                            id: request_id,
                            voucher: state.local_peer_id.to_string(),
                            vouchee,
                            weight,
                            timestamp,
                        };
                        let _ = state.event_tx.send(echo_msg);
                    }
                }
                Err(e) => {
                    error!("Failed to serialize vouch request: {}", e);
                }
            }
        }

        ClientMessage::RespondVouch { request_id, accept } => {
            info!("RespondVouch: request_id='{}', accept={}", request_id, accept);

            let timestamp = chrono::Utc::now().timestamp_millis();

            // Parse request_id as UUID
            let vouch_id = match Uuid::parse_str(&request_id) {
                Ok(id) => id,
                Err(e) => {
                    error!("Invalid vouch request ID: {}", e);
                    return;
                }
            };

            // Create vouch ack message with correct fields
            let ack_msg = VouchMessage::VouchAck(ProtocolVouchAck {
                vouch_id,
                from: state.local_peer_id.to_string(),
                accepted: accept,
                reason: None,
                timestamp: chrono::Utc::now(),
            });

            match serde_json::to_vec(&ack_msg) {
                Ok(data) => {
                    if let Err(e) = state.network.publish(topics::VOUCH, data).await {
                        error!("Failed to publish vouch ack: {}", e);
                    } else {
                        let echo_msg = WsMessage::VouchAck {
                            id: Uuid::new_v4().to_string(),
                            request_id,
                            accepted: accept,
                            new_reputation: None,
                            timestamp,
                        };
                        let _ = state.event_tx.send(echo_msg);
                    }
                }
                Err(e) => {
                    error!("Failed to serialize vouch ack: {}", e);
                }
            }
        }

        ClientMessage::CreateCreditLine { debtor, limit } => {
            info!("CreateCreditLine: debtor='{}', limit={}", debtor, limit);

            let timestamp = chrono::Utc::now().timestamp_millis();

            let credit_msg = CreditMessage::CreateLine(ProtocolCreateCreditLine::new(
                state.local_peer_id.to_string(),
                debtor.clone(),
                limit,
            ));

            match serde_json::to_vec(&credit_msg) {
                Ok(data) => {
                    if let Err(e) = state.network.publish(topics::CREDIT, data).await {
                        error!("Failed to publish credit line: {}", e);
                    } else {
                        let echo_msg = WsMessage::CreditLine {
                            id: Uuid::new_v4().to_string(),
                            creditor: state.local_peer_id.to_string(),
                            debtor,
                            limit,
                            balance: 0.0,
                            timestamp,
                        };
                        let _ = state.event_tx.send(echo_msg);
                    }
                }
                Err(e) => {
                    error!("Failed to serialize credit line: {}", e);
                }
            }
        }

        ClientMessage::TransferCredit { to, amount, memo } => {
            info!("TransferCredit: to='{}', amount={}", to, amount);

            let timestamp = chrono::Utc::now().timestamp_millis();

            // For transfers, we use a placeholder line_id - in practice, the client should
            // provide the actual credit line ID they want to use for the transfer
            let line_id = Uuid::new_v4(); // Placeholder - real impl would look up active credit line
            let mut transfer = ProtocolCreditTransfer::new(
                line_id,
                state.local_peer_id.to_string(),
                to.clone(),
                amount,
            );
            if let Some(ref m) = memo {
                transfer = transfer.with_memo(m);
            }
            let transfer_msg = CreditMessage::Transfer(transfer);

            match serde_json::to_vec(&transfer_msg) {
                Ok(data) => {
                    if let Err(e) = state.network.publish(topics::CREDIT, data).await {
                        error!("Failed to publish credit transfer: {}", e);
                    } else {
                        let echo_msg = WsMessage::CreditTransfer {
                            id: Uuid::new_v4().to_string(),
                            from: state.local_peer_id.to_string(),
                            to,
                            amount,
                            memo,
                            timestamp,
                        };
                        let _ = state.event_tx.send(echo_msg);
                    }
                }
                Err(e) => {
                    error!("Failed to serialize credit transfer: {}", e);
                }
            }
        }

        ClientMessage::CreateProposal { title, description, proposal_type } => {
            info!("CreateProposal: title='{}'", title);

            let timestamp = chrono::Utc::now().timestamp_millis();

            let proposal_msg = GovernanceMessage::CreateProposal(ProtocolCreateProposal::new(
                state.local_peer_id.to_string(),
                title.clone(),
                description.clone(),
            ));

            match serde_json::to_vec(&proposal_msg) {
                Ok(data) => {
                    if let Err(e) = state.network.publish(topics::GOVERNANCE, data).await {
                        error!("Failed to publish proposal: {}", e);
                    } else {
                        let echo_msg = WsMessage::Proposal {
                            id: Uuid::new_v4().to_string(),
                            proposer: state.local_peer_id.to_string(),
                            title,
                            description,
                            proposal_type,
                            status: "active".to_string(),
                            yes_votes: 0,
                            no_votes: 0,
                            quorum: 3,
                            deadline: timestamp + 86400000, // 24 hours
                            timestamp,
                        };
                        let _ = state.event_tx.send(echo_msg);
                    }
                }
                Err(e) => {
                    error!("Failed to serialize proposal: {}", e);
                }
            }
        }

        ClientMessage::CastVote { proposal_id, vote } => {
            info!("CastVote: proposal_id='{}', vote='{}'", proposal_id, vote);

            let timestamp = chrono::Utc::now().timestamp_millis();

            // Parse proposal_id as UUID
            let prop_uuid = match Uuid::parse_str(&proposal_id) {
                Ok(id) => id,
                Err(e) => {
                    error!("Invalid proposal ID: {}", e);
                    return;
                }
            };

            let vote_enum = match vote.as_str() {
                "yes" => Vote::For,
                "no" => Vote::Against,
                _ => Vote::Abstain,
            };

            // CastVote::new takes (proposal_id: Uuid, voter, vote, weight)
            let vote_msg = GovernanceMessage::CastVote(ProtocolCastVote::new(
                prop_uuid,
                state.local_peer_id.to_string(),
                vote_enum,
                1.0, // Default weight, could be based on reputation
            ));

            match serde_json::to_vec(&vote_msg) {
                Ok(data) => {
                    if let Err(e) = state.network.publish(topics::GOVERNANCE, data).await {
                        error!("Failed to publish vote: {}", e);
                    } else {
                        let echo_msg = WsMessage::VoteCast {
                            id: Uuid::new_v4().to_string(),
                            proposal_id,
                            voter: state.local_peer_id.to_string(),
                            vote,
                            weight: 1.0,
                            timestamp,
                        };
                        let _ = state.event_tx.send(echo_msg);
                    }
                }
                Err(e) => {
                    error!("Failed to serialize vote: {}", e);
                }
            }
        }

        ClientMessage::ReportResource { resource_type, amount, unit } => {
            info!("ReportResource: type='{}', amount={}", resource_type, amount);

            let timestamp = chrono::Utc::now().timestamp_millis();

            let res_type = match resource_type.as_str() {
                "bandwidth" => ResourceType::Bandwidth,
                "storage" => ResourceType::Storage,
                "compute" => ResourceType::Compute,
                _ => ResourceType::Other(resource_type.clone()),
            };

            let resource_msg = ResourceMessage::Contribution(ProtocolResourceContribution::new(
                state.local_peer_id.to_string(),
                res_type,
                amount,
                unit.clone(),
            ));

            match serde_json::to_vec(&resource_msg) {
                Ok(data) => {
                    if let Err(e) = state.network.publish(topics::RESOURCE, data).await {
                        error!("Failed to publish resource contribution: {}", e);
                    } else {
                        let echo_msg = WsMessage::ResourceContribution {
                            id: Uuid::new_v4().to_string(),
                            peer_id: state.local_peer_id.to_string(),
                            resource_type,
                            amount,
                            unit,
                            timestamp,
                        };
                        let _ = state.event_tx.send(echo_msg);
                    }
                }
                Err(e) => {
                    error!("Failed to serialize resource contribution: {}", e);
                }
            }
        }
    }
}
