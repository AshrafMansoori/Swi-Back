import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
const userSchema = new Schema(
    {
        fullname: {
            type: String,
            required: true,
            lowercase: true,
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
        locationName: {
    type: String,
    trim: true
},
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
                required: true
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
                    message: "Coordinates must be [longitude, latitude]"
                }
            }
        },

        profileImage: {
            type: String,
            default: ""  //stored by frontend progammer if user does'nt give image  
        },
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        isVerified: {
            type: Boolean, //contact Number is verified or not
            default: false
        },
        trustScore: {   // based on completed transaction
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },
        refreshToken: {
            type: String
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        }
    }, {
    timestamps: true
}
)
userSchema.index({ location: "2dsphere" });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);


})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)