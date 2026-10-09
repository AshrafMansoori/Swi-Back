import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { Item } from "../models/items.modal.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";



const creatItem = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        category,
        condition,
    } = req.body;

    let listingType = req.body.listingType;

    if (
        typeof title !== "string" ||
        !title.trim() ||
        title.trim().length > 120 ||
        typeof description !== "string" ||
        !description.trim() ||
        description.trim().length > 5000 ||
        typeof category !== "string" ||
        !category.trim() ||
        category.trim().length > 60 ||
        typeof condition !== "string" ||
        !listingType
    ) {
        throw new ApiError(400, "Valid title, description, category, condition, and listing type are required");
    }
    if (!req.body.location) {
        throw new ApiError(400, "Location is required");
    }

    let location;
    try {
        location = JSON.parse(req.body.location);
    } catch {
        throw new ApiError(400, "Invalid location format");
    }

    if (
        location?.type !== "Point" ||
        !Array.isArray(location.coordinates) ||
        location.coordinates.length !== 2 ||
        !location.coordinates.every(Number.isFinite) ||
        location.coordinates[0] < -180 ||
        location.coordinates[0] > 180 ||
        location.coordinates[1] < -90 ||
        location.coordinates[1] > 90
    ) {
        throw new ApiError(400, "Location must contain valid [longitude, latitude] coordinates");
    }

    if (!Array.isArray(listingType)) {
        listingType = [listingType];
    }
    listingType = [...new Set(listingType.map((type) => String(type).toLowerCase()))];
    const allowedListingTypes = ["sell", "barter", "rent", "giveaway"];
    if (
        listingType.length === 0 ||
        listingType.some((type) => !allowedListingTypes.includes(type))
    ) {
        throw new ApiError(400, "Select one or more valid listing types");
    }

    const conditionValue = String(condition).trim();
    const allowedConditions = ["New", "Like New", "Good", "Fair", "Poor"];
    if (!allowedConditions.includes(conditionValue)) {
        throw new ApiError(400, "Select a valid item condition");
    }

    if (!Array.isArray(req.files) || req.files.length < 1 || req.files.length > 5) {
        throw new ApiError(400, "Upload between 1 and 5 item photos");
    }

    const priceValue = req.body.price === undefined || req.body.price === ""
        ? undefined
        : Number(req.body.price);
    if (priceValue !== undefined && (!Number.isFinite(priceValue) || priceValue < 0)) {
        throw new ApiError(400, "Price must be a valid non-negative amount");
    }
    if (listingType.includes("sell") && priceValue === undefined) {
        throw new ApiError(400, "A valid selling price is required");
    }

    let rentDetails;
    if (req.body.rentDetails) {
        try {
            rentDetails = JSON.parse(req.body.rentDetails);
        } catch {
            throw new ApiError(400, "Invalid rental details");
        }
    }
    if (listingType.includes("rent")) {
        if (
            !rentDetails ||
            typeof rentDetails !== "object" ||
            Array.isArray(rentDetails)
        ) {
            throw new ApiError(400, "Rental details are required");
        }
        const pricePerDay = Number(rentDetails.pricePerDay);
        const securityDeposit =
            rentDetails.securityDeposit === undefined ||
            rentDetails.securityDeposit === ""
                ? undefined
                : Number(rentDetails.securityDeposit);
        const maxDurationDays =
            rentDetails.maxDurationDays === undefined ||
            rentDetails.maxDurationDays === ""
                ? undefined
                : Number(rentDetails.maxDurationDays);

        if (!Number.isFinite(pricePerDay) || pricePerDay < 0) {
            throw new ApiError(400, "A valid daily rental price is required");
        }
        if (
            securityDeposit !== undefined &&
            (!Number.isFinite(securityDeposit) || securityDeposit < 0)
        ) {
            throw new ApiError(400, "Security deposit must be a valid non-negative amount");
        }
        if (
            maxDurationDays !== undefined &&
            (!Number.isInteger(maxDurationDays) || maxDurationDays < 1)
        ) {
            throw new ApiError(400, "Maximum rental duration must be a positive whole number");
        }

        rentDetails = {
            pricePerDay,
            ...(securityDeposit !== undefined && { securityDeposit }),
            ...(maxDurationDays !== undefined && { maxDurationDays }),
        };
    }

    let barterPreferences;
    if (req.body.barterPreferences) {
        try {
            barterPreferences = JSON.parse(req.body.barterPreferences);
        } catch {
            throw new ApiError(400, "Invalid exchange preferences");
        }
        if (
            !Array.isArray(barterPreferences) ||
            barterPreferences.length > 10 ||
            barterPreferences.some(
                (preference) =>
                    typeof preference !== "string" ||
                    !preference.trim() ||
                    preference.trim().length > 100
            )
        ) {
            throw new ApiError(400, "Exchange preferences must be a list of up to 10 options");
        }
        barterPreferences = barterPreferences.map((preference) => preference.trim());
    }
    if (listingType.includes("barter") && !barterPreferences?.length) {
        throw new ApiError(400, "Add at least one exchange preference");
    }

    const ownerId = req.user._id;
    const images = [];
    for (const file of req.files) {
        const response = await uploadOnCloudinary(file.path);
        if (!response?.secure_url) {
            throw new ApiError(502, "One or more item photos could not be uploaded");
        }
        images.push(response.secure_url);
    }

    const item = await Item.create({
        ownerId,
        title: title.trim(),
        description: description.trim(),
        images,
        category: category.trim().toLowerCase(),
        listingType,
        condition: conditionValue,
        price: priceValue,
        rentDetails,
        barterPreferences,
        location,
    });

    return res.
        status(201).
        json(
            new ApiResponse(201, { item }, "Item created successfully")
        )


})
const getHomeProducts = asyncHandler(async (req, res) => {

    const {
        sort = "recommended",
        category,
        listingType,
        q,
        longitude,
        latitude,
        page = 1,
        
    } = req.query;
    const limit = 20;
    if(page<0){
        throw new ApiError(400,"invalid pagination")
    }
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    
    // Pagination
    const skip = (pageNumber - 1) * limitNumber;

    // Base filter
    const filter = {
        status: "Available"
    };

    if (q !== undefined) {
        if (typeof q !== "string" || q.trim().length > 100) {
            throw new ApiError(400, "Search query must be 100 characters or fewer");
        }
        const escapedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (escapedQuery) {
            const searchPattern = new RegExp(escapedQuery, "i");
            filter.$or = [
                { title: searchPattern },
                { description: searchPattern },
                { category: searchPattern },
                { condition: searchPattern }
            ];
        }
    }

    // Category filter
    if (category) {
        filter.category = category;
    }

    // Type filter
    if (listingType) { filter.listingType = { $in: [listingType] }; }

    let products;

    // =========================
    // NEAREST
    // =========================
    if (sort === "nearest") {

        if (longitude === undefined || latitude === undefined) {
            throw new ApiError(
                400,
                "Longitude and latitude are required for nearest products"
            );
        }

        products = await Item.find({
            ...filter,
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [
                            Number(longitude),
                            Number(latitude)
                        ]
                    }
                }
            }
        })
            .skip(skip)
            .limit(limitNumber);
    }

    // =========================
    // NEWEST
    // =========================
    else if (sort === "newest") {

        products = await Item.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber);
    }

    // =========================
    // RECOMMENDED
    // =========================
    else {

        // For now:
        // Recommended = newest available products

        products = await Item.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    products,
                    page: pageNumber,
                    limit: limitNumber
                },
                "Home products fetched successfully"
            )
        );
});



const getSingleItem = asyncHandler(async (req, res) => {

    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
        throw new ApiError(400, "Invalid item ID");
    }

    const item = await Item.findById(itemId)
        .populate("ownerId", "fullname profileImage trustScore isVerified");

    if (!item) {
        throw new ApiError(404, "Item not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                item,
                "Item fetched successfully"
            )
        );
});

const getMyItems = asyncHandler(async (req, res) => {

    const ownerId = req.user._id;

    const items = await Item.find({ ownerId })
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                items,
                "My items fetched successfully"
            )
        );
});

const getLikedItems = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("likedItems");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const items = await Item.find({
        _id: { $in: user.likedItems },
        status: { $ne: "Hidden" }
    })
        .populate("ownerId", "fullname profileImage trustScore isVerified")
        .sort({ updatedAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, items, "Liked items fetched successfully")
    );
});

const setItemLiked = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { liked } = req.body;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
        throw new ApiError(400, "Invalid item ID");
    }
    if (typeof liked !== "boolean") {
        throw new ApiError(400, "A boolean liked value is required");
    }
    if (liked && !(await Item.exists({ _id: itemId, status: { $ne: "Hidden" } }))) {
        throw new ApiError(404, "Item not found");
    }

    const update = liked
        ? { $addToSet: { likedItems: itemId } }
        : { $pull: { likedItems: itemId } };
    const user = await User.findByIdAndUpdate(req.user._id, update, {
        new: true,
        projection: { likedItems: 1 }
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            { likedItems: user.likedItems },
            liked ? "Item saved" : "Item removed from saved items"
        )
    );
});

const updateItem = asyncHandler(async (req, res) => {

    const { itemId } = req.params;

    if (!itemId) {
        throw new ApiError(400, "Item ID is required");
    }


    if (!mongoose.Types.ObjectId.isValid(itemId)) {
        throw new ApiError(400, "Invalid item ID");
    }


    const item = await Item.findById(itemId);

    if (!item) {
        throw new ApiError(404, "Item not found");
    }


    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request");
    }

    if (item.ownerId.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "You are not allowed to update this item"
        );
    }


    const {
        title,
        description,
        category,
        listingType,
        location
    } = req.body;

    if (
        title === undefined &&
        description === undefined &&
        category === undefined &&
        listingType === undefined &&
        location === undefined
    ) {
        throw new ApiError(
            400,
            "At least one field is required to update"
        );
    }


    if (title !== undefined) {

        if (typeof title !== "string" || title.trim() === "") {
            throw new ApiError(
                400,
                "Title must be a non-empty string"
            );
        }

        item.title = title.trim();
    }


    if (description !== undefined) {

        if (
            typeof description !== "string" ||
            description.trim() === ""
        ) {
            throw new ApiError(
                400,
                "Description must be a non-empty string"
            );
        }

        item.description = description.trim();
    }

    if (category !== undefined) {

        if (
            typeof category !== "string" ||
            category.trim() === ""
        ) {
            throw new ApiError(
                400,
                "Category must be a non-empty string"
            );
        }

        item.category = category.trim();
    }

    if (listingType !== undefined) {

        if (!Array.isArray(listingType)) {
            throw new ApiError(
                400,
                "listingType must be an array"
            );
        }

        if (listingType.length === 0) {
            throw new ApiError(
                400,
                "listingType cannot be empty"
            );
        }

        item.listingType = listingType;
    }

    if (location !== undefined) {

        if (
            !location ||
            typeof location !== "object"
        ) {
            throw new ApiError(
                400,
                "Invalid location"
            );
        }

        if (location.type !== "Point") {
            throw new ApiError(
                400,
                "Location type must be Point"
            );
        }

        if (
            !Array.isArray(location.coordinates) ||
            location.coordinates.length !== 2
        ) {
            throw new ApiError(
                400,
                "Location coordinates must contain longitude and latitude"
            );
        }

        const [longitude, latitude] = location.coordinates;

        if (
            typeof longitude !== "number" ||
            typeof latitude !== "number"
        ) {
            throw new ApiError(
                400,
                "Longitude and latitude must be numbers"
            );
        }

        if (
            longitude < -180 ||
            longitude > 180
        ) {
            throw new ApiError(
                400,
                "Invalid longitude"
            );
        }

        if (
            latitude < -90 ||
            latitude > 90
        ) {
            throw new ApiError(
                400,
                "Invalid latitude"
            );
        }

        item.location = location;
    }

    const updatedItem = await item.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedItem,
                "Item updated successfully"
            )
        );
});

const deleteItem = asyncHandler(async (req, res) => {

    const { itemId } = req.params;

    if (!itemId) {
        throw new ApiError(400, "Item ID is required");
    }

    const item = await Item.findById(itemId);

    if (!item) {
        throw new ApiError(404, "Item not found");
    }

    // Check item owner
    if (item.ownerId.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "You are not authorized to delete this item"
        );
    }

    await Item.findByIdAndDelete(itemId);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Item deleted successfully"
            )
        );
});





export {
    creatItem,
    getHomeProducts,
    getSingleItem,
    getMyItems,
    getLikedItems,
    setItemLiked,
    updateItem,
    deleteItem

}
