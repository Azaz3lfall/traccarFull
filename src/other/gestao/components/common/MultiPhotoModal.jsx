import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  LocalGasStation as GasIcon,
  Speed as SpeedIcon,
  Image as ImageIcon
} from '@mui/icons-material';

/**
 * Modal para exibir múltiplas fotos (abastecimentos ou custos extras)
 * Suporta galeria com tabs para diferentes tipos de foto
 */
const MultiPhotoModal = ({ open, onClose, photos = [], title = "Fotos", loading = false }) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [imageError, setImageError] = useState({});

  // Reset ao abrir
  React.useEffect(() => {
    if (open) {
      setSelectedPhotoIndex(0);
      setImageError({});
    }
  }, [open]);

  const handleImageError = (index) => {
    setImageError(prev => ({ ...prev, [index]: true }));
  };

  const renderPhotoContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Carregando fotos...
          </Typography>
        </Box>
      );
    }

    if (!photos || photos.length === 0) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <Typography variant="body1" color="text.secondary">
            Nenhuma foto disponível
          </Typography>
        </Box>
      );
    }

    // Se houver apenas uma foto, exibir direto
    if (photos.length === 1) {
      const photo = photos[0];
      return (
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
            {photo.title || 'Foto'}
          </Typography>
          <Box display="flex" justifyContent="center" alignItems="center">
            {!imageError[0] ? (
              <img 
                src={photo.url}
                alt={photo.title || 'Foto'}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh', 
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
                onError={() => handleImageError(0)}
              />
            ) : (
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center"
                sx={{ 
                  minHeight: '300px',
                  p: 3,
                  bgcolor: 'grey.100',
                  borderRadius: '8px'
                }}
              >
                <ImageIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Erro ao carregar a imagem
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {photo.filename || photo.url}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      );
    }

    // Se houver múltiplas fotos, exibir com tabs
    const selectedPhoto = photos[selectedPhotoIndex];
    
    return (
      <Box>
        {/* Tabs para navegação entre fotos */}
        <Tabs 
          value={selectedPhotoIndex} 
          onChange={(e, newValue) => setSelectedPhotoIndex(newValue)}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          {photos.map((photo, index) => (
            <Tab 
              key={index}
              label={photo.title || `Foto ${index + 1}`}
              icon={photo.type === 'bomba' ? <GasIcon /> : photo.type === 'odometro' ? <SpeedIcon /> : <ImageIcon />}
              iconPosition="start"
            />
          ))}
        </Tabs>

        {/* Imagem selecionada */}
        <Box display="flex" justifyContent="center" alignItems="center">
          {!imageError[selectedPhotoIndex] ? (
            <img 
              src={selectedPhoto.url}
              alt={selectedPhoto.title || 'Foto'}
              style={{ 
                maxWidth: '100%', 
                maxHeight: '60vh', 
                objectFit: 'contain',
                borderRadius: '8px'
              }}
              onError={() => handleImageError(selectedPhotoIndex)}
            />
          ) : (
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center"
              sx={{ 
                minHeight: '300px',
                p: 3,
                bgcolor: 'grey.100',
                borderRadius: '8px',
                width: '100%'
              }}
            >
              <ImageIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Erro ao carregar a imagem
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {selectedPhoto.filename || selectedPhoto.url}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Miniaturas */}
        {photos.length > 1 && (
          <Grid container spacing={1} sx={{ mt: 2 }}>
            {photos.map((photo, index) => (
              <Grid item xs={6} key={index}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: index === selectedPhotoIndex ? '2px solid' : '1px solid',
                    borderColor: index === selectedPhotoIndex ? 'primary.main' : 'grey.300',
                    opacity: index === selectedPhotoIndex ? 1 : 0.6,
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setSelectedPhotoIndex(index)}
                >
                  <CardContent sx={{ p: 1 }}>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {photo.type === 'bomba' ? <GasIcon fontSize="small" /> : 
                       photo.type === 'odometro' ? <SpeedIcon fontSize="small" /> : 
                       <ImageIcon fontSize="small" />}
                      {photo.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: 11000 }} // Forçar acima do FloatingGestaoPopover (10002)
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {renderPhotoContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MultiPhotoModal;

