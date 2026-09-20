import { ApiError } from "../utils/ApiErrors.js";
import {asyncHandler} from "../utils/asyncHandler.js"
import{ User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { cookieOption } from "../constants.js";

const generateAccessAndRefreshToken=async(userId)=>{
        try {
            const user=await User.findById(userId);
            const accessToken=user.generateAccessToken();
            console.log(accessToken)
            const refreshToken=user.generateRefreshToken();
            user.refreshToken=refreshToken;
            await user.save({validateBeforeSave:false})
            return {accessToken,refreshToken}

        } catch (error) {
            throw new ApiError(500,"Something Went wrong while generating Access and refresh token")
        }
}

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

const loginUser=asyncHandler(async (req,res) => {
    const {email,password}=req.body
    if(!(email && password)){
        throw new ApiError(400,"Email and Password both is Required");
    }
    const user=await User.findOne({email});
    if(!user){
        throw new ApiError(404,"User Not Found");
    }
    const validPassword=await user.isPasswordCorrect(password);
    if(!validPassword){
        throw new ApiError(401,"Password or Email is wrong");
    }
    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);
    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")
    return res
    .status(200)
    .cookie("accessToken",accessToken,cookieOption)
    .cookie("refreshToken",refreshToken,cookieOption)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User Logged In Successfully"
        )
    )
})

const logoutUser=asyncHandler(async(req,res)=>{
    await  User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
             refreshToken:1   
            }
        },
        {
            new:true
        }
    
    )
    return res
    .status(200)
    .clearCookie("accessToken",cookieOption)
    .clearCookie("refreshToken",cookieOption)
    .json(
        new ApiResponse(200,{},"User LoggedOut SuccessFully")
    )
})



export {
    registerUser,
    loginUser,
    logoutUser
}