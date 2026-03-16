const onlineUsers = new Map(); // userId -> socketId

module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        // --- PRESENCE SYSTEM ---
        socket.on("register_user", (userId) => {
            if (userId) {
                // Normalize userId to string for consistent lookups
                const userIdStr = String(userId);
                onlineUsers.set(userIdStr, socket.id);
                socket.join(userIdStr); // Join a room specifically for this user
                console.log(`User registered: ${userIdStr} -> ${socket.id}`);
                console.log(`Total online users: ${onlineUsers.size}`);
                io.emit("get_online_users", Array.from(onlineUsers.keys()));
            } else {
                console.warn(`register_user called with invalid userId:`, userId);
            }
        });

        socket.on("disconnect", () => {
            let disconnectedUserId;
            for (const [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    disconnectedUserId = userId;
                    onlineUsers.delete(userId);
                    break;
                }
            }
            if (disconnectedUserId) {
                console.log(`User disconnected: ${disconnectedUserId}`);
                io.emit("get_online_users", Array.from(onlineUsers.keys()));
            }
        });

        // 1-ON-1 CHAT 
        socket.on("send_message", (message) => {
            const { recipientId } = message;
            const recipientSocketId = onlineUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("receive_message", message);
                io.to(recipientSocketId).emit("message_delivered", {
                    messageId: message._id,
                    conversationId: message.conversationId
                });
            }
        });

        socket.on("join_group", (conversationId) => {
            socket.join(`group:${conversationId}`);
        });

        socket.on("leave_group", (conversationId) => {
            socket.leave(`group:${conversationId}`);
        });

        socket.on("send_group_message", (message) => {
            io.to(`group:${message.conversationId}`).emit("receive_group_message", message);
        });

        socket.on("typing", ({ recipientId, isTyping }) => {
            const recipientSocketId = onlineUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("user_typing", {
                    senderId: Array.from(onlineUsers.entries()).find(([k, v]) => v === socket.id)?.[0],
                    isTyping
                });
            }
        });

        //  MESSAGE STATUS kya hai ?
        socket.on("mark_delivered", ({ messageId, senderId }) => {
            const senderSocketId = onlineUsers.get(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("message_status_update", {
                    messageId,
                    status: "delivered"
                });
            }
        });

        socket.on("mark_seen", ({ conversationId, senderId }) => {
            const senderSocketId = onlineUsers.get(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("messages_seen", { conversationId });
            }
        });

        //  WEBRTC FILE TRANSFER SIGNALING 

        // Step 1: Sender offers a file transfer to recipient
        socket.on("file_transfer_offer", ({ recipientId, offer, fileName, fileSize, fileType, transferId }) => {
            const recipientSocketId = onlineUsers.get(recipientId);
            const senderId = Array.from(onlineUsers.entries()).find(([k, v]) => v === socket.id)?.[0];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("file_transfer_offer", {
                    offer,
                    fileName,
                    fileSize,
                    fileType,
                    transferId,
                    fromUserId: senderId
                });
            } else {
                socket.emit("file_transfer_error", { transferId, error: "Recipient is offline" });
            }
        });

        // Step 2: Recipient answers the offer
        socket.on("file_transfer_answer", ({ senderId, answer, transferId }) => {
            const senderSocketId = onlineUsers.get(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("file_transfer_answer", { answer, transferId });
            }
        });

        // Step 3: ICE candidate exchange (both directions)
        socket.on("file_transfer_ice_candidate", ({ targetUserId, candidate, transferId }) => {
            const targetSocketId = onlineUsers.get(targetUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit("file_transfer_ice_candidate", { candidate, transferId });
            }
        });

        // Step 4: Recipient rejects transfer
        socket.on("file_transfer_rejected", ({ senderId, transferId }) => {
            const senderSocketId = onlineUsers.get(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("file_transfer_rejected", { transferId });
            }
        });

        // Step 5: Transfer complete – notify both parties
        socket.on("file_transfer_complete", ({ recipientId, transferId, fileName, fileType, fileSize }) => {
            const recipientSocketId = onlineUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("file_transfer_complete", {
                    transferId, fileName, fileType, fileSize
                });
            }
        });

        //  MESSAGE DELETION NOTIFICATIONS 

        // Notify others about a deleted message
        socket.on("message_deleted_event", ({ conversationId, messageId, type, recipientId }) => {
            const recipientSocketId = onlineUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("message_deleted", { conversationId, messageId, type });
            }
        });

        // Notify about cleared conversation
        socket.on("chat_cleared_event", ({ conversationId, recipientId }) => {
            const recipientSocketId = onlineUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("chat_cleared", { conversationId });
            }
        });

        // P2P SIGNALING FOR TEXT/FILE (Unified) 
        socket.on("p2p_signal", (data) => {
            // dataPayload: { to, from, signal }
            const { to, signal, from } = data;
            const toStr = String(to);
            const fromStr = String(from);
            const targetSocketId = onlineUsers.get(toStr);
            if (targetSocketId) {
                io.to(targetSocketId).emit("p2p_signal", { signal, from: fromStr });
            } else {
                // Determine sender socket to notify failure
                const senderSocketId = onlineUsers.get(fromStr);
                if (senderSocketId) io.to(senderSocketId).emit("p2p_unavailable", { userId: toStr });
            }
        });

        //  P2P AUTHORIZATION FLOW 
        socket.on("request_p2p", ({ recipientId, senderId, senderName }) => {
            const recipientSocketId = onlineUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("p2p_request", { senderId, senderName });
            }
        });

        socket.on("accept_p2p", ({ senderId }) => {
            const senderSocketId = onlineUsers.get(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("p2p_accepted");
            }
        });

        socket.on("reject_p2p", ({ senderId }) => {
            const senderSocketId = onlineUsers.get(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("p2p_rejected");
            }
        });

        socket.on("cancel_p2p", ({ recipientId }) => {
            const recipientSocketId = onlineUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("p2p_cancelled");
            }
        });

    });
};
