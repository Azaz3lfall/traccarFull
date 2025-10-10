import { useSelector } from 'react-redux';
import { getLogoUrl } from '../common/util/resellerBranding';

const LogoImage = ({ color }) => {
  const logo = useSelector((state) => state.session.server?.attributes?.logo);
  const logoInverted = useSelector((state) => state.session.server?.attributes?.logoInverted);
  const resellerBranding = useSelector((state) => state.session.resellerBranding);
  const resellerBrandingLoaded = useSelector((state) => state.session.resellerBrandingLoaded);
  
  // Check if we have server data (which means the app has loaded)
  const serverLoaded = useSelector((state) => !!state.session.server);
  
  // Priority: Reseller logo > Server logo > Server inverted logo > Fallback
  const logoUrl = getLogoUrl(resellerBranding) || logo || logoInverted;
  
  // If server hasn't loaded yet, don't render anything
  if (!serverLoaded) {
    return (
      <div className="flex justify-center items-center p-4">
        <div 
          className="w-auto h-auto object-contain"
          style={{ 
            maxWidth: '300px', 
            maxHeight: '100px',
            width: 'auto',
            height: 'auto'
          }}
        />
      </div>
    );
  }
  
  // If reseller branding is still loading, don't render anything to prevent fallback logo flash
  if (!resellerBrandingLoaded) {
    return (
      <div className="flex justify-center items-center p-4">
        <div 
          className="w-auto h-auto object-contain"
          style={{ 
            maxWidth: '300px', 
            maxHeight: '100px',
            width: 'auto',
            height: 'auto'
          }}
        />
      </div>
    );
  }
  
  // If we have a logo URL, render it
  if (logoUrl) {
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
  }
  
  // If server is loaded but no logo URL, show fallback
  return (
    <div className="flex justify-center items-center p-4">
      <img 
        src="/favicon.ico" 
        alt="Server Logo" 
        className="w-auto h-auto object-contain"
        style={{ 
          maxWidth: '300px', 
          maxHeight: '100px',
          width: 'auto',
          height: 'auto'
        }}
      />
    </div>
  );
};

export default LogoImage;