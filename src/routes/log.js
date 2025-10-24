import express from "express";
import {
  ClearSession,
  CreateFrontLog,
  GetAllSessionsLogs,
  GetLogsFileName,
  GetOneLog,
} from "../controllers/logController.js";
import { authenticate, restrict } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").post(authenticate, restrict(4), GetLogsFileName);
router.route("/file").post(authenticate, restrict(4), GetOneLog);
router
  .route("/session")
  .post(authenticate, restrict(4), GetAllSessionsLogs)
  .put(authenticate, restrict(4), ClearSession);
router.route("/front").post(CreateFrontLog);

export default router;
