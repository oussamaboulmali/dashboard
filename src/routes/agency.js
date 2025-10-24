import express from "express";
import {
  CreateAgency,
  GetAllAgencies,
  GetOneAgency,
  UpdateAgency,
  AddUsersToAgency,
  GetUsersWithOtherAgencies,
  RemoveUsersFromAgency,
  ChangeStateAgency,
  GetArticlesOfAgency,
  SearchArticlesOfAgency,
  GetOneArticle,
  GetAgenciesOfuser,
  SearchArticlesGlobale,
} from "../controllers/agencyController.js";
import multer from "multer";
import { authenticate, restrict } from "../middlewares/authMiddleware.js";
import path from "path";
const router = express.Router();

// File filter configuration
const fileFilter = (req, file, cb) => {
  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png"];
  const allowedExtensions = [".jpg", ".jpeg", ".png"];

  // Check MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type"), false);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Invalid file extension"), false);
  }

  // Additional security checks
  if (file.originalname.includes("%00")) {
    return cb(new Error("Potential null byte attack detected"), false);
  }

  cb(null, true);
};

// Error handler middleware for file upload
const handleFileUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File size exceeds limit (1MB)" });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Configure multer with security settings
const upload = multer({
  dest: "tmp/",
  fileFilter: fileFilter,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit
    files: 1, // Only allow one file per request
  },
});

router.post("/", authenticate, GetAllAgencies);
router.post("/users/list", authenticate, restrict(2), GetAgenciesOfuser);
router.post(
  "/create",
  authenticate,
  restrict(3),
  upload.single("logo"),
  handleFileUploadError,
  CreateAgency
);
router.post("/detail", authenticate, GetOneAgency);
router.put(
  "/update",
  authenticate,
  restrict(3),
  upload.single("logo"),
  handleFileUploadError,
  UpdateAgency
);
router.put("/state", authenticate, restrict(3), ChangeStateAgency);
router.post("/other", authenticate, restrict(3), GetUsersWithOtherAgencies);
router.post("/articles", authenticate, restrict(2), GetArticlesOfAgency);
router.post("/articles/detail", authenticate, restrict(2), GetOneArticle);

router.post(
  "/articles/search",
  authenticate,
  restrict(2),
  SearchArticlesOfAgency
);
router
  .route("/users")
  .post(authenticate, restrict(3), AddUsersToAgency)
  .put(authenticate, restrict(3), RemoveUsersFromAgency);

router.post(
  "/articles/searchAll",
  authenticate,
  restrict(2),
  SearchArticlesGlobale
);
//router.route("/cache").post(authenticate,GetArticlesOfAgency2);
export default router;
