import dotenv from "dotenv"
import connectDB from "./database/db.js"
import { app } from "./app.js"

dotenv.config({
    path:"./env"
})


connectDB()
.then(
    app.listen(process.env.PORT||8000,()=>{
        console.log(`   Server is Listenn On Port No.. ${process.env.PORT}`)
    })
)
.catch((error)=>{
    console.log("Error Occur When Connecting with DataBase ",error)
})