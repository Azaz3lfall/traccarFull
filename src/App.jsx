import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMediaQuery, useTheme } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import SocketController from './SocketController';
import CachingController from './CachingController';
import { useCatch, useEffectAsync } from './reactHelper';
import { sessionActions } from './store';
import UpdateController from './UpdateController';
import TermsDialog from './common/components/TermsDialog';
import getBuildStatusManager from './utils/simpleBuildStatusManager'; // Initialize global build status polling

// Initialize the build status manager
getBuildStatusManager();
import Loader from './common/components/Loader';
import fetchOrThrow from './common/util/fetchOrThrow';

const useStyles = makeStyles()(() => ({
  page: {
    flexGrow: 1,
    overflow: 'auto',
  },
}));

const App = () => {
  // Force refresh to clear Box reference
  const { classes } = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const newServer = useSelector((state) => state.session.server.newServer);
  const termsUrl = useSelector((state) => state.session.server.attributes.termsUrl);
  const user = useSelector((state) => state.session.user);

  const acceptTerms = useCatch(async () => {
    const response = await fetchOrThrow(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, attributes: { ...user.attributes, termsAccepted: true } }),
    });
    dispatch(sessionActions.updateUser(await response.json()));
  });

  useEffectAsync(async () => {
    if (!user) {
      const response = await fetch('/api/session');
      if (response.ok) {
        dispatch(sessionActions.updateUser(await response.json()));
        // Complete progress when user is loaded
        if (window.progressTracker) {
          window.progressTracker.complete();
        }
      } else {
        window.sessionStorage.setItem('postLogin', pathname + search);
        navigate(newServer ? '/register' : '/login', { replace: true });
        // Complete progress even on redirect
        if (window.progressTracker) {
          window.progressTracker.complete();
        }
      }
    } else {
      // User already loaded, complete progress
      if (window.progressTracker) {
        window.progressTracker.complete();
      }
    }
    return null;
  }, []);

  if (user == null) {
    return (<Loader />);
  }
  if (termsUrl && !user.attributes.termsAccepted) {
    return (
      <TermsDialog
        open
        onCancel={() => navigate('/login')}
        onAccept={() => acceptTerms()}
      />
    );
  }
  return (
    <>
      <SocketController />
      <CachingController />
      <UpdateController />
      <div className={classes.page}>
        <Outlet />
      </div>
    </>
  );
};

export default App;
