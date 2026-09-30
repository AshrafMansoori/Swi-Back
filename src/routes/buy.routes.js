import { Router } from "express";

import {
    createPurchaseRequest,
    getIncomingPurchaseRequests,
    getOutgoingPurchaseRequests,
    acceptPurchaseRequest,
    rejectPurchaseRequest,
    cancelPurchaseRequest,
    getPurchaseHistory
} from "../controllers/buy.controller.js";

import { verifiJWT } from "../middlewares/auth.middleware.js";

const router = Router();


// Get purchase history
router
    .route("/history")
    .get(verifiJWT, getPurchaseHistory);


// Create purchase request
router
    .route("/request")
    .post(verifiJWT, createPurchaseRequest);


// Get incoming requests for seller
router
    .route("/incoming")
    .get(verifiJWT, getIncomingPurchaseRequests);


// Get outgoing requests for buyer
router
    .route("/outgoing")
    .get(verifiJWT, getOutgoingPurchaseRequests);


// Accept purchase request
router
    .route("/:requestId/accept")
    .patch(verifiJWT, acceptPurchaseRequest);


// Reject purchase request
router
    .route("/:requestId/reject")
    .patch(verifiJWT, rejectPurchaseRequest);


// Cancel purchase request
router
    .route("/:requestId/cancel")
    .patch(verifiJWT, cancelPurchaseRequest);


export default router;
