import fallbackLogo from '../../resources/images/image170.png?inline';
import resellersConfig from '../../config/resellersConfig';

/**
 * Fetches reseller branding data for the current domain
 * @returns {Promise<Object|null>} Reseller branding data or null if not found
 */
export const fetchResellerBranding = async () => {
  try {
    const currentDomain = window.location.hostname;

    const requestBody = { domain: currentDomain };

    const response = await fetch(`${resellersConfig.RESELLERS_SERVER_URL}/api/domain-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });


    if (response.ok) {
      const data = await response.json();
      return data;
    } else if (response.status === 404) {
      const errorText = await response.text();
      return null;
    } else {
      console.error('❌ Error fetching reseller branding:', response.status, response.statusText);
      const errorText = await response.text();
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching reseller branding:', error);
    return null;
  }
};

/**
 * Applies reseller branding to the page
 * @param {Object} resellerData - Reseller data from API
 */
export const applyResellerBranding = (resellerData) => {
  if (!resellerData || !resellerData.data) {
    applyFallbackBranding();
    return;
  }

  const { data, imageBase64 } = resellerData;

  // Update page title
  if (data.companyName) {
    document.title = data.companyName;
  }

  // Update favicon if we have a logo
  if (imageBase64) {
    updateFavicon(imageBase64);
  }

  // Update meta description
  if (data.companyName) {
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `GPS Tracking System - ${data.companyName}`);
    }
  }

};

/**
 * Applies fallback branding when no reseller data is found
 */
export const applyFallbackBranding = () => {
  
  // Reset to default title
  document.title = 'CodeArtisan GPS SaaS';
  
  // Reset favicon to default
  resetFavicon();
  
  // Reset meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', 'CodeArtisan GPS SaaS');
  }
};

/**
 * Updates the favicon with a base64 image
 * @param {string} base64Image - Base64 encoded image
 */
const updateFavicon = (base64Image) => {
  try {
    // Create a new favicon link element
    const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/png';
    favicon.href = base64Image;
    
    // Remove existing favicon if it exists
    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (existingFavicon && existingFavicon !== favicon) {
      existingFavicon.remove();
    }
    
    // Add or update favicon
    if (!document.querySelector('link[rel="icon"]')) {
      document.head.appendChild(favicon);
    }
    
  } catch (error) {
    console.error('❌ Error updating favicon:', error);
  }
};

/**
 * Resets the favicon to default
 */
const resetFavicon = () => {
  try {
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = fallbackLogo;
    }
  } catch (error) {
    console.error('❌ Error resetting favicon:', error);
  }
};

/**
 * Gets the appropriate logo URL for display
 * @param {Object} resellerData - Reseller data from Redux store
 * @returns {string} Logo URL (reseller logo or fallback)
 */
export const getLogoUrl = (resellerData) => {
  if (resellerData?.imageBase64) {
    return resellerData.imageBase64;
  }
  return fallbackLogo;
};

/**
 * Gets the appropriate company name for display
 * @param {Object} resellerData - Reseller data from Redux store
 * @returns {string} Company name or default
 */
export const getCompanyName = (resellerData) => {
  if (resellerData?.data?.companyName) {
    return resellerData.data.companyName;
  }
  return 'CodeArtisan GPS SaaS';
};
