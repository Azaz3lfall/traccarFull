import LogoImage from './LogoImage';
import { useThemeColors } from '../common/components/ThemeProvider';
import { Card, CardContent } from '../components/ui/card';

const LoginLayout = ({ children }) => {
  const colors = useThemeColors();

  return (
    <main 
      className="min-h-screen flex flex-col relative" 
      style={{
        backgroundImage: `linear-gradient(${colors.overlay || 'rgba(15, 23, 42, 0.85)'}, ${colors.overlay || 'rgba(15, 23, 42, 0.85)'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#1F2937',
      }}
    >
      
      {/* Form Container */}
      <div className="flex-1 flex flex-col justify-center items-center relative z-20 p-5">
        <Card className="w-full max-w-[400px] relative overflow-hidden" style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          height: '600px',
        }}>
          {/* Top gradient border */}
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
          }} />
          
          <CardContent className="p-0 flex flex-col items-center justify-center h-full" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
            {/* Form Content - Full Width with 30px padding */}
            <div className="w-full px-[30px] pb-8">
              {children}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default LoginLayout;
