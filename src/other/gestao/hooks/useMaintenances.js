import { useState, useCallback } from 'react';
import { createMaintenance, updateMaintenance, deleteMaintenance } from '../utils/apiUtils';

// Hook para gerenciar operações de manutenções
export const useMaintenances = (allMaintenances, setAllMaintenances) => {
  const [newMaintenanceForm, setNewMaintenanceForm] = useState({ 
    vehicle_id: '', 
    maintenance_date: '', 
    description: '', 
    cost: '',
    odometer: '',
    provider_name: '',
    foto: null
  });
  
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [editMaintenanceModalOpen, setEditMaintenanceModalOpen] = useState(false);
  const [deleteMaintenanceDialogOpen, setDeleteMaintenanceDialogOpen] = useState(false);
  const [loadingMaintenances, setLoadingMaintenances] = useState(false);

  const handleCreateMaintenance = useCallback(async (e) => {
    e.preventDefault();
    setLoadingMaintenances(true);
    
    try {
      // Se tem foto, fazer upload primeiro
      let foto_path = null;
      if (newMaintenanceForm.foto) {
        const formData = new FormData();
        formData.append('file', newMaintenanceForm.foto);
        
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
      const maintenanceDataToSend = {
        vehicle_id: newMaintenanceForm.vehicle_id,
        maintenance_date: newMaintenanceForm.maintenance_date,
        description: newMaintenanceForm.description,
        cost: parseFloat(newMaintenanceForm.cost),
        odometer: newMaintenanceForm.odometer ? parseFloat(newMaintenanceForm.odometer) : null,
        provider_name: newMaintenanceForm.provider_name || null,
        foto_path
      };
      
      const maintenanceData = await createMaintenance(maintenanceDataToSend);
      setAllMaintenances(prev => [...prev, maintenanceData]);
      setNewMaintenanceForm({ 
        vehicle_id: '', 
        maintenance_date: '', 
        description: '', 
        cost: '',
        odometer: '',
        provider_name: '',
        foto: null
      });
    } catch (error) {
      console.error('Erro ao criar manutenção:', error);
      throw error; // Re-throw para que o componente possa tratar
    } finally {
      setLoadingMaintenances(false);
    }
  }, [newMaintenanceForm, setAllMaintenances]);

  const handleEditMaintenance = useCallback((maintenance) => {
    setSelectedMaintenance(maintenance);
    setEditMaintenanceModalOpen(true);
  }, []);

  const handleSaveMaintenanceEdit = useCallback(async (updatedData) => {
    if (!selectedMaintenance) return;
    
    setLoadingMaintenances(true);
    try {
      // Se tem nova foto, fazer upload primeiro
      let foto_path = updatedData.foto_path;
      if (updatedData.foto) {
        const formData = new FormData();
        formData.append('file', updatedData.foto);
        
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
      
      const maintenanceDataToSend = {
        ...updatedData,
        foto_path,
        foto: undefined // Remover o arquivo dos dados
      };
      
      const updatedMaintenance = await updateMaintenance(selectedMaintenance.id, maintenanceDataToSend);
      setAllMaintenances(prev => prev.map(maintenance => 
        maintenance.id === selectedMaintenance.id ? updatedMaintenance : maintenance
      ));
      setEditMaintenanceModalOpen(false);
      setSelectedMaintenance(null);
    } catch (error) {
      console.error('Erro ao editar manutenção:', error);
      throw error;
    } finally {
      setLoadingMaintenances(false);
    }
  }, [selectedMaintenance, setAllMaintenances]);

  const handleDeleteMaintenance = useCallback((maintenance) => {
    setSelectedMaintenance(maintenance);
    setDeleteMaintenanceDialogOpen(true);
  }, []);

  const handleConfirmDeleteMaintenance = useCallback(async () => {
    if (!selectedMaintenance) return;
    
    setLoadingMaintenances(true);
    try {
      await deleteMaintenance(selectedMaintenance.id);
      setAllMaintenances(prev => prev.filter(maintenance => maintenance.id !== selectedMaintenance.id));
      setDeleteMaintenanceDialogOpen(false);
      setSelectedMaintenance(null);
    } catch (error) {
      console.error('Erro ao deletar manutenção:', error);
      throw error;
    } finally {
      setLoadingMaintenances(false);
    }
  }, [selectedMaintenance, setAllMaintenances]);

  return {
    newMaintenanceForm,
    setNewMaintenanceForm,
    selectedMaintenance,
    setSelectedMaintenance,
    editMaintenanceModalOpen,
    setEditMaintenanceModalOpen,
    deleteMaintenanceDialogOpen,
    setDeleteMaintenanceDialogOpen,
    loadingMaintenances,
    handleCreateMaintenance,
    handleEditMaintenance,
    handleSaveMaintenanceEdit,
    handleDeleteMaintenance,
    handleConfirmDeleteMaintenance
  };
};

