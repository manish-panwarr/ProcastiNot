import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import Peer from "simple-peer";
import { useSocket } from "./SocketContext";
import { UserContext } from "./userContext";

const WebRTCContext = createContext();
export const useWebRTC = () => useContext(WebRTCContext);

// Chunking constants
const CHUNK_SIZE = 16 * 1024; // 16 KB per chunk

function splitBase64(b64, size) {
    const chunks = [];
    for (let i = 0; i < b64.length; i += size) chunks.push(b64.slice(i, i + size));
    return chunks;
}

export const WebRTCProvider = ({ children }) => {
    const { socket, onlineUsers } = useSocket();
    const { user } = useContext(UserContext);

    const socketRef = useRef(socket);
    const userRef = useRef(user);
    const peersRef = useRef({});
    const assemblyRef = useRef({});

    const [p2pMessages, setP2pMessages] = useState({});

    useEffect(() => { socketRef.current = socket; }, [socket]);
    useEffect(() => { userRef.current = user; }, [user]);

    // Add to local state
    const addMessage = useCallback((peerUserId, msg) => {
        const id = String(peerUserId);
        setP2pMessages(prev => ({
            ...prev,
            [id]: [...(prev[id] || []), msg],
        }));
    }, []);

    const clearP2PMessages = useCallback((peerUserId) => {
        const id = String(peerUserId);
        setP2pMessages(prev => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
    }, []);

    // Force-destroy a peer (safe to call even if already destroyed)
    const destroyPeer = useCallback((targetId) => {
        const id = String(targetId);
        if (peersRef.current[id]) {
            try { peersRef.current[id].destroy(); } catch (_) { }
            delete peersRef.current[id];
        }
        delete assemblyRef.current[id];
    }, []);

    // Create (or return existing live) peer
    const createPeer = useCallback((targetId, isInitiator) => {
        const id = String(targetId);

        // If existing peer is alive and connected, return it
        const existing = peersRef.current[id];
        if (existing && !existing.destroyed && existing.connected) {
            return existing;
        }

        // Clean up stale peer before creating a new one
        if (existing) {
            try { existing.destroy(); } catch (_) { }
            delete peersRef.current[id];
        }

        const peer = new Peer({
            initiator: isInitiator,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    {
                        urls: "turn:openrelay.metered.ca:80",
                        username: "openrelayproject",
                        credential: "openrelayproject"
                    },
                    {
                        urls: "turn:openrelay.metered.ca:443",
                        username: "openrelayproject",
                        credential: "openrelayproject"
                    },
                    {
                        urls: "turn:openrelay.metered.ca:443?transport=tcp",
                        username: "openrelayproject",
                        credential: "openrelayproject"
                    },
                ],
            },
        });

        peer.on('signal', (signal) => {
            const sock = socketRef.current;
            const meStr = String(userRef.current?._id || '');
            const targetStr = String(id);
            if (sock && meStr && meStr !== "undefined" && sock.connected) {
                sock.emit('p2p_signal', { to: targetStr, from: meStr, signal });
            }
        });

        peer.on('connect', () => {
            console.log(`P2P connected with ${id}`);
        });

        // Receive data with chunk reassembly
        peer.on('data', (rawData) => {
            let parsed;
            try { parsed = JSON.parse(rawData.toString()); } catch { return; }

            if (parsed.type === 'chunk') {
                const { msgId, index, total, data, meta } = parsed;
                if (!assemblyRef.current[id]) assemblyRef.current[id] = {};
                const bin = assemblyRef.current[id];
                if (!bin[msgId]) bin[msgId] = { chunks: [], total, meta };
                bin[msgId].chunks[index] = data;

                const received = bin[msgId].chunks.filter(Boolean).length;
                if (received === total) {
                    const complete = bin[msgId].chunks.join('');
                    delete bin[msgId];
                    setTimeout(() => {
                        addMessage(id, {
                            id: msgId,
                            senderId: id,
                            timestamp: new Date().toISOString(),
                            file: { ...meta, data: complete },
                            isP2P: true,
                        });
                    }, 10);
                }
            } else if (parsed.type === 'message') {
                addMessage(id, { ...parsed, isP2P: true });
            }
        });

        peer.on('error', (err) => {
            console.error(`P2P error with ${id}:`, err.message);
            destroyPeer(id);
        });

        peer.on('close', () => {
            console.log(`P2P closed with ${id}`);
            destroyPeer(id);
        });

        peersRef.current[id] = peer;
        return peer;
    }, [addMessage, destroyPeer]);

    // Handle incoming WebRTC signals from the server
    useEffect(() => {
        if (!socket || !user) return;

        const onSignal = ({ signal, from }) => {
            const fromStr = String(from);
            let peer = peersRef.current[fromStr];

            // Always create a fresh non-initiator peer if the existing one is dead
            if (!peer || peer.destroyed) {
                peer = createPeer(fromStr, false);
            }

            try {
                peer.signal(signal);
            } catch (e) {
                console.error('p2p signal err — recreating peer', e);
                // Destroy stale peer and retry with fresh one
                destroyPeer(fromStr);
                try {
                    const freshPeer = createPeer(fromStr, false);
                    freshPeer.signal(signal);
                } catch (e2) {
                    console.error('p2p signal retry failed', e2);
                }
            }
        };

        const onUnavailable = ({ userId }) => {
            console.warn(`P2P peer ${userId} unavailable`);
            destroyPeer(userId);
        };

        socket.on('p2p_signal', onSignal);
        socket.on('p2p_unavailable', onUnavailable);

        return () => {
            socket.off('p2p_signal', onSignal);
            socket.off('p2p_unavailable', onUnavailable);
        };
    }, [socket, user, createPeer, destroyPeer]);

    // Send P2P text message or file
    const sendP2PMessage = useCallback(async (targetId, text, file = null) => {
        targetId = String(targetId);

        // Proper online check using String() comparison
        const isOnline = Array.isArray(onlineUsers) && onlineUsers.some(uid => String(uid) === targetId);
        const hasPeer = !!(peersRef.current[targetId] && !peersRef.current[targetId].destroyed);

        if (!isOnline && !hasPeer) {
            throw new Error('User is offline. Cannot use P2P mode.');
        }

        let peer = peersRef.current[targetId];
        if (!peer || peer.destroyed) {
            peer = createPeer(targetId, true);
        }

        // Wait for DataChannel to be fully open
        if (!peer.connected) {
            await new Promise((resolve, reject) => {
                const onConnect = () => { cleanup(); setTimeout(resolve, 100); };
                const onErr = (e) => { cleanup(); reject(new Error(`P2P connection failed: ${e.message}`)); };
                const cleanup = () => {
                    peer.off('connect', onConnect);
                    peer.off('error', onErr);
                    clearTimeout(timer);
                };
                peer.on('connect', onConnect);
                peer.on('error', onErr);
                // 45 second timeout — accounts for TURN relay + Render cold starts
                const timer = setTimeout(() => {
                    cleanup();
                    reject(new Error('P2P timed out. Please try again or disable P2P mode.'));
                }, 45000);
            });
        }

        const msgId = Date.now().toString();
        const senderId = userRef.current?._id;
        const timestamp = new Date().toISOString();

        if (file) {
            // Convert file to base64, then send in 16KB chunks over DataChannel
            const base64 = await new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = () => res(r.result);
                r.onerror = () => rej(new Error('FileReader error'));
                r.readAsDataURL(file);
            });

            const meta = { name: file.name, type: file.type, size: file.size };
            const chunks = splitBase64(base64, CHUNK_SIZE);
            const total = chunks.length;

            for (let index = 0; index < total; index++) {
                if (peer.destroyed) throw new Error('P2P connection lost during file transfer');
                peer.send(JSON.stringify({ type: 'chunk', msgId, index, total, data: chunks[index], meta }));
                // Throttle every 10 chunks to avoid overwhelming the DataChannel buffer
                if (index % 10 === 0) {
                    await new Promise(r => setTimeout(r, 10));
                }
            }

            // Also show the file locally for the sender
            addMessage(targetId, {
                id: msgId, senderId, timestamp,
                file: { ...meta, data: base64 },
                isP2P: true,
            });

        } else if (text?.trim()) {
            if (peer.destroyed) throw new Error('P2P connection lost');
            const payload = { type: 'message', id: msgId, senderId, timestamp, text: text.trim() };
            peer.send(JSON.stringify(payload));
            addMessage(targetId, { ...payload, isP2P: true });
        }
    }, [onlineUsers, createPeer, addMessage]);

    return (
        <WebRTCContext.Provider value={{ sendP2PMessage, p2pMessages, clearP2PMessages, destroyPeer }}>
            {children}
        </WebRTCContext.Provider>
    );
};
