import dotenv from "dotenv";
import connectDB from "./database/db.js";
import { app } from "./app.js";
import http from "http";
import { setupWebSocket } from "./socket/socket.server.js";
import { WebSocketServer } from "ws";

dotenv.config({
    path: "./env"
})

const server = http.createServer(app);
const wss = new WebSocketServer({ server })

setupWebSocket(wss);

connectDB()
    .then(()=>{
        server.listen(process.env.PORT || 8000, () => {
            console.log(`   Server is Listenn On Port No.. ${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.log("Error Occur When Connecting with DataBase ", error)
    })