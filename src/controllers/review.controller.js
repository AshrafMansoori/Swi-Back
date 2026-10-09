import mongoose from "mongoose";

import { Review } from "../models/review.modal.js";
import { User } from "../models/user.model.js";
import { ExchangeRequest } from "../models/exchange.modal.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { recalculateTrustScore } from "../utils/trustScore.js";

const createExchangeReview = asyncHandler(async (req, res) => {

    const reviewerId = req.user._id;

    const {
        transactionId,
        rating,
        comment
    } = req.body;


    // ==========================================
    // 1. Validate transaction ID
    // ==========================================

    if (!transactionId) {
        throw new ApiError(
            400,
            "Exchange transaction ID is required"
        );
    }

    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
        throw new ApiError(
            400,
            "Invalid exchange transaction ID"
        );
    }


    // ==========================================
    // 2. Validate rating
    // ==========================================

    if (
        typeof rating !== "number" ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {
        throw new ApiError(
            400,
            "Rating must be an integer between 1 and 5"
        );
    }


    // ==========================================
    // 3. Find exchange
    // ==========================================

    const exchangeRequest =
        await ExchangeRequest.findById(transactionId);


    if (!exchangeRequest) {
        throw new ApiError(
            404,
            "Exchange request not found"
        );
    }


    // ==========================================
    // 4. Exchange must be completed
    // ==========================================

    if (exchangeRequest.status !== "completed") {
        throw new ApiError(
            400,
            "You can review only after the exchange is completed"
        );
    }


    // ==========================================
    // 5. Check reviewer is participant
    // ==========================================

    const isRequester =
        exchangeRequest.requesterId.toString() ===
        reviewerId.toString();

    const isOwner =
        exchangeRequest.ownerId.toString() ===
        reviewerId.toString();


    if (!isRequester && !isOwner) {
        throw new ApiError(
            403,
            "You are not a participant in this exchange"
        );
    }


    // ==========================================
    // 6. Find the other participant
    // ==========================================

    const reviewedUserId = isRequester
        ? exchangeRequest.ownerId
        : exchangeRequest.requesterId;


    // ==========================================
    // 7. Prevent self review
    // ==========================================

    if (
        reviewerId.toString() ===
        reviewedUserId.toString()
    ) {
        throw new ApiError(
            400,
            "You cannot review yourself"
        );
    }


    // ==========================================
    // 8. Check duplicate review
    // ==========================================

    const existingReview = await Review.findOne({
        reviewerId,
        transactionId,
        transactionType: "exchange"
    });


    if (existingReview) {
        throw new ApiError(
            409,
            "You have already reviewed this exchange"
        );
    }


    // ==========================================
    // 9. Check reviewed user exists
    // ==========================================

    const reviewedUser =
        await User.findById(reviewedUserId);


    if (!reviewedUser) {
        throw new ApiError(
            404,
            "Reviewed user not found"
        );
    }


    // ==========================================
    // 10. Clean comment
    // ==========================================

    const cleanComment =
        typeof comment === "string"
            ? comment.trim()
            : "";


    if (cleanComment.length > 500) {
        throw new ApiError(
            400,
            "Comment cannot exceed 500 characters"
        );
    }


    // ==========================================
    // 11. Create review
    // ==========================================

    let review;

    try {

        review = await Review.create({
            reviewerId,
            reviewedUserId,
            transactionId,
            transactionType: "exchange",
            rating,
            comment: cleanComment
        });

    } catch (error) {

        // MongoDB unique index protection
        if (error.code === 11000) {
            throw new ApiError(
                409,
                "You have already reviewed this exchange"
            );
        }

        throw error;
    }


    // ==========================================
    // 12. Recalculate Trust Score
    // ==========================================

    const trustScore = await recalculateTrustScore(reviewedUserId);


    // ==========================================
    // 14. Response
    // ==========================================

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                review,
                trustScore
            },
            "Exchange review created successfully"
        )
    );
});

const createPurchaseReview = asyncHandler(async (req, res) => {

    const reviewerId = req.user._id;

    const {
        transactionId,
        rating,
        comment
    } = req.body;


    // ==========================================
    // 1. Validate transaction ID
    // ==========================================

    if (!transactionId) {
        throw new ApiError(
            400,
            "Purchase transaction ID is required"
        );
    }

    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
        throw new ApiError(
            400,
            "Invalid purchase transaction ID"
        );
    }


    // ==========================================
    // 2. Validate rating
    // ==========================================

    if (
        typeof rating !== "number" ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {
        throw new ApiError(
            400,
            "Rating must be an integer between 1 and 5"
        );
    }


    // ==========================================
    // 3. Find purchase
    // ==========================================

    const purchaseRequest =
        await PurchaseRequest.findById(transactionId);


    if (!purchaseRequest) {
        throw new ApiError(
            404,
            "Purchase request not found"
        );
    }


    // ==========================================
    // 4. Purchase must be completed
    // ==========================================

    if (purchaseRequest.status !== "completed") {
        throw new ApiError(
            400,
            "You can review only after the purchase is completed"
        );
    }


    // ==========================================
    // 5. Check reviewer is participant
    // ==========================================

    const isBuyer =
        purchaseRequest.buyerId.toString() ===
        reviewerId.toString();

    const isSeller =
        purchaseRequest.sellerId.toString() ===
        reviewerId.toString();


    if (!isBuyer && !isSeller) {
        throw new ApiError(
            403,
            "You are not a participant in this purchase"
        );
    }


    // ==========================================
    // 6. Find the other participant
    // ==========================================

    const reviewedUserId = isBuyer
        ? purchaseRequest.sellerId
        : purchaseRequest.buyerId;


    // ==========================================
    // 7. Prevent self review
    // ==========================================

    if (
        reviewerId.toString() ===
        reviewedUserId.toString()
    ) {
        throw new ApiError(
            400,
            "You cannot review yourself"
        );
    }


    // ==========================================
    // 8. Check duplicate review
    // ==========================================

    const existingReview = await Review.findOne({
        reviewerId,
        transactionId,
        transactionType: "purchase"
    });


    if (existingReview) {
        throw new ApiError(
            409,
            "You have already reviewed this purchase"
        );
    }


    // ==========================================
    // 9. Check reviewed user exists
    // ==========================================

    const reviewedUser =
        await User.findById(reviewedUserId);


    if (!reviewedUser) {
        throw new ApiError(
            404,
            "Reviewed user not found"
        );
    }


    // ==========================================
    // 10. Clean comment
    // ==========================================

    const cleanComment =
        typeof comment === "string"
            ? comment.trim()
            : "";


    if (cleanComment.length > 500) {
        throw new ApiError(
            400,
            "Comment cannot exceed 500 characters"
        );
    }


    // ==========================================
    // 11. Create review
    // ==========================================

    let review;

    try {

        review = await Review.create({

            reviewerId,

            reviewedUserId,

            transactionId,

            transactionType: "purchase",

            rating,

            comment: cleanComment

        });

    } catch (error) {

        if (error.code === 11000) {
            throw new ApiError(
                409,
                "You have already reviewed this purchase"
            );
        }

        throw error;
    }


    // ==========================================
    // 12. Recalculate Trust Score
    // ==========================================

    const trustScore = await recalculateTrustScore(reviewedUserId);


    // ==========================================
    // 14. Response
    // ==========================================

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                review,
                trustScore
            },
            "Purchase review created successfully"
        )
    );
});

const createRentReview = asyncHandler(async (req, res) => {

    const reviewerId = req.user._id;

    const {
        transactionId,
        rating,
        comment
    } = req.body;


    // ==========================================
    // 1. Validate transaction ID
    // ==========================================

    if (!transactionId) {
        throw new ApiError(
            400,
            "Rent transaction ID is required"
        );
    }

    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
        throw new ApiError(
            400,
            "Invalid rent transaction ID"
        );
    }


    // ==========================================
    // 2. Validate rating
    // ==========================================

    if (
        typeof rating !== "number" ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {
        throw new ApiError(
            400,
            "Rating must be an integer between 1 and 5"
        );
    }


    // ==========================================
    // 3. Find rent request
    // ==========================================

    const rentRequest =
        await RentRequest.findById(transactionId);


    if (!rentRequest) {
        throw new ApiError(
            404,
            "Rent request not found"
        );
    }


    // ==========================================
    // 4. Rental must be returned
    // ==========================================

    if (rentRequest.status !== "returned") {
        throw new ApiError(
            400,
            "You can review only after the item has been returned"
        );
    }


    // ==========================================
    // 5. Check reviewer is participant
    // ==========================================

    const isBorrower =
        rentRequest.borrowerId.toString() ===
        reviewerId.toString();

    const isLender =
        rentRequest.lenderId.toString() ===
        reviewerId.toString();


    if (!isBorrower && !isLender) {
        throw new ApiError(
            403,
            "You are not a participant in this rental"
        );
    }


    // ==========================================
    // 6. Find the other participant
    // ==========================================

    const reviewedUserId = isBorrower
        ? rentRequest.lenderId
        : rentRequest.borrowerId;


    // ==========================================
    // 7. Prevent self review
    // ==========================================

    if (
        reviewerId.toString() ===
        reviewedUserId.toString()
    ) {
        throw new ApiError(
            400,
            "You cannot review yourself"
        );
    }


    // ==========================================
    // 8. Check duplicate review
    // ==========================================

    const existingReview = await Review.findOne({
        reviewerId,
        transactionId,
        transactionType: "rent"
    });


    if (existingReview) {
        throw new ApiError(
            409,
            "You have already reviewed this rental"
        );
    }


    // ==========================================
    // 9. Check reviewed user exists
    // ==========================================

    const reviewedUser =
        await User.findById(reviewedUserId);


    if (!reviewedUser) {
        throw new ApiError(
            404,
            "Reviewed user not found"
        );
    }


    // ==========================================
    // 10. Clean comment
    // ==========================================

    const cleanComment =
        typeof comment === "string"
            ? comment.trim()
            : "";


    if (cleanComment.length > 500) {
        throw new ApiError(
            400,
            "Comment cannot exceed 500 characters"
        );
    }


    // ==========================================
    // 11. Create review
    // ==========================================

    let review;

    try {

        review = await Review.create({

            reviewerId,

            reviewedUserId,

            transactionId,

            transactionType: "rent",

            rating,

            comment: cleanComment

        });

    } catch (error) {

        if (error.code === 11000) {
            throw new ApiError(
                409,
                "You have already reviewed this rental"
            );
        }

        throw error;
    }


    // ==========================================
    // 12. Recalculate Trust Score
    // ==========================================

    const trustScore = await recalculateTrustScore(reviewedUserId);


    // ==========================================
    // 14. Response
    // ==========================================

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                review,
                trustScore
            },
            "Rent review created successfully"
        )
    );
});

const getUserReviews = asyncHandler(async (req, res) => {

    const { userId } = req.params;


    // ==========================================
    // 1. Validate user ID
    // ==========================================

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(
            400,
            "Invalid user ID"
        );
    }


    // ==========================================
    // 2. Check user exists
    // ==========================================

    const user = await User.findById(userId)
        .select("fullname profileImage trustScore");


    if (!user) {
        throw new ApiError(
            404,
            "User not found"
        );
    }


    // ==========================================
    // 3. Get reviews
    // ==========================================

    const reviews = await Review.find({
        reviewedUserId: userId
    })
        .populate(
            "reviewerId",
            "fullname profileImage"
        )
        .sort({
            createdAt: -1
        });


    // ==========================================
    // 4. Calculate total reviews
    // ==========================================

    const totalReviews = reviews.length;


    // ==========================================
    // 5. Calculate rating distribution
    // ==========================================

    const ratingDistribution = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
    };


    reviews.forEach((review) => {

        ratingDistribution[review.rating]++;

    });


    // ==========================================
    // 6. Response
    // ==========================================

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                user: {
                    id: user._id,
                    fullname: user.fullname,
                    profileImage: user.profileImage,
                    trustScore: user.trustScore
                },

                totalReviews,

                ratingDistribution,

                reviews
            },
            "User reviews fetched successfully"
        )
    );
});

export {
    createExchangeReview,
    createPurchaseReview,
    createRentReview,
    getUserReviews
};