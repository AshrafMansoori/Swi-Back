import { Router } from "express";
import { verifiJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { creatItem } from "../controllers/item.controller.js";


const router=Router();

router.route("/item").post(verifiJWT,upload.array("images",5),creatItem)


export default router