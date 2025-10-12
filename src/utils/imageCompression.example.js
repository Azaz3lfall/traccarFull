/**
 * Example usage of the image compression utility
 * This file demonstrates how to use the imageCompression utility in different scenarios
 */

import { compressImage, validateImageFile, getCompressionInfo } from './imageCompression';

// Example 1: Basic image compression
export const compressUserAvatar = async (file) => {
  try {
    // Validate the file first
    const validation = validateImageFile(file, 120); // 120KB max input
    if (!validation.success) {
      throw new Error(validation.message);
    }

    // Compress to 10-15KB
    const compressedFile = await compressImage(file, {
      maxSizeKB: 15,
      minSizeKB: 10,
      maxWidth: 400,
      maxHeight: 400,
      outputFormat: 'image/jpeg',
      initialQuality: 0.8
    });

    // Get compression statistics
    const stats = getCompressionInfo(file, compressedFile);
    console.log('Compression stats:', stats);

    return compressedFile;
  } catch (error) {
    console.error('Avatar compression failed:', error);
    throw error;
  }
};

// Example 2: Profile picture compression with different settings
export const compressProfilePicture = async (file) => {
  try {
    const validation = validateImageFile(file, 200); // 200KB max input
    if (!validation.success) {
      throw new Error(validation.message);
    }

    // Compress to 8-12KB for profile pictures
    const compressedFile = await compressImage(file, {
      maxSizeKB: 12,
      minSizeKB: 8,
      maxWidth: 600,
      maxHeight: 600,
      outputFormat: 'image/jpeg',
      initialQuality: 0.7
    });

    return compressedFile;
  } catch (error) {
    console.error('Profile picture compression failed:', error);
    throw error;
  }
};

// Example 3: Thumbnail generation
export const generateThumbnail = async (file) => {
  try {
    const validation = validateImageFile(file, 500); // 500KB max input
    if (!validation.success) {
      throw new Error(validation.message);
    }

    // Create a small thumbnail (5-8KB)
    const thumbnail = await compressImage(file, {
      maxSizeKB: 8,
      minSizeKB: 5,
      maxWidth: 200,
      maxHeight: 200,
      outputFormat: 'image/jpeg',
      initialQuality: 0.6
    });

    return thumbnail;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    throw error;
  }
};

// Example 4: Batch compression for multiple images
export const compressMultipleImages = async (files) => {
  const results = [];
  
  for (const file of files) {
    try {
      const validation = validateImageFile(file, 120);
      if (!validation.success) {
        results.push({ file, success: false, error: validation.message });
        continue;
      }

      const compressedFile = await compressImage(file, {
        maxSizeKB: 15,
        minSizeKB: 10,
        maxWidth: 800,
        maxHeight: 600,
        outputFormat: 'image/jpeg',
        initialQuality: 0.8
      });

      results.push({ 
        file, 
        compressedFile, 
        success: true,
        stats: getCompressionInfo(file, compressedFile)
      });
    } catch (error) {
      results.push({ file, success: false, error: error.message });
    }
  }

  return results;
};

// Example 5: React component integration
export const useImageCompression = () => {
  const compressAndUpload = async (file, uploadFunction, options = {}) => {
    try {
      // Validate file
      const validation = validateImageFile(file, options.maxInputSizeKB || 120);
      if (!validation.success) {
        throw new Error(validation.message);
      }

      // Compress image
      const compressedFile = await compressImage(file, {
        maxSizeKB: options.maxSizeKB || 15,
        minSizeKB: options.minSizeKB || 10,
        maxWidth: options.maxWidth || 800,
        maxHeight: options.maxHeight || 600,
        outputFormat: options.outputFormat || 'image/jpeg',
        initialQuality: options.initialQuality || 0.8
      });

      // Upload compressed file
      const result = await uploadFunction(compressedFile);

      // Return result with compression info
      return {
        ...result,
        compressionStats: getCompressionInfo(file, compressedFile)
      };
    } catch (error) {
      console.error('Image compression and upload failed:', error);
      throw error;
    }
  };

  return { compressAndUpload };
};
