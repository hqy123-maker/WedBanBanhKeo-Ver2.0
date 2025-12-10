import pool from "../config/db.js";

export const getOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "admin";

    const query = `
      SELECT o.id, o.user_id, o.total_price, o.status, o.created_at, 
        COALESCE(JSON_ARRAYAGG(
          JSON_OBJECT(
            'product_id', od.product_id,
            'quantity', od.quantity,
            'price', od.price,
            'product_name', p.name
          )
        ), '[]') AS order_details
      FROM orders o
      LEFT JOIN order_details od ON o.id = od.order_id
      LEFT JOIN products p ON od.product_id = p.id
      ${isAdmin ? "" : "WHERE o.user_id = ?"}
      GROUP BY o.id, o.user_id, o.total_price, o.status, o.created_at
    `;

    const [orders] = isAdmin ? await pool.query(query) : await pool.query(query, [userId]);

    res.json(orders);
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn hàng:", error);
    res.status(500).json({ message: "Lỗi lấy danh sách đơn hàng" });
  }
};


// 📌 Lấy đơn hàng theo ID (User chỉ thấy đơn của mình)
export const getOrderById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "admin";
    const { id } = req.params;

    const [orders] = isAdmin
      ? await pool.query(`
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
          WHERE o.id = ?
          GROUP BY o.id
        `, [id])
      : await pool.query(`
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

    if (orders.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    res.json(orders[0]);
  } catch (error) {
    console.error(" Lỗi lấy đơn hàng:", error);
    res.status(500).json({ message: "Lỗi lấy đơn hàng" });
  }
};

// 📌 Cập nhật trạng thái đơn hàng (Chỉ Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["confirmed", "shipped", "delivered", "canceled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const [order] = await pool.query("SELECT status FROM orders WHERE id = ?", [id]);
    if (order.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (order[0].status !== "pending") {
      return res.status(400).json({ message: "Chỉ có thể cập nhật đơn hàng ở trạng thái 'pending'" });
    }

    await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);

    res.json({ message: "Cập nhật trạng thái đơn hàng thành công" });
  } catch (error) {
    console.error(" Lỗi cập nhật trạng thái đơn hàng:", error);
    res.status(500).json({ message: "Lỗi cập nhật trạng thái đơn hàng" });    
  }
};

// 📌 Hủy đơn hàng
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const [order] = await pool.query("SELECT status FROM orders WHERE id = ? AND user_id = ?", [id, userId]);
    if (order.length === 0) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    if (order[0].status !== "pending") {
      return res.status(400).json({ message: "Chỉ có thể hủy đơn hàng đang chờ xử lý" });
    }

    const [orderItems] = await pool.query("SELECT product_id, quantity FROM order_details WHERE order_id = ?", [id]);

    for (let item of orderItems) {
      await pool.query("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
    }

    await pool.query("UPDATE orders SET status = 'canceled' WHERE id = ?", [id]);

    res.json({ message: "Đơn hàng đã được hủy" });
  } catch (error) {
    console.error(" Lỗi hủy đơn hàng:", error);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// 📊 Lấy thống kê đơn hàng (Admin)
export const getStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(id) AS totalOrders, 
        IFNULL(SUM(total_price), 0) AS totalRevenue, 
        SUM(status = 'pending') AS pendingOrders,
        SUM(status = 'confirmed') AS confirmedOrders,
        SUM(status = 'shipped') AS shippedOrders,
        SUM(status = 'delivered') AS deliveredOrders,
        SUM(status = 'canceled') AS canceledOrders
      FROM orders
    `);

    res.json(stats[0]);
  } catch (error) {
    console.error(" Lỗi lấy thống kê đơn hàng:", error);
    res.status(500).json({ message: "Lỗi lấy thống kê đơn hàng" });
  }
};

// 📌 Xác nhận thanh toán đơn hàng
export const confirmPayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const { id } = req.params;
    const { payment_method } = req.body; // Người dùng chọn phương thức thanh toán

    if (!payment_method) return res.status(400).json({ message: "Thiếu phương thức thanh toán" });

    const validMethods = ["credit_card", "paypal", "bank_transfer", "cod"];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
    }

    const [order] = await pool.query(`
      SELECT status, payment_status FROM orders 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (order.length === 0) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    if (order[0].status === "canceled") {
      return res.status(400).json({ message: "Không thể thanh toán đơn hàng đã hủy" });
    }

    if (order[0].payment_status === "completed") {
      return res.status(400).json({ message: "Đơn hàng này đã được thanh toán" });
    }

    // Cập nhật trạng thái thanh toán
    await pool.query(`
      UPDATE orders SET payment_status = 'completed', payment_method = ? WHERE id = ?
    `, [payment_method, id]);

    res.json({ message: "Thanh toán thành công" });
  } catch (error) {
    console.error(" Lỗi xác nhận thanh toán:", error);
    res.status(500).json({ message: "Lỗi xác nhận thanh toán" });
  }
};

// 📌 Hoàn tiền đơn hàng
export const refundPayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const { id } = req.params;

    const [order] = await pool.query(`
      SELECT status, payment_status FROM orders 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (order.length === 0) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    if (order[0].payment_status !== "completed") {
      return res.status(400).json({ message: "Chỉ có thể hoàn tiền đơn hàng đã thanh toán" });
    }

    if (order[0].status === "canceled") {
      return res.status(400).json({ message: "Đơn hàng đã bị hủy, không thể hoàn tiền" });
    }

    // Trả lại hàng về kho
    const [orderItems] = await pool.query(`
      SELECT product_id, quantity FROM order_details WHERE order_id = ?
    `, [id]);

    const updateStockQueries = orderItems.map(item => pool.query(`
      UPDATE products SET stock = stock + ? WHERE id = ?
    `, [item.quantity, item.product_id]));

    await Promise.all(updateStockQueries);

    // Cập nhật trạng thái thanh toán thành "refunded"
    await pool.query(`
      UPDATE orders SET payment_status = 'refunded', status = 'canceled' WHERE id = ?
    `, [id]);

    res.json({ message: "Hoàn tiền thành công, sản phẩm đã được trả lại kho" });
  } catch (error) {
    console.error(" Lỗi hoàn tiền:", error);
    res.status(500).json({ message: "Lỗi hoàn tiền" });
  }
};
export const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const [orderDetails] = await pool.query(`
      SELECT od.*, p.name AS product_name 
      FROM order_details od
      JOIN products p ON od.product_id = p.id
      WHERE od.order_id = ?
    `, [id]);

    if (orderDetails.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy chi tiết đơn hàng" });
    }

    res.json(orderDetails);
  } catch (error) {
    console.error("Lỗi lấy chi tiết đơn hàng:", error);
    res.status(500).json({ message: "Lỗi lấy chi tiết đơn hàng" });
  }
};
export const placeOrder = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user?.id;
    if (!userId) throw new Error("Chưa đăng nhập");

    const { items, total_price, payment_method } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng trống" });
    }

    const validMethods = ["credit_card", "paypal", "bank_transfer", "cod"];
    if (!payment_method || !validMethods.includes(payment_method)) {
      throw new Error("Phương thức thanh toán không hợp lệ");
    }

    // Kiểm tra tồn kho
    for (let item of items) {
      const [product] = await connection.query(
        "SELECT stock FROM products WHERE id = ?",
        [item.product_id]
      );
      if (!product.length) {
        throw new Error(`Sản phẩm ${item.product_id} không tồn tại`);
      }
      if (product[0].stock < item.quantity) {
        throw new Error(`Sản phẩm ${item.product_id} không đủ tồn kho`);
      }
    }

    // Tạo đơn hàng
    const [orderResult] = await connection.query(
      "INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, 'pending')",
      [userId, total_price]
    );
    const orderId = orderResult.insertId;

    // Thêm chi tiết đơn hàng và cập nhật tồn kho
    for (let item of items) {
      await connection.query(
        "INSERT INTO order_details (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        [orderId, item.product_id, item.quantity, item.price]
      );
      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [item.quantity, item.product_id]
      );
    }

    // Tạo bản ghi thanh toán
    await connection.query(
      "INSERT INTO payments (order_id, user_id, amount, payment_method, status) VALUES (?, ?, ?, ?, 'completed')",
      [orderId, userId, total_price, payment_method]
    );

    // Xóa giỏ hàng của người dùng
    await connection.query("DELETE FROM cart WHERE user_id = ?", [userId]);

    // Commit transaction
    await connection.commit();

    res.status(201).json({ message: "Đặt hàng và thanh toán thành công", orderId });
  } catch (error) {
    await connection.rollback();
    console.error("Lỗi đặt hàng:", error.message, error.stack);
    res.status(500).json({ message: error.message || "Lỗi hệ thống khi đặt hàng" });
  } finally {
    connection.release();
  }
};
