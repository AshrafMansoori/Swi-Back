import { Router } from "express";
import { verifiJWT } from "../middlewares/auth.middleware.js";
import {createExchangeRequest} from "../controllers/exchange.controller.js"

const router = Router();

router
    .route("/")
    .post(verifiJWT, createExchangeRequest);

export default router;