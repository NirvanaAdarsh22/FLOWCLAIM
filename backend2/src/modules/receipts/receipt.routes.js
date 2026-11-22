import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import authMiddleware from "../../middleware/authMiddleware.js";
import { generateUploadCredentials } from "../../integrations/s3/storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../../uploads/receipts");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${timestamp}_${sanitized}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const router = Router();

// Allow authenticated users to upload or get upload URLs
router.use(authMiddleware);

router.post("/upload-url", async (req, res) => {
  try {
    const { fileName, contentType } = req.body;
    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: "fileName is required"
      });
    }

    const credentials = await generateUploadCredentials(fileName, contentType);

    return res.status(200).json({
      success: true,
      data: credentials
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to generate upload URL"
    });
  }
});

// Multipart file upload
router.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const relativeUrl = `/uploads/receipts/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get("host")}${relativeUrl}`;

    return res.status(200).json({
      success: true,
      message: "Receipt uploaded successfully",
      fileKey: req.file.filename,
      receiptUrl: fullUrl,
      relativeUrl
    });
  } catch (error) {
    console.error("Receipt upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload receipt"
    });
  }
});

// Raw upload endpoint for signed upload URL fallback
router.put("/upload/:fileKey", (req, res) => {
  try {
    const { fileKey } = req.params;
    const sanitizedKey = path.basename(decodeURIComponent(fileKey));
    const targetPath = path.join(uploadDir, sanitizedKey);

    const writeStream = fs.createWriteStream(targetPath);
    req.pipe(writeStream);

    writeStream.on("finish", () => {
      const relativeUrl = `/uploads/receipts/${sanitizedKey}`;
      const fullUrl = `${req.protocol}://${req.get("host")}${relativeUrl}`;
      return res.status(200).json({
        success: true,
        message: "Receipt stored successfully",
        receiptUrl: fullUrl,
        relativeUrl
      });
    });

    writeStream.on("error", (err) => {
      console.error("Stream write error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to store file"
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Upload handler error"
    });
  }
});

export default router;
