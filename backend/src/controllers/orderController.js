// src/controllers/orderController.js
import prisma from "../config/prisma.js";

//  Lấy danh sách đơn hàng
export const getOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "admin";

    const orders = await prisma.order.findMany({
      where: isAdmin ? {} : { userId },
      include: {
        orderDetails: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(orders);
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn hàng:", error);
    res.status(500).json({ message: "Lỗi lấy danh sách đơn hàng" });
  }
};

//  Lấy đơn hàng theo ID
export const getOrderById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "admin";
    const id = Number(req.params.id);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderDetails: { include: { product: true } }
      }
    });

    if (!order || (!isAdmin && order.userId !== userId)) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    res.json(order);
  } catch (error) {
    console.error("Lỗi lấy đơn hàng:", error);
    res.status(500).json({ message: "Lỗi lấy đơn hàng" });
  }
};

//  Cập nhật trạng thái đơn hàng (Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["confirmed", "shipped", "delivered", "canceled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const order = await prisma.order.findUnique({ where: { id: Number(id) } });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Chỉ có thể cập nhật đơn hàng đang pending" });
    }

    await prisma.order.update({ where: { id: Number(id) }, data: { status } });
    res.json({ message: "Cập nhật trạng thái đơn hàng thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái đơn hàng:", error);
    res.status(500).json({ message: "Lỗi cập nhật trạng thái đơn hàng" });
  }
};

//  Hủy đơn hàng
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: { orderDetails: true }
    });
    if (!order || order.userId !== userId) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Chỉ có thể hủy đơn hàng đang pending" });
    }

    // Trả lại hàng về kho
    await Promise.all(order.orderDetails.map(item =>
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      })
    ));

    await prisma.order.update({ where: { id: Number(id) }, data: { status: "canceled" } });

    res.json({ message: "Đơn hàng đã được hủy" });
  } catch (error) {
    console.error("Lỗi hủy đơn hàng:", error);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

//  Đặt hàng
export const placeOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { items, totalPrice, paymentMethod } = req.body;

    if (!userId) throw new Error("Chưa đăng nhập");
    if (!items || items.length === 0) return res.status(400).json({ message: "Giỏ hàng trống" });

    const validMethods = ["credit_card", "paypal", "bank_transfer", "cod"];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
    }

    // Tạo đơn hàng với transaction
    const order = await prisma.$transaction(async prisma => {
      // Kiểm tra tồn kho
      for (let item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Sản phẩm ${item.productId} không tồn tại`);
        if (product.stock < item.quantity) throw new Error(`Sản phẩm ${item.productId} không đủ tồn kho`);
      }

      const newOrder = await prisma.order.create({
        data: {
          userId,
          totalPrice,
          status: "pending",
          paymentStatus: "completed",
          paymentMethod,
          orderDetails: {
            create: items.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price
            }))
          }
        }
      });

      // Cập nhật stock
      await Promise.all(items.map(i =>
        prisma.product.update({
          where: { id: i.productId },
          data: { stock: { decrement: i.quantity } }
        })
      ));

      return newOrder;
    });

    // Xóa giỏ hàng (nếu có)
    await prisma.cart.deleteMany({ where: { userId } });

    res.status(201).json({ message: "Đặt hàng thành công", orderId: order.id });
  } catch (error) {
    console.error("Lỗi đặt hàng:", error);
    res.status(500).json({ message: error.message || "Lỗi hệ thống khi đặt hàng" });
  }
};

//  Thống kê đơn hàng (Admin)
export const getStats = async (req, res) => {
  try {
    const stats = await prisma.order.aggregate({
      _count: { id: true },
      _sum: { totalPrice: true }
    });

    const statusCounts = await prisma.order.groupBy({
      by: ["status"],
      _count: { status: true }
    });

    res.json({ ...stats, statusCounts });
  } catch (error) {
    console.error("Lỗi lấy thống kê đơn hàng:", error);
    res.status(500).json({ message: "Lỗi lấy thống kê đơn hàng" });
  }
};
