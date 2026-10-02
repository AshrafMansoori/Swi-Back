import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000
        },

        messageType: {
            type: String,
            enum: ["text"],
            default: "text"
        },

        status: {
            type: String,
            enum: ["sent", "delivered", "read"],
            default: "sent"
        }
    },
    {
        timestamps: true
    }
);


// Pending messages ke liye useful index
messageSchema.index({
    receiverId: 1,
    status: 1,
    createdAt: 1
});


// Conversation history ke liye useful index
messageSchema.index({
    senderId: 1,
    receiverId: 1,
    createdAt: 1
});


export const Message = mongoose.model(
    "Message",
    messageSchema
);