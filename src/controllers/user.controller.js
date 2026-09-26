import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { cookieOption } from "../constants.js";
import jwt from "jsonwebtoken"
import { Item } from "../models/items.modal.js";

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
    const { fullname, email, password, contactNumber, location ,locationName} = req.body;
    if (
        [fullname, email, password].some((feild) => !feild || feild.trim() === "")
    ) {
        throw new ApiError(400, "fullname,email,password all required")
    }
    const existedUser = await User.findOne({ email })
    if (existedUser) {
        throw new ApiError(409, "User Exist with this email");
    }

    const avatarLocalPath = req.file?.path;
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!location) {
        throw new ApiError(400, "location is required ")
    }
    let parsedLocation;

    try {
        parsedLocation = JSON.parse(location);
    } catch (error) {
        throw new ApiError(
            400,
            "Invalid location format"
        );
    }

    if (
        parsedLocation.type !== "Point" ||
        !Array.isArray(parsedLocation.coordinates) ||
        parsedLocation.coordinates.length !== 2
    ) {
        throw new ApiError(
            400,
            "Invalid location coordinates"
        );
    }

    const [longitude, latitude] = parsedLocation.coordinates;


    if (
        typeof longitude !== "number" ||
        typeof latitude !== "number"
    ) {
        throw new ApiError(
            400,
            "Coordinates must be numbers"
        );
    }
    // Coordinate range validation
    if (
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
    ) {
        throw new ApiError(
            400,
            "Invalid longitude or latitude"
        );
    }


    const user = await User.create({
        fullname,
        email,
        password,
        contactNumber: contactNumber || "",
        location: parsedLocation ,
        profileImage: avatar?.url || "",
        locationName: locationName?.trim() || ""

    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering user");
    }
    return res.status(201).json(new ApiResponse(201, createdUser, "User Register SuccessFully"))


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
    if (!oldPassword || !newPassword) {
        throw new ApiError(
            400,
            "Old password and new password are required"
        );
    }
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

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "user fetched Successfully")
        )
})

const updateFullname = asyncHandler(async (req, res) => {
    const { fullname } = req.body
    if (!fullname || fullname.trim() == "") {
        throw new ApiError(400, "fullname is required");
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname: fullname.trim()
            }
        }
    )
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200, {}, "Fullname Change SuccessFully"
            )
        )
})
const updateEmail = asyncHandler(async (req, res) => {
    const { email } = req.body
    if (!email || email.trim() == "") {
        throw new ApiError(400, "Email is required");
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                email
            }
        }
    )
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200, {}, "Email Change SuccessFully"
            )
        )
})

const updateProfileImage = asyncHandler(async (req, res) => {
    const profilePath = req.file?.path
    if (!profilePath) {
        throw new ApiError(400, "File is Missing");
    }
    const profile = await uploadOnCloudinary(profilePath)
    if (!profile?.url) {
        throw new ApiError(400, "Error while uploading file")
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                profileImage: profile?.url
            }
        })
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "profile Image change succesFully")
        )
})

const updateLocation = asyncHandler(async (req, res) => {

    const { longitude, latitude, locationName } = req.body;

    // 1. Check coordinates
    if (longitude === undefined || latitude === undefined) {
        throw new ApiError(
            400,
            "Longitude and latitude are required"
        );
    }

    // 2. Check number
    if (
        typeof longitude !== "number" ||
        typeof latitude !== "number"
    ) {
        throw new ApiError(
            400,
            "Longitude and latitude must be numbers"
        );
    }

    // 3. Longitude validation
    if (longitude < -180 || longitude > 180) {
        throw new ApiError(
            400,
            "Invalid longitude"
        );
    }

    // 4. Latitude validation
    if (latitude < -90 || latitude > 90) {
        throw new ApiError(
            400,
            "Invalid latitude"
        );
    }

    // 5. Location name validation
    if (!locationName || locationName.trim() === "") {
        throw new ApiError(
            400,
            "Location name is required"
        );
    }

    // 6. Update location
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                location: {
                    type: "Point",
                    coordinates: [longitude, latitude]
                },
                locationName: locationName.trim()
            }
        },
        {
            new: true,
            runValidators: true
        }
    );

    // 7. User check
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    location: user.location,
                    locationName: user.locationName
                },
                "Location updated successfully"
            )
        );
});

const updatecontactNumber = asyncHandler(async (req, res) => {
    const { contactNumber } = req.body;
    if (!contactNumber) {
        throw new ApiError(400, "Contact Number is required");
    }

    if (!/^\d{10}$/.test(contactNumber)) {
        throw new ApiError(400, "Enter a valid 10 digit Contact Number");
    }
    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                contactNumber
            }
        },
        {
            new: true
        }
    )
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Number  change SuccessFully ")
        )

})

const getPublicUserProfile = asyncHandler(async (req, res) => {

    const { userId } = req.params;

    const user = await User.findById(userId)
        .select("fullname profileImage location");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "User profile fetched successfully"
            )
        );
});

const getUserItems = asyncHandler(async (req, res) => {

    const { userId } = req.params;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const items = await Item.find({
        ownerId: userId
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                items,
                "User items fetched successfully"
            )
        );
});

const deleteAccount = asyncHandler(async (req, res) => {

    const { password } = req.body;


    if (!password || password.trim() === "") {
        throw new ApiError(400, "Password is required");
    }


    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }


    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect password");
    }


    const deletedUser = await User.findByIdAndDelete(req.user._id);


    if (!deletedUser) {
        throw new ApiError(
            500,
            "Something went wrong while deleting account"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Account deleted successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateFullname,
    updateEmail,
    updateProfileImage,
    updateLocation,
    updatecontactNumber,
    getPublicUserProfile,
    getUserItems,
    deleteAccount,
}