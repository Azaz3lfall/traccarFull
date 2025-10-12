/**
 * Example usage of the Cloudinary utility
 * This file demonstrates how to use the Cloudinary utility in different scenarios
 */

import { uploadToCloudinary, deleteFromCloudinary, getCloudinaryImageUrl } from './cloudinary';

// Example 1: Upload user profile photo
export const uploadUserProfilePhoto = async (file, userId) => {
  try {
    const result = await uploadToCloudinary(file, {
      folder: 'traccar-profiles',
      publicId: `user_${userId}_${Date.now()}`,
      transformations: {
        width: 200,
        height: 200,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto'
      }
    });

    return result;
  } catch (error) {
    console.error('Profile photo upload failed:', error);
    throw error;
  }
};

// Example 2: Upload device image
export const uploadDeviceImage = async (file, deviceId) => {
  try {
    const result = await uploadToCloudinary(file, {
      folder: 'traccar-devices',
      publicId: `device_${deviceId}_${Date.now()}`,
      transformations: {
        width: 300,
        height: 300,
        crop: 'fill',
        quality: 'auto'
      }
    });

    return result;
  } catch (error) {
    console.error('Device image upload failed:', error);
    throw error;
  }
};

// Example 3: Generate different image sizes
export const generateImageVariants = (publicId) => {
  return {
    thumbnail: getCloudinaryImageUrl(publicId, {
      width: 100,
      height: 100,
      crop: 'fill',
      quality: 'auto'
    }),
    medium: getCloudinaryImageUrl(publicId, {
      width: 400,
      height: 400,
      crop: 'fill',
      quality: 'auto'
    }),
    large: getCloudinaryImageUrl(publicId, {
      width: 800,
      height: 600,
      crop: 'fill',
      quality: 'auto'
    })
  };
};

// Example 4: Delete old profile photo when uploading new one
export const replaceUserProfilePhoto = async (file, userId, oldPublicId = null) => {
  try {
    // Upload new photo
    const newPhoto = await uploadUserProfilePhoto(file, userId);

    // Delete old photo if it exists
    if (oldPublicId) {
      try {
        await deleteFromCloudinary(oldPublicId);
      } catch (deleteError) {
        console.warn('Failed to delete old photo:', deleteError);
        // Don't throw error, new photo was uploaded successfully
      }
    }

    return newPhoto;
  } catch (error) {
    console.error('Profile photo replacement failed:', error);
    throw error;
  }
};

// Example 5: React component integration
export const useCloudinaryUpload = () => {
  const uploadImage = async (file, options = {}) => {
    try {
      const result = await uploadToCloudinary(file, options);
      return result;
    } catch (error) {
      console.error('Cloudinary upload failed:', error);
      throw error;
    }
  };

  const deleteImage = async (publicId) => {
    try {
      const result = await deleteFromCloudinary(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary delete failed:', error);
      throw error;
    }
  };

  const getImageUrl = (publicId, transformations = {}) => {
    return getCloudinaryImageUrl(publicId, transformations);
  };

  return {
    uploadImage,
    deleteImage,
    getImageUrl
  };
};
