import { Router } from "express";
import { verifiJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { creatItem, deleteItem, getHomeProducts, getMyItems, getLikedItems, setItemLiked, getSingleItem, updateItem } from "../controllers/item.controller.js";


const router=Router();

router.route("/item").post(verifiJWT,upload.array("images",5),creatItem);
router.route("/home").get(getHomeProducts);
router.route("/my-items").get(verifiJWT ,getMyItems);
router.route("/liked-items").get(verifiJWT, getLikedItems);
router.route("/:itemId/like").put(verifiJWT, setItemLiked);
router.route("/:itemId").get(getSingleItem)
                        .patch(verifiJWT,updateItem)
                        .delete(verifiJWT,deleteItem)

export default router