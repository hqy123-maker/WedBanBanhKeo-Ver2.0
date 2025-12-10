// src/controllers/commentController.js
import prisma from "../config/prisma.js";

//  Thêm bình luận
export const addComment = async (req, res) => {
  try {
    const { userId, productId, comment, rating } = req.body;

    if (!userId || !productId || !rating) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
    }

    const newComment = await prisma.comment.create({
      data: {
        userId,
        productId,
        comment,
        rating,
      },
    });

    res.status(201).json({ message: "Bình luận đã được thêm!", comment: newComment });
  } catch (error) {
    console.error("Lỗi thêm bình luận:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

//  Lấy bình luận theo sản phẩm
export const getCommentsByProduct = async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    const comments = await prisma.comment.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" }, // có thể thêm createdAt nếu muốn sắp xếp theo thời gian
    });

    res.status(200).json(comments);
  } catch (error) {
    console.error("Lỗi lấy bình luận:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
};
