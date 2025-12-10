import express from "express";
import { placeOrder, getOrders, getOrderById, getOrderDetails, updateOrderStatus, cancelOrder } from "../controllers/orderController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// 📌 Lấy danh sách đơn hàng (User chỉ thấy đơn của họ)
router.get("/", authMiddleware, getOrders);

// 📌 Lấy chi tiết đơn hàng (kèm danh sách sản phẩm)
router.get("/:id", authMiddleware, getOrderById);
router.get("/:id/details", authMiddleware, getOrderDetails);

// 📌 Đặt hàng mới
router.post("/", authMiddleware, placeOrder);

// 📌 Cập nhật trạng thái đơn hàng (User có thể hủy, Admin có thể duyệt)
router.patch("/:id/status", authMiddleware, updateOrderStatus);

// 📌 Hủy đơn hàng (User chỉ có thể hủy nếu đơn hàng đang "pending")
router.patch("/:id/cancel", authMiddleware, cancelOrder);

export default router;
