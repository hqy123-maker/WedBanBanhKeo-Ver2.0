import app from "./app.js";
import pool from "./config/db.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
app.use(cookieParser());
dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(" Kết nối MySQL thành công");
    connection.release();

    app.listen(PORT, () => {
      console.log(` Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(" Lỗi kết nối MySQL:", error);
    process.exit(1);
  }
};

startServer();
