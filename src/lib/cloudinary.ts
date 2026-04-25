import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export async function uploadSelfie(base64Image: string, userId: string) {
  try {
    // Basic check for credentials
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.warn("Cloudinary credentials missing. Skipping upload.");
      return null;
    }

    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'geomark/selfies',
      public_id: `${userId}_${Date.now()}`,
      overwrite: true,
      resource_type: 'image',
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    return null;
  }
}
