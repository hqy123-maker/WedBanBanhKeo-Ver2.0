import express from "express";
import { getUsers, getUserById, deleteUser, updateUser } from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import { registerUser } from "../controllers/userController.js";
import { loginUser } from "../controllers/userController.js";

const router = express.Router();

router.get("/", authMiddleware, adminMiddleware, getUsers);
router.get("/:id", authMiddleware, getUserById);
router.put("/:id", authMiddleware, updateUser); 
router.delete("/:id", authMiddleware, adminMiddleware, deleteUser);
router.post("/register", registerUser);
router.post("/login", loginUser);
export default router;
