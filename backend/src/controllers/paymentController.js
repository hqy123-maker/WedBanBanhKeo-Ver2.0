import prisma from "../config/prisma.js";

//  Tạo đơn hàng mới từ giỏ hàng (Prisma)
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    // Lấy sản phẩm từ giỏ hàng
    const cartItems = await prisma.cart.findMany({
      where: { user_id: userId },
      include: { product: true },
    });

    if (cartItems.length === 0) return res.status(400).json({ message: "Giỏ hàng trống" });

    let total_price = 0;
    for (const item of cartItems) {
      if (item.quantity > item.product.stock) {
        return res.status(400).json({ message: `Không đủ hàng cho sản phẩm ID ${item.product_id}` });
      }
      total_price += item.quantity * item.product.price;
    }

    // Transaction
    const order = await prisma.$transaction(async (tx) => {
      // Tạo đơn hàng
      const newOrder = await tx.orders.create({
        data: { user_id: userId, total_price, status: "pending", payment_status: "pending" },
      });

      // Thêm chi tiết đơn hàng & cập nhật kho
      for (const item of cartItems) {
        await tx.order_details.create({
          data: {
            order_id: newOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.product.price,
          },
        });

        await tx.products.update({
          where: { id: item.product_id },
          data: { stock: item.product.stock - item.quantity },
        });
      }

      // Xóa giỏ hàng
      await tx.cart.deleteMany({ where: { user_id: userId } });

      return newOrder;
    });

    res.status(201).json({ message: "Đặt hàng thành công", order_id: order.id });
  } catch (error) {
    console.error("Lỗi tạo đơn hàng:", error);
    res.status(500).json({ message: error.message || "Lỗi hệ thống khi tạo đơn hàng" });
  }
};

//  Hủy đơn hàng (Prisma)
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // Lấy đơn hàng
    const order = await prisma.orders.findFirst({
      where: { id: parseInt(id), user_id: userId },
      include: { order_details: true },
    });

    if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });
    if (order.status !== "pending") return res.status(400).json({ message: "Chỉ có thể hủy đơn hàng đang chờ xử lý" });
    if (order.payment_status === "completed") return res.status(400).json({ message: "Không thể hủy đơn hàng đã thanh toán" });

    // Transaction
    await prisma.$transaction(async (tx) => {
      // Trả hàng về kho
      for (const item of order.order_details) {
        await tx.products.update({
          where: { id: item.product_id },
          data: { stock: { increment: item.quantity } },
        });
      }

      // Cập nhật trạng thái đơn hàng
      await tx.orders.update({
        where: { id: order.id },
        data: { status: "canceled", payment_status: "refunded" },
      });
    });

    res.json({ message: "Hủy đơn hàng thành công" });
  } catch (error) {
    console.error("Lỗi hủy đơn hàng:", error);
    res.status(500).json({ message: error.message || "Lỗi hệ thống khi hủy đơn hàng" });
  }
};
