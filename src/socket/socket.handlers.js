import mongoose from "mongoose";
import { getOnlineUser } from "./socket.server.js";
import { Message } from "../models/message.model.js";

export const handleSocketMessage = async (socket, message) => {

    try {

        const data = JSON.parse(
            message.toString()
        );

        console.log(
            "Received WebSocket data:",
            data
        );


        // ==============================
        // PING
        // ==============================

        if (data.type === "ping") {

            socket.send(
                JSON.stringify({

                    type: "pong",

                    message: "WebSocket is working"

                })
            );

            return;
        }


        // ==============================
        // PRIVATE MESSAGE
        // ==============================

        if (data.type === "private_message") {

            const {
                receiverId,
                message: messageText
            } = data;


            // Check receiver ID
            if (!receiverId) {

                socket.send(
                    JSON.stringify({

                        type: "error",

                        message: "Receiver ID is required"

                    })
                );

                return;
            }


            // Validate MongoDB ObjectId
            if (
                !mongoose.Types.ObjectId.isValid(
                    receiverId
                )
            ) {

                socket.send(
                    JSON.stringify({

                        type: "error",

                        message: "Invalid receiver ID"

                    })
                );

                return;
            }


            // Validate message
            if (
                typeof messageText !== "string" ||
                !messageText.trim()
            ) {

                socket.send(
                    JSON.stringify({

                        type: "error",

                        message: "Message cannot be empty"

                    })
                );

                return;
            }


            // Save message in MongoDB
            const savedMessage = await Message.create({

                senderId: socket.userId,

                receiverId: receiverId,

                message: messageText.trim(),

                messageType: "text",

                status: "sent"

            });


            console.log(
                "Message saved:",
                savedMessage._id.toString()
            );


            // Find receiver's active WebSocket
            const receiverSocket =
                getOnlineUser(receiverId);


            // ==============================
            // RECEIVER OFFLINE
            // ==============================

            if (!receiverSocket) {

                socket.send(
                    JSON.stringify({

                        type: "message_status",

                        status: "sent",

                        messageId: savedMessage._id,

                        message:
                            "Message saved. Receiver is offline."

                    })
                );

                return;
            }


            // ==============================
            // RECEIVER ONLINE
            // ==============================

            receiverSocket.send(
                JSON.stringify({

                    type: "private_message",

                    messageId: savedMessage._id,

                    senderId: savedMessage.senderId,

                    receiverId: savedMessage.receiverId,

                    message: savedMessage.message,

                    status: savedMessage.status,

                    createdAt: savedMessage.createdAt

                })
            );


            // Sender gets initial sent status
            socket.send(
                JSON.stringify({

                    type: "message_status",

                    status: "sent",

                    messageId: savedMessage._id,

                    message: "Message sent successfully"

                })
            );

            return;
        }


        // ==============================
        // MESSAGE DELIVERED
        // ==============================

        if (data.type === "message_delivered") {

            const {
                messageId
            } = data;


            // Check message ID
            if (!messageId) {

                socket.send(
                    JSON.stringify({

                        type: "error",

                        message: "Message ID is required"

                    })
                );

                return;
            }


            // Validate message ID
            if (
                !mongoose.Types.ObjectId.isValid(
                    messageId
                )
            ) {

                socket.send(
                    JSON.stringify({

                        type: "error",

                        message: "Invalid message ID"

                    })
                );

                return;
            }


            // Find message
            const messageData =
                await Message.findById(
                    messageId
                );


            if (!messageData) {

                socket.send(
                    JSON.stringify({

                        type: "error",

                        message: "Message not found"

                    })
                );

                return;
            }


            // Only receiver can mark message delivered
            if (
                messageData.receiverId.toString() !==
                socket.userId
            ) {

                socket.send(
                    JSON.stringify({

                        type: "error",

                        message:
                            "You cannot update this message"

                    })
                );

                return;
            }


            // Update status
            messageData.status = "delivered";

            await messageData.save();


            // Find sender's active socket
            const senderSocket =
                getOnlineUser(
                    messageData.senderId
                );


            // Notify sender if online
            if (senderSocket) {

                senderSocket.send(
                    JSON.stringify({

                        type: "message_status",

                        status: "delivered",

                        messageId:
                            messageData._id,

                        message:
                            "Message delivered"

                    })
                );

            }


            return;
        }


        // ==============================
        // UNKNOWN EVENT
        // ==============================

        socket.send(
            JSON.stringify({

                type: "error",

                message:
                    "Unknown WebSocket event"

            })
        );


    } catch (error) {

        console.log(
            "WebSocket message error:",
            error.message
        );


        socket.send(
            JSON.stringify({

                type: "error",

                message:
                    "Something went wrong"

            })
        );

    }

};