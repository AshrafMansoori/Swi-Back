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


export {
    createExchangeRequest
};