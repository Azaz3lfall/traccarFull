import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Box,
  IconButton
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  DirectionsCar as DirectionsCarIcon,
  LocalGasStation as LocalGasStationIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';
import { formatDate, formatCurrency, safeToFixed } from '../../utils/formatters';

const ReportTable = ({ 
  title, 
  columns, 
  data, 
  onPhotoClick,
  showIcons = false,
  stickyHeader = false,
  maxHeight = 400
}) => {
  const renderCellContent = (column, row, index) => {
    const value = row[column.field];
    
    switch (column.type) {
      case 'currency':
        return formatCurrency(value || 0);
      case 'date':
        return formatDate(value);
      case 'number':
        return safeToFixed(value, column.decimals || 2);
      case 'chip':
        return <Chip label={value} color="primary" size="small" />;
      case 'photo':
        return value ? (
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => onPhotoClick?.(value)}
          >
            Ver Foto
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Sem foto
          </Typography>
        );
      case 'vehicle':
        return (
          <Typography variant="body2" fontWeight="medium">
            {value}
          </Typography>
        );
      case 'distance':
        return (
          <Typography variant="body2" color="primary.main" fontWeight="medium">
            {value ? `${safeToFixed(value, 1)} km` : '-'}
          </Typography>
        );
      case 'consumption':
        return (
          <Typography variant="body2" color="success.main" fontWeight="medium">
            {value ? `${safeToFixed(value, 2)} km/L` : 'N/A'}
          </Typography>
        );
      case 'cost':
        return (
          <Typography variant="body2" fontWeight="medium" color="primary.main">
            {(() => {
              const cost = Number(value);
              return (!isNaN(cost) && cost > 0) ? formatCurrency(cost) : 'R$ 0,00';
            })()}
          </Typography>
        );
      case 'pricePerLiter':
        return (
          <Typography variant="body2" fontWeight="medium" color="secondary.main">
            {(() => {
              const cost = Number(row.total_cost);
              const liters = Number(row.liters_filled);
              const pricePerLiter = cost / liters;
              return (!isNaN(cost) && !isNaN(liters) && cost > 0 && liters > 0) 
                ? formatCurrency(pricePerLiter) 
                : 'R$ 0,00';
            })()}
          </Typography>
        );
      case 'acoes':
        return (
          <Typography variant="body2" color="text.secondary">
            {value || 'Sem Fotos'}
          </Typography>
        );
      default:
        return value || 'N/A';
    }
  };

  const renderHeaderCell = (column) => {
    if (showIcons && column.icon) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {column.icon}
          {column.headerName}
        </Box>
      );
    }
    return column.headerName;
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
        {title}
      </Typography>
      <TableContainer sx={{ maxHeight: stickyHeader ? maxHeight : 'none' }}>
        <Table size="small" stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((column, index) => (
                <TableCell key={index}>
                  {renderHeaderCell(column)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex}>
                    {renderCellContent(column, row, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ReportTable;








