import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
const userSchema = new Schema(
    {
    fullname: {
        type: String,
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
    },
     location: {
        type: String
    },

    profileImage: {
        type: String,
        default: String  //stored by frontend progammer if user does'nt give image  
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

userSchema.pre("save",async function(){
    if(!this.isModified("password")) return ;
    this.password= await bcrypt.hash(this.password,10);
   

})

userSchema.methods.isPasswordCorrect=async function (password) {
    return await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            fullname:this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
           expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id:this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
           expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)