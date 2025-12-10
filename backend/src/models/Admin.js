import bcrypt from "bcryptjs";

export const Admin = {
  createAdmin: async (pool) => {
    try {
      const email = "admin@shop.com";
      const password = "admin123";
      const role = "admin";

      // Kiểm tra admin đã tồn tại chưa
      const [admin] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
      if (admin.length > 0) {
        console.log(" Admin đã tồn tại.");
        return;
      }

      // Hash mật khẩu một cách an toàn
      const hashedPassword = await bcrypt.hash(password, 12);

      // Tạo tài khoản admin
      await pool.query(
        "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
        ["Admin", email, hashedPassword, role, "Hoạt động"]
      );

      console.log("🚀 Admin user created successfully.");
    } catch (error) {
      console.error("❌ Lỗi khi tạo admin:", error.message);
    }
  },
};
