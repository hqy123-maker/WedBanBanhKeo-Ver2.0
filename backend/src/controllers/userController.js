import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

//  Lấy danh sách tất cả người dùng (Chỉ Admin)
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(users);
  } catch (error) {
    console.error("Lỗi lấy danh sách người dùng:", error);
    res.status(500).json({ message: "Lỗi lấy danh sách người dùng" });
  }
};

//  Đăng ký người dùng
export const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email và mật khẩu không được để trống!" });

    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "Email đã được sử dụng!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        role: "user",
      },
    });

    res.status(201).json({ message: "Đăng ký thành công!", userId: user.id });
  } catch (error) {
    console.error("❌ Lỗi đăng ký người dùng:", error);
    res.status(500).json({ message: "Lỗi server, kiểm tra lại backend!" });
  }
};

//  Lấy thông tin người dùng theo ID (Chỉ Admin hoặc chính chủ)
export const getUserById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "admin";
    const targetId = parseInt(req.params.id);

    if (!isAdmin && userId !== targetId) {
      return res.status(403).json({ message: "Bạn không có quyền xem thông tin người khác" });
    }

    const user = await prisma.users.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    res.json(user);
  } catch (error) {
    console.error("Lỗi lấy thông tin người dùng:", error);
    res.status(500).json({ message: "Lỗi lấy thông tin người dùng" });
  }
};

//  Xóa người dùng (Không cho phép xóa admin)
export const deleteUser = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);

    const user = await prisma.users.findUnique({ where: { id: targetId } });
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });
    if (user.role === "admin") return res.status(403).json({ message: "Không thể xóa tài khoản admin" });

    await prisma.users.delete({ where: { id: targetId } });
    res.json({ message: "Xóa người dùng thành công" });
  } catch (error) {
    console.error("Lỗi xóa người dùng:", error);
    res.status(500).json({ message: "Lỗi xóa người dùng" });
  }
};

//  Cập nhật thông tin người dùng (Chính chủ hoặc Admin)
export const updateUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "admin";
    const targetId = parseInt(req.params.id);
    const { name, email, password, role } = req.body;

    if (!isAdmin && userId !== targetId) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật thông tin người khác" });
    }

    if (email) {
      const existingUser = await prisma.users.findFirst({
        where: { email, NOT: { id: targetId } },
      });
      if (existingUser) return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const updateData = {
      name,
      email,
      password: hashedPassword,
      role: isAdmin && role ? role : undefined,
    };

    // Xóa các key undefined
    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    const updatedUser = await prisma.users.update({
      where: { id: targetId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    });

    res.json({ message: "Cập nhật thông tin thành công", user: updatedUser });
  } catch (error) {
    console.error("Lỗi cập nhật người dùng:", error);
    res.status(500).json({ message: "Lỗi cập nhật người dùng" });
  }
};

//  Đăng nhập
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) return res.status(404).json({ message: "Tài khoản không tồn tại!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Sai email hoặc mật khẩu!" });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, "SECRET_KEY", { expiresIn: "1h" });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
};
