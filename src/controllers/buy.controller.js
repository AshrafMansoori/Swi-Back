import mongoose from "mongoose";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { PurchaseRequest } from "../models/buy.modal.js";
import { Item } from "../models/items.modal.js";
import { recalculateTrustScore } from "../utils/trustScore.js";


const createPurchaseRequest = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Buyer
    const buyerId = req.user._id;

    // 2. Get item ID from request body
    const { itemId } = req.body;

    // 3. Check itemId
    if (!itemId) {
        throw new ApiError(
            400,
            "itemId is required"
        );
    }

    // 4. Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
        throw new ApiError(
            400,
            "Invalid item ID"
        );
    }

    // 5. Find item
    const item = await Item.findById(itemId);

    if (!item) {
        throw new ApiError(
            404,
            "Item not found"
        );
    }

    // 6. Buyer cannot buy his own item
    if (
        item.ownerId.toString() === buyerId.toString()
    ) {
        throw new ApiError(
            400,
            "You cannot buy your own item"
        );
    }

    // 7. Item must be available
    if (item.status !== "Available") {
        throw new ApiError(
            400,
            "Item is no longer available"
        );
    }

    // Sell and giveaway listings both use the owner-approval flow.
    if (
        !item.listingType.includes("sell") &&
        !item.listingType.includes("giveaway")
    ) {
        throw new ApiError(
            400,
            "This item is not available for purchase or giveaway"
        );
    }

    // 9. Check duplicate pending request
    const existingRequest = await PurchaseRequest.findOne({
        buyerId: buyerId,
        itemId: itemId,
        status: "pending"
    });

    if (existingRequest) {
        throw new ApiError(
            409,
            "You already have a pending purchase request for this item"
        );
    }

    // 10. Create purchase request
    const purchaseRequest = await PurchaseRequest.create({
        buyerId: buyerId,
        sellerId: item.ownerId,
        itemId: itemId,
        status: "pending"
    });

    // 11. Send response
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                purchaseRequest,
                "Purchase request sent successfully"
            )
        );
});


const getIncomingPurchaseRequests = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Seller
    const sellerId = req.user._id;

    // 2. Find pending requests received by seller
    const requests = await PurchaseRequest.find({
        sellerId: sellerId,
        status: "pending"
    })
        .populate(
            "buyerId",
            "fullname profileImage"
        )
        .populate(
            "itemId",
            "title images price condition"
        )
        .sort({
            createdAt: -1
        });

    // 3. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                requests,
                "Incoming purchase requests fetched successfully"
            )
        );
});


const getOutgoingPurchaseRequests = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Buyer
    const buyerId = req.user._id;

    // 2. Find purchase requests sent by buyer
    const requests = await PurchaseRequest.find({
        buyerId: buyerId,
        status: "pending"
    })
        .populate(
            "sellerId",
            "fullname profileImage"
        )
        .populate(
            "itemId",
            "title images price condition"
        )
        .sort({
            createdAt: -1
        });

    // 3. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                requests,
                "Outgoing purchase requests fetched successfully"
            )
        );
});


const acceptPurchaseRequest = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Seller
    const sellerId = req.user._id;

    // 2. Get request ID from URL
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid purchase request ID"
        );
    }

    // 4. Find purchase request
    const purchaseRequest = await PurchaseRequest.findById(requestId);

    if (!purchaseRequest) {
        throw new ApiError(
            404,
            "Purchase request not found"
        );
    }

    // 5. Only pending request can be accepted
    if (purchaseRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Purchase request is already ${purchaseRequest.status}`
        );
    }

    // 6. Only seller can accept
    if (
        purchaseRequest.sellerId.toString() !== sellerId.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to accept this purchase request"
        );
    }

    // 7. Find item
    const item = await Item.findById(
        purchaseRequest.itemId
    );

    if (!item) {
        throw new ApiError(
            404,
            "Item not found"
        );
    }

    // 8. Item must still be available
    if (item.status !== "Available") {
        throw new ApiError(
            400,
            "Item is no longer available"
        );
    }

    // 9. Make sure it is available to sell or give away
    if (
        !item.listingType.includes("sell") &&
        !item.listingType.includes("giveaway")
    ) {
        throw new ApiError(
            400,
            "This item is not available for purchase or giveaway"
        );
    }

    // 10. Accept purchase request
    purchaseRequest.status = "accepted";

    await purchaseRequest.save();

    // IMPORTANT:
    // Item is NOT marked as Sold here.
    // It will become Sold only after
    // buyer and seller both confirm completion.

    // 11. Response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                purchaseRequest,
                "Purchase request accepted successfully"
            )
        );
});


const completePurchaseRequest = asyncHandler(async (req, res) => {

    // 1. Logged-in user
    const userId = req.user._id;

    // 2. Get request ID
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid purchase request ID"
        );
    }

    // 4. Find purchase request
    const purchaseRequest = await PurchaseRequest.findById(requestId);

    if (!purchaseRequest) {
        throw new ApiError(
            404,
            "Purchase request not found"
        );
    }

    // 5. Purchase request must be accepted
    if (purchaseRequest.status !== "accepted") {
        throw new ApiError(
            400,
            `Purchase cannot be completed because status is ${purchaseRequest.status}`
        );
    }

    // 6. Check whether user is buyer or seller
    const isBuyer =
        purchaseRequest.buyerId.toString() === userId.toString();

    const isSeller =
        purchaseRequest.sellerId.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
        throw new ApiError(
            403,
            "You are not part of this purchase"
        );
    }

    // 7. Mark current user's confirmation
    if (isBuyer) {

        if (purchaseRequest.completion.buyerConfirmed) {
            throw new ApiError(
                400,
                "You have already confirmed this purchase"
            );
        }

        purchaseRequest.completion.buyerConfirmed = true;
    }

    if (isSeller) {

        if (purchaseRequest.completion.sellerConfirmed) {
            throw new ApiError(
                400,
                "You have already confirmed this purchase"
            );
        }

        purchaseRequest.completion.sellerConfirmed = true;
    }

    // 8. Check whether both users have confirmed
    const bothConfirmed =
        purchaseRequest.completion.buyerConfirmed &&
        purchaseRequest.completion.sellerConfirmed;

    // 9. If both confirmed, complete purchase
    if (bothConfirmed) {

        // Find item
        const item = await Item.findById(
            purchaseRequest.itemId
        );

        if (!item) {
            throw new ApiError(
                404,
                "Item not found"
            );
        }

        // Mark purchase as completed
        purchaseRequest.status = "completed";

        // Mark item as sold
        item.status = "Sold";

        // Save both
        await Promise.all([
            purchaseRequest.save(),
            item.save()
        ]);
        await Promise.all([
            recalculateTrustScore(purchaseRequest.buyerId),
            recalculateTrustScore(purchaseRequest.sellerId)
        ]);

    } else {

        // Only one user has confirmed
        await purchaseRequest.save();
    }

    // 10. Response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                purchaseRequest,
                bothConfirmed
                    ? "Purchase completed successfully"
                    : "Purchase completion confirmed. Waiting for the other user."
            )
        );
});


const rejectPurchaseRequest = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Seller
    const sellerId = req.user._id;

    // 2. Get request ID from URL
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid purchase request ID"
        );
    }

    // 4. Find purchase request
    const purchaseRequest = await PurchaseRequest.findById(requestId);

    if (!purchaseRequest) {
        throw new ApiError(
            404,
            "Purchase request not found"
        );
    }

    // 5. Only pending request can be rejected
    if (purchaseRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Purchase request is already ${purchaseRequest.status}`
        );
    }

    // 6. Only seller can reject
    if (
        purchaseRequest.sellerId.toString() !== sellerId.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to reject this purchase request"
        );
    }

    // 7. Reject request
    purchaseRequest.status = "rejected";

    // 8. Save request
    await purchaseRequest.save();

    // 9. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                purchaseRequest,
                "Purchase request rejected successfully"
            )
        );
});


const cancelPurchaseRequest = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Buyer
    const buyerId = req.user._id;

    // 2. Get request ID from URL
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid purchase request ID"
        );
    }

    // 4. Find purchase request
    const purchaseRequest = await PurchaseRequest.findById(requestId);

    if (!purchaseRequest) {
        throw new ApiError(
            404,
            "Purchase request not found"
        );
    }

    // 5. Only pending request can be cancelled
    if (purchaseRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Purchase request is already ${purchaseRequest.status}`
        );
    }

    // 6. Only buyer who created the request can cancel it
    if (
        purchaseRequest.buyerId.toString() !== buyerId.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to cancel this purchase request"
        );
    }

    // 7. Cancel request
    purchaseRequest.status = "cancelled";

    // 8. Save request
    await purchaseRequest.save();

    // 9. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                purchaseRequest,
                "Purchase request cancelled successfully"
            )
        );
});


const getPurchaseHistory = asyncHandler(async (req, res) => {

    // 1. Logged-in user
    const userId = req.user._id;

    // 2. Find requests where user is buyer OR seller
    const purchaseHistory = await PurchaseRequest.find({
        $or: [
            { buyerId: userId },
            { sellerId: userId }
        ],
        status: {
            $in: [
                "accepted",
                "completed",
                "rejected",
                "cancelled"
            ]
        }
    })
        // Buyer information
        .populate(
            "buyerId",
            "fullname profileImage"
        )

        // Seller information
        .populate(
            "sellerId",
            "fullname profileImage"
        )

        // Item information
        .populate(
            "itemId",
            "title images price condition"
        )

        // Latest first
        .sort({
            createdAt: -1
        });

    // 3. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                purchaseHistory,
                "Purchase history fetched successfully"
            )
        );
});


const startPurchaseChat = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Seller
    const sellerId = req.user._id;

    // 2. Get request ID
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid purchase request ID"
        );
    }

    // 4. Find purchase request
    const purchaseRequest =
        await PurchaseRequest.findById(requestId);

    if (!purchaseRequest) {
        throw new ApiError(
            404,
            "Purchase request not found"
        );
    }

    // 5. Chat can only be started for pending request
    if (purchaseRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Chat cannot be started because purchase request is ${purchaseRequest.status}`
        );
    }

    // 6. Only seller can start the chat
    if (
        purchaseRequest.sellerId.toString() !==
        sellerId.toString()
    ) {
        throw new ApiError(
            403,
            "Only the seller can start this chat"
        );
    }

    // 7. Start chat
    purchaseRequest.chatStarted = true;

    // 8. Save
    await purchaseRequest.save();

    // 9. Response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                purchaseRequest,
                "Purchase chat started successfully"
            )
        );
});

export {
    createPurchaseRequest,
    getIncomingPurchaseRequests,
    getOutgoingPurchaseRequests,
    acceptPurchaseRequest,
    completePurchaseRequest,
    rejectPurchaseRequest,
    cancelPurchaseRequest,
    getPurchaseHistory,
    startPurchaseChat
};