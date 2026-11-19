import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import { generateUploadCredentials } from "../../integrations/s3/storage.js";

const router = Router();

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

export default router;
