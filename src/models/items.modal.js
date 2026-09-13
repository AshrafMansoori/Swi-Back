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
        required: true 
    },
    category: { 
        type: String, 
        required: true 
    }, // e.g., Electronics, Books, Furniture
    images: { 
        type: String,
        required:true
    }, // Array of Cloudinary URLs
    condition: { 
        type: String, 
        enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'], 
        required: true 
    },

    // Core functionality selector
    listingType: [{
        type: String,
        enum: ['Sell', 'Barter', 'Rent', 'Giveaway'] // Item ek se zyada type ka bhi ho sakta hai (e.g. Sell OR Barter)
    }],

    // Type specific details
    price: { 
        type: Number 
    }, // Only if 'Sell' or 'Rent' is in listingType
    rentDetails: {
        pricePerDay: { type: Number },
        securityDeposit: { type: Number },
        maxDurationDays: { type: Number }
    },
    barterPreferences: [
        { 
            type: String 
        }
    ], // User iske badle kya chahta hai (e.g., ["Bicycle", "Laptop"])

    status: { 
        type: String, 
        enum: ['Available', 'Pending', 'Traded', 'Sold', 'Rented', 'Hidden'], 
        default: 'Available' },

    // Item specific location (if different from user's default)
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] }
    }
}, { timestamps: true }
)
itemSchema.plugin(mongooseAggregatePaginate)
export const Item = mongoose.model("Item", itemSchema)