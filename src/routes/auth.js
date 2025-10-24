import express from "express";
import {
  CloseRunningSession,
  GetStatistics,
  Login,
  Logout,
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", Login);
router.post("/close", CloseRunningSession);
router.post("/logout", Logout);
router.post("/stats", authenticate, GetStatistics);
export default router;
