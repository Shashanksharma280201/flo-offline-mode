import express from "express";
import multer from "multer";
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  uploadMedia
} from "../../controllers/blogController";
import protect, { hasPermission } from "../../middlewares/authMiddleware";

const router = express.Router();

const storage = multer.memoryStorage();
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPG, PNG, WEBP, and GIF are allowed."),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Public Routes
router.route("/").get(getPosts);

// Protected Routes
router
  .route("/id/:id")
  .get(protect, hasPermission("view_site_mgmt"), getPostById);

router.route("/").post(protect, hasPermission("view_site_mgmt"), createPost);

router
  .route("/:id")
  .put(protect, hasPermission("view_site_mgmt"), updatePost)
  .delete(protect, hasPermission("view_site_mgmt"), deletePost);

router
  .route("/upload")
  .post(
    protect,
    hasPermission("view_site_mgmt"),
    upload.single("file"),
    uploadMedia
  );

export default router;
