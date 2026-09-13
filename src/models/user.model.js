import mongoose, { Schema } from "mongoose";
const userSchema = new Schema(
    {
    fullname: {
        type: String,
        unique: true,
        required: true,
        lowerCase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        lowerCase: true,
        trim: true,
    },
    contactNumber: {
        type: String
    }, location: {
        type: String
    },

    profileImage: {
        type: String,
        default: String  //stored by progammer if user does'n give image  
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    isVerified:{  
        type:Boolean, //contact Number is verified or not
        default:false
    },
    trustScore:{   // based on completed transaction
        type:Number,
        min:0,
        max:5,
        default:0,
    },
    refreshToken: {
        type: String
    },
    role:{
        type:String,
        enum:['user','admin'],
        default:'user'
    }},{
        timestamps: true
    }
)

export const User = mongoose.model("User", userSchema)