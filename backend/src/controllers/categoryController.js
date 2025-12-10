// src/controllers/categoryController.js
import prisma from "../config/prisma.js";

//  Lấy danh sách tất cả danh mục (phân trang)
export const getCategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const categories = await prisma.category.findMany({
      skip: offset,
      take: limit,
      orderBy: { name: "asc" },
    });

    res.json(categories);
  } catch (error) {
    console.error("Lỗi lấy danh mục:", error);
    res.status(500).json({ message: "Lỗi lấy danh mục" });
  }
};

//  Lấy danh mục theo ID
export const getCategoryById = async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!category) return res.status(404).json({ message: "Không tìm thấy danh mục" });

    res.json(category);
  } catch (error) {
    console.error("Lỗi lấy danh mục:", error);
    res.status(500).json({ message: "Lỗi lấy danh mục" });
  }
};

//  Thêm danh mục (Kiểm tra trùng tên)
export const addCategory = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Tên danh mục không được để trống" });

  try {
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ message: "Danh mục này đã tồn tại" });

    const category = await prisma.category.create({ data: { name } });

    res.status(201).json({ message: "Thêm danh mục thành công", category });
  } catch (error) {
    console.error("Lỗi thêm danh mục:", error);
    res.status(500).json({ message: "Lỗi thêm danh mục" });
  }
};

//  Cập nhật danh mục (Kiểm tra trùng tên)
export const updateCategory = async (req, res) => {
  const { name } = req.body;
  const id = Number(req.params.id);
  if (!name) return res.status(400).json({ message: "Tên danh mục không được để trống" });

  try {
    const existing = await prisma.category.findFirst({
      where: { name, NOT: { id } },
    });
    if (existing) return res.status(400).json({ message: "Danh mục này đã tồn tại" });

    const updated = await prisma.category.update({
      where: { id },
      data: { name },
    });

    res.json({ message: "Cập nhật danh mục thành công", category: updated });
  } catch (error) {
    console.error("Lỗi cập nhật danh mục:", error);
    res.status(500).json({ message: "Lỗi cập nhật danh mục" });
  }
};

//  Xóa danh mục (Chặn xóa nếu có sản phẩm)
export const deleteCategory = async (req, res) => {
  const id = Number(req.params.id);

  try {
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) return res.status(400).json({ message: "Không thể xóa danh mục có sản phẩm" });

    await prisma.category.delete({ where: { id } });

    res.json({ message: "Xóa danh mục thành công" });
  } catch (error) {
    console.error("Lỗi xóa danh mục:", error);
    res.status(500).json({ message: "Lỗi xóa danh mục" });
  }
};
