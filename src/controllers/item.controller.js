import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { Item } from "../models/items.modal.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";



const creatItem = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        category,
        condition,
        listingType,
        price,
        rentDetails,
        barterPreferences,


    } = req.body;


    if (!title || !description || !category || !condition || !listingType) {
        throw new ApiError(400, "Required Feild is missing")
    }
    if (!req.body.location) {
        throw new ApiError(400, "Location is required ")
    }
    const location = JSON.parse(req.body.location)
    if (!Array.isArray(listingType)) {
        listingType = [listingType];
    }
    const ownerId = req.user._id;

    let images = []
    for (const file of req.files) {
        const response = await uploadOnCloudinary(file.path);
        if (response) {
            images.push(response.url);
        }
    }
    const item = await Item.create({
        ownerId,
        title,
        description,
        images,
        category,
        listingType,
        condition,
        price,
        rentDetails,
        barterPreferences,
        location,
    })

    return res.
        status(200).
        json(
            new ApiResponse(200, { item }, "item create successfully")
        )


})

export {
    creatItem
}


