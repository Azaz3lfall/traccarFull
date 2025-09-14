import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';

const TabsComponent = ({ tabs, children, value, onChange, ...props }) => {
  const [activeTab, setActiveTab] = useState(value || 0);

  const handleChange = (event, newValue) => {
    setActiveTab(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const currentValue = value !== undefined ? value : activeTab;

  return (
    <Box {...props}>
      <Tabs
        value={currentValue}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            minHeight: 48,
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            label={tab.label}
            disabled={tab.disabled}
            sx={{
              fontSize: '14px',
              px: 2,
            }}
          />
        ))}
      </Tabs>
      <Box sx={{ pt: 2 }}>
        {children[currentValue]}
      </Box>
    </Box>
  );
};

export default TabsComponent;

