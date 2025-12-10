  import pool from "../config/db.js";

  // 📌 Lấy danh sách tất cả sản phẩm
  export const getAllProducts = async (req, res) => {
    try {
      const [products] = await pool.query(`
        SELECT id, name, price, category_id, description, stock, image_url 
        FROM products
        ORDER BY id DESC
      `);
      res.json(products);
    } catch (error) {
      console.error("Lỗi lấy danh sách sản phẩm:", error);
      res.status(500).json({ message: "Lỗi server khi lấy danh sách sản phẩm" });
    }
  };

  // 📌 Lấy sản phẩm theo ID
  export const getProductById = async (req, res) => {
    try {
      const [[product]] = await pool.query(`SELECT * FROM products WHERE id = ? LIMIT 1`, [req.params.id]);

      if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

      res.json(product);
    } catch (error) {
      console.error("Lỗi lấy sản phẩm:", error);
      res.status(500).json({ message: "Lỗi lấy sản phẩm" });
    }
  };

  // 📌 Thêm sản phẩm mới (Chặn trùng tên)
  export const addProduct = async (req, res) => {
    const { name, price, category_id, description, stock, image_url } = req.body;
    
    try {
      // Validate
      if (!name || !price || !category_id) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
      }
  
      // Kiểm tra trùng tên
      const [[existing]] = await pool.query(
        "SELECT id FROM products WHERE name = ?", 
        [name.trim()]
      );
      
      if (existing) {
        return res.status(400).json({ message: "Tên sản phẩm đã tồn tại" });
      }
  
      // Thêm sản phẩm
      const [result] = await pool.query(
        `INSERT INTO products 
         (name, price, category_id, description, stock, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          parseFloat(price),
          parseInt(category_id),
          description?.trim() || null,
          parseInt(stock) || 0,
          image_url?.trim() || null
        ]
      );
  
      res.status(201).json({ 
        success: true,
        message: "Thêm sản phẩm thành công",
        productId: result.insertId 
      });
    } catch (error) {
      console.error("Lỗi thêm sản phẩm:", error);
      res.status(500).json({ message: "Lỗi server khi thêm sản phẩm" });
    }
  };
  

  // 📌 Cập nhật sản phẩm (Chỉ cập nhật dữ liệu được gửi)
  export const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, price, category_id, description, stock, image_url } = req.body;
    
    try {
      // Kiểm tra tồn tại
      const [[product]] = await pool.query(
        "SELECT * FROM products WHERE id = ?", 
        [id]
      );
      
      if (!product) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }
  
      // Kiểm tra trùng tên (nếu có thay đổi)
      if (name && name !== product.name) {
        const [[existing]] = await pool.query(
          "SELECT id FROM products WHERE name = ? AND id != ?", 
          [name.trim(), id]
        );
        
        if (existing) {
          return res.status(400).json({ message: "Tên sản phẩm đã tồn tại" });
        }
      }
  
      // Cập nhật
      const [result] = await pool.query(
        `UPDATE products SET
          name = COALESCE(?, name),
          price = COALESCE(?, price),
          category_id = COALESCE(?, category_id),
          description = COALESCE(?, description),
          stock = COALESCE(?, stock),
          image_url = COALESCE(?, image_url)
         WHERE id = ?`,
        [
          name?.trim(),
          price ? parseFloat(price) : null,
          category_id ? parseInt(category_id) : null,
          description?.trim(),
          stock ? parseInt(stock) : null,
          image_url?.trim(),
          id
        ]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }
  
      res.json({ 
        success: true,
        message: "Cập nhật sản phẩm thành công" 
      });
    } catch (error) {
      console.error("Lỗi cập nhật sản phẩm:", error);
      res.status(500).json({ message: "Lỗi server khi cập nhật sản phẩm" });
    }
  };

  // 📌 Xóa sản phẩm (Chặn xóa nếu đang có trong đơn hàng hoặc giỏ hàng)
  // 📌 Xóa sản phẩm (Chặn xóa nếu đang có trong đơn hàng hoặc giỏ hàng)
  export const deleteProduct = async (req, res) => {
    const { id } = req.params;
    
    try {
      // Kiểm tra tồn tại
      const [[product]] = await pool.query(
        "SELECT * FROM products WHERE id = ?", 
        [id]
      );
      
      if (!product) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }
  
      // Kiểm tra ràng buộc
      const [[{ orderCount }], [{ cartCount }]] = await Promise.all([
        pool.query("SELECT COUNT(*) AS orderCount FROM order_details WHERE product_id = ?", [id]),
        pool.query("SELECT COUNT(*) AS cartCount FROM cart WHERE product_id = ?", [id])
      ]);
  
      if (orderCount > 0 || cartCount > 0) {
        return res.status(400).json({ 
          message: "Không thể xóa: Sản phẩm đang có trong đơn hàng/giỏ hàng" 
        });
      }
  
      // Thực hiện xóa
      const [result] = await pool.query(
        "DELETE FROM products WHERE id = ?", 
        [id]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }
  
      res.json({ 
        success: true,
        message: "Xóa sản phẩm thành công" 
      });
    } catch (error) {
      console.error("Lỗi xóa sản phẩm:", error);
      res.status(500).json({ message: "Lỗi server khi xóa sản phẩm" });
    }
  };

  // 📌 Tìm kiếm & lọc sản phẩm
  export const searchProducts = async (req, res) => {
    try {
      const { keyword, category_id, min_price, max_price, sort, page = 1, limit = 10 } = req.query;
      let query = "SELECT * FROM products WHERE 1=1";
      let params = [];

      if (keyword) {
        query += " AND name LIKE ?";
        params.push(`%${keyword}%`);
      }

      if (category_id) {
        query += " AND category_id = ?";
        params.push(category_id);
      }

      if (min_price) {
        query += " AND price >= ?";
        params.push(min_price);
      }
      if (max_price) {
        query += " AND price <= ?";
        params.push(max_price);
      }

      query += sort === "asc" ? " ORDER BY price ASC" : sort === "desc" ? " ORDER BY price DESC" : " ORDER BY created_at DESC";

      const offset = (page - 1) * limit;
      query += " LIMIT ? OFFSET ?";
      params.push(parseInt(limit), parseInt(offset));

      const [products] = await pool.query(query, params);

      res.json(products);
    } catch (error) {
      console.error("Lỗi tìm kiếm sản phẩm:", error);
      res.status(500).json({ message: "Lỗi tìm kiếm sản phẩm" });
    }
  };
