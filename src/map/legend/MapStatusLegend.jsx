import { useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ChevronDown, ChevronUp } from 'lucide-react';

const STATES = [
  { color: '#16A34A', label: 'Em movimento' },
  { color: '#2563EB', label: 'Online / parado' },
  { color: '#CA8A04', label: 'Ignição ligada' },
  { color: '#DC2626', label: 'Offline' },
];

const MapStatusLegend = () => {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [expanded, setExpanded] = useState(true);

  const isDark = theme.palette.mode === 'dark';
  const bg = isDark ? 'rgba(17,24,39,0.88)' : 'rgba(255,255,255,0.92)';
  const border = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';
  const textColor = isDark ? '#D1D5DB' : '#374151';
  const labelColor = isDark ? '#9CA3AF' : '#6B7280';

  // On mobile the sidebar shifts up; on desktop the sidebar is on the left.
  // Keep the legend above the MapLibre attribution control (~30px tall).
  const bottomOffset = desktop ? 40 : 56;
  const rightOffset = desktop ? 10 : 10;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: bottomOffset,
        right: rightOffset,
        zIndex: 900,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        background: bg,
        border,
        borderRadius: expanded ? '10px' : '20px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        transition: 'border-radius 0.2s ease',
        userSelect: 'none',
      }}
    >
      {/* Header / toggle row */}
      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: expanded ? 1 : 0.75,
          px: expanded ? 1.5 : 1,
          py: 0.75,
          cursor: 'pointer',
          '&:hover': { opacity: 0.85 },
        }}
      >
        {/* Always-visible dot row */}
        <Box sx={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {STATES.map((s) => (
            <Box
              key={s.color}
              sx={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                bgcolor: s.color,
                flexShrink: 0,
                boxShadow: `0 0 0 1.5px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)'}`,
              }}
            />
          ))}
        </Box>

        {expanded && (
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 600,
              color: labelColor,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Estados
          </Typography>
        )}

        <Box sx={{ color: labelColor, display: 'flex', alignItems: 'center', ml: 'auto' }}>
          {expanded
            ? <ChevronDown size={13} />
            : <ChevronUp size={13} />}
        </Box>
      </Box>

      {/* Expanded rows */}
      {expanded && (
        <Box
          sx={{
            px: 1.5,
            pb: 1.25,
            pt: 0.25,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            borderTop: border,
          }}
        >
          {STATES.map((s) => (
            <Box
              key={s.color}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Box
                sx={{
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  bgcolor: s.color,
                  flexShrink: 0,
                  boxShadow: `0 0 0 1.5px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)'}`,
                }}
              />
              <Typography
                sx={{
                  fontSize: '12px',
                  color: textColor,
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default MapStatusLegend;
