// src/controllers/cartController.js
import prisma from "../config/prisma.js";

//  Lấy giỏ hàng của người dùng
export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: {
        product: { select: { id: true, name: true, price: true, imageUrl: true } },
      },
    });

    const cart = cartItems.map(item => ({
      id: item.id,
      quantity: item.quantity,
      productId: item.productId,
      product: item.product,
      totalPrice: item.quantity * item.product.price,
    }));

    res.json({ cart });
  } catch (error) {
    console.error("Lỗi lấy giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi lấy giỏ hàng" });
  }
};

//  Thêm sản phẩm vào giỏ hàng
export const addToCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { productId, quantity } = req.body;

    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!productId || quantity <= 0) return res.status(400).json({ message: "Số lượng không hợp lệ" });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    
    const existingCart = await prisma.cart.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    const totalQuantity = (existingCart?.quantity || 0) + quantity;
    if (totalQuantity > product.stock) return res.status(400).json({ message: "Không đủ hàng trong kho" });

    await prisma.cart.upsert({
      where: { userId_productId: { userId, productId } },
      update: { quantity: totalQuantity },
      create: { userId, productId, quantity },
    });

    res.json({ message: "Thêm sản phẩm vào giỏ hàng thành công" });
  } catch (error) {
    console.error("Lỗi thêm vào giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi thêm vào giỏ hàng" });
  }
};

//  Cập nhật số lượng sản phẩm trong giỏ hàng
export const updateCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { productId, quantity } = req.body;

    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!productId || quantity < 0) return res.status(400).json({ message: "Số lượng không hợp lệ" });

    const cartItem = await prisma.cart.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!cartItem) return res.status(404).json({ message: "Sản phẩm không tồn tại trong giỏ hàng" });

    if (quantity === 0) {
      await prisma.cart.delete({ where: { id: cartItem.id } });
      return res.json({ message: "Xóa sản phẩm khỏi giỏ hàng" });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (quantity > product.stock) return res.status(400).json({ message: "Không đủ hàng trong kho" });

    await prisma.cart.update({
      where: { id: cartItem.id },
      data: { quantity },
    });

    res.json({ message: "Cập nhật số lượng sản phẩm thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi cập nhật giỏ hàng" });
  }
};

//  Xóa một sản phẩm khỏi giỏ hàng
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const cartItem = await prisma.cart.findUnique({
      where: { userId_productId: { userId, productId: Number(productId) } },
    });

    if (!cartItem) return res.status(404).json({ message: "Sản phẩm không tồn tại trong giỏ hàng" });

    await prisma.cart.delete({ where: { id: cartItem.id } });

    res.json({ message: "Xóa sản phẩm khỏi giỏ hàng thành công" });
  } catch (error) {
    console.error("Lỗi xóa sản phẩm:", error);
    res.status(500).json({ message: "Lỗi xóa sản phẩm khỏi giỏ hàng" });
  }
};

//  Xóa toàn bộ giỏ hàng
export const clearCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    await prisma.cart.deleteMany({ where: { userId } });

    res.json({ message: "Đã xóa toàn bộ giỏ hàng" });
  } catch (error) {
    console.error("Lỗi xóa giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi xóa giỏ hàng" });
  }
};
