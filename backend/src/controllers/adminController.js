  // src/controllers/adminController.js
  import pool from "../config/db.js";

  // Lấy danh sách người dùng
  export const getAllUsers = async (req, res) => {
    try {
      const [users] = await pool.query("SELECT id, name, email, role,status FROM users");
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy danh sách người dùng" });
    }
  };

  // Cập nhật vai trò người dùng
  export const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
      await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
      res.json({ message: "Cập nhật vai trò thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi cập nhật vai trò" });
    }
  };

  // Xóa người dùng
  export const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM users WHERE id = ?", [id]);
      res.json({ message: "Xóa người dùng thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi xóa người dùng" });
    }
  };
  export const toggleUserStatus = async (req, res) => {
    try {
      const { id } = req.params;
  
      // Kiểm tra user có tồn tại không
      const [user] = await pool.query("SELECT status FROM users WHERE id = ?", [id]);
  
      if (user.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
  
      // Đảo trạng thái giữa "Hoạt động" và "Bị khóa"
      const newStatus = user[0].status === "Hoạt động" ? "Bị khóa" : "Hoạt động";
  
      await pool.query("UPDATE users SET status = ? WHERE id = ?", [newStatus, id]);
  
      res.json({ message: `Tài khoản của người dùng ${id} đã được chuyển sang trạng thái: ${newStatus}` });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái người dùng:", error);
      res.status(500).json({ message: "Lỗi cập nhật trạng thái người dùng", error: error.message });
    }
  };
  



