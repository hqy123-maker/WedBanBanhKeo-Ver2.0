import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

//  Đăng ký tài khoản
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    // Kiểm tra định dạng email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }

    // Kiểm tra email đã tồn tại chưa
    const [existingUser] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    // Mã hóa mật khẩu an toàn hơn
    const hashedPassword = await bcrypt.hash(password, 12);

    // Thêm user mới
    await pool.query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')", 
      [name, email, hashedPassword]);

    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error) {
    console.error(" Lỗi đăng ký:", error);
    res.status(500).json({ message: "Lỗi đăng ký" });
  }
};

//  Đăng nhập (Cookie HTTPOnly)
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.query(
      "SELECT id, name, email, password, role FROM users WHERE email = ?",
      [email]
    );
    if (users.length === 0)
      return res.status(401).json({ message: "Email không tồn tại" });

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Sai mật khẩu" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 🔥 lưu token vào cookie HTTPOnly
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,  // Để false nếu chưa có HTTPS
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 ngày
    });

    res.json({
      message: "Đăng nhập thành công",
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ message: "Lỗi đăng nhập" });
  }
};


//  Đăng xuất
export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.json({ message: "Đăng xuất thành công" });
  } catch (error) {
    console.error("Lỗi đăng xuất:", error);
    res.status(500).json({ message: "Lỗi đăng xuất" });
  }
};


//  Lấy thông tin người dùng
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Lấy thông tin user từ database
    const [users] = await pool.query("SELECT id, name, email, role FROM users WHERE id = ?", [userId]);
    if (users.length === 0) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    res.json(users[0]);
  } catch (error) {
    console.error(" Lỗi lấy thông tin người dùng:", error);
    res.status(500).json({ message: "Lỗi lấy thông tin người dùng" });
  }
};
