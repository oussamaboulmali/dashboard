/**
 * @fileoverview Image Processing Helper
 * Handles image upload, processing, and storage for agency logos.
 * @module helpers/imageHelper
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
/**
 * Processes and stores uploaded images
 * - Uses Sharp library for image processing
 * - Stores in original quality
 * - Determines storage path based on environment (local vs production)
 * @param {string} imagePath - Temporary upload path
 * @param {string} filename - Generated filename
 * @param {string} originalname - Original uploaded filename
 * @returns {Promise<string>} Stored image filename
 */
export const processAndStoreImages = async (
  imagePath,
  filename,
  originalname
) => {
  // Get image extension
  const imageExtension = originalname.split(".").pop().toLowerCase();

  // Store the original image
  const outputDir =
    process.env.PROJECT_ENV == "local"
      ? `uploads/original`
      : process.env.ORIGINAL_IMAGE_PATH;
  ensureDirectoryExists(outputDir);
  const storedImagePath = path.join(outputDir, `${filename}.${imageExtension}`);
  const originalImage = await sharp(imagePath).toBuffer();
  await fs.promises.writeFile(storedImagePath, originalImage);

  return path.basename(storedImagePath);
};

/**
 * Ensures directory exists, creates recursively if not
 * @param {string} directory - Directory path
 * @private
 */
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};
