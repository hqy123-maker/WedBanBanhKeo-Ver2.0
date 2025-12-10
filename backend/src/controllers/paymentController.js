import pool from "../config/db.js";

// 📌 Lấy danh sách đơn hàng (User chỉ thấy đơn hàng của mình)
export const getOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const [orders] = await pool.query(`
      SELECT * FROM orders 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [userId]);

    res.json(orders);
  } catch (error) {
    console.error(" Lỗi lấy danh sách đơn hàng:", error);
    res.status(500).json({ message: "Lỗi lấy danh sách đơn hàng" });
  }
};

// 📌 Lấy chi tiết đơn hàng
export const getOrderDetails = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const { id } = req.params;

    const [order] = await pool.query(`
      SELECT o.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'product_id', od.product_id,
            'quantity', od.quantity,
            'price', od.price,
            'product_name', p.name
          )
        ) AS order_details
      FROM orders o
      LEFT JOIN order_details od ON o.id = od.order_id
      LEFT JOIN products p ON od.product_id = p.id
      WHERE o.id = ? AND o.user_id = ?
      GROUP BY o.id
    `, [id, userId]);

    if (order.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    res.json(order[0]);
  } catch (error) {
    console.error(" Lỗi lấy chi tiết đơn hàng:", error);
    res.status(500).json({ message: "Lỗi lấy chi tiết đơn hàng" });
  }
};

// 📌 Tạo đơn hàng mới từ giỏ hàng
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    // Lấy sản phẩm từ giỏ hàng
    const [cartItems] = await pool.query(`
      SELECT c.product_id, c.quantity, p.price, p.stock 
      FROM cart c 
      JOIN products p ON c.product_id = p.id 
      WHERE c.user_id = ?
    `, [userId]);

    if (cartItems.length === 0) return res.status(400).json({ message: "Giỏ hàng trống" });

    let total_price = 0;

    // Kiểm tra tồn kho
    for (let item of cartItems) {
      if (item.quantity > item.stock) {
        return res.status(400).json({ message: `Không đủ hàng cho sản phẩm ID ${item.product_id}` });
      }
      total_price += item.quantity * item.price;
    }

    // Tạo đơn hàng
    const [orderResult] = await pool.query(`
      INSERT INTO orders (user_id, total_price, status, payment_status) 
      VALUES (?, ?, 'pending', 'pending')
    `, [userId, total_price]);

    const orderId = orderResult.insertId;

    // Lưu chi tiết đơn hàng & cập nhật kho
    const orderDetailsQuery = cartItems.map(item => [orderId, item.product_id, item.quantity, item.price]);
    await pool.query(`
      INSERT INTO order_details (order_id, product_id, quantity, price) 
      VALUES ?
    `, [orderDetailsQuery]);

    // Cập nhật kho
    const updateStockQueries = cartItems.map(item => pool.query(`
      UPDATE products SET stock = stock - ? WHERE id = ?
    `, [item.quantity, item.product_id]));

    await Promise.all(updateStockQueries);

    // Xóa giỏ hàng sau khi đặt hàng
    await pool.query(`DELETE FROM cart WHERE user_id = ?`, [userId]);

    res.json({ message: "Đặt hàng thành công", order_id: orderId });
  } catch (error) {
    console.error(" Lỗi tạo đơn hàng:", error);
    res.status(500).json({ message: "Lỗi tạo đơn hàng" });
  }
};

// 📌 Hủy đơn hàng
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const { id } = req.params;
    const [order] = await pool.query(`
      SELECT status, payment_status FROM orders 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (order.length === 0) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    if (order[0].status !== "pending") {
      return res.status(400).json({ message: "Chỉ có thể hủy đơn hàng đang chờ xử lý" });
    }

    if (order[0].payment_status === "completed") {
      return res.status(400).json({ message: "Không thể hủy đơn hàng đã thanh toán" });
    }

    // Trả hàng về kho trước khi hủy
    const [orderItems] = await pool.query(`
      SELECT product_id, quantity FROM order_details WHERE order_id = ?
    `, [id]);

    const updateStockQueries = orderItems.map(item => pool.query(`
      UPDATE products SET stock = stock + ? WHERE id = ?
    `, [item.quantity, item.product_id]));

    await Promise.all(updateStockQueries);

    // Cập nhật trạng thái đơn hàng
    await pool.query(`
      UPDATE orders SET status = 'canceled', payment_status = 'refunded' WHERE id = ?
    `, [id]);

    res.json({ message: "Hủy đơn hàng thành công" });
  } catch (error) {
    console.error(" Lỗi hủy đơn hàng:", error);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
