// src/controllers/adminController.js
import prisma from "../config/prisma.js"; // Prisma Client
import bcrypt from "bcryptjs";

// Lấy danh sách người dùng
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách người dùng", error: error.message });
  }
};

// Cập nhật vai trò người dùng
export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { role },
    });
    res.json({ message: "Cập nhật vai trò thành công", user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật vai trò", error: error.message });
  }
};

// Xóa người dùng
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Xóa người dùng thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa người dùng", error: error.message });
  }
};

// Đảo trạng thái người dùng giữa "Hoạt động" và "Bị khóa"
export const toggleUserStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { status: true },
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const newStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";

    await prisma.user.update({
      where: { id: Number(id) },
      data: { status: newStatus },
    });

    res.json({ message: `Tài khoản của người dùng ${id} đã được chuyển sang trạng thái: ${newStatus}` });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái người dùng:", error);
    res.status(500).json({ message: "Lỗi cập nhật trạng thái người dùng", error: error.message });
  }
};
