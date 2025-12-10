export const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next(); // Cho phép tiếp tục nếu là admin
    } else {
        res.status(403).json({ message: "Access denied. Admins only." });
    }
};
