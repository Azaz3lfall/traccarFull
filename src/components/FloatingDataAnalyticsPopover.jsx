import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    IconButton,
    Typography,
    Button,
    TextField,
    Select,
    MenuItem,
    Checkbox,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Snackbar,
    CircularProgress,
    Autocomplete,
    Tabs,
    Tab,
    Tooltip,
    Chip,
} from '@mui/material';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    FileCopy as FileCopyIcon,
    Search as SearchIcon,
    TableChart as TableChartIcon,
    BarChart as BarChartIcon,
    PieChart as PieChartIcon,
    ShowChart as LineChartIcon,
    Timeline as AreaChartIcon,
    BubbleChart as ScatterPlotIcon,
    DonutLarge as DoughnutChartIcon,
    Title as TitleIcon,
    TextFields as TextFieldsIcon,
    Image as ImageIcon,
    HorizontalRule as DividerIcon,
    ViewModule as HeaderIcon,
    ViewStream as FooterIcon,
    Map as MapIcon,
    Numbers as NumbersIcon,
    FilterList as FilterIcon,
    DateRange as DateRangeIcon,
    DragIndicator as DragIcon,
    Close as CloseIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon,
    GridOn as GridIcon,
    Settings as SettingsIcon,
    ArrowUpward as SortAscendingIcon,
    ArrowDownward as SortDescendingIcon,
    Edit as EditIcon,
    Download as DownloadIcon,
    Upload as UploadIcon,
    Portrait as PortraitIcon,
    Landscape as LandscapeIcon,
    Speed as SpeedIcon,
    BatteryFull as BatteryIcon,
    DirectionsCar as VehicleIcon,
    Security as SecurityIcon,
    Warning,
    Notifications as AlertIcon,
    TrendingUp as TrendIcon,
    AccessTime as TimeIcon,
    Place as LocationIcon,
    Public as GlobeIcon,
    LocalShipping as TruckIcon,
    DirectionsBus as BusIcon,
    ConfirmationNumber as TicketIcon,
    Lock as LockIcon,
    LockOpen as UnlockIcon,
    ShoppingCart as CartIcon,
    LocalGasStation as GasIcon,
    FlashOn as VoltIcon,
} from '@mui/icons-material';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useAttributePreference } from '../common/util/preferences';
import { formatSpeed, formatAlarm, formatDistance, formatAltitude } from '../common/util/formatter';
import { prefixString } from '../common/util/stringUtils';
import { speedFromKnots, speedUnitString, distanceUnitString, altitudeUnitString, distanceFromMeters, altitudeFromMeters, speedToKnots, distanceToMeters, altitudeToMeters } from '../common/util/converter';

import { useTranslation } from '../common/components/LocalizationProvider';
import {
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    entityFieldDefinitions,
    entityTypeOptions,
    resolveFKEntityType,
} from '../common/util/dataAnalyticsApi';
import { useResellerBranding } from '../common/hooks/useResellerBranding';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import useMapStyles from '../map/core/useMapStyles';

const DebouncedTextField = ({ value, onChange, debounce = 600, ...props }) => {
    const [localValue, setLocalValue] = useState(value);
    const timerRef = useRef(null);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleLocalChange = (e) => {
        const newVal = e.target.value;
        setLocalValue(newVal);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onChange({ target: { value: newVal } });
        }, debounce);
    };

    const handleBlur = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            onChange({ target: { value: localValue } });
        }
    };

    return <TextField {...props} value={localValue || ''} onChange={handleLocalChange} onBlur={handleBlur} />;
};

const CustomFieldModal = ({ open, onClose, initialLabel, initialFunction, onApply }) => {
    const [localLabel, setLocalLabel] = useState(initialLabel || '');
    const [localFunction, setLocalFunction] = useState(initialFunction || '');

    useEffect(() => {
        if (open) {
            setLocalLabel(initialLabel || '');
            setLocalFunction(initialFunction || '');
        }
    }, [open, initialLabel, initialFunction]);

    const templates = {
        distance: {
            label: 'Total Distance',
            function: `const ANTI_GPS_DRIFT = false; // Protects against overnight drift\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minute window for Auto Start/Stop\n\n// Preferred: positions (high-res), fallback: route (summary points)\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\n\nconst getLat = p => p.lat != null ? p.lat : p.latitude;\nconst getLon = p => p.lon != null ? p.lon : p.longitude;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nconst getDistance = (lat1, lon1, lat2, lon2) => {\n    const R = 6371000; \n    const dLat = (lat2 - lat1) * Math.PI / 180;\n    const dLon = (lon2 - lon1) * Math.PI / 180;\n    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +\n              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *\n              Math.sin(dLon / 2) * Math.sin(dLon / 2);\n    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n};\n\nlet totalMeters = 0;\nlet lastIgnitionOnTime = 0;\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n\n    const lat1 = getLat(p1), lon1 = getLon(p1);\n    const lat2 = getLat(p2), lon2 = getLon(p2);\n    if (lat1 != null && lon1 != null && lat2 != null && lon2 != null) {\n        let isTripActive = true;\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = new Date(p1.fixTime).getTime() - lastIgnitionOnTime;\n            if (getVal(p1, 'ignition') !== true && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) isTripActive = false;\n        }\n        if (isTripActive) totalMeters += getDistance(lat1, lon1, lat2, lon2);\n    }\n}\n\nreturn (totalMeters / 1000).toFixed(2) + " km";`
        },
        consumption: {
            label: 'Fuel Consumption',
            function: `const ANTI_GPS_DRIFT = false;\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\nconst KM_PER_LITER = 12.5;\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\n\nconst getLat = p => p.lat != null ? p.lat : p.latitude;\nconst getLon = p => p.lon != null ? p.lon : p.longitude;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nconst getDistance = (lat1, lon1, lat2, lon2) => {\n    const R = 6371000;\n    const dLat = (lat2 - lat1) * Math.PI / 180;\n    const dLon = (lon2 - lon1) * Math.PI / 180;\n    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +\n              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *\n              Math.sin(dLon / 2) * Math.sin(dLon / 2);\n    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n};\n\nlet totalMeters = 0;\nlet lastIgnitionOnTime = 0;\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n\n    const lat1 = getLat(p1), lon1 = getLon(p1);\n    const lat2 = getLat(p2), lon2 = getLon(p2);\n    if (lat1 != null && lon1 != null && lat2 != null && lon2 != null) {\n        let isTripActive = true;\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = new Date(p1.fixTime).getTime() - lastIgnitionOnTime;\n            if (getVal(p1, 'ignition') !== true && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) isTripActive = false;\n        }\n        if (isTripActive) totalMeters += getDistance(lat1, lon1, lat2, lon2);\n    }\n}\n\nconst totalKm = totalMeters / 1000;\nreturn (totalKm / KM_PER_LITER).toFixed(2) + " L";`
        },
        expense: {
            label: 'Fuel Expense',
            function: `const ANTI_GPS_DRIFT = false;\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\nconst KM_PER_LITER = 12.5;\nconst PRICE_PER_LITER = 5.89;\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\n\nconst getLat = p => p.lat != null ? p.lat : p.latitude;\nconst getLon = p => p.lon != null ? p.lon : p.longitude;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nconst getDistance = (lat1, lon1, lat2, lon2) => {\n    const R = 6371000;\n    const dLat = (lat2 - lat1) * Math.PI / 180;\n    const dLon = (lon2 - lon1) * Math.PI / 180;\n    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +\n              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *\n              Math.sin(dLon / 2) * Math.sin(dLon / 2);\n    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n};\n\nlet totalMeters = 0;\nlet lastIgnitionOnTime = 0;\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n\n    const lat1 = getLat(p1), lon1 = getLon(p1);\n    const lat2 = getLat(p2), lon2 = getLon(p2);\n    if (lat1 != null && lon1 != null && lat2 != null && lon2 != null) {\n        let isTripActive = true;\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = new Date(p1.fixTime).getTime() - lastIgnitionOnTime;\n            if (getVal(p1, 'ignition') !== true && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) isTripActive = false;\n        }\n        if (isTripActive) totalMeters += getDistance(lat1, lon1, lat2, lon2);\n    }\n}\n\nconst totalKm = totalMeters / 1000;\nconst totalCost = (totalKm / KM_PER_LITER) * PRICE_PER_LITER;\nreturn "R$ " + totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });`
        },
        avgConsumption: {
            label: 'Avg Consumption (L/km)',
            function: `const ANTI_GPS_DRIFT = false;\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\nconst KM_PER_LITER = 12.5; // Vehicle's moving rate (km/L)\nconst IDLE_LITERS_PER_HOUR = 1.44; // Estimated idling fuel consumption (L/h)\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "0.000 L/km";\n\nconst getLat = p => p.lat != null ? p.lat : p.latitude;\nconst getLon = p => p.lon != null ? p.lon : p.longitude;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nconst getDistance = (lat1, lon1, lat2, lon2) => {\n    const R = 6371000;\n    const dLat = (lat2 - lat1) * Math.PI / 180;\n    const dLon = (lon2 - lon1) * Math.PI / 180;\n    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +\n              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *\n              Math.sin(dLon / 2) * Math.sin(dLon / 2);\n    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n};\n\nlet totalMeters = 0;\nlet idleMs = 0;\nlet lastIgnitionOnTime = 0;\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    const t1 = new Date(p1.fixTime).getTime(), t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = t1;\n\n    const lat1 = getLat(p1), lon1 = getLon(p1);\n    const lat2 = getLat(p2), lon2 = getLon(p2);\n    if (lat1 != null && lon1 != null && lat2 != null && lon2 != null) {\n        let isTripActive = true;\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            if (getVal(p1, 'ignition') !== true && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) isTripActive = false;\n        }\n        if (isTripActive) totalMeters += getDistance(lat1, lon1, lat2, lon2);\n    }\n\n    if (duration > 0 && duration < 3600000) {\n        const ignition = getVal(p1, 'ignition');\n        const motion = getVal(p1, 'motion');\n        const speed = p1.speed || 0;\n        if (ignition === true && (speed < 3 || motion === false)) idleMs += duration;\n    }\n}\n\nconst totalKm = totalMeters / 1000;\nif (totalKm < 0.01) return "0.000 L/km";\n\nconst drivingLiters = totalKm / KM_PER_LITER;\nconst idleLiters = (idleMs / 3600000) * IDLE_LITERS_PER_HOUR;\nconst totalLiters = drivingLiters + idleLiters;\n\nconst avg = totalLiters / totalKm;\nreturn avg.toFixed(3) + " L/km";`
        },
        avgExpense: {
            label: 'Avg Expense (R$/km)',
            function: `const ANTI_GPS_DRIFT = false;\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\nconst KM_PER_LITER = 12.5;\nconst PRICE_PER_LITER = 5.89;\nconst IDLE_COST_PER_HOUR = 8.50; // Using the same cost logic as Fuel Waste template\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "R$/km 0,00";\n\nconst getLat = p => p.lat != null ? p.lat : p.latitude;\nconst getLon = p => p.lon != null ? p.lon : p.longitude;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nconst getDistance = (lat1, lon1, lat2, lon2) => {\n    const R = 6371000;\n    const dLat = (lat2 - lat1) * Math.PI / 180;\n    const dLon = (lon2 - lon1) * Math.PI / 180;\n    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +\n              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *\n              Math.sin(dLon / 2) * Math.sin(dLon / 2);\n    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n};\n\nlet totalMeters = 0;\nlet idleMs = 0;\nlet lastIgnitionOnTime = 0;\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    const t1 = new Date(p1.fixTime).getTime(), t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = t1;\n\n    const lat1 = getLat(p1), lon1 = getLon(p1);\n    const lat2 = getLat(p2), lon2 = getLon(p2);\n    if (lat1 != null && lon1 != null && lat2 != null && lon2 != null) {\n        let isTripActive = true;\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            if (getVal(p1, 'ignition') !== true && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) isTripActive = false;\n        }\n        if (isTripActive) totalMeters += getDistance(lat1, lon1, lat2, lon2);\n    }\n\n    if (duration > 0 && duration < 3600000) {\n        const ignition = getVal(p1, 'ignition');\n        const motion = getVal(p1, 'motion');\n        const speed = p1.speed || 0;\n        if (ignition === true && (speed < 3 || motion === false)) idleMs += duration;\n    }\n}\n\nconst totalKm = totalMeters / 1000;\nif (totalKm < 0.01) return "R$/km 0,00";\n\nconst drivingCost = (totalKm / KM_PER_LITER) * PRICE_PER_LITER;\nconst idleCost = (idleMs / 3600000) * IDLE_COST_PER_HOUR;\nconst totalCost = drivingCost + idleCost;\n\nconst avg = totalCost / totalKm;\nreturn "R$/km " + avg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });`
        },
        idleTime: {
            label: 'Idle Time (Ignition ON, Not Moving)',
            function: `const ANTI_GPS_DRIFT = false; // Enable for Auto Start/Stop vehicles\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "00:00:00";\n\nlet totalMs = 0;\nlet lastIgnitionOnTime = 0;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n    const t1 = new Date(p1.fixTime).getTime(), t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0 && duration < 3600000) {\n        const ignition = getVal(p1, 'ignition');\n        const motion = getVal(p1, 'motion');\n        const speed = p1.speed || 0;\n\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            const isActive = ignition === true || timeSinceIgnition <= AUTO_STOP_TOLERANCE_MS;\n            if (isActive && (speed < 3 || motion === false)) totalMs += duration;\n        } else {\n            if (ignition === true && (speed < 3 || motion === false)) totalMs += duration;\n        }\n    }\n}\n\nconst s = Math.floor(totalMs / 1000); \nreturn [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => v.toString().padStart(2, '0')).join(':');`
        },
        stoppedTime: {
            label: 'Stopped Time (Ignition OFF)',
            function: `const ANTI_GPS_DRIFT = false; // Enable for Auto Start/Stop vehicles\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "00:00:00";\n\nlet totalMs = 0;\nlet lastIgnitionOnTime = 0;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n    const t1 = new Date(p1.fixTime).getTime(), t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0 && duration < 3600000) {\n        const ignition = getVal(p1, 'ignition');\n\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            // Only count as stopped if ignition is off AND beyond the tolerance window\n            if (ignition === false && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) totalMs += duration;\n        } else {\n            if (ignition === false) totalMs += duration;\n        }\n    }\n}\n\nconst s = Math.floor(totalMs / 1000); \nreturn [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => v.toString().padStart(2, '0')).join(':');`
        },
        movingTime: {
            label: 'Moving Time',
            function: `const ANTI_GPS_DRIFT = false; // Enable for Auto Start/Stop vehicles\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "00:00:00";\n\nlet totalMs = 0;\nlet lastIgnitionOnTime = 0;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n    const t1 = new Date(p1.fixTime).getTime(), t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0 && duration < 3600000) {\n        const ignition = getVal(p1, 'ignition');\n        const motion = getVal(p1, 'motion');\n        const speed = p1.speed || 0;\n\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            const isActive = ignition === true || timeSinceIgnition <= AUTO_STOP_TOLERANCE_MS;\n            if (isActive && motion === true && speed >= 3) totalMs += duration;\n        } else {\n            if (ignition === true && motion === true && speed >= 3) totalMs += duration;\n        }\n    }\n}\n\nconst s = Math.floor(totalMs / 1000); \nreturn [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => v.toString().padStart(2, '0')).join(':');`
        },
        ignitionOnTime: {
            label: 'Ignition On Time',
            function: `const ANTI_GPS_DRIFT = false; // Enable for Auto Start/Stop vehicles\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "00:00:00";\n\nlet totalMs = 0;\nlet lastIgnitionOnTime = 0;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n    const t1 = new Date(p1.fixTime).getTime(), t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0 && duration < 3600000) {\n        const ignition = getVal(p1, 'ignition');\n\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            const isActive = ignition === true || timeSinceIgnition <= AUTO_STOP_TOLERANCE_MS;\n            if (isActive) totalMs += duration;\n        } else {\n            if (ignition === true) totalMs += duration;\n        }\n    }\n}\n\nconst s = Math.floor(totalMs / 1000); \nreturn [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => v.toString().padStart(2, '0')).join(':');`
        },
        firstIgnition: {
            label: 'First/Last Ignition of the Day',
            function: `const FIRST_IGNITION = true; // Set to false to show the Last Ignition\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\n// Sort by fixTime to ensure chronological order (Combined reports may be unsorted)\nconst sorted = [...pts].sort((a, b) => new Date(a.fixTime || 0).getTime() - new Date(b.fixTime || 0).getTime());\n\nlet targetPos = null;\nif (FIRST_IGNITION) {\n    targetPos = sorted.find(p => getVal(p, 'ignition') === true);\n} else {\n    for (let i = sorted.length - 1; i >= 0; i--) {\n        if (getVal(sorted[i], 'ignition') === true) {\n            targetPos = sorted[i];\n            break;\n        }\n    }\n}\n\nif (!targetPos) return "No Ignition Found";\nreturn new Date(targetPos.fixTime).toLocaleString();`
        },
        noReportingGap: {
            label: 'No Reporting GAP',
            function: `const pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2 || !reportParams?.from || !reportParams?.to) return "00:00:00 (0.00%)";\n\nconst start = new Date(reportParams.from).getTime();\nconst end = new Date(reportParams.to).getTime();\nconst totalWindowMs = end - start;\nif (totalWindowMs <= 0) return "00:00:00 (0.00%)";\n\nlet reportedMs = 0;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    const t1 = new Date(p1.fixTime).getTime(), t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0 && duration < 3600000) {\n        reportedMs += duration;\n    }\n}\n\nconst gapMs = Math.max(0, totalWindowMs - reportedMs);\nconst s = Math.floor(gapMs / 1000); \nconst h = Math.floor(s / 3600);\nconst m = Math.floor((s % 3600) / 60);\nconst sec = s % 60;\nconst timeStr = [h, m, sec].map(v => v.toString().padStart(2, '0')).join(':');\nconst percentage = ((gapMs / totalWindowMs) * 100).toFixed(2);\n\nreturn \`\${timeStr} (\${percentage}%)\`;`
        },
        deviceHealth: {
            label: 'Device Health (Uptime %)',
            function: `const SHOW_GAUGE_BAR = true;\nconst SHOW_PERCENTAGE = false;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2 || !reportParams?.from || !reportParams?.to) {\n    return SHOW_GAUGE_BAR ? (SHOW_PERCENTAGE ? "GAUGE:0.00%" : "GAUGE:NOTEXT:0.00") : (SHOW_PERCENTAGE ? "0.00%" : "0.00");\n}\n\nconst start = new Date(reportParams.from).getTime();\nconst end = new Date(reportParams.to).getTime();\nconst totalWindowMs = end - start;\nif (totalWindowMs <= 0) {\n    return SHOW_GAUGE_BAR ? (SHOW_PERCENTAGE ? "GAUGE:0.00%" : "GAUGE:NOTEXT:0.00") : (SHOW_PERCENTAGE ? "0.00%" : "0.00");\n}\n\nlet reportedMs = 0;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    const t1 = new Date(p1.fixTime).getTime(), t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0 && duration < 3600000) {\n        reportedMs += duration;\n    }\n}\n\nconst uptime = ((reportedMs / totalWindowMs) * 100).toFixed(2);\n\nif (SHOW_GAUGE_BAR) {\n    return SHOW_PERCENTAGE ? \`GAUGE:\${uptime}%\` : \`GAUGE:NOTEXT:\${uptime}\`;\n}\nreturn SHOW_PERCENTAGE ? \`\${uptime}%\` : uptime;`
        },
        avgReportingInterval: {
            label: 'Avg Reporting Interval',
            function: `const ANTI_GPS_DRIFT = false;\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "00:00:00";\n\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nlet totalMs = 0;\nlet count = 0;\nlet lastIgnitionOnTime = 0;\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    if (getVal(pts[i], 'ignition') === true) lastIgnitionOnTime = new Date(pts[i].fixTime).getTime();\n    \n    const t1 = new Date(pts[i].fixTime).getTime();\n    const t2 = new Date(pts[i + 1].fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0) {\n        let isTripActive = true;\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            if (getVal(pts[i], 'ignition') !== true && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) isTripActive = false;\n        }\n        if (isTripActive) {\n            totalMs += duration;\n            count++;\n        }\n    }\n}\nif (count === 0) return "00:00:00";\nconst avgMs = totalMs / count;\nconst s = Math.floor(avgMs / 1000);\nreturn [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => v.toString().padStart(2, '0')).join(':');`
        },
        maxReportingInterval: {
            label: 'Maximum Time Between Reports',
            function: `const ANTI_GPS_DRIFT = false;\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "00:00:00";\n\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nlet maxMs = 0;\nlet lastIgnitionOnTime = 0;\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    if (getVal(pts[i], 'ignition') === true) lastIgnitionOnTime = new Date(pts[i].fixTime).getTime();\n\n    const t1 = new Date(pts[i].fixTime).getTime();\n    const t2 = new Date(pts[i + 1].fixTime).getTime();\n    const duration = t2 - t1;\n    \n    if (duration > maxMs) {\n        let isTripActive = true;\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            if (getVal(pts[i], 'ignition') !== true && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) isTripActive = false;\n        }\n        if (isTripActive) {\n            maxMs = duration;\n        }\n    }\n}\nconst s = Math.floor(maxMs / 1000);\nreturn [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => v.toString().padStart(2, '0')).join(':');`
        },
        minReportingInterval: {
            label: 'Minimum Time Between Reports',
            function: `const ANTI_GPS_DRIFT = false;\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "00:00:00";\n\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nlet minMs = Infinity;\nlet lastIgnitionOnTime = 0;\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    if (getVal(pts[i], 'ignition') === true) lastIgnitionOnTime = new Date(pts[i].fixTime).getTime();\n\n    const t1 = new Date(pts[i].fixTime).getTime();\n    const t2 = new Date(pts[i + 1].fixTime).getTime();\n    const duration = t2 - t1;\n    \n    if (duration > 0 && duration < minMs) {\n        let isTripActive = true;\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            if (getVal(pts[i], 'ignition') !== true && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) isTripActive = false;\n        }\n        if (isTripActive) {\n            minMs = duration;\n        }\n    }\n}\nif (minMs === Infinity) return "00:00:00";\nconst s = Math.floor(minMs / 1000);\nreturn [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => v.toString().padStart(2, '0')).join(':');`
        },
        engineEfficiency: {
            label: 'Engine Efficiency (%)',
            function: `const ANTI_GPS_DRIFT = false; // Enable for Auto Start/Stop vehicles\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\nconst SHOW_GAUGE_BAR = false;\nconst SHOW_PERCENTAGE = true;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return SHOW_GAUGE_BAR ? (SHOW_PERCENTAGE ? "GAUGE:0.00%" : "GAUGE:NOTEXT:0.00") : (SHOW_PERCENTAGE ? "0.00%" : "0.00");\n\nlet movingMs = 0;\nlet ignitionMs = 0;\nlet lastIgnitionOnTime = 0;\n\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n    const t1 = new Date(p1.fixTime).getTime();\n    const t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0 && duration < 3600000) {\n        const ignition = getVal(p1, 'ignition');\n        const motion = getVal(p1, 'motion');\n        const speed = p1.speed || 0;\n\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            const isActive = ignition === true || timeSinceIgnition <= AUTO_STOP_TOLERANCE_MS;\n            if (isActive) {\n                ignitionMs += duration;\n                if (motion === true && speed >= 3) movingMs += duration;\n            }\n        } else {\n            if (ignition === true) {\n                ignitionMs += duration;\n                if (motion === true && speed >= 3) movingMs += duration;\n            }\n        }\n    }\n}\n\nconst efficiency = ignitionMs > 0 ? ((movingMs / ignitionMs) * 100).toFixed(2) : "0.00";\n\nif (SHOW_GAUGE_BAR) {\n    return SHOW_PERCENTAGE ? \`GAUGE:\${efficiency}%\` : \`GAUGE:NOTEXT:\${efficiency}\`;\n}\nreturn SHOW_PERCENTAGE ? \`\${efficiency}%\` : efficiency;`
        },
        idleRatio: {
            label: 'Idle Ratio (%)',
            function: `const ANTI_GPS_DRIFT = false; // Enable for Auto Start/Stop vehicles\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\nconst SHOW_GAUGE_BAR = false;\nconst SHOW_PERCENTAGE = true;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return SHOW_GAUGE_BAR ? (SHOW_PERCENTAGE ? "GAUGE:0.00%" : "GAUGE:NOTEXT:0.00") : (SHOW_PERCENTAGE ? "0.00%" : "0.00");\n\nlet idleMs = 0;\nlet ignitionMs = 0;\nlet lastIgnitionOnTime = 0;\n\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n    const t1 = new Date(p1.fixTime).getTime();\n    const t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0 && duration < 3600000) {\n        const ignition = getVal(p1, 'ignition');\n        const motion = getVal(p1, 'motion');\n        const speed = p1.speed || 0;\n\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            const isActive = ignition === true || timeSinceIgnition <= AUTO_STOP_TOLERANCE_MS;\n            if (isActive) {\n                ignitionMs += duration;\n                if (motion === false || speed < 3) idleMs += duration;\n            }\n        } else {\n            if (ignition === true) {\n                ignitionMs += duration;\n                if (motion === false || speed < 3) idleMs += duration;\n            }\n        }\n    }\n}\n\nconst ratio = ignitionMs > 0 ? ((idleMs / ignitionMs) * 100).toFixed(2) : "0.00";\n\nif (SHOW_GAUGE_BAR) {\n    return SHOW_PERCENTAGE ? \`GAUGE:\${ratio}%\` : \`GAUGE:NOTEXT:\${ratio}\`;\n}\nreturn SHOW_PERCENTAGE ? \`\${ratio}%\` : ratio;`
        },
        tripsCount: {
            label: 'Trips Count (Ignition Cycles)',
            function: `const AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000; // 5 min tolerance for Auto Start/Stop\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "0";\n\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\n// Build ignition segments: [{start, end}] where ignition is continuously ON\n// Merge segments separated by < AUTO_STOP_TOLERANCE_MS (traffic light stops)\nlet segments = [];\nlet segStart = null;\n\nfor (let i = 0; i < pts.length; i++) {\n    const ignition = getVal(pts[i], 'ignition');\n    const t = new Date(pts[i].fixTime).getTime();\n\n    if (ignition === true && segStart === null) {\n        segStart = t;\n    } else if (ignition === false && segStart !== null) {\n        segments.push({ start: segStart, end: t });\n        segStart = null;\n    }\n}\nif (segStart !== null) {\n    segments.push({ start: segStart, end: new Date(pts[pts.length - 1].fixTime).getTime() });\n}\n\n// Merge segments with gap < tolerance\nconst merged = [];\nfor (let i = 0; i < segments.length; i++) {\n    if (merged.length > 0 && (segments[i].start - merged[merged.length - 1].end) < AUTO_STOP_TOLERANCE_MS) {\n        merged[merged.length - 1].end = segments[i].end;\n    } else {\n        merged.push({ ...segments[i] });\n    }\n}\n\nreturn merged.length.toLocaleString();`
        },
        ignitionOnOff: {
            label: 'Ignition ON/OFF Count',
            function: `const COUNT_IGNITIONS_ON = true; // Set to false to count Ignition OFF events\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000; // 5 min tolerance for Auto Start/Stop\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "0";\n\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\n// Build ignition segments (same logic as tripsCount)\nlet segments = [];\nlet segStart = null;\n\nfor (let i = 0; i < pts.length; i++) {\n    const ignition = getVal(pts[i], 'ignition');\n    const t = new Date(pts[i].fixTime).getTime();\n\n    if (ignition === true && segStart === null) {\n        segStart = t;\n    } else if (ignition === false && segStart !== null) {\n        segments.push({ start: segStart, end: t });\n        segStart = null;\n    }\n}\nif (segStart !== null) {\n    segments.push({ start: segStart, end: new Date(pts[pts.length - 1].fixTime).getTime() });\n}\n\n// Merge segments with gap < tolerance\nconst merged = [];\nfor (let i = 0; i < segments.length; i++) {\n    if (merged.length > 0 && (segments[i].start - merged[merged.length - 1].end) < AUTO_STOP_TOLERANCE_MS) {\n        merged[merged.length - 1].end = segments[i].end;\n    } else {\n        merged.push({ ...segments[i] });\n    }\n}\n\n// Each merged segment has one ON event (start) and one OFF event (end)\nreturn merged.length.toLocaleString();`
        },
        avgTripDuration: {
            label: 'Avg Trip Duration',
            function: `const AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000; // 5 min tolerance for Auto Start/Stop\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "00:00:00";\n\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\n// Build ignition segments and merge short gaps (same logic as tripsCount)\nlet segments = [];\nlet segStart = null;\n\nfor (let i = 0; i < pts.length; i++) {\n    const ignition = getVal(pts[i], 'ignition');\n    const t = new Date(pts[i].fixTime).getTime();\n\n    if (ignition === true && segStart === null) {\n        segStart = t;\n    } else if (ignition === false && segStart !== null) {\n        segments.push({ start: segStart, end: t });\n        segStart = null;\n    }\n}\nif (segStart !== null) {\n    segments.push({ start: segStart, end: new Date(pts[pts.length - 1].fixTime).getTime() });\n}\n\n// Merge segments with gap < tolerance\nconst merged = [];\nfor (let i = 0; i < segments.length; i++) {\n    if (merged.length > 0 && (segments[i].start - merged[merged.length - 1].end) < AUTO_STOP_TOLERANCE_MS) {\n        merged[merged.length - 1].end = segments[i].end;\n    } else {\n        merged.push({ ...segments[i] });\n    }\n}\n\nif (merged.length === 0) return "00:00:00";\nconst totalMs = merged.reduce((sum, seg) => sum + (seg.end - seg.start), 0);\nconst avgMs = totalMs / merged.length;\nconst s = Math.floor(avgMs / 1000);\nreturn [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => v.toString().padStart(2, '0')).join(':');`
        },
        costPerHourEngineOn: {
            label: 'Cost per Hour (Engine ON)',
            function: `const ANTI_GPS_DRIFT = false;\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\nconst KM_PER_LITER = 12.5;\nconst PRICE_PER_LITER = 5.89;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "R$ 0,00 /h";\n\nconst getLat = p => p.lat != null ? p.lat : p.latitude;\nconst getLon = p => p.lon != null ? p.lon : p.longitude;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nconst getDistance = (lat1, lon1, lat2, lon2) => {\n    const R = 6371000;\n    const dLat = (lat2 - lat1) * Math.PI / 180;\n    const dLon = (lon2 - lon1) * Math.PI / 180;\n    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +\n              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *\n              Math.sin(dLon / 2) * Math.sin(dLon / 2);\n    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n};\n\n// --- Fuel Expense (same logic as Fuel Expense template) ---\nlet totalMeters = 0;\nlet lastIgnitionOnTime = 0;\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n\n    const lat1 = getLat(p1), lon1 = getLon(p1);\n    const lat2 = getLat(p2), lon2 = getLon(p2);\n    if (lat1 != null && lon1 != null && lat2 != null && lon2 != null) {\n        let isTripActive = true;\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = new Date(p1.fixTime).getTime() - lastIgnitionOnTime;\n            if (getVal(p1, 'ignition') !== true && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) isTripActive = false;\n        }\n        if (isTripActive) totalMeters += getDistance(lat1, lon1, lat2, lon2);\n    }\n}\n\nconst totalKm = totalMeters / 1000;\nconst totalCost = (totalKm / KM_PER_LITER) * PRICE_PER_LITER;\n\n// --- Ignition ON time ---\nlet ignitionMs = 0;\nfor (let i = 0; i < pts.length - 1; i++) {\n    const t1 = new Date(pts[i].fixTime).getTime();\n    const t2 = new Date(pts[i + 1].fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0 && duration < 3600000) {\n        if (getVal(pts[i], 'ignition') === true) ignitionMs += duration;\n    }\n}\n\nconst ignitionHours = ignitionMs / 3600000;\nif (ignitionHours === 0) return "R$ 0,00 /h";\nconst costPerHour = totalCost / ignitionHours;\n\nreturn "R$ " + costPerHour.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " /h";`
        },
        fuelWasteIdle: {
            label: 'Fuel Waste (Idle Cost)',
            function: `const ANTI_GPS_DRIFT = false;\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\nconst IDLE_COST_PER_HOUR = 8.50;\nconst KM_PER_LITER = 12.5;\nconst PRICE_PER_LITER = 5.89;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "R$ 0,00 (0.00%)";\n\nconst getLat = p => p.lat != null ? p.lat : p.latitude;\nconst getLon = p => p.lon != null ? p.lon : p.longitude;\nconst getDistance = (lat1, lon1, lat2, lon2) => {\n    const R = 6371000;\n    const dLat = (lat2 - lat1) * Math.PI / 180;\n    const dLon = (lon2 - lon1) * Math.PI / 180;\n    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +\n              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *\n              Math.sin(dLon / 2) * Math.sin(dLon / 2);\n    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n};\n\nlet idleMs = 0;\nlet totalMeters = 0;\nlet lastIgnitionOnTime = 0;\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n    \n    const lat1 = getLat(p1), lon1 = getLon(p1);\n    const lat2 = getLat(p2), lon2 = getLon(p2);\n    if (lat1 != null && lon1 != null && lat2 != null && lon2 != null) {\n        let isTripActive = true;\n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = new Date(p1.fixTime).getTime() - lastIgnitionOnTime;\n            if (getVal(p1, 'ignition') !== true && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) isTripActive = false;\n        }\n        if (isTripActive) totalMeters += getDistance(lat1, lon1, lat2, lon2);\n    }\n\n    const t1 = new Date(p1.fixTime).getTime();\n    const t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0 && duration < 3600000) {\n        const ignition = getVal(p1, 'ignition');\n        const motion = getVal(p1, 'motion');\n        const speed = p1.speed || 0;\n        \n        if (ignition === true && (motion === false || speed < 3)) {\n            idleMs += duration;\n        }\n    }\n}\n\nconst idleHours = idleMs / 3600000;\nconst wasteCost = idleHours * IDLE_COST_PER_HOUR;\nconst drivingCost = ((totalMeters / 1000) / KM_PER_LITER) * PRICE_PER_LITER;\nconst grandTotal = drivingCost + wasteCost;\n\nconst pct = grandTotal > 0 ? ((wasteCost / grandTotal) * 100).toFixed(2) : "0.00";\nconst valStr = "R$ " + wasteCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });\nreturn \`\${valStr} (\${pct}%)\`;`
        },
        dataIntegrityScore: {
            label: 'Data Integrity Score (%)',
            function: `const SHOW_GAUGE_BAR = true;\nconst SHOW_PERCENTAGE = false;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2 || !reportParams?.from || !reportParams?.to) {\n    return SHOW_GAUGE_BAR ? (SHOW_PERCENTAGE ? "GAUGE:0.00%" : "GAUGE:NOTEXT:0.00") : (SHOW_PERCENTAGE ? "0.00%" : "0.00");\n}\n\nconst start = new Date(reportParams.from).getTime();\nconst end = new Date(reportParams.to).getTime();\nconst totalWindowMs = end - start;\nif (totalWindowMs <= 0) {\n    return SHOW_GAUGE_BAR ? (SHOW_PERCENTAGE ? "GAUGE:0.00%" : "GAUGE:NOTEXT:0.00") : (SHOW_PERCENTAGE ? "0.00%" : "0.00");\n}\n\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nlet reportedMs = 0;\nlet totalDurationMs = 0;\nlet intervalCount = 0;\nlet validIgnitionCount = 0;\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    const t1 = new Date(p1.fixTime).getTime();\n    const t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n    \n    if (duration > 0 && duration < 3600000) {\n        reportedMs += duration;\n    }\n    \n    if (duration > 0) {\n        totalDurationMs += duration;\n        intervalCount++;\n    }\n    \n    const ign = getVal(p1, 'ignition');\n    if (ign !== undefined && ign !== null) {\n        validIgnitionCount++;\n    }\n}\n\nconst lastIgn = getVal(pts[pts.length - 1], 'ignition');\nif (lastIgn !== undefined && lastIgn !== null) {\n    validIgnitionCount++;\n}\n\nconst uptimeScore = Math.min(100, (reportedMs / totalWindowMs) * 100);\n\nlet intervalScore = 0;\nif (intervalCount > 0) {\n    const avgSeconds = (totalDurationMs / intervalCount) / 1000;\n    if (avgSeconds <= 60) intervalScore = 100;\n    else if (avgSeconds >= 300) intervalScore = 0;\n    else {\n        intervalScore = 100 - ((avgSeconds - 60) / 240) * 100;\n    }\n}\n\nconst ignitionScore = (validIgnitionCount / pts.length) * 100;\nconst finalScore = (uptimeScore * 0.50) + (intervalScore * 0.25) + (ignitionScore * 0.25);\nconst formatted = finalScore.toFixed(2);\n\nif (SHOW_GAUGE_BAR) {\n    return SHOW_PERCENTAGE ? \`GAUGE:\${formatted}%\` : \`GAUGE:NOTEXT:\${formatted}\`;\n}\nreturn SHOW_PERCENTAGE ? \`\${formatted}%\` : formatted;`
        },
        assetUtilization: {
            label: 'Asset Utilization Rate (%)',
            function: `const ANTI_GPS_DRIFT = false;\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\nconst SHOW_GAUGE_BAR = false;\nconst SHOW_PERCENTAGE = true;\nconst AVAILABLE_HOURS_PER_DAY = 24; // Adjust expected daily available hours\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2 || !reportParams?.from || !reportParams?.to) {\n    return SHOW_GAUGE_BAR ? (SHOW_PERCENTAGE ? "GAUGE:0.00%" : "GAUGE:NOTEXT:0.00") : (SHOW_PERCENTAGE ? "0.00%" : "0.00");\n}\n\nlet movingMs = 0;\nlet idleMs = 0;\nlet lastIgnitionOnTime = 0;\n\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    if (getVal(p1, 'ignition') === true) lastIgnitionOnTime = new Date(p1.fixTime).getTime();\n\n    const t1 = new Date(p1.fixTime).getTime();\n    const t2 = new Date(p2.fixTime).getTime();\n    const duration = t2 - t1;\n    if (duration > 0 && duration < 3600000) {\n        const motion = getVal(p1, 'motion');\n        const speed = p1.speed || 0;\n        \n        if (ANTI_GPS_DRIFT) {\n            const timeSinceIgnition = t1 - lastIgnitionOnTime;\n            const isTripActive = getVal(p1, 'ignition') === true || timeSinceIgnition <= AUTO_STOP_TOLERANCE_MS;\n            \n            if (isTripActive) {\n                if (motion === true && speed >= 3) movingMs += duration;\n                else idleMs += duration;\n            }\n        } else {\n            if (motion === true && speed >= 3) movingMs += duration;\n        }\n    }\n}\n\nconst start = new Date(reportParams.from).getTime();\nconst end = new Date(reportParams.to).getTime();\nconst days = Math.max(1, Math.ceil((end - start) / 86400000));\nconst expectedMs = days * AVAILABLE_HOURS_PER_DAY * 3600000;\n\nconst totalActive = movingMs + idleMs;\nconst rate = expectedMs > 0 ? ((totalActive / expectedMs) * 100).toFixed(2) : "0.00";\n\nif (SHOW_GAUGE_BAR) {\n    return SHOW_PERCENTAGE ? \`GAUGE:\${rate}%\` : \`GAUGE:NOTEXT:\${rate}\`;\n}\nreturn SHOW_PERCENTAGE ? \`\${rate}%\` : rate;`
        },
        reportsPerHour: {
            label: 'Reports per Hour',
            function: `const pts = typeof flattened !== 'undefined' ? flattened : ((positions && positions.length > 0) ? positions : (route || data || []));\nif (pts.length === 0) return "0";\n\n// Calculate actual hours from the report time window\nlet hours = 24; // fallback\nif (reportParams?.from && reportParams?.to) {\n    const start = new Date(reportParams.from).getTime();\n    const end = new Date(reportParams.to).getTime();\n    const diffMs = end - start;\n    if (diffMs > 0) hours = diffMs / 3600000;\n}\n\nconst rate = pts.length / hours;\nreturn Math.ceil(rate);`
        },
        satelliteStats: {
            label: 'Satellites (Min / Avg / Max)',
            function: `const pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length === 0) return "N/A";\n\nlet minSat = Infinity;\nlet maxSat = -Infinity;\nlet sumSat = 0;\nlet count = 0;\n\nconst getSat = (p) => {\n    let s = p.attributes?.satellites;\n    if (s === undefined) s = p.satellites;\n    if (s === undefined) s = p.attributes?.sat;\n    if (s === undefined) s = p.sat;\n    if (s === undefined) s = p.attributes?.satellite;\n    if (s === undefined) s = p.satellite;\n    return s;\n};\n\nfor (let i = 0; i < pts.length; i++) {\n    const sat = getSat(pts[i]);\n    if (sat !== undefined && sat !== null) {\n        const val = Number(sat);\n        if (!isNaN(val)) {\n            if (val < minSat) minSat = val;\n            if (val > maxSat) maxSat = val;\n            sumSat += val;\n            count++;\n        }\n    }\n}\n\nif (count === 0) return "N/A";\nconst avgSat = Math.round(sumSat / count);\nreturn \`\${minSat} / \${avgSat} / \${maxSat}\`;`
        },
        validPositionsRatio: {
            label: 'Valid Positions Ratio (%)',
            function: `const ANTI_GPS_DRIFT = false;\nconst AUTO_STOP_TOLERANCE_MS = 5 * 60 * 1000;\nconst SHOW_GAUGE_BAR = false;\nconst SHOW_PERCENTAGE = true;\nconst VALID_POSITIONS = true; // Set to false to show Invalid Positions Ratio\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length === 0) return SHOW_GAUGE_BAR ? (SHOW_PERCENTAGE ? "GAUGE:0.00%" : "GAUGE:NOTEXT:0.00") : (SHOW_PERCENTAGE ? "0.00%" : "0.00");\n\nconst getVal = (p, k) => p[k] !== undefined ? p[k] : (p.attributes ? p.attributes[k] : undefined);\n\nlet matchCount = 0;\nlet evaluatedCount = 0;\nlet lastIgnitionOnTime = 0;\n\nfor (let i = 0; i < pts.length; i++) {\n    if (getVal(pts[i], 'ignition') === true) lastIgnitionOnTime = new Date(pts[i].fixTime).getTime();\n\n    if (ANTI_GPS_DRIFT) {\n        const timeSinceIgnition = new Date(pts[i].fixTime).getTime() - lastIgnitionOnTime;\n        if (getVal(pts[i], 'ignition') !== true && timeSinceIgnition > AUTO_STOP_TOLERANCE_MS) continue;\n    }\n    \n    evaluatedCount++;\n    const isValid = pts[i].valid === true || pts[i].valid === 'true';\n    if (VALID_POSITIONS ? isValid : !isValid) {\n        matchCount++;\n    }\n}\n\nif (evaluatedCount === 0) return SHOW_GAUGE_BAR ? (SHOW_PERCENTAGE ? "GAUGE:0.00%" : "GAUGE:NOTEXT:0.00") : (SHOW_PERCENTAGE ? "0.00%" : "0.00");\nconst ratio = ((matchCount / evaluatedCount) * 100).toFixed(2);\n\nif (SHOW_GAUGE_BAR) {\n    return SHOW_PERCENTAGE ? \`GAUGE:\${ratio}%\` : \`GAUGE:NOTEXT:\${ratio}\`;\n}\nreturn SHOW_PERCENTAGE ? \`\${ratio}%\` : ratio;`
        },
        realtimeVsBuffer: {
            label: 'Realtime / Buffer Count',
            function: `const TIME_DIFFERENCE_SECONDS = 5;\nconst COUNT_REALTIME = true; // Set to false to count Buffer positions\n\nconst pts = typeof flattened !== 'undefined' ? flattened : ((positions && positions.length > 0) ? positions : (route || data || []));\nif (pts.length === 0) return "0";\n\nlet matchCount = 0;\n\nfor (let i = 0; i < pts.length; i++) {\n    const p = pts[i];\n    let diffSeconds = 0;\n\n    if (p.fixTime != null && p.deviceTime != null) {\n        const tFix = new Date(p.fixTime).getTime();\n        const tDev = new Date(p.deviceTime).getTime();\n        diffSeconds = Math.abs(tDev - tFix) / 1000;\n    }\n    \n    // Account for elements missing full timestamp pairs (e.g. events)\n    if (COUNT_REALTIME) {\n        if (diffSeconds <= TIME_DIFFERENCE_SECONDS || isNaN(diffSeconds)) matchCount++;\n    } else {\n        if (diffSeconds > TIME_DIFFERENCE_SECONDS) matchCount++;\n    }\n}\n\nreturn matchCount.toLocaleString();`
        },
        gpsDriftCounter: {
            label: 'GPS Drift Counter',
            function: `const DISTANCE_X_METERS = 90; // Distance threshold (X)\nconst TIME_Y_SECONDS = 5;      // Time threshold (Y) in seconds\n\n/*\nEquivalent Ratios (for 5 seconds):\n- 30 m/s (~108 km/h)\n  DISTANCE = 30 * 5 = 150 meters\n  Ratio: 150m / 5s\n\n- 50 m/s (~180 km/h)\n  DISTANCE = 50 * 5 = 250 meters\n  Ratio: 250m / 5s\n\n- 70 m/s (~252 km/h)\n  DISTANCE = 70 * 5 = 350 meters\n  Ratio: 350m / 5s\n*/\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (pts.length < 2) return "0 (0 km/h)";\n\nconst getLat = p => p.lat != null ? p.lat : p.latitude;\nconst getLon = p => p.lon != null ? p.lon : p.longitude;\nconst getDistance = (lat1, lon1, lat2, lon2) => {\n    const R = 6371000;\n    const dLat = (lat2 - lat1) * Math.PI / 180;\n    const dLon = (lon2 - lon1) * Math.PI / 180;\n    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +\n              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *\n              Math.sin(dLon / 2) * Math.sin(dLon / 2);\n    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n};\n\nlet driftCount = 0;\nlet maxDriftSpeed = 0;\n\nfor (let i = 0; i < pts.length - 1; i++) {\n    const p1 = pts[i], p2 = pts[i + 1];\n    \n    const lat1 = getLat(p1), lon1 = getLon(p1);\n    const lat2 = getLat(p2), lon2 = getLon(p2);\n    \n    if (lat1 != null && lon1 != null && lat2 != null && lon2 != null) {\n        const distMeters = getDistance(lat1, lon1, lat2, lon2);\n        const t1 = new Date(p1.fixTime).getTime();\n        const t2 = new Date(p2.fixTime).getTime();\n        const deltaTimeSeconds = (t2 - t1) / 1000;\n        \n        if (distMeters > DISTANCE_X_METERS && deltaTimeSeconds <= TIME_Y_SECONDS && deltaTimeSeconds >= 0) {\n            driftCount++;\n            const safeDelta = deltaTimeSeconds > 0 ? deltaTimeSeconds : 1;\n            const currentSpeedKmh = (distMeters / safeDelta) * 3.6;\n            if (currentSpeedKmh > maxDriftSpeed) {\n                maxDriftSpeed = currentSpeedKmh;\n            }\n        }\n    }\n}\n\nif (driftCount === 0) return "0 (0 km/h)";\nreturn \`\${driftCount.toLocaleString()} (\${maxDriftSpeed.toFixed(0)} km/h)\`;`
        },
        mostDistantPoints: {
            label: 'Most Distant Points Coordinates',
            function: `const MOST_DISTANT = true;\n\nconst pts = (positions && positions.length > 0) ? positions : (route || data || []);\nif (!pts || pts.length < 2) return "N/A";\n\nconst getLat = p => p.lat != null ? p.lat : p.latitude;\nconst getLon = p => p.lon != null ? p.lon : p.longitude;\n\nif (!MOST_DISTANT) {\n    const sorted = [...pts].sort((a, b) => new Date(a.fixTime || 0).getTime() - new Date(b.fixTime || 0).getTime());\n    const first = sorted[0];\n    const last = sorted[sorted.length - 1];\n    const lat1 = getLat(first), lon1 = getLon(first);\n    const lat2 = getLat(last), lon2 = getLon(last);\n    \n    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return "N/A";\n    const coords = \`\${lat1.toFixed(5)},\${lon1.toFixed(5)}\`;\n    const coords2 = \`\${lat2.toFixed(5)},\${lon2.toFixed(5)}\`;\n    const url = \`https://www.google.com/maps/dir/\${coords}/\${coords2}\`;\n    return \`LINK:\${url}|\${coords} → \${coords2}\`;\n}\n\nconst getDistance = (lat1, lon1, lat2, lon2) => {\n    const R = 6371000;\n    const dLat = (lat2 - lat1) * Math.PI / 180;\n    const dLon = (lon2 - lon1) * Math.PI / 180;\n    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +\n              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *\n              Math.sin(dLon / 2) * Math.sin(dLon / 2);\n    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n};\n\nlet maxDist = -1;\nlet bestPair = null;\n\nconst validPoints = [];\nfor (let i = 0; i < pts.length; i++) {\n    const lat = getLat(pts[i]), lon = getLon(pts[i]);\n    if (lat != null && lon != null) validPoints.push({ lat, lon });\n}\n\nif (validPoints.length < 2) return "N/A";\n\n// Sampling optimization: check every Nth point for large datasets to prevent UI freeze\nconst SAMPLE_THRESHOLD = 500;\nconst step = validPoints.length > SAMPLE_THRESHOLD ? Math.ceil(validPoints.length / SAMPLE_THRESHOLD) : 1;\n\nfor (let i = 0; i < validPoints.length; i += step) {\n    for (let j = i + 1; j < validPoints.length; j += step) {\n        const d = getDistance(validPoints[i].lat, validPoints[i].lon, validPoints[j].lat, validPoints[j].lon);\n        if (d > maxDist) {\n            maxDist = d;\n            bestPair = [validPoints[i], validPoints[j]];\n        }\n    }\n}\n\nif (!bestPair) return "N/A";\nconst c1 = \`\${bestPair[0].lat.toFixed(5)},\${bestPair[0].lon.toFixed(5)}\`;\nconst c2 = \`\${bestPair[1].lat.toFixed(5)},\${bestPair[1].lon.toFixed(5)}\`;\nconst mapsUrl = \`https://www.google.com/maps/dir/\${c1}/\${c2}\`;\nreturn \`LINK:\${mapsUrl}|\${c1} → \${c2}\`;`
        }
    };

    return (
        <Dialog open={open} onClose={onClose} style={{ zIndex: 999999 }}>
            <DialogTitle>Configure Custom KPI</DialogTitle>
            <DialogContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '10px' }}>
                    <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                        Define a custom field name and a JavaScript function to calculate the KPI value. 
                        Variables: <strong>route</strong> (summary data), <strong>positions</strong> (high-res data if available), <strong>devices</strong> (all devices), <strong>events</strong> (all events), <strong>flattened</strong> (table state), and <strong>data</strong> (legacy alias).
                        Example: <code>return positions.length;</code>
                    </Alert>
                    
                    <TextField
                        select
                        label="Load Template"
                        fullWidth
                        size="small"
                        value=""
                        InputLabelProps={{ shrink: true }}
                        onChange={(e) => {
                            const tpl = templates[e.target.value];
                            if (tpl) {
                                setLocalLabel(tpl.label);
                                setLocalFunction(tpl.function);
                            }
                        }}
                        SelectProps={{ native: true }}
                    >
                        <option value="" disabled>— Select a Template —</option>
                        <option value="distance">Total Distance (km)</option>
                        <option value="consumption">Fuel Consumption (L)</option>
                        <option value="expense">Fuel Expense (R$)</option>
                        <option value="avgConsumption">Avg Consumption (L/km)</option>
                        <option value="avgExpense">Avg Expense (R$/km)</option>
                        <option value="idleTime">Idle Time (HH:mm:ss)</option>
                        <option value="stoppedTime">Stopped Time (HH:mm:ss)</option>
                        <option value="movingTime">Moving Time (HH:mm:ss)</option>
                        <option value="ignitionOnTime">Ignition On Time (HH:mm:ss)</option>
                        <option value="firstIgnition">First/Last Ignition of the Day</option>
                        <option value="noReportingGap">No Reporting GAP (HH:mm:ss %)</option>
                        <option value="deviceHealth">Device Health (Uptime %)</option>
                        <option value="avgReportingInterval">Avg Reporting Interval</option>
                        <option value="maxReportingInterval">Maximum Time Between Reports</option>
                        <option value="minReportingInterval">Minimum Time Between Reports</option>
                        <option value="engineEfficiency">Engine Efficiency (%)</option>
                        <option value="idleRatio">Idle Ratio (%)</option>
                        <option value="tripsCount">Trips Count</option>
                        <option value="ignitionOnOff">Ignition ON/OFF Count</option>
                        <option value="avgTripDuration">Avg Trip Duration</option>
                        <option value="costPerHourEngineOn">Cost per Hour (Engine ON)</option>
                        <option value="fuelWasteIdle">Fuel Waste (Idle Cost)</option>
                        <option value="dataIntegrityScore">Data Integrity Score (%)</option>
                        <option value="assetUtilization">Asset Utilization Rate (%)</option>
                        <option value="reportsPerHour">Reports per Hour</option>
                        <option value="satelliteStats">Satellites (Min / Avg / Max)</option>
                        <option value="validPositionsRatio">Valid Positions Ratio (%)</option>
                        <option value="realtimeVsBuffer">Realtime / Buffer Count</option>
                        <option value="gpsDriftCounter">GPS Drift Counter</option>
                        <option value="mostDistantPoints">Most Distant Points Coordinates</option>
                    </TextField>

                    <TextField
                        label="Custom Field Name"
                        fullWidth
                        size="small"
                        value={localLabel}
                        onChange={(e) => setLocalLabel(e.target.value)}
                    />
                    <TextField
                        label="Calculation Function (JavaScript)"
                        fullWidth
                        multiline
                        rows={6}
                        placeholder="return positions.length;"
                        value={localFunction}
                        onChange={(e) => setLocalFunction(e.target.value)}
                        sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                    />

                    <Typography variant="caption" color="textSecondary">
                        Raw data units: Speed (knots), Distance (meters). Return a numeric or string value.
                    </Typography>
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => {
                        onApply(localLabel, localFunction);
                        onClose();
                    }}
                >
                    Apply Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ── Tool definitions for the middle column ─────────────────────────────────────

const toolCategories = [
    {
        name: 'Data',
        items: [
            { type: 'table', label: 'Table', icon: TableChartIcon, defaultW: 12, defaultH: 4, minW: 4, minH: 2 },
            { type: 'kpi', label: 'KPI Card', icon: NumbersIcon, defaultW: 3, defaultH: 4, minW: 2, minH: 2 },
            { type: 'filter', label: 'Filter', icon: FilterIcon, defaultW: 4, defaultH: 2, minW: 3, minH: 1 },
            { type: 'dateRange', label: 'Date Range', icon: DateRangeIcon, defaultW: 4, defaultH: 2, minW: 3, minH: 1 },
        ],
    },
    {
        name: 'Charts',
        items: [
            { type: 'barChart', label: 'Bar Chart', icon: BarChartIcon, defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
            { type: 'lineChart', label: 'Line Chart', icon: LineChartIcon, defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
            { type: 'areaChart', label: 'Area Chart', icon: AreaChartIcon, defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
            { type: 'pieChart', label: 'Pie Chart', icon: PieChartIcon, defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
            { type: 'doughnutChart', label: 'Doughnut Chart', icon: DoughnutChartIcon, defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
            { type: 'scatterPlot', label: 'Scatter Plot', icon: ScatterPlotIcon, defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
            { type: 'map', label: 'Map', icon: MapIcon, defaultW: 12, defaultH: 6, minW: 4, minH: 3 },
        ],
    },
    {
        name: 'Layout',
        items: [
            { type: 'header', label: 'Header', icon: HeaderIcon, defaultW: 12, defaultH: 2, minW: 6, minH: 1 },
            { type: 'footer', label: 'Footer', icon: FooterIcon, defaultW: 12, defaultH: 2, minW: 6, minH: 1 },
            { type: 'title', label: 'Title', icon: TitleIcon, defaultW: 6, defaultH: 1, minW: 2, minH: 1 },
            { type: 'text', label: 'Text Block', icon: TextFieldsIcon, defaultW: 6, defaultH: 2, minW: 2, minH: 1 },
            { type: 'divider', label: 'Divider', icon: DividerIcon, defaultW: 12, defaultH: 1, minW: 4, minH: 1 },
            { type: 'image', label: 'Image', icon: ImageIcon, defaultW: 6, defaultH: 4, minW: 2, minH: 2 },
        ],
    },
];

// ── Chart color palette ─────────────────────────────────────────────────────

const CHART_COLORS = [
    '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
    '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC',
    '#AF7AA1', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#7261A3', '#D33B44', '#2196F3', '#00BCD4', '#4CAF50',
    '#FFC107', '#FF5722', '#9C27B0', '#673AB7', '#3F51B5',
    '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4'
];

const KPI_COLORS = [
    '', '#000000', '#ffffff', '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2', '#c2185b', '#00796b', '#fbc02d', '#5d4037', '#616161', '#455a64',
    '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F'
];

const BG_PRESETS = [
    '', '#ffffff', '#f8f9fa', '#fff3e0', '#e8f5e9', '#e3f2fd',
    '#fce4ec', '#f3e5f5', '#fffde7', '#e0f2f1', 
    '#bbdefb', '#c8e6c9', '#fff9c4', '#ffccbc', '#d1c4e9', '#f8bbd0',
    '#cfd8dc', '#b0bec5', '#90a4ae', '#607d8b',
    '#263238', '#1a1a2e', '#0d1b2a', '#2d2d2d',
    '#f1f8e9', '#fff8e1', '#efebe9', '#fafafa',
    '#ffecb3', '#dcedc8', '#b2ebf2', '#e1bee7', '#f48fb1'
];

const getFieldValues = (data, field, resolveFn, units = {}) => {
    if (!data || !field) return { numeric: [], categorical: {}, isNumeric: false };

    const fLower = field.toLowerCase();
    const isSpeed = fLower.includes('speed');
    const isDistance = fLower.includes('distance') || fLower.includes('odometer');
    const isAltitude = fLower.includes('altitude');

    // FK fields are always categorical
    const isFk = !!resolveFKEntityType(field);
    if (isFk) {
        const categorical = {};
        data.forEach((row) => {
            const val = row[field];
            if (val == null || val === '') return;
            const resolved = resolveFn ? resolveFn(field, val, row) : String(val);
            categorical[resolved] = (categorical[resolved] || 0) + 1;
        });
        return { numeric: [], categorical, isNumeric: false };
    }
    const numeric = [];
    const categorical = {};
    data.forEach((row) => {
        const val = row[field];
        if (val == null || val === '') return;
        let num = parseFloat(val);
        // Note: boolean fields are categorical
        if (!isNaN(num) && typeof val !== 'boolean') {
            // Apply unit conversion at extraction level for consistency (Charts/KPI/Table)
            if (isSpeed) num = speedFromKnots(num, units.speedUnit);
            if (isDistance) num = distanceFromMeters(num, units.distanceUnit);
            if (isAltitude) num = altitudeFromMeters(num, units.altitudeUnit);
            numeric.push(num);
        } else {
            // Apply translation/resolution even to categorical fields that aren't FKs
            const key = resolveFn ? resolveFn(field, val, row) : String(val);
            categorical[key] = (categorical[key] || 0) + 1;
        }
    });
    const isNumeric = numeric.length >= Object.keys(categorical).length;
    return { numeric: isNumeric ? numeric : [], categorical: isNumeric ? {} : categorical, isNumeric };
};

// ── Map widget renderer ────────────────────────────────────────────────────────

const AnalyticsMapWidget = ({ widgetData, colors, entityType, config, dataCache, dataSource, units }) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const mapStyles = useMapStyles();
    const [mapLoaded, setMapLoaded] = useState(false);
    const [driftCount, setDriftCount] = useState(0); 
    const [parkedCount, setParkedCount] = useState(0); 
    const t = useTranslation();

    const userInteractedRef = useRef(false);

    useEffect(() => {
        if (!mapContainer.current || mapRef.current) return;
        
        let selectedStyle = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
        try {
            const availableStyles = mapStyles.filter((s) => s.available);
            if (availableStyles.length > 0 && availableStyles[0].style) {
                selectedStyle = availableStyles[0].style;
            }
        } catch (e) { console.warn("Failed to load map style", e); }

        mapRef.current = new maplibregl.Map({
            container: mapContainer.current,
            style: selectedStyle,
            center: [0, 0],
            zoom: 1,
            attributionControl: false,
        });

        const map = mapRef.current;

            const ensureAnalyticsLayers = () => {
                if (!map) return;
                if (!map.getSource('analytics-route')) {
                    map.addSource('analytics-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                    map.addLayer({
                        id: 'analytics-route-layer',
                        type: 'line',
                        source: 'analytics-route',
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 
                            'line-color': ['coalesce', ['get', 'color'], '#2196F3'], 
                            'line-width': config?.lineWidth !== undefined ? Number(config.lineWidth) : 3,
                            'line-opacity': 0.85 
                        }
                    });
                }
            };

            map.on('load', () => {
                ensureAnalyticsLayers();

                // Style cleaning: Hide any symbol or circle layers that are not ours
                try {
                    const style = map.getStyle();
                    if (style && style.layers) {
                        style.layers.forEach(layer => {
                            if ((layer.type === 'symbol' || layer.type === 'circle') && !layer.id.startsWith('analytics-')) {
                                map.setLayoutProperty(layer.id, 'visibility', 'none');
                            }
                        });
                    }
                } catch (e) {
                    console.warn('Failed to clean map style layers', e);
                }

                setMapLoaded(true);
            });
            // Also expose it for updateMapData
            map.ensureAnalyticsLayers = ensureAnalyticsLayers;

        // Track manual interaction
        const onInteraction = () => { userInteractedRef.current = true; };
        map.on('dragstart', onInteraction);
        map.on('zoomstart', onInteraction);
        map.on('touchstart', onInteraction);

        // Reset interaction flag when data changes significantly (new report)
        userInteractedRef.current = false;

        const resizeObserver = new ResizeObserver(() => {
            if (mapRef.current) mapRef.current.resize();
        });
        resizeObserver.observe(mapContainer.current);

        return () => {
            resizeObserver.disconnect();
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    const updateMapData = useCallback((data, source, customDataCache, customUnits) => {
        const map = mapRef.current;
        if (!map || !mapLoaded) return;

        // Dynamically ensure sources/layers exist before setting data
        if (map.ensureAnalyticsLayers) map.ensureAnalyticsLayers();

        const points = [];
        const routeLines = [];
        const driftFeatures = [];
        let totalDrifty = 0;
        let totalParked = 0;
        
        const haversineDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371000; // Earth radius in meters
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const bounds = new maplibregl.LngLatBounds();
        let hasValidCoords = false;

        const processCoordinate = (lon, lat) => {
            const ln = Number(lon), lt = Number(lat);
            if (!isNaN(ln) && !isNaN(lt) && lt >= -90 && lt <= 90 && ln >= -180 && ln <= 180) {
                bounds.extend([ln, lt]);
                hasValidCoords = true;
                return [ln, lt];
            }
            return null;
        };

        const processItems = (items) => {
            if (!Array.isArray(items)) return;

            // 1. DATA PREPARATION: Determine the best source for high-res analysis
            const hasDetailedPositions = (customDataCache?.CombinedDetailedPositions && customDataCache.CombinedDetailedPositions.length > 0) || (customDataCache?.Positions && customDataCache.Positions.length > 0);
            const primarySource = (source === 'Combined' && hasDetailedPositions) ? (customDataCache.CombinedDetailedPositions || customDataCache.Positions) : items;
            
            // 2. DRIFT DETECTION: Only run if explicitly enabled (Disabled/Hidden by default for now)
            const driftDist = config?.driftDistance !== undefined ? config.driftDistance : 90;
            const driftTime = config?.driftSeconds !== undefined ? config.driftSeconds : 5;
            const driftEnabled = !!(config?.filterDrifts || config?.showDriftMarkers);
            
            // Group by device for sequential processing
            const deviceGroups = {};
            primarySource.forEach(p => {
                const devId = p.deviceId || 'default';
                if (!deviceGroups[devId]) deviceGroups[devId] = [];
                deviceGroups[devId].push(p);
            });

            Object.values(deviceGroups).forEach(group => {
                const sorted = [...group].sort((a, b) => new Date(a.fixTime || 0) - new Date(b.fixTime || 0));
                
                if (driftEnabled) {
                    for (let i = 0; i < sorted.length - 1; i++) {
                        const p1 = sorted[i], p2 = sorted[i+1];
                        const d = haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
                        const t1 = new Date(p1.fixTime).getTime();
                        const t2 = new Date(p2.fixTime).getTime();
                        const deltaT = (t2 - t1) / 1000;
                        const velocity = d / (deltaT || 0.1);

                        // Threshold: Velocity > 216km/h (60m/s) for jumps > driftDist
                        if (d > driftDist && (velocity > 60 || d > 500) && t1 > 0 && t2 > 0) {
                            p2.isDrift = true;
                            totalDrifty++;
                        }
                    }
                }

                // 3. ROUTE LINE GENERATION
                const speedThresholdValue = (config?.speedThreshold !== undefined && config.speedThreshold > 0)
                    ? speedToKnots(config.speedThreshold, customUnits?.speedUnit)
                    : Infinity;

                // Line filtering logic (Respects filterDrifts toggle)
                const linePoints = (config?.filterDrifts && driftEnabled) ? sorted.filter(p => !p.isDrift) : sorted;
                
                if (speedThresholdValue !== Infinity) {
                    for (let i = 0; i < linePoints.length - 1; i++) {
                        const p1 = linePoints[i], p2 = linePoints[i+1];
                        const c1 = processCoordinate(p1.lon, p1.lat), c2 = processCoordinate(p2.lon, p2.lat);
                        if (c1 && c2) {
                            const isOverspeed = (p2.speed || 0) > speedThresholdValue;
                            routeLines.push({
                                type: 'Feature',
                                geometry: { type: 'LineString', coordinates: [c1, c2] },
                                properties: { color: isOverspeed ? '#F44336' : '#2196F3' }
                            });
                        }
                    }
                } else {
                    const coords = linePoints.map(p => processCoordinate(p.lon, p.lat)).filter(Boolean);
                    if (coords.length > 1) {
                        routeLines.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: { color: '#2196F3' } });
                    }
                }

                // 4. MARKER COLLECTION (Deduplicated)
                // 4a. Drift Markers (Only show Red 'D' if enabled)
                if (config?.showDriftMarkers && driftEnabled) {
                    sorted.filter(p => p.isDrift).forEach(p => {
                        const res = processCoordinate(p.lon, p.lat);
                        if (res) points.push({ type: 'Feature', geometry: { type: 'Point', coordinates: res }, properties: { ...p, type: 'drift' } });
                    });
                }

                // 4b. Start (S) and End (E) Markers
                if (sorted.length > 0) {
                    if (config?.showStartMarkers !== false) {
                        const startP = sorted[0];
                        const res = processCoordinate(startP.lon, startP.lat);
                        if (res) points.push({ type: 'Feature', geometry: { type: 'Point', coordinates: res }, properties: { ...startP, type: 'start' } });
                    }
                    if (config?.showEndMarkers !== false && sorted.length > 0) {
                        const endP = sorted[sorted.length - 1];
                        const res = processCoordinate(endP.lon, endP.lat);
                        if (res) points.push({ type: 'Feature', geometry: { type: 'Point', coordinates: res }, properties: { ...endP, type: 'end' } });
                    }
                }
            });

            // 5. EVENT-BASED MARKERS (Ignition, Alarms, Parked)
            const ignitionTypes = ['engineOn', 'engineOff', 'ignitionOn', 'ignitionOff'];
            const autoStopThreshold = (config?.autoStopMinutes !== undefined ? config.autoStopMinutes : 5) * 60 * 1000;
            const parkedThreshold = (config.parkedMinutes !== undefined ? config.parkedMinutes : 15) * 60 * 1000;
            
            items.forEach(item => {
                const deviceId = item.deviceId || 'default';
                const subEvents = (source === 'Combined' ? (item.events || []) : [item]).filter(e => ['alarm', ...ignitionTypes].includes(e.type));
                
                // Resolve coordinates from high-res source if available to prevent summary "ghosts"
                subEvents.forEach(e => {
                    let found = primarySource.find(p => p.id === e.positionId);
                    if (found) { e.lon = found.lon; e.lat = found.lat; e.isDrift = found.isDrift; }
                });

                // Alarms (Always processed if enabled)
                subEvents.filter(e => e.type === 'alarm' && !e.isDrift).forEach(e => {
                    if (config?.showAlarmMarkers !== false) {
                        const res = processCoordinate(e.lon, e.lat);
                        if (res) points.push({ type: 'Feature', geometry: { type: 'Point', coordinates: res }, properties: { ...e, type: 'alarm' } });
                    }
                });

                // Ignition & Parked Logic
                const ignEvents = subEvents.filter(e => !e.isDrift && ignitionTypes.includes(e.type))
                    .sort((a, b) => new Date(a.fixTime || 0) - new Date(b.fixTime || 0));

                let rawSegments = [];
                let currentStart = null;
                ignEvents.forEach(e => {
                    const isOn = e.type === 'ignitionOn' || e.type === 'engineOn';
                    if (isOn && currentStart === null) currentStart = e;
                    else if (!isOn && currentStart !== null) { rawSegments.push({ start: currentStart, end: e }); currentStart = null; }
                });
                if (currentStart !== null) rawSegments.push({ start: currentStart, end: null });

                // Merge (Auto Start/Stop)
                let mergedSegments = [];
                if (config?.filterAutoStop) {
                    rawSegments.forEach(seg => {
                        if (mergedSegments.length > 0 && seg.start && mergedSegments[mergedSegments.length - 1].end) {
                            const prevEnd = mergedSegments[mergedSegments.length - 1].end;
                            const gap = new Date(seg.start.fixTime).getTime() - new Date(prevEnd.fixTime).getTime();
                            const dist = haversineDistance(prevEnd.lat, prevEnd.lon, seg.start.lat, seg.start.lon);
                            const maxDist = config?.autoStopMaxDistance !== undefined ? config.autoStopMaxDistance : 50;
                            if (gap < autoStopThreshold && dist < maxDist) {
                                mergedSegments[mergedSegments.length - 1].end = seg.end;
                                return;
                            }
                        }
                        mergedSegments.push({ ...seg });
                    });
                } else {
                    mergedSegments = rawSegments;
                }

                // Push Ignition Markers
                mergedSegments.forEach(m => {
                    [m.start, m.end].filter(Boolean).forEach(e => {
                        const isOn = e.type === 'ignitionOn' || e.type === 'engineOn';
                        const show = isOn ? (config?.showOnMarkers !== false) : (config?.showOffMarkers !== false);
                        if (show) {
                            const res = processCoordinate(e.lon, e.lat);
                            if (res) points.push({ type: 'Feature', geometry: { type: 'Point', coordinates: res }, properties: { ...e, type: e.type } });
                        }
                    });
                });

                // Detect & Push Parked Markers
                if (config?.showParkedMarkers) {
                    for (let i = 0; i < mergedSegments.length - 1; i++) {
                        const curEnd = mergedSegments[i].end, nextStart = mergedSegments[i+1].start;
                        if (curEnd && nextStart) {
                            const gap = new Date(nextStart.fixTime).getTime() - new Date(curEnd.fixTime).getTime();
                            if (gap >= parkedThreshold) {
                                const res = processCoordinate(curEnd.lon, curEnd.lat);
                                if (res) {
                                    points.push({ type: 'Feature', geometry: { type: 'Point', coordinates: res }, properties: { ...curEnd, type: 'parked' } });
                                    totalParked++;
                                }
                            }
                        }
                    }
                }
            });
        };




        // ... Rest of updateMapData ...
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        processItems(Array.isArray(data) ? data : (data ? [data] : []));

        // 2. Instantiate new HTML markers for events
        if (config?.showMarkers !== false) {
            points.forEach(pt => {
                const props = pt.properties;
                const el = document.createElement('div');
                const type = props.type;

                el.style.width = (type === 'parked' || type === 'drift') ? '23px' : '20px';
                el.style.height = (type === 'parked' || type === 'drift') ? '23px' : '20px';
                el.style.borderRadius = '50%';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.border = '2px solid white';
                el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)';
                el.style.cursor = 'pointer';
                el.style.fontSize = (type === 'parked' || type === 'drift') ? '13px' : '11px';
                el.style.fontWeight = 'bold';
                el.style.zIndex = (type === 'parked' || type === 'drift') ? '10' : '5'; 
                
                // Color & Content Mapping
                let bg = colors?.primary || '#1976D2';
                let icon = '';
                
                if (type === 'parked') {
                    bg = '#2196F3'; // Blue
                    icon = 'P';
                    el.style.color = 'white';
                } else if (type === 'drift') {
                    bg = '#F44336'; // Red
                    icon = 'D';
                    el.style.color = 'white';
                } else if (type === 'start') {
                    bg = '#4CAF50'; // Green
                    icon = 'S';
                    el.style.color = 'white';
                    el.style.zIndex = '15';
                } else if (type === 'end') {
                    bg = '#F44336'; // Red
                    icon = 'E';
                    el.style.color = 'white';
                    el.style.zIndex = '15';
                } else {
                    el.style.color = 'white';
                    if (type === 'ignitionOn' || type === 'engineOn') { bg = '#4CAF50'; icon = '⚡'; }
                    else if (type === 'ignitionOff' || type === 'engineOff') { bg = '#FF9800'; icon = '○'; }
                    else if (type === 'alarm') { bg = '#F44336'; icon = '!'; }
                    else if (type === 'position') { bg = colors?.primary || '#1976D2'; icon = '•'; }
                    else { bg = colors?.primary || '#1976D2'; icon = '?'; }
                }

                el.style.backgroundColor = bg;
                el.innerHTML = icon;

                
                el.style.backgroundColor = bg;
                el.innerText = icon;

                // TOOLTIP: Localized event type + Optional alarm details (specific sub-type SOS, overspeed, etc)
                const label = t(prefixString('event', type));
                const alarmType = props.attributes?.alarm || props.alarm;
                const alarmDetail = alarmType ? `: ${formatAlarm(alarmType, t)}` : '';
                el.title = `${label}${alarmDetail}`;

                const m = new maplibregl.Marker({ element: el })
                    .setLngLat(pt.geometry.coordinates)
                    .addTo(map);
                markersRef.current.push(m);
            });
        }

        // Update Sources (Only route line now)
        const updates = [
            { id: 'analytics-route', features: routeLines },
        ];

        updates.forEach(upd => {
            const src = map.getSource(upd.id);
            if (src) src.setData({ type: 'FeatureCollection', features: upd.features });
        });

        // Fit bounds only if user hasn't interacted or it's the first significant update
        if (hasValidCoords && !bounds.isEmpty() && !userInteractedRef.current) {
            map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 1000 });
        }

        // Apply visual config
        const layers = ['analytics-route-layer'];
        layers.forEach(lyr => {
            if (map.getLayer(lyr)) {
                let width = config?.lineWidth !== undefined ? Number(config.lineWidth) : 3;
                map.setPaintProperty(lyr, 'line-width', width);
                // Ensure data-driven coloring is enabled
                map.setPaintProperty(lyr, 'line-color', ['coalesce', ['get', 'color'], '#2196F3']);
            }
        });

        setDriftCount(totalDrifty);
        setParkedCount(totalParked);
    }, [mapLoaded, config?.lineWidth, config?.speedThreshold, config?.filterField, config?.filterOperator, config?.filterValue, 
        config?.showMarkers, config?.showOnMarkers, config?.showOffMarkers, config?.showAlarmMarkers, config?.showStartMarkers, config?.showEndMarkers,
        config?.filterAutoStop, config?.autoStopMinutes, config?.autoStopMaxDistance, 
        config?.showParkedMarkers, config?.parkedMinutes, config?.filterDrifts, config?.showDriftMarkers, config?.driftSeconds, config?.driftDistance, t]);

    // Reset interaction flag only when the data source/visibility changes significantly
    useEffect(() => {
        userInteractedRef.current = false;
    }, [entityType, config?.mapSource, config?.showMarkers, 
        config?.showOnMarkers, config?.showOffMarkers, config?.showAlarmMarkers, config?.showStartMarkers, config?.showEndMarkers, config?.showMarkers,
        config?.filterAutoStop, config?.autoStopMinutes, config?.autoStopMaxDistance, 
        config?.showParkedMarkers, config?.parkedMinutes, config?.filterDrifts, config?.showDriftMarkers, config?.driftSeconds, config?.driftDistance, t]);

    useEffect(() => {
        if (mapLoaded) {
            updateMapData(widgetData, dataSource, dataCache, units);
        }
    }, [widgetData, mapLoaded, updateMapData, dataSource, dataCache, units, 
        config?.showOnMarkers, config?.showOffMarkers, config?.showAlarmMarkers, config?.showMarkers, 
        config?.showStartMarkers, config?.showEndMarkers, 
        config?.filterAutoStop, config?.autoStopMinutes, config?.autoStopMaxDistance, 
        config?.showParkedMarkers, config?.parkedMinutes, 
        config?.filterDrifts, config?.showDriftMarkers, config?.driftSeconds, config?.driftDistance]);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div ref={mapContainer} style={{ flex: 1, minHeight: 0, borderRadius: '4px', overflow: 'hidden' }} />
            
            {/* Map Legend (Top Left) - Only shown if enabled and there's content */}
            {config?.showMarkers !== false && config?.showLegend !== false && (config?.showOnMarkers !== false || config?.showOffMarkers !== false || config?.showAlarmMarkers !== false || config?.showStartMarkers !== false || config?.showEndMarkers !== false || config?.speedThreshold > 0 || config?.showParkedMarkers || config?.showDriftMarkers) && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    backgroundColor: `${colors.background}60`,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    zIndex: 10,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    pointerEvents: 'none',
                    backdropFilter: 'blur(6px)'
                }}>
                    {(config?.showOnMarkers !== false || config?.showOffMarkers !== false || config?.showAlarmMarkers !== false || config?.showStartMarkers !== false || config?.showEndMarkers !== false) && (
                        <>
                            {config?.showStartMarkers !== false && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 'bold' }}>S</div>
                                    <Typography style={{ fontSize: '10px', color: colors.text, fontWeight: 500 }}>Start Point</Typography>
                                </div>
                            )}
                            {config?.showEndMarkers !== false && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F44336', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 'bold' }}>E</div>
                                    <Typography style={{ fontSize: '10px', color: colors.text, fontWeight: 500 }}>End Point</Typography>
                                </div>
                            )}
                            {config?.showAlarmMarkers !== false && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F44336', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 'bold' }}>!</div>
                                    <Typography style={{ fontSize: '10px', color: colors.text, fontWeight: 500 }}>{t('eventAlarm')}</Typography>
                                </div>
                            )}
                            {config?.showOnMarkers !== false && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 'bold' }}>⚡</div>
                                    <Typography style={{ fontSize: '10px', color: colors.text, fontWeight: 500 }}>{t('eventIgnitionOn')}</Typography>
                                </div>
                            )}
                            {config?.showOffMarkers !== false && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FF9800', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 'bold' }}>○</div>
                                    <Typography style={{ fontSize: '10px', color: colors.text, fontWeight: 500 }}>{t('eventIgnitionOff')}</Typography>
                                </div>
                            )}
                        </>
                    )}
                    {config?.showParkedMarkers && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ 
                                width: '14px', height: '14px', borderRadius: '50%', 
                                backgroundColor: '#2196F3', border: '1px solid white', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                color: 'white', fontSize: '9px', fontWeight: 'bold',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                            }}>P</div>
                            <Typography style={{ fontSize: '10px', color: colors.text, fontWeight: 500 }}>Parked: {parkedCount}</Typography>
                        </div>
                    )}

                    {config?.speedThreshold > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '14px', height: '4px', backgroundColor: '#F44336', borderRadius: '2px' }} />
                            <Typography style={{ fontSize: '10px', color: colors.text, fontWeight: 600 }}>
                                {`> ${config.speedThreshold} ${speedUnitString(units.speedUnit, t)}`}
                            </Typography>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Canvas widget renderer ─────────────────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────────────────────

const resolveIdToName = (fieldKey, rawValue, dataCache, onFetchEntity, t, row, units = {}) => {
    if (rawValue == null || rawValue === '' || (fieldKey === 'positionId' && (rawValue === 0 || rawValue === '0'))) return '—';

    // Numeric formatting with units for categorical uses (e.g. Bar chart keys)
    if (typeof rawValue === 'number' || (!isNaN(parseFloat(rawValue)) && typeof rawValue !== 'boolean')) {
        const fLower = fieldKey.toLowerCase();
        let num = parseFloat(rawValue);
        if (t) {
            if (fLower.includes('speed')) {
                return `${speedFromKnots(num, units.speedUnit).toFixed(2)} ${speedUnitString(units.speedUnit, t)}`;
            }
            if (fLower.includes('distance') || fLower.includes('odometer') || fLower.includes('totaldistance')) {
                return `${distanceFromMeters(num, units.distanceUnit).toFixed(2)} ${distanceUnitString(units.distanceUnit, t)}`;
            }
            if (fLower.includes('altitude')) {
                return `${altitudeFromMeters(num, units.altitudeUnit).toFixed(2)} ${altitudeUnitString(units.altitudeUnit, t)}`;
            }
        }
        // Duration formatting (milliseconds to H:m:s)
        if (fLower.includes('duration') || fLower.includes('hours')) {
            const h = Math.floor(num / 3600000);
            const m = Math.floor((num % 3600000) / 60000);
            const s = Math.floor((num % 60000) / 1000);
            return `${h}h ${m}m ${s}s`;
        }
    }


    // Translation logic for technical fields
    if (t) {
        if (fieldKey === 'type') {
            if (rawValue === 'position') return t('sharedLocation');
            const typeLabel = t(prefixString('event', String(rawValue)));
            const alarmData = row?.alarm || (row?.attributes && row.attributes.alarm);
            if (rawValue === 'alarm' && alarmData) {
                return `${typeLabel} (${formatAlarm(String(alarmData), t)})`;
            }
            return typeLabel;
        }
        if (fieldKey === 'status' || fieldKey === 'sharedStatus') {
            try { return t(prefixString('deviceStatus', String(rawValue))); } catch { return String(rawValue); }
        }
        if (fieldKey === 'alarm') {
            try { return formatAlarm(String(rawValue), t); } catch { return String(rawValue); }
        }
        if (fieldKey === 'actionType') {
            try { return t(prefixString('sharedAction', String(rawValue))); } catch { return String(rawValue); }
        }
        if (fieldKey === 'objectType') {
            try { return t(prefixString('sharedObject', String(rawValue))); } catch { return String(rawValue); }
        }
    }

    const fkEntity = resolveFKEntityType(fieldKey);
    if (!fkEntity) return String(rawValue);
    // Auto-fetch the related entity if not cached
    if (!dataCache[fkEntity]) {
        if (onFetchEntity) onFetchEntity(fkEntity);
        return String(rawValue);
    }
    const related = dataCache[fkEntity];
    const match = related.find((e) => e.id === rawValue || e.id === Number(rawValue));
    if (!match) return String(rawValue);
    
    if (fkEntity === 'Positions') {
        // if (match.address) return match.address; // Address resolution disabled
        if (match.latitude !== undefined && match.longitude !== undefined) {
            return `${Number(match.latitude).toFixed(5)}, ${Number(match.longitude).toFixed(5)}`;
        }
        return String(rawValue);
    }
    if (fkEntity === 'Groups') {
        return match.name || match.description || `Group ${match.id}`;
    }
    return match.name || match.description || match.address || match.email || match.uniqueId || String(rawValue);
};

const CanvasWidget = ({ widget, colors, onDuplicate, onRemove, onSelect, isSelected, dataCache, globalEntityType, selectedFields: globalSelectedFields, onFetchEntity, previewMode, branding, templateName, pageNumber, totalPages, tableOffset = 0, tableLimit = 99999, reportParams, onReportParamsChange }) => {
    const widgetEntityType = widget.config?.entityType || globalEntityType;
    // For map widgets, we always use the target entity data as the base, 
    // but pass the mapSource preference to the widget.
    const mapSource = widget.type === 'map' ? (widget.config?.mapSource || 'Route') : null;
    const dataSource = widget.type === 'map' ? widgetEntityType : (widget.config?.mapSource || widgetEntityType);
    
    const speedUnit = useAttributePreference('speedUnit');
    const distanceUnit = useAttributePreference('distanceUnit');
    const altitudeUnit = useAttributePreference('altitudeUnit');
    const t = useTranslation();
    const unitsContext = { speedUnit, distanceUnit, altitudeUnit };

    const rawData = dataCache[dataSource] || [];
    const widgetData = useMemo(() => {
        let baseData = [];
        // STRICT GUARD: Map widgets with 'Combined' source MUST receive the raw nested array
        if (widget.type === 'map' && dataSource === 'Combined') {
            baseData = rawData;
        } else if (dataSource === 'Combined') {
            const flattened = [];
            const items = Array.isArray(rawData) ? rawData : (rawData ? Object.values(rawData) : []);
            const processedPosIds = new Set();
            
            // 1. Add supplemental positions from dataCache.Positions
            if (Array.isArray(dataCache?.Positions)) {
                dataCache.Positions.forEach(p => {
                    processedPosIds.add(p.id);
                    flattened.push({ ...p, type: 'position' });
                });
            }

            items.forEach(item => {
                // Determine if item is "Nested" (device-grouped) or "Flat" (standalone record)
                const positions = Array.isArray(item.positions) ? item.positions : [];
                const events = Array.isArray(item.events) ? item.events : [];
                
                if (positions.length > 0 || events.length > 0) {
                    // 2. Add any positions from the nested result
                    positions.forEach(p => {
                        if (!processedPosIds.has(p.id)) {
                            processedPosIds.add(p.id);
                            flattened.push({ ...p, type: 'position' });
                        }
                    });
                    
                    // 3. Add events from the nested result
                    events.forEach(e => {
                        let pos = Array.isArray(dataCache?.Positions) ? dataCache.Positions.find(p => p.id === e.positionId) : null;
                        if (!pos) pos = positions.find(p => p.id === e.positionId) || {};
                        flattened.push({ ...pos, ...e, type: e.type || 'event', id: `event_${e.id || Math.random()}` });
                    });
                } else if (item.id && !processedPosIds.has(item.id)) {
                    // 4. Handle standalone "flat" record
                    processedPosIds.add(item.id);
                    flattened.push({ ...item });
                }
            });
            baseData = flattened.sort((a, b) => new Date(b.fixTime || 0) - new Date(a.fixTime || 0));
        } else {

            baseData = rawData;
        }

        // Apply conditional filters
        const fOp = widget.config?.filterOperator;
        const fVal = widget.config?.filterValue;
        const fField = widget.config?.filterField || widget.config?.field;
        const isDateLike = (str) => typeof str === 'string' && /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/.test(str);
        const needsValue = fOp && !['is null', 'not null'].includes(fOp);

        if (fField && fOp && (needsValue ? (fVal !== undefined && fVal !== '') : true)) {
            const fKey = fField;
            const fLower = fKey.toLowerCase();
            const targetValStr = String(fVal || '').toLowerCase();
            let targetValNum = Number(fVal);
            
            // Unit conversion for filter value based on field type
            if (!isNaN(targetValNum)) {
                if (fLower.includes('speed')) {
                    targetValNum = speedToKnots(targetValNum, speedUnit);
                } else if (fLower.includes('distance') || fLower.includes('odometer') || fLower.includes('totaldistance')) {
                    targetValNum = distanceToMeters(targetValNum, distanceUnit);
                } else if (fLower.includes('altitude')) {
                    targetValNum = altitudeToMeters(targetValNum, altitudeUnit);
                }
            }

            const targetIsDate = isDateLike(fVal);
            const targetDate = targetIsDate ? new Date(fVal).getTime() : NaN;
            let targetRegex = null;
            if (fOp === 'regex') { try { targetRegex = new RegExp(fVal, 'i'); } catch {} }

            return baseData.filter(row => {
                const rowValRaw = row[fKey];
                if (fOp === 'is null' || (fOp === '==' && targetValStr === 'null')) return rowValRaw == null || rowValRaw === '';
                if (fOp === 'not null' || (fOp === '!=' && targetValStr === 'null')) return rowValRaw != null && rowValRaw !== '';
                if (rowValRaw == null) return fOp === '!=';
                
                // 1. Numeric comparison for unit-aware fields
                const isNumericOp = ['==', '!=', '>', '>=', '<', '<='].includes(fOp);
                const rowNumRaw = Number(rowValRaw);
                if (isNumericOp && !isNaN(targetValNum) && !isNaN(rowNumRaw)) {
                    switch (fOp) {
                        case '==': return Math.abs(rowNumRaw - targetValNum) < 0.001;
                        case '!=': return Math.abs(rowNumRaw - targetValNum) >= 0.001;
                        case '>': return rowNumRaw > targetValNum;
                        case '>=': return rowNumRaw >= targetValNum;
                        case '<': return rowNumRaw < targetValNum;
                        case '<=': return rowNumRaw <= targetValNum;
                        default: break;
                    }
                }

                // 2. Legacy resolution for strings/dates
                const rowVal = resolveIdToName(fKey, rowValRaw, dataCache, onFetchEntity, t, row, unitsContext);
                const rowStr = String(rowVal).toLowerCase();
                const rowNum = Number(rowVal);
                const rowIsDate = isDateLike(String(rowVal));
                const rowDate = rowIsDate ? new Date(rowVal).getTime() : NaN;

                const useDate = targetIsDate && rowIsDate && !isNaN(targetDate) && !isNaN(rowDate);
                const refTgt = useDate ? targetDate : targetValNum;
                const refRow = useDate ? rowDate : rowNum;
                
                switch (fOp) {
                    case '==': return rowStr === targetValStr || (useDate && refRow === refTgt);
                    case '!=': return rowStr !== targetValStr && (!useDate || refRow !== refTgt);
                    case '>': return !isNaN(refRow) && !isNaN(targetValNum) ? refRow > refTgt : rowStr > targetValStr;
                    case '>=': return !isNaN(refRow) && !isNaN(targetValNum) ? refRow >= refTgt : rowStr >= targetValStr;
                    case '<': return !isNaN(refRow) && !isNaN(targetValNum) ? refRow < refTgt : rowStr < targetValStr;
                    case '<=': return !isNaN(refRow) && !isNaN(targetValNum) ? refRow <= refTgt : rowStr <= targetValStr;
                    case 'contains': return rowStr.includes(targetValStr);
                    case 'starts': return rowStr.startsWith(targetValStr);
                    case 'ends': return rowStr.endsWith(targetValStr);
                    case 'regex': return targetRegex ? targetRegex.test(String(rowVal)) : true;
                    default: return true;
                }
            });
        }
        return baseData;
    }, [rawData, widget.type, dataSource, widget.config?.filterOperator, widget.config?.filterValue, widget.config?.filterField, widget.config?.field, t, dataCache, onFetchEntity, unitsContext]);

    // Translation helper for field labels/headers
    const translateLabel = useCallback((fieldKey, defaultLabel) => {
        if (!t) return defaultLabel;
        // Priority lookups for standard Traccar keys
        const keys = [
            fieldKey,
            prefixString('shared', fieldKey),
            prefixString('device', fieldKey),
            prefixString('position', fieldKey),
            prefixString('report', fieldKey)
        ];
        for (const k of keys) {
            const trans = t(k);
            if (trans !== k) return trans;
        }
        return defaultLabel;
    }, [t]);
    
    // Auto-fetch widget entity data if missing from cache
    useEffect(() => {
        if (dataSource && !dataCache[dataSource] && onFetchEntity) {
            onFetchEntity(dataSource);
        }
    }, [dataSource, dataCache, onFetchEntity]);

    const widgetFields = entityFieldDefinitions[widgetEntityType] || [];
    const widgetSelectedFields = widget.config?.selectedFields !== undefined ? widget.config.selectedFields : (globalSelectedFields || []);

    // Resolve FK IDs to entity names — works for ANY field ending in 'Id'
    const resolveValue = (fieldKey, rawValue, row) => resolveIdToName(fieldKey, rawValue, dataCache, onFetchEntity, t, row, unitsContext);
    
    // Auto-formatting for specific types
    const resolveValueFormatted = (fieldKey, rawValue, row) => {
        let disp = resolveValue(fieldKey, rawValue, row);
        
        // Final suffixing for numeric fields if not already handled by the base resolution
        if (typeof rawValue === 'number' || (!isNaN(parseFloat(rawValue)) && typeof rawValue !== 'boolean')) {
            const fLower = fieldKey.toLowerCase();
            const unitStr = fLower.includes('speed') ? speedUnitString(speedUnit, t) : 
                          (fLower.includes('distance') || fLower.includes('odometer') || fLower.includes('totaldistance')) ? distanceUnitString(distanceUnit, t) :
                          fLower.includes('altitude') ? altitudeUnitString(altitudeUnit, t) : null;
            
            if (unitStr && !disp.includes(unitStr)) {
                return `${disp} ${unitStr}`;
            }
        }
        
        return disp;
    };



    const renderTable = () => {
        // Use widget-specific selectedFields. If empty, take first 4 from widgetFields.
        const activeKeys = widgetSelectedFields.length > 0 ? widgetSelectedFields : widgetFields.slice(0, 4).map((f) => f.key);
        // Ensure fieldDefs correctly map to activeKeys to preserve the user's drag order
        const fieldDefs = activeKeys.map(key => widgetFields.find(f => f.key === key)).filter(Boolean);
        if (fieldDefs.length === 0) return <Typography variant="caption" style={{ color: colors.textSecondary, padding: '12px' }}>Select fields in the left panel</Typography>;

        // Sort data
        const sortField = widget.config?.sortField;
        const sortDir = widget.config?.sortDir || 'asc';
        let sortedData = [...widgetData];
        if (sortField) {
            sortedData.sort((a, b) => {
                let va = a[sortField], vb = b[sortField];
                if (va == null && vb == null) return 0;
                if (va == null) return sortDir === 'asc' ? -1 : 1;
                if (vb == null) return sortDir === 'asc' ? 1 : -1;
                
                const isDateLike = (str) => typeof str === 'string' && /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/.test(str);
                
                if (isDateLike(va) && isDateLike(vb)) {
                    return sortDir === 'asc' ? new Date(va) - new Date(vb) : new Date(vb) - new Date(va);
                }

                const na = Number(va), nb = Number(vb);
                if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
                    return sortDir === 'asc' ? na - nb : nb - na;
                }

                const sa = String(va).toLowerCase(), sb = String(vb).toLowerCase();
                return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
            });
        }
        const maxRows = previewMode ? Math.min(Math.max(0, sortedData.length - tableOffset), tableLimit) : 20;
        const rows = sortedData.slice(tableOffset, tableOffset + maxRows);


        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Controls moved to Properties Panel */}
                <div style={{ flex: 1, padding: '4px', overflow: previewMode ? 'visible' : 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto', fontSize: '13px' }}>
                        <thead>
                            <tr>
                                {fieldDefs.map((f) => (
                                    <th key={f.key} style={{ padding: '6px 8px', minWidth: '80px', backgroundColor: 'transparent', fontWeight: 700, color: colors.text, borderBottom: `2px solid ${colors.border}`, textAlign: 'left', whiteSpace: 'nowrap', fontSize: '13px', lineHeight: 1.2, height: '32px', boxSizing: 'border-box' }}>
                                        {widget.config?.fieldLabels?.[f.key] || translateLabel(f.key, f.label)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={i} style={{ backgroundColor: i % 2 !== 0 ? '#f9fafb' : 'transparent', transition: 'background-color 0.2s' }}>
                                    {fieldDefs.map((f) => (
                                        <td key={f.key} style={{ padding: '5px 8px', color: colors.textSecondary, borderBottom: `1px solid ${colors.border}`, fontSize: '12px', lineHeight: 1.2, height: '25px', boxSizing: 'border-box' }}>
                                            {(() => {
                                                if (row[f.key] == null) return '—';
                                            let disp = resolveValueFormatted(f.key, row[f.key], row);

                                                if (typeof disp === 'string' && /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/.test(disp)) {
                                                    const d = dayjs(disp);
                                                    if (d.isValid()) return d.format('L') + ' ' + d.format('LTS');
                                                }
                                                return String(disp);
                                            })()}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!previewMode && widgetData.length > 20 && (
                        <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '11px', padding: '2px 4px' }}>+{widgetData.length - 20} more rows</Typography>
                    )}
                </div>
            </div>
        );
    };

    const renderChart = (ChartIcon, renderNumeric, renderCategorical) => {
        const field = widget.config?.field;
        if (!field) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                        <ChartIcon style={{ fontSize: '28px', color: colors.textSecondary }} />
                    </div>
                </div>
            );
        }
        const unitsContext = { speedUnit, distanceUnit, altitudeUnit };
        const { numeric, categorical, isNumeric } = getFieldValues(widgetData, field, resolveValue, unitsContext);
        // Auto-fetch FK entity data if needed
        const fkEntity = resolveFKEntityType(field);
        if (fkEntity && !dataCache[fkEntity]) onFetchEntity(fkEntity);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                <div style={{ flex: 1, overflow: 'hidden', padding: '4px' }}>
                    {isNumeric ? renderNumeric(numeric) : renderCategorical(categorical)}
                </div>
            </div>
        );
    };

    const renderBarNumeric = (values) => {
        const max = Math.max(...values, 1);
        const display = values.slice(0, 25);
        return (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', width: '100%', height: '100%', padding: '0 4px 4px' }}>
                {display.map((v, i) => (
                    <div key={i} style={{ flex: 1, height: `${(v / max) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], borderRadius: '2px 2px 0 0', minHeight: '2px', opacity: 0.85 }} />
                ))}
            </div>
        );
    };

    const renderBarCategorical = (dist) => {
        const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const max = Math.max(...entries.map((e) => e[1]), 1);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', height: '100%', overflow: 'auto', padding: '2px 0' }}>
                {entries.map(([key, count], i) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 4px' }}>
                        <Typography variant="caption" style={{ fontSize: '11px', color: colors.textSecondary, width: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', flexShrink: 0 }}>{key}</Typography>
                        <div style={{ flex: 1, height: '12px', backgroundColor: colors.border, borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${(count / max) * 100}%`, height: '100%', backgroundColor: CHART_COLORS[i % CHART_COLORS.length], borderRadius: '2px' }} />
                        </div>
                        <Typography variant="caption" style={{ fontSize: '10px', color: colors.textSecondary, width: '30px', flexShrink: 0 }}>{count}</Typography>
                    </div>
                ))}
            </div>
        );
    };

    const renderLineNumeric = (values) => {
        const max = Math.max(...values, 1);
        const min = Math.min(...values, 0);
        const range = max - min || 1;
        const display = values.slice(0, 40);
        const points = display.map((v, i) => {
            const x = (i / Math.max(display.length - 1, 1)) * 100;
            const y = 100 - ((v - min) / range) * 100;
            return `${x},${y}`;
        }).join(' ');
        // Gradient fill under line
        const fillPoints = `0,100 ${points} 100,100`;
        return (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                <defs>
                    <linearGradient id={`lg_${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity="0.05" />
                    </linearGradient>
                </defs>
                <polygon fill={`url(#lg_${widget.id})`} points={fillPoints} />
                <polyline fill="none" stroke={CHART_COLORS[0]} strokeWidth="1.5" points={points} />
            </svg>
        );
    };

    const renderPieData = (dist) => {
        const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
        let cumAngle = 0;
        const slices = entries.map(([, v], i) => {
            const angle = (v / total) * 360;
            const start = cumAngle;
            cumAngle += angle;
            const r1 = (start - 90) * (Math.PI / 180);
            const r2 = (start + angle - 90) * (Math.PI / 180);
            return {
                d: `M50,50 L${50 + 40 * Math.cos(r1)},${50 + 40 * Math.sin(r1)} A40,40 0 ${angle > 180 ? 1 : 0},1 ${50 + 40 * Math.cos(r2)},${50 + 40 * Math.sin(r2)} Z`,
                color: CHART_COLORS[i % CHART_COLORS.length],
            };
        });
        return (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
                <svg viewBox="0 0 100 100" style={{ width: '60%', flexShrink: 0 }}>
                    {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
                </svg>
                <div style={{ flex: 1, overflow: 'auto', padding: '0 4px' }}>
                    {entries.map(([key, count], i) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '1px 0' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '1px', backgroundColor: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                            <Typography variant="caption" style={{ fontSize: '7px', color: colors.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {key}: {count}
                            </Typography>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderLineCategorical = (dist) => {
        const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 15);
        if (entries.length === 0) return null;
        const max = Math.max(...entries.map(e => e[1]), 1);
        const points = entries.map(([_, count], i) => {
            const x = (i / Math.max(entries.length - 1, 1)) * 100;
            const y = 100 - ((count / max) * 100);
            return `${x},${y}`;
        }).join(' ');
        const fillPoints = `0,100 ${points} 100,100`;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '4px' }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                        <defs>
                            <linearGradient id={`lg_line_cat_${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity="0.05" />
                            </linearGradient>
                        </defs>
                        <polygon fill={`url(#lg_line_cat_${widget.id})`} points={fillPoints} />
                        <polyline fill="none" stroke={CHART_COLORS[0]} strokeWidth="1.5" points={points} />
                    </svg>
                </div>
                <div style={{ display: 'flex', overflowX: 'auto', gap: '4px', paddingBottom: '2px', flexShrink: 0 }}>
                    {entries.map(([key]) => (
                        <Typography key={key} variant="caption" style={{ fontSize: '8px', color: colors.textSecondary, whiteSpace: 'nowrap', flex: 1, textAlign: 'center' }}>
                            {key}
                        </Typography>
                    ))}
                </div>
            </div>
        );
    };

    const renderAreaCategorical = (dist) => {
        const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 15);
        if (entries.length === 0) return null;
        const max = Math.max(...entries.map(e => e[1]), 1);
        const points = entries.map(([_, count], i) => {
            const x = (i / Math.max(entries.length - 1, 1)) * 100;
            const y = 100 - ((count / max) * 100);
            return `${x},${y}`;
        }).join(' ');
        const fillPoints = `0,100 ${points} 100,100`;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '4px' }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                        <defs>
                            <linearGradient id={`lg_area_cat_${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS[2]} stopOpacity="0.6" />
                                <stop offset="100%" stopColor={CHART_COLORS[2]} stopOpacity="0.1" />
                            </linearGradient>
                        </defs>
                        <polygon fill={`url(#lg_area_cat_${widget.id})`} points={fillPoints} />
                        <polyline fill="none" stroke={CHART_COLORS[2]} strokeWidth="2" points={points} />
                    </svg>
                </div>
                <div style={{ display: 'flex', overflowX: 'auto', gap: '4px', paddingBottom: '2px', flexShrink: 0 }}>
                    {entries.map(([key]) => (
                        <Typography key={key} variant="caption" style={{ fontSize: '8px', color: colors.textSecondary, whiteSpace: 'nowrap', flex: 1, textAlign: 'center' }}>
                            {key}
                        </Typography>
                    ))}
                </div>
            </div>
        );
    };

    const renderPieNumeric = (values) => {
        // For numeric pie, bucket into ranges
        const buckets = {};
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const bucketCount = Math.min(6, values.length);
        values.forEach((v) => {
            const idx = Math.min(Math.floor(((v - min) / range) * bucketCount), bucketCount - 1);
            const lo = (min + (range / bucketCount) * idx).toFixed(0);
            const hi = (min + (range / bucketCount) * (idx + 1)).toFixed(0);
            const key = `${lo}-${hi}`;
            buckets[key] = (buckets[key] || 0) + 1;
        });
        return renderPieData(buckets);
    };

    const renderAreaNumeric = (values) => {
        const max = Math.max(...values, 1);
        const min = Math.min(...values, 0);
        const range = max - min || 1;
        const display = values.slice(0, 40);
        const points = display.map((v, i) => {
            const x = (i / Math.max(display.length - 1, 1)) * 100;
            const y = 100 - ((v - min) / range) * 100;
            return `${x},${y}`;
        }).join(' ');
        const fillPoints = `0,100 ${points} 100,100`;
        return (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                <defs>
                    <linearGradient id={`lg_area_${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS[2]} stopOpacity="0.6" />
                        <stop offset="100%" stopColor={CHART_COLORS[2]} stopOpacity="0.1" />
                    </linearGradient>
                </defs>
                <polygon fill={`url(#lg_area_${widget.id})`} points={fillPoints} />
                <polyline fill="none" stroke={CHART_COLORS[2]} strokeWidth="2" points={points} />
            </svg>
        );
    };

    const renderDoughnutData = (dist) => {
        const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
        let cumAngle = 0;
        const slices = entries.map(([, v], i) => {
            const angle = (v / total) * 360;
            const start = cumAngle;
            cumAngle += angle;
            const r1 = (start - 90) * (Math.PI / 180);
            const r2 = (start + angle - 90) * (Math.PI / 180);
            return {
                d: `M50,50 L${50 + 40 * Math.cos(r1)},${50 + 40 * Math.sin(r1)} A40,40 0 ${angle > 180 ? 1 : 0},1 ${50 + 40 * Math.cos(r2)},${50 + 40 * Math.sin(r2)} Z`,
                color: CHART_COLORS[(i + 3) % CHART_COLORS.length],
            };
        });
        return (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '60%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100%' }}>
                        {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
                        <circle cx="50" cy="50" r="22" fill={widget.config?.bgColor || colors.surface} />
                    </svg>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '0 4px' }}>
                    {entries.map(([key, count], i) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '1px 0' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '3px', backgroundColor: CHART_COLORS[(i + 3) % CHART_COLORS.length], flexShrink: 0 }} />
                            <Typography variant="caption" style={{ fontSize: '7px', color: colors.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {key}: {count}
                            </Typography>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderDoughnutNumeric = (values) => {
        const buckets = {};
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const bucketCount = Math.min(6, values.length);
        values.forEach((v) => {
            const idx = Math.min(Math.floor(((v - min) / range) * bucketCount), bucketCount - 1);
            const lo = (min + (range / bucketCount) * idx).toFixed(0);
            const hi = (min + (range / bucketCount) * (idx + 1)).toFixed(0);
            const key = `${lo}-${hi}`;
            buckets[key] = (buckets[key] || 0) + 1;
        });
        return renderDoughnutData(buckets);
    };

    const renderScatterNumeric = (values) => {
        const max = Math.max(...values, 1);
        const min = Math.min(...values, 0);
        const range = max - min || 1;
        const display = values.slice(0, 50);
        return (
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                {display.map((v, i) => {
                    const x = 5 + (i / Math.max(display.length - 1, 1)) * 90;
                    const y = 95 - ((v - min) / range) * 90;
                    return <circle key={i} cx={x} cy={y} r="3" fill={CHART_COLORS[4]} opacity="0.7" />;
                })}
            </svg>
        );
    };

    const renderScatterCategorical = (dist) => {
        const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 20);
        const max = Math.max(...entries.map(e => e[1]), 1);
        return (
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                {entries.map(([key, count], i) => {
                    const x = 10 + (i / Math.max(entries.length - 1, 1)) * 80;
                    const y = 90 - ((count / max) * 80);
                    const size = 2 + (count / max) * 6;
                    return <circle key={i} cx={x} cy={y} r={size} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity="0.7" />;
                })}
            </svg>
        );
    };

    const getKpiIcon = (name, style) => {
        switch(name) {
            case 'numbers': return <NumbersIcon style={style} />;
            case 'barChart': return <BarChartIcon style={style} />;
            case 'lineChart': return <LineChartIcon style={style} />;
            case 'pieChart': return <PieChartIcon style={style} />;
            case 'date': return <DateRangeIcon style={style} />;
            case 'portrait': return <PortraitIcon style={style} />;
            case 'map': return <MapIcon style={style} />;
            case 'filter': return <FilterIcon style={style} />;
            case 'speed': return <SpeedIcon style={style} />;
            case 'battery': return <BatteryIcon style={style} />;
            case 'vehicle': return <VehicleIcon style={style} />;
            case 'security': return <SecurityIcon style={style} />;
            case 'warning': return <Warning style={style} />;
            case 'alert': return <AlertIcon style={style} />;
            case 'trend': return <TrendIcon style={style} />;
            case 'time': return <TimeIcon style={style} />;
            case 'location': return <LocationIcon style={style} />;
            case 'globe': return <GlobeIcon style={style} />;
            case 'truck': return <TruckIcon style={style} />;
            case 'bus': return <BusIcon style={style} />;
            case 'ticket': return <TicketIcon style={style} />;
            case 'lock': return <LockIcon style={style} />;
            case 'unlock': return <UnlockIcon style={style} />;
            case 'cart': return <CartIcon style={style} />;
            case 'gas': return <GasIcon style={style} />;
            case 'volt': return <VoltIcon style={style} />;
            default: return null;
        }
    };

    const renderKpi = () => {
        const field = widget.config?.field;
        let displayValue = '—';
        let defaultSubtitle = '';

        if (widget.config?.customFieldFunc) {
            try {
                let dataToProcess = [];
                if (dataSource === 'Combined') {
                    // Summary/Report (backward compatibility): points from item.route
                    const reportItems = Array.isArray(rawData) ? rawData : [];
                    dataToProcess = reportItems.flatMap(item => {
                        const pts = [];
                        // 1. Prefer item.positions (array of objects) if it has data
                        if (Array.isArray(item.positions) && item.positions.length > 0) {
                            pts.push(...item.positions);
                        } else if (Array.isArray(item.route)) {
                            // 2. Fall back to item.route summary (array of arrays)
                            pts.push(...item.route.map(r => ({
                                lat: r[1], lon: r[0], latitude: r[1], longitude: r[0],
                                speed: r[2], course: r[3], altitude: r[4], fixTime: r[5],
                                attributes: r[6] || {}
                            })));
                        }
                        return pts;
                    });

                    const detailedPositions = dataCache.CombinedDetailedPositions || [];
                    
                    // Signature: (data, route, positions, devices, reportParams, events, flattened)
                    // data: summary points (legacy)
                    // route: summary points (context-clear alias)
                    // positions: high-fidelity supplemental points
                    // devices: all devices metadata
                    // reportParams: start/end times of the report
                    // events: array of raw events
                    // flattened: exactly what the table displays (filtered, combined)
                    const combinedEvents = reportItems.flatMap(item => Array.isArray(item.events) ? item.events : []);
                    const customFunc = new Function('data', 'route', 'positions', 'devices', 'reportParams', 'events', 'flattened', widget.config.customFieldFunc);
                    const result = customFunc(dataToProcess, dataToProcess, detailedPositions, dataCache.Devices || [], reportParams, combinedEvents, widgetData || []);
                    displayValue = (result !== undefined && result !== null) ? String(result) : '—';
                } else {
                    // Standard Data Sources (Positions, Trips, Stops, etc.)
                    // widgetData is already flattened and normalized
                    dataToProcess = widgetData || [];
                    
                    // For non-Combined, all variables point to the same dataset except events
                    const eventsData = dataSource === 'Events' ? dataToProcess : [];
                    const customFunc = new Function('data', 'route', 'positions', 'devices', 'reportParams', 'events', 'flattened', widget.config.customFieldFunc);
                    const result = customFunc(dataToProcess, dataToProcess, dataToProcess, dataCache.Devices || [], reportParams, eventsData, widgetData || []);
                    displayValue = (result !== undefined && result !== null) ? String(result) : '—';
                }
                if (widget.config.customFieldName) defaultSubtitle = widget.config.customFieldName;
            } catch (e) {
                console.error("Custom KPI calculation error:", e, "Code:", widget.config.customFieldFunc);
                displayValue = 'Error';
            }
        } else if (field) {

            const kpiMode = widget.config?.kpiMode || 'count';

            // IMPORTANT: For 'Combined' reports, numeric calculations (min, max, avg, sum) should ONLY
            // use position data to avoid double-counting or inaccuracies from event markers.
            const kpiData = (dataSource === 'Combined' && ['sum', 'avg', 'min', 'max'].includes(kpiMode))
                ? widgetData.filter(d => d.type === 'position')
                : widgetData;

            const unitsProps = { speedUnit, distanceUnit, altitudeUnit };
            const { numeric, categorical, isNumeric } = getFieldValues(kpiData, field, resolveValue, unitsProps);
            const fkEntity = resolveFKEntityType(field);
            if (fkEntity && !dataCache[fkEntity]) onFetchEntity(fkEntity);

            const fieldLabel = widget.config?.fieldLabels?.[field] || (widgetFields.find((f) => f.key === field)?.label || field);
            defaultSubtitle = fieldLabel;

            const formatValueWithUnit = (val) => {
                if (val == null) return '—';
                const fLower = field.toLowerCase();
                const isSpeed = fLower.includes('speed');
                const numStr = val.toLocaleString(undefined, { 
                    maximumFractionDigits: isSpeed ? 0 : 2 
                });
                if (isSpeed) return `${numStr} ${speedUnitString(speedUnit, t)}`;
                if (fLower.includes('distance') || fLower.includes('odometer') || fLower.includes('totaldistance')) return `${numStr} ${distanceUnitString(distanceUnit, t)}`;
                if (fLower.includes('altitude')) return `${numStr} ${altitudeUnitString(altitudeUnit, t)}`;
                return numStr;
            };

            if (kpiMode === 'distinct') {
                displayValue = Object.keys(categorical).length.toLocaleString();
            } else if (kpiMode === 'sum') {
                displayValue = isNumeric ? formatValueWithUnit(numeric.reduce((s, v) => s + v, 0)) : '—';
            } else if (kpiMode === 'avg') {
                displayValue = isNumeric && numeric.length > 0 ? formatValueWithUnit(numeric.reduce((s, v) => s + v, 0) / numeric.length) : '—';
            } else if (kpiMode === 'max') {
                displayValue = isNumeric && numeric.length > 0 ? formatValueWithUnit(Math.max(...numeric)) : '—';
            } else if (kpiMode === 'min') {
                displayValue = isNumeric && numeric.length > 0 ? formatValueWithUnit(Math.min(...numeric)) : '—';
            } else { // 'count' — total filtered rows
                displayValue = widgetData.length.toLocaleString();
            }
        }

        const subKey = 'customSubtitle';
        const currentSubtitle = widget.config?.[subKey] !== undefined ? widget.config[subKey] : defaultSubtitle;
        
        const kpiIcon = widget.config?.kpiIcon;
        const kpiTextColor = widget.config?.kpiTextColor || colors.text;
        const kpiTextSize = widget.config?.kpiTextSize || '1.625rem';
        const kpiIconSize = widget.config?.kpiIconSize || '24px';
        const kpiBorderSize = Boolean(widget.config?.kpiBorderSize) && widget.config?.kpiBorderSize !== '0px' ? widget.config.kpiBorderSize : '0px';
        const kpiBorderColor = widget.config?.kpiBorderColor || colors.border;
        const kpiIconColor = widget.config?.kpiIconColor || colors.primary;
        
        const kpiBgColor = widget.config?.bgColor || colors.surface;
        const kpiBgColor2 = widget.config?.kpiBgColor2;
        const kpiGlass = widget.config?.kpiGlass;
        const kpiShadow = widget.config?.kpiShadow || 'none';
        const kpiLayout = widget.config?.kpiLayout || 'vertical';
        const kpiAlign = widget.config?.kpiAlign || 'center';

        const bgStyle = kpiBgColor2 
            ? `linear-gradient(135deg, ${kpiBgColor}, ${kpiBgColor2})` 
            : kpiBgColor;

        const shadowMap = {
            light: '0 2px 4px rgba(0,0,0,0.05)',
            normal: '0 4px 12px rgba(0,0,0,0.1)',
            glow: `0 0 15px ${kpiIconColor}50`,
            none: 'none'
        };

        const alignItems = kpiAlign === 'left' ? 'flex-start' : kpiAlign === 'right' ? 'flex-end' : 'center';

        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%', 
                background: kpiBgColor2 ? bgStyle : (kpiGlass ? `${kpiBgColor}80` : kpiBgColor),
                backgroundClip: 'border-box',
                backdropFilter: kpiGlass ? 'blur(8px)' : 'none',
                WebkitBackdropFilter: kpiGlass ? 'blur(8px)' : 'none',
                border: kpiBorderSize !== '0px' ? `${kpiBorderSize} solid ${kpiBorderColor}` : 'none',
                borderRadius: '12px',
                boxShadow: shadowMap[kpiShadow] || 'none',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
            }}>
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: kpiLayout === 'horizontal' ? 'row' : 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: kpiLayout === 'horizontal' ? '12px' : '0px', 
                    padding: displayValue.startsWith('GAUGE:') ? '2px' : '12px',
                    textAlign: displayValue.startsWith('GAUGE:') ? 'center' : kpiAlign,
                    height: '100%'
                }}>
                    {kpiIcon && kpiIcon !== 'none' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getKpiIcon(kpiIcon, { fontSize: kpiIconSize, color: kpiIconColor })}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}>
                        {displayValue.startsWith('GAUGE:') ? (
                            (() => {
                                try {
                                    let valStr = displayValue.substring(6); // Remove 'GAUGE:' prefix
                                    let showText = true;
                                    if (valStr.startsWith('NOTEXT:')) {
                                        showText = false;
                                        valStr = valStr.substring(7);
                                    }
                                    const valNum = Math.min(100, Math.max(0, parseFloat(valStr) || 0));
                                    const segments = [
                                        { color: '#ef5350' },
                                        { color: '#ffa726' },
                                        { color: '#66bb6a' },
                                        { color: '#43a047' },
                                    ];
                                    return (
                                        <div style={{ width: '85%', margin: '0 auto', position: 'relative' }}>
                                            {/* Chevron marker */}
                                            <div style={{ position: 'absolute', left: `${valNum}%`, top: '-6px', transform: 'translateX(-50%)', zIndex: 2 }}>
                                                <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${kpiTextColor}` }} />
                                            </div>
                                            <div style={{ display: 'flex', borderRadius: '3px', overflow: 'hidden', height: '15px', width: '100%', gap: '1px', marginBottom: '2px' }}>
                                                {segments.map((seg, i) => (
                                                    <div key={i} style={{ flex: 1, backgroundColor: seg.color }} />
                                                ))}
                                            </div>
                                            {showText && (
                                                <Typography style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', marginTop: '-1px', fontSize: '0.85rem', fontWeight: 900, color: kpiTextColor, lineHeight: 1, textShadow: '-0.8px -0.8px 0 white, 0.8px -0.8px 0 white, -0.8px 0.8px 0 white, 0.8px 0.8px 0 white' }}>
                                                    {valStr}
                                                </Typography>
                                            )}
                                        </div>
                                    );
                                } catch (e) {
                                    console.warn('Gauge render error:', e);
                                    return <Typography style={{ color: kpiTextColor, fontWeight: 800, fontSize: kpiTextSize }}>{displayValue.substring(6) || '—'}</Typography>;
                                }
                            })()
                        ) : displayValue.startsWith('LINK:') ? (
                            (() => {
                                const linkData = displayValue.substring(5);
                                const pipeIdx = linkData.indexOf('|');
                                const href = pipeIdx > -1 ? linkData.substring(0, pipeIdx) : linkData;
                                const label = pipeIdx > -1 ? linkData.substring(pipeIdx + 1) : href;
                                return (
                                    <Typography variant="h5" style={{ color: kpiTextColor, fontWeight: 800, lineHeight: 1.1, fontSize: kpiTextSize, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: kpiTextColor, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}>
                                            {label}
                                        </a>
                                    </Typography>
                                );
                            })()
                        ) : (
                            <Typography variant="h5" style={{ color: kpiTextColor, fontWeight: 800, lineHeight: 1.1, fontSize: kpiTextSize, display: 'flex', flexWrap: 'nowrap', alignItems: 'baseline', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {displayValue.includes('(') ? (
                                    <>
                                        <span style={{ fontSize: '0.96em', whiteSpace: 'nowrap' }}>{displayValue.split('(')[0]}</span>
                                        <span style={{ fontSize: '0.62em', opacity: 0.8, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            ({displayValue.split('(')[1]}
                                        </span>
                                    </>
                                ) : <span style={{ whiteSpace: 'nowrap' }}>{displayValue}</span>}
                            </Typography>
                        )}
                        <Typography variant="caption" style={{ color: kpiTextColor, opacity: 0.7, fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {currentSubtitle}
                        </Typography>
                    </div>
                </div>
            </div>
        );
    };

    const getWidgetContent = () => {
        switch (widget.type) {
            case 'table': return renderTable();
            case 'barChart': return renderChart(BarChartIcon, renderBarNumeric, renderBarCategorical);
            case 'lineChart': return renderChart(LineChartIcon, renderLineNumeric, renderLineCategorical);
            case 'pieChart': return renderChart(PieChartIcon, renderPieNumeric, renderPieData);
            case 'doughnutChart': return renderChart(DoughnutChartIcon, renderDoughnutNumeric, renderDoughnutData);
            case 'areaChart': return renderChart(AreaChartIcon, renderAreaNumeric, renderAreaCategorical);
            case 'scatterPlot': return renderChart(ScatterPlotIcon, renderScatterNumeric, renderScatterCategorical);
            case 'kpi': return renderKpi();
            case 'header':
                return (
                    <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', height: '100%' }}>
                        <div style={{ flexShrink: 0 }}>
                            {branding?.logoUrl ? (
                                <img src={branding.logoUrl} alt="Logo" style={{ height: '36px', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ width: '36px', height: '36px', backgroundColor: `${colors.textSecondary}10`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <HeaderIcon style={{ fontSize: '18px', color: colors.textSecondary }} />
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                            <Typography variant="subtitle1" style={{ color: colors.text, fontWeight: 700, fontSize: '17px', lineHeight: 1.3 }}>
                                {templateName || 'Report'}
                            </Typography>
                            {reportParams?.from && reportParams?.to && (
                                <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px', display: 'block', fontWeight: 600 }}>
                                    {dayjs(reportParams.from).format('L LT')} — {dayjs(reportParams.to).format('L LT')}
                                </Typography>
                            )}
                            <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '9px', display: 'block', opacity: 0.7 }}>
                                Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px', display: 'block' }}>
                                {branding?.whatsapp}
                            </Typography>
                            <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px', display: 'block' }}>
                                {branding?.supportEmail}
                            </Typography>
                            <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px', display: 'block' }}>
                                {branding?.appUrl}
                            </Typography>
                        </div>
                    </div>
                );
            case 'footer':
                return (
                    <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', borderTop: `1px solid ${colors.border}20` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {branding?.logoUrl ? (
                                <img src={branding.logoUrl} alt="Logo" style={{ height: '18px', objectFit: 'contain', opacity: 0.8 }} />
                            ) : (
                                <HeaderIcon style={{ fontSize: '16px', color: colors.textSecondary, opacity: 0.5 }} />
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="caption" style={{ color: colors.text, fontSize: '10px', fontWeight: 700, lineHeight: 1.2 }}>
                                    {branding?.companyName}
                                </Typography>
                                <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '9px', lineHeight: 1.2 }}>
                                    {branding?.appUrl}
                                </Typography>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px' }}>
                                    {branding?.whatsapp}
                                </Typography>
                                <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '8px', opacity: 0.4 }}>|</Typography>
                                <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px' }}>
                                    {branding?.supportEmail}
                                </Typography>
                            </div>
                            {pageNumber && totalPages && (
                                <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '9px', fontWeight: 600 }}>
                                    Page {pageNumber} / {totalPages}
                                </Typography>
                            )}
                        </div>
                    </div>
                );
            case 'title': return <div style={{ padding: '8px 12px' }}><Typography variant="h6" style={{ color: colors.text, fontWeight: 600, fontSize: '18px' }}>Report Title</Typography></div>;
            case 'text': return <div style={{ padding: '8px 12px' }}><Typography variant="body2" style={{ color: colors.textSecondary, fontSize: '13px' }}>Text block content...</Typography></div>;
            case 'filter': 
                const isReport = ['Combined', 'Events', 'Trips', 'Stops', 'Summary', 'Chart', 'Positions', 'Statistics', 'Audit'].includes(globalEntityType);
                return (
                    <div style={{ padding: '8px', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: `${colors.primary}05` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <FilterIcon style={{ fontSize: '16px', color: colors.primary }} />
                            <Typography variant="caption" style={{ fontWeight: 600, color: colors.text }}>Report Filters</Typography>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Device Selection (if applicable) */}
                            {['Combined', 'Events', 'Trips', 'Stops', 'Summary', 'Chart', 'Positions'].includes(globalEntityType) && (
                                <Autocomplete
                                    multiple
                                    size="small"
                                    options={dataCache.Devices || []}
                                    getOptionLabel={(option) => option.name || option.uniqueId}
                                    value={(dataCache.Devices || []).filter(d => reportParams.deviceIds.includes(d.id))}
                                    onChange={(_, newValue) => {
                                        onReportParamsChange({ ...reportParams, deviceIds: newValue.map(d => d.id) });
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Select Devices" placeholder="Devices..." 
                                            sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem', py: '2px' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                                        />
                                    )}
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <Chip label={option.name} {...getTagProps({ index })} size="small" sx={{ height: '20px', fontSize: '0.65rem' }} />
                                        ))
                                    }
                                    slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                    fullWidth
                                />
                            )}

                            {/* Date Range Selection */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <TextField
                                    label="From"
                                    type="datetime-local"
                                    size="small"
                                    fullWidth
                                    value={dayjs(reportParams.from).format('YYYY-MM-DDTHH:mm')}
                                    onChange={(e) => onReportParamsChange({ ...reportParams, from: dayjs(e.target.value).toISOString() })}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ '& .MuiInputBase-input': { fontSize: '0.7rem', py: '4px' }, '& .MuiInputLabel-root': { fontSize: '0.7rem' } }}
                                />
                                <TextField
                                    label="To"
                                    type="datetime-local"
                                    size="small"
                                    fullWidth
                                    value={dayjs(reportParams.to).format('YYYY-MM-DDTHH:mm')}
                                    onChange={(e) => onReportParamsChange({ ...reportParams, to: dayjs(e.target.value).toISOString() })}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ '& .MuiInputBase-input': { fontSize: '0.7rem', py: '4px' }, '& .MuiInputLabel-root': { fontSize: '0.7rem' } }}
                                />
                            </div>

                            {/* Summary Specific */}
                            {globalEntityType === 'Summary' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Checkbox 
                                        size="small" 
                                        checked={!!reportParams.daily} 
                                        onChange={(e) => onReportParamsChange({ ...reportParams, daily: e.target.checked })}
                                    />
                                    <Typography variant="caption" style={{ fontSize: '0.75rem' }}>Daily Breakdown</Typography>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'dateRange': return <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}><DateRangeIcon style={{ fontSize: '17px', color: colors.textSecondary }} /><Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '13px' }}>Date Range Picker</Typography></div>;
            case 'divider': return <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}><div style={{ flex: 1, height: '1px', backgroundColor: colors.border }} /></div>;
            case 'image': return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><ImageIcon style={{ fontSize: '30px', color: colors.textSecondary, opacity: 0.3 }} /></div>;
            case 'map': return <AnalyticsMapWidget widgetData={widgetData} colors={colors} entityType={widgetEntityType} dataSource={dataSource} config={widget.config} dataCache={dataCache} units={unitsContext} />;
            default: return null;
        }
    };

    const noBorder = ['header', 'footer', 'table', 'divider', 'kpi', 'barChart', 'lineChart', 'pieChart', 'areaChart', 'doughnutChart', 'scatterPlot', 'map'].includes(widget.type);

    return (
        <div
            onClick={(e) => { if (!previewMode) { e.stopPropagation(); onSelect(widget.id); } }}
            style={{
                height: '100%',
                backgroundColor: widget.type === 'kpi' ? 'transparent' : (widget.config?.bgColor || colors.surface),
                border: previewMode ? 'none' : (isSelected ? `3px solid #0096ff` : `1.5px solid ${colors.border}`),
                boxShadow: !previewMode && isSelected ? `0 0 15px rgba(0, 150, 255, 0.5)` : 'none',
                borderRadius: previewMode || noBorder ? 0 : '6px',
                zIndex: isSelected ? 100 : 1,
                position: 'relative',
                overflow: 'hidden',
                cursor: previewMode ? 'default' : 'pointer',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {!previewMode && (
                <div className="drag-handle" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '2px 6px',
                    backgroundColor: isSelected ? `${colors.text}10` : colors.background,
                    borderBottom: `1px solid ${colors.border}`,
                    cursor: 'grab', minHeight: '22px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DragIcon style={{ fontSize: '12px', color: colors.textSecondary }} />
                        <Typography variant="caption" style={{ fontSize: '9px', color: colors.textSecondary, fontWeight: 500 }}>{widget.label}</Typography>
                    </div>
                    <Tooltip title="Duplicate" slotProps={{ popper: { style: { zIndex: 999999 } } }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDuplicate(widget.id); }} style={{ padding: '1px' }}>
                            <FileCopyIcon style={{ fontSize: '11px', color: colors.textSecondary }} />
                        </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRemove(widget.id); }} style={{ padding: '1px' }}>
                        <CloseIcon style={{ fontSize: '11px', color: colors.textSecondary }} />
                    </IconButton>
                </div>
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>{getWidgetContent()}</div>
        </div>
    );
};



// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

const FloatingDataAnalyticsPopover = ({
    desktop,
    isMenuExpanded,
    isVisible,
    onClose,
}) => {
    const colors = useThemeColors();
    const { companyName, logoUrl, whatsapp, billingEmail, supportEmail, appUrl } = useResellerBranding();
    const branding = { companyName, logoUrl, whatsapp, billingEmail, supportEmail, appUrl };
    const user = useSelector((state) => state.session.user);
    const t = useTranslation();
    
    // Extract real-time WebSocket device data from Redux for live status overlay
    const devicesItems = useSelector((state) => state.devices.items);
    const devices = useMemo(() => Object.values(devicesItems || {}), [devicesItems]);

    const speedUnit = useAttributePreference('speedUnit');
    const distanceUnit = useAttributePreference('distanceUnit');
    const altitudeUnit = useAttributePreference('altitudeUnit');
    const unitsContext = useMemo(() => ({ speedUnit, distanceUnit, altitudeUnit }), [speedUnit, distanceUnit, altitudeUnit]);

    const { containerRef: canvasRef, width: canvasWidth } = useContainerWidth({ initialWidth: 800 });
    const previewRef = useRef(null);
    const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
    const [previewZoom, setPreviewZoom] = useState(1);

    useEffect(() => {
        const handler = () => setIsPreviewFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // ── State ─────────────────────────────────────────────────────────────────
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [loading, setLoading] = useState(false);

    // Left column tab: 0 = Templates, 1 = Entities
    const [leftTab, setLeftTab] = useState(0);

    // Template form
    const [templateName, setTemplateName] = useState('');
    const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Entity configuration (for designing a report template)
    const [entityType, setEntityType] = useState('Devices');
    const [selectedFields, setSelectedFields] = useState([]);

    // Live data cache: { [entityType]: data[] }
    const [dataCache, setDataCache] = useState({});
    const cacheRef = useRef({});
    const pendingFetches = useRef(new Set());
    const positionInFlightIds = useRef(new Set());

    // Overlay live WebSocket fields onto REST-fetched Devices (dynamic — all WS fields)
    useEffect(() => {
        if (!devices || devices.length === 0) return;
        setDataCache(prev => {
            const restDevices = prev.Devices || [];
            if (restDevices.length === 0) return prev;
            const wsMap = {};
            devices.forEach(d => { wsMap[d.id] = d; });
            const merged = restDevices.map(rd => {
                const ws = wsMap[rd.id];
                return ws ? { ...rd, ...ws } : rd;
            });
            return { ...prev, Devices: merged };
        });
    }, [devices]);

    // Canvas state
    const [canvasWidgets, setCanvasWidgets] = useState([]);
    const [canvasLayouts, setCanvasLayouts] = useState({ lg: [] });
    const [selectedWidget, setSelectedWidget] = useState(null);
    const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
    const [customFieldEditing, setCustomFieldEditing] = useState({ label: '', function: '' });
    const [showGrid, setShowGrid] = useState(true);
    const [canvasTab, setCanvasTab] = useState(0); // 0 = Canvas, 1 = Preview
    const [pageOrientation, setPageOrientation] = useState('portrait');
    const [previewPageIdx, setPreviewPageIdx] = useState(0);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [renamingTemplateId, setRenamingTemplateId] = useState(null);
    const [renamingTemplateName, setRenamingTemplateName] = useState('');
    const fileInputRef = useRef(null);

    // Filter/Report Parameters
    // We store these globally for the current template/session
    const deviceSearchInputRef = useRef(null);
    const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [reportParams, setReportParams] = useState({
        from: dayjs().startOf('day').toISOString(),
        to: dayjs().endOf('day').toISOString(),
        deviceIds: [],
        daily: false,
        period: 'today'
    });

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(deviceSearchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [deviceSearchQuery]);

    useEffect(() => {
        if (leftTab === 1 && deviceSearchInputRef.current) {
            deviceSearchInputRef.current.focus();
        }
    }, [leftTab]);

    const handlePeriodChange = useCallback((v) => {
        let from = reportParams.from;
        let to = reportParams.to;
        if (v !== 'custom') {
            switch (v) {
                case 'today':
                    from = dayjs().startOf('day').toISOString();
                    to = dayjs().endOf('day').toISOString();
                    break;
                case 'yesterday':
                    from = dayjs().subtract(1, 'day').startOf('day').toISOString();
                    to = dayjs().subtract(1, 'day').endOf('day').toISOString();
                    break;
                case 'thisWeek':
                    from = dayjs().startOf('week').toISOString();
                    to = dayjs().endOf('week').toISOString();
                    break;
                case 'previousWeek':
                    from = dayjs().subtract(1, 'week').startOf('week').toISOString();
                    to = dayjs().subtract(1, 'week').endOf('week').toISOString();
                    break;
                case 'thisMonth':
                    from = dayjs().startOf('month').toISOString();
                    to = dayjs().endOf('month').toISOString();
                    break;
                case 'previousMonth':
                    from = dayjs().subtract(1, 'month').startOf('month').toISOString();
                    to = dayjs().subtract(1, 'month').endOf('month').toISOString();
                    break;
                default: break;
            }
        }
        setReportParams(prev => ({ ...prev, period: v, from, to }));
        
        // Clear specific cache for current entityType to clear map/table, PRESERVING Devices
        const currentData = cacheRef.current[entityType];
        if (currentData) {
            cacheRef.current[entityType] = [];
            setDataCache(prev => ({ ...prev, [entityType]: [] }));
        }
    }, [reportParams.from, reportParams.to, entityType]);

    // Local field order state to avoid mutating global entityFieldDefinitions
    const [fieldOrder, setFieldOrder] = useState(entityFieldDefinitions[entityType] || []);

    useEffect(() => {
        const all = entityFieldDefinitions[entityType] || [];
        // If we have selectedFields, bubble them to the top in the saved order
        if (selectedFields.length > 0) {
            const ordered = [
                ...selectedFields.map(k => all.find(f => f.key === k)).filter(Boolean),
                ...all.filter(f => !selectedFields.includes(f.key))
            ];
            setFieldOrder(ordered);
        } else {
            setFieldOrder(all);
        }
    }, [entityType, selectedFields]);

    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // Entity → API endpoint mapping
    const entityEndpoints = {
        Devices: '/api/devices', Groups: '/api/groups', Users: '/api/users',
        Positions: '/api/positions', Events: '/api/reports/events',
        Geofences: '/api/geofences', Commands: '/api/commands',
        Drivers: '/api/drivers', Maintenance: '/api/maintenance',
        Calendars: '/api/calendars', Statistics: '/api/statistics',
        Combined: '/api/reports/combined',
        Events: '/api/reports/events',
        Trips: '/api/reports/trips',
        Stops: '/api/reports/stops',
        Summary: '/api/reports/summary',
        Chart: '/api/reports/route',
        Logs: '/api/session/logs',
        'Scheduled Reports': '/api/reports',
        Audit: '/api/reports/audit',
    };

    const showSnack = (message, severity = 'info') =>
        setSnackbar({ open: true, message, severity });

    // ── Template operations ───────────────────────────────────────────────────

    const loadTemplates = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await fetchTemplates(user.id);
            setTemplates(data);
        } catch {
            showSnack('Failed to load templates', 'error');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (isVisible && user) loadTemplates();
    }, [isVisible, user, loadTemplates]);

    const handleCreateTemplate = async () => {
        if (!templateName.trim()) {
            showSnack('Please enter a template name', 'warning');
            return;
        }
        setLoading(true);
        try {
            const tpl = await createTemplate({
                userId: user.id,
                name: templateName,
                entityType,
                selectedFields,
                canvasWidgets,
                canvasLayouts,
                pageOrientation,
                reportParams,
            });
            setTemplates([tpl, ...templates]);
            setSelectedTemplate(tpl);
            setShowNewTemplateDialog(false);
            setTemplateName('');
            showSnack('Template created', 'success');
        } catch {
            showSnack('Failed to create template', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRenameTemplate = async (templateId, newName) => {
        if (!newName || !newName.trim()) return;
        setLoading(true);
        try {
            const template = templates.find(t => t.id === templateId);
            if (!template) return;
            
            const updated = await updateTemplate(user.id, templateId, {
                ...template,
                name: newName.trim(),
            });
            
            setTemplates(templates.map((tp) => (tp.id === updated.id ? updated : tp)));
            if (selectedTemplate?.id === templateId) {
                setSelectedTemplate(updated);
            }
            setRenamingTemplateId(null);
            showSnack('Template renamed', 'success');
        } catch {
            showSnack('Failed to rename template', 'error');
        } finally {
            setLoading(false);
        }
    };
    const handleDuplicateTemplate = async (template) => {
        setLoading(true);
        try {
            const tpl = await createTemplate({
                userId: user.id,
                name: `${template.name} (Copy)`,
                entityType: template.entityType,
                selectedFields: template.selectedFields || [],
                canvasWidgets: template.canvasWidgets || [],
                canvasLayouts: template.canvasLayouts || { lg: [] },
                pageOrientation: template.pageOrientation || 'portrait',
                reportParams: template.reportParams || {},
            });
            setTemplates([tpl, ...templates]);
            showSnack('Template duplicated', 'success');
        } catch {
            showSnack('Failed to duplicate template', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = (template) => {
        try {
            const data = JSON.stringify(template, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.tpl`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showSnack('Template downloaded', 'success');
        } catch (e) {
            console.error('Download failed', e);
            showSnack('Failed to download template', 'error');
        }
    };

    const handleUploadTemplate = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                const templateData = JSON.parse(content);
                
                // Sanitize and clean up the object for a "new" template
                delete templateData.id;
                delete templateData.updatedAt;
                templateData.userId = user.id;

                // Handle naming logic from the prompt: _ replaced with space from file name
                const filename = file.name.replace(/\.tpl$/i, '').replace(/_/g, ' ');
                templateData.name = filename || templateData.name || 'Imported Template';

                setLoading(true);
                const tpl = await createTemplate(templateData);
                setTemplates([tpl, ...templates]);
                handleLoadTemplate(tpl);
                setCanvasTab(1);
                fetchDataForType(tpl.entityType, true, tpl.reportParams);
                showSnack('Template imported successfully', 'success');
            } catch (err) {
                console.error('Template upload failed', err);
                showSnack('Invalid template file', 'error');
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleUpdateTemplate = async () => {
        if (!selectedTemplate) return;
        setLoading(true);
        try {
            const updated = await updateTemplate(user.id, selectedTemplate.id, {
                name: templateName || selectedTemplate.name,
                entityType,
                selectedFields,
                canvasWidgets,
                canvasLayouts,
                pageOrientation,
                reportParams,
            });
            setTemplates(templates.map((tp) => (tp.id === updated.id ? updated : tp)));
            setSelectedTemplate(updated);
            showSnack('Template updated', 'success');
        } catch {
            showSnack('Failed to update template', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async () => {
        if (!templateToDelete) return;
        setLoading(true);
        try {
            await deleteTemplate(user.id, templateToDelete.id);
            setTemplates(templates.filter((tp) => tp.id !== templateToDelete.id));
            if (selectedTemplate?.id === templateToDelete.id) {
                setSelectedTemplate(null);
            }
            setShowDeleteDialog(false);
            setTemplateToDelete(null);
            showSnack('Template deleted', 'success');
        } catch {
            showSnack('Failed to delete template', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadTemplate = (template) => {
        const type = template.entityType || 'Devices';
        setSelectedTemplate(template);
        setTemplateName(template.name);
        setEntityType(type);
        const sel = template.selectedFields || [];
        setSelectedFields(sel);
        setCanvasWidgets(template.canvasWidgets || []);
        setCanvasLayouts(template.canvasLayouts || { lg: [] });
        setPageOrientation(template.pageOrientation || 'portrait');
        if (template.reportParams) {
            setReportParams(template.reportParams);
        }
    };

    // Normalization helper to ensure consistent field names across all Traccar report types
    const normalizeItem = useCallback((item, type) => {
        if (!item || typeof item !== 'object') return item;
        
        // Basic coordinates mapping with strict 0-value support
        let lat = item.latitude !== undefined && item.latitude !== null ? item.latitude : 
                  (item.lat !== undefined && item.lat !== null ? item.lat : item.startLat);
        let lon = item.longitude !== undefined && item.longitude !== null ? item.longitude : 
                  (item.lon !== undefined && item.lon !== null ? item.lon : item.startLon);
        
        // If it's a Combined report structure, it might have coordinates in route[0]
        if ((lat === undefined || lat === null) && Array.isArray(item.route) && item.route.length > 0) {
            lon = item.route[0][0];
            lat = item.route[0][1];
        }


        // Consolidated timestamp resolution
        const fixTime = item.fixTime || item.deviceTime || item.eventTime || item.startTime || item.actionTime || item.captureTime || item.serverTime;
        
        // Consolidated identifier
        const id = item.id || item.positionId || (type === 'Trips' ? `trip_${item.startPositionId}` : (type === 'Events' ? `event_${item.id}` : undefined));
        
        // Consistent type for marker icon resolution
        let effectiveType = item.type || item.actionType;
        if (!effectiveType) {
            if (type === 'Trips') effectiveType = 'tripStart';
            else if (type === 'Stops') effectiveType = 'deviceStopped';
            else if (type === 'Positions') effectiveType = 'position';
            else if (type === 'Audit') effectiveType = 'audit';
            else if (type === 'Statistics') effectiveType = 'stats';
        }

        return {
            ...item,
            lat,
            lon,
            fixTime,
            id,
            type: effectiveType,
        };

    }, []);

    // ── Live data fetching ─────────────────────────────────────────────────────
    const fetchDataForType = useCallback(async (type, force = false, paramsOverride = null) => {
        if ((cacheRef.current[type] && !force) || pendingFetches.current.has(type)) return;
        
        setLoading(true);
        pendingFetches.current.add(type);

        // If forcing refresh, clear current visual data so user sees the reload
        if (force) {
            cacheRef.current[type] = [];
            setDataCache(prev => ({ ...prev, [type]: [] }));
        }
        
        try {
            const endpoint = entityEndpoints[type];
            const query = new URLSearchParams();

            const listTypes = ['Devices', 'Groups', 'Users', 'Geofences', 'Commands', 'Drivers', 'Maintenance', 'Calendars'];
            if (listTypes.includes(type)) {
                query.set('all', 'true');
            }

            const reportTypes = ['Combined', 'Events', 'Trips', 'Stops', 'Summary', 'Chart', 'Positions', 'Statistics', 'Audit'];
            const params = paramsOverride || reportParams;
            if (reportTypes.includes(type)) {
                if (params.from) query.set('from', new Date(params.from).toISOString());
                if (params.to) query.set('to', new Date(params.to).toISOString());
            }

            const deviceReportTypes = ['Combined', 'Events', 'Trips', 'Stops', 'Summary', 'Chart', 'Positions'];
            if (deviceReportTypes.includes(type) && params.deviceIds?.length > 0) {
                params.deviceIds.forEach(id => query.append('deviceId', id));
            }

            if (type === 'Summary' && params.daily) {
                query.set('daily', 'true');
            }

            const url = `${endpoint}${query.toString() ? `?${query}` : ''}`;
            const response = await fetchOrThrow(url, { 
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } 
            });
            const data = await response.json();

            let supplementalPositions = null;
            // Detailed high-res positions fetch for 'Combined' reports to ensure map route detail
            if (type === 'Combined') {
                try {
                    const pResp = await fetchOrThrow(`/api/positions?${query.toString()}`, { 
                        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } 
                    });
                    const pData = await pResp.json();
                    if (Array.isArray(pData)) {
                        supplementalPositions = pData.map(p => normalizeItem(p, 'Positions'));
                    }
                } catch (pe) {
                    console.warn('Failed to fetch supplemental positions for Combined report', pe);
                }
            }

            // Handle both Array (multi-device) and Object (single-device/map of devices)
            let rawData = Array.isArray(data) ? data : [];
            if (!Array.isArray(data) && data && typeof data === 'object') {
                // If it contains the keys directly, it's a single combined object. Otherwise, it's a map of devices.
                if (data.events || data.positions || data.route) {
                    rawData = [data];
                } else {
                    rawData = Object.values(data); // Flatten map of devices
                }
            }
            
            const result = rawData.map(item => {
                if (item && (item.events || item.positions || item.route)) {
                    // Normalize nested items in Combined result
                    return {
                        ...item,
                        events: (Array.isArray(item.events) ? item.events : (item.events ? Object.values(item.events) : [])).map(ev => normalizeItem(ev, 'Events')),
                        positions: (Array.isArray(item.positions) ? item.positions : (item.positions ? Object.values(item.positions) : [])).map(pos => normalizeItem(pos, 'Positions')),
                    };
                }
                return normalizeItem(item, type);
            });
            
            // Consolidated cache update to prevent race conditions or partial states
            const updates = { [type]: result };
            cacheRef.current[type] = result;
            
            // Explicitly set/clear CombinedDetailedPositions to prevent stale data
            updates.CombinedDetailedPositions = supplementalPositions || [];
            cacheRef.current.CombinedDetailedPositions = supplementalPositions || [];
            
            setDataCache((prev) => ({ ...prev, ...updates }));





/* 
            // Scan any result for positionId to fetch missing addresses for reports/devices
            if (result.length > 0) {
                const posIds = [...new Set(result.map(r => r.positionId).filter(id => id && id > 0))];
                if (posIds.length > 0) {
                    for (let i = 0; i < posIds.length; i += 5) {
                        const chunk = posIds.slice(i, i + 5);
                        const missing = chunk.filter(id => 
                            !positionInFlightIds.current.has(id) && 
                            !(cacheRef.current.Positions || []).some(p => p.id === id)
                        );
                        
                        if (missing.length === 0) continue;
                        missing.forEach(id => positionInFlightIds.current.add(id));
                        
                        const params = new URLSearchParams();
                        missing.forEach(id => params.append('id', id));
                        
                        try {
                            const pResp = await fetchOrThrow(`/api/positions?${params.toString()}`);
                            const pData = await pResp.json();
                            if (Array.isArray(pData)) {
                                setDataCache(prev => {
                                    const existing = prev.Positions || [];
                                    const newItems = pData.filter(np => !existing.some(ep => ep.id === np.id));
                                    const next = [...existing, ...newItems];
                                    cacheRef.current.Positions = next;
                                    return { ...prev, Positions: next };
                                });
                            }
                        } catch (e) {
                            console.warn('Failed to fetch batch positions', e);
                        }
                        
                        if (i + 5 < posIds.length) {
                            await new Promise(r => setTimeout(r, 300));
                        }
                    }
                }
            }
            */
        } catch {
            setDataCache((prev) => ({ ...prev, [type]: [] }));
        } finally {
            pendingFetches.current.delete(type);
            setLoading(false);
        }
    }, [reportParams, entityType]);

    // Clear cache for reports when reportParams change and reset pagination
    useEffect(() => {
        const reportTypes = ['Combined', 'Events', 'Trips', 'Stops', 'Summary', 'Chart', 'Positions', 'Statistics', 'Audit'];
        reportTypes.forEach(type => {
            delete cacheRef.current[type];
        });
        setPreviewPageIdx(0);

        // Clear all report data in state to ensure all widgets reset
        setDataCache(prev => {
            const next = { ...prev };
            reportTypes.forEach(type => {
                next[type] = [];
            });
            return next;
        });
    }, [reportParams, entityType]);


    // Core entities fetch (Devices, Groups, etc. needed for selection and FK resolution)
    useEffect(() => {
        if (isVisible) {
            ['Devices', 'Groups', 'Users', 'Geofences', 'Drivers'].forEach(type => {
                fetchDataForType(type);
            });
        }
    }, [isVisible, fetchDataForType]);

    // Report-specific re-fetch when switching non-report entity types (e.g. switching between Devices and Groups)
    useEffect(() => {
        const reportTypes = ['Combined', 'Events', 'Trips', 'Stops', 'Summary', 'Chart', 'Positions', 'Statistics', 'Audit'];
        if (isVisible && !reportTypes.includes(entityType)) {
            fetchDataForType(entityType);
        }
    }, [entityType, isVisible, fetchDataForType]);


    useEffect(() => {
        setPreviewPageIdx(0);
    }, [canvasWidgets, pageOrientation, canvasTab]);

    const previewPageData = useMemo(() => {
        if (canvasTab !== 1) return { pages: [], headerLayouts: [], footerLayouts: [] };

        const A4_MAX_GRID_HEIGHT = pageOrientation === 'portrait' ? 21 : 13;
        const headerLayouts = canvasLayouts.lg.filter(l => canvasWidgets.find(w => w.id === l.i)?.type === 'header');
        const footerLayouts = canvasLayouts.lg.filter(l => canvasWidgets.find(w => w.id === l.i)?.type === 'footer');
        const bodyLayoutsRaw = canvasLayouts.lg.filter(l => {
            const type = canvasWidgets.find(w => w.id === l.i)?.type;
            return type !== 'header' && type !== 'footer';
        }).sort((a,b) => a.y - b.y || a.x - b.x);

        const previewPages = [];
        let currentPageLayouts = [];
        let currentPageH = 0;
        let pageStartY = 0; // Track the y-offset where the current page starts

        const getRowsFit = (hUnits) => Math.max(0, Math.floor((hUnits * 48 - 40) / 25));

        const gridRows = [];
        bodyLayoutsRaw.forEach(l => {
            if (gridRows.length === 0 || gridRows[gridRows.length-1].y !== l.y) {
                gridRows.push({ y: l.y, layouts: [l], maxH: l.h });
            } else {
                gridRows[gridRows.length-1].layouts.push(l);
                gridRows[gridRows.length-1].maxH = Math.max(gridRows[gridRows.length-1].maxH, l.h);
            }
        });

        for (let i = 0; i < gridRows.length; i++) {
            const row = gridRows[i];
            const tableLayouts = row.layouts.filter(l => canvasWidgets.find(w => w.id === l.i)?.type === 'table');
            
            if (tableLayouts.length > 0) {
                const tableL = tableLayouts[0];
                const widget = canvasWidgets.find(w => w.id === tableL.i);
                const wEntityType = widget.config?.entityType || entityType;
                let sortedData = dataCache[wEntityType] || [];

                // Flatten for 'Combined' reports to match CanvasWidget logic
                if (wEntityType === 'Combined') {
                    const flattened = [];
                    const items = Array.isArray(sortedData) ? sortedData : (sortedData ? Object.values(sortedData) : []);
                    const processedPosIds = new Set();
                    
                    if (Array.isArray(dataCache?.Positions)) {
                        dataCache.Positions.forEach(p => {
                            processedPosIds.add(p.id);
                            flattened.push({ ...p, type: 'position' });
                        });
                    }

                    items.forEach(item => {
                        const positions = Array.isArray(item.positions) ? item.positions : [];
                        const events = Array.isArray(item.events) ? item.events : [];
                        
                        if (positions.length > 0 || events.length > 0) {
                            positions.forEach(p => {
                                if (!processedPosIds.has(p.id)) {
                                    processedPosIds.add(p.id);
                                    flattened.push({ ...p, type: 'position' });
                                }
                            });
                            events.forEach(e => {
                                let pos = Array.isArray(dataCache?.Positions) ? dataCache.Positions.find(p => p.id === e.positionId) : null;
                                if (!pos) pos = positions.find(p => p.id === e.positionId) || {};
                                flattened.push({ ...pos, ...e, type: e.type || 'event', id: `event_${e.id || Math.random()}` });
                            });
                        } else if (item.id && !processedPosIds.has(item.id)) {
                            processedPosIds.add(item.id);
                            flattened.push({ ...item });
                        }
                    });
                    sortedData = flattened.sort((a, b) => new Date(b.fixTime || 0) - new Date(a.fixTime || 0));
                }



                const pOp = widget.config?.filterOperator;
                const pFVal = widget.config?.filterValue;
                const filterFKey = widget.config?.filterField || widget.config?.field;
                const needsVal = pOp && !['is null', 'not null'].includes(pOp);
                
                if (filterFKey && pOp && (needsVal ? (pFVal !== undefined && pFVal !== '') : true)) {
                    const tStr = String(pFVal || '').toLowerCase();
                    const tNum = Number(pFVal);
                    const isDateLike = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/.test(s);
                    const tIsDate = isDateLike(pFVal);
                    const tDate = tIsDate ? new Date(pFVal).getTime() : NaN;
                    let tRe = null;
                    if (pOp === 'regex') { try { tRe = new RegExp(pFVal, 'i'); } catch { } }
                    
                    sortedData = sortedData.filter(r => {
                        const raw = r[filterFKey];
                        if (pOp === 'is null' || (pOp === '==' && tStr === 'null')) return raw == null || raw === '';
                        if (pOp === 'not null' || (pOp === '!=' && tStr === 'null')) return raw != null && raw !== '';
                        if (raw == null) return pOp === '!=';

                        const fLower = filterFKey.toLowerCase();
                        let targetValNum = tNum;
                        if (!isNaN(targetValNum)) {
                            if (fLower.includes('speed')) {
                                targetValNum = speedToKnots(targetValNum, unitsContext?.speedUnit);
                            } else if (fLower.includes('distance') || fLower.includes('odometer') || fLower.includes('totaldistance')) {
                                targetValNum = distanceToMeters(targetValNum, unitsContext?.distanceUnit);
                            } else if (fLower.includes('altitude')) {
                                targetValNum = altitudeToMeters(targetValNum, unitsContext?.altitudeUnit);
                            }
                        }

                        // 1. Numeric comparison for unit-aware fields
                        const isNumericOp = ['==', '!=', '>', '>=', '<', '<='].includes(pOp);
                        const rowNumRaw = Number(raw);
                        if (isNumericOp && !isNaN(targetValNum) && !isNaN(rowNumRaw)) {
                            switch (pOp) {
                                case '==': return Math.abs(rowNumRaw - targetValNum) < 0.001;
                                case '!=': return Math.abs(rowNumRaw - targetValNum) >= 0.001;
                                case '>': return rowNumRaw > targetValNum;
                                case '>=': return rowNumRaw >= targetValNum;
                                case '<': return rowNumRaw < targetValNum;
                                case '<=': return rowNumRaw <= targetValNum;
                                default: break;
                            }
                        }

                        // Resolve value for consistent comparison (matching table logic)
                        const resolvedVal = resolveIdToName(filterFKey, raw, dataCache, fetchDataForType, t, r, unitsContext);
                        const rStr = String(resolvedVal).toLowerCase();
                        const rNum = Number(resolvedVal);
                        const rIsDate = isDateLike(String(resolvedVal));
                        const rDate = rIsDate ? new Date(resolvedVal).getTime() : NaN;
                        
                        const useD = tIsDate && rIsDate && !isNaN(tDate) && !isNaN(rDate);
                        const refT = useD ? tDate : targetValNum;
                        const refR = useD ? rDate : rNum;
                        
                        switch (pOp) {
                            case '==': return rStr === tStr || (useD && refR === refT);
                            case '!=': return rStr !== tStr && (!useD || refR !== refT);
                            case '>': return !isNaN(refR) && !isNaN(targetValNum) ? refR > refT : rStr > tStr;
                            case '>=': return !isNaN(refR) && !isNaN(targetValNum) ? refR >= refT : rStr >= tStr;
                            case '<': return !isNaN(refR) && !isNaN(targetValNum) ? refR < refT : rStr < tStr;
                            case '<=': return !isNaN(refR) && !isNaN(targetValNum) ? refR <= refT : rStr <= tStr;
                            case 'contains': return rStr.includes(tStr);
                            case 'starts': return rStr.startsWith(tStr);
                            case 'ends': return rStr.endsWith(tStr);
                            case 'regex': return tRe ? tRe.test(String(resolvedVal)) : true;
                            default: return true;
                        }
                    });
                }

                const totalRows = sortedData.length;
                let rowsProcessed = 0;
                let isFirstSlice = true;
                
                while (true) {
                    let spaceLeft = A4_MAX_GRID_HEIGHT - currentPageH;
                    if (spaceLeft < 4) {
                        previewPages.push(currentPageLayouts);
                        currentPageLayouts = [];
                        currentPageH = 0;
                        pageStartY = row.y;
                        spaceLeft = A4_MAX_GRID_HEIGHT;
                    }
                    const rowsFit = getRowsFit(spaceLeft);
                    const rowsRemaining = totalRows - rowsProcessed;
                    const layoutsToInclude = isFirstSlice ? row.layouts : row.layouts.filter(l => l.i === tableL.i);
                    
                    if (rowsRemaining > rowsFit) {
                        const fittingLayouts = layoutsToInclude.map(l => {
                            if (l.i === tableL.i) {
                                return { ...l, tableOffset: rowsProcessed, tableLimit: rowsFit, h: spaceLeft };
                            }
                            return { ...l };
                        });
                        currentPageLayouts.push(...fittingLayouts);
                        previewPages.push(currentPageLayouts);
                        currentPageLayouts = [];
                        currentPageH = 0;
                        pageStartY = row.y;
                        rowsProcessed += rowsFit;
                        isFirstSlice = false;
                    } else {
                        const requiredUnits = totalRows === 0 ? tableL.h : Math.max(4, Math.ceil((rowsRemaining * 25 + 40) / 48));
                        const actualH = Math.max(isFirstSlice ? row.maxH : 4, requiredUnits);
                        const fittingLayouts = layoutsToInclude.map(l => {
                            if (l.i === tableL.i) {
                                return { ...l, tableOffset: rowsProcessed, tableLimit: rowsRemaining, h: actualH };
                            }
                            return { ...l };
                        });
                        currentPageLayouts.push(...fittingLayouts);
                        currentPageH += actualH;
                        break;
                    }
                }
            } else {
                // Non-table widgets: use actual y-position to compute consumed height
                const rowBottomY = row.y + row.maxH;
                const effectiveH = rowBottomY - pageStartY;

                if (effectiveH > A4_MAX_GRID_HEIGHT && currentPageLayouts.length > 0) {
                    previewPages.push(currentPageLayouts);
                    currentPageLayouts = [];
                    currentPageH = 0;
                    pageStartY = row.y;
                }
                currentPageLayouts.push(...row.layouts);
                currentPageH = (row.y + row.maxH) - pageStartY;
            }
        }
        if (currentPageLayouts.length > 0) previewPages.push(currentPageLayouts);
        if (previewPages.length === 0) previewPages.push([]);

        return { pages: previewPages, headerLayouts, footerLayouts };
    }, [canvasWidgets, canvasLayouts, pageOrientation, dataCache, entityType, canvasTab, fetchDataForType]);


    // ── Canvas operations ─────────────────────────────────────────────────────

    const addWidgetToCanvas = (toolDef) => {
        const id = `widget_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newWidget = {
            id,
            type: toolDef.type,
            label: toolDef.label,
            config: {
                entityType: entityType, // Default to current global entity type
                selectedFields: selectedFields, // Default to current global selected fields
                showMarkers: toolDef.type === 'map' ? false : undefined,
                lineWidth: toolDef.type === 'map' ? 3 : undefined,
                speedThreshold: toolDef.type === 'map' ? 0 : undefined,
            },
        };

        const maxY = canvasLayouts.lg.reduce((max, l) => Math.max(max, l.y + l.h), 0);

        const newLayoutItem = {
            i: id, x: 0, y: maxY,
            w: toolDef.defaultW, h: toolDef.defaultH,
            minW: toolDef.minW, minH: toolDef.minH,
        };

        setCanvasWidgets([...canvasWidgets, newWidget]);
        setCanvasLayouts({ lg: [...canvasLayouts.lg, newLayoutItem] });
        setSelectedWidget(id);
    };

    const handleSelectWidget = (widgetId) => {
        setSelectedWidget(widgetId);
        if (widgetId) {
            const widget = canvasWidgets.find(w => w.id === widgetId);
            if (widget) {
                // Sync sidebar to widget config
                const wType = widget.config?.entityType || entityType;
                const wFields = widget.config?.selectedFields || [];
                setEntityType(wType);
                setSelectedFields(wFields);
                // Optionally switch to Fields tab
                setLeftTab(1);
            }
        }
    };

    const updateWidgetConfig = (widgetId, configUpdate) => {
        setCanvasWidgets(canvasWidgets.map((w) => w.id === widgetId ? { ...w, config: { ...w.config, ...configUpdate } } : w));
    };

    const removeWidget = (widgetId) => {
        setCanvasWidgets(canvasWidgets.filter((w) => w.id !== widgetId));
        setCanvasLayouts({ lg: canvasLayouts.lg.filter((l) => l.i !== widgetId) });
        if (selectedWidget === widgetId) setSelectedWidget(null);
    };

    const duplicateWidget = (widgetId) => {
        const sourceWidget = canvasWidgets.find(w => w.id === widgetId);
        const sourceLayout = canvasLayouts.lg.find(l => l.i === widgetId);
        if (sourceWidget && sourceLayout) {
            const newId = `${sourceWidget.type}_${Date.now()}`;
            const newWidget = JSON.parse(JSON.stringify(sourceWidget)); // Deep clone
            newWidget.id = newId;
            
            const newLayoutItem = { 
                ...sourceLayout, 
                i: newId, 
                y: sourceLayout.y + sourceLayout.h // Place below current
            };
            
            setCanvasWidgets([...canvasWidgets, newWidget]);
            setCanvasLayouts({ lg: [...canvasLayouts.lg, newLayoutItem] });
            setSelectedWidget(newId);
        }
    };

    const handleLayoutChange = (layout, allLayouts) => {
        // Use allLayouts if available to preserve structural integrity for ResponsiveGridLayout
        setCanvasLayouts(allLayouts || { lg: layout });
    };

    const clearCanvas = () => {
        setCanvasWidgets([]);
        setCanvasLayouts({ lg: [] });
        setSelectedWidget(null);
    };

    // ── Filtered template list ────────────────────────────────────────────────

    const filteredTemplates = templates.filter((tp) =>
        tp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );


    // ── Custom grid CSS ──────────────────────────────────────────────────────

    const gridStyles = `
        .report-canvas .react-grid-item {
            transition: all 200ms ease;
        }
        .report-canvas .react-grid-item.react-grid-placeholder {
            background: ${colors.primary}30 !important;
            border: 2px dashed ${colors.primary} !important;
            border-radius: 6px;
            opacity: 1 !important;
        }
        .report-canvas .react-resizable-handle {
            background: none !important;
            z-index: 1000 !important;
        }
        .report-canvas .react-resizable-handle::after {
            border-right: 3px solid ${colors.primary} !important;
            border-bottom: 3px solid ${colors.primary} !important;
            width: 14px !important;
            height: 14px !important;
            content: "" !important;
            position: absolute !important;
            right: 6px !important;
            bottom: 6px !important;
            opacity: 0.6;
            transition: all 0.2s;
        }
        .report-canvas .react-resizable-handle:hover::after {
            opacity: 1;
            width: 18px !important;
            height: 18px !important;
            border-right-width: 4px !important;
            border-bottom-width: 4px !important;
        }
    `;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    key="floating-data-analytics-popover"
                    initial={{ x: -400, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -400, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{
                        position: 'fixed',
                        top: !desktop ? '0px' : '8px',
                        left: !desktop ? '0px' : (isMenuExpanded ? '200px' : '63px'),
                        width: !desktop ? '100vw' : `calc(100vw - ${isMenuExpanded ? '200px' : '63px'} - 10px)`,
                        height: !desktop ? '100vh' : 'calc(100vh - 16px)',
                        zIndex: 9999,
                        pointerEvents: 'auto',
                        transition: 'left 0.3s ease',
                    }}
                >
                    <style>{gridStyles}</style>
                    <div
                        style={{
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: !desktop ? '0px' : '0px 16px 16px 0px',
                            height: '100%',
                            overflow: 'hidden',
                            boxShadow: !desktop ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* ── Header ────────────────────────────────────────── */}
                        <div
                            style={{
                                padding: '10px 20px',
                                borderBottom: `1px solid ${colors.border}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
                                    <ChevronLeftIcon fontSize="small" />
                                </IconButton>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <Typography variant="h6" style={{ color: colors.text, fontWeight: '700', margin: 0, lineHeight: 1.2, fontSize: '1.15rem' }}>
                                        Telemetry BI
                                    </Typography>
                                    <Typography variant="caption" style={{ color: colors.textSecondary, fontWeight: '500', fontSize: '0.75rem', opacity: 0.8 }}>
                                        Advanced Fleet Indicators
                                    </Typography>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Tooltip title={showGrid ? 'Hide Grid' : 'Show Grid'}>
                                    <IconButton size="small" onClick={() => setShowGrid(!showGrid)}
                                        style={{ color: showGrid ? colors.primary : colors.textSecondary }}>
                                        <GridIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Clear Canvas">
                                    <IconButton size="small" onClick={() => setShowClearConfirm(true)} style={{ color: colors.textSecondary }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Button
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    size="small"
                                    onClick={selectedTemplate ? handleUpdateTemplate : () => setShowNewTemplateDialog(true)}
                                    disabled={loading}
                                    style={{ textTransform: 'none', fontSize: '0.8rem' }}
                                >
                                    {selectedTemplate ? 'Save' : 'Save as Template'}
                                </Button>
                            </div>
                        </div>

                        {/* ── 3-Column Layout ───────────────────────────────── */}
                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                            {/* ═══ LEFT COLUMN (280px) — Templates | Entities ═══ */}
                            <div
                                style={{
                                    width: '280px',
                                    minWidth: '280px',
                                    borderRight: `1px solid ${colors.border}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                }}
                            >
                                <Tabs
                                    value={leftTab}
                                    onChange={(_, v) => setLeftTab(v)}
                                    variant="fullWidth"
                                    sx={{
                                        borderBottom: `1px solid ${colors.border}`,
                                        minHeight: '38px',
                                        '& .MuiTab-root': {
                                            minHeight: '38px',
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            fontSize: '0.8rem',
                                            color: colors.textSecondary,
                                        },
                                        '& .Mui-selected': { color: colors.primary },
                                        '& .MuiTabs-indicator': { backgroundColor: colors.primary },
                                    }}
                                >
                                    <Tab label="Templates" />
                                    <Tab label="Entities" />
                                    <Tab label="Components" />
                                </Tabs>

                                {/* Templates Tab */}
                                {leftTab === 0 && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<AddIcon />}
                                                    fullWidth
                                                    onClick={() => {
                                                        setSelectedTemplate(null);
                                                        setTemplateName('');
                                                        setCanvasWidgets([]);
                                                        setCanvasLayouts({ lg: [], md: [], sm: [] });
                                                        setLeftTab(1);
                                                    }}
                                                    size="small"
                                                    style={{ textTransform: 'none', fontSize: '0.8rem', height: '32px' }}
                                                >
                                                    New Template
                                                </Button>
                                                <Tooltip title="Upload Template (.tpl)">
                                                    <IconButton
                                                        onClick={() => fileInputRef.current?.click()}
                                                        size="small"
                                                        style={{ border: `1px solid ${colors.border}`, borderRadius: '4px', height: '32px', width: '40px' }}
                                                    >
                                                        <UploadIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleUploadTemplate}
                                                    style={{ display: 'none' }}
                                                    accept=".tpl"
                                                />
                                            </div>
                                            <DebouncedTextField
                                                fullWidth
                                                size="small"
                                                placeholder="Search templates..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                InputProps={{
                                                    startAdornment: <SearchIcon style={{ marginRight: '8px', color: colors.textSecondary, fontSize: '18px' }} />,
                                                }}
                                                sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                                            />
                                        </div>
                                        <div style={{ flex: 1, overflow: 'auto', padding: '6px' }}>
                                            {loading && templates.length === 0 ? (
                                                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                                                    <CircularProgress size={22} />
                                                </div>
                                            ) : filteredTemplates.length === 0 ? (
                                                <Typography variant="body2" style={{ color: colors.textSecondary, textAlign: 'center', padding: '20px', fontSize: '0.8rem' }}>
                                                    {searchTerm ? 'No templates found' : 'No templates yet'}
                                                </Typography>
                                            ) : (
                                                filteredTemplates.map((template) => (
                                                    <div
                                                        key={template.id}
                                                        style={{
                                                            padding: '8px 10px',
                                                            marginBottom: '4px',
                                                            borderRadius: '6px',
                                                            backgroundColor: selectedTemplate?.id === template.id ? colors.secondary : colors.background,
                                                            border: `1px solid ${selectedTemplate?.id === template.id ? colors.primary : colors.border}`,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s',
                                                        }}
                                                        onClick={() => {
                                                            if (renamingTemplateId !== template.id) {
                                                                handleLoadTemplate(template);
                                                                fetchDataForType(template.entityType || 'Devices', true, template.reportParams);
                                                            }
                                                        }}
                                                    >
                                                        {renamingTemplateId === template.id ? (
                                                            <div onClick={(e) => e.stopPropagation()}>
                                                                <TextField
                                                                    size="small"
                                                                    autoFocus
                                                                    fullWidth
                                                                    value={renamingTemplateName}
                                                                    onChange={(e) => setRenamingTemplateName(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleRenameTemplate(template.id, renamingTemplateName);
                                                                        if (e.key === 'Escape') setRenamingTemplateId(null);
                                                                        e.stopPropagation();
                                                                    }}
                                                                    sx={{ 
                                                                        mb: 1,
                                                                        '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 }
                                                                    }}
                                                                />
                                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                                    <Button size="small" variant="contained" onClick={() => handleRenameTemplate(template.id, renamingTemplateName)} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Save</Button>
                                                                    <Button size="small" onClick={() => setRenamingTemplateId(null)} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Cancel</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Typography variant="body2" style={{ color: colors.text, fontWeight: '500', fontSize: '0.8rem' }}>
                                                                    {template.name}
                                                                </Typography>
                                                                <Typography variant="caption" style={{ color: colors.textSecondary, display: 'block', fontSize: '0.7rem' }}>
                                                                    {template.entityType} · {new Date(template.updatedAt).toLocaleDateString()}
                                                                </Typography>
                                                                <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                                                                    <IconButton size="small" onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        setRenamingTemplateId(template.id); 
                                                                        setRenamingTemplateName(template.name);
                                                                    }} style={{ padding: '3px' }}>
                                                                        <EditIcon style={{ fontSize: '14px' }} />
                                                                    </IconButton>
                                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(template); }} style={{ padding: '3px' }}>
                                                                        <DownloadIcon style={{ fontSize: '14px' }} />
                                                                    </IconButton>
                                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDuplicateTemplate(template); }} style={{ padding: '3px' }}>
                                                                        <FileCopyIcon style={{ fontSize: '14px' }} />
                                                                    </IconButton>
                                                                    <IconButton size="small" onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setTemplateToDelete(template);
                                                                        setShowDeleteDialog(true);
                                                                    }} style={{ padding: '3px' }}>
                                                                        <DeleteIcon style={{ fontSize: '14px' }} />
                                                                    </IconButton>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Entities Tab */}
                                {leftTab === 1 && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <div style={{ padding: '6px 12px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <Autocomplete
                                                size="small"
                                                options={entityTypeOptions}
                                                value={entityType}
                                                onChange={(_, v) => {
                                                    if (v) {
                                                        setEntityType(v);
                                                        setSelectedFields([]);
                                                        if (selectedWidget) {
                                                            updateWidgetConfig(selectedWidget, { entityType: v, selectedFields: [] });
                                                        }
                                                        fetchDataForType(v);
                                                    }
                                                }}
                                                disableClearable
                                                disablePortal={true}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                                renderInput={(params) => <TextField {...params} label="Entity Type" />}
                                                slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' }, mb: 0 }}
                                            />

                                            {['Combined', 'Events', 'Trips', 'Stops', 'Summary', 'Chart', 'Positions', 'Statistics', 'Audit'].includes(entityType) && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <DebouncedTextField
                                                        inputRef={deviceSearchInputRef}
                                                        size="small"
                                                        fullWidth
                                                        placeholder="Search devices (min 3 chars)..."
                                                        value={deviceSearchQuery}
                                                        onChange={(e) => setDeviceSearchQuery(e.target.value)}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                        onKeyUp={(e) => e.stopPropagation()}
                                                        onKeyPress={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        autoComplete="off"
                                                        InputProps={{
                                                            startAdornment: (
                                                                <SearchIcon 
                                                                    style={{ 
                                                                        marginRight: '8px', 
                                                                        fontSize: '1.1rem', 
                                                                        color: colors.textSecondary 
                                                                    }} 
                                                                />
                                                            ),
                                                        }}
                                                        sx={{ 
                                                            mt: '4px',
                                                            '& .MuiInputBase-root': {
                                                                fontSize: '0.75rem',
                                                                borderRadius: '6px',
                                                                backgroundColor: colors.background,
                                                            },
                                                            '& .MuiOutlinedInput-root': {
                                                                '& fieldset': {
                                                                    borderColor: `${colors.border} !important`,
                                                                    borderWidth: '1px !important',
                                                                    transition: 'all 0.15s ease',
                                                                },
                                                                '&:hover fieldset': {
                                                                    borderColor: `${colors.textSecondary} !important`,
                                                                },
                                                                '&.Mui-focused fieldset': {
                                                                    borderColor: `${colors.textSecondary} !important`,
                                                                    borderWidth: '1px !important',
                                                                },
                                                            },
                                                        }}
                                                    />

                                                    {/* Selected Devices Chips (Always Visible) */}
                                                    {reportParams.deviceIds?.length > 0 && (
                                                        <div style={{
                                                            display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px',
                                                            maxHeight: '64px', overflowY: 'auto', padding: '2px'
                                                        }}>
                                                            {reportParams.deviceIds.map(id => {
                                                                const device = (dataCache.Devices || []).find(d => d.id === id);
                                                                return (
                                                                    <Chip
                                                                        key={id}
                                                                        label={device ? (device.name || device.uniqueId) : `Device ${id}`}
                                                                        size="small"
                                                                        onDelete={() => {
                                                                            const next = reportParams.deviceIds.filter(did => did !== id);
                                                                            setReportParams(prev => ({ ...prev, deviceIds: next }));
                                                                            cacheRef.current[entityType] = [];
                                                                            setDataCache(prev => ({ ...prev, [entityType]: [] }));
                                                                        }}
                                                                        style={{
                                                                            fontSize: '10px', height: '20px',
                                                                            backgroundColor: `${colors.primary}15`, color: colors.text,
                                                                            border: `1px solid ${colors.border}`,
                                                                        }}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {deviceSearchQuery.trim().length >= 3 && (
                                                        <div style={{
                                                            maxHeight: '180px',
                                                            overflowY: 'auto',
                                                            border: `1px solid ${colors.border}`,
                                                            borderRadius: '6px',
                                                            backgroundColor: colors.background,
                                                            animation: 'fadeIn 0.2s ease-out'
                                                        }}>
                                                            {(dataCache.Devices || [])
                                                                .filter(device => {
                                                                    const q = debouncedSearchQuery.toLowerCase();
                                                                    return (device.name || '').toLowerCase().includes(q) || (device.uniqueId || '').toLowerCase().includes(q);
                                                                })
                                                                .slice(0, 20)
                                                                .map(device => {
                                                                    const isChecked = reportParams.deviceIds?.includes(device.id);
                                                                    return (
                                                                        <div
                                                                            key={device.id}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const current = reportParams.deviceIds || [];
                                                                                const next = isChecked ? current.filter(id => id !== device.id) : [...current, device.id];
                                                                                setReportParams(prev => ({ ...prev, deviceIds: next }));
                                                                                cacheRef.current[entityType] = [];
                                                                                setDataCache(prev => ({ ...prev, [entityType]: [] }));
                                                                            }}
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                padding: '4px 8px',
                                                                                cursor: 'pointer',
                                                                                borderBottom: `1px solid ${colors.border}40`,
                                                                                backgroundColor: isChecked ? `${colors.primary}10` : 'transparent'
                                                                            }}
                                                                        >
                                                                            <Checkbox
                                                                                size="small"
                                                                                checked={isChecked}
                                                                                onChange={() => { }}
                                                                                style={{ padding: '2px' }}
                                                                            />
                                                                            <Typography variant="caption" style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                {device.name || device.uniqueId}
                                                                            </Typography>
                                                                        </div>
                                                                    );
                                                                })
                                                            }
                                                            {(dataCache.Devices || []).length === 0 && (
                                                                <Typography variant="caption" style={{ display: 'block', textAlign: 'center', padding: '10px', color: colors.textSecondary }}>No devices found</Typography>
                                                            )}
                                                        </div>
                                                    )}

                                                    {reportParams.deviceIds?.length > 0 && (
                                                        <Typography variant="caption" style={{ color: colors.primary, fontWeight: 600, fontSize: '9px' }}>
                                                            {reportParams.deviceIds.length} device(s) selected
                                                        </Typography>
                                                    )}

                                                    <Select
                                                        size="small"
                                                        fullWidth
                                                        value={reportParams.period || 'today'}
                                                        onChange={(e) => handlePeriodChange(e.target.value)}
                                                        sx={{ fontSize: '0.75rem', mt: 0 }}
                                                        displayEmpty
                                                        MenuProps={{ style: { zIndex: 999999 } }}
                                                    >
                                                        <MenuItem value="today">Today</MenuItem>
                                                        <MenuItem value="yesterday">Yesterday</MenuItem>
                                                        <MenuItem value="thisWeek">This Week</MenuItem>
                                                        <MenuItem value="previousWeek">Previous Week</MenuItem>
                                                        <MenuItem value="thisMonth">This Month</MenuItem>
                                                        <MenuItem value="previousMonth">Previous Month</MenuItem>
                                                        <MenuItem value="custom">Custom Range</MenuItem>
                                                    </Select>

                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <TextField
                                                            label="From"
                                                            type="datetime-local"
                                                            size="small"
                                                            fullWidth
                                                            value={dayjs(reportParams.from).format('YYYY-MM-DDTHH:mm')}
                                                            onChange={(e) => {
                                                                setReportParams({ ...reportParams, from: dayjs(e.target.value).toISOString(), period: 'custom' });
                                                                cacheRef.current[entityType] = [];
                                                                setDataCache(prev => ({ ...prev, [entityType]: [] }));
                                                            }}
                                                            InputLabelProps={{ shrink: true }}
                                                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem', py: '6px' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                                                        />
                                                        <TextField
                                                            label="To"
                                                            type="datetime-local"
                                                            size="small"
                                                            fullWidth
                                                            value={dayjs(reportParams.to).format('YYYY-MM-DDTHH:mm')}
                                                            onChange={(e) => {
                                                                setReportParams({ ...reportParams, to: dayjs(e.target.value).toISOString(), period: 'custom' });
                                                                cacheRef.current[entityType] = [];
                                                                setDataCache(prev => ({ ...prev, [entityType]: [] }));
                                                            }}
                                                            InputLabelProps={{ shrink: true }}
                                                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem', py: '6px' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                                                        />
                                                    </div>

                                                    {entityType === 'Summary' && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Checkbox
                                                                size="small"
                                                                checked={!!reportParams.daily}
                                                                onChange={(e) => setReportParams({ ...reportParams, daily: e.target.checked })}
                                                            />
                                                            <Typography variant="caption" style={{ fontSize: '0.75rem' }}>Daily Summary</Typography>
                                                        </div>
                                                    )}

                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                                                        onClick={() => fetchDataForType(entityType, true)}
                                                        disabled={loading || (['Combined', 'Events', 'Trips', 'Stops', 'Summary', 'Chart', 'Positions'].includes(entityType) && reportParams.deviceIds.length === 0)}
                                                        sx={{
                                                            mt: '2px',
                                                            backgroundColor: `${colors.primary} !important`,
                                                            color: '#ffffff !important',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            boxShadow: `0 4px 14px 0 ${colors.primary}40`,
                                                            '&:hover': {
                                                                backgroundColor: `${colors.primary} !important`,
                                                                opacity: 0.9,
                                                                boxShadow: `0 6px 20px 0 ${colors.primary}60`
                                                            },
                                                            '&.Mui-disabled': {
                                                                backgroundColor: `${colors.border} !important`,
                                                                color: `${colors.textSecondary} !important`,
                                                                opacity: 0.5
                                                            }
                                                        }}
                                                    >
                                                        {loading ? 'Fetching...' : 'Load Data'}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${colors.border}`, paddingTop: '10px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <Typography variant="caption" style={{ color: colors.textSecondary, fontWeight: 600, fontSize: '0.75rem' }}>
                                                    Fields & Order (Drag to sort)
                                                </Typography>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <Button size="small" onClick={() => {
                                                        const allKeys = fieldOrder.map((f) => f.key);
                                                        setSelectedFields(allKeys);
                                                        if (selectedWidget) updateWidgetConfig(selectedWidget, { selectedFields: allKeys });
                                                    }} style={{ fontSize: '0.65rem', textTransform: 'none', padding: '0 4px', minWidth: 'auto' }}>All</Button>
                                                    <Button size="small" onClick={() => {
                                                        setSelectedFields([]);
                                                        if (selectedWidget) updateWidgetConfig(selectedWidget, { selectedFields: [] });
                                                    }} style={{ fontSize: '0.65rem', textTransform: 'none', padding: '0 4px', minWidth: 'auto' }}>None</Button>
                                                </div>
                                            </div>

                                            <div style={{ flex: 1, overflow: 'auto', border: `1px solid ${colors.border}`, borderRadius: '6px', backgroundColor: `${colors.background}50` }}>
                                                <Reorder.Group
                                                    axis="y"
                                                    values={fieldOrder}
                                                    onReorder={(newOrder) => {
                                                        setFieldOrder(newOrder);
                                                        const orderedSelected = newOrder
                                                            .filter(f => selectedFields.includes(f.key))
                                                            .map(f => f.key);
                                                        setSelectedFields(orderedSelected);
                                                        if (selectedWidget) {
                                                            updateWidgetConfig(selectedWidget, { selectedFields: orderedSelected });
                                                        }
                                                    }}
                                                    style={{ listStyle: 'none', padding: 0, margin: 0 }}
                                                >
                                                    {fieldOrder.map((field) => {
                                                        const currentFields = (selectedWidget ? (canvasWidgets.find(w => w.id === selectedWidget)?.config?.selectedFields || selectedFields) : selectedFields);
                                                        const isChecked = currentFields.includes(field.key);

                                                        const toggleField = () => {
                                                            let next;
                                                            if (isChecked) {
                                                                next = currentFields.filter((f) => f !== field.key);
                                                            } else {
                                                                next = [...currentFields, field.key];
                                                            }
                                                            setSelectedFields(next);
                                                            if (selectedWidget) {
                                                                updateWidgetConfig(selectedWidget, { selectedFields: next });
                                                            }
                                                        };

                                                        return (
                                                            <Reorder.Item
                                                                key={field.key}
                                                                value={field}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', padding: '4px 8px',
                                                                    backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}`,
                                                                    cursor: 'grab'
                                                                }}
                                                            >
                                                                <div
                                                                    style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}
                                                                >
                                                                    <Checkbox
                                                                        size="small"
                                                                        checked={isChecked}
                                                                        onChange={(e) => { e.stopPropagation(); toggleField(); }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        style={{ padding: '2px' }}
                                                                    />
                                                                    <Typography
                                                                        variant="body2"
                                                                        onClick={(e) => { e.stopPropagation(); toggleField(); }}
                                                                        style={{
                                                                            cursor: 'pointer',
                                                                            color: isChecked ? colors.text : colors.textSecondary,
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: isChecked ? 600 : 400,
                                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                            flex: 1
                                                                        }}
                                                                    >
                                                                        {field.label}
                                                                    </Typography>
                                                                </div>
                                                                <DragIcon style={{ fontSize: '14px', color: colors.textSecondary, opacity: 0.5 }} />
                                                            </Reorder.Item>
                                                        );
                                                    })}
                                                </Reorder.Group>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Components Tab */}
                                {leftTab === 2 && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                                        <div style={{ padding: '10px 12px', flex: 1, overflow: 'auto' }}>
                                            {toolCategories.map((category) => (
                                                <div key={category.name} style={{ marginBottom: '16px' }}>
                                                    <Typography
                                                        variant="caption"
                                                        style={{
                                                            color: colors.textSecondary,
                                                            fontWeight: 600,
                                                            fontSize: '0.65rem',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                            display: 'block',
                                                            padding: '0 4px 6px',
                                                        }}
                                                    >
                                                        {category.name}
                                                    </Typography>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                                        {category.items.map((tool) => {
                                                            const ToolIcon = tool.icon;
                                                            return (
                                                                <Tooltip key={tool.type} title={tool.label} placement="top" arrow>
                                                                    <div
                                                                        onClick={() => addWidgetToCanvas(tool)}
                                                                        style={{
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            gap: '6px',
                                                                            padding: '10px 4px',
                                                                            borderRadius: '8px',
                                                                            cursor: 'pointer',
                                                                            border: `1px solid ${colors.border}`,
                                                                            backgroundColor: colors.surface,
                                                                            transition: 'all 0.15s',
                                                                            aspectRatio: '1 / 1',
                                                                            width: '100%',
                                                                            boxSizing: 'border-box',
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.backgroundColor = `${colors.primary}15`;
                                                                            e.currentTarget.style.borderColor = colors.primary;
                                                                            e.currentTarget.style.transform = 'scale(1.05)';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.backgroundColor = colors.surface;
                                                                            e.currentTarget.style.borderColor = colors.border;
                                                                            e.currentTarget.style.transform = 'scale(1)';
                                                                        }}
                                                                    >
                                                                        <ToolIcon style={{ fontSize: '24px', color: colors.textSecondary }} />
                                                                        <Typography variant="caption" style={{ color: colors.text, fontSize: '0.65rem', fontWeight: 500, lineHeight: 1.1, textAlign: 'center' }}>
                                                                            {tool.label}
                                                                        </Typography>
                                                                    </div>
                                                                </Tooltip>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>


                            {/* ═══ RIGHT COLUMN (flex) — Canvas / Preview ═══ */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: canvasTab === 0 && selectedWidget ? `1px solid ${colors.border}` : 'none' }}>
                                <div style={{
                                    borderBottom: `1px solid ${colors.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: colors.surface,
                                    padding: '0 12px',
                                }}>
                                    <Tabs
                                        value={canvasTab}
                                        onChange={(_, v) => setCanvasTab(v)}
                                        sx={{
                                            minHeight: '32px',
                                            '& .MuiTab-root': { minHeight: '32px', py: 0.5, fontSize: '0.7rem', textTransform: 'none' },
                                            '& .MuiTabs-indicator': { height: '2px' },
                                        }}
                                    >
                                        <Tab label="Canvas" />
                                        <Tab label="Preview" />
                                    </Tabs>
                                    <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '0.65rem' }}>
                                        {canvasWidgets.length} component{canvasWidgets.length !== 1 ? 's' : ''} · {entityType}
                                    </Typography>
                                </div>

                                {/* Tab content */}
                                {canvasTab === 0 ? (
                                    /* ── Canvas (editable grid) ── */
                                    <div
                                        ref={canvasRef}
                                        className="report-canvas"
                                        onClick={() => setSelectedWidget(null)}
                                        style={{
                                            flex: 1,
                                            overflow: 'auto',
                                            padding: '16px',
                                            backgroundImage: showGrid
                                                ? `linear-gradient(${colors.border}40 1px, transparent 1px), linear-gradient(90deg, ${colors.border}40 1px, transparent 1px)`
                                                : 'none',
                                            backgroundSize: showGrid ? '30px 30px' : 'auto',
                                        }}
                                    >
                                        {canvasWidgets.length === 0 ? (
                                            <div style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                justifyContent: 'center', height: '100%', gap: '12px', opacity: 0.4,
                                            }}>
                                                <DragIcon style={{ fontSize: '48px', color: colors.textSecondary }} />
                                                <Typography variant="body1" style={{ color: colors.textSecondary, fontWeight: 500 }}>
                                                    Click components to add them to the canvas
                                                </Typography>
                                                <Typography variant="caption" style={{ color: colors.textSecondary }}>
                                                    Drag to reorder · Resize from corners · Click to select
                                                </Typography>
                                            </div>
                                        ) : (
                                            <ResponsiveGridLayout
                                                className="report-canvas-grid"
                                                layouts={canvasLayouts}
                                                breakpoints={{ lg: 0 }}
                                                cols={{ lg: 12 }}
                                                rowHeight={40}
                                                width={canvasWidth}
                                                onLayoutChange={handleLayoutChange}
                                                isDraggable
                                                isResizable
                                                draggableHandle=".drag-handle"
                                                compactType="vertical"
                                                margin={[8, 8]}
                                            >
                                                {canvasWidgets.map((widget) => (
                                                    <div key={widget.id} style={{ zIndex: selectedWidget === widget.id ? 9999 : 1 }}>
                                                        <CanvasWidget
                                                            widget={widget}
                                                            colors={colors}
                                                            onRemove={removeWidget}
                                                            onDuplicate={duplicateWidget}
                                                            onSelect={setSelectedWidget}
                                                            isSelected={selectedWidget === widget.id}
                                                            dataCache={dataCache}
                                                            globalEntityType={entityType}
                                                            selectedFields={selectedFields}
                                                            onUpdateConfig={updateWidgetConfig}
                                                            onFetchEntity={fetchDataForType}
                                                            branding={branding}
                                                            templateName={selectedTemplate?.name}
                                                            reportParams={reportParams}
                                                            onReportParamsChange={setReportParams}
                                                        />
                                                    </div>
                                                ))}
                                            </ResponsiveGridLayout>
                                        )}
                                    </div>
                                ) : (
                                    /* ── Preview (clean read-only, A4) ── */
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', backgroundColor: '#e8e8e8' }}>
                                        {loading && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 0, left: 0, right: 0, bottom: 0,
                                                backgroundColor: `${colors.background}80`,
                                                backdropFilter: 'blur(3px)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 2000,
                                            }}>
                                                <CircularProgress size={44} thickness={4} />
                                            </div>
                                        )}
                                        {previewPageData.pages.length > 1 && (
                                            <div style={{
                                                position: 'absolute', top: '2px', left: '50%', transform: 'translateX(-50%)',
                                                zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px',
                                            }}>
                                                <div
                                                    onClick={() => setPreviewPageIdx(p => Math.max(0, p - 1))}
                                                    style={{
                                                        width: '40px', height: '40px', borderRadius: '50%',
                                                        backgroundColor: colors.surface, color: previewPageIdx === 0 ? '#ccc' : colors.textSecondary,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: previewPageIdx === 0 ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                        opacity: previewPageIdx === 0 ? 0.6 : 1,
                                                    }}
                                                    title="Previous Page"
                                                >
                                                    <ChevronLeftIcon style={{ fontSize: '22px' }} />
                                                </div>

                                                <div style={{
                                                    height: '40px', padding: '0 16px', borderRadius: '20px',
                                                    backgroundColor: colors.surface, color: colors.text,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                    fontSize: '14px', fontWeight: 600, minWidth: '80px',
                                                }}>
                                                    Page {previewPageIdx + 1} / {previewPageData.pages.length}
                                                </div>

                                                <div
                                                    onClick={() => setPreviewPageIdx(p => Math.min(previewPageData.pages.length - 1, p + 1))}
                                                    style={{
                                                        width: '40px', height: '40px', borderRadius: '50%',
                                                        backgroundColor: colors.surface, color: previewPageIdx >= previewPageData.pages.length - 1 ? '#ccc' : colors.textSecondary,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: previewPageIdx >= previewPageData.pages.length - 1 ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                        opacity: previewPageIdx >= previewPageData.pages.length - 1 ? 0.6 : 1,
                                                    }}
                                                    title="Next Page"
                                                >
                                                    <ChevronRightIcon style={{ fontSize: '22px' }} />
                                                </div>
                                            </div>
                                        )}
                                        <div
                                            ref={previewRef}
                                            style={{
                                            flex: 1, overflow: 'auto', padding: '8px 24px 300px',
                                            display: 'flex', justifyContent: 'center',
                                            position: 'relative',
                                        }}>

                                        {/* Floating Actions */}
                                        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999, display: 'flex', gap: '8px' }}>
                                            <div
                                                onClick={() => setPreviewZoom(z => Math.max(0.4, z - 0.2))}
                                                style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    backgroundColor: colors.surface, color: colors.textSecondary,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                }}
                                                title="Zoom Out"
                                            >
                                                <ZoomOutIcon style={{ fontSize: '22px' }} />
                                            </div>
                                            <div
                                                onClick={() => setPreviewZoom(z => Math.min(2, z + 0.2))}
                                                style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    backgroundColor: colors.surface, color: colors.textSecondary,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                }}
                                                title="Zoom In"
                                            >
                                                <ZoomInIcon style={{ fontSize: '22px' }} />
                                            </div>
                                            <div
                                                onClick={() => {
                                                    const newOri = pageOrientation === 'portrait' ? 'landscape' : 'portrait';
                                                    setPageOrientation(newOri);
                                                    if (selectedTemplate) {
                                                        updateTemplate(user.id, selectedTemplate.id, { ...selectedTemplate, pageOrientation: newOri })
                                                            .then((updated) => {
                                                                setTemplates(templates.map(t => t.id === updated.id ? updated : t));
                                                                setSelectedTemplate(updated);
                                                                showSnack(`Orientation saved: ${newOri}`, 'success');
                                                            })
                                                            .catch(() => showSnack('Failed to auto-save orientation', 'error'));
                                                    } else {
                                                        showSnack(`Orientation set to ${newOri}. Save template to persist.`, 'info');
                                                    }
                                                }}
                                                style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    backgroundColor: colors.surface, color: colors.textSecondary,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                }}
                                                title={`Switch to ${pageOrientation === 'portrait' ? 'Landscape' : 'Portrait'}`}
                                            >
                                                {pageOrientation === 'portrait' ? <LandscapeIcon style={{ fontSize: '22px' }} /> : <PortraitIcon style={{ fontSize: '22px' }} />}
                                            </div>
                                            <div
                                                onClick={() => {
                                                    if (!document.fullscreenElement) {
                                                        previewRef.current?.requestFullscreen?.();
                                                    } else {
                                                        document.exitFullscreen?.();
                                                    }
                                                }}
                                                style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    backgroundColor: colors.primary || '#1976d2', color: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                                }}
                                                title={isPreviewFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                            >
                                                {isPreviewFullscreen ? <FullscreenExitIcon style={{ fontSize: '22px' }} /> : <FullscreenIcon style={{ fontSize: '22px' }} />}
                                            </div>
                                        </div>
                                        {canvasWidgets.length === 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                                                <Typography variant="body1" style={{ color: '#999' }}>No components to preview</Typography>
                                            </div>
                                        ) : (
                                            <div style={{
                                                transform: `scale(${previewZoom})`,
                                                transformOrigin: 'top center',
                                                transition: 'transform 0.2s',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                minWidth: 'fit-content',
                                                marginBottom: `${Math.max(0, (previewZoom - 1) * (pageOrientation === 'portrait' ? 297 : 210))}mm`,
                                            }}>
                                                {(() => {
                                                    const { pages, headerLayouts, footerLayouts } = previewPageData;
                                                    const currentPageLayouts = pages[previewPageIdx] || [];

                                                    const renderLayoutItem = (layoutItem, pageIdx, totalPages) => {
                                                        const widget = canvasWidgets.find((w) => w.id === layoutItem.i);
                                                        if (!widget) return null;
                                                        const isTable = widget.type === 'table';
                                                        const minH = isTable ? `${layoutItem.h * 40}px` : undefined;
                                                        const noBorderTypes = ['header', 'footer', 'table', 'divider', 'kpi', 'barChart', 'lineChart', 'pieChart', 'areaChart', 'doughnutChart', 'scatterPlot', 'map'];
                                                        const wNoBorder = noBorderTypes.includes(widget.type);
                                                        return (
                                                            <div
                                                                key={widget.id}
                                                                style={{
                                                                    gridColumn: `${layoutItem.x + 1} / span ${layoutItem.w}`,
                                                                    gridRow: `span ${layoutItem.h}`,
                                                                    height: '100%',
                                                                    minHeight: minH,
                                                                    padding: '4px',
                                                                    boxSizing: 'border-box',
                                                                    pageBreakInside: 'avoid',
                                                                    breakInside: 'avoid',
                                                                }}
                                                            >
                                                                <div style={{
                                                                    height: '100%',
                                                                    border: wNoBorder ? 'none' : '1px solid #e0e0e0',
                                                                    borderRadius: wNoBorder ? 0 : '4px',
                                                                    overflow: 'hidden',
                                                                    backgroundColor: widget.type === 'kpi' ? 'transparent' : (widget.config?.bgColor || '#fff'),
                                                                }}>
                                                                    <CanvasWidget
                                                                        widget={widget}
                                                                        colors={{ ...colors, surface: '#fff', background: '#fafafa', border: '#e0e0e0', text: '#333', textSecondary: '#777' }}
                                                                        isSelected={false}
                                                                        dataCache={dataCache}
                                                                        globalEntityType={entityType}
                                                                        selectedFields={selectedFields}
                                                                        onUpdateConfig={() => { }}
                                                                        onFetchEntity={fetchDataForType}
                                                                        previewMode={true}
                                                                        branding={branding}
                                                                        templateName={selectedTemplate?.name}
                                                                        pageNumber={pageIdx}
                                                                        totalPages={totalPages}
                                                                        tableOffset={layoutItem.tableOffset || 0}
                                                                        tableLimit={layoutItem.tableLimit || 99999}
                                                                        reportParams={reportParams}
                                                                        onReportParamsChange={setReportParams}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    };

                                                    return (
                                                        <div style={{
                                                            width: pageOrientation === 'portrait' ? '210mm' : '297mm',
                                                            height: pageOrientation === 'portrait' ? '297mm' : '210mm',
                                                            backgroundColor: '#fff',
                                                            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                                                            padding: '15mm 12mm',
                                                            boxSizing: 'border-box',
                                                            marginBottom: '24px',
                                                            display: 'flex', flexDirection: 'column',
                                                            flexShrink: 0,
                                                            position: 'relative',
                                                            marginTop: previewPageData.pages.length > 1 ? '15px' : '0px'
                                                        }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px', gridAutoRows: '40px' }}>
                                                                {headerLayouts.map(l => renderLayoutItem(l, previewPageIdx + 1, pages.length))}
                                                            </div>
                                                            <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px', gridAutoRows: '40px', alignContent: 'start' }}>
                                                                {currentPageLayouts.map(l => renderLayoutItem(l, previewPageIdx + 1, pages.length))}
                                                            </div>
                                                            <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px', gridAutoRows: '40px' }}>
                                                                {footerLayouts.map(l => renderLayoutItem(l, previewPageIdx + 1, pages.length))}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            </div>

                            {/* Right Sidebar: Properties (Visible only in Canvas mode when a widget is selected) */}
                            {canvasTab === 0 && selectedWidget && (
                                <div style={{ 
                                    width: '300px', backgroundColor: colors.background, display: 'flex', flexDirection: 'column',
                                    overflow: 'hidden', borderLeft: `1px solid ${colors.border}`, animation: 'slideInRight 0.2s ease-out'
                                }}>
                                    {(() => {
                                        const widget = canvasWidgets.find(w => w.id === selectedWidget);
                                        if (!widget) return null;
                                        
                                        const wEntityType = widget.config?.entityType || entityType;
                                        const wFields = entityFieldDefinitions[wEntityType] || [];
                                        const activeKeys = widget.type === 'table' ? (selectedFields.length > 0 ? selectedFields : wFields.slice(0, 4).map(f => f.key)) : [];

                                        return (
                                            <>
                                                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <SettingsIcon style={{ fontSize: '1.1rem', color: colors.primary }} />
                                                        <Typography variant="subtitle2" style={{ fontWeight: 600 }}>Properties</Typography>
                                                    </div>
                                                    <IconButton size="small" onClick={() => setSelectedWidget(null)}>
                                                        <CloseIcon style={{ fontSize: '1.2rem' }} />
                                                    </IconButton>
                                                </div>

                                                <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                    {/* General Settings */}
                                                    <section>
                                                        <Typography variant="caption" style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, fontSize: '0.65rem', marginBottom: '8px', display: 'block' }}>
                                                            General Settings
                                                        </Typography>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            <DebouncedTextField
                                                                label="Component Title"
                                                                size="small"
                                                                fullWidth
                                                                value={widget.label}
                                                                onChange={(e) => {
                                                                    setCanvasWidgets(canvasWidgets.map(w => w.id === widget.id ? { ...w, label: e.target.value } : w));
                                                                }}
                                                                sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                            />
                                                            <div>
                                                                <Typography variant="caption" style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>Background Color</Typography>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                    {BG_PRESETS.map((c) => (
                                                                        <div
                                                                            key={c || 'none'}
                                                                            onClick={() => updateWidgetConfig(widget.id, { bgColor: c })}
                                                                            style={{
                                                                                width: '26px', height: '26px', borderRadius: '4px', cursor: 'pointer',
                                                                                backgroundColor: c || colors.surface,
                                                                                border: `2px solid ${widget.config?.bgColor === c ? colors.primary : colors.border}`,
                                                                                boxShadow: widget.config?.bgColor === c ? `0 0 0 1px ${colors.primary}40` : 'none',
                                                                                transition: 'transform 0.1s'
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </section>

                                                    {/* Layout Settings */}
                                                    <section>
                                                        <Typography variant="caption" style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, fontSize: '0.65rem', marginBottom: '12px', display: 'block' }}>
                                                            Layout Settings
                                                        </Typography>
                                                        <div style={{ display: 'flex', gap: '12px' }}>
                                                            <DebouncedTextField
                                                                label="Width (Units)"
                                                                type="number"
                                                                size="small"
                                                                fullWidth
                                                                value={canvasLayouts.lg.find(l => l.i === widget.id)?.w || 3}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value, 10);
                                                                    if (!isNaN(val) && val >= 1 && val <= 12) {
                                                                        const nextLayouts = { ...canvasLayouts, lg: canvasLayouts.lg.map(l => l.i === widget.id ? { ...l, w: val } : l) };
                                                                        setCanvasLayouts(nextLayouts);
                                                                    }
                                                                }}
                                                                inputProps={{ min: 1, max: 12 }}
                                                                sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                            />
                                                            <DebouncedTextField
                                                                label="Height (Units)"
                                                                type="number"
                                                                size="small"
                                                                fullWidth
                                                                value={canvasLayouts.lg.find(l => l.i === widget.id)?.h || 4}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value, 10);
                                                                    if (!isNaN(val) && val >= 1) {
                                                                        const nextLayouts = { ...canvasLayouts, lg: canvasLayouts.lg.map(l => l.i === widget.id ? { ...l, h: val } : l) };
                                                                        setCanvasLayouts(nextLayouts);
                                                                    }
                                                                }}
                                                                inputProps={{ min: 1 }}
                                                                sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                            />
                                                        </div>
                                                    </section>

                                                    {/* Data Source */}
                                                    {['table', 'barChart', 'lineChart', 'pieChart', 'areaChart', 'doughnutChart', 'scatterPlot', 'kpi', 'map'].includes(widget.type) && (
                                                        <section>
                                                            <Typography variant="caption" style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, fontSize: '0.65rem', marginBottom: '12px', display: 'block' }}>
                                                                Data Source
                                                            </Typography>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                <Autocomplete
                                                                    size="small"
                                                                    options={entityTypeOptions}
                                                                    value={wEntityType}
                                                                    onChange={(_, v) => { if (v) { updateWidgetConfig(widget.id, { entityType: v, field: '' }); fetchDataForType(v); } }}
                                                                    renderInput={(params) => <TextField {...params} label="Target Entity" />}
                                                                    sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                    slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                />
                                                                
                                                                {['barChart', 'lineChart', 'pieChart', 'areaChart', 'doughnutChart', 'scatterPlot', 'kpi'].includes(widget.type) && (
                                                                    <Autocomplete
                                                                        size="small"
                                                                        options={wFields}
                                                                        getOptionLabel={(o) => o?.label || String(o)}
                                                                        value={wFields.find(f => f.key === widget.config?.field) || null}
                                                                        onChange={(_, v) => updateWidgetConfig(widget.id, { field: v?.key || '' })}
                                                                        renderInput={(params) => <TextField {...params} label="Data Field" />}
                                                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                        slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </section>
                                                    )}

                                                    {/* Widget Specific Settings */}
                                                    {(widget.type === 'kpi' || widget.type === 'table') && (
                                                        <section>
                                                            <Typography variant="caption" style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, fontSize: '0.65rem', marginBottom: '12px', display: 'block' }}>
                                                                {widget.type.toUpperCase()} Settings
                                                            </Typography>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                {widget.type === 'kpi' && (
                                                                    <>
                                                                        <DebouncedTextField
                                                                            label="KPI Subtitle"
                                                                            size="small"
                                                                            fullWidth
                                                                            value={widget.config?.customSubtitle !== undefined ? widget.config.customSubtitle : (wFields.find(f => f.key === widget.config?.field)?.label || '')}
                                                                            onChange={(e) => updateWidgetConfig(widget.id, { customSubtitle: e.target.value })}
                                                                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                        />

                                                                        {['Combined', 'Positions'].includes(wEntityType) && (
                                                                            <Button 
                                                                                variant="outlined" 
                                                                                size="small" 
                                                                                onClick={() => {
                                                                                    setCustomFieldEditing({ 
                                                                                        label: widget.config?.customFieldName || '', 
                                                                                        function: widget.config?.customFieldFunc || '' 
                                                                                    });
                                                                                    setShowCustomFieldModal(true);
                                                                                }}
                                                                                sx={{ fontSize: '0.65rem', py: 0.5 }}
                                                                            >
                                                                                Custom Calculation
                                                                            </Button>
                                                                        )}

                                                                        <Autocomplete
                                                                            size="small"
                                                                            options={[
                                                                                { value: 'count', label: 'Count Rows' },
                                                                                { value: 'distinct', label: 'Unique Values' },
                                                                                { value: 'sum', label: 'Sum' },
                                                                                { value: 'avg', label: 'Average' },
                                                                                { value: 'max', label: 'Maximum' },
                                                                                { value: 'min', label: 'Minimum' },
                                                                            ]}
                                                                            getOptionLabel={(o) => o.label}
                                                                            value={[
                                                                                { value: 'count', label: 'Count Rows' },
                                                                                { value: 'distinct', label: 'Unique Values' },
                                                                                { value: 'sum', label: 'Sum' },
                                                                                { value: 'avg', label: 'Average' },
                                                                                { value: 'max', label: 'Maximum' },
                                                                                { value: 'min', label: 'Minimum' },
                                                                            ].find(o => o.value === (widget.config?.kpiMode || 'count'))}
                                                                            onChange={(_, v) => updateWidgetConfig(widget.id, { kpiMode: v?.value || 'count' })}
                                                                            renderInput={(params) => <TextField {...params} label="Calculation" />}
                                                                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                            slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                        />
                                                                        
                                                                        <Typography variant="caption" style={{ color: colors.textSecondary, display: 'block', marginTop: '12px', marginBottom: '4px', fontWeight: 600 }}>Visuals & Styling</Typography>
                                                                        
                                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                            <Autocomplete size="small" sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                                options={['vertical', 'horizontal']}
                                                                                value={widget.config?.kpiLayout || 'vertical'}
                                                                                onChange={(_, v) => updateWidgetConfig(widget.id, { kpiLayout: v || 'vertical' })}
                                                                                renderInput={(params) => <TextField {...params} label="Layout" />}
                                                                                slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                            />
                                                                            <Autocomplete size="small" sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                                options={['left', 'center', 'right']}
                                                                                value={widget.config?.kpiAlign || 'center'}
                                                                                onChange={(_, v) => updateWidgetConfig(widget.id, { kpiAlign: v || 'center' })}
                                                                                renderInput={(params) => <TextField {...params} label="Align" />}
                                                                                slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                            />
                                                                        </div>

                                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                            <Autocomplete size="small" sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                                options={['none', 'numbers', 'speed', 'battery', 'vehicle', 'truck', 'bus', 'location', 'globe', 'time', 'date', 'security', 'lock', 'unlock', 'warning', 'alert', 'trend', 'portrait', 'map', 'filter', 'cart', 'gas', 'volt', 'ticket']}
                                                                                value={widget.config?.kpiIcon || 'none'}
                                                                                onChange={(_, v) => updateWidgetConfig(widget.id, { kpiIcon: v || 'none' })}
                                                                                renderInput={(params) => <TextField {...params} label="Icon" />}
                                                                                slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                            />
                                                                            <Autocomplete size="small" sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                                options={['16px', '24px', '32px', '48px', '64px']}
                                                                                value={widget.config?.kpiIconSize || '24px'}
                                                                                onChange={(_, v) => updateWidgetConfig(widget.id, { kpiIconSize: v || '24px' })}
                                                                                renderInput={(params) => <TextField {...params} label="Icon Size" />}
                                                                                slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                            />
                                                                        </div>

                                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                            <Autocomplete size="small" sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                                options={['1rem', '1.5rem', '1.625rem', '2rem', '2.5rem', '3rem', '4rem']}
                                                                                value={widget.config?.kpiTextSize || '1.625rem'}
                                                                                onChange={(_, v) => updateWidgetConfig(widget.id, { kpiTextSize: v || '1.625rem' })}
                                                                                renderInput={(params) => <TextField {...params} label="Text Size" />}
                                                                                slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                            />
                                                                            <Autocomplete size="small" sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                                options={['none', 'light', 'normal', 'glow']}
                                                                                value={widget.config?.kpiShadow || 'none'}
                                                                                onChange={(_, v) => updateWidgetConfig(widget.id, { kpiShadow: v || 'none' })}
                                                                                renderInput={(params) => <TextField {...params} label="Shadow" />}
                                                                                slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                            />
                                                                        </div>

                                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                            <Autocomplete size="small" sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                                options={['0px', '1px', '2px', '4px', '8px']}
                                                                                value={widget.config?.kpiBorderSize || '0px'}
                                                                                onChange={(_, v) => updateWidgetConfig(widget.id, { kpiBorderSize: v || '0px' })}
                                                                                renderInput={(params) => <TextField {...params} label="Border Size" />}
                                                                                slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                            />
                                                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', border: `1px solid ${colors.border}`, borderRadius: '4px' }}>
                                                                                <Checkbox 
                                                                                    size="small" 
                                                                                    checked={!!widget.config?.kpiGlass} 
                                                                                    onChange={(e) => updateWidgetConfig(widget.id, { kpiGlass: e.target.checked })} 
                                                                                />
                                                                                <Typography variant="caption">Glass Effect</Typography>
                                                                            </div>
                                                                        </div>

                                                                        <div>
                                                                            <Typography variant="caption" style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>Text Color</Typography>
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                                {KPI_COLORS.filter(c=>c).map((c) => (
                                                                                    <div key={c} onClick={() => updateWidgetConfig(widget.id, { kpiTextColor: c })}
                                                                                        style={{ width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', backgroundColor: c, border: `2px solid ${widget.config?.kpiTextColor === c ? colors.primary : 'transparent'}` }}
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        <div>
                                                                            <Typography variant="caption" style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', marginTop: '8px' }}>Secondary BG (Gradient)</Typography>
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                                <div onClick={() => updateWidgetConfig(widget.id, { kpiBgColor2: undefined })}
                                                                                    style={{ width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent', border: `2px solid ${!widget.config?.kpiBgColor2 ? colors.primary : colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                                >
                                                                                    <CloseIcon style={{ fontSize: '10px' }} />
                                                                                </div>
                                                                                {KPI_COLORS.filter(c=>c).map((c) => (
                                                                                    <div key={c} onClick={() => updateWidgetConfig(widget.id, { kpiBgColor2: c })}
                                                                                        style={{ width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', backgroundColor: c, border: `2px solid ${widget.config?.kpiBgColor2 === c ? colors.primary : 'transparent'}` }}
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        <div>
                                                                            <Typography variant="caption" style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', marginTop: '8px' }}>Icon Color</Typography>
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                                {KPI_COLORS.filter(c=>c).map((c) => (
                                                                                    <div key={c} onClick={() => updateWidgetConfig(widget.id, { kpiIconColor: c })}
                                                                                        style={{ width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', backgroundColor: c, border: `2px solid ${widget.config?.kpiIconColor === c ? colors.primary : 'transparent'}` }}
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        <div>
                                                                            <Typography variant="caption" style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', marginTop: '8px' }}>Border Color</Typography>
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                                {KPI_COLORS.filter(c=>c).map((c) => (
                                                                                    <div key={c} onClick={() => updateWidgetConfig(widget.id, { kpiBorderColor: c })}
                                                                                        style={{ width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', backgroundColor: c, border: `2px solid ${widget.config?.kpiBorderColor === c ? colors.primary : 'transparent'}` }}
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}

                                                                {widget.type === 'table' && (
                                                                    <>
                                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                            <Autocomplete
                                                                                size="small"
                                                                                sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                                options={activeKeys.map(k => wFields.find(f => f.key === k)).filter(Boolean)}
                                                                                getOptionLabel={(o) => o.label}
                                                                                value={wFields.find(f => f.key === widget.config?.sortField) || null}
                                                                                onChange={(_, v) => updateWidgetConfig(widget.id, { sortField: v?.key || undefined })}
                                                                                renderInput={(params) => <TextField {...params} label="Sort Field" />}
                                                                                slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                            />
                                                                            <IconButton 
                                                                                size="small" 
                                                                                onClick={() => updateWidgetConfig(widget.id, { sortDir: widget.config?.sortDir === 'desc' ? 'asc' : 'desc' })}
                                                                                style={{ border: `1px solid ${colors.border}`, borderRadius: '4px', backgroundColor: colors.surface }}
                                                                            >
                                                                                {widget.config?.sortDir === 'desc' ? <SortDescendingIcon /> : <SortAscendingIcon />}
                                                                            </IconButton>
                                                                        </div>
                                                                        <div style={{ marginTop: '8px' }}>
                                                                            <Typography variant="caption" style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>Rename Columns</Typography>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                                {activeKeys.map(key => {
                                                                                    const f = wFields.find(f => f.key === key);
                                                                                    if (!f) return null;
                                                                                    return (
                                                                                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                            <Typography variant="caption" style={{ width: '80px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</Typography>
                                                                                            <DebouncedTextField
                                                                                                size="small"
                                                                                                placeholder="Alias..."
                                                                                                fullWidth
                                                                                                value={widget.config?.fieldLabels?.[key] || f.label}
                                                                                                onChange={(e) => {
                                                                                                    const fieldLabels = { ...(widget.config?.fieldLabels || {}), [key]: e.target.value };
                                                                                                    updateWidgetConfig(widget.id, { fieldLabels });
                                                                                                }}
                                                                                                sx={{ 
                                                                                                    '& .MuiInputBase-root': { height: '28px', fontSize: '0.7rem' },
                                                                                                    '& .MuiInputBase-input': { py: 0 }
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </section>
                                                    )}

                                                                {widget.type === 'map' && (
                                                                    <>
                                                                        {/* 1. Global Master Switch (Highest Priority) */}
                                                                        <section style={{ marginBottom: '4px' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', border: `1px solid ${colors.primary}40`, borderRadius: '6px', backgroundColor: `${colors.primary}10` }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', height: '32px' }}>
                                                                                    <Checkbox 
                                                                                        size="small" 
                                                                                        color="primary"
                                                                                        checked={widget.config?.showMarkers !== false} 
                                                                                        onChange={(e) => updateWidgetConfig(widget.id, { showMarkers: e.target.checked })} 
                                                                                    />
                                                                                    <Typography variant="caption" style={{ fontWeight: 600, fontSize: '0.85rem', color: colors.text }}>Show map markers</Typography>
                                                                                </div>
                                                                            </div>
                                                                        </section>

                                                                        {/* 2. Granular Visibility Details */}
                                                                        <section style={{ marginBottom: '12px' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: '6px', backgroundColor: colors.surface }}>
                                                                                <Typography variant="caption" style={{ fontWeight: 600, marginBottom: '6px', display: 'block', color: colors.textSecondary }}>Visibility Details</Typography>
                                                                                <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                                                                                    <Checkbox 
                                                                                        size="small" 
                                                                                        checked={widget.config?.showStartMarkers !== false} 
                                                                                        onChange={(e) => updateWidgetConfig(widget.id, { showStartMarkers: e.target.checked })} 
                                                                                        sx={{ p: 0.5 }}
                                                                                    />
                                                                                    <Typography variant="caption" style={{ fontSize: '0.7rem' }}>Start Point (S)</Typography>
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                                                                                    <Checkbox 
                                                                                        size="small" 
                                                                                        checked={widget.config?.showEndMarkers !== false} 
                                                                                        onChange={(e) => updateWidgetConfig(widget.id, { showEndMarkers: e.target.checked })} 
                                                                                        sx={{ p: 0.5 }}
                                                                                    />
                                                                                    <Typography variant="caption" style={{ fontSize: '0.7rem' }}>End Point (E)</Typography>
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                                                                                    <Checkbox 
                                                                                        size="small" 
                                                                                        checked={widget.config?.showOnMarkers !== false} 
                                                                                        onChange={(e) => updateWidgetConfig(widget.id, { showOnMarkers: e.target.checked })} 
                                                                                        sx={{ p: 0.5 }}
                                                                                    />
                                                                                    <Typography variant="caption" style={{ fontSize: '0.7rem' }}>Ignition ON (⚡)</Typography>
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                                                                                    <Checkbox 
                                                                                        size="small" 
                                                                                        checked={widget.config?.showOffMarkers !== false} 
                                                                                        onChange={(e) => updateWidgetConfig(widget.id, { showOffMarkers: e.target.checked })} 
                                                                                        sx={{ p: 0.5 }}
                                                                                    />
                                                                                    <Typography variant="caption" style={{ fontSize: '0.7rem' }}>Ignition OFF (○)</Typography>
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                                                                                    <Checkbox 
                                                                                        size="small" 
                                                                                        checked={widget.config?.showAlarmMarkers !== false} 
                                                                                        onChange={(e) => updateWidgetConfig(widget.id, { showAlarmMarkers: e.target.checked })} 
                                                                                        sx={{ p: 0.5 }}
                                                                                    />
                                                                                    <Typography variant="caption" style={{ fontSize: '0.7rem' }}>Alarms (!)</Typography>
                                                                                </div>
                                                                            </div>
                                                                        </section>

                                                                        <Typography variant="caption" style={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>
                                                                            Map & Visualization
                                                                        </Typography>

                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                            {(widget.config?.entityType || entityType) === 'Combined' && (
                                                                                <>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 8px', border: `1px solid ${colors.border}`, borderRadius: '6px', backgroundColor: colors.surface }}>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                                                                                            <Checkbox 
                                                                                                size="small" 
                                                                                                checked={!!widget.config?.filterAutoStop} 
                                                                                                onChange={(e) => updateWidgetConfig(widget.id, { filterAutoStop: e.target.checked })} 
                                                                                            />
                                                                                            <Typography variant="caption" style={{ flex: 1, fontWeight: 500 }}>Filter Auto Start/Stop</Typography>
                                                                                        </div>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0 4px 32px' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                                <TextField size="small" type="number" value={widget.config?.autoStopMinutes !== undefined ? widget.config.autoStopMinutes : 5}
                                                                                                    onChange={(e) => updateWidgetConfig(widget.id, { autoStopMinutes: Number(e.target.value) })}
                                                                                                    sx={{ width: '45px', '& .MuiInputBase-root': { height: '24px', fontSize: '0.7rem' }, '& input': { textAlign: 'center', p: 0 } }}
                                                                                                />
                                                                                                <Typography variant="caption" style={{ opacity: 0.7, fontSize: '0.65rem' }}>min</Typography>
                                                                                            </div>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                                <TextField size="small" type="number" value={widget.config?.autoStopMaxDistance !== undefined ? widget.config.autoStopMaxDistance : 50}
                                                                                                    onChange={(e) => updateWidgetConfig(widget.id, { autoStopMaxDistance: Number(e.target.value) })}
                                                                                                    sx={{ width: '45px', '& .MuiInputBase-root': { height: '24px', fontSize: '0.7rem' }, '& input': { textAlign: 'center', p: 0 } }}
                                                                                                />
                                                                                                <Typography variant="caption" style={{ opacity: 0.7, fontSize: '0.65rem' }}>m</Typography>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 8px', border: `1px solid ${colors.border}`, borderRadius: '6px', backgroundColor: colors.surface }}>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                                                                                            <Checkbox size="small" checked={!!widget.config?.showParkedMarkers} 
                                                                                                onChange={(e) => updateWidgetConfig(widget.id, { showParkedMarkers: e.target.checked })} 
                                                                                            />
                                                                                            <Typography variant="caption" style={{ flex: 1, fontWeight: 500 }}>Show Parked Markers</Typography>
                                                                                        </div>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0 4px 32px' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                                <TextField size="small" type="number" value={widget.config?.parkedMinutes !== undefined ? widget.config.parkedMinutes : 15}
                                                                                                    onChange={(e) => updateWidgetConfig(widget.id, { parkedMinutes: Number(e.target.value) })}
                                                                                                    sx={{ width: '45px', '& .MuiInputBase-root': { height: '24px', fontSize: '0.7rem' }, '& input': { textAlign: 'center', p: 0 } }}
                                                                                                />
                                                                                                <Typography variant="caption" style={{ opacity: 0.7, fontSize: '0.65rem' }}>min</Typography>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                </>
                                                                            )}
                                                                            
                                                                            <div>
                                                                                <Typography variant="caption" style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>Line Width: {widget.config?.lineWidth || 3}px</Typography>
                                                                                <TextField type="range" inputProps={{ min: 1, max: 20, step: 1 }} size="small" fullWidth
                                                                                    value={widget.config?.lineWidth !== undefined ? widget.config.lineWidth : 3}
                                                                                    onChange={(e) => updateWidgetConfig(widget.id, { lineWidth: Number(e.target.value) })}
                                                                                    sx={{ '& .MuiInputBase-root': { height: '32px' }, input: { padding: '0 4px', cursor: 'pointer' } }}
                                                                                />
                                                                            </div>

                                                                            {(widget.config?.entityType || entityType) === 'Combined' && (
                                                                                <div>
                                                                                    <Typography variant="caption" style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>Speed Limit ({speedUnitString(unitsContext.speedUnit, t)})</Typography>
                                                                                    <DebouncedTextField type="number" size="small" fullWidth placeholder="Ex: 80..."
                                                                                        value={widget.config?.speedThreshold || ''}
                                                                                        onChange={(e) => updateWidgetConfig(widget.id, { speedThreshold: e.target.value ? Number(e.target.value) : undefined })}
                                                                                        sx={{ 
                                                                                            '& .MuiInputBase-root': { height: '32px', fontSize: '0.75rem' },
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                )}

                                                    {/* Advanced Filtering */}
                                                    {['table', 'barChart', 'lineChart', 'pieChart', 'areaChart', 'doughnutChart', 'scatterPlot', 'kpi', 'map'].includes(widget.type) && (
                                                        <section>
                                                            <Typography variant="caption" style={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.7rem', marginBottom: '8px', display: 'block' }}>
                                                                Advanced Filtering
                                                            </Typography>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', backgroundColor: `${colors.border}15`, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                                                                <Autocomplete
                                                                    size="small"
                                                                    options={wFields}
                                                                    getOptionLabel={(o) => o?.label || String(o)}
                                                                    value={wFields.find(f => f.key === (widget.config?.filterField || widget.config?.field)) || null}
                                                                    onChange={(_, v) => updateWidgetConfig(widget.id, { filterField: v?.key || '' })}
                                                                    renderInput={(params) => <TextField {...params} label="Filter Field" />}
                                                                    sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                    slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                />
                                                                <Autocomplete
                                                                    size="small"
                                                                    options={[
                                                                        { value: '', label: '— No Filter —' },
                                                                        { value: '==', label: 'Equals (==)' },
                                                                        { value: '!=', label: 'Not Equals (!=)' },
                                                                        { value: '>', label: 'Greater (>)' },
                                                                        { value: '>=', label: 'Greater/Equal (>=)' },
                                                                        { value: '<', label: 'Less (<)' },
                                                                        { value: '<=', label: 'Less/Equal (<=)' },
                                                                        { value: 'contains', label: 'Contains' },
                                                                        { value: 'starts', label: 'Starts with' },
                                                                        { value: 'ends', label: 'Ends with' },
                                                                        { value: 'regex', label: 'Regex Match' },
                                                                        { value: 'is null', label: 'Is Null/Empty' },
                                                                        { value: 'not null', label: 'Has Value' },
                                                                    ]}
                                                                    getOptionLabel={(o) => o.label}
                                                                    value={[
                                                                        { value: '', label: '— No Filter —' },
                                                                        { value: '==', label: 'Equals (==)' },
                                                                        { value: '!=', label: 'Not Equals (!=)' },
                                                                        { value: '>', label: 'Greater (>)' },
                                                                        { value: '>=', label: 'Greater/Equal (>=)' },
                                                                        { value: '<', label: 'Less (<)' },
                                                                        { value: '<=', label: 'Less/Equal (<=)' },
                                                                        { value: 'contains', label: 'Contains' },
                                                                        { value: 'starts', label: 'Starts with' },
                                                                        { value: 'ends', label: 'Ends with' },
                                                                        { value: 'regex', label: 'Regex Match' },
                                                                        { value: 'is null', label: 'Is Null/Empty' },
                                                                        { value: 'not null', label: 'Has Value' },
                                                                    ].find(o => o.value === (widget.config?.filterOperator || ''))}
                                                                    onChange={(_, v) => updateWidgetConfig(widget.id, { filterOperator: v?.value || '' })}
                                                                    renderInput={(params) => <TextField {...params} label="Operator" />}
                                                                    sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                    slotProps={{ popper: { style: { zIndex: 999999 } } }}
                                                                />
                                                                {widget.config?.filterOperator && !['is null', 'not null'].includes(widget.config.filterOperator) && (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                        <DebouncedTextField
                                                                            label="Filter Value"
                                                                            size="small"
                                                                            fullWidth
                                                                            value={widget.config?.filterValue || ''}
                                                                            onChange={(e) => updateWidgetConfig(widget.id, { filterValue: e.target.value })}
                                                                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                                                        />
                                                                        {widget.config?.filterOperator === 'regex' && (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginTop: '4px' }}>
                                                                                <Typography variant="caption" style={{ color: colors.text, fontWeight: 700, fontSize: '0.65rem', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Examples</Typography>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 10px', backgroundColor: `${colors.primary}15`, borderRadius: '4px', borderLeft: `3px solid ${colors.primary}`, width: '100%' }}>
                                                                                    <Typography variant="caption" style={{ color: colors.text, fontSize: '0.65rem', lineHeight: '1.4', textAlign: 'left' }}>
                                                                                        <span style={{ fontWeight: 800, color: colors.text }}>Include only:</span><br/>
                                                                                        <code style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: colors.text, backgroundColor: `${colors.background}A0`, padding: '1px 3px', borderRadius: '2px', display: 'inline-block', marginTop: '2px' }}>^(.*(Tampering|Battery)).*$</code>
                                                                                    </Typography>
                                                                                    <Typography variant="caption" style={{ color: colors.text, fontSize: '0.65rem', lineHeight: '1.4', textAlign: 'left' }}>
                                                                                        <span style={{ fontWeight: 800, color: colors.text }}>Exclude only:</span><br/>
                                                                                        <code style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: colors.text, backgroundColor: `${colors.background}A0`, padding: '1px 3px', borderRadius: '2px', display: 'inline-block', marginTop: '2px' }}>^(?!.*(Location)).*$</code>
                                                                                    </Typography>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </section>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                            </div>
                        <CustomFieldModal
                            open={showCustomFieldModal}
                            onClose={() => setShowCustomFieldModal(false)}
                            initialLabel={customFieldEditing.label}
                            initialFunction={customFieldEditing.function}
                            onApply={(label, func) => {
                                if (selectedWidget) {
                                    updateWidgetConfig(selectedWidget, { 
                                        customFieldName: label, 
                                        customFieldFunc: func 
                                    });
                                }
                            }}
                        />
                    <Dialog open={showNewTemplateDialog} onClose={() => setShowNewTemplateDialog(false)} style={{ zIndex: 999999 }}>
                        <DialogTitle>Create New Template</DialogTitle>
                        <DialogContent>
                            <DebouncedTextField
                                autoFocus
                                margin="dense"
                                label="Template Name"
                                fullWidth
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setShowNewTemplateDialog(false)}>Cancel</Button>
                            <Button onClick={handleCreateTemplate} variant="contained" disabled={loading}>
                                Create
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Dialog open={showClearConfirm} onClose={() => setShowClearConfirm(false)} style={{ zIndex: 999999 }}>
                        <DialogTitle>Clear Canvas</DialogTitle>
                        <DialogContent>
                            <Typography>
                                Are you sure you want to clear the entire canvas? This will remove all widgets and cannot be undone.
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setShowClearConfirm(false)}>Cancel</Button>
                            <Button onClick={() => { clearCanvas(); setShowClearConfirm(false); }} color="error" variant="contained">
                                Clear Everything
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} style={{ zIndex: 999999 }}>
                        <DialogTitle>Delete Template</DialogTitle>
                        <DialogContent>
                            <Typography>
                                Are you sure you want to delete &quot;{templateToDelete?.name}&quot;?
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                            <Button onClick={handleDeleteTemplate} color="error" variant="contained" disabled={loading}>
                                Delete
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Snackbar
                        open={snackbar.open}
                        autoHideDuration={4000}
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                            {snackbar.message}
                        </Alert>
                    </Snackbar>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FloatingDataAnalyticsPopover;
