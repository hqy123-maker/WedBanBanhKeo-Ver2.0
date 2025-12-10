export const Order = {
  createTable: async (pool) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
        status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'canceled') DEFAULT 'pending',
        payment_method ENUM('credit_card', 'paypal', 'bank_transfer', 'cod') DEFAULT 'cod',
        payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  },
};
