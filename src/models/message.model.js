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

        // Exchange/Purchase/Rent request ID
        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },

        // Type of transaction
        transactionType: {
            type: String,
            enum: ["exchange", "purchase", "rent"],
            required: true
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
    transactionId: 1,
    transactionType: 1,
    createdAt: 1
});


// Transaction ki complete chat history
messageSchema.index({
    transactionId: 1,
    transactionType: 1,
    createdAt: 1
});


export const Message = mongoose.model(
    "Message",
    messageSchema
);