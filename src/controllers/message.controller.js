import mongoose from "mongoose";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { Message } from "../models/message.model.js";

import { ExchangeRequest } from "../models/exchange.modal.js";
import { PurchaseRequest } from "../models/buy.modal.js";
import { RentRequest } from "../models/rent.model.js";


export const getChatMessages = asyncHandler(async (req, res) => {

    const { transactionType, transactionId } = req.params;

    const userId = req.user._id;


    // ==============================
    // VALIDATE TRANSACTION TYPE
    // ==============================

    if (
        ![
            "exchange",
            "purchase",
            "rent"
        ].includes(transactionType)
    ) {

        throw new ApiError(
            400,
            "Invalid transaction type"
        );

    }


    // ==============================
    // VALIDATE TRANSACTION ID
    // ==============================

    if (
        !mongoose.Types.ObjectId.isValid(
            transactionId
        )
    ) {

        throw new ApiError(
            400,
            "Invalid transaction ID"
        );

    }


    // ==============================
    // FIND TRANSACTION
    // ==============================

    let transaction;

    if (transactionType === "exchange") {

        transaction =
            await ExchangeRequest.findById(
                transactionId
            );

    }
    else if (transactionType === "purchase") {

        transaction =
            await PurchaseRequest.findById(
                transactionId
            );

    }
    else if (transactionType === "rent") {

        transaction =
            await RentRequest.findById(
                transactionId
            );

    }


    // ==============================
    // TRANSACTION EXISTS?
    // ==============================

    if (!transaction) {

        throw new ApiError(
            404,
            "Transaction not found"
        );

    }


    // ==============================
    // CHECK USER PARTICIPANT
    // ==============================

    let isParticipant = false;


    if (transactionType === "exchange") {

        isParticipant =
            transaction.requesterId.toString() ===
                userId.toString() ||

            transaction.ownerId.toString() ===
                userId.toString();

    }
    else if (transactionType === "purchase") {

        isParticipant =
            transaction.buyerId.toString() ===
                userId.toString() ||

            transaction.sellerId.toString() ===
                userId.toString();

    }
    else if (transactionType === "rent") {

        isParticipant =
            transaction.borrowerId.toString() ===
                userId.toString() ||

            transaction.lenderId.toString() ===
                userId.toString();

    }


    if (!isParticipant) {

        throw new ApiError(
            403,
            "You are not part of this conversation"
        );

    }


    // ==============================
    // GET CHAT MESSAGES
    // ==============================

    const messages = await Message.find({

        transactionId: transactionId,

        transactionType: transactionType

    })
    .sort({
        createdAt: 1
    })
    .populate(
        "senderId",
        "fullname profileImage"
    );


    // ==============================
    // RESPONSE
    // ==============================

    return res.status(200).json(

        new ApiResponse(
            200,
            messages,
            "Chat messages fetched successfully"
        )

    );

});