import { Router } from "express";
import { verifiJWT } from "../middlewares/auth.middleware.js";
import {
    createExchangeRequest,
    acceptExchangeRequest, 
    rejectExchangeRequest,
    cancelExchangeRequest,
    getExchangeHistory,
    getIncomingExchangeRequests,
    getOutgoingExchangeRequests
} from "../controllers/exchange.controller.js"

const router = Router();

router
    .route("/")
    .post(verifiJWT, createExchangeRequest);

router
    .route("/:requestId/accept")
    .patch(verifiJWT, acceptExchangeRequest);

router
    .route("/:requestId/reject")
    .patch(verifiJWT, rejectExchangeRequest);
router
    .route("/:requestId/cancel")
    .patch(verifiJWT, cancelExchangeRequest);

router
    .route("/history")
    .get(verifiJWT, getExchangeHistory);

router
    .route("/incoming")
    .get(verifiJWT, getIncomingExchangeRequests);

router
    .route("/outgoing")
    .get(verifiJWT, getOutgoingExchangeRequests);
export default router;