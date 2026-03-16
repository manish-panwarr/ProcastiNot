import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { useSocket } from "./SocketContext";
import { UserContext } from "./userContext";

const WebRTCContext = createContext();
export const useWebRTC = () => useContext(WebRTCContext);

//  chunking constants 
const CHUNK_SIZE = 16 * 1024; // 16 KB per chunk (safe for all browsers)

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

    //  add to local state 
    const addMessage = (peerUserId, msg) => {
        const id = String(peerUserId);
        setP2pMessages(prev => ({
            ...prev,
            [id]: [...(prev[id] || []), msg],
        }));
    };

    const clearP2PMessages = (peerUserId) => {
        const id = String(peerUserId);
        setP2pMessages(prev => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
    };

    //  peer lifecycle 
    const destroyPeer = (targetId) => {
        if (peersRef.current[targetId]) {
            try { peersRef.current[targetId].destroy(); } catch (_) { }
            delete peersRef.current[targetId];
        }
        delete assemblyRef.current[targetId];
    };

    const createPeer = (targetId, isInitiator) => {
        // destroy stale peer if destroyed
        const existing = peersRef.current[targetId];
        if (existing && !existing.destroyed) return existing;
        if (existing) delete peersRef.current[targetId];

        const peer = new Peer({
            initiator: isInitiator,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
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
                    // Fallback to a Twilio Network Traversal STUN/TURN if metered gets rate limited:
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ],
            },
        });

        peer.on('signal', (signal) => {
            const sock = socketRef.current;
            const meStr = String(userRef.current?._id);
            const targetStr = String(targetId);
            if (sock && meStr && meStr !== "undefined") {
                sock.emit('p2p_signal', { to: targetStr, from: meStr, signal });
            }
        });

        peer.on('connect', () => {
            console.log(`P2P connected with ${targetId}`);
        });

        //  receive data (with chunk reassembly)     
        peer.on('data', (rawData) => {
            let parsed;
            try { parsed = JSON.parse(rawData.toString()); } catch { return; }

            if (parsed.type === 'chunk') {
                // file chunk
                const { msgId, index, total, data, meta } = parsed;
                if (!assemblyRef.current[targetId]) assemblyRef.current[targetId] = {};
                const bin = assemblyRef.current[targetId];
                if (!bin[msgId]) bin[msgId] = { chunks: [], total, meta };
                bin[msgId].chunks[index] = data;

                // all chunks received?
                const received = bin[msgId].chunks.filter(Boolean).length;
                if (received === total) {
                    const complete = bin[msgId].chunks.join('');
                    delete bin[msgId];
                    // small delay to avoid UI freeze on large text processing
                    setTimeout(() => {
                        addMessage(targetId, {
                            id: msgId,
                            senderId: targetId,
                            timestamp: new Date().toISOString(),
                            file: { ...meta, data: complete },
                            isP2P: true,
                        });
                    }, 10);
                }
            } else if (parsed.type === 'message') {

                addMessage(targetId, { ...parsed, isP2P: true });
            }
        });

        peer.on('error', (err) => {
            console.error(`P2P error with ${targetId}:`, err.message);
            destroyPeer(targetId);
        });

        peer.on('close', () => {
            console.log(`P2P closed with ${targetId}`);
            destroyPeer(targetId);
        });

        peersRef.current[targetId] = peer;
        return peer;
    };

    //  incoming signals 
    useEffect(() => {
        if (!socket || !user) return;

        const onSignal = ({ signal, from }) => {
            const fromStr = String(from);
            let peer = peersRef.current[fromStr];
            if (!peer || peer.destroyed) {
                peer = createPeer(fromStr, false);
            }
            try { peer.signal(signal); } catch (e) { console.error('p2p signal err', e); }
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

    }, [socket, user]);

    //   send P2P message / file                  
    const sendP2PMessage = async (targetId, text, file = null) => {
        targetId = String(targetId);
        if (!onlineUsers.includes(targetId) && !peersRef.current[targetId]) {
            throw new Error('User is offline');
        }

        let peer = peersRef.current[targetId];
        if (!peer || peer.destroyed) {
            peer = createPeer(targetId, true);
        }

        // wait for connection
        if (!peer.connected) {
            await new Promise((resolve, reject) => {
                const onConnect = () => { off(); setTimeout(resolve, 200); }; // Wait 200ms to ensure DataChannel is fully open
                const onErr = (e) => { off(); reject(e); };
                const off = () => { peer.off('connect', onConnect); peer.off('error', onErr); };
                peer.on('connect', onConnect);
                peer.on('error', onErr);
                setTimeout(() => { off(); reject(new Error('P2P connection timed out')); }, 30000);
            });
        }

        const msgId = Date.now().toString();
        const senderId = userRef.current?._id;
        const timestamp = new Date().toISOString();

        if (file) {
            // convert to base64 then send in 16 KB chunks
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
                peer.send(JSON.stringify({ type: 'chunk', msgId, index, total, data: chunks[index], meta }));
                if (index % 10 === 0) {
                    await new Promise(r => setTimeout(r, 10));
                }
            }

            addMessage(targetId, {
                id: msgId, senderId, timestamp,
                file: { ...meta, data: base64 },
                isP2P: true,
            });

        } else if (text?.trim()) {
            const payload = { type: 'message', id: msgId, senderId, timestamp, text: text.trim() };
            peer.send(JSON.stringify(payload));
            addMessage(targetId, { ...payload, isP2P: true });
        }
    };

    return (
        <WebRTCContext.Provider value={{ sendP2PMessage, p2pMessages, clearP2PMessages }}>
            {children}
        </WebRTCContext.Provider>
    );
};
