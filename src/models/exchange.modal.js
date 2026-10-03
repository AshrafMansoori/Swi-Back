import mongoose from "mongoose";

const exchangeRequestSchema = new mongoose.Schema(
    {
        requesterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        requestedItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Item",
            required: true
        },

        offeredItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Item",
            required: true
        },

        status: {
            type: String,
            enum: [
                "pending",
                "accepted",
                "rejected",
                "cancelled",
                "completed"
            ],
            default: "pending"
        },
        chatStarted: {
            type: Boolean,
            default: false
        },

        completion: {
            requesterConfirmed: {
                type: Boolean,
                default: false
            },

            ownerConfirmed: {
                type: Boolean,
                default: false
            }
        }
    },
    {
        timestamps: true
    }
);

// Requests sent by a user for a particular item
exchangeRequestSchema.index({
    requesterId: 1,
    requestedItemId: 1,
    status: 1
});

// Requests received by an owner
exchangeRequestSchema.index({
    ownerId: 1,
    status: 1
});

export const ExchangeRequest = mongoose.model(
    "ExchangeRequest",
    exchangeRequestSchema
);