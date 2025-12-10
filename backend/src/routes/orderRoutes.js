import express from "express";
import { getOrders, getOrderById, placeOrder, getOrderDetails, updateOrderStatus } from "../controllers/orderController.js";
import { confirmPayment,refundPayment } from "../controllers/orderController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";

const router = express.Router();

// 🛒 **User & Admin có thể lấy danh sách đơn hàng**
router.get("/", authMiddleware, getOrders); 

// 🛒 **User lấy đơn hàng của mình**
router.get("/:id", authMiddleware, getOrderById);

// 🛍️ **Đặt hàng mới**
router.post("/", authMiddleware, placeOrder);

// 📦 **Lấy chi tiết đơn hàng**
router.get("/:id/details", authMiddleware, getOrderDetails);

// 🔄 **Cập nhật trạng thái đơn hàng (Admin)**
router.patch("/:id", authMiddleware, adminMiddleware, updateOrderStatus);
// 🔄 **Xác nhận thanh toán**
router.patch("/:id/payment", authMiddleware, confirmPayment);
// 🔄 **Hoàn tiền**
router.patch("/:id/refund", authMiddleware, refundPayment);
export default router;
