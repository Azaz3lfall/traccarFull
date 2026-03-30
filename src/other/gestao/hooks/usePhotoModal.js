import { useState, useCallback } from 'react';

export const usePhotoModal = () => {
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const handleOpenPhotoModal = useCallback((photoPath) => {
    setSelectedPhoto(photoPath);
    setPhotoModalOpen(true);
  }, []);

  const handleClosePhotoModal = useCallback(() => {
    setPhotoModalOpen(false);
    setSelectedPhoto(null);
  }, []);

  return {
    photoModalOpen,
    selectedPhoto,
    handleOpenPhotoModal,
    handleClosePhotoModal
  };
};








