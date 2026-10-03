import mongoose from "mongoose";

import { getOnlineUser } from "./socket.server.js";
import { Message } from "../models/message.model.js";

import { ExchangeRequest } from "../models/exchange.modal.js";
import { PurchaseRequest } from "../models/purchaseRequest.modal.js";
import { RentRequest } from "../models/rentRequest.modal.js";


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
                transactionId,
                transactionType,
                message: messageText
            } = data;


            // ==============================
            // CHECK REQUIRED FIELDS
            // ==============================

            if (!receiverId) {

                socket.send(
                    JSON.stringify({
                        type: "error",
                        message: "Receiver ID is required"
                    })
                );

                return;
            }


            if (!transactionId) {

                socket.send(
                    JSON.stringify({
                        type: "error",
                        message: "Transaction ID is required"
                    })
                );

                return;
            }


            if (!transactionType) {

                socket.send(
                    JSON.stringify({
                        type: "error",
                        message: "Transaction type is required"
                    })
                );

                return;
            }


            // ==============================
            // VALIDATE OBJECT IDS
            // ==============================

            if (
                !mongoose.Types.ObjectId.isValid(receiverId)
            ) {

                socket.send(
                    JSON.stringify({
                        type: "error",
                        message: "Invalid receiver ID"
                    })
                );

                return;
            }


            if (
                !mongoose.Types.ObjectId.isValid(transactionId)
            ) {

                socket.send(
                    JSON.stringify({
                        type: "error",
                        message: "Invalid transaction ID"
                    })
                );

                return;
            }


            // ==============================
            // VALIDATE TRANSACTION TYPE
            // ==============================

            if (
                ![
                    "exchange",
                    "purchase",
                    "rent"
                ].includes(transactionType)
            ) {

                socket.send(
                    JSON.stringify({
                        type: "error",
                        message: "Invalid transaction type"
                    })
                );

                return;
            }


            // ==============================
            // VALIDATE MESSAGE
            // ==============================

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


            // ==============================
            // FIND TRANSACTION
            // ==============================

            let transaction;

            if (transactionType === "exchange") {

                transaction =
                    await ExchangeRequest.findById(
                        transactionId
                    );

            } else if (transactionType === "purchase") {

                transaction =
                    await PurchaseRequest.findById(
                        transactionId
                    );

            } else if (transactionType === "rent") {

                transaction =
                    await RentRequest.findById(
                        transactionId
                    );
            }


            // ==============================
            // TRANSACTION EXISTS?
            // ==============================

            if (!transaction) {

                socket.send(
                    JSON.stringify({
                        type: "error",
                        message: "Transaction not found"
                    })
                );

                return;
            }


            // ==============================
            // CHECK PARTICIPANT
            // ==============================

            let isParticipant = false;

            if (transactionType === "exchange") {

                isParticipant =
                    transaction.requesterId.toString() ===
                        socket.userId ||
                    transaction.ownerId.toString() ===
                        socket.userId;

            } else if (transactionType === "purchase") {

                isParticipant =
                    transaction.buyerId.toString() ===
                        socket.userId ||
                    transaction.sellerId.toString() ===
                        socket.userId;

            } else if (transactionType === "rent") {

                isParticipant =
                    transaction.borrowerId.toString() ===
                        socket.userId ||
                    transaction.lenderId.toString() ===
                        socket.userId;
            }


            if (!isParticipant) {

                socket.send(
                    JSON.stringify({
                        type: "error",
                        message:
                            "You are not part of this conversation"
                    })
                );

                return;
            }


            // ==============================
            // CHECK CHAT STARTED
            // ==============================

            if (!transaction.chatStarted) {

                socket.send(
                    JSON.stringify({
                        type: "error",
                        message:
                            "Chat has not been started by the owner"
                    })
                );

                return;
            }


            // ==============================
            // CHECK RECEIVER
            // ==============================

            let receiverIsParticipant = false;

            if (transactionType === "exchange") {

                receiverIsParticipant =
                    transaction.requesterId.toString() ===
                        receiverId ||
                    transaction.ownerId.toString() ===
                        receiverId;

            } else if (transactionType === "purchase") {

                receiverIsParticipant =
                    transaction.buyerId.toString() ===
                        receiverId ||
                    transaction.sellerId.toString() ===
                        receiverId;

            } else if (transactionType === "rent") {

                receiverIsParticipant =
                    transaction.borrowerId.toString() ===
                        receiverId ||
                    transaction.lenderId.toString() ===
                        receiverId;
            }


            if (!receiverIsParticipant) {

                socket.send(
                    JSON.stringify({
                        type: "error",
                        message:
                            "Receiver is not part of this conversation"
                    })
                );

                return;
            }


            // ==============================
            // RECEIVER CANNOT BE SENDER
            // ==============================

            if (
                socket.userId === receiverId
            ) {

                socket.send(
                    JSON.stringify({
                        type: "error",
                        message:
                            "You cannot send a message to yourself"
                    })
                );

                return;
            }


            // ==============================
            // SAVE MESSAGE
            // ==============================

            const savedMessage = await Message.create({

                senderId: socket.userId,

                receiverId: receiverId,

                transactionId: transactionId,

                transactionType: transactionType,

                message: messageText.trim(),

                messageType: "text",

                status: "sent"

            });


            console.log(
                "Message saved:",
                savedMessage._id.toString()
            );


            // ==============================
            // FIND RECEIVER SOCKET
            // ==============================

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

                        messageId:
                            savedMessage._id,

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

                    messageId:
                        savedMessage._id,

                    senderId:
                        savedMessage.senderId,

                    receiverId:
                        savedMessage.receiverId,

                    transactionId:
                        savedMessage.transactionId,

                    transactionType:
                        savedMessage.transactionType,

                    message:
                        savedMessage.message,

                    status:
                        savedMessage.status,

                    createdAt:
                        savedMessage.createdAt

                })
            );


            // ==============================
            // SENDER STATUS
            // ==============================

            socket.send(
                JSON.stringify({

                    type: "message_status",

                    status: "sent",

                    messageId:
                        savedMessage._id,

                    message:
                        "Message sent successfully"

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

                        message:
                            "Message ID is required"

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

                        message:
                            "Invalid message ID"

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

                        message:
                            "Message not found"

                    })
                );

                return;
            }


            // Only receiver can mark delivered
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


            // Find sender socket
            const senderSocket =
                getOnlineUser(
                    messageData.senderId
                );


            // Notify sender
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