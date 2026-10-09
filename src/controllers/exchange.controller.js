import mongoose from "mongoose";
import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js";

import { ExchangeRequest } from "../models/exchange.modal.js";
import { Item } from "../models/items.modal.js";


const createExchangeRequest = asyncHandler(async (req, res) => {

    // 1. Get logged-in user
    const requesterId = req.user._id;

    // 2. Get data from request body
    const { requestedItemId, offeredItemId } = req.body;


    // 3. Check required fields
    if (!requestedItemId || !offeredItemId) {
        throw new ApiError(
            400,
            "requestedItemId and offeredItemId are required"
        );
    }


    // 4. Validate MongoDB IDs
    if (
        !mongoose.Types.ObjectId.isValid(requestedItemId) ||
        !mongoose.Types.ObjectId.isValid(offeredItemId)
    ) {
        throw new ApiError(
            400,
            "Invalid item ID"
        );
    }


    // 5. Get both items
    const [requestedItem, offeredItem] = await Promise.all([
        Item.findById(requestedItemId),
        Item.findById(offeredItemId)
    ]);


    // 6. Check requested item
    if (!requestedItem) {
        throw new ApiError(
            404,
            "Requested item not found"
        );
    }


    // 7. Check offered item
    if (!offeredItem) {
        throw new ApiError(
            404,
            "Offered item not found"
        );
    }


    // 8. Requester cannot exchange with himself
    if (
        requestedItem.ownerId.toString() === requesterId.toString()
    ) {
        throw new ApiError(
            400,
            "You cannot request your own item"
        );
    }

    if (requestedItem.status !== "Available" || offeredItem.status !== "Available") {
        throw new ApiError(
            400,
            "Both items must be available for exchange"
        );
    }

    if (!requestedItem.listingType.includes("barter")) {
        throw new ApiError(
            400,
            "This item is not available for exchange"
        );
    }


    // 9. Offered item must belong to requester
    if (
        offeredItem.ownerId.toString() !== requesterId.toString()
    ) {
        throw new ApiError(
            403,
            "You can only offer your own item"
        );
    }


    // 10. Requested item and offered item cannot be same
    if (
        requestedItem._id.toString() === offeredItem._id.toString()
    ) {
        throw new ApiError(
            400,
            "Requested item and offered item cannot be the same"
        );
    }


    // 11. Check for existing pending request
    const existingRequest = await ExchangeRequest.findOne({
        requesterId,
        requestedItemId,
        offeredItemId,
        status: "pending"
    });

    if (existingRequest) {
        throw new ApiError(
            409,
            "You already have a pending exchange request for these items"
        );
    }


    // 12. Create exchange request
    const exchangeRequest = await ExchangeRequest.create({
        requesterId,
        ownerId: requestedItem.ownerId,
        requestedItemId,
        offeredItemId,
        status: "pending"
    });


    // 13. Send response
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                exchangeRequest,
                "Exchange request sent successfully"
            )
        );
});

const acceptExchangeRequest = asyncHandler(async (req, res) => {

    // 1. Get logged-in user
    const ownerId = req.user._id;

    // 2. Get request ID
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid exchange request ID"
        );
    }

    // 4. Find exchange request
    const exchangeRequest = await ExchangeRequest.findById(requestId);

    if (!exchangeRequest) {
        throw new ApiError(
            404,
            "Exchange request not found"
        );
    }

    // 5. Only pending requests can be accepted
    if (exchangeRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Exchange request is already ${exchangeRequest.status}`
        );
    }

    // 6. Only requested item's owner can accept
    if (
        exchangeRequest.ownerId.toString() !== ownerId.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to accept this exchange request"
        );
    }

    // 7. Get both items
    const [requestedItem, offeredItem] = await Promise.all([
        Item.findById(exchangeRequest.requestedItemId),
        Item.findById(exchangeRequest.offeredItemId)
    ]);

    // 8. Check requested item
    if (!requestedItem) {
        throw new ApiError(
            404,
            "Requested item not found"
        );
    }

    // 9. Check offered item
    if (!offeredItem) {
        throw new ApiError(
            404,
            "Offered item not found"
        );
    }

    // 10. Both items must still be available
    if (requestedItem.status !== "Available") {
        throw new ApiError(
            400,
            "Requested item is no longer available"
        );
    }

    if (offeredItem.status !== "Available") {
        throw new ApiError(
            400,
            "Offered item is no longer available"
        );
    }

    // 11. Accept exchange request
    exchangeRequest.status = "accepted";

    await exchangeRequest.save();

    // IMPORTANT:
    // Items are NOT marked as "Traded" here.
    // They will become "Traded" only after
    // both users confirm the actual exchange.

    // 12. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                exchangeRequest,
                "Exchange request accepted successfully"
            )
        );
});

const rejectExchangeRequest = asyncHandler(async (req, res) => {

    // 1. Get logged-in user
    const ownerId = req.user._id;

    // 2. Get request ID
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid exchange request ID"
        );
    }

    // 4. Find exchange request
    const exchangeRequest = await ExchangeRequest.findById(requestId);

    if (!exchangeRequest) {
        throw new ApiError(
            404,
            "Exchange request not found"
        );
    }

    // 5. Only pending requests can be rejected
    if (exchangeRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Exchange request is already ${exchangeRequest.status}`
        );
    }

    // 6. Only owner of requested item can reject
    if (
        exchangeRequest.ownerId.toString() !== ownerId.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to reject this exchange request"
        );
    }

    // 7. Reject request
    exchangeRequest.status = "rejected";

    await exchangeRequest.save();

    // 8. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                exchangeRequest,
                "Exchange request rejected successfully"
            )
        );
});

const cancelExchangeRequest = asyncHandler(async (req, res) => {

    // 1. Get logged-in user
    const requesterId = req.user._id;

    // 2. Get exchange request ID
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid exchange request ID"
        );
    }

    // 4. Find exchange request
    const exchangeRequest = await ExchangeRequest.findById(requestId);

    if (!exchangeRequest) {
        throw new ApiError(
            404,
            "Exchange request not found"
        );
    }

    // 5. Only pending request can be cancelled
    if (exchangeRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Exchange request is already ${exchangeRequest.status}`
        );
    }

    // 6. Only requester can cancel the request
    if (
        exchangeRequest.requesterId.toString() !== requesterId.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to cancel this exchange request"
        );
    }

    // 7. Cancel request
    exchangeRequest.status = "cancelled";

    await exchangeRequest.save();

    // 8. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                exchangeRequest,
                "Exchange request cancelled successfully"
            )
        );
});

const getExchangeHistory = asyncHandler(async (req, res) => {

    // 1. Get logged-in user
    const userId = req.user._id;

    // 2. Find user's exchange history
    const exchangeHistory = await ExchangeRequest.find({
        $or: [
            { requesterId: userId },
            { ownerId: userId }
        ],
        status: {
            $in: ["accepted", "completed", "rejected", "cancelled"]
        }
    })
        .populate("requesterId", "fullname profileImage")
        .populate("ownerId", "fullname profileImage")
        .populate("requestedItemId", "title images")
        .populate("offeredItemId", "title images")
        .sort({ createdAt: -1 });

    // 3. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                exchangeHistory,
                "Exchange history fetched successfully"
            )
        );
});

const getIncomingExchangeRequests = asyncHandler(async (req, res) => {

    // 1. Get logged-in user
    const ownerId = req.user._id;

    // 2. Find pending requests received by the user
    const requests = await ExchangeRequest.find({
        ownerId: ownerId,
        status: "pending"
    })
        .populate("requesterId", "fullname profileImage")
        .populate("requestedItemId", "title images")
        .populate("offeredItemId", "title images")
        .sort({ createdAt: -1 });

    // 3. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                requests,
                "Incoming exchange requests fetched successfully"
            )
        );
});

const getOutgoingExchangeRequests = asyncHandler(async (req, res) => {

    // 1. Get logged-in user
    const requesterId = req.user._id;

    // 2. Find pending requests sent by the user
    const requests = await ExchangeRequest.find({
        requesterId: requesterId,
        status: "pending"
    })
        .populate("ownerId", "fullname profileImage")
        .populate("requestedItemId", "title images")
        .populate("offeredItemId", "title images")
        .sort({ createdAt: -1 });

    // 3. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                requests,
                "Outgoing exchange requests fetched successfully"
            )
        );
});

const completeExchangeRequest = asyncHandler(async (req, res) => {

    // 1. Get logged-in user
    const userId = req.user._id;

    // 2. Get request ID
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid exchange request ID"
        );
    }

    // 4. Find exchange request
    const exchangeRequest = await ExchangeRequest.findById(requestId);

    if (!exchangeRequest) {
        throw new ApiError(
            404,
            "Exchange request not found"
        );
    }

    // 5. Exchange must be accepted
    if (exchangeRequest.status !== "accepted") {
        throw new ApiError(
            400,
            `Exchange cannot be completed because status is ${exchangeRequest.status}`
        );
    }

    // 6. Check whether user is part of this exchange
    const isRequester =
        exchangeRequest.requesterId.toString() === userId.toString();

    const isOwner =
        exchangeRequest.ownerId.toString() === userId.toString();

    if (!isRequester && !isOwner) {
        throw new ApiError(
            403,
            "You are not part of this exchange"
        );
    }

    // 7. Mark current user's confirmation
    if (isRequester) {

        if (exchangeRequest.completion.requesterConfirmed) {
            throw new ApiError(
                400,
                "You have already confirmed this exchange"
            );
        }

        exchangeRequest.completion.requesterConfirmed = true;
    }

    if (isOwner) {

        if (exchangeRequest.completion.ownerConfirmed) {
            throw new ApiError(
                400,
                "You have already confirmed this exchange"
            );
        }

        exchangeRequest.completion.ownerConfirmed = true;
    }

    // 8. Check whether both users have confirmed
    const bothConfirmed =
        exchangeRequest.completion.requesterConfirmed &&
        exchangeRequest.completion.ownerConfirmed;

    // 9. If both confirmed, complete the exchange
    if (bothConfirmed) {

        // Get both items
        const [requestedItem, offeredItem] = await Promise.all([
            Item.findById(exchangeRequest.requestedItemId),
            Item.findById(exchangeRequest.offeredItemId)
        ]);

        // Check requested item
        if (!requestedItem) {
            throw new ApiError(
                404,
                "Requested item not found"
            );
        }

        // Check offered item
        if (!offeredItem) {
            throw new ApiError(
                404,
                "Offered item not found"
            );
        }

        // Mark exchange as completed
        exchangeRequest.status = "completed";

        // Now actual exchange is completed
        requestedItem.status = "Traded";
        offeredItem.status = "Traded";

        // Save everything
        await Promise.all([
            exchangeRequest.save(),
            requestedItem.save(),
            offeredItem.save()
        ]);

    } else {

        // Only one user has confirmed
        await exchangeRequest.save();
    }

    // 10. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                exchangeRequest,
                bothConfirmed
                    ? "Exchange completed successfully"
                    : "Exchange completion confirmed. Waiting for the other user."
            )
        );
});

const startExchangeChat = asyncHandler(async (req, res) => {

    // 1. Logged-in user
    const ownerId = req.user._id;

    // 2. Get request ID
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid exchange request ID"
        );
    }

    // 4. Find exchange request
    const exchangeRequest = await ExchangeRequest.findById(requestId);

    if (!exchangeRequest) {
        throw new ApiError(
            404,
            "Exchange request not found"
        );
    }

    // 5. Only owner can start chat
    if (
        exchangeRequest.ownerId.toString() !==
        ownerId.toString()
    ) {
        throw new ApiError(
            403,
            "Only the item owner can start this chat"
        );
    }

    // 6. Chat can only be started while request is pending
    if (exchangeRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Chat cannot be started because request is ${exchangeRequest.status}`
        );
    }

    // 7. Start chat
    exchangeRequest.chatStarted = true;

    await exchangeRequest.save();

    // 8. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                exchangeRequest,
                "Chat started successfully"
            )
        );
});
export {
    createExchangeRequest,
    acceptExchangeRequest,
    rejectExchangeRequest,
    cancelExchangeRequest,
    getExchangeHistory,
    getOutgoingExchangeRequests,
    getIncomingExchangeRequests,
    completeExchangeRequest,
    startExchangeChat

};