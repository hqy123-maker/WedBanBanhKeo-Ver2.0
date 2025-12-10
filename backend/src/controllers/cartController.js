import pool from "../config/db.js";

// 📌 Lấy danh sách sản phẩm trong giỏ hàng
export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    // Lấy tất cả các sản phẩm trong giỏ hàng của người dùng
    const [cart] = await pool.query(`
      SELECT c.product_id, p.name, c.quantity, p.price, 
             (c.quantity * p.price) AS total_price, p.image_url
      FROM cart c 
      JOIN products p ON c.product_id = p.id 
      WHERE c.user_id = ?`, 
      [userId]
    );

    // Trả kết quả giỏ hàng
    res.json({ cart });
  } catch (error) {
    console.error("Lỗi lấy giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi lấy giỏ hàng" });
  }
};


// 📌 Thêm sản phẩm vào giỏ hàng
export const addToCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const { product_id, quantity } = req.body;
    if (!product_id || quantity <= 0) return res.status(400).json({ message: "Số lượng không hợp lệ" });

    // Kiểm tra tồn kho
    const [product] = await pool.query("SELECT stock FROM products WHERE id = ?", [product_id]);
    if (product.length === 0) return res.status(404).json({ message: "Sản phẩm không tồn tại" });

    // Kiểm tra số lượng trong giỏ hàng
    const [cartItem] = await pool.query("SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?", [userId, product_id]);
    const totalQuantity = (cartItem.length > 0 ? cartItem[0].quantity : 0) + quantity;

    if (totalQuantity > product[0].stock) return res.status(400).json({ message: "Không đủ hàng trong kho" });

    // Cập nhật giỏ hàng (nếu sản phẩm đã có thì cộng dồn số lượng)
    await pool.query(`
      INSERT INTO cart (user_id, product_id, quantity) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE quantity = quantity + ?`, 
      [userId, product_id, quantity, quantity]
    );

    res.json({ message: "Thêm sản phẩm vào giỏ hàng thành công" });
  } catch (error) {
    console.error(" Lỗi thêm vào giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi thêm vào giỏ hàng" });
  }
};

// 📌 Cập nhật số lượng sản phẩm trong giỏ hàng
export const updateCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const { product_id, quantity } = req.body;
    if (!product_id || quantity < 0) return res.status(400).json({ message: "Số lượng không hợp lệ" });

    // Kiểm tra sản phẩm trong giỏ hàng
    const [cartItem] = await pool.query("SELECT * FROM cart WHERE user_id = ? AND product_id = ?", [userId, product_id]);
    if (cartItem.length === 0) return res.status(404).json({ message: "Sản phẩm không tồn tại trong giỏ hàng" });

    if (quantity === 0) {
      await pool.query("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [userId, product_id]);
      return res.json({ message: "Xóa sản phẩm khỏi giỏ hàng" });
    }

    // Kiểm tra tồn kho
    const [product] = await pool.query("SELECT stock FROM products WHERE id = ?", [product_id]);
    if (quantity > product[0].stock) return res.status(400).json({ message: "Không đủ hàng trong kho" });

    await pool.query("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?", [quantity, userId, product_id]);

    res.json({ message: "Cập nhật số lượng sản phẩm thành công" });
  } catch (error) {
    console.error(" Lỗi cập nhật giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi cập nhật giỏ hàng" });
  }
};

// 📌 Xóa một sản phẩm khỏi giỏ hàng
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const { product_id } = req.params;
    const [result] = await pool.query("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [userId, product_id]);

    if (result.affectedRows === 0) return res.status(404).json({ message: "Sản phẩm không tồn tại trong giỏ hàng" });

    res.json({ message: "Xóa sản phẩm khỏi giỏ hàng thành công" });
  } catch (error) {
    console.error(" Lỗi xóa sản phẩm:", error);
    res.status(500).json({ message: "Lỗi xóa sản phẩm khỏi giỏ hàng" });
  }
};

// 📌 Xóa toàn bộ giỏ hàng
export const clearCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const [result] = await pool.query("DELETE FROM cart WHERE user_id = ?", [userId]);

    if (result.affectedRows === 0) return res.status(200).json({ message: "Giỏ hàng đã trống" });

    res.json({ message: "Đã xóa toàn bộ giỏ hàng" });
  } catch (error) {
    console.error(" Lỗi xóa giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi xóa giỏ hàng" });
  }
};
