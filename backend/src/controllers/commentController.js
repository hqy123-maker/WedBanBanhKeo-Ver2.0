import pool from "../config/db.js";

export const addComment = async (req, res) => { 
    try {
        const { user_id, product_id, comment, rating } = req.body;

        if (!user_id || !product_id || !rating) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
        }

        await pool.query(
            `INSERT INTO comments (user_id, product_id, comment, rating) VALUES (?, ?, ?, ?)`,
            [user_id, product_id, comment, rating]
        );

        res.status(201).json({ message: "Bình luận đã được thêm!" });
    } catch (error) {
        console.error("Lỗi thêm bình luận:", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};

export const getCommentsByProduct = async (req, res) => { 
    try {
        const { product_id } = req.params;
        const [comments] = await pool.query(`SELECT * FROM comments WHERE product_id = ?`, [product_id]);

        res.status(200).json(comments);
    } catch (error) {
        console.error("Lỗi lấy bình luận:", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};
    
