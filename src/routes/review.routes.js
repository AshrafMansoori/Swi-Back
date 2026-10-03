import { Router } from "express";

import {
    createExchangeReview,
    createPurchaseReview,
    createRentReview,
    getUserReviews
} from "../controllers/review.controller.js";

import { verifiJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router
    .route("/exchange")
    .post(verifiJWT, createExchangeReview);

router
    .route("/purchase")
    .post(verifiJWT, createPurchaseReview);

router
    .route("/rent")
    .post(verifiJWT, createRentReview);

router
    .route("/:userId")
    .get(getUserReviews);

export default router;