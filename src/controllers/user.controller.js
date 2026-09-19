import {asyncHandler} from "../utils/asyncHandler.js"

const registerUser=asyncHandler(async(req,res)=>{
    res.status(200)
    .json({
        "status":"tassk one complete"
    })
})

export {registerUser}