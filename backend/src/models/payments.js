import pool from "../config/db.js";

export const createPaymentTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      order_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_method ENUM('credit_card', 'paypal', 'bank_transfer', 'cod') NOT NULL,
      status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);
};
