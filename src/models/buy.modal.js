import mongoose from "mongoose";

const purchaseRequestSchema = new mongoose.Schema(
    {
        buyerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        itemId: {
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
            buyerConfirmed: {
                type: Boolean,
                default: false
            },

            sellerConfirmed: {
                type: Boolean,
                default: false
            }
        }
    },
    {
        timestamps: true
    }
);

// Buyer ke requests
purchaseRequestSchema.index({
    buyerId: 1,
    status: 1
});

// Seller ko received requests
purchaseRequestSchema.index({
    sellerId: 1,
    status: 1
});

export const PurchaseRequest = mongoose.model(
    "PurchaseRequest",
    purchaseRequestSchema
);