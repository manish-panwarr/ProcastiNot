// userId -> Set of socketIds (supports multiple tabs per user)
const onlineUsers = new Map();

// Helper: get ALL socket IDs for a given userId
function getSocketsForUser(userId) {
    return onlineUsers.get(String(userId)) || new Set();
}

// Helper: emit to all sockets of a user (via their room, simplest approach)
// We use Socket.io "rooms" — each user joins a room named after their userId.
// So io.to(userId) already hits all their tabs. The Map is kept for quick "is online?" checks.

module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id, "| transport:", socket.conn.transport.name);

        // Keep-alive: respond to client pings
        socket.on("ping_server", () => {
            socket.emit("pong_server");
        });

        // --- PRESENCE SYSTEM ---
        socket.on("register_user", (userId) => {
            if (!userId) {
                console.warn("register_user called with invalid userId:", userId);
                return;
            }
            const userIdStr = String(userId);

            // Track userId -> Set<socketId>
            if (!onlineUsers.has(userIdStr)) {
                onlineUsers.set(userIdStr, new Set());
            }
            onlineUsers.get(userIdStr).add(socket.id);

            // Attach userId to socket for easy disconnect lookup
            socket._userId = userIdStr;

            // Join user-specific room (enables io.to(userId) broadcasting)
            socket.join(userIdStr);

            console.log(`User registered: ${userIdStr} -> ${socket.id} | total online: ${onlineUsers.size}`);
            io.emit("get_online_users", Array.from(onlineUsers.keys()));
        });

        socket.on("disconnect", () => {
            const userIdStr = socket._userId;
            if (userIdStr && onlineUsers.has(userIdStr)) {
                const sockets = onlineUsers.get(userIdStr);
                sockets.delete(socket.id);

                // Only mark as offline when ALL tabs are disconnected
                if (sockets.size === 0) {
                    onlineUsers.delete(userIdStr);
                    console.log(`User fully offline: ${userIdStr}`);
                    io.emit("get_online_users", Array.from(onlineUsers.keys()));
                } else {
                    console.log(`User ${userIdStr} lost a tab, still has ${sockets.size} active`);
                }
            }
        });

        // --- 1-ON-1 CHAT ---
        socket.on("send_message", (message) => {
            const { recipientId } = message;
            const targetRoom = String(recipientId);

            // Deliver to ALL tabs of the recipient via room
            io.to(targetRoom).emit("receive_message", message);

            // Delivery receipt
            io.to(targetRoom).emit("message_delivered", {
                messageId: message._id,
                conversationId: message.conversationId
            });
        });

        // --- GROUP CHAT ---
        socket.on("join_group", (conversationId) => {
            socket.join(`group:${conversationId}`);
        });

        socket.on("leave_group", (conversationId) => {
            socket.leave(`group:${conversationId}`);
        });

        socket.on("send_group_message", (message) => {
            io.to(`group:${message.conversationId}`).emit("receive_group_message", message);
        });

        // --- TYPING INDICATOR ---
        socket.on("typing", ({ recipientId, isTyping }) => {
            const targetRoom = String(recipientId);
            const senderId = socket._userId;

            io.to(targetRoom).emit("user_typing", { senderId, isTyping });
        });

        // --- MESSAGE STATUS ---
        socket.on("mark_delivered", ({ messageId, senderId }) => {
            io.to(String(senderId)).emit("message_status_update", {
                messageId,
                status: "delivered"
            });
        });

        socket.on("mark_seen", ({ conversationId, senderId }) => {
            io.to(String(senderId)).emit("messages_seen", { conversationId });
        });

        // --- MESSAGE DELETION NOTIFICATIONS ---
        socket.on("message_deleted_event", ({ conversationId, messageId, type, recipientId }) => {
            io.to(String(recipientId)).emit("message_deleted", { conversationId, messageId, type });
        });

        socket.on("chat_cleared_event", ({ conversationId, recipientId }) => {
            io.to(String(recipientId)).emit("chat_cleared", { conversationId });
        });

        // --- P2P WEBRTC SIGNALING ---
        // Route WebRTC signals between peers via user rooms
        socket.on("p2p_signal", (data) => {
            const { to, signal, from } = data;
            const toStr = String(to);
            const fromStr = String(from);

            // Use room-based delivery so multi-tab users all get the signal
            const isRecipientOnline = onlineUsers.has(toStr);
            if (isRecipientOnline) {
                io.to(toStr).emit("p2p_signal", { signal, from: fromStr });
            } else {
                // Notify sender that target is offline
                socket.emit("p2p_unavailable", { userId: toStr });
            }
        });

        // --- P2P AUTHORIZATION FLOW ---
        socket.on("request_p2p", ({ recipientId, senderId, senderName }) => {
            io.to(String(recipientId)).emit("p2p_request", { senderId, senderName });
        });

        socket.on("accept_p2p", ({ senderId }) => {
            io.to(String(senderId)).emit("p2p_accepted");
        });

        socket.on("reject_p2p", ({ senderId }) => {
            io.to(String(senderId)).emit("p2p_rejected");
        });

        socket.on("cancel_p2p", ({ recipientId }) => {
            io.to(String(recipientId)).emit("p2p_cancelled");
        });

        // --- LEGACY FILE TRANSFER SIGNALING (kept for backward compat) ---
        socket.on("file_transfer_offer", ({ recipientId, offer, fileName, fileSize, fileType, transferId }) => {
            const senderId = socket._userId;
            io.to(String(recipientId)).emit("file_transfer_offer", {
                offer, fileName, fileSize, fileType, transferId, fromUserId: senderId
            });
        });

        socket.on("file_transfer_answer", ({ senderId, answer, transferId }) => {
            io.to(String(senderId)).emit("file_transfer_answer", { answer, transferId });
        });

        socket.on("file_transfer_ice_candidate", ({ targetUserId, candidate, transferId }) => {
            io.to(String(targetUserId)).emit("file_transfer_ice_candidate", { candidate, transferId });
        });

        socket.on("file_transfer_rejected", ({ senderId, transferId }) => {
            io.to(String(senderId)).emit("file_transfer_rejected", { transferId });
        });

        socket.on("file_transfer_complete", ({ recipientId, transferId, fileName, fileType, fileSize }) => {
            io.to(String(recipientId)).emit("file_transfer_complete", {
                transferId, fileName, fileType, fileSize
            });
        });
    });
};
