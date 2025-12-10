import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  // Lấy token từ cookie hoặc header
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Chưa đăng nhập hoặc không có token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(403).json({ message: "Token không hợp lệ hoặc hết hạn" });
  }
};
