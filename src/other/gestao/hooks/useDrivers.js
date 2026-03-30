import { useState, useCallback } from 'react';
import { 
  createDriver, 
  updateDriver, 
  updateDriverPassword, 
  deleteDriver, 
  getDriverVehicles, 
  updateDriverVehicles,
  syncDriverAssociations,
  updateDriverAssociationType,
  syncSingleDriver,
  completeDriver,
  syncDriversFromTraccar
} from '../utils/apiUtils';
import { formatNameForUsername } from '../utils/formatters';
import { validateCPF, validateCNH, removeFormatting } from '../utils/validators';

// Hook para gerenciar operações de motoristas
export const useDrivers = (drivers, setDrivers) => {
  const [newDriver, setNewDriver] = useState({ 
    name: '', 
    cpf: '', 
    cnh_number: '', 
    cnh_category: '', 
    cnh_validity: '', 
    phone: '', 
    username: '', 
    password: '' 
  });
  
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverEditData, setDriverEditData] = useState({ 
    name: '', 
    cpf: '', 
    cnh_number: '', 
    cnh_category: '', 
    cnh_validity: '', 
    phone: '', 
    username: '' 
  });
  
  const [editDriverModalOpen, setEditDriverModalOpen] = useState(false);
  const [editDriverDataModalOpen, setEditDriverDataModalOpen] = useState(false);
  const [deleteDriverDialogOpen, setDeleteDriverDialogOpen] = useState(false);
  const [passwordChangeModalOpen, setPasswordChangeModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPasswordCreate, setNewPasswordCreate] = useState('');
  const [createUserError, setCreateUserError] = useState('');
  const [createDriverModalOpen, setCreateDriverModalOpen] = useState(false);

  // Estados para associação de veículos
  const [vehicleAssignmentModalOpen, setVehicleAssignmentModalOpen] = useState(false);
  const [selectedDriverForVehicles, setSelectedDriverForVehicles] = useState(null);
  const [driverVehicles, setDriverVehicles] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);

  const [loadingDrivers, setLoadingDrivers] = useState(false);

  const handleCreateDriver = useCallback(async (driverData) => {
    // Se receber um evento (compatibilidade), não fazer nada
    if (driverData && typeof driverData.preventDefault === 'function') {
      return;
    }

    setLoadingDrivers(true);
    
    try {
      // Validar CPF
      if (driverData.cpf) {
        const cpfValidation = validateCPF(driverData.cpf);
        if (!cpfValidation.valid) {
          throw new Error(cpfValidation.error);
        }
      }

      // Validar CNH
      if (driverData.cnh_number) {
        const cnhValidation = validateCNH(driverData.cnh_number);
        if (!cnhValidation.valid) {
          throw new Error(cnhValidation.error);
        }
      }

      // Gerar username automaticamente se não fornecido
      if (!driverData.username || driverData.username.trim() === '') {
        driverData.username = formatNameForUsername(driverData.name);
      }

      // Remover formatação de CPF e CNH antes de enviar
      const cleanDriverData = {
        ...driverData,
        cpf: removeFormatting(driverData.cpf),
        cnh_number: removeFormatting(driverData.cnh_number),
        phone: driverData.phone ? removeFormatting(driverData.phone) : null
      };

      const createdDriver = await createDriver(cleanDriverData);
      setDrivers(prev => [...prev, createdDriver]);
      
      // Limpar formulário
      setNewDriver({ 
        name: '', 
        cpf: '', 
        cnh_number: '', 
        cnh_category: '', 
        cnh_validity: '', 
        phone: '', 
        username: '', 
        password: '' 
      });

      return createdDriver;
    } catch (error) {
      console.error('Erro ao criar motorista:', error);
      throw error; // Re-throw para que o componente possa tratar
    } finally {
      setLoadingDrivers(false);
    }
  }, [setDrivers]);

  const handleEditDriver = useCallback((driver) => {
    setSelectedDriver(driver);
    setDriverEditData({
      name: driver.name,
      cpf: driver.cpf,
      cnh_number: driver.cnh_number,
      cnh_category: driver.cnh_category,
      cnh_validity: driver.cnh_validity,
      phone: driver.phone,
      username: driver.username
    });
    setEditDriverModalOpen(true);
  }, []);

  const handleEditDriverData = useCallback((driver) => {
    setSelectedDriver(driver);
    setEditDriverDataModalOpen(true);
  }, []);

  const handleSaveDriverEdit = useCallback(async (driverData) => {
    if (!selectedDriver) return;
    
    setLoadingDrivers(true);
    
    try {
      // Validar CPF se fornecido
      if (driverData.cpf) {
        const cpfValidation = validateCPF(driverData.cpf);
        if (!cpfValidation.valid) {
          throw new Error(cpfValidation.error);
        }
      }

      // Validar CNH se fornecida
      if (driverData.cnh_number) {
        const cnhValidation = validateCNH(driverData.cnh_number);
        if (!cnhValidation.valid) {
          throw new Error(cnhValidation.error);
        }
      }

      // Remover formatação antes de enviar
      const cleanDriverData = {
        ...driverData,
        cpf: driverData.cpf ? removeFormatting(driverData.cpf) : null,
        cnh_number: driverData.cnh_number ? removeFormatting(driverData.cnh_number) : null,
        phone: driverData.phone ? removeFormatting(driverData.phone) : null
      };

      const updatedDriver = await updateDriver(selectedDriver.id, cleanDriverData);
      setDrivers(prev => prev.map(driver => 
        driver.id === selectedDriver.id ? updatedDriver : driver
      ));
      
      setEditDriverDataModalOpen(false);
      setSelectedDriver(null);
      
      return updatedDriver;
    } catch (error) {
      console.error('Erro ao editar motorista:', error);
      throw error;
    } finally {
      setLoadingDrivers(false);
    }
  }, [selectedDriver, setDrivers]);

  const handleSyncDriverFromTraccar = useCallback(async (driverId) => {
    setLoadingDrivers(true);
    
    try {
      // Buscar dados do Traccar
      const traccarResponse = await fetch(`/api/drivers/${driverId}`, {
        credentials: 'include'
      });

      if (!traccarResponse.ok) {
        throw new Error('Motorista não encontrado no Traccar');
      }

      const traccarDriver = await traccarResponse.json();

      // Sincronizar com o SGF usando a rota POST /gestao/drivers (que faz UPSERT)
      const syncData = {
        traccar_id: traccarDriver.id,
        name: traccarDriver.name,
        uniqueId: traccarDriver.uniqueId || null
      };

      const syncResponse = await fetch('/gestao/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(syncData)
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(errorData.error || 'Erro ao sincronizar motorista');
      }

      const syncedDriver = await syncResponse.json();
      
      // Atualizar lista de motoristas
      setDrivers(prev => prev.map(driver => 
        driver.id === driverId ? { ...driver, ...syncedDriver } : driver
      ));

      return syncedDriver;
    } catch (error) {
      console.error('Erro ao sincronizar motorista do Traccar:', error);
      throw error;
    } finally {
      setLoadingDrivers(false);
    }
  }, [setDrivers]);


  const handleDeleteDriver = useCallback((driver) => {
    setSelectedDriver(driver);
    setDeleteDriverDialogOpen(true);
  }, []);

  const handleConfirmDeleteDriver = useCallback(async () => {
    if (!selectedDriver) return;
    
    setLoadingDrivers(true);
    try {
      await deleteDriver(selectedDriver.id);
      setDrivers(prev => prev.filter(driver => driver.id !== selectedDriver.id));
      setDeleteDriverDialogOpen(false);
      setSelectedDriver(null);
    } catch (error) {
      console.error('Erro ao deletar motorista:', error);
    } finally {
      setLoadingDrivers(false);
    }
  }, [selectedDriver, setDrivers]);

  const handleNameChange = useCallback((name) => {
    setNewDriver(prev => ({
      ...prev,
      name,
      username: formatNameForUsername(name)
    }));
  }, []);

  // Funções para gerenciar associações de veículos
  const handleOpenVehicleAssignment = useCallback(async (driver) => {
    setSelectedDriverForVehicles(driver);
    setVehicleAssignmentModalOpen(true);
    
    try {
      // Buscar veículos associados ao motorista
      const assignedVehicles = await getDriverVehicles(driver.id);
      setDriverVehicles(assignedVehicles);
      setSelectedVehicleIds(assignedVehicles.map(v => v.id));
    } catch (error) {
      console.error('Erro ao buscar veículos do motorista:', error);
      setDriverVehicles([]);
      setSelectedVehicleIds([]);
    }
  }, []);

  const handleCloseVehicleAssignment = useCallback(() => {
    setVehicleAssignmentModalOpen(false);
    setSelectedDriverForVehicles(null);
    setDriverVehicles([]);
    setSelectedVehicleIds([]);
  }, []);

  const handleSaveVehicleAssignment = useCallback(async () => {
    if (!selectedDriverForVehicles) return;
    
    setLoadingDrivers(true);
    try {
      await updateDriverVehicles(selectedDriverForVehicles.id, selectedVehicleIds);
      
      // Atualizar a lista de motoristas para refletir as mudanças
      setDrivers(prev => prev.map(driver => 
        driver.id === selectedDriverForVehicles.id 
          ? { ...driver, vehicle_count: selectedVehicleIds.length }
          : driver
      ));
      
      handleCloseVehicleAssignment();
    } catch (error) {
      console.error('Erro ao salvar associações de veículos:', error);
      alert('Erro ao salvar associações de veículos. Tente novamente.');
    } finally {
      setLoadingDrivers(false);
    }
  }, [selectedDriverForVehicles, selectedVehicleIds, handleCloseVehicleAssignment, setDrivers]);

  const handleVehicleSelectionChange = useCallback((vehicleId, isSelected) => {
    setSelectedVehicleIds(prev => {
      if (isSelected) {
        return [...prev, vehicleId];
      } else {
        return prev.filter(id => id !== vehicleId);
      }
    });
  }, []);

  // ⭐️ FASE 2: Funções de Sincronização
  const handleSyncAllDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    try {
      const result = await syncDriverAssociations();
      // Recarregar lista de motoristas após sincronização
      return result;
    } catch (error) {
      console.error('Erro ao sincronizar motoristas:', error);
      throw error;
    } finally {
      setLoadingDrivers(false);
    }
  }, []);

  const handleUpdateDriverAssociationType = useCallback(async (driverId, associationType, traccarUserId) => {
    setLoadingDrivers(true);
    try {
      await updateDriverAssociationType(driverId, associationType, traccarUserId);
      // Atualizar o driver na lista
      setDrivers(prev => prev.map(driver => 
        driver.id === driverId 
          ? { ...driver, association_type: associationType, traccar_user_id: traccarUserId }
          : driver
      ));
    } catch (error) {
      console.error('Erro ao alterar tipo de associação:', error);
      throw error;
    } finally {
      setLoadingDrivers(false);
    }
  }, [setDrivers]);

  const handleSyncSingleDriver = useCallback(async (driverId) => {
    setLoadingDrivers(true);
    try {
      const result = await syncSingleDriver(driverId);
      // Atualizar o driver na lista
      setDrivers(prev => prev.map(driver => 
        driver.id === driverId 
          ? { ...driver, last_sync: new Date().toISOString() }
          : driver
      ));
      return result;
    } catch (error) {
      console.error('Erro ao sincronizar motorista:', error);
      throw error;
    } finally {
      setLoadingDrivers(false);
    }
  }, [setDrivers]);

  const handleCompleteDriver = useCallback(async (driverId, driverData) => {
    setLoadingDrivers(true);
    try {
      // Validar CPF
      if (driverData.cpf) {
        const cpfValidation = validateCPF(driverData.cpf);
        if (!cpfValidation.valid) {
          throw new Error(cpfValidation.error);
        }
      }

      // Validar CNH
      if (driverData.cnh_number) {
        const cnhValidation = validateCNH(driverData.cnh_number);
        if (!cnhValidation.valid) {
          throw new Error(cnhValidation.error);
        }
      }

      // Remover formatação antes de enviar
      const cleanDriverData = {
        ...driverData,
        cpf: removeFormatting(driverData.cpf),
        cnh_number: removeFormatting(driverData.cnh_number)
      };

      const completedDriver = await completeDriver(driverId, cleanDriverData);
      
      // Atualizar o driver na lista
      setDrivers(prev => prev.map(driver => 
        driver.id === driverId 
          ? { ...driver, ...completedDriver, status: 'active' }
          : driver
      ));

      return completedDriver;
    } catch (error) {
      console.error('Erro ao completar cadastro do motorista:', error);
      throw error;
    } finally {
      setLoadingDrivers(false);
    }
  }, [setDrivers]);

  const handleSyncDriversFromTraccar = useCallback(async () => {
    setLoadingDrivers(true);
    try {
      const result = await syncDriversFromTraccar();
      
      // Recarregar lista de motoristas após sincronização
      // A lista será recarregada pelo componente pai via handleReloadDrivers
      
      return result;
    } catch (error) {
      console.error('Erro ao sincronizar motoristas do Traccar:', error);
      throw error;
    } finally {
      setLoadingDrivers(false);
    }
  }, []);

  return {
    newDriver,
    setNewDriver,
    selectedDriver,
    driverEditData,
    setDriverEditData,
    editDriverModalOpen,
    setEditDriverModalOpen,
    editDriverDataModalOpen,
    setEditDriverDataModalOpen,
    handleEditDriverData,
    deleteDriverDialogOpen,
    setDeleteDriverDialogOpen,
    passwordChangeModalOpen,
    setPasswordChangeModalOpen,
    newPassword,
    setNewPassword,
    newPasswordConfirm,
    setNewPasswordConfirm,
    passwordChangeError,
    setPasswordChangeError,
    createUserModalOpen,
    setCreateUserModalOpen,
    newUsername,
    setNewUsername,
    newPasswordCreate,
    setNewPasswordCreate,
    createUserError,
    setCreateUserError,
    loadingDrivers,
    handleCreateDriver,
    handleEditDriver,
    handleSaveDriverEdit,
    handleDeleteDriver,
    handleConfirmDeleteDriver,
    handleNameChange,
    // Estados e funções para associação de veículos
    vehicleAssignmentModalOpen,
    selectedDriverForVehicles,
    driverVehicles,
    availableVehicles,
    setAvailableVehicles,
    selectedVehicleIds,
    setSelectedVehicleIds,
    handleOpenVehicleAssignment,
    handleCloseVehicleAssignment,
    handleSaveVehicleAssignment,
    handleVehicleSelectionChange,
    // Funções da Fase 2
    handleSyncAllDrivers,
    handleUpdateDriverAssociationType,
    handleSyncSingleDriver,
    // Função de sincronização do Traccar
    handleSyncDriverFromTraccar,
    // Função para sincronizar todos os motoristas do Traccar
    handleSyncDriversFromTraccar,
    // Função para completar cadastro pendente
    handleCompleteDriver,
    // Estado para modal de criação
    createDriverModalOpen,
    setCreateDriverModalOpen
  };
};
