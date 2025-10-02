import fallbackLogo from '../../resources/images/image170.png?inline';

/**
 * Fetches reseller branding data for the current domain
 * @returns {Promise<Object|null>} Reseller branding data or null if not found
 */
export const fetchResellerBranding = async () => {
  try {
    const currentDomain = window.location.hostname;
    console.log('🔍 Checking reseller branding for domain:', currentDomain);

    const requestBody = { domain: currentDomain };
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    console.log('📤 Request URL:', 'http://localhost:3333/api/domain-lookup');

    const response = await fetch('http://localhost:3333/api/domain-lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Found reseller branding data:', data);
      return data;
    } else if (response.status === 404) {
      console.log('ℹ️ No reseller branding found for domain:', currentDomain);
      const errorText = await response.text();
      console.log('📥 404 Response body:', errorText);
      return null;
    } else {
      console.error('❌ Error fetching reseller branding:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📥 Error response body:', errorText);
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
    console.log('ℹ️ No reseller data to apply, using fallback');
    applyFallbackBranding();
    return;
  }

  const { data, imageBase64 } = resellerData;
  console.log('🎨 Applying reseller branding:', data.companyName);

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

  console.log('✅ Reseller branding applied successfully');
};

/**
 * Applies fallback branding when no reseller data is found
 */
export const applyFallbackBranding = () => {
  console.log('🎨 Applying fallback branding');
  
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
    
    console.log('✅ Favicon updated with reseller logo');
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
      favicon.href = '/favicon.ico';
    }
    console.log('✅ Favicon reset to default');
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
