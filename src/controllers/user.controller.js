import { ApiError } from "../utils/ApiErrors.js";
import {asyncHandler} from "../utils/asyncHandler.js"
import{ User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser=asyncHandler(async(req,res)=>{
    const {fullname,email,password,contactNumber,location}=req.body;
    if(
        [fullname,email,password].some((feild)=>feild.trim()==="")
    ){
    throw new ApiError(400,"fullname,email,password all required")
    }
    const existedUser=await User.findOne({email})
    if(existedUser){
        throw new ApiError(409,"User Exist with this email");
    }
    console.log(req.file)
    const avatarLocalPath=req.file?.path;
    const avatar =await uploadOnCloudinary(avatarLocalPath)

    const user= await User.create({
        fullname,
        email,
        password,
        contactNumber:contactNumber||"",
        location:location||"",
        profileImage :avatar?.url||"",

    })
    const createdUser=await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser){
        throw  new ApiError(500,"something went wrong while registering user");
    }
    return res.status(201).json(new ApiResponse(200,createdUser,"User Register SuccessFully"))

   
})

export {registerUser}