import express from "express";
import { getCategories, getCategoryById, addCategory, updateCategory, deleteCategory } from "../controllers/categoryController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", authMiddleware, adminMiddleware, addCategory);
router.patch("/:id", authMiddleware, adminMiddleware, updateCategory);
router.delete("/:id", authMiddleware, adminMiddleware, deleteCategory);

export default router;
