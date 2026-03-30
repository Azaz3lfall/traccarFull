import { useState, useCallback } from 'react';
import { createRefuel, updateRefuel, deleteRefuel } from '../utils/apiUtils';
import { formatToDatetimeLocal, normalizeFloat } from '../utils/formatters';
import { useFriendlyNotifications } from '../../../common/hooks/useFriendlyNotifications';

// Função para redimensionar imagem e converter para base64
const resizeImageToBase64 = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calcular novas dimensões mantendo proporção
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      // Configurar canvas
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);
      
      // Converter para base64
      const base64 = canvas.toDataURL('image/jpeg', quality);
      resolve(base64);
    };
    
    img.onerror = () => reject(new Error('Erro ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
};

// Hook para gerenciar operações de abastecimentos
export const useRefuels = (allRefuels, setAllRefuels) => {
  const { showError } = useFriendlyNotifications();

  const [newStandaloneRefuel, setNewStandaloneRefuel] = useState({
    vehicle_id: '', 
    odometer: '', 
    liters_filled: '', 
    total_cost: '', 
    is_full_tank: false, 
    refuel_date: formatToDatetimeLocal(new Date()), 
    posto_nome: '', 
    cidade: ''
  });
  
  const [refuelFiles, setRefuelFiles] = useState({ 
    foto_bomba: null, 
    foto_odometro: null 
  });
  
  const [selectedRefuel, setSelectedRefuel] = useState(null);
  const [refuelEditData, setRefuelEditData] = useState({
    vehicle_id: '', 
    refuel_date: '', 
    odometer: '', 
    liters_filled: '', 
    total_cost: '', 
    is_full_tank: false, 
    posto_nome: '', 
    cidade: ''
  });
  
  const [editRefuelModalOpen, setEditRefuelModalOpen] = useState(false);
  const [deleteRefuelDialogOpen, setDeleteRefuelDialogOpen] = useState(false);
  const [selectedRefuelToDelete, setSelectedRefuelToDelete] = useState(null);
  const [loadingRefuels, setLoadingRefuels] = useState(false);

  const handleCreateRefuel = useCallback(async (e) => {
    e.preventDefault();
    setLoadingRefuels(true);
    
    try {
      // Se tem fotos, fazer upload primeiro
      let foto_bomba = null;
      let foto_odometro = null;
      
      if (refuelFiles.foto_bomba) {
        console.log('📤 UPLOAD - Iniciando upload da foto da bomba:', refuelFiles.foto_bomba.name);
        
        try {
          // Redimensionar imagem antes de converter para base64
          const resizedBase64 = await resizeImageToBase64(refuelFiles.foto_bomba, 800, 600);
          
          // Verificar se o tamanho é aceitável (< 500KB)
          if (resizedBase64.length < 500000) {
            foto_bomba = resizedBase64;
            console.log('📤 UPLOAD - Foto da bomba redimensionada e convertida para base64 (tamanho:', resizedBase64.length, 'caracteres)');
          } else {
            console.log('📤 UPLOAD - Base64 muito grande, usando upload normal');
            throw new Error('Base64 muito grande, usando upload normal');
          }
        } catch (error) {
          console.log('📤 UPLOAD - Fallback para upload normal da bomba:', error.message);
          // Fallback para upload normal
          const formData = new FormData();
          formData.append('file', refuelFiles.foto_bomba);
          
          const uploadResponse = await fetch('/gestao/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData
          });
          
          console.log('📤 UPLOAD - Resposta do upload da bomba:', uploadResponse.status, uploadResponse.statusText);
          
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            foto_bomba = uploadResult.filePath;
            console.log('📤 UPLOAD - Caminho da foto da bomba salvo:', foto_bomba);
          } else {
            console.error('📤 UPLOAD - Erro no upload da bomba:', uploadResponse.statusText);
            throw new Error('Falha no upload da foto da bomba');
          }
        }
      }
      
      if (refuelFiles.foto_odometro) {
        console.log('📤 UPLOAD - Iniciando upload da foto do odômetro:', refuelFiles.foto_odometro.name);
        
        try {
          // Redimensionar imagem antes de converter para base64
          const resizedBase64 = await resizeImageToBase64(refuelFiles.foto_odometro, 800, 600);
          
          // Verificar se o tamanho é aceitável (< 500KB)
          if (resizedBase64.length < 500000) {
            foto_odometro = resizedBase64;
            console.log('📤 UPLOAD - Foto do odômetro redimensionada e convertida para base64 (tamanho:', resizedBase64.length, 'caracteres)');
          } else {
            console.log('📤 UPLOAD - Base64 muito grande, usando upload normal');
            throw new Error('Base64 muito grande, usando upload normal');
          }
        } catch (error) {
          console.log('📤 UPLOAD - Fallback para upload normal do odômetro:', error.message);
          // Fallback para upload normal
          const formData = new FormData();
          formData.append('file', refuelFiles.foto_odometro);
          
          const uploadResponse = await fetch('/gestao/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData
          });
          
          console.log('📤 UPLOAD - Resposta do upload do odômetro:', uploadResponse.status, uploadResponse.statusText);
          
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            foto_odometro = uploadResult.filePath;
            console.log('📤 UPLOAD - Caminho da foto do odômetro salvo:', foto_odometro);
          } else {
            console.error('📤 UPLOAD - Erro no upload do odômetro:', uploadResponse.statusText);
            throw new Error('Falha no upload da foto do odômetro');
          }
        }
      }
      
      // Normalizar os valores numéricos antes de enviar
      const odometerVal = normalizeFloat(newStandaloneRefuel.odometer);
      const litersVal = normalizeFloat(newStandaloneRefuel.liters_filled);
      const totalVal = normalizeFloat(newStandaloneRefuel.total_cost);

      const normalizedRefuelData = {
        ...newStandaloneRefuel,
        refuel_date: newStandaloneRefuel.refuel_date
          ? new Date(newStandaloneRefuel.refuel_date).toISOString().slice(0, 19).replace('T', ' ')
          : null,
        odometer: odometerVal === '' || odometerVal === null || odometerVal === undefined ? null : odometerVal,
        liters_filled: litersVal === '' || litersVal === null || litersVal === undefined ? null : litersVal,
        total_cost: totalVal === '' || totalVal === null || totalVal === undefined ? null : totalVal,
        foto_bomba,
        foto_odometro
      };

      const refuelData = await createRefuel(normalizedRefuelData);

      if (refuelData && typeof refuelData === 'object' && refuelData.id != null && refuelData.refuel_date != null) {
        setAllRefuels(prev => [...prev, refuelData]);
      }
      setNewStandaloneRefuel({
        vehicle_id: '', 
        odometer: '', 
        liters_filled: '', 
        total_cost: '', 
        is_full_tank: false, 
        refuel_date: formatToDatetimeLocal(new Date()), 
        posto_nome: '', 
        cidade: ''
      });
      setRefuelFiles({ foto_bomba: null, foto_odometro: null });
    } catch (error) {
      console.error('Erro ao criar abastecimento:', error);
      let message = 'Erro ao registrar abastecimento. Verifique os campos obrigatórios.';
      if (error?.message) {
        try {
          const parsed = JSON.parse(error.message);
          message = parsed.details || parsed.message || parsed.error || error.message;
        } catch {
          message = error.message;
        }
      }
      showError(message);
    } finally {
      setLoadingRefuels(false);
    }
  }, [newStandaloneRefuel, refuelFiles, setAllRefuels]);

  const handleEditRefuel = useCallback((refuel) => {
    setSelectedRefuel(refuel);
    setRefuelEditData({
      vehicle_id: refuel.vehicle_id,
      refuel_date: formatToDatetimeLocal(refuel.refuel_date),
      odometer: refuel.odometer,
      liters_filled: refuel.liters_filled,
      total_cost: refuel.total_cost,
      is_full_tank: refuel.is_full_tank,
      posto_nome: refuel.posto_nome,
      cidade: refuel.cidade
    });
    setEditRefuelModalOpen(true);
  }, []);

  const handleSaveRefuelEdit = useCallback(async (editFiles = {}) => {
    if (!selectedRefuel) return;
    
    setLoadingRefuels(true);
    try {
      // Se há arquivos para upload, fazer upload primeiro
      let fotoBombaPath = refuelEditData.foto_bomba;
      let fotoOdometroPath = refuelEditData.foto_odometro;
      
      if (editFiles.foto_bomba) {
        const formData = new FormData();
        formData.append('file', editFiles.foto_bomba);
        const uploadResponse = await fetch('/gestao/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          fotoBombaPath = uploadResult.filePath;
        }
      }
      
      if (editFiles.foto_odometro) {
        const formData = new FormData();
        formData.append('file', editFiles.foto_odometro);
        const uploadResponse = await fetch('/gestao/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          fotoOdometroPath = uploadResult.filePath;
        }
      }
      
      // Normalizar os valores numéricos antes de enviar
      const updatedData = {
        ...refuelEditData,
        odometer: normalizeFloat(refuelEditData.odometer),
        liters_filled: normalizeFloat(refuelEditData.liters_filled),
        total_cost: normalizeFloat(refuelEditData.total_cost),
        foto_bomba: fotoBombaPath,
        foto_odometro: fotoOdometroPath
      };
      
      const updatedRefuel = await updateRefuel(selectedRefuel.id, updatedData);
      setAllRefuels(prev => prev.map(refuel => 
        refuel.id === selectedRefuel.id ? updatedRefuel : refuel
      ));
      setEditRefuelModalOpen(false);
      setSelectedRefuel(null);
    } catch (error) {
      console.error('Erro ao editar abastecimento:', error);
    } finally {
      setLoadingRefuels(false);
    }
  }, [selectedRefuel, refuelEditData, setAllRefuels]);

  const handleDeleteRefuel = useCallback((refuel) => {
    setSelectedRefuelToDelete(refuel);
    setDeleteRefuelDialogOpen(true);
  }, []);

  const handleConfirmDeleteRefuel = useCallback(async () => {
    if (!selectedRefuelToDelete) return;
    
    setLoadingRefuels(true);
    try {
      await deleteRefuel(selectedRefuelToDelete.id);
      setAllRefuels(prev => prev.filter(refuel => refuel.id !== selectedRefuelToDelete.id));
      setDeleteRefuelDialogOpen(false);
      setSelectedRefuelToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar abastecimento:', error);
    } finally {
      setLoadingRefuels(false);
    }
  }, [selectedRefuelToDelete, setAllRefuels]);

  const handleFileChange = useCallback((e) => {
    const { name, files } = e.target;
    setRefuelFiles(prev => ({
      ...prev,
      [name]: files[0] || null
    }));
  }, []);

  return {
    newStandaloneRefuel,
    setNewStandaloneRefuel,
    refuelFiles,
    setRefuelFiles,
    selectedRefuel,
    refuelEditData,
    setRefuelEditData,
    editRefuelModalOpen,
    setEditRefuelModalOpen,
    deleteRefuelDialogOpen,
    setDeleteRefuelDialogOpen,
    selectedRefuelToDelete,
    loadingRefuels,
    handleCreateRefuel,
    handleEditRefuel,
    handleSaveRefuelEdit,
    handleDeleteRefuel,
    handleConfirmDeleteRefuel,
    handleFileChange
  };
};
