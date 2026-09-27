import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { Item } from "../models/items.modal.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";



const creatItem = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        category,
        condition,
        
        price,
        rentDetails,
        barterPreferences,


    } = req.body;

    let listingType=req.body.listingType;

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


const getHomeProducts = asyncHandler(async (req, res) => {

    const {
        sort = "recommended",
        category,
        listingType,
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
        .populate("ownerId", "fullname email contactNumber");

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
    updateItem,
    deleteItem

}


