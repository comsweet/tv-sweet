import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload profile image to Cloudinary
 * @param {Buffer|string} file - File buffer or path
 * @param {number} userId - User ID for organizing uploads
 */
export async function uploadProfileImage(file, userId) {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: `tv-leaderboard/profiles`,
      public_id: `agent_${userId}`,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading profile image:', error.message);
    throw error;
  }
}

/**
 * Upload sound file to Cloudinary
 * @param {Buffer|string} file - File buffer or path
 * @param {number} userId - User ID for personal sounds (optional)
 * @param {string} type - Sound type: 'personal', 'standard', or 'milestone'
 */
export async function uploadSoundFile(file, type = 'personal', userId = null) {
  try {
    const publicId = userId ? `agent_${userId}_sound` : `${type}_sound`;

    const result = await cloudinary.uploader.upload(file, {
      folder: `tv-leaderboard/sounds`,
      public_id: publicId,
      overwrite: true,
      resource_type: 'video', // Audio files are uploaded as 'video' type in Cloudinary
      format: 'mp3'
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading sound file:', error.message);
    throw error;
  }
}

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @param {string} resourceType - Resource type ('image' or 'video')
 */
export async function deleteFile(publicId, resourceType = 'image') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error deleting file:', error.message);
    throw error;
  }
}

/**
 * Get optimized image URL with transformations
 * @param {string} url - Original Cloudinary URL
 * @param {Object} options - Transformation options
 */
export function getOptimizedImageUrl(url, options = {}) {
  const {
    width = 400,
    height = 400,
    crop = 'fill',
    quality = 'auto'
  } = options;

  return cloudinary.url(url, {
    transformation: [
      { width, height, crop, gravity: 'face' },
      { quality, fetch_format: 'auto' }
    ]
  });
}

export default cloudinary;
