import React from 'react';
import { IconButton, Typography, Box } from '@mui/material';
import { 
  FirstPage as FirstPageIcon, 
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';

const CustomPagination = ({ 
  page, 
  totalPages, 
  onPageChange, 
  colors,
  size = 'small',
  showFirstLastButtons = true 
}) => {
  if (totalPages <= 1) return null;

  const handlePageClick = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const isFirstPage = page === 1;
  const isLastPage = page === totalPages;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {showFirstLastButtons && (
        <IconButton
          onClick={() => handlePageClick(1)}
          disabled={isFirstPage}
          size={size}
          style={{
            color: colors.text,
            width: size === 'small' ? '24px' : '32px',
            height: size === 'small' ? '24px' : '32px',
          }}
        >
          <FirstPageIcon fontSize="small" />
        </IconButton>
      )}

      {/* Previous button */}
      <IconButton
        onClick={() => handlePageClick(page - 1)}
        disabled={isFirstPage}
        size={size}
        style={{
          color: colors.text,
          width: size === 'small' ? '24px' : '32px',
          height: size === 'small' ? '24px' : '32px',
        }}
      >
        <ChevronLeftIcon fontSize="small" />
      </IconButton>

      {/* First page */}
      <IconButton
        onClick={() => handlePageClick(1)}
        size={size}
        style={{
          backgroundColor: page === 1 ? '#1976d2' : 'transparent',
          color: page === 1 ? 'white' : colors.text,
          width: size === 'small' ? '24px' : '32px',
          height: size === 'small' ? '24px' : '32px',
          fontSize: size === 'small' ? '10px' : '12px',
          fontWeight: page === 1 ? '700' : '400',
          border: page === 1 ? '2px solid #1976d2' : '1px solid #ccc',
          borderRadius: '4px',
          minWidth: size === 'small' ? '24px' : '32px',
        }}
      >
        1
      </IconButton>

      {/* Ellipsis if current page is not near first */}
      {page > 3 && (
        <Typography 
          style={{ 
            color: colors.textSecondary, 
            fontSize: size === 'small' ? '10px' : '12px',
            padding: '0 4px'
          }}
        >
          ...
        </Typography>
      )}

      {/* Current page (if not first or last) */}
      {page > 1 && page < totalPages && (
        <IconButton
          onClick={() => handlePageClick(page)}
          size={size}
          style={{
            backgroundColor: '#1976d2',
            color: 'white',
            width: size === 'small' ? '24px' : '32px',
            height: size === 'small' ? '24px' : '32px',
            fontSize: size === 'small' ? '10px' : '12px',
            fontWeight: '700',
            border: '2px solid #1976d2',
            borderRadius: '4px',
            minWidth: size === 'small' ? '24px' : '32px',
          }}
        >
          {page}
        </IconButton>
      )}

      {/* Ellipsis if current page is not near last */}
      {page < totalPages - 2 && (
        <Typography 
          style={{ 
            color: colors.textSecondary, 
            fontSize: size === 'small' ? '10px' : '12px',
            padding: '0 4px'
          }}
        >
          ...
        </Typography>
      )}

      {/* Last page (if different from first) */}
      {totalPages > 1 && (
        <IconButton
          onClick={() => handlePageClick(totalPages)}
          size={size}
          style={{
            backgroundColor: page === totalPages ? '#1976d2' : 'transparent',
            color: page === totalPages ? 'white' : colors.text,
            width: size === 'small' ? '24px' : '32px',
            height: size === 'small' ? '24px' : '32px',
            fontSize: size === 'small' ? '10px' : '12px',
            fontWeight: page === totalPages ? '700' : '400',
            border: page === totalPages ? '2px solid #1976d2' : '1px solid #ccc',
            borderRadius: '4px',
            minWidth: size === 'small' ? '24px' : '32px',
          }}
        >
          {totalPages}
        </IconButton>
      )}

      {/* Next button */}
      <IconButton
        onClick={() => handlePageClick(page + 1)}
        disabled={isLastPage}
        size={size}
        style={{
          color: colors.text,
          width: size === 'small' ? '24px' : '32px',
          height: size === 'small' ? '24px' : '32px',
        }}
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>

      {showFirstLastButtons && (
        <IconButton
          onClick={() => handlePageClick(totalPages)}
          disabled={isLastPage}
          size={size}
          style={{
            color: colors.text,
            width: size === 'small' ? '24px' : '32px',
            height: size === 'small' ? '24px' : '32px',
          }}
        >
          <LastPageIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};

export default CustomPagination;
