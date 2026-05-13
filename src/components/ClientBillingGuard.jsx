import React, { useEffect, useMemo } from 'react';
import { Alert, Button, Snackbar } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchMyFinancialStatus } from '../store';

const ClientBillingGuard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.session.user);
  const myStatus = useSelector((state) => state.financial.myStatus);

  const admin = Boolean(user?.administrator);
  const blocked = useMemo(() => {
    if (admin) return false;
    return Boolean(myStatus?.billing_blocked || user?.clientBillingBlocked);
  }, [admin, myStatus?.billing_blocked, user?.clientBillingBlocked]);

  useEffect(() => {
    if (!user || admin) return;
    dispatch(fetchMyFinancialStatus());
  }, [dispatch, user, admin]);

  useEffect(() => {
    if (!user || admin || !blocked) return;
    if (location.pathname !== '/meu-financeiro') {
      navigate('/meu-financeiro', { replace: true });
    }
  }, [user, admin, blocked, location.pathname, navigate]);

  if (!blocked) return null;

  return (
    <Snackbar open anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert
        severity="error"
        action={(
          <Button color="inherit" size="small" onClick={() => navigate('/meu-financeiro')}>
            Ver faturas
          </Button>
        )}
      >
        Seu acesso está temporariamente restrito por inadimplência. Regularize no Meu Financeiro.
      </Alert>
    </Snackbar>
  );
};

export default ClientBillingGuard;
