/**
 * Client-side image compression utility
 * Compresses images to target size (10-15KB) using canvas and quality adjustment
 */

/**
 * Compress an image file to target size
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxSizeKB - Maximum target size in KB (default: 15)
 * @param {number} options.minSizeKB - Minimum target size in KB (default: 10)
 * @param {number} options.maxWidth - Maximum width for resizing (default: 800)
 * @param {number} options.maxHeight - Maximum height for resizing (default: 600)
 * @param {string} options.outputFormat - Output format (default: 'image/jpeg')
 * @param {number} options.initialQuality - Initial quality for compression (default: 0.8)
 * @returns {Promise<File>} - Compressed image file
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxSizeKB = 15,
    minSizeKB = 10,
    maxWidth = 800,
    maxHeight = 600,
    outputFormat = 'image/jpeg',
    initialQuality = 0.8
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = calculateDimensions(
          img.width, 
          img.height, 
          maxWidth, 
          maxHeight
        );

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress the image
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to achieve target size
        compressToTargetSize(canvas, file.name, outputFormat, maxSizeKB, minSizeKB, initialQuality)
          .then(resolve)
          .catch(reject);
      } catch (error) {
        reject(new Error(`Image compression failed: ${error.message}`));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
const calculateDimensions = (originalWidth, originalHeight, maxWidth, maxHeight) => {
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if image is too large
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;
    
    if (width > height) {
      width = Math.min(maxWidth, width);
      height = width / aspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
    } else {
      height = Math.min(maxHeight, height);
      width = height * aspectRatio;
      
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
    }
  }

  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Compress canvas to target file size using binary search
 */
const compressToTargetSize = async (canvas, fileName, format, maxSizeKB, minSizeKB, initialQuality) => {
  const maxSizeBytes = maxSizeKB * 1024;
  const minSizeBytes = minSizeKB * 1024;
  
  let quality = initialQuality;
  let minQuality = 0.1;
  let maxQuality = 1.0;
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    const blob = await canvasToBlob(canvas, format, quality);
    const sizeKB = blob.size / 1024;

    // If we're within target range, we're done
    if (blob.size <= maxSizeBytes && blob.size >= minSizeBytes) {
      return new File([blob], fileName, { type: format });
    }

    // If too large, reduce quality
    if (blob.size > maxSizeBytes) {
      maxQuality = quality;
      quality = (quality + minQuality) / 2;
    }
    // If too small, increase quality
    else if (blob.size < minSizeBytes) {
      minQuality = quality;
      quality = (quality + maxQuality) / 2;
    }

    // Prevent infinite loop
    if (Math.abs(maxQuality - minQuality) < 0.01) {
      break;
    }

    attempts++;
  }

  // Return the best result we found
  const finalBlob = await canvasToBlob(canvas, format, quality);
  return new File([finalBlob], fileName, { type: format });
};

/**
 * Convert canvas to blob with specified quality
 */
const canvasToBlob = (canvas, format, quality) => {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, format, quality);
  });
};

/**
 * Validate image file before compression
 * @param {File} file - The file to validate
 * @param {number} maxSizeKB - Maximum allowed size in KB (default: 120)
 * @returns {Object} - Validation result with success boolean and message
 */
export const validateImageFile = (file, maxSizeKB = 120) => {
  if (!file) {
    return { success: false, message: 'No file selected' };
  }

  if (!file.type.startsWith('image/')) {
    return { success: false, message: 'File must be an image' };
  }

  const maxSizeBytes = maxSizeKB * 1024;
  if (file.size > maxSizeBytes) {
    return { 
      success: false, 
      message: `File size must be less than ${maxSizeKB}KB` 
    };
  }

  return { success: true, message: 'File is valid' };
};

/**
 * Get compression info for debugging
 * @param {File} originalFile - Original file
 * @param {File} compressedFile - Compressed file
 * @returns {Object} - Compression statistics
 */
export const getCompressionInfo = (originalFile, compressedFile) => {
  const originalSizeKB = (originalFile.size / 1024).toFixed(2);
  const compressedSizeKB = (compressedFile.size / 1024).toFixed(2);
  const compressionRatio = ((1 - compressedFile.size / originalFile.size) * 100).toFixed(1);

  return {
    originalSize: `${originalSizeKB} KB`,
    compressedSize: `${compressedSizeKB} KB`,
    compressionRatio: `${compressionRatio}%`,
    savedBytes: originalFile.size - compressedFile.size
  };
};
