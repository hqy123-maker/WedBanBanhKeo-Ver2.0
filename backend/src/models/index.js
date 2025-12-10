  import pool from "../config/db.js";
  import { User } from "./User.js";
  import { Product } from "./Product.js";
  import { Category } from "./Category.js";
  import { Order } from "./Order.js";
  import { OrderDetail } from "./OrderDetail.js";
  import { Cart } from "./Cart.js";
  import { Admin } from "./Admin.js";

  const createTables = async () => {
    try {
      await User.createTable(pool);
      await Category.createTable(pool);
      await Product.createTable(pool);
      await Order.createTable(pool);
      await OrderDetail.createTable(pool);
      await Cart.createTable(pool);
      await Admin.createAdmin(pool);
      console.log("Tất cả bảng đã được tạo thành công.");
    } catch (error) {
      console.error("Lỗi tạo bảng:", error);
    }
  };

  createTables();
