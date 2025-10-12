/**
 * Cloudinary utility for image upload and management
 * Uses direct API calls for browser compatibility
 */

// Get Cloudinary configuration from environment variables
const getCloudinaryConfig = () => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials not found in environment variables');
  }

  return { cloudName, apiKey, apiSecret };
};

// Map transformation keys to Cloudinary format
const mapTransformationKey = (key) => {
  const keyMap = {
    width: 'w',
    height: 'h',
    crop: 'c',
    gravity: 'g',
    quality: 'q',
    format: 'f',
    angle: 'a',
    opacity: 'o',
    overlay: 'l',
    underlay: 'u',
    effect: 'e',
    radius: 'r',
    border: 'bo',
    background: 'b'
  };
  return keyMap[key] || key;
};

// Convert transformations object to Cloudinary string format
const transformationsToString = (transformations) => {
  return Object.entries(transformations)
    .map(([key, value]) => `${mapTransformationKey(key)}_${value}`)
    .join(',');
};

/**
 * Upload image to Cloudinary using direct API calls
 * @param {File} file - The image file to upload
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder (default: 'traccar-profiles')
 * @param {string} options.publicId - Public ID for the image (optional)
 * @param {Object} options.transformations - Image transformations (optional)
 * @param {Object} options.uploadOptions - Additional upload options
 * @returns {Promise<Object>} - Upload result with URL and public_id
 */
export const uploadToCloudinary = async (file, options = {}) => {
  const {
    folder = 'traccar-profiles',
    publicId = null,
    transformations = {},
    uploadOptions = {}
  } = options;

  // Get configuration
  const { cloudName, apiKey } = getCloudinaryConfig();

  try {
    // Create form data for unsigned upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'traccar_profiles'); // This needs to be created in Cloudinary dashboard

    // Add folder
    if (folder) {
      formData.append('folder', folder);
    }

    // Add public ID if provided
    if (publicId) {
      formData.append('public_id', publicId);
    }

    // Note: Transformations are not allowed in unsigned uploads
    // They should be configured in the upload preset or applied via URL
    // We'll store the transformations for later use in URL generation

    // Add additional upload options
    Object.entries(uploadOptions).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Upload to Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const result = await response.json();
    
    // Generate the transformed URL if transformations were provided
    let finalUrl = result.secure_url;
    if (Object.keys(transformations).length > 0) {
      finalUrl = getCloudinaryImageUrl(result.public_id, transformations);
    }
    
    return {
      url: finalUrl,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      createdAt: result.created_at,
      originalFilename: result.original_filename,
      etag: result.etag,
      transformations: transformations // Include transformations for reference
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Convert File to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Base64 string
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Delete image from Cloudinary using direct API calls
 * @param {string} publicId - Public ID of the image to delete
 * @param {Object} options - Delete options
 * @returns {Promise<Object>} - Delete result
 */
export const deleteFromCloudinary = async (publicId, options = {}) => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  try {
    // Generate timestamp
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Generate signature
    const signature = await generateSignature({
      timestamp,
      publicId,
      apiSecret
    });

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_id: publicId,
        api_key: apiKey,
        timestamp,
        signature,
        ...options
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Delete failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Get Cloudinary image URL with transformations
 * @param {string} publicId - Public ID of the image
 * @param {Object} transformations - Transformations to apply
 * @param {Object} options - Additional options
 * @returns {string} - Transformed image URL
 */
export const getCloudinaryImageUrl = (publicId, transformations = {}, options = {}) => {
  const { cloudName } = getCloudinaryConfig();

  try {
    let url = `https://res.cloudinary.com/${cloudName}/image/upload`;
    
    // Add transformations if any
    if (Object.keys(transformations).length > 0) {
      const transformString = transformationsToString(transformations);
      url += `/${transformString}`;
    }
    
    // Add options
    if (Object.keys(options).length > 0) {
      const optionsString = Object.entries(options)
        .map(([key, value]) => `${key}_${value}`)
        .join(',');
      if (Object.keys(transformations).length > 0) {
        url += `,${optionsString}`;
      } else {
        url += `/${optionsString}`;
      }
    }
    
    url += `/${publicId}`;
    
    return url;
  } catch (error) {
    console.error('Cloudinary URL generation error:', error);
    throw new Error(`Failed to generate image URL: ${error.message}`);
  }
};

/**
 * Generate Cloudinary signature for authenticated requests
 * @param {Object} params - Parameters for signature
 * @returns {Promise<string>} - Generated signature
 */
const generateSignature = async (params) => {
  const { timestamp, publicId, apiSecret, folder } = params;
  
  // Create string to sign - include folder if provided
  let stringToSign = `public_id=${publicId}&timestamp=${timestamp}`;
  if (folder) {
    stringToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  }
  stringToSign += apiSecret;
  
  // Generate SHA-1 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

/**
 * Validate Cloudinary configuration
 * @returns {boolean} - Whether configuration is valid
 */
export const validateCloudinaryConfig = () => {
  try {
    getCloudinaryConfig();
    return true;
  } catch (error) {
    return false;
  }
};
