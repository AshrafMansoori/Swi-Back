import mongoose from "mongoose";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { RentRequest } from "../models/rent.model.js";
import { Item } from "../models/items.modal.js";


const createRentRequest = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Borrower
    const borrowerId = req.user._id;

    // 2. Get data from body
    const {
        itemId,
        startDate,
        endDate
    } = req.body;

    // 3. Required fields check
    if (!itemId || !startDate || !endDate) {
        throw new ApiError(
            400,
            "itemId, startDate and endDate are required"
        );
    }

    // 4. Validate item ID
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
        throw new ApiError(
            400,
            "Invalid item ID"
        );
    }

    // 5. Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
    ) {
        throw new ApiError(
            400,
            "Invalid date format"
        );
    }

    // 6. End date must be after start date
    if (end <= start) {
        throw new ApiError(
            400,
            "End date must be after start date"
        );
    }

    // 7. Find item
    const item = await Item.findById(itemId);

    if (!item) {
        throw new ApiError(
            404,
            "Item not found"
        );
    }

    // 8. Borrower cannot rent own item
    if (
        item.ownerId.toString() === borrowerId.toString()
    ) {
        throw new ApiError(
            400,
            "You cannot rent your own item"
        );
    }

    // 9. Item must be available
    if (item.status !== "Available") {
        throw new ApiError(
            400,
            "Item is no longer available"
        );
    }

    // 10. Item must support Rent
    if (!item.listingType.includes("Rent")) {
        throw new ApiError(
            400,
            "This item is not available for rent"
        );
    }

    // 11. Check duplicate pending request
    const existingRequest = await RentRequest.findOne({
        borrowerId,
        itemId,
        status: "pending"
    });

    if (existingRequest) {
        throw new ApiError(
            409,
            "You already have a pending rent request for this item"
        );
    }

    // 12. Create rent request
    const rentRequest = await RentRequest.create({
        borrowerId,
        lenderId: item.ownerId,
        itemId,
        startDate: start,
        endDate: end,
        status: "pending"
    });

    // 13. Response
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                rentRequest,
                "Rent request sent successfully"
            )
        );
});

const getIncomingRentRequests = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Lender
    const lenderId = req.user._id;

    // 2. Find pending requests received by lender
    const requests = await RentRequest.find({
        lenderId: lenderId,
        status: "pending"
    })
        // Borrower information
        .populate(
            "borrowerId",
            "fullname profileImage"
        )

        // Item information
        .populate(
            "itemId",
            "title images condition"
        )

        // Latest requests first
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
                "Incoming rent requests fetched successfully"
            )
        );
});

const getOutgoingRentRequests = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Borrower
    const borrowerId = req.user._id;

    // 2. Find pending requests sent by borrower
    const requests = await RentRequest.find({
        borrowerId: borrowerId,
        status: "pending"
    })
        // Lender information
        .populate(
            "lenderId",
            "fullname profileImage"
        )

        // Item information
        .populate(
            "itemId",
            "title images condition"
        )

        // Latest requests first
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
                "Outgoing rent requests fetched successfully"
            )
        );
});

const acceptRentRequest = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Lender
    const lenderId = req.user._id;

    // 2. Get request ID
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid rent request ID"
        );
    }

    // 4. Find rent request
    const rentRequest = await RentRequest.findById(requestId);

    if (!rentRequest) {
        throw new ApiError(
            404,
            "Rent request not found"
        );
    }

    // 5. Only pending request can be accepted
    if (rentRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Rent request is already ${rentRequest.status}`
        );
    }

    // 6. Only lender can accept
    if (
        rentRequest.lenderId.toString() !== lenderId.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to accept this rent request"
        );
    }

    // 7. Find item
    const item = await Item.findById(
        rentRequest.itemId
    );

    if (!item) {
        throw new ApiError(
            404,
            "Item not found"
        );
    }

    // 8. Item must support Rent
    if (!item.listingType.includes("Rent")) {
        throw new ApiError(
            400,
            "This item is not available for rent"
        );
    }

    // 9. Item must be available
    if (item.status !== "Available") {
        throw new ApiError(
            400,
            "Item is no longer available"
        );
    }

    // 10. Check overlapping accepted rent
    const overlappingRequest = await RentRequest.findOne({
        itemId: rentRequest.itemId,
        status: "accepted",

        startDate: {
            $lt: rentRequest.endDate
        },

        endDate: {
            $gt: rentRequest.startDate
        }
    });

    if (overlappingRequest) {
        throw new ApiError(
            409,
            "Item is already rented for the requested dates"
        );
    }

    // 11. Accept request
    rentRequest.status = "accepted";

    // 12. Change Item status
    item.status = "Rented";

    // 13. Save both
    await Promise.all([
        rentRequest.save(),
        item.save()
    ]);

    // 14. Response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                rentRequest,
                "Rent request accepted successfully"
            )
        );
});

const rejectRentRequest = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Lender
    const lenderId = req.user._id;

    // 2. Get request ID from URL
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid rent request ID"
        );
    }

    // 4. Find rent request
    const rentRequest = await RentRequest.findById(requestId);

    if (!rentRequest) {
        throw new ApiError(
            404,
            "Rent request not found"
        );
    }

    // 5. Only pending request can be rejected
    if (rentRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Rent request is already ${rentRequest.status}`
        );
    }

    // 6. Only lender can reject
    if (
        rentRequest.lenderId.toString() !== lenderId.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to reject this rent request"
        );
    }

    // 7. Reject request
    rentRequest.status = "rejected";

    // 8. Save request
    await rentRequest.save();

    // 9. Response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                rentRequest,
                "Rent request rejected successfully"
            )
        );
});

const cancelRentRequest = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Borrower
    const borrowerId = req.user._id;

    // 2. Get request ID from URL
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid rent request ID"
        );
    }

    // 4. Find rent request
    const rentRequest = await RentRequest.findById(requestId);

    if (!rentRequest) {
        throw new ApiError(
            404,
            "Rent request not found"
        );
    }

    // 5. Only pending request can be cancelled
    if (rentRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Rent request is already ${rentRequest.status}`
        );
    }

    // 6. Only the borrower who created the request can cancel
    if (
        rentRequest.borrowerId.toString() !== borrowerId.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to cancel this rent request"
        );
    }

    // 7. Cancel request
    rentRequest.status = "cancelled";

    // 8. Save request
    await rentRequest.save();

    // 9. Send response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                rentRequest,
                "Rent request cancelled successfully"
            )
        );
});

const returnRentItem = asyncHandler(async (req, res) => {

    // 1. Logged-in user
    const userId = req.user._id;

    // 2. Get request ID from URL
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid rent request ID"
        );
    }

    // 4. Find rent request
    const rentRequest = await RentRequest.findById(requestId);

    if (!rentRequest) {
        throw new ApiError(
            404,
            "Rent request not found"
        );
    }

    // 5. Rent must be accepted
    if (rentRequest.status !== "accepted") {
        throw new ApiError(
            400,
            `Item cannot be returned because request is ${rentRequest.status}`
        );
    }

    // 6. Check whether user is borrower or lender
    const isBorrower =
        rentRequest.borrowerId.toString() === userId.toString();

    const isLender =
        rentRequest.lenderId.toString() === userId.toString();

    if (!isBorrower && !isLender) {
        throw new ApiError(
            403,
            "You are not part of this rental"
        );
    }

    // 7. Mark current user's confirmation

    if (isBorrower) {

        if (rentRequest.completion.borrowerConfirmed) {
            throw new ApiError(
                400,
                "You have already confirmed the return"
            );
        }

        rentRequest.completion.borrowerConfirmed = true;
    }

    if (isLender) {

        if (rentRequest.completion.lenderConfirmed) {
            throw new ApiError(
                400,
                "You have already confirmed the return"
            );
        }

        rentRequest.completion.lenderConfirmed = true;
    }

    // 8. Check whether both users confirmed
    const bothConfirmed =
        rentRequest.completion.borrowerConfirmed &&
        rentRequest.completion.lenderConfirmed;

    // 9. If both confirmed, mark rental as returned
    if (bothConfirmed) {

        // Find item
        const item = await Item.findById(
            rentRequest.itemId
        );

        if (!item) {
            throw new ApiError(
                404,
                "Item not found"
            );
        }

        // Item should currently be rented
        if (item.status !== "Rented") {
            throw new ApiError(
                400,
                "Item is not currently rented"
            );
        }

        // Mark rental as returned
        rentRequest.status = "returned";

        // Make item available again
        item.status = "Available";

        // Save both
        await Promise.all([
            rentRequest.save(),
            item.save()
        ]);

    } else {

        // Only one user confirmed
        await rentRequest.save();
    }

    // 10. Response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                rentRequest,
                bothConfirmed
                    ? "Item return completed successfully"
                    : "Return confirmed. Waiting for the other user."
            )
        );
});

const getRentHistory = asyncHandler(async (req, res) => {

    // 1. Logged-in user
    const userId = req.user._id;

    // 2. Find requests where user is borrower OR lender
    const rentHistory = await RentRequest.find({
        $or: [
            { borrowerId: userId },
            { lenderId: userId }
        ],
        status: {
            $in: [
                "accepted",
                "rejected",
                "cancelled",
                "returned"
            ]
        }
    })

        // Borrower information
        .populate(
            "borrowerId",
            "fullname profileImage"
        )

        // Lender information
        .populate(
            "lenderId",
            "fullname profileImage"
        )

        // Item information
        .populate(
            "itemId",
            "title images condition"
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
                rentHistory,
                "Rent history fetched successfully"
            )
        );
});

const startRentChat = asyncHandler(async (req, res) => {

    // 1. Logged-in user = Lender
    const lenderId = req.user._id;

    // 2. Get request ID
    const { requestId } = req.params;

    // 3. Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError(
            400,
            "Invalid rent request ID"
        );
    }

    // 4. Find rent request
    const rentRequest = await RentRequest.findById(requestId);

    if (!rentRequest) {
        throw new ApiError(
            404,
            "Rent request not found"
        );
    }

    // 5. Only pending request can start chat
    if (rentRequest.status !== "pending") {
        throw new ApiError(
            400,
            `Chat cannot be started because rent request is ${rentRequest.status}`
        );
    }

    // 6. Only lender can start chat
    if (
        rentRequest.lenderId.toString() !== lenderId.toString()
    ) {
        throw new ApiError(
            403,
            "Only the lender can start this chat"
        );
    }

    // 7. Start chat
    rentRequest.chatStarted = true;

    // 8. Save request
    await rentRequest.save();

    // 9. Response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                rentRequest,
                "Rent chat started successfully"
            )
        );
});
export {
    createRentRequest,
    getIncomingRentRequests,
    getOutgoingRentRequests,
    acceptRentRequest,
    rejectRentRequest,
    cancelRentRequest,
    returnRentItem,
    getRentHistory,
    startRentChat
    
};