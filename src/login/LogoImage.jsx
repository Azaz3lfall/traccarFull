import { useSelector } from 'react-redux';
import fallbackLogo from '../resources/images/image170.png?inline';

const LogoImage = ({ color }) => {
  const logo = useSelector((state) => state.session.server?.attributes?.logo);
  const logoInverted = useSelector((state) => state.session.server?.attributes?.logoInverted);
  
  // Use server logo or inverted logo only
  const logoUrl = logo || logoInverted;
  
  return (
    <div className="flex justify-center items-center p-4">
      <img 
        src={logoUrl || fallbackLogo} 
        alt="Server Logo" 
        className="w-auto h-auto object-contain"
        style={{ 
          maxWidth: '300px', 
          maxHeight: '100px',
          width: 'auto',
          height: 'auto'
        }}
        onError={(e) => {
          e.target.src = fallbackLogo;
        }}
      />
    </div>
  );
};

export default LogoImage;