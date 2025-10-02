import { useSelector } from 'react-redux';
import { getLogoUrl, getCompanyName } from '../util/resellerBranding';

/**
 * Custom hook to access reseller branding data
 * @returns {Object} Reseller branding utilities and data
 */
export const useResellerBranding = () => {
  const resellerBranding = useSelector((state) => state.session.resellerBranding);
  
  return {
    // Raw reseller data
    resellerData: resellerBranding?.data || null,
    imageBase64: resellerBranding?.imageBase64 || null,
    
    // Utility functions
    getLogoUrl: () => getLogoUrl(resellerBranding),
    getCompanyName: () => getCompanyName(resellerBranding),
    
    // Convenience properties
    companyName: getCompanyName(resellerBranding),
    logoUrl: getLogoUrl(resellerBranding),
    
    // Check if reseller branding is available
    hasResellerBranding: !!resellerBranding,
    
    // Additional reseller data
    whatsapp: resellerBranding?.data?.whatsapp || null,
    billingEmail: resellerBranding?.data?.billingEmail || null,
    supportEmail: resellerBranding?.data?.supportEmail || null,
    appUrl: resellerBranding?.data?.appUrl || null,
  };
};

export default useResellerBranding;
