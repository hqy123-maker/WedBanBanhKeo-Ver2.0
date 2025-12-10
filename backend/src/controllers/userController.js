import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// 📌 Lấy danh sách tất cả người dùng (Chỉ Admin)
export const getUsers = async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT id, name, email, role FROM users 
    `);
    res.json(users);
  } catch (error) {
    console.error(" Lỗi lấy danh sách người dùng:", error);
    res.status(500).json({ message: "Lỗi lấy danh sách người dùng" });
  }
};
export const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email và mật khẩu không được để trống!" });
    }

    // Nếu name không được cung cấp, đặt thành NULL
    if (!name) {
      name = null;
    }

    // Kiểm tra email đã tồn tại chưa
    const [existingUser] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Email đã được sử dụng!" });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Thêm user vào database
    await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (error) {
    console.error("❌ Lỗi đăng ký người dùng:", error);
    res.status(500).json({ message: "Lỗi server, kiểm tra lại backend!" });
  }
};

// 📌 Lấy thông tin người dùng theo ID (Chỉ Admin hoặc chính chủ)
export const getUserById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "admin";

    if (!isAdmin && userId != req.params.id) {
      return res.status(403).json({ message: "Bạn không có quyền xem thông tin người khác" });
    }

    const [users] = await pool.query(`
      SELECT id, name, email, role FROM users WHERE id = ?
    `, [req.params.id]);

    if (users.length === 0) return res.status(404).json({ message: "Người dùng không tồn tại" });

    res.json(users[0]);
  } catch (error) {
    console.error(" Lỗi lấy thông tin người dùng:", error);
    res.status(500).json({ message: "Lỗi lấy thông tin người dùng" });
  }
};

// 📌 Xóa người dùng (Không cho phép xóa admin)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra người dùng có tồn tại không
    const [users] = await pool.query(`
      SELECT role FROM users WHERE id = ?
    `, [id]);

    if (users.length === 0) return res.status(404).json({ message: "Người dùng không tồn tại" });

    if (users[0].role === "admin") {
      return res.status(403).json({ message: "Không thể xóa tài khoản admin" });
    }

    await pool.query(`
      DELETE FROM users WHERE id = ?
    `, [id]);

    res.json({ message: "Xóa người dùng thành công" });
  } catch (error) {
    console.error(" Lỗi xóa người dùng:", error);
    res.status(500).json({ message: "Lỗi xóa người dùng" });
  }
};


// 📌 Cập nhật thông tin người dùng (Chính chủ hoặc Admin)
export const updateUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "admin";
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    // 📌 Người dùng chỉ được cập nhật chính họ, Admin có thể cập nhật tất cả
    if (!isAdmin && userId != id) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật thông tin người khác" });
    }

    // 📌 Kiểm tra email đã tồn tại chưa (tránh trùng email)
    if (email) {
      const [existingUser] = await pool.query(`
        SELECT id FROM users WHERE email = ? AND id != ?
      `, [email, id]);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email đã tồn tại" });
      }
    }

    // 📌 Mã hóa mật khẩu nếu có thay đổi
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // 📌 Chỉ admin mới có quyền cập nhật role
    let query = "UPDATE users SET name = ?, email = ?";
    let params = [name, email];

    if (hashedPassword) {
      query += ", password = ?";
      params.push(hashedPassword);
    }

    if (isAdmin && role) {
      query += ", role = ?";
      params.push(role);
    }

    query += " WHERE id = ?";
    params.push(id);

    const [result] = await pool.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.json({ message: "Cập nhật thông tin thành công" });
  } catch (error) {
    console.error(" Lỗi cập nhật người dùng:", error);
    res.status(500).json({ message: "Lỗi cập nhật người dùng" });
  }
};
// Đăng nhập
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Tìm người dùng theo email
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Tài khoản không tồn tại!" });
    }

    const user = rows[0];

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Sai email hoặc mật khẩu!" });
    }

    // Tạo token JWT
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, "SECRET_KEY", { expiresIn: "1h" });

    // Trả về thông tin người dùng
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
};