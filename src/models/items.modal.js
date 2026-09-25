import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const itemSchema = new Schema({
    ownerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    title: { 
        type: String, 
        required: true, 
        trim: true },
    description: { 
        type: String, 
        required: true ,
        trim:true
    },
    category: { 
        type: String, 
        required: true,
        trim:true
    }, // e.g., Electronics, Books, Furniture
    images: {
        type:[String],
        required:true,
        validate:{
            validator:arr=>arr.length>0,
            message:"Atleast one Image is required "
        }
    }, // Array of Cloudinary URLs
    condition: { 
        type: String, 
        enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'], 
        required: true 
    },

    // Core functionality selector
    listingType:{
        type: [{
        type: String,
        enum: ['Sell', 'Barter', 'Rent', 'Giveaway'] // Item ek se zyada type ka bhi ho sakta hai (e.g. Sell OR Barter)
    }],
    required:true,
    validate:{
        validator:arr=>arr.length>0,
        message:"At least one listning type is required "
    }
},

    // Type specific details
    price: { 
        type: Number ,
        min:0
    }, // Only if 'Sell' or 'Rent' is in listingType
    rentDetails: {
        pricePerDay: { type: Number ,min:0},
        securityDeposit: { type: Number,min:0 },
        maxDurationDays: { type: Number,min:1 }
    },
    barterPreferences: [
        { 
            type: String ,
            trim:true
        }
    ], // User iske badle kya chahta hai (e.g., ["Bicycle", "Laptop"])

    status: { 
        type: String, 
        enum: ['Available', 'Pending', 'Traded', 'Sold', 'Rented', 'Hidden'], 
        default: 'Available' },

    // Item specific location (if different from user's default)
    location: {
    type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
    },
    coordinates: {
        type: [Number],
        required: true,
        validate: {
            validator: function (arr) {
                return (
                    arr.length === 2 &&
                    arr[0] >= -180 &&
                    arr[0] <= 180 &&
                    arr[1] >= -90 &&
                    arr[1] <= 90
                );
            },
            message: "Coordinates must be [longitude, latitude] with valid ranges"
        }
    }
}
}, { timestamps: true }
);
itemSchema.index({location:"2dsphere"});
itemSchema.plugin(mongooseAggregatePaginate)
export const Item = mongoose.model("Item", itemSchema)