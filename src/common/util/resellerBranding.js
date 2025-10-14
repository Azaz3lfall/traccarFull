import fallbackLogo from '../../resources/images/image170.png?inline';
import resellersConfig from '../../config/resellersConfig';

/**
 * Fetches reseller branding data for the current domain
 * @returns {Promise<Object|null>} Reseller branding data or null if not found
 */
export const fetchResellerBranding = async () => {
  try {
    const currentDomain = window.location.hostname;
    console.log('🔍 Fetching reseller branding for domain:', currentDomain);

    const response = await fetch(resellersConfig.ENDPOINTS.RESELLER_LOGO(currentDomain));
    console.log('📡 API response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Reseller branding data received:', data);
      return data;
    } else if (response.status === 404) {
      // Domain not found - this is a definitive "no reseller" result
      console.log('❌ No reseller found for domain:', currentDomain);
      return null;
    } else {
      console.error('❌ Error fetching reseller branding:', response.status, response.statusText);
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
  console.log('🔍 applyResellerBranding called with:', resellerData);
  
  if (!resellerData || !resellerData.success || !resellerData.logo) {
    console.log('❌ Reseller branding failed - using fallback');
    console.log('  - resellerData:', !!resellerData);
    console.log('  - success:', resellerData?.success);
    console.log('  - logo:', resellerData?.logo);
    applyFallbackBranding();
    return;
  }

  const { logo, companyName } = resellerData;
  console.log('✅ Applying reseller branding:', { logo, companyName });

  // Update page title
  if (companyName) {
    document.title = companyName;
  }

  // Update meta description
  if (companyName) {
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `GPS Tracking System - ${companyName}`);
    }
  }

  // Store logo URL for use by components (make it absolute)
  const fullLogoUrl = logo.startsWith('http') ? logo : `${resellersConfig.RESELLERS_SERVER_URL}/${logo}`;
  window.resellerLogoUrl = fullLogoUrl;
  console.log('✅ Logo URL stored:', window.resellerLogoUrl);

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
  
  // Set a flag to indicate fallback branding should be used
  window.fallbackBrandingApplied = true;
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
  // Use the logo URL stored in window object
  if (window.resellerLogoUrl) {
    return window.resellerLogoUrl;
  }
  // Only return fallback logo if fallback branding has been explicitly applied
  if (window.fallbackBrandingApplied) {
    return fallbackLogo;
  }
  // Return null if no reseller data and fallback not yet applied
  return null;
};

/**
 * Gets the appropriate company name for display
 * @param {Object} resellerData - Reseller data from Redux store
 * @returns {string} Company name or default
 */
export const getCompanyName = (resellerData) => {
  if (resellerData?.success && resellerData?.companyName) {
    return resellerData.companyName;
  }
  return 'CodeArtisan GPS SaaS';
};
