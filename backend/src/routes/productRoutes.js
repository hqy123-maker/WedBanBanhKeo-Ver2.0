import express from "express";
import { getAllProducts, getProductById, addProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
import { searchProducts } from "../controllers/productController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";

const router = express.Router();

// 📌 Lấy danh sách sản phẩm & chi tiết sản phẩm
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// 📌 Quản lý sản phẩm (Chỉ Admin)
router.post("/", authMiddleware, adminMiddleware, addProduct);
router.patch("/:id", authMiddleware, adminMiddleware, updateProduct);
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

router.get("/search", searchProducts);
export default router;
