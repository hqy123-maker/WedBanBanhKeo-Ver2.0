import prisma from "../config/prisma.js";

//  Lấy danh sách tất cả sản phẩm
export const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.products.findMany({
      orderBy: { id: "desc" },
    });
    res.json(products);
  } catch (error) {
    console.error("Lỗi lấy danh sách sản phẩm:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách sản phẩm" });
  }
};

//  Lấy sản phẩm theo ID
export const getProductById = async (req, res) => {
  try {
    const product = await prisma.products.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.json(product);
  } catch (error) {
    console.error("Lỗi lấy sản phẩm:", error);
    res.status(500).json({ message: "Lỗi lấy sản phẩm" });
  }
};

//  Thêm sản phẩm mới (Chặn trùng tên)
export const addProduct = async (req, res) => {
  const { name, price, category_id, description, stock, image_url } = req.body;
  try {
    if (!name || !price || !category_id) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const existing = await prisma.products.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ message: "Tên sản phẩm đã tồn tại" });

    const product = await prisma.products.create({
      data: {
        name: name.trim(),
        price: parseFloat(price),
        category_id: parseInt(category_id),
        description: description?.trim() || null,
        stock: parseInt(stock) || 0,
        image_url: image_url?.trim() || null,
      },
    });

    res.status(201).json({ success: true, message: "Thêm sản phẩm thành công", productId: product.id });
  } catch (error) {
    console.error("Lỗi thêm sản phẩm:", error);
    res.status(500).json({ message: "Lỗi server khi thêm sản phẩm" });
  }
};

//  Cập nhật sản phẩm
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, price, category_id, description, stock, image_url } = req.body;

  try {
    const product = await prisma.products.findUnique({ where: { id: parseInt(id) } });
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    if (name && name !== product.name) {
      const existing = await prisma.products.findUnique({ where: { name } });
      if (existing && existing.id !== parseInt(id)) {
        return res.status(400).json({ message: "Tên sản phẩm đã tồn tại" });
      }
    }

    await prisma.products.update({
      where: { id: parseInt(id) },
      data: {
        name: name?.trim(),
        price: price ? parseFloat(price) : undefined,
        category_id: category_id ? parseInt(category_id) : undefined,
        description: description?.trim(),
        stock: stock ? parseInt(stock) : undefined,
        image_url: image_url?.trim(),
      },
    });

    res.json({ success: true, message: "Cập nhật sản phẩm thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật sản phẩm:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật sản phẩm" });
  }
};

//  Xóa sản phẩm
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.products.findUnique({ where: { id: parseInt(id) } });
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const [orderCount, cartCount] = await Promise.all([
      prisma.order_details.count({ where: { product_id: parseInt(id) } }),
      prisma.cart.count({ where: { product_id: parseInt(id) } }),
    ]);

    if (orderCount > 0 || cartCount > 0) {
      return res.status(400).json({ message: "Không thể xóa: Sản phẩm đang có trong đơn hàng/giỏ hàng" });
    }

    await prisma.products.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: "Xóa sản phẩm thành công" });
  } catch (error) {
    console.error("Lỗi xóa sản phẩm:", error);
    res.status(500).json({ message: "Lỗi server khi xóa sản phẩm" });
  }
};

//  Tìm kiếm & lọc sản phẩm
export const searchProducts = async (req, res) => {
  try {
    const { keyword, category_id, min_price, max_price, sort, page = 1, limit = 10 } = req.query;

    const filters = {
      where: {
        AND: [
          keyword ? { name: { contains: keyword, mode: "insensitive" } } : {},
          category_id ? { category_id: parseInt(category_id) } : {},
          min_price ? { price: { gte: parseFloat(min_price) } } : {},
          max_price ? { price: { lte: parseFloat(max_price) } } : {},
        ],
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: sort === "asc" ? { price: "asc" } : sort === "desc" ? { price: "desc" } : { created_at: "desc" },
    };

    const products = await prisma.products.findMany(filters);
    res.json(products);
  } catch (error) {
    console.error("Lỗi tìm kiếm sản phẩm:", error);
    res.status(500).json({ message: "Lỗi tìm kiếm sản phẩm" });
  }
};
