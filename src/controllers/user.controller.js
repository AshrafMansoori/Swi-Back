import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { cookieOption } from "../constants.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        console.log(accessToken)
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something Went wrong while generating Access and refresh token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, password, contactNumber, location } = req.body;
    if (
        [fullname, email, password].some((feild) => !feild || feild.trim() === "")
    ) {
        throw new ApiError(400, "fullname,email,password all required")
    }
    const existedUser = await User.findOne({ email })
    if (existedUser) {
        throw new ApiError(409, "User Exist with this email");
    }
    console.log(req.file)
    const avatarLocalPath = req.file?.path;
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const user = await User.create({
        fullname,
        email,
        password,
        contactNumber: contactNumber || "",
        location: location || "",
        profileImage: avatar?.url || "",

    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering user");
    }
    return res.status(201).json(new ApiResponse(200, createdUser, "User Register SuccessFully"))


})

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!(email && password)) {
        throw new ApiError(400, "Email and Password both is Required");
    }
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User Not Found");
    }
    const validPassword = await user.isPasswordCorrect(password);
    if (!validPassword) {
        throw new ApiError(401, "Password or Email is wrong");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOption)
        .cookie("refreshToken", refreshToken, cookieOption)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Logged In Successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }

    )
    return res
        .status(200)
        .clearCookie("accessToken", cookieOption)
        .clearCookie("refreshToken", cookieOption)
        .json(
            new ApiResponse(200, {}, "User LoggedOut SuccessFully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incommingRefreshToken) {
        throw new ApiError(401, "Unathorised Request");
    }
    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
        if (incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "RefreshToken is expired Or Used");

        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOption)
            .cookie("refreshToken", newRefreshToken, cookieOption)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    },
                    "AccessToken refreshed  "
                )
            )
    } catch (error) {
        throw new ApiError(400, error?.message, "Invalid AccessToken")
    }

}
)

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "user not found")
    }
    const passwordValid = await user.isPasswordCorrect(oldPassword);
    if (!passwordValid) {
        throw new ApiError(400, "incorrect password")
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false })
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password change Successfully"))


})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "user fetched Successfully")
        )
})

const updateFullname = asyncHandler(async (req,res) => {
    const { fullname } = req.body
    if (!fullname || fullname.trim() == "") {
        throw new ApiError(400, "fullname is required");
    }
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname:fullname.trim()
            }
        }
    )
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,{},"Fullname Change SuccessFully"
        )
    )
})
const updateEmail = asyncHandler(async (req,res) => {
    const { email } = req.body
    if (!fullname || fullname.trim() == "") {
        throw new ApiError(400, "Email is required");
    }
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                email
            }
        }
    )
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,{},"Email Change SuccessFully"
        )
    )
})

const updateProfileImage=asyncHandler(async(req,res)=>{
    const profilePath=req.file?.path
    if(!profilePath){
        throw new ApiError(400,"File is Missing");
    }
    const profile=await uploadOnCloudinary(profilePath)
    if(!profile.url){
        throw new ApiError(400,"Error while uploading file")
    }
    await User.findByIdAndUpdate(
        req.user._id,
    {
        $set:{
            profileImage:profile?.url
        }
    })
    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"profile Image change succesFully")
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser
}