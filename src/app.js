import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app=express();
app.use(cors(
    {
        origin(origin, callback) {
            const configuredOrigins = (process.env.CORS_ORIGIN || "")
                .split(",")
                .map((configuredOrigin) => configuredOrigin.trim().replace(/\/+$/, ""))
                .filter(Boolean);
            const allowedOrigins = [
                "https://swi-vastu.vercel.app",
                ...configuredOrigins,
            ];

            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(null, false);
        },
        credentials:true,
    }
))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//Routes

import userRouter from "./routes/user.routes.js";
import itemRouter from "./routes/item.routes.js"
import exchangeRequestRouter from "./routes/exchange.route.js"
import purchaseRouter from "./routes/buy.routes.js"
import rentRouter from "./routes/rent.routes.js";
import reviewRouter from "./routes/review.routes.js";
import messageRouter from "./routes/message.route.js";
import { errorHandler } from "./middlewares/error.middleware.js";

app.use("/api/v1/users",userRouter);
app.use("/api/v1/items",itemRouter)
app.use("/api/v1/exchange-requests",exchangeRequestRouter);
app.use("/api/v1/purchase", purchaseRouter);
app.use("/api/v1/rent",rentRouter);
app.use("/api/v1/reviews",reviewRouter);
app.use("/api/v1/messages",messageRouter);

app.use(errorHandler)
export{ app }