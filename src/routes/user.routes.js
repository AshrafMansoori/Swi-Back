import { Router } from "express";
import { registerUser,
     loginUser ,
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
     deleteAccount,
     getUserItems} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifiJWT } from "../middlewares/auth.middleware.js";
const router=Router()

router.route("/register").post(
    upload.single("avatar"),
    registerUser)

router.route("/login").post(loginUser)
router.route("/logout").get(verifiJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken);



router.route("/change-password").post(verifiJWT,changeCurrentPassword);
router.route("/current-user").get(verifiJWT,getCurrentUser);
router.route("/update-fullname").patch(verifiJWT,updateFullname);
router.route("/update-email").patch(verifiJWT,updateEmail);
router.route("/update-profile-image").patch(verifiJWT,upload.single("avatar"),updateProfileImage);
router.route("/update-location").patch(verifiJWT,updateLocation);
router.route("/update-contact-number").patch(verifiJWT,updatecontactNumber)
router.route("/user/:userId").get(verifiJWT,getPublicUserProfile);
router.route("/user/:userId/items").get(verifiJWT,getUserItems)
router.route("/delete-account").delete(verifiJWT,deleteAccount)
export default router