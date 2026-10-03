import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        reviewerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        reviewedUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        transactionType: {
            type: String,
            enum: ["exchange", "purchase", "rent"],
            required: true
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },

        comment: {
            type: String,
            trim: true,
            maxlength: 500
        }
    },
    {
        timestamps: true
    }
);

// Same user cannot review twice for same transaction
reviewSchema.index(
    {
        reviewerId: 1,
        transactionId: 1,
        transactionType: 1
    },
    {
        unique: true
    }
);

export const Review = mongoose.model("Review", reviewSchema);