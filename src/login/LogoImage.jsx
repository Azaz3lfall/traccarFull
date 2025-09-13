import { useSelector } from 'react-redux';

const LogoImage = ({ color }) => {
  const logo = useSelector((state) => state.session.server?.attributes?.logo);
  const logoInverted = useSelector((state) => state.session.server?.attributes?.logoInverted);
  
  // Use server logo or inverted logo only
  const logoUrl = logo || logoInverted;
  
  return (
    <div className="flex justify-center items-center p-4">
      {logoUrl ? (
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
        />
      ) : null}
    </div>
  );
};

export default LogoImage;