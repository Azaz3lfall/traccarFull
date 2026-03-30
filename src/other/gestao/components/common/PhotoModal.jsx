import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

// Função helper para normalizar o caminho da imagem
const normalizeImagePath = (photoPath) => {
  if (!photoPath) return null;
  
  // Se já é uma URL completa (http/https), retornar como está
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  
  // Se começa com /uploads, converter para a rota do backend
  if (photoPath.startsWith('/uploads/')) {
    const filename = photoPath.replace(/^\/uploads\//, '');
    return `/gestao/uploads/${filename}`;
  }
  
  // Se não começa com /, assumir que é um nome de arquivo
  if (!photoPath.startsWith('/')) {
    return `/gestao/uploads/${photoPath}`;
  }
  
  // Se começa com /gestao, retornar como está
  if (photoPath.startsWith('/gestao/')) {
    return photoPath;
  }
  
  // Caso padrão: adicionar /gestao/uploads/
  return `/gestao/uploads/${photoPath.replace(/^\//, '')}`;
};

const PhotoModal = ({ open, onClose, photoPath, title = "Foto" }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open && photoPath) {
      setLoading(true);
      setError(false);
      const normalizedPath = normalizeImagePath(photoPath);
      setImageSrc(normalizedPath);
    } else {
      setImageSrc(null);
      setLoading(false);
      setError(false);
    }
  }, [open, photoPath]);

  const handleImageError = () => {
    setError(true);
    setLoading(false);
  };

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const dialogContent = (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disablePortal={false}
      container={() => document.body}
      sx={{
        position: 'fixed',
        zIndex: '11000 !important',
        '& .MuiDialog-root': {
          position: 'fixed',
          zIndex: '11000 !important',
        },
        '& .MuiDialog-container': {
          position: 'fixed !important',
          zIndex: '11000 !important',
          top: '0 !important',
          left: '0 !important',
          right: '0 !important',
          bottom: '0 !important',
        },
        '& .MuiBackdrop-root': {
          position: 'fixed !important',
          zIndex: '10999 !important',
          top: '0 !important',
          left: '0 !important',
          right: '0 !important',
          bottom: '0 !important',
        },
        '& .MuiDialog-paper': {
          position: 'fixed !important',
          zIndex: '11000 !important',
          margin: '32px !important',
        },
      }}
      BackdropProps={{
        sx: {
          position: 'fixed !important',
          zIndex: '10999 !important',
        },
      }}
      PaperProps={{
        sx: {
          position: 'fixed !important',
          zIndex: '11000 !important',
        },
      }}
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
        {photoPath && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px" width="100%">
            {loading && (
              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Carregando imagem...
                </Typography>
              </Box>
            )}
            {error && (
              <Typography variant="body1" color="error">
                Erro ao carregar a imagem
              </Typography>
            )}
            {imageSrc && !error && (
              <img
                src={imageSrc}
                alt={title}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  display: loading ? 'none' : 'block'
                }}
              />
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Sempre renderizar no body usando portal, independente de onde o componente é chamado
  if (typeof document !== 'undefined' && open) {
    return ReactDOM.createPortal(dialogContent, document.body);
  }

  return null;
};

export default PhotoModal;








