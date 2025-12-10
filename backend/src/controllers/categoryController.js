import pool from "../config/db.js";

// 📌 Lấy danh sách tất cả danh mục (Hỗ trợ phân trang)
export const getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [categories] = await pool.query(`
      SELECT * FROM categories 
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    res.json(categories);
  } catch (error) {
    console.error(" Lỗi lấy danh mục:", error);
    res.status(500).json({ message: "Lỗi lấy danh mục" });
  }
};

// 📌 Lấy danh mục theo ID
export const getCategoryById = async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT * FROM categories WHERE id = ?
    `, [req.params.id]);

    if (categories.length === 0) return res.status(404).json({ message: "Không tìm thấy danh mục" });

    res.json(categories[0]);
  } catch (error) {
    console.error(" Lỗi lấy danh mục:", error);
    res.status(500).json({ message: "Lỗi lấy danh mục" });
  }
};

// 📌 Thêm danh mục (Kiểm tra trùng tên)
export const addCategory = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Tên danh mục không được để trống" });

  try {
    const [existingCategory] = await pool.query(`
      SELECT id FROM categories WHERE name = ?
    `, [name]);

    if (existingCategory.length > 0) {
      return res.status(400).json({ message: "Danh mục này đã tồn tại" });
    }

    await pool.query(`
      INSERT INTO categories (name) VALUES (?)
    `, [name]);

    res.status(201).json({ message: "Thêm danh mục thành công" });
  } catch (error) {
    console.error(" Lỗi thêm danh mục:", error);
    res.status(500).json({ message: "Lỗi thêm danh mục" });
  }
};

// 📌 Cập nhật danh mục (Kiểm tra trùng tên)
export const updateCategory = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Tên danh mục không được để trống" });

  try {
    const [existingCategory] = await pool.query(`
      SELECT id FROM categories WHERE name = ? AND id != ?
    `, [name, req.params.id]);

    if (existingCategory.length > 0) {
      return res.status(400).json({ message: "Danh mục này đã tồn tại" });
    }

    const [result] = await pool.query(`
      UPDATE categories SET name=? WHERE id=?
    `, [name, req.params.id]);

    if (result.affectedRows === 0) return res.status(404).json({ message: "Danh mục không tồn tại" });

    res.json({ message: "Cập nhật danh mục thành công" });
  } catch (error) {
    console.error(" Lỗi cập nhật danh mục:", error);
    res.status(500).json({ message: "Lỗi cập nhật danh mục" });
  }
};

// 📌 Xóa danh mục (Chặn xóa nếu có sản phẩm thuộc danh mục)
export const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Kiểm tra danh mục có sản phẩm không
    const [[{ productCount }]] = await pool.query(`
      SELECT COUNT(*) AS productCount FROM products WHERE category_id = ?
    `, [categoryId]);

    if (productCount > 0) {
      return res.status(400).json({ message: "Không thể xóa danh mục có sản phẩm" });
    }

    const [result] = await pool.query(`
      DELETE FROM categories WHERE id = ?
    `, [categoryId]);

    if (result.affectedRows === 0) return res.status(404).json({ message: "Danh mục không tồn tại" });

    res.json({ message: "Xóa danh mục thành công" });
  } catch (error) {
    console.error(" Lỗi xóa danh mục:", error);
    res.status(500).json({ message: "Lỗi xóa danh mục" });
  }
};
