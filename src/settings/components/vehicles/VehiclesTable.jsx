import { memo, useMemo, useState } from 'react';
import {
  Add as AddIcon,
  ArrowDropDown as ArrowDropDownIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Print as PrintIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import TableShimmer from '../../../common/components/TableShimmer';
import useSettingsStyles from '../../common/useSettingsStyles';
import VehicleRow from './VehicleRow';
import { downloadVehiclesPdf, printVehiclesPdf } from './vehiclesPdfExport';

const getVehicleDeviceIds = (vehicle) => {
  if (Array.isArray(vehicle?.deviceIds) && vehicle.deviceIds.length > 0) {
    return vehicle.deviceIds;
  }
  if (Array.isArray(vehicle?.devices)) {
    return vehicle.devices.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null);
  }
  return vehicle?.device_id != null ? [vehicle.device_id] : [];
};

const VehiclesTable = ({
  vehicles,
  devicesById,
  loading,
  error,
  keyword,
  debouncedKeyword,
  onKeywordChange,
  onOpenCreate,
  onEditVehicle,
  onDeleteVehicle,
  onViewVehicle,
  admin,
  t,
}) => {
  const { classes } = useSettingsStyles();
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const exportMenuOpen = Boolean(exportMenuAnchor);

  const filteredVehicles = useMemo(() => {
    const list = Array.isArray(vehicles) ? vehicles : [];
    if (!debouncedKeyword || !debouncedKeyword.trim()) return list;
    const lowerKeyword = debouncedKeyword.trim().toLowerCase();

    return list.filter((vehicle) => {
      const plateMatch = (vehicle?.plate || '').toLowerCase().includes(lowerKeyword);
      const nicknameMatch = (vehicle?.nickname || '').toLowerCase().includes(lowerKeyword);
      const makeMatch = (vehicle?.make || '').toLowerCase().includes(lowerKeyword);
      const modelMatch = (vehicle?.model || '').toLowerCase().includes(lowerKeyword);
      const clientMatch = (vehicle?.client_name || '').toLowerCase().includes(lowerKeyword);

      const deviceMatch = getVehicleDeviceIds(vehicle).some((deviceId) => {
        const device = devicesById.get(deviceId);
        if (!device) return false;
        return (
          (device.name || '').toLowerCase().includes(lowerKeyword) ||
          (device.uniqueId || '').toLowerCase().includes(lowerKeyword)
        );
      });

      return plateMatch || nicknameMatch || makeMatch || modelMatch || clientMatch || deviceMatch;
    });
  }, [debouncedKeyword, devicesById, vehicles]);

  const handleOpenExportMenu = (event) => setExportMenuAnchor(event.currentTarget);
  const handleCloseExportMenu = () => setExportMenuAnchor(null);

  const handlePrint = () => {
    handleCloseExportMenu();
    printVehiclesPdf(filteredVehicles, devicesById, {
      keyword: debouncedKeyword,
      totalCount: Array.isArray(vehicles) ? vehicles.length : 0,
    });
  };

  const handleDownloadPdf = () => {
    handleCloseExportMenu();
    downloadVehiclesPdf(filteredVehicles, devicesById, {
      keyword: debouncedKeyword,
      totalCount: Array.isArray(vehicles) ? vehicles.length : 0,
    });
  };

  const exportDisabled = loading || filteredVehicles.length === 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6">Cadastro de Veículos</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip
            title={exportDisabled ? 'Nenhum veículo para exportar' : 'Imprimir ou salvar lista filtrada em PDF'}
            arrow
            slotProps={{ popper: { sx: { zIndex: 13000 } } }}
          >
            <span>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={handleOpenExportMenu}
                disabled={exportDisabled}
                aria-haspopup="menu"
                aria-expanded={exportMenuOpen ? 'true' : undefined}
              >
                Imprimir / PDF
              </Button>
            </span>
          </Tooltip>
          <Menu
            anchorEl={exportMenuAnchor}
            open={exportMenuOpen}
            onClose={handleCloseExportMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{ zIndex: 13000 }}
            slotProps={{ paper: { sx: { zIndex: 13000 } } }}
          >
            <MenuItem onClick={handlePrint}>
              <ListItemIcon>
                <PrintIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Imprimir" secondary={`${filteredVehicles.length} veículo(s)`} />
            </MenuItem>
            <MenuItem onClick={handleDownloadPdf}>
              <ListItemIcon>
                <PictureAsPdfIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Salvar como PDF" secondary={`${filteredVehicles.length} veículo(s)`} />
            </MenuItem>
          </Menu>
          {admin && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={onOpenCreate}>
              Novo Veículo
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        placeholder="Buscar por placa, modelo, nome do rastreador ou IMEI..."
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        size="small"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      <TableContainer>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell>Placa</TableCell>
              <TableCell>Apelido</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Marca</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Ano</TableCell>
              <TableCell>Tipo de veículo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && vehicles.length === 0 ? (
              <TableShimmer columns={9} />
            ) : filteredVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {keyword.trim() ? 'Nenhum veículo corresponde à busca' : 'Nenhum veículo encontrado'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredVehicles.map((vehicle) => (
                <VehicleRow
                  key={vehicle.id}
                  vehicle={vehicle}
                  devicesById={devicesById}
                  onViewVehicle={onViewVehicle}
                  onEditVehicle={onEditVehicle}
                  onDeleteVehicle={onDeleteVehicle}
                  admin={admin}
                  t={t}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default memo(VehiclesTable);
