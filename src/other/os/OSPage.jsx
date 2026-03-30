import React, { useState } from 'react';
import {
  Container,
  Box,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { useTranslation } from '../../common/components/LocalizationProvider';
import TechnicianManagement from './components/TechnicianManagement';
import OSDashboard from './components/OSDashboard';
import CreateOS from './components/CreateOS';

const OSPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <Container sx={{ mt: 2, mb: 2, px: 3 }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(e, newValue) => setTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Dashboard" />
          <Tab label="Técnicos" />
          <Tab label="Nova OS" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {tab === 0 && <OSDashboard />}
        {tab === 1 && <TechnicianManagement />}
        {tab === 2 && <CreateOS />}
      </Box>
    </Container>
  );
};

export default OSPage;

