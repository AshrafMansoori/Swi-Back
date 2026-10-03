import { Router } from "express";

import { verifiJWT } from "../middlewares/auth.middleware.js";

import {
    getChatMessages
} from "../controllers/message.controller.js";


const router = Router();


router.get(
    "/:transactionType/:transactionId",
    verifiJWT,
    getChatMessages
);


export default router;