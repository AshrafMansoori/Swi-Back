
import { authenticateSocket } from "./socket.auth.js";
import { handleSocketMessage } from "./socket.handlers.js";
import { Message } from "../models/message.model.js";

const onlineUsers = new Map();

export const setupWebSocket = (wss) => {

    wss.on("connection", async (socket, request) => {

        try {

            // Authenticate WebSocket connection
            const userId = authenticateSocket(request);

            // Store userId inside socket
            socket.userId = userId;

            // Add user to online users
            onlineUsers.set(userId, socket);

            console.log(
                `WebSocket authenticated: ${userId}`
            );

            console.log(
                `User ${userId} is online`
            );


            // Find all pending messages
            const pendingMessages = await Message.find({
                receiverId: userId,
                status: "sent"
            }).sort({
                createdAt: 1
            });


            // Send pending messages to receiver
            for (const message of pendingMessages) {

                socket.send(
                    JSON.stringify({

                        type: "private_message",

                        messageId: message._id,

                        senderId: message.senderId,

                        receiverId: message.receiverId,

                        message: message.message,

                        status: "delivered",

                        createdAt: message.createdAt

                    })
                );


                // Update message status in MongoDB
                await Message.findByIdAndUpdate(
                    message._id,
                    {
                        status: "delivered"
                    }
                );

            }


            console.log(
                `Pending messages delivered: ${pendingMessages.length}`
            );


        } catch (error) {

            console.log(
                "WebSocket authentication failed:",
                error.message
            );

            socket.close(
                1008,
                error.message
            );

            return;
        }


        // Handle incoming WebSocket messages
        socket.on("message", async (message) => {

            await handleSocketMessage(
                socket,
                message
            );

        });


        // Handle user disconnect
        socket.on("close", () => {

            // Remove socket only if it is
            // still the active socket of this user
            if (
                onlineUsers.get(socket.userId) === socket
            ) {

                onlineUsers.delete(
                    socket.userId
                );

            }

            console.log(
                `User ${socket.userId} is offline`
            );

        });

    });
};


// Get online user's WebSocket connection
export const getOnlineUser = (userId) => {

    return onlineUsers.get(
        userId.toString()
    );

};
