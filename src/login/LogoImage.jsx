import { useSelector } from 'react-redux';
import { getLogoUrl } from '../common/util/resellerBranding';

const LogoImage = ({ color }) => {
  const logo = useSelector((state) => state.session.server?.attributes?.logo);
  const logoInverted = useSelector((state) => state.session.server?.attributes?.logoInverted);
  const resellerBranding = useSelector((state) => state.session.resellerBranding);
  
  // Priority: Reseller logo > Server logo > Server inverted logo > Fallback
  const logoUrl = getLogoUrl(resellerBranding) || logo || logoInverted;
  
  return (
    <div className="flex justify-center items-center p-4">
      <img 
        src={logoUrl} 
        alt="Server Logo" 
        className="w-auto h-auto object-contain"
        style={{ 
          maxWidth: '300px', 
          maxHeight: '100px',
          width: 'auto',
          height: 'auto'
        }}
        onError={(e) => {
          // If reseller logo fails, fall back to server logo or default
          const fallbackUrl = logo || logoInverted || '/favicon.ico';
          e.target.src = fallbackUrl;
        }}
      />
    </div>
  );
};

export default LogoImage;