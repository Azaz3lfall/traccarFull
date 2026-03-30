import { useState, useCallback } from 'react';
import { createExtraCost, updateExtraCost, deleteExtraCost } from '../utils/apiUtils';

// Hook para gerenciar operações de custos extras
export const useExtraCosts = (allExtraCosts, setAllExtraCosts) => {
  const [newExtraCostForm, setNewExtraCostForm] = useState({ 
    vehicle_id: '', 
    driver_id: '',
    tipo_custo: '', 
    descricao: '', 
    valor: '',
    foto: null
  });
  
  const [selectedExtraCost, setSelectedExtraCost] = useState(null);
  const [editExtraCostModalOpen, setEditExtraCostModalOpen] = useState(false);
  const [deleteExtraCostDialogOpen, setDeleteExtraCostDialogOpen] = useState(false);
  const [loadingExtraCosts, setLoadingExtraCosts] = useState(false);

  const handleCreateExtraCost = useCallback(async (e) => {
    e.preventDefault();
    if (['Salário', 'Comissão'].includes(newExtraCostForm.tipo_custo) && !newExtraCostForm.driver_id) {
      alert('Motorista é obrigatório para custos do tipo Salário ou Comissão.');
      return;
    }
    setLoadingExtraCosts(true);
    
    try {
      // Se tem foto, fazer upload primeiro
      let foto_path = null;
      if (newExtraCostForm.foto) {
        const formData = new FormData();
        formData.append('file', newExtraCostForm.foto);
        
        const uploadResponse = await fetch('/gestao/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          foto_path = uploadResult.filePath;
        } else {
          throw new Error('Falha no upload da foto');
        }
      }
      
      // Preparar dados para envio (sem o arquivo, apenas o caminho)
      const costDataToSend = {
        ...newExtraCostForm,
        foto_path,
        foto: undefined // Remover o arquivo dos dados
      };
      
      const costData = await createExtraCost(costDataToSend);
      setAllExtraCosts(prev => [...prev, costData]);
      setNewExtraCostForm({ 
        vehicle_id: '', 
        driver_id: '',
        tipo_custo: '', 
        descricao: '', 
        valor: '',
        foto: null
      });
    } catch (error) {
      console.error('Erro ao criar custo extra:', error);
    } finally {
      setLoadingExtraCosts(false);
    }
  }, [newExtraCostForm, setAllExtraCosts]);

  const handleEditExtraCost = useCallback((cost) => {
    setSelectedExtraCost(cost);
    setEditExtraCostModalOpen(true);
  }, []);

  const handleSaveExtraCostEdit = useCallback(async (updatedData) => {
    if (!selectedExtraCost) return;
    if (updatedData.tipo_custo && ['Salário', 'Comissão'].includes(updatedData.tipo_custo) && !updatedData.driver_id) {
      alert('Motorista é obrigatório para custos do tipo Salário ou Comissão.');
      return;
    }
    
    setLoadingExtraCosts(true);
    try {
      const updatedCost = await updateExtraCost(selectedExtraCost.id, updatedData);
      setAllExtraCosts(prev => prev.map(cost => 
        cost.id === selectedExtraCost.id ? updatedCost : cost
      ));
      setEditExtraCostModalOpen(false);
      setSelectedExtraCost(null);
    } catch (error) {
      console.error('Erro ao editar custo extra:', error);
    } finally {
      setLoadingExtraCosts(false);
    }
  }, [selectedExtraCost, setAllExtraCosts]);

  const handleDeleteExtraCost = useCallback((cost) => {
    setSelectedExtraCost(cost);
    setDeleteExtraCostDialogOpen(true);
  }, []);

  const handleConfirmDeleteExtraCost = useCallback(async () => {
    if (!selectedExtraCost) return;
    
    setLoadingExtraCosts(true);
    try {
      await deleteExtraCost(selectedExtraCost.id);
      setAllExtraCosts(prev => prev.filter(cost => cost.id !== selectedExtraCost.id));
      setDeleteExtraCostDialogOpen(false);
      setSelectedExtraCost(null);
    } catch (error) {
      console.error('Erro ao deletar custo extra:', error);
    } finally {
      setLoadingExtraCosts(false);
    }
  }, [selectedExtraCost, setAllExtraCosts]);

  return {
    newExtraCostForm,
    setNewExtraCostForm,
    selectedExtraCost,
    editExtraCostModalOpen,
    setEditExtraCostModalOpen,
    deleteExtraCostDialogOpen,
    setDeleteExtraCostDialogOpen,
    loadingExtraCosts,
    handleCreateExtraCost,
    handleEditExtraCost,
    handleSaveExtraCostEdit,
    handleDeleteExtraCost,
    handleConfirmDeleteExtraCost
  };
};
