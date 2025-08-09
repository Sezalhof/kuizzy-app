import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Returns 10 default avatar URLs (assumes /public/avatars contains these PNGs)
 * 5 male + 5 female avatars named male1.png ... female5.png
 */
export function getDefaultAvatars() {
  return [
    "/avatars/male1.png",
    "/avatars/male2.png",
    "/avatars/male3.png",
    "/avatars/male4.png",
    "/avatars/male5.png",
    "/avatars/female1.png",
    "/avatars/female2.png",
    "/avatars/female3.png",
    "/avatars/female4.png",
    "/avatars/female5.png"
  ];
}

/**
 * Processes an image before upload:
 * - Crops to square (center)
 * - Resizes max width/height (default 300px)
 * - Converts to compressed WebP blob
 * @param {File} file - Original image file from input
 * @param {number} maxSize - Max dimension in pixels (default 300)
 * @param {boolean} cropSquare - Crop to square? (default true)
 * @returns {Promise<Blob>} - Processed image blob ready for upload
 */
export function processImage(file, maxSize = 300, cropSquare = true) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");

        let width = img.width;
        let height = img.height;

        if (cropSquare) {
          const side = Math.min(width, height);
          const offsetX = (width - side) / 2;
          const offsetY = (height - side) / 2;
          canvas.width = side;
          canvas.height = side;
          ctx.drawImage(img, offsetX, offsetY, side, side, 0, 0, side, side);
          width = side;
          height = side;
        } else {
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0);
        }

        // Resize if needed
        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          const newWidth = width * scale;
          const newHeight = height * scale;

          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = newWidth;
          tempCanvas.height = newHeight;
          const tempCtx = tempCanvas.getContext("2d");
          tempCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
          canvas = tempCanvas;
        }

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Image processing failed: empty blob"));
          },
          "image/webp",
          0.8 // Compression quality
        );
      };

      img.onerror = () => reject(new Error("Failed to load image for processing"));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a processed image blob to Firebase Storage under avatars/{userId}/ folder.
 * @param {string} userId - Firebase Auth UID of current user
 * @param {Blob} fileBlob - Processed image blob to upload
 * @param {string} fileName - Optional filename, defaults to avatar.webp
 * @returns {Promise<string>} - Download URL of uploaded image
 */
export async function uploadImage(userId, fileBlob, fileName = "avatar.webp") {
  if (!userId) throw new Error("User ID is required for upload");

  try {
    const storage = getStorage();
    const timestamp = Date.now();
    const fullFileName = `${timestamp}-${fileName}`;
    const storageRef = ref(storage, `avatars/${userId}/${fullFileName}`);

    await uploadBytes(storageRef, fileBlob, { contentType: "image/webp" });
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}
