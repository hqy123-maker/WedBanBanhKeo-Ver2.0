import express from "express";
import { register, login, logout, getUserProfile } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔐 Xác thực người dùng
router.post("/register", register); // Đăng ký tài khoản mới
router.post("/login", login); // Đăng nhập
router.post("/logout", authMiddleware, logout); // Đăng xuất (yêu cầu đăng nhập)
router.get("/profile", authMiddleware, getUserProfile); // Lấy thông tin người dùng

export default router;
