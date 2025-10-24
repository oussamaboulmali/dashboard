import sharp from "sharp";
import fs from "fs";
import path from "path";
// Function to process and store images
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

// Function to ensure a directory exists, create if not
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};
