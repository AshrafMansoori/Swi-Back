import mongoose from "mongoose";

const rentRequestSchema = new mongoose.Schema(
    {
        borrowerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        lenderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Item",
            required: true
        },

        startDate: {
            type: Date,
            required: true
        },

        endDate: {
            type: Date,
            required: true
        },

        status: {
            type: String,
            enum: [
                "pending",
                "accepted",
                "rejected",
                "cancelled",
                "returned"
            ],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);


// Borrower ke requests
rentRequestSchema.index({
    borrowerId: 1,
    status: 1
});


// Lender ko received requests
rentRequestSchema.index({
    lenderId: 1,
    status: 1
});


// Item ke rent requests
rentRequestSchema.index({
    itemId: 1,
    status: 1
});


export const RentRequest = mongoose.model(
    "RentRequest",
    rentRequestSchema
);