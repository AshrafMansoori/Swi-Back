import dotenv from "dotenv";
import connectDB from "./database/db.js";
import { app } from "./app.js";
import http from "http";
import { setupWebSocket } from "./socket/socket.server.js";
import { WebSocketServer } from "ws";

dotenv.config();

const server = http.createServer(app);

const wss = new WebSocketServer({
    server
});

setupWebSocket(wss);

const PORT = process.env.PORT || 8000;

connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Server is listening on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.log(
            "Error occurred when connecting with database:",
            error
        );
    });