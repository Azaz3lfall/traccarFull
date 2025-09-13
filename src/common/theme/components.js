export default {
  MuiUseMediaQuery: {
    defaultProps: {
      noSsr: true,
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#374151' : '#FFFFFF',
      }),
    },
  },
  MuiButton: {
    styleOverrides: {
      sizeMedium: {
        height: '40px',
      },
    },
  },
  MuiFormControl: {
    defaultProps: {
      size: 'small',
    },
  },
  MuiSnackbar: {
    defaultProps: {
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'center',
      },
    },
    styleOverrides: {
      root: {
        zIndex: 10002, // Higher than our control bar components (10001)
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#1F2937' : '#FFFFFF',
        color: theme.palette.mode === 'dark' ? '#F9FAFB' : '#1F2937',
        border: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #E5E7EB',
        borderRadius: '8px',
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
      }),
      filled: ({ theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#1F2937' : '#FFFFFF',
        color: theme.palette.mode === 'dark' ? '#F9FAFB' : '#1F2937',
        border: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #E5E7EB',
      }),
    },
  },
  MuiTooltip: {
    defaultProps: {
      enterDelay: 500,
      enterNextDelay: 500,
    },
    styleOverrides: {
      tooltip: ({ theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F2937',
        color: theme.palette.mode === 'dark' ? '#1F2937' : '#F9FAFB',
        border: theme.palette.mode === 'dark' ? '1px solid #E5E7EB' : '1px solid #374151',
        fontSize: '12px',
        fontWeight: '500',
        padding: '6px 8px',
        borderRadius: '6px',
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -1px rgba(0, 0, 0, 0.1)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
      }),
      arrow: ({ theme }) => ({
        color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F2937',
      }),
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({
        '@media print': {
          color: theme.palette.alwaysDark.main,
        },
      }),
    },
  },
};
