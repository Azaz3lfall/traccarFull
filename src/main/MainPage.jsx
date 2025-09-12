import {
  useState, useCallback, useEffect,
} from 'react';
import { Paper } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import { devicesActions } from '../store';
import usePersistedState from '../common/util/usePersistedState';
import EventsDrawer from './EventsDrawer';
import useFilter from './useFilter';
import MainMap from './MainMap';
import { useAttributePreference } from '../common/util/preferences';
import FloatingDeviceList from '../components/FloatingDeviceList';
import FloatingStatusCard from '../components/FloatingStatusCard';
import { 
  Grid3X3, 
  Truck, 
  Map, 
  Settings, 
  PieChart, 
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('md')]: {
      position: 'fixed',
      left: 0,
      top: 0,
      height: `calc(100% - ${theme.spacing(3)})`,
      width: theme.dimensions.drawerWidthDesktop,
      margin: theme.spacing(1.5),
      zIndex: 3,
    },
    [theme.breakpoints.down('md')]: {
      height: '100%',
      width: '100%',
    },
  },
  middle: {
    flex: 1,
    display: 'grid',
    minHeight: 0,
  },
  contentMap: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
  },
}));

const MainPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const theme = useTheme();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  // Clean up tooltips when menu state changes
  useEffect(() => {
    const tooltipIds = ['menu-tooltip-dashboard', 'menu-tooltip-vehicles', 'menu-tooltip-map', 'menu-tooltip-settings', 'menu-tooltip-reports', 'menu-tooltip-expand'];
    tooltipIds.forEach(id => {
      const tooltip = document.getElementById(id);
      if (tooltip) tooltip.remove();
    });
  }, [isMenuExpanded]);

  const mapOnSelect = useAttributePreference('mapOnSelect', true);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const selectedPosition = filteredPositions.find((position) => selectedDeviceId && position.deviceId === selectedDeviceId);

  const [filteredDevices, setFilteredDevices] = useState([]);

  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = usePersistedState('filter', {
    statuses: [],
    groups: [],
  });
  const [filterSort, setFilterSort] = usePersistedState('filterSort', '');
  const [filterMap, setFilterMap] = usePersistedState('filterMap', false);

  const [eventsOpen, setEventsOpen] = useState(false);

  const onEventsClick = useCallback(() => setEventsOpen(true), [setEventsOpen]);

  const onMapClick = useCallback(() => {
    dispatch(devicesActions.selectId(null));
  }, [dispatch]);


  useFilter(keyword, filter, filterSort, filterMap, positions, setFilteredDevices, setFilteredPositions);

  return (
    <div className={classes.root}>
      {desktop && (
        <MainMap
          filteredPositions={filteredPositions}
          selectedPosition={selectedPosition}
          onEventsClick={onEventsClick}
          onMapClick={onMapClick}
        />
      )}
      <div className={classes.sidebar}>
        <div className={classes.middle}>
          {!desktop && (
            <div className={classes.contentMap}>
              <MainMap
                filteredPositions={filteredPositions}
                selectedPosition={selectedPosition}
                onEventsClick={onEventsClick}
                onMapClick={onMapClick}
              />
            </div>
          )}
        </div>
      </div>
      <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} />
      
      {/* Desktop Menu */}
      {desktop && (
        <div style={{
          position: 'fixed',
          top: '8px',
          left: '8px',
          width: isMenuExpanded ? '200px' : '55px',
          height: 'calc(100vh - 16px)',
          backgroundColor: '#1F2937',
          borderRadius: '16px 0px 0px 16px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          gap: '0px',
          transition: 'width 0.3s ease',
          overflow: 'hidden'
        }}>
          {/* Grid Icon - Active */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            backgroundColor: '#3B82F6',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            const tooltip = document.getElementById('menu-tooltip-dashboard');
            if (tooltip) tooltip.remove();
          }}
          onMouseEnter={(e) => {
            if (!isMenuExpanded) {
              const rect = e.target.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Dashboard';
              tooltip.id = 'menu-tooltip-dashboard';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
            if (!isMenuExpanded) {
              const tooltip = document.getElementById('menu-tooltip-dashboard');
              if (tooltip) tooltip.remove();
            }
          }}>
            <Grid3X3 size={18} color="white" />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                Dashboard
              </span>
            )}
          </div>
          
          {/* Truck Icon */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            const tooltip = document.getElementById('menu-tooltip-vehicles');
            if (tooltip) tooltip.remove();
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
              const rect = e.target.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Vehicles';
              tooltip.id = 'menu-tooltip-vehicles';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
              const tooltip = document.getElementById('menu-tooltip-vehicles');
              if (tooltip) tooltip.remove();
            }
          }}>
            <Truck size={18} color="white" />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                Vehicles
              </span>
            )}
          </div>
          
          {/* Map Icon */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            const tooltip = document.getElementById('menu-tooltip-map');
            if (tooltip) tooltip.remove();
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
              const rect = e.target.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Map';
              tooltip.id = 'menu-tooltip-map';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
              const tooltip = document.getElementById('menu-tooltip-map');
              if (tooltip) tooltip.remove();
            }
          }}>
            <Map size={18} color="white" />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                Map
              </span>
            )}
          </div>
          
          {/* Settings Icon */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            const tooltip = document.getElementById('menu-tooltip-settings');
            if (tooltip) tooltip.remove();
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
              const rect = e.target.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Settings';
              tooltip.id = 'menu-tooltip-settings';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
              const tooltip = document.getElementById('menu-tooltip-settings');
              if (tooltip) tooltip.remove();
            }
          }}>
            <Settings size={18} color="white" />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                Settings
              </span>
            )}
          </div>
          
          {/* Pie Chart Icon */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            const tooltip = document.getElementById('menu-tooltip-reports');
            if (tooltip) tooltip.remove();
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
              const rect = e.target.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Reports';
              tooltip.id = 'menu-tooltip-reports';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
              const tooltip = document.getElementById('menu-tooltip-reports');
              if (tooltip) tooltip.remove();
            }
          }}>
            <PieChart size={18} color="white" />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                Reports
              </span>
            )}
          </div>
          
          {/* Spacer to push chevron to bottom */}
          <div style={{ flex: 1 }} />
          
          {/* Chevron Icon */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            // Clean up any existing tooltips before toggling
            const existingTooltip = document.getElementById('menu-tooltip-expand');
            if (existingTooltip) existingTooltip.remove();
            setIsMenuExpanded(!isMenuExpanded);
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
              const rect = e.target.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Expand Menu';
              tooltip.id = 'menu-tooltip-expand';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                line-height: 1.5;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
              const tooltip = document.getElementById('menu-tooltip-expand');
              if (tooltip) tooltip.remove();
            }
          }}>
            {isMenuExpanded ? <ChevronLeft size={18} color="white" /> : <ChevronRight size={18} color="white" />}
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                {isMenuExpanded ? "Collapse" : "Expand"}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Floating Device List */}
      <FloatingDeviceList
        filteredDevices={filteredDevices}
        positions={filteredPositions}
        keyword={keyword}
        setKeyword={setKeyword}
        filter={filter}
        setFilter={setFilter}
        filterSort={filterSort}
        setFilterSort={setFilterSort}
        filterMap={filterMap}
        setFilterMap={setFilterMap}
        desktop={desktop}
      />
      
      {/* Floating Status Card */}
      <FloatingStatusCard desktop={desktop} />
      
    </div>
  );
};

export default MainPage;
