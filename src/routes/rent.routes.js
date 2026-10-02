import { Router } from "express";

import {
    createRentRequest,
    getIncomingRentRequests,
    getOutgoingRentRequests,
    acceptRentRequest,
    rejectRentRequest,
    cancelRentRequest,
    returnRentItem,
    getRentHistory
} from "../controllers/rent.controller.js";

import { verifiJWT } from "../middlewares/auth.middleware.js";

const router = Router();


// ========================================
// CREATE RENT REQUEST
// ========================================

router.post(
    "/request",
    verifiJWT,
    createRentRequest
);


// ========================================
// INCOMING RENT REQUESTS - LENDER
// ========================================

router.get(
    "/incoming",
    verifiJWT,
    getIncomingRentRequests
);


// ========================================
// OUTGOING RENT REQUESTS - BORROWER
// ========================================

router.get(
    "/outgoing",
    verifiJWT,
    getOutgoingRentRequests
);


// ========================================
// ACCEPT RENT REQUEST - LENDER
// ========================================

router.patch(
    "/request/:requestId/accept",
    verifiJWT,
    acceptRentRequest
);


// ========================================
// REJECT RENT REQUEST - LENDER
// ========================================

router.patch(
    "/request/:requestId/reject",
    verifiJWT,
    rejectRentRequest
);


// ========================================
// CANCEL RENT REQUEST - BORROWER
// ========================================

router.patch(
    "/request/:requestId/cancel",
    verifiJWT,
    cancelRentRequest
);


// ========================================
// RETURN RENTED ITEM - BORROWER
// ========================================

router.patch(
    "/request/:requestId/return",
    verifiJWT,
    returnRentItem
);


// ========================================
// RENT HISTORY
// ========================================

router.get(
    "/history",
    verifiJWT,
    getRentHistory
);


export default router;