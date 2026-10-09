import mongoose from "mongoose";

import { Review } from "../models/review.modal.js";
import { User } from "../models/user.model.js";
import { ExchangeRequest } from "../models/exchange.modal.js";
import { PurchaseRequest } from "../models/buy.modal.js";
import { RentRequest } from "../models/rent.model.js";

export async function recalculateTrustScore(userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [reviewStats, purchaseCount, exchangeCount, rentCount] = await Promise.all([
        Review.aggregate([
            { $match: { reviewedUserId: userObjectId } },
            {
                $group: {
                    _id: null,
                    ratingTotal: { $sum: "$rating" },
                    reviewCount: { $sum: 1 }
                }
            }
        ]),
        PurchaseRequest.countDocuments({
            $or: [{ buyerId: userObjectId }, { sellerId: userObjectId }],
            status: "completed"
        }),
        ExchangeRequest.countDocuments({
            $or: [{ requesterId: userObjectId }, { ownerId: userObjectId }],
            status: "completed"
        }),
        RentRequest.countDocuments({
            $or: [{ borrowerId: userObjectId }, { lenderId: userObjectId }],
            status: "returned"
        })
    ]);

    const { ratingTotal = 0, reviewCount = 0 } = reviewStats[0] || {};
    const completedTransactions = purchaseCount + exchangeCount + rentCount;
    const scoreObservations = Math.max(completedTransactions, reviewCount);
    const unreviewedTransactions = scoreObservations - reviewCount;
    const trustScore = scoreObservations
        ? Number(((ratingTotal + 3 * unreviewedTransactions) / scoreObservations).toFixed(2))
        : 0;

    await User.findByIdAndUpdate(userId, { $set: { trustScore } });
    return trustScore;
}
