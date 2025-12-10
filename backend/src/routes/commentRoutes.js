import express from "express";
import { addComment, getCommentsByProduct } from "../controllers/commentController.js";

const router = express.Router();

router.post("/add", addComment);
router.get("/:product_id", getCommentsByProduct);

export default router;
