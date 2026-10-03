import { Router } from "express";
import { verifiJWT } from "../middlewares/auth.middleware.js";

import {
    createExchangeRequest,
    acceptExchangeRequest,
    rejectExchangeRequest,
    cancelExchangeRequest,
    completeExchangeRequest,
    getExchangeHistory,
    getIncomingExchangeRequests,
    getOutgoingExchangeRequests,
    startExchangeChat
} from "../controllers/exchange.controller.js";

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
    .route("/:requestId/complete")
    .patch(verifiJWT, completeExchangeRequest);

router
    .route("/history")
    .get(verifiJWT, getExchangeHistory);

router
    .route("/incoming")
    .get(verifiJWT, getIncomingExchangeRequests);

router
    .route("/outgoing")
    .get(verifiJWT, getOutgoingExchangeRequests);


router.route("/:requestId/chat").patch(verifiJWT,startExchangeChat);
export default router;