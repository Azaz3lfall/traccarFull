import {
  useState, useEffect, useCallback, useRef, useMemo, memo
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  Snackbar,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Box,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  IconButton
} from '@mui/material';
import CustomPagination from './CustomPagination';
import {
  devicesActions,
  geofencesActions,
  errorsActions,
  sessionActions
} from '../store';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { map } from '../map/core/MapView';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import { useDeviceReadonly } from '../common/util/permissions';
import { distanceFromMeters, distanceToMeters, distanceUnitString } from '../common/util/converter';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatch } from '../reactHelper';
import {
  formatPercentage,
  formatSpeed,
  formatDistance,
  formatCoordinate,
  formatTime,
  formatCourse,
  formatAltitude,
  formatVoltage,
  formatVolume,
  formatBoolean,
  formatAlarm,
  formatNumber,
  formatNumericHours
} from '../common/util/formatter';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import localStorageAsync from '../common/util/localStorageAsync';
import { compressImage, validateImageFile } from '../utils/imageCompression';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import UploadIcon from '@mui/icons-material/Upload';
import AnchorIcon from '@mui/icons-material/Anchor';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import { PieChart } from 'lucide-react';
import CommandDialog from './CommandDialog';
import ShareDialog from './ShareDialog';
import { HiOutlinePlay } from "react-icons/hi2";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { 
  Gauge,
  X,
  ChevronLeft,
  Loader2,
  Settings
} from 'lucide-react';
import { Card } from './ui/card';
import { useResellerBranding } from '../common/hooks/useResellerBranding';
import fallbackLogo from '../resources/images/image170.png?inline';
import flvjs from 'flv.js';

dayjs.extend(relativeTime);

// VideoItem component with lazy loading - moved outside to prevent re-creation on every render
const VideoItem = memo(({ video, index, colors, setSelectedVideo, setShowVideoPlayer, device, fetchVideos, setVideos, showSnackbar }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef(null);

  // Lazy load thumbnail when in viewport
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !imageLoaded && !imageError) {
            setImageLoaded(true);
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [imageLoaded, imageError]);

  const formatVideoTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      return dayjs(timeStr, 'YYYY-MM-DD HH:mm:ss').format('MMM DD, YYYY HH:mm');
    } catch {
      return timeStr;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploaded_ok':
        return '#4caf50';
      case 'upload_errored':
        return '#f44336';
      case 'not_uploaded':
        return '#ff9800';
      case 'pending':
        return '#2196f3'; // Blue for pending
      default:
        return colors.textSecondary;
    }
  };

  return (
    <div
      ref={imgRef}
      style={{
        width: '100%',
        height: '200px', // FIXED HEIGHT
        maxHeight: '200px',
        minHeight: '200px',
        aspectRatio: '16/9', // Maintain 16:9 aspect ratio
        maxWidth: '100%',
        position: 'relative',
        backgroundColor: colors.secondary,
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
        boxSizing: 'border-box',
        cursor: (video.video_url && video.status === 'uploaded_ok') ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        margin: 0,
        padding: '5px', // Add 5px padding inside the video item
        display: 'block',
      }}
      onMouseEnter={(e) => {
          if (video.video_url && video.status === 'uploaded_ok') {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.15)`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        onClick={() => {
          if (video.video_url && video.status === 'uploaded_ok') {
            setSelectedVideo(video);
            setShowVideoPlayer(true);
          }
        }}
      >
      {/* Thumbnail */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        maxHeight: '200px',
        overflow: 'hidden',
      }}>
        {imageLoaded && video.thumbnail_url && !imageError ? (
          <img
            src={video.thumbnail_url}
            alt={`Channel ${video.channel} - ${video.beginTime}`}
            style={{
              width: '100%',
              height: '100%',
              maxHeight: '200px',
              objectFit: 'cover',
              display: imageError ? 'none' : 'block'
            }}
            onError={(e) => {
              setImageError(true);
              e.target.style.display = 'none';
            }}
            onLoad={() => {
              setImageError(false);
            }}
          />
        ) : null}
        {/* Fallback when no image or image error */}
        {(!imageLoaded || !video.thumbnail_url || imageError) && (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.secondary,
            gap: '8px'
          }}>
            {!imageError && !imageLoaded && video.thumbnail_url && (
              <CircularProgress size={24} />
            )}
            {(imageError || !video.thumbnail_url) && (
              <>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: colors.border,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.textSecondary
                }}>
                  <PlayArrowIcon style={{ fontSize: '24px' }} />
                </div>
              <Typography variant="body2" style={{ 
                color: colors.textSecondary,
                  fontSize: '11px',
                  textAlign: 'center'
              }}>
                No thumbnail
              </Typography>
              </>
            )}
          </div>
        )}
      </div>

      {/* Overlay with info */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
        padding: '6px 8px', // Reduced vertical padding to minimize height
        color: '#fff',
        maxHeight: '50px', // Constrain text overlay height
        overflow: 'hidden',
      }}>
        <Typography variant="caption" style={{ 
          display: 'block',
          fontSize: '10px',
          fontWeight: '600',
          marginBottom: '2px'
        }}>
          Ch {video.channel} • {formatVideoTime(video.beginTime)}
        </Typography>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '2px'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(video.status)
          }} />
          <Typography variant="caption" style={{ 
            fontSize: '9px',
            textTransform: 'capitalize'
          }}>
            {video.status?.replace('_', ' ')}
          </Typography>
        </div>
      </div>


      {/* Play button overlay for videos with URL and uploaded_ok status only */}
      {video.video_url && video.status === 'uploaded_ok' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <PlayArrowIcon style={{ fontSize: '28px', color: '#fff' }} />
        </div>
      )}

      {/* Pending indicator - circular progress (non-clickable) */}
      {video.status === 'pending' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <CircularProgress 
            size={28} 
            style={{ color: '#fff' }}
            thickness={4}
          />
        </div>
      )}

      {/* Upload button for not_uploaded and upload_errored videos (not pending) */}
      {(video.status === 'not_uploaded' || video.status === 'upload_errored') && (
        <IconButton
          onClick={async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Store original status to revert if upload fails
            const originalStatus = video.status;
            
            // IMMEDIATELY set status to pending to show circular progress and prevent multiple clicks
            if (setVideos) {
              console.log('[FTP_UPLOAD] Setting status to pending for:', video.expected_file);
              setVideos(prevVideos => {
                const updated = prevVideos.map(v => {
                  if (v.expected_file === video.expected_file) {
                    console.log('[FTP_UPLOAD] Updating video status from', v.status, 'to pending');
                    return { ...v, status: 'pending' };
                  }
                  return v;
                });
                console.log('[FTP_UPLOAD] Updated videos array:', updated.find(v => v.expected_file === video.expected_file));
                return updated;
              });
            } else {
              console.error('[FTP_UPLOAD] setVideos is not available!');
            }
            
            // Parse iothub attributes from device
            let iothub = {};
            try {
              if (device?.attributes?.iothub) {
                const iothubRaw = device.attributes.iothub;
                if (typeof iothubRaw === 'string') {
                  iothub = JSON.parse(iothubRaw);
                } else {
                  iothub = iothubRaw;
                }
              }
            } catch (e) {
              console.error('Error parsing iothub:', e);
            }
            
            // Log the raw video object to debug
            console.log('=== UPLOAD BUTTON CLICKED ===');
            console.log('Raw video object:', JSON.stringify(video, null, 2));
            console.log('Video beginTime:', video.beginTime);
            console.log('Video endTime:', video.endTime);
            console.log('Video expected_file:', video.expected_file);
            
            // Ensure we use the video's actual beginTime and endTime from the server response
            // These should be in format "2025-11-13 13:47:52" from the device
            if (!video.beginTime || !video.endTime) {
              console.error('❌ Video missing beginTime or endTime!', {
                beginTime: video.beginTime,
                endTime: video.endTime,
                fullVideo: video
              });
            } else {
              // Validate the format - should be "YYYY-MM-DD HH:mm:ss"
              const timeFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
              if (!timeFormat.test(video.beginTime) || !timeFormat.test(video.endTime)) {
                console.error('❌ Video beginTime/endTime format is wrong!', {
                  beginTime: video.beginTime,
                  endTime: video.endTime
                });
              }
            }
            
            // Prepare data to send - use video's actual times, not date picker values
            const uploadData = {
              ...video,
              beginTime: video.beginTime, // Use actual video beginTime from server
              endTime: video.endTime,     // Use actual video endTime from server
              deviceImei: device?.uniqueId,
              deviceModel: iothub?.deviceModel || 'jc181',
              iothub: iothub
            };
            
            // Log final upload data
            console.log('Final upload data:', JSON.stringify(uploadData, null, 2));
            console.log('================================');
            
            // Send POST request to /ftpupload endpoint
            try {
              const mediaServerUrl = import.meta.env.VITE_MEDIA_SERVER_URL;
              if (!mediaServerUrl) {
                console.error('Media server URL not configured');
                // Revert status on error
                if (setVideos) {
                  setVideos(prevVideos => prevVideos.map(v => {
                    if (v.expected_file === video.expected_file) {
                      return { ...v, status: originalStatus };
                    }
                    return v;
                  }));
                }
                console.log('[FTP_UPLOAD] Calling showSnackbar with: Media server URL not configured');
                showSnackbar('Media server URL not configured', 'error');
                return;
              }
              
              const response = await fetch(`${mediaServerUrl}/ftpupload`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(uploadData)
              });
              
              const result = await response.json();
              console.log('FTP upload response:', result);
              
              // Extract response message - check both msg and data._msg
              let responseMessage = result.msg || result.message || result.error || 'Unknown response';
              const dataMsg = (result.data?._msg || result.data?.msg || '').toString();
              
              // If data._msg exists, use it as the primary message (more specific)
              if (dataMsg) {
                responseMessage = dataMsg;
              }
              
              // Determine if upload was actually accepted
              // Only accept if:
              // 1. msg is "success" AND data._msg doesn't indicate an error (like "Device busy")
              // 2. OR msg contains "converted to an offline command"
              const responseMsgLower = (responseMessage || '').toString().toLowerCase();
              const resultMsgLower = (result.msg || '').toString().toLowerCase();
              const dataMsgLower = dataMsg.toLowerCase();
              
              const isOfflineCommand = responseMsgLower.includes('converted to an offline command') ||
                                      resultMsgLower.includes('converted to an offline command');
              const isSuccess = result.msg === 'success' && 
                               !dataMsgLower.includes('busy') &&
                               !dataMsgLower.includes('error') &&
                               !dataMsgLower.includes('fail');
              
              const shouldMarkAsPending = isOfflineCommand || isSuccess;
              
              console.log('[FTP_UPLOAD] Response analysis:', {
                responseOk: response.ok,
                resultCode: result.code,
                resultMsg: result.msg,
                dataMsg: dataMsg,
                isOfflineCommand,
                isSuccess,
                shouldMarkAsPending
              });
              
              if (response.ok && result.code === 0 && shouldMarkAsPending) {
                // Upload was accepted - keep status as pending in local state
                // Server will mark as pending in status_report.json, but it may take a moment
                // Don't refresh the list to avoid losing the pending status
                // The status will be updated when user manually refreshes or on next automatic refresh
                
                // Show response message with appropriate severity
                const severity = isOfflineCommand ? 'warning' : 'success';
                
                console.log('[FTP_UPLOAD] Upload accepted! Calling showSnackbar with:', responseMessage, severity);
                console.log('[FTP_UPLOAD] showSnackbar function:', typeof showSnackbar, showSnackbar);
                showSnackbar(responseMessage, severity);
                console.log('[FTP_UPLOAD] showSnackbar called');
                
                // Do NOT refresh the list automatically - let the pending status stay visible
                // The server will update status_report.json, and the next manual/automatic refresh will show the updated status
              } else {
                // Upload was NOT accepted - revert status, don't add to localStorage, show error
                if (setVideos) {
                  setVideos(prevVideos => prevVideos.map(v => {
                    if (v.expected_file === video.expected_file) {
                      return { ...v, status: originalStatus };
                    }
                    return v;
                  }));
                }
                
                console.error('FTP upload not accepted:', result);
                
                // Show error/warning message
                const severity = response.ok && result.code === 0 ? 'warning' : 'error';
                console.log('[FTP_UPLOAD] Calling showSnackbar with:', responseMessage, severity);
                showSnackbar(responseMessage, severity);
              }
            } catch (error) {
              console.error('Error sending FTP upload request:', error);
              
              // Revert status on error
              if (setVideos) {
                setVideos(prevVideos => prevVideos.map(v => {
                  if (v.expected_file === video.expected_file) {
                    return { ...v, status: originalStatus };
                  }
                  return v;
                }));
              }
              
              // Show error snackbar
              console.log('[FTP_UPLOAD] Calling showSnackbar with error:', error.message);
              showSnackbar(`Error sending FTP upload request: ${error.message}`, 'error');
            }
          }}
          size="small"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            width: '48px',
            height: '48px',
            padding: '6px',
            zIndex: 10,
          }}
          sx={{
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
            }
          }}
          title={video.status === 'upload_errored' ? "Retry upload" : "Upload video"}
        >
          <UploadIcon style={{ fontSize: '24px', color: '#fff' }} />
        </IconButton>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo - only re-render if video data or relevant props change
  // Return true if props are equal (skip re-render), false if different (re-render)
  const statusChanged = prevProps.video.status !== nextProps.video.status;
  
  // If status changed, we MUST re-render to show/hide circular progress
  if (statusChanged) {
    console.log('[VideoItem] Status changed from', prevProps.video.status, 'to', nextProps.video.status, '- forcing re-render');
    return false; // Re-render
  }
  
  // Otherwise, check other props
  return (
    prevProps.video.channel === nextProps.video.channel &&
    prevProps.video.beginTime === nextProps.video.beginTime &&
    prevProps.showSnackbar === nextProps.showSnackbar &&
    prevProps.video.video_url === nextProps.video.video_url &&
    prevProps.video.thumbnail_url === nextProps.video.thumbnail_url &&
    prevProps.index === nextProps.index
  );
});

VideoItem.displayName = 'VideoItem';

const FloatingStatusCard = ({ desktop, isMenuExpanded, isDeviceListVisible, showReplayPopover, setShowReplayPopover, onHideDeviceList, onShowDeviceList, onOpenReports }) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const t = useTranslation();
  const colors = useThemeColors();
  const { theme } = useTheme();
  
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const replayPositions = useSelector((state) => state.session.replayPositions);
  const user = useSelector((state) => state.session.user);
  const logo = useSelector((state) => state.session.server?.attributes?.logo);
  const logoInverted = useSelector((state) => state.session.server?.attributes?.logoInverted);
  const { getLogoUrl } = useResellerBranding();
  
  // Check if user has edit sensors permission
  const hasEditSensorsPermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.editSensors === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  
  // Check if user has resume engine permission
  const hasResumeEnginePermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.resumeEngine === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  
  // Check if user has stop engine permission
  const hasStopEnginePermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.stopEngine === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  
  // Check if user has send command permission
  const hasSendCommandPermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.sendCommand === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  
  // Check if user has change picture permission
  const hasChangePicturePermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.changePicture === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  
  // Check if user has more info permission
  const hasMoreInfoPermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.moreInfo === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  
  // Check if user has replay permission
  const hasReplayPermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.replay === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  
  // Check if user has share device permission
  const hasShareDevicePermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.shareDevice === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  
  // Check if user has anchor permission
  const hasAnchorPermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.anchor === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  
  // Check if any action buttons should be visible
  const hasAnyActionButtons = useMemo(() => {
    return hasResumeEnginePermission || hasStopEnginePermission || hasSendCommandPermission || hasShareDevicePermission || hasAnchorPermission;
  }, [hasResumeEnginePermission, hasStopEnginePermission, hasSendCommandPermission, hasShareDevicePermission, hasAnchorPermission]);
  
  // Check if user has hours permission
  const hasHoursPermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.hours === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  
  // Check if user has total distance permission
  const hasTotalDistancePermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.totalDistance === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailedPosition, setDetailedPosition] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isAnchored, setIsAnchored] = useState(false);
  const [anchorGeofenceId, setAnchorGeofenceId] = useState(null);
  const [isAnchorLoading, setIsAnchorLoading] = useState(false);
  const [isLockOpenLoading, setIsLockOpenLoading] = useState(false);
  const [isLockClosedLoading, setIsLockClosedLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showLockOpenConfirmation, setShowLockOpenConfirmation] = useState(false);
  const [showLockClosedConfirmation, setShowLockClosedConfirmation] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
  const [sensorEditModalOpen, setSensorEditModalOpen] = useState(false);
  const [sensorNames, setSensorNames] = useState({});
  const [addSensorModalOpen, setAddSensorModalOpen] = useState(false);
  const [moreDetailsModalOpen, setMoreDetailsModalOpen] = useState(false);
  const [moreDetailsActiveTab, setMoreDetailsActiveTab] = useState(0);
  const [selectedChannel, setSelectedChannel] = useState(0);
  const [playbackSubTab, setPlaybackSubTab] = useState(0); // 0 = On Server, 1 = On Device, 2 = Events
  const [streamingLoading, setStreamingLoading] = useState(false);
  const [streamingRetryCount, setStreamingRetryCount] = useState(0);
  const [streamingVideoUrl, setStreamingVideoUrl] = useState(null);
  const [streamingError, setStreamingError] = useState(null);
  const streamingVideoRef = useRef(null);
  const streamingRetryTimeoutRef = useRef(null);
  const flvPlayerRef = useRef(null);
  
  // Initialize dates with today 00:00:00 and 23:59:59
  const getTodayStart = () => dayjs().startOf('day').format('YYYY-MM-DDTHH:mm');
  const getTodayEnd = () => dayjs().endOf('day').format('YYYY-MM-DDTHH:mm');
  
  const [videoListStartDate, setVideoListStartDate] = useState(getTodayStart());
  const [videoListEndDate, setVideoListEndDate] = useState(getTodayEnd());
  const [videoListSelectedChannels, setVideoListSelectedChannels] = useState([]);
  const [videoListSelectedStatuses, setVideoListSelectedStatuses] = useState(['uploaded_ok', 'not_uploaded', 'upload_errored', 'pending']);
  
  const [videos, setVideos] = useState([]);
  const [videosTotalCount, setVideosTotalCount] = useState(0);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState(null);
  const [videosCurrentPage, setVideosCurrentPage] = useState(1);
  const videosPerPage = 20;
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const videoRef = useRef(null);
  const [deviceMessages, setDeviceMessages] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNewSensor, setSelectedNewSensor] = useState('');
  const [newSensorName, setNewSensorName] = useState('');
  const [sensorSearchTerm, setSensorSearchTerm] = useState('');
  const [showSensorDropdown, setShowSensorDropdown] = useState(false);
  const [savingSensors, setSavingSensors] = useState(false);
  const dropdownRef = useRef(null);
  
  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSensorDropdown(false);
      }
    };

    if (showSensorDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSensorDropdown]);
  
  const showSnackbar = useCallback((message, severity = 'error') => {
    console.log('[SNACKBAR] Showing snackbar:', message, severity);
    setSnackbar({ open: true, message, severity });
  }, []);
  
  const hideSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);
  
  // Replay form states
  const [replayDeviceId, setReplayDeviceId] = useState(null);
  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [replayLoading, setReplayLoading] = useState(false);
  
  // Enhanced replay states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentReplayIndex, setCurrentReplayIndex] = useState(0);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const intervalRef = useRef(null);
  
  // Get replay state from Redux
  const reduxCurrentReplayIndex = useSelector((state) => state.session.currentReplayIndex);
  
  // User preferences
  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');
  const altitudeUnit = useAttributePreference('altitudeUnit');
  const volumeUnit = useAttributePreference('volumeUnit');
  const coordinateFormat = usePreference('coordinateFormat');
  const positionItems = useAttributePreference('positionItems', 'fixTime,address,speed,totalDistance');
  const positionAttributes = usePositionAttributes(t);
  const deviceReadonly = useDeviceReadonly();
  
  // Get all possible Traccar sensors from position attributes
  const allPossibleSensors = useMemo(() => {
    return Object.keys(positionAttributes).map(key => ({
      value: key,
      label: positionAttributes[key]?.name || key
    }));
  }, [positionAttributes]);
  
  // Get current device and position
  // In replay mode, use replay device; otherwise use selected device
  const device = showReplayPopover && replayDeviceId ? devices[replayDeviceId] : (selectedDeviceId ? devices[selectedDeviceId] : null);

  // Helper function to generate video download URL from expected_file
  const generateVideoDownloadUrl = useCallback((expectedFile, deviceImei) => {
    if (!expectedFile || !deviceImei) return null;
    
    const mediaServerUrl = import.meta.env.VITE_MEDIA_SERVER_URL;
    if (!mediaServerUrl) return null;
    
    // Remove trailing slash from media server URL
    const cleanServer = mediaServerUrl.replace(/\/$/, '');
    // Generate download URL: mediaServerUrl/deviceImei/expected_file
    return `${cleanServer}/${deviceImei}/${expectedFile}`;
  }, []);

  // Helper function to log device messages - defined early so it can be used in other callbacks
  const logDeviceMessage = useCallback((type, action, request, response, success, error = null, videoInfo = null) => {
    // Extract video information from request or videoInfo
    let videoName = null;
    let videoFileName = null;
    let videoUrl = null;
    let videoDownloadUrl = null;
    
    if (videoInfo) {
      if (typeof videoInfo === 'string') {
        videoName = videoInfo;
      } else if (videoInfo.channel && videoInfo.beginTime) {
        videoName = `Ch ${videoInfo.channel} - ${videoInfo.beginTime}`;
        // Extract filename and URL from video object
        videoFileName = videoInfo.expected_file || null;
        videoUrl = videoInfo.video_url || null;
        // Generate download URL if we have expected_file
        if (videoFileName && device?.uniqueId) {
          videoDownloadUrl = generateVideoDownloadUrl(videoFileName, device.uniqueId);
        }
      }
    }
    if (!videoName && request) {
      if (request.channel && request.beginTime) {
        videoName = `Ch ${request.channel} - ${request.beginTime}`;
      } else if (request.video) {
        if (request.video.channel && request.video.beginTime) {
          videoName = `Ch ${request.video.channel} - ${request.video.beginTime}`;
        }
        videoFileName = request.video.expected_file || null;
        videoUrl = request.video.video_url || null;
        // Generate download URL if we have expected_file
        if (videoFileName && (request.deviceImei || device?.uniqueId)) {
          videoDownloadUrl = generateVideoDownloadUrl(videoFileName, request.deviceImei || device.uniqueId);
        }
      }
    }
    
    // Get message from response or error
    const responseMsg = response?.data?._msg || response?.msg || null;
    const messageText = error || responseMsg || null;
    
    const message = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type, // 'streaming', 'upload', 'instruct', etc.
      action, // 'start_stream', 'upload_video', 'get_video_list', etc.
      request: request ? JSON.stringify(request, null, 2) : null,
      response: response ? (typeof response === 'string' ? response : JSON.stringify(response, null, 2)) : null,
      success,
      error: messageText, // This will be displayed as "Message" in UI
      code: response?.code,
      _code: response?.data?._code,
      _msg: response?.data?._msg,
      videoName: videoName, // Include video name/info
      videoFileName: videoFileName, // Include real filename (e.g., CH2_251109_000859_000000.mp4)
      videoUrl: videoUrl, // Include video URL for playback (from API response)
      videoDownloadUrl: videoDownloadUrl // Include generated download URL (available immediately)
    };
    
    setDeviceMessages(prev => {
      const updated = [message, ...prev];
      // Keep only last 200 messages
      return updated.slice(0, 200);
    });
  }, [device, generateVideoDownloadUrl]);

  // Parse iothub channels from device attributes
  const getIoTHubChannels = useMemo(() => {
    if (!device?.attributes?.iothub) return 0;
    try {
      const iothub = JSON.parse(device.attributes.iothub);
      const channelsValue = iothub?.channels || '0';
      const channelsCount = parseInt(channelsValue, 10);
      return isNaN(channelsCount) || channelsCount <= 0 ? 0 : channelsCount;
    } catch (e) {
      return 0;
    }
  }, [device]);

  // Get device model from iothub attributes (lowercased)
  const getDeviceModel = useMemo(() => {
    if (!device?.attributes?.iothub) return null;
    try {
      const iothub = JSON.parse(device.attributes.iothub);
      const deviceModel = iothub?.deviceModel || '';
      return deviceModel.toLowerCase().trim();
    } catch (e) {
      return null;
    }
  }, [device]);

  // API templates for different device models
  const getApiTemplate = useCallback((model) => {
    const normalizedModel = model?.toLowerCase().trim() || '';
    
    // jc181 template
    if (normalizedModel === 'jc181') {
      return {
        videoList: {
          proNo: '37381',
          cmdType: 'normallns',
          serverFlagId: '0',
          platform: 'web',
          requestId: '6',
          offLineFlag: '1'
        },
        streaming: {
          proNo: '37121',
          cmdType: 'normallns',
          serverFlagId: '0',
          platform: 'web',
          requestId: '6',
          offLineFlag: '1',
          useJsonCmdContent: true,
          channelsStartAtZero: false
        }
      };
    }
    
    // jc400 template
    if (normalizedModel === 'jc400') {
      return {
        videoList: null, // jc400 doesn't support video list requests yet
        streaming: {
          proNo: '128',
          useJsonCmdContent: false,
          channelsStartAtZero: true,
          urlFormat: 'live' // Uses /live/{channelIndex}/ format
        }
      };
    }
    
    // Return null for unsupported models
    return null;
  }, []);

  // Send instruct command to device to upload/transcode videos
  const sendVideoListInstruct = useCallback(async () => {
    if (!device?.attributes?.iothub || !device?.uniqueId) {
      throw new Error('Device iothub configuration not found');
    }

    try {
      // Get device model and validate support
      const deviceModel = getDeviceModel;
      if (!deviceModel) {
        throw new Error('Device model not found in iothub configuration');
      }

      const apiTemplate = getApiTemplate(deviceModel);
      if (!apiTemplate || !apiTemplate.videoList) {
        throw new Error(`Device model "${deviceModel}" does not support video list requests. Currently only "jc181" supports video list requests.`);
      }

      const iothub = JSON.parse(device.attributes.iothub);
      const iothubServer = iothub?.iothubServer || '';
      const token = iothub?.token || '';

      if (!iothubServer || !token) {
        throw new Error('IoTHub Server or Token not configured');
      }

      // Format dates as YYMMDDHHmmss
      const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return '';
        const date = dayjs(dateTimeString);
        return date.format('YYMMDDHHmmss');
      };

      const beginTime = formatDateTime(videoListStartDate);
      const endTime = formatDateTime(videoListEndDate);

      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

      const urlencoded = new URLSearchParams();
      urlencoded.append("deviceImei", device.uniqueId);
      urlencoded.append("cmdContent", JSON.stringify({
        "channel": 0,
        "beginTime": beginTime,
        "endTime": endTime,
        "alarmFlag": 0,
        "resourceType": 0,
        "codeType": 0,
        "storageType": 0,
        "instructionID": "123456789"
      }));
      urlencoded.append("serverFlagId", apiTemplate.videoList.serverFlagId);
      urlencoded.append("proNo", apiTemplate.videoList.proNo);
      urlencoded.append("platform", apiTemplate.videoList.platform);
      urlencoded.append("requestId", apiTemplate.videoList.requestId);
      urlencoded.append("cmdType", apiTemplate.videoList.cmdType);
      urlencoded.append("offLineFlag", apiTemplate.videoList.offLineFlag);
      urlencoded.append("token", token);

      // Build URL from iothubServer - ensure it has protocol and path
      const apiUrl = iothubServer.startsWith('http') 
        ? `${iothubServer}/api/device/sendInstruct`
        : `https://${iothubServer}/api/device/sendInstruct`;

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: urlencoded,
        redirect: "follow"
      };

      console.log('=== Video List Instruct Request ===');
      console.log('URL:', apiUrl);
      console.log('beginTime:', beginTime);
      console.log('endTime:', endTime);
      console.log('====================================');

      const requestData = {
        deviceImei: device.uniqueId,
        cmdContent: JSON.parse(urlencoded.get("cmdContent")),
        beginTime: formatDateTime(videoListStartDate),
        endTime: formatDateTime(videoListEndDate)
      };

      const response = await fetch(apiUrl, requestOptions);
      const result = await response.text();
      console.log('Video list instruct response:', result);
      
      try {
        const parsed = JSON.parse(result);
        logDeviceMessage('instruct', 'get_video_list', requestData, parsed, parsed.code === 0, parsed.code !== 0 ? parsed.msg : null);
      } catch (e) {
        logDeviceMessage('instruct', 'get_video_list', requestData, result, false, 'Invalid JSON response');
      }
      
      return result;
    } catch (error) {
      console.error('Error sending video list instruct:', error);
      throw error;
    }
  }, [device, videoListStartDate, videoListEndDate, logDeviceMessage, getDeviceModel, getApiTemplate]);

  // Fetch videos from media server
  const fetchVideos = useCallback(async () => {
    if (!device?.uniqueId) {
      setVideos([]);
      return;
    }

    setVideosLoading(true);
    setVideosError(null);

    try {
      const mediaServerUrl = import.meta.env.VITE_MEDIA_SERVER_URL;
      if (!mediaServerUrl) {
        throw new Error('Media server URL not configured');
      }

      const deviceModel = getDeviceModel;
      let requestBody;
      
      // For jc181, send request with beginTime, endTime, token, jimiServer
      if (deviceModel === 'jc181') {
        const iothub = JSON.parse(device.attributes.iothub);
        const iothubServer = iothub?.iothubServer || '';
        const token = iothub?.token || '';
        
        if (!iothubServer || !token) {
          throw new Error('IoTHub Server or Token not configured');
        }

        // Format dates as YYMMDDHHMMSS from date pickers
        const formatDateTime = (dateTimeString) => {
          if (!dateTimeString) return '';
          const date = dayjs(dateTimeString);
          return date.format('YYMMDDHHmmss');
        };

        // Use date picker values, default to today if not set
        const startDate = videoListStartDate || dayjs().startOf('day').format('YYYY-MM-DDTHH:mm');
        const endDate = videoListEndDate || dayjs().endOf('day').format('YYYY-MM-DDTHH:mm');
        
        const beginTime = formatDateTime(startDate);
        const endTime = formatDateTime(endDate);

        requestBody = {
          deviceImei: device.uniqueId,
          deviceModel: 'jc181',
          beginTime: beginTime,
          endTime: endTime,
          token: token,
          jimiServer: iothubServer
        };
      } else if (deviceModel === 'jc400') {
        // For jc400, send deviceModel to get file list from server
        requestBody = {
          deviceImei: device.uniqueId,
          deviceModel: 'jc400'
        };
      } else {
        // For other device models, use old format
        requestBody = {
          deviceImei: device.uniqueId
        };
      }

      const response = await fetch(`${mediaServerUrl}/getFileList`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Show device response notification if available
      if (data.deviceResponse) {
        const deviceResp = data.deviceResponse;
        let message = deviceResp.data?._msg || deviceResp.msg || 'Device response received';
        let severity = 'info';
        
        // Determine severity based on response
        if (deviceResp.code === 0 && deviceResp.msg === 'success') {
          const msgLower = message.toLowerCase();
          if (msgLower.includes('offline') || msgLower.includes('timeout')) {
            severity = 'warning';
          } else if (msgLower.includes('busy') || msgLower.includes('error') || msgLower.includes('fail')) {
            severity = 'warning';
          } else {
            severity = 'success';
          }
        } else {
          severity = 'error';
        }
        
        // Show snackbar with device response
        if (showSnackbar) {
          console.log('[getFileList] Showing device response:', message, severity);
          showSnackbar(message, severity);
        }
      }
      
      // Handle new response format for jc181 (onServer and onDevice)
      if (deviceModel === 'jc181' && data.onServer !== undefined && data.onDevice !== undefined) {
        const allVideos = [];
        
        // Get current videos to preserve pending status that might not be on server yet
        const currentVideosMap = new Map();
        videos.forEach(v => {
          if (v.expected_file) {
            currentVideosMap.set(v.expected_file, v);
          }
        });
        
        // Process onServer videos - use status from server (uploaded_ok or upload_errored)
        // Server may also provide 'pending' status if file is being processed
        (data.onServer || []).forEach(video => {
          const fileSize = video.file_size || 0;
          // Use server status if provided, otherwise determine from file size
          let status = video.status || (fileSize < 1024 * 1024 ? 'upload_errored' : 'uploaded_ok');
          
          // Only preserve pending status from local state if server status is also pending
          // If server has a definitive status (uploaded_ok, upload_errored), use that instead
          const currentVideo = currentVideosMap.get(video.expected_file);
          if (currentVideo?.status === 'pending' && status === 'pending') {
            // Both are pending - keep pending
            status = 'pending';
          } else if (status === 'uploaded_ok' || status === 'upload_errored') {
            // Server has definitive status - use it (don't preserve pending)
            // status is already set correctly
          }
          
          allVideos.push({
            ...video,
            status: status,
            // Explicitly preserve beginTime and endTime from server response
            beginTime: video.beginTime,
            endTime: video.endTime
          });
        });
        
        // Process onDevice videos - use status from server (not_uploaded, pending, or upload_errored)
        // Server provides 'pending' status if file is in processing queue
        (data.onDevice || []).forEach(video => {
          // Use server status if provided, otherwise default to 'not_uploaded'
          let status = video.status || 'not_uploaded';
          
          // Only preserve pending status from local state if server status is also pending or not_uploaded
          // If server has a definitive status (uploaded_ok, upload_errored), use that instead
          const currentVideo = currentVideosMap.get(video.expected_file);
          if (currentVideo?.status === 'pending' && (status === 'pending' || status === 'not_uploaded')) {
            // Local is pending and server is pending/not_uploaded - keep pending
            status = 'pending';
          } else if (status === 'uploaded_ok' || status === 'upload_errored') {
            // Server has definitive status - use it (don't preserve pending)
            // status is already set correctly
          }
          
          allVideos.push({
            ...video,
            status: status,
            // Explicitly preserve beginTime and endTime from server response
            beginTime: video.beginTime,
            endTime: video.endTime
          });
        });
        
        setVideos(allVideos);
        setVideosTotalCount(allVideos.length);
      } else {
        // Old format - videos array (used for jc400 and other models)
        setVideos(data.videos || []);
        setVideosTotalCount(data.resource_count || 0);
      }
      
      setVideosCurrentPage(1); // Reset to first page when new data is fetched
    } catch (error) {
      console.error('Error fetching videos:', error);
      setVideosError(error.message);
      setVideos([]);
      setVideosTotalCount(0);
    } finally {
      setVideosLoading(false);
    }
  }, [device, getDeviceModel, videoListStartDate, videoListEndDate, logDeviceMessage, showSnackbar]);

  // Send RTMP,OFF command for jc400 (must be sent before starting any stream)
  const sendRtmpOffCommand = useCallback(async () => {
    if (!device?.attributes?.iothub || !device?.uniqueId) {
      throw new Error('Device iothub configuration not found');
    }

    try {
      const iothub = JSON.parse(device.attributes.iothub);
      const iothubServer = iothub?.iothubServer || '';
      const token = iothub?.token || '';

      if (!iothubServer || !token) {
        throw new Error('IoTHub Server or Token not configured');
      }

      const urlencoded = new URLSearchParams();
      urlencoded.append("deviceImei", device.uniqueId);
      urlencoded.append("cmdContent", "RTMP,OFF");
      urlencoded.append("proNo", "128");
      urlencoded.append("token", token);

      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

      const apiUrl = iothubServer.startsWith('http') 
        ? `${iothubServer}/api/device/sendInstruct`
        : `https://${iothubServer}/api/device/sendInstruct`;

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: urlencoded,
        redirect: "follow"
      };

      console.log('=== Sending RTMP,OFF command ===');
      console.log('URL:', apiUrl);
      console.log('cmdContent: RTMP,OFF');
      console.log('================================');

      const response = await fetch(apiUrl, requestOptions);
      const result = await response.text();
      console.log('RTMP,OFF response:', result);

      try {
        const parsed = JSON.parse(result);
        const isSuccess = parsed.code === 0 && parsed.msg === "success";
        
        if (isSuccess) {
          console.log('✅ RTMP,OFF command successful');
          return { success: true, data: parsed };
        } else {
          console.warn('⚠️ RTMP,OFF command returned non-success response:', parsed);
          // Still return success if code is 0, as the device might already be off
          if (parsed.code === 0) {
            return { success: true, data: parsed };
          }
          return { success: false, data: parsed, error: parsed.msg || 'RTMP,OFF command failed' };
        }
      } catch (e) {
        console.error('Failed to parse RTMP,OFF response:', e);
        return { success: false, error: 'Invalid response from device', raw: result };
      }
    } catch (error) {
      console.error('Error sending RTMP,OFF command:', error);
      throw error;
    }
  }, [device]);

  // Send streaming request to API
  const sendStreamingRequest = useCallback(async (channelNum) => {
    if (!device?.attributes?.iothub || !device?.uniqueId) {
      throw new Error('Device iothub configuration not found');
    }

    try {
      // Get device model and validate support
      const deviceModel = getDeviceModel;
      if (!deviceModel) {
        throw new Error('Device model not found in iothub configuration');
      }

      const apiTemplate = getApiTemplate(deviceModel);
      if (!apiTemplate || !apiTemplate.streaming) {
        throw new Error(`Device model "${deviceModel}" is not supported. Currently only "jc181" and "jc400" are supported.`);
      }

      // For jc400, first send RTMP,OFF command, wait 500ms, then send streaming command
      if (deviceModel === 'jc400') {
        console.log('📡 jc400 detected: Sending RTMP,OFF command first...');
        const rtmpOffResponse = await sendRtmpOffCommand();
        
        if (!rtmpOffResponse.success) {
          console.warn('⚠️ RTMP,OFF command failed, but continuing with streaming request...');
        }
        
        // Wait 500ms after RTMP,OFF success
        console.log('⏳ Waiting 500ms after RTMP,OFF...');
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ 500ms delay completed, proceeding with streaming command...');
      }

      const iothub = JSON.parse(device.attributes.iothub);
      const iothubServer = iothub?.iothubServer || '';
      const token = iothub?.token || '';

      if (!iothubServer || !token) {
        throw new Error('IoTHub Server or Token not configured');
      }

      // For jc400, we don't need ftpServerIp
      if (deviceModel === 'jc181') {
        const ftpServerIp = iothub?.ftpServerIp || '';
        if (!ftpServerIp) {
          throw new Error('FTP Server IP not configured');
        }
      }

      const urlencoded = new URLSearchParams();
      urlencoded.append("deviceImei", device.uniqueId);
      
      // Handle different cmdContent formats based on model
      let cmdContent;
      let cmdContentString;
      
      if (apiTemplate.streaming.useJsonCmdContent) {
        // jc181 format: JSON cmdContent
        const ftpServerIp = iothub?.ftpServerIp || '';
        cmdContent = {
          "dataType": "0",
          "codeStreamType": "0",
          "channel": String(channelNum),
          "videoIP": ftpServerIp,
          "videoTCPPort": "10002",
          "videoUDPPort": "0"
        };
        cmdContentString = JSON.stringify(cmdContent);
      } else {
        // jc400 format: String cmdContent
        // Channel mapping: Channel 1 (index 0) → "RTMP,ON,OUT", Channel 2 (index 1) → "RTMP,ON,IN"
        const channelIndex = apiTemplate.streaming.channelsStartAtZero ? channelNum - 1 : channelNum;
        console.log(`📡 Channel mapping for cmdContent: UI Channel ${channelNum} → index ${channelIndex}`);
        if (channelIndex === 0) {
          cmdContentString = "RTMP,ON,OUT";
          console.log(`✅ Channel 1 → index 0 → cmdContent: "RTMP,ON,OUT"`);
        } else if (channelIndex === 1) {
          cmdContentString = "RTMP,ON,IN";
          console.log(`✅ Channel 2 → index 1 → cmdContent: "RTMP,ON,IN"`);
        } else {
          throw new Error(`Channel ${channelNum} is not supported for jc400. Only channels 1 and 2 are supported.`);
        }
        cmdContent = cmdContentString;
      }
      
      urlencoded.append("cmdContent", cmdContentString);
      urlencoded.append("proNo", apiTemplate.streaming.proNo);
      
      // Only add these fields for jc181
      if (apiTemplate.streaming.useJsonCmdContent) {
        urlencoded.append("serverFlagId", apiTemplate.streaming.serverFlagId);
        urlencoded.append("platform", apiTemplate.streaming.platform);
        urlencoded.append("requestId", apiTemplate.streaming.requestId);
        urlencoded.append("cmdType", apiTemplate.streaming.cmdType);
        urlencoded.append("offLineFlag", apiTemplate.streaming.offLineFlag);
      }
      
      urlencoded.append("token", token);

      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

      // Build URL from iothubServer - ensure it has protocol and path
      const apiUrl = iothubServer.startsWith('http') 
        ? `${iothubServer}/api/device/sendInstruct`
        : `https://${iothubServer}/api/device/sendInstruct`;

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: urlencoded,
        redirect: "follow"
      };

      // Log full request details
      console.log('=== Streaming Activation Request ===');
      console.log('URL:', apiUrl);
      console.log('Method:', requestOptions.method);
      console.log('Headers:', Object.fromEntries(myHeaders.entries()));
      console.log('Body Parameters:');
      console.log('  - deviceImei:', device.uniqueId);
      console.log('  - cmdContent:', typeof cmdContent === 'string' ? cmdContent : JSON.stringify(cmdContent, null, 2));
      console.log('  - proNo:', apiTemplate.streaming.proNo);
      if (apiTemplate.streaming.useJsonCmdContent) {
        console.log('  - serverFlagId:', apiTemplate.streaming.serverFlagId);
        console.log('  - platform:', apiTemplate.streaming.platform);
        console.log('  - requestId:', apiTemplate.streaming.requestId);
        console.log('  - cmdType:', apiTemplate.streaming.cmdType);
        console.log('  - offLineFlag:', apiTemplate.streaming.offLineFlag);
      }
      console.log('  - token:', token ? `${token.substring(0, 10)}...` : '(empty)');
      console.log('Full URL-encoded body:', urlencoded.toString());
      console.log('====================================');
      
      const requestData = {
        deviceImei: device.uniqueId,
        channel: channelNum,
        cmdContent: cmdContent
      };
      
      const response = await fetch(apiUrl, requestOptions);
      const result = await response.text();
      console.log('Streaming request response:', result);
      console.log('Device model:', deviceModel);
      
      // Parse and validate response
      try {
        const parsed = JSON.parse(result);
        
        // Different response validation based on device model
        let isSuccess = false;
        
        if (deviceModel === 'jc400') {
          // jc400 response format: code 0, msg "success", data._code "100" (data._msg can be null)
          isSuccess = parsed.code === 0 && 
                     parsed.msg === "success" && 
                     parsed.data?._code === "100";
          
          // Also accept if code is 0 and msg is success (even if _code is missing)
          if (!isSuccess && parsed.code === 0 && parsed.msg === "success") {
            isSuccess = true;
          }
        } else {
          // jc181 format: specific response structure
          isSuccess = parsed.code === 0 && 
              parsed.msg === "success" && 
              parsed.data?._code === "100" &&
              parsed.data?._msg === "Command communication successful response";
        }
        
        // Log the message
        logDeviceMessage('streaming', `start_stream_channel_${channelNum}`, requestData, parsed, isSuccess, isSuccess ? null : (parsed.data?._msg || parsed.msg || 'Device is offline or command failed'));
        
        if (isSuccess) {
          return { success: true, data: parsed };
        } else {
          // Show server message if available, otherwise show default message
          const serverMessage = parsed.data?._msg || parsed.msg || parsed.error || 'Device is offline or command failed';
          return { success: false, data: parsed, error: serverMessage };
        }
      } catch (e) {
        // If response is not JSON, treat as error
        console.error('Failed to parse response as JSON:', e);
        console.error('Raw response:', result);
        logDeviceMessage('streaming', `start_stream_channel_${channelNum}`, requestData, result, false, 'Invalid JSON response');
        return { success: false, error: 'Invalid response from device', raw: result };
      }
    } catch (error) {
      console.error('Error sending streaming request:', error);
      throw error;
    }
  }, [device, logDeviceMessage, getDeviceModel, getApiTemplate, sendRtmpOffCommand]);

  // Load video stream with retry logic using flv.js
  const loadVideoStream = useCallback((channelNum, retryCount = 0, isInitialLoad = false) => {
    if (!device?.attributes?.iothub || !device?.uniqueId) {
      setStreamingError('Device configuration not found');
      setStreamingLoading(false);
      return;
    }

    try {
      // Get device model to determine URL format
      const deviceModel = getDeviceModel;
      const apiTemplate = deviceModel ? getApiTemplate(deviceModel) : null;
      
      const iothub = JSON.parse(device.attributes.iothub);
      const streamingServer = iothub?.streamingServer || '';

      if (!streamingServer) {
        setStreamingError('Streaming server not configured');
        setStreamingLoading(false);
        return;
      }

      // Check if flv.js is supported
      if (!flvjs.isSupported()) {
        setStreamingError('FLV playback is not supported in this browser');
        setStreamingLoading(false);
        return;
      }

      // Build streaming URL based on device model
      let videoUrl;
      const cleanServer = streamingServer.replace(/\/$/, '');
      
      if (apiTemplate?.streaming?.urlFormat === 'live') {
        // jc400 format: https://{streamingServer}/live/{channelIndex}/{deviceId}.flv
        // Channel mapping: Channel 1 → index 0, Channel 2 → index 1
        const channelIndex = channelNum - 1;
        console.log(`📡 Channel mapping: UI Channel ${channelNum} → URL index ${channelIndex}`);
        if (cleanServer.startsWith('http://') || cleanServer.startsWith('https://')) {
          videoUrl = `${cleanServer}/live/${channelIndex}/${device.uniqueId}.flv`;
        } else {
          videoUrl = `https://${cleanServer}/live/${channelIndex}/${device.uniqueId}.flv`;
        }
      } else {
        // jc181 format: {streamingServer}/{channelNum}/{deviceId}.flv
        if (cleanServer.startsWith('http://') || cleanServer.startsWith('https://')) {
          videoUrl = `${cleanServer}/${channelNum}/${device.uniqueId}.flv`;
        } else {
          videoUrl = `http://${cleanServer}/${channelNum}/${device.uniqueId}.flv`;
        }
      }
      
      console.log('=== Streaming URL Details ===');
      console.log('Streaming URL:', videoUrl);
      console.log('Streaming server (raw):', streamingServer);
      console.log('Channel:', channelNum);
      console.log('Channel Index (for jc400):', apiTemplate?.streaming?.urlFormat === 'live' ? channelNum - 1 : 'N/A');
      console.log('Device uniqueId:', device.uniqueId);
      console.log('Device Model:', deviceModel);
      console.log('URL Format:', apiTemplate?.streaming?.urlFormat === 'live' 
        ? `{streamingServer}/live/{channelIndex}/{deviceId}.flv` 
        : `{streamingServer}/{channel}/{deviceId}.flv`);
      console.log('Full constructed URL:', videoUrl);
      console.log('================================');
      
      console.log('📺 Setting streaming video URL:', videoUrl);
      setStreamingVideoUrl(videoUrl);
      setStreamingError(null);
      setStreamingRetryCount(retryCount);
      
      // Player initialization will happen in useEffect when streamingVideoUrl is set
      console.log('✅ Streaming URL set, FLV player should initialize via useEffect');
    } catch (error) {
      console.error('Error loading video stream:', error);
      if (retryCount < 10) {
        const newRetryCount = retryCount + 1;
        setStreamingRetryCount(newRetryCount);
        setStreamingLoading(true);
        console.log(`Retrying to load stream (attempt ${newRetryCount}/10) in 3 seconds...`);
        streamingRetryTimeoutRef.current = setTimeout(() => {
          loadVideoStream(channelNum, newRetryCount, false);
        }, 3000);
      } else {
        setStreamingError(error.message || 'Failed to load video file after multiple attempts');
        setStreamingLoading(false);
      }
    }
  }, [device, selectedChannel, getDeviceModel, getApiTemplate]);

  // Refresh streaming for current channel
  const handleRefreshStreaming = useCallback(async () => {
    if (selectedChannel <= 0) {
      return;
    }

    console.log(`Refreshing streaming for channel ${selectedChannel}`);
    
    // Clear previous streaming state
    if (streamingRetryTimeoutRef.current) {
      clearTimeout(streamingRetryTimeoutRef.current);
      streamingRetryTimeoutRef.current = null;
    }
    
    // Destroy existing player
    if (flvPlayerRef.current) {
      flvPlayerRef.current.destroy();
      flvPlayerRef.current = null;
    }
    
    // Clear streaming state
    setStreamingVideoUrl(null);
    setStreamingError(null);
    setStreamingRetryCount(0);
    setStreamingLoading(true);

    try {
      // Send streaming request
      const response = await sendStreamingRequest(selectedChannel);
      
      // Check if response indicates success
      if (response.success) {
        // Load stream immediately after receiving OK from API
        console.log('✅ Streaming request successful, loading stream immediately...');
        loadVideoStream(selectedChannel, 0, true);
      } else {
        // Device is offline or command failed
        setStreamingError(response.error || 'Device is offline or command failed');
        setStreamingLoading(false);
      }
    } catch (error) {
      console.error('Error refreshing stream:', error);
      setStreamingError(error.message || 'Failed to refresh streaming');
      setStreamingLoading(false);
    }
  }, [selectedChannel, sendStreamingRequest, loadVideoStream, getDeviceModel]);

  // Handle channel tab change
  const handleChannelChange = useCallback(async (e, newValue) => {
    // Clear previous streaming state
    if (streamingRetryTimeoutRef.current) {
      clearTimeout(streamingRetryTimeoutRef.current);
      streamingRetryTimeoutRef.current = null;
    }
    // Cleanup streaming when switching away from streaming tabs
    if (newValue === 0 || newValue === 'playback') {
      console.log('Cleaning up streaming - switching away from streaming tabs');
      // Destroy flv player
      if (flvPlayerRef.current) {
        flvPlayerRef.current.destroy();
        flvPlayerRef.current = null;
      }
      // Clear streaming state
      setStreamingVideoUrl(null);
      setStreamingLoading(false);
      setStreamingError(null);
      setStreamingRetryCount(0);
    }

    setSelectedChannel(newValue);

    // If switching to a channel tab (not playback)
    if (newValue > 0) {
      setStreamingLoading(true);
      try {
        // Send streaming request
        const response = await sendStreamingRequest(newValue);
        
        // Check if response indicates success
        console.log('Streaming response:', response);
        if (response.success) {
          console.log('✅ Streaming request successful, loading stream immediately...');
          // Load stream immediately after receiving OK from API
          loadVideoStream(newValue, 0, true);
        } else {
          console.error('❌ Streaming request failed:', response.error);
          // Device is offline or command failed
          setStreamingError(response.error || 'Device is offline or command failed');
          setStreamingLoading(false);
        }
      } catch (error) {
        console.error('Error starting stream:', error);
        setStreamingError(error.message || 'Failed to start streaming');
        setStreamingLoading(false);
      }
    }
  }, [sendStreamingRequest, loadVideoStream, getDeviceModel]);

  // Initialize flv.js player when video URL is set and video element is ready
  useEffect(() => {
    if (!streamingVideoUrl || selectedChannel <= 0) {
      // Cleanup if URL is cleared or channel is not selected
      if (flvPlayerRef.current) {
        console.log('Cleaning up FLV player - URL cleared or channel not selected');
        flvPlayerRef.current.destroy();
        flvPlayerRef.current = null;
      }
      return;
    }

    // Small delay to ensure video element is fully in DOM
    const timer = setTimeout(() => {
      if (!streamingVideoRef.current) {
        console.warn('Video element not ready yet');
        return;
      }

      // Destroy existing player if any
      if (flvPlayerRef.current) {
        flvPlayerRef.current.destroy();
        flvPlayerRef.current = null;
      }

      const videoElement = streamingVideoRef.current;
      console.log('Initializing FLV player with URL:', streamingVideoUrl);
      console.log('Video element:', videoElement);

      // Determine if this is a live stream based on device model
      const deviceModel = getDeviceModel;
      const apiTemplate = deviceModel ? getApiTemplate(deviceModel) : null;
      const isLiveStream = apiTemplate?.streaming?.urlFormat === 'live'; // jc400 uses live streaming

      console.log('Device model:', deviceModel);
      console.log('Is live stream:', isLiveStream);

      // Create flv.js player
      const flvPlayer = flvjs.createPlayer({
        type: 'flv',
        url: streamingVideoUrl,
        isLive: isLiveStream, // jc400 uses live streaming, jc181 uses file-based
        hasAudio: true,
        hasVideo: true,
        enableWorker: false,
        enableStashBuffer: isLiveStream, // Enable for live streams
        stashInitialSize: isLiveStream ? 128 : 128,
        autoCleanupSourceBuffer: true
      });

      // Set up event handlers
      flvPlayer.on(flvjs.Events.ERROR, (errorType, errorDetail, errorInfo) => {
        console.error('FLV player error:', errorType, errorDetail, errorInfo);
        if (flvPlayerRef.current) {
          flvPlayerRef.current.destroy();
          flvPlayerRef.current = null;
        }
        
        if (streamingRetryCount < 10) {
          const newRetryCount = streamingRetryCount + 1;
          setStreamingRetryCount(newRetryCount);
          setStreamingLoading(true);
          console.log(`Retrying to load stream (attempt ${newRetryCount}/10) in 3 seconds...`);
          streamingRetryTimeoutRef.current = setTimeout(() => {
            if (selectedChannel > 0) {
              loadVideoStream(selectedChannel, newRetryCount, false);
            }
          }, 3000);
        } else {
          setStreamingError('Failed to load video file after multiple attempts');
          setStreamingLoading(false);
        }
      });

      flvPlayer.on(flvjs.Events.LOADING_COMPLETE, () => {
        console.log('FLV stream loaded successfully');
        setStreamingLoading(false);
        setStreamingRetryCount(0);
      });

      flvPlayer.on(flvjs.Events.MEDIA_INFO, (mediaInfo) => {
        console.log('FLV media info received:', mediaInfo);
        setStreamingLoading(false);
        setStreamingRetryCount(0);
      });

      flvPlayer.on(flvjs.Events.STATISTICS_INFO, () => {
        if (streamingLoading) {
          setStreamingLoading(false);
          setStreamingRetryCount(0);
        }
      });

      flvPlayer.attachMediaElement(videoElement);
      flvPlayerRef.current = flvPlayer;
      
      console.log('FLV player attached, calling load()...');
      try {
        flvPlayer.load();
        console.log('flvPlayer.load() called - network request should appear in browser network tab');
      } catch (loadError) {
        console.error('Error calling flvPlayer.load():', loadError);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [streamingVideoUrl, selectedChannel, streamingRetryCount, streamingLoading, loadVideoStream, getDeviceModel, getApiTemplate]);

  // Cleanup on unmount or when switching channels
  useEffect(() => {
    return () => {
      if (streamingRetryTimeoutRef.current) {
        clearTimeout(streamingRetryTimeoutRef.current);
      }
      if (flvPlayerRef.current) {
        flvPlayerRef.current.destroy();
        flvPlayerRef.current = null;
      }
    };
  }, [selectedChannel]);


  // Reset tab when modal opens to first enabled tab (only on initial open, not when switching channels)
  const modalOpenedRef = useRef(false);
  useEffect(() => {
    if (moreDetailsModalOpen && device) {
      const hasIoTHub = !!device.attributes?.iothub;
      const hasHikiVision = !!device.attributes?.hikivision;
      
      // Only reset if this is the first time opening the modal (not when already open)
      if (!modalOpenedRef.current) {
        modalOpenedRef.current = true;
        
        // Reset to first enabled tab
        if (hasIoTHub) {
          setMoreDetailsActiveTab(0);
          setSelectedChannel(0); // Reset to Playback tab
          // Reset video list dates to today
          setVideoListStartDate(dayjs().startOf('day').format('YYYY-MM-DDTHH:mm'));
          setVideoListEndDate(dayjs().endOf('day').format('YYYY-MM-DDTHH:mm'));
          // Set all channels as selected by default
          const allChannels = Array.from({ length: getIoTHubChannels }, (_, i) => (i + 1).toString());
          setVideoListSelectedChannels(allChannels.length > 0 ? allChannels : ['1']);
          setVideoListSelectedStatuses(['uploaded_ok', 'not_uploaded', 'upload_errored', 'pending']);
          setVideosCurrentPage(1); // Reset to first page
          // Fetch videos when modal opens
          fetchVideos();
        } else if (hasHikiVision) {
          setMoreDetailsActiveTab(1);
        }
      }
    } else if (!moreDetailsModalOpen) {
      // Reset flag when modal closes
      modalOpenedRef.current = false;
      // Cleanup streaming when modal closes
      console.log('Cleaning up streaming - modal closed');
      if (streamingRetryTimeoutRef.current) {
        clearTimeout(streamingRetryTimeoutRef.current);
        streamingRetryTimeoutRef.current = null;
      }
      if (flvPlayerRef.current) {
        flvPlayerRef.current.destroy();
        flvPlayerRef.current = null;
      }
      setStreamingVideoUrl(null);
      setStreamingLoading(false);
      setStreamingError(null);
      setStreamingRetryCount(0);
      setSelectedChannel(0);
      // Clear videos list to prevent showing old device's videos when switching devices
      setVideos([]);
      setVideosTotalCount(0);
    }
  }, [moreDetailsModalOpen, device?.id, getIoTHubChannels]); // Only depend on device.id, not the whole device object

  // Filter and sort videos by selected channels and statuses
  const filteredVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    
    // Filter videos
    let filtered = videos;
    if (videoListSelectedChannels.length > 0 || videoListSelectedStatuses.length > 0) {
      filtered = videos.filter(video => {
        const channelMatch = videoListSelectedChannels.length === 0 || 
          videoListSelectedChannels.includes(String(video.channel)) ||
          videoListSelectedChannels.includes(video.channel?.toString());
        const statusMatch = videoListSelectedStatuses.length === 0 || 
          videoListSelectedStatuses.includes(video.status);
        return channelMatch && statusMatch;
      });
    }
    
    // Sort by beginTime ascending
    filtered = [...filtered].sort((a, b) => {
      if (!a.beginTime && !b.beginTime) return 0;
      if (!a.beginTime) return 1;
      if (!b.beginTime) return -1;
      try {
        const timeA = dayjs(a.beginTime, 'YYYY-MM-DD HH:mm:ss').valueOf();
        const timeB = dayjs(b.beginTime, 'YYYY-MM-DD HH:mm:ss').valueOf();
        return timeA - timeB;
      } catch {
        return a.beginTime.localeCompare(b.beginTime);
      }
    });
    
    return filtered;
  }, [videos, videoListSelectedChannels, videoListSelectedStatuses]);

  // Reset to first page when filters change
  useEffect(() => {
    setVideosCurrentPage(1);
  }, [videoListSelectedChannels, videoListSelectedStatuses]);

  // Initialize all channels as selected when device is available
  useEffect(() => {
    if (device) {
      const deviceModel = getDeviceModel;
      
      // For jc400, use channels from videos (event-based, channels can be any number)
      // Only initialize if no channels are selected yet
      if (deviceModel === 'jc400') {
        const videoChannels = [...new Set(videos.map(v => String(v.channel)).filter(Boolean))];
        if (videoChannels.length > 0 && videoListSelectedChannels.length === 0) {
          // Only set if no channels are selected yet (initial load)
          setVideoListSelectedChannels(videoChannels);
        }
      } else if (getIoTHubChannels > 0) {
        // For other devices (jc181), use configured channels
        // Get unique channels from videos to ensure we include all channels
        const videoChannels = [...new Set(videos.map(v => String(v.channel)).filter(Boolean))];
        if (videoChannels.length > 0 && videoListSelectedChannels.length === 0) {
          // Use channels from videos, or fallback to configured channels
          const channelsToSelect = videoChannels.length > 0 ? videoChannels : 
            Array.from({ length: getIoTHubChannels }, (_, i) => (i + 1).toString());
          setVideoListSelectedChannels(channelsToSelect);
        }
      }
    }
  }, [device, getIoTHubChannels, videos, getDeviceModel, videoListSelectedChannels.length]);

  // Handle Escape key to close video player
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showVideoPlayer) {
        if (isFullscreen) {
          // Exit fullscreen first
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          }
        } else {
          setShowVideoPlayer(false);
          setSelectedVideo(null);
          // Clear videos list to prevent showing old device's videos when switching devices
          setVideos([]);
          setVideosTotalCount(0);
        }
      }
    };
    
    if (showVideoPlayer) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showVideoPlayer, isFullscreen]);

  // Disable fullscreen button on video
  useEffect(() => {
    if (videoRef.current && showVideoPlayer) {
      const video = videoRef.current;
      
      // Prevent fullscreen via CSS (for browsers that don't support controlsList)
      const style = document.createElement('style');
      style.id = 'disable-video-fullscreen';
      style.textContent = `
        video::-webkit-media-controls-fullscreen-button {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
      
      // Prevent fullscreen via JavaScript
      const handleFullscreenRequest = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      video.addEventListener('webkitbeginfullscreen', handleFullscreenRequest);
      
      const handleFullscreenChange = () => {
        if (document.fullscreenElement === video || 
            document.webkitFullscreenElement === video ||
            document.mozFullScreenElement === video ||
            document.msFullscreenElement === video) {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          }
        }
      };
      
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);
      
      // Override fullscreen methods
      const originalRequestFullscreen = video.requestFullscreen;
      const originalWebkitRequestFullscreen = video.webkitRequestFullscreen;
      const originalMozRequestFullscreen = video.mozRequestFullScreen;
      const originalMsRequestFullscreen = video.msRequestFullscreen;
      
      video.requestFullscreen = () => {};
      if (video.webkitRequestFullscreen) video.webkitRequestFullscreen = () => {};
      if (video.mozRequestFullScreen) video.mozRequestFullScreen = () => {};
      if (video.msRequestFullscreen) video.msRequestFullscreen = () => {};
      
      return () => {
        const existingStyle = document.getElementById('disable-video-fullscreen');
        if (existingStyle) {
          document.head.removeChild(existingStyle);
        }
        video.removeEventListener('webkitbeginfullscreen', handleFullscreenRequest);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        video.requestFullscreen = originalRequestFullscreen;
        if (originalWebkitRequestFullscreen) video.webkitRequestFullscreen = originalWebkitRequestFullscreen;
        if (originalMozRequestFullscreen) video.mozRequestFullScreen = originalMozRequestFullscreen;
        if (originalMsRequestFullscreen) video.msRequestFullscreen = originalMsRequestFullscreen;
      };
    }
  }, [showVideoPlayer]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredVideos.length / videosPerPage);
  const paginatedVideos = useMemo(() => {
    const startIndex = (videosCurrentPage - 1) * videosPerPage;
    const endIndex = startIndex + videosPerPage;
    return filteredVideos.slice(startIndex, endIndex);
  }, [filteredVideos, videosCurrentPage, videosPerPage]);

  // Helper function to get sensor display name (custom name takes precedence)
  const getSensorDisplayName = useCallback((sensorKey) => {
    // Check for custom sensor name first
    if (device?.attributes?.customSensors) {
      try {
        const customSensors = JSON.parse(device.attributes.customSensors);
        if (customSensors[sensorKey]) {
          return customSensors[sensorKey];
        }
      } catch (error) {
        console.error('Error parsing customSensors:', error);
      }
    }
    
    // Fall back to original translation
    return positionAttributes[sensorKey]?.name || sensorKey;
  }, [device, positionAttributes]);
  
  // Sync local state with Redux state
  useEffect(() => {
    setCurrentReplayIndex(reduxCurrentReplayIndex);
  }, [reduxCurrentReplayIndex]);

  // Memoize position to ensure it updates when replay position changes
  const position = useMemo(() => {
    if (showReplayPopover && replayPositions[currentReplayIndex]) {
      return replayPositions[currentReplayIndex];
    }
    return selectedDeviceId ? positions[selectedDeviceId] : null;
  }, [showReplayPopover, replayPositions, currentReplayIndex, selectedDeviceId, positions]);


  // Check for existing anchor when device changes
  useEffect(() => {
    const checkAnchorStatus = async () => {
      if (!selectedDeviceId) {
        setIsAnchored(false);
        setAnchorGeofenceId(null);
        return;
      }

      try {
        const anchorKey = `anchor_${selectedDeviceId}`;
        const geofenceId = await localStorageAsync.getItem(anchorKey);
        
        if (geofenceId) {
          setIsAnchored(true);
          setAnchorGeofenceId(geofenceId);
        } else {
          setIsAnchored(false);
          setAnchorGeofenceId(null);
        }
      } catch (error) {
        console.error('Error checking anchor status:', error);
        setIsAnchored(false);
        setAnchorGeofenceId(null);
      }
    };

    checkAnchorStatus();
  }, [selectedDeviceId]);
  
  

  const handleMoreDetails = useCallback(async () => {
    if (!position || !position.id) return;
    
    setShowDetailsModal(true);
    setIsLoadingDetails(true);
    setDetailedPosition(null);
    
    try {
      const response = await fetch(`/api/positions?id=${position.id}`);
      if (response.ok) {
        const positions = await response.json();
        if (positions.length > 0) {
          setDetailedPosition(positions[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching position details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [position]);
  


  const handleEditField = useCallback((field, currentValue) => {
    if (field === 'hours') {
      setEditValue((currentValue / 3600000).toFixed(2));
    } else if (field === 'totalDistance') {
      setEditValue(distanceFromMeters(currentValue, distanceUnit).toFixed(2));
    }
    setEditField(field);
    setShowEditModal(true);
  }, [distanceUnit]);

  const handleOpenSensorEdit = useCallback(() => {
    if (!position || !device) return;
    
    // Initialize sensor names with current values
    const initialSensorNames = {};
    
    // Load regular sensors from positionItems
    positionItems.split(',').filter((key) => key && key !== 'address' && (position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key))).forEach((key) => {
      initialSensorNames[key] = positionAttributes[key]?.name || key;
    });
    
    // Load custom sensors from device attributes
    if (device.attributes?.customSensors) {
      try {
        const customSensors = JSON.parse(device.attributes.customSensors);
        Object.keys(customSensors).forEach((key) => {
          initialSensorNames[key] = customSensors[key];
        });
      } catch (error) {
        console.error('Error parsing customSensors:', error);
      }
    }
    
    setSensorNames(initialSensorNames);
    setSensorEditModalOpen(true);
  }, [position, positionItems, positionAttributes, device]);

  const handleSensorNameChange = useCallback((sensorKey, newName) => {
    setSensorNames(prev => ({
      ...prev,
      [sensorKey]: newName
    }));
  }, []);

  const handleDeleteCustomSensor = useCallback((sensorKey) => {
    setSensorNames(prev => {
      const newSensorNames = { ...prev };
      
      // Check if this is an existing sensor (in positionItems) or a custom sensor
      const isExistingSensor = positionItems.split(',').includes(sensorKey);
      
      if (isExistingSensor) {
        // For existing sensors, reset to default value instead of removing
        newSensorNames[sensorKey] = positionAttributes[sensorKey]?.name || sensorKey;
      } else {
        // For custom sensors, remove them completely
        delete newSensorNames[sensorKey];
      }
      
      return newSensorNames;
    });
  }, [positionItems, positionAttributes]);

  const handleImportSensors = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.tpl';
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            // First, decode base64 with proper UTF-8 handling
            let jsonData;
            try {
              const base64Data = e.target.result;
              const decodedData = atob(base64Data);
              // Properly handle UTF-8 characters
              const utf8Data = decodeURIComponent(escape(decodedData));
              jsonData = JSON.parse(utf8Data);
            } catch {
              showSnackbar(t('invalidTplFileFormat'), 'error');
              return;
            }
            
            // Validate the structure - should be an object with string values
            if (typeof jsonData !== 'object' || jsonData === null || Array.isArray(jsonData)) {
              showSnackbar('Invalid JSON structure. Expected an object with sensor names.', 'error');
              return;
            }
            
            // Check if all values are strings
            const invalidKeys = Object.entries(jsonData).filter(([, value]) => typeof value !== 'string');
            if (invalidKeys.length > 0) {
              showSnackbar('Invalid sensor data. All sensor names must be strings.', 'error');
              return;
            }
            
            
            if (!position || !device) {
              showSnackbar('No device data available for import.', 'error');
              return;
            }
            
            setSavingSensors(true);
            
            try {
              // Save the imported data to the device
              const updatedDevice = {
                ...device,
                attributes: {
                  ...device.attributes,
                  customSensors: JSON.stringify(jsonData)
                }
              };
              
              // PUT the updated device to the API
              const response = await fetch(`/api/devices/${device.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedDevice)
              });
              
              if (!response.ok) {
                throw new Error(`Failed to save imported sensors: ${response.statusText}`);
              }
              
              // Update the device in the store
              dispatch(devicesActions.update([updatedDevice]));
              
              // Revalidate by fetching the latest device data
              const revalidateResponse = await fetch(`/api/devices/${device.id}`);
              if (!revalidateResponse.ok) {
                throw new Error(`Failed to revalidate device data: ${revalidateResponse.statusText}`);
              }
              
              const revalidatedDevice = await revalidateResponse.json();
              
              // Update sensor names with imported data
              setSensorNames(prev => ({
                ...prev,
                ...jsonData
              }));
              
              showSnackbar(t('customSensorsImportedSuccessfully'), 'success');
              
            } catch (error) {
              console.error('Error saving imported sensors:', error);
              showSnackbar(`Error saving imported sensors: ${error.message}`, 'error');
            } finally {
              setSavingSensors(false);
            }
          } catch (error) {
            console.error('Error processing .tpl file:', error);
            showSnackbar('Error processing .tpl file. Please check the file format.', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [position, device, dispatch, showSnackbar]);

  const handleExportSensors = useCallback(async () => {
    if (!position || !device) {
      showSnackbar('No device data available for export.', 'error');
      return;
    }
    
    setSavingSensors(true);
    
    try {
      // First, save any current changes
      let finalCustomSensors = {};
      
      // Get current custom sensors from device
      let currentCustomSensors = {};
      if (device.attributes?.customSensors) {
        try {
          currentCustomSensors = JSON.parse(device.attributes.customSensors);
        } catch (error) {
          console.error('Error parsing current customSensors:', error);
        }
      }
      
      // Find sensors that have changed, are new, or were deleted
      const changedSensors = {};
      const positionItemsList = positionItems.split(',');
      
      // Check all sensors in sensorNames for changes
      Object.keys(sensorNames).forEach((key) => {
        const currentName = positionAttributes[key]?.name || key;
        const newName = sensorNames[key];
        
        // Include if the name has changed (regardless of whether it's existing or new)
        const isChanged = newName && newName !== currentName;
        
        if (isChanged) {
          changedSensors[key] = newName;
        }
      });
      
      // Create final customSensors object (include all changed sensors, exclude resets)
      Object.keys(changedSensors).forEach((key) => {
        finalCustomSensors[key] = changedSensors[key];
      });
      
      // Also include any existing custom sensors that weren't changed or deleted
      Object.keys(currentCustomSensors).forEach((key) => {
        if (!changedSensors.hasOwnProperty(key) && sensorNames.hasOwnProperty(key)) {
          // Check if this sensor was reset to default
          const currentName = positionAttributes[key]?.name || key;
          const newName = sensorNames[key];
          const isExistingSensor = positionItemsList.includes(key);
          
          // Only keep it if it's not an existing sensor reset to default
          if (!(isExistingSensor && newName === currentName)) {
            finalCustomSensors[key] = currentCustomSensors[key];
          }
        }
      });
      
      // If there are changes, save them first
      if (Object.keys(changedSensors).length > 0 || Object.keys(currentCustomSensors).length > 0) {
        // Create updated device object with customSensors
        const updatedDevice = {
          ...device,
          attributes: {
            ...device.attributes,
            customSensors: JSON.stringify(finalCustomSensors)
          }
        };
        
        // PUT the updated device to the API
        const response = await fetch(`/api/devices/${device.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedDevice)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save sensors: ${response.statusText}`);
        }
        
        // Update the device in the store
        dispatch(devicesActions.update([updatedDevice]));
        
      }
      
      // Revalidate by fetching the latest device data
      const revalidateResponse = await fetch(`/api/devices/${device.id}`);
      if (!revalidateResponse.ok) {
        throw new Error(`Failed to revalidate device data: ${revalidateResponse.statusText}`);
      }
      
      const revalidatedDevice = await revalidateResponse.json();
      
      // Get the latest customSensors from revalidated data
      let latestCustomSensors = {};
      if (revalidatedDevice.attributes?.customSensors) {
        try {
          latestCustomSensors = JSON.parse(revalidatedDevice.attributes.customSensors);
        } catch (error) {
          console.error('Error parsing revalidated customSensors:', error);
          latestCustomSensors = finalCustomSensors; // Fallback to what we just saved
        }
      }
      
      // If no custom sensors exist, show error
      if (Object.keys(latestCustomSensors).length === 0) {
        showSnackbar(t('noCustomSensorsToExport'), 'error');
        return;
      }
      
      // Now download the file as base64 encoded .tpl
      const dataStr = JSON.stringify(latestCustomSensors, null, 2);
      const base64Data = btoa(unescape(encodeURIComponent(dataStr)));
      const dataBlob = new Blob([base64Data], { type: 'text/plain; charset=utf-8' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `customSensors_${device.name || 'device'}_${new Date().toISOString().split('T')[0]}.tpl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showSnackbar(t('customSensorsExportedSuccessfully'), 'success');
      
    } catch (error) {
      console.error('Error exporting sensors:', error);
      showSnackbar(`Error exporting sensors: ${error.message}`, 'error');
    } finally {
      setSavingSensors(false);
    }
  }, [position, device, positionItems, positionAttributes, sensorNames, dispatch, showSnackbar]);

  const handleSaveSensorEdit = useCallback(async () => {
    if (!position || !device) return;
    
    // Get current custom sensors from device
    let currentCustomSensors = {};
    if (device.attributes?.customSensors) {
      try {
        currentCustomSensors = JSON.parse(device.attributes.customSensors);
      } catch (error) {
        console.error('Error parsing current customSensors:', error);
      }
    }
    
    // Find sensors that have changed, are new, or were deleted
    const changedSensors = {};
    const positionItemsList = positionItems.split(',');
    
    // Check all sensors in sensorNames for changes
    Object.keys(sensorNames).forEach((key) => {
      const currentName = positionAttributes[key]?.name || key;
      const newName = sensorNames[key];
      
      // Include if the name has changed (regardless of whether it's existing or new)
      const isChanged = newName && newName !== currentName;
      
      if (isChanged) {
        changedSensors[key] = newName;
      }
    });
    
    // Check for sensors that were reset to default (should be removed from customSensors)
    Object.keys(sensorNames).forEach((key) => {
      const currentName = positionAttributes[key]?.name || key;
      const newName = sensorNames[key];
      const isExistingSensor = positionItemsList.includes(key);
      
      // If it's an existing sensor and the name matches the default, it was reset
      if (isExistingSensor && newName === currentName) {
      }
    });
    
    // Check for deleted custom sensors (were in customSensors but not in sensorNames)
    Object.keys(currentCustomSensors).forEach((key) => {
      if (!sensorNames.hasOwnProperty(key)) {
        // This sensor was deleted, we'll handle it by not including it in the final customSensors
      }
    });
    
    // If no changes, just close the modal
    if (Object.keys(changedSensors).length === 0 && Object.keys(currentCustomSensors).length === 0) {
      setSensorEditModalOpen(false);
      setSensorNames({});
      return;
    }
    
    setSavingSensors(true);
    
    try {
      // Create final customSensors object (include all changed sensors, exclude resets)
      const finalCustomSensors = {};
      
      // Include all changed sensors (both existing and new)
      Object.keys(changedSensors).forEach((key) => {
        finalCustomSensors[key] = changedSensors[key];
      });
      
      // Also include any existing custom sensors that weren't changed or deleted
      Object.keys(currentCustomSensors).forEach((key) => {
        if (!changedSensors.hasOwnProperty(key) && sensorNames.hasOwnProperty(key)) {
          // Check if this sensor was reset to default
          const currentName = positionAttributes[key]?.name || key;
          const newName = sensorNames[key];
          const isExistingSensor = positionItemsList.includes(key);
          
          // Only keep it if it's not an existing sensor reset to default
          if (!(isExistingSensor && newName === currentName)) {
            finalCustomSensors[key] = currentCustomSensors[key];
          }
        }
      });
      
      // Create updated device object with customSensors
      const updatedDevice = {
        ...device,
        attributes: {
          ...device.attributes,
          customSensors: JSON.stringify(finalCustomSensors)
        }
      };
      
      
      // PUT the updated device to the API
      const response = await fetch(`/api/devices/${device.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDevice)
      });

      if (!response.ok) {
        throw new Error(`Failed to update device: ${response.statusText}`);
      }

      // Revalidate the device data
      await queryClient.invalidateQueries(['devices']);
      await queryClient.invalidateQueries(['device', device.id]);


      setSensorEditModalOpen(false);
      setSensorNames({});

    } catch (error) {
      console.error('Error updating device:', error);
      showSnackbar('Failed to save sensor changes', 'error');
    } finally {
      setSavingSensors(false);
    }
  }, [sensorNames, position, positionItems, positionAttributes, device, queryClient, showSnackbar]);

  const handleAddSensor = useCallback(() => {
    if (!selectedNewSensor || !newSensorName) return;
    
    // Add the new sensor to the sensorNames
    setSensorNames(prev => ({
      ...prev,
      [selectedNewSensor]: newSensorName
    }));
    
    // Reset the add sensor form
    setSelectedNewSensor('');
    setNewSensorName('');
    setAddSensorModalOpen(false);
  }, [selectedNewSensor, newSensorName]);

  const handleOpenAddSensor = useCallback(() => {
    setSelectedNewSensor('');
    setNewSensorName('');
    setSensorSearchTerm('');
    setShowSensorDropdown(false);
    setAddSensorModalOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!device?.id || !editField) return;
    
    setIsSaving(true);
    try {
      const item = {
        deviceId: device.id,
        hours: position?.attributes?.hours || 0,
        totalDistance: position?.attributes?.totalDistance || 0,
      };
      
      if (editField === 'hours') {
        item.hours = Number(editValue) * 3600000;
      } else if (editField === 'totalDistance') {
        item.totalDistance = distanceToMeters(Number(editValue), distanceUnit);
      }
      
      await fetchOrThrow(`/api/devices/${device.id}/accumulators`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      
      setShowEditModal(false);
      setEditField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving accumulator:', error);
    } finally {
      setIsSaving(false);
    }
  }, [device?.id, editField, editValue, position?.attributes, distanceUnit]);
  
  // Refresh geofences list and map
  const refreshGeofences = useCallback(async () => {
    try {
      const response = await fetchOrThrow('/api/geofences');
      const geofences = await response.json();
      dispatch(geofencesActions.refresh(geofences));
      
      // Invalidate TanStack Query to refresh FloatingGeofencesPopover
      queryClient.invalidateQueries(['geofences']);
    } catch (error) {
      console.error('Error refreshing geofences:', error);
    }
  }, [dispatch, queryClient]);

  // Anchor button handlers
  const handleCreateAnchor = useCallback(async () => {
    if (!selectedDeviceId || !position || !device) return;

    setIsAnchorLoading(true);
    try {
      // Get current position
      const lat = position.latitude;
      const lon = position.longitude;

      // Create geofence
      const geofencePayload = {
        name: `Anchor for ${device.name}`,
        area: `CIRCLE (${lat} ${lon}, 50)`
      };

      const geofenceResponse = await fetchOrThrow('/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geofencePayload),
      });

      const geofence = await geofenceResponse.json();

      // Create permission
      const permissionPayload = {
        deviceId: selectedDeviceId,
        geofenceId: geofence.id
      };

      try {
        await fetchOrThrow('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(permissionPayload),
        });
      } catch (permissionError) {
        // If permission creation fails, clean up the geofence
        try {
          await fetchOrThrow(`/api/geofences/${geofence.id}`, {
            method: 'DELETE',
          });
        } catch (cleanupError) {
          console.error('Error cleaning up geofence after permission failure:', cleanupError);
        }
        throw permissionError;
      }

      // Save to localStorage
      const anchorKey = `anchor_${selectedDeviceId}`;
      await localStorageAsync.setItem(anchorKey, geofence.id);

      // Update state
      setIsAnchored(true);
      setAnchorGeofenceId(geofence.id);

      // Refresh geofences list and map
      await refreshGeofences();

    } catch (error) {
      console.error('Error creating anchor:', error);
    } finally {
      setIsAnchorLoading(false);
    }
  }, [selectedDeviceId, position, device, refreshGeofences]);

  const handleDeleteAnchor = useCallback(async () => {
    if (!selectedDeviceId || !anchorGeofenceId) return;

    setIsAnchorLoading(true);
    try {
      // Delete geofence
      await fetchOrThrow(`/api/geofences/${anchorGeofenceId}`, {
        method: 'DELETE',
      });

      // Remove from localStorage
      const anchorKey = `anchor_${selectedDeviceId}`;
      await localStorageAsync.removeItem(anchorKey);

      // Update state
      setIsAnchored(false);
      setAnchorGeofenceId(null);

      // Refresh geofences list and map
      await refreshGeofences();

    } catch (error) {
      console.error('Error deleting anchor:', error);
    } finally {
      setIsAnchorLoading(false);
    }
  }, [selectedDeviceId, anchorGeofenceId, refreshGeofences]);

  const handleAnchorClick = useCallback(() => {
    if (isAnchored) {
      handleDeleteAnchor();
    } else {
      handleCreateAnchor();
    }
  }, [isAnchored, handleCreateAnchor, handleDeleteAnchor]);

  // Helper function to get custom commands from device attributes
  const getCustomCommands = useCallback((device) => {
    if (!device?.attributes?.customCommands) return null;
    
    try {
      return JSON.parse(device.attributes.customCommands);
    } catch (error) {
      console.error('Error parsing customCommands:', error);
      return null;
    }
  }, []);

  // Lock open confirmation handlers
  const confirmLockOpen = useCallback(async () => {
    setShowLockOpenConfirmation(false);
    
    if (!selectedDeviceId || !device) return;

    setIsLockOpenLoading(true);
    try {
      const customCommands = getCustomCommands(device);
      let commandType = 'engineResume';
      let successMessage = t('commandQueued');

      // Check if custom command exists
      if (customCommands?.engineResume) {
        commandType = customCommands.engineResume;
        successMessage = `${t('commandQueued')}: ${customCommands.engineResume}`;
      }

      const commandPayload = {
        type: commandType,
        attributes: {},
        deviceId: selectedDeviceId
      };

      const response = await fetchOrThrow('/api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandPayload),
      });

      if (response.ok) {
        // Show success message with custom command info if applicable
        setSuccessMessage(successMessage);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
    } catch (error) {
      console.error('Error sending engineResume command:', error);
      dispatch(errorsActions.push(error.message));
    } finally {
      setIsLockOpenLoading(false);
    }
  }, [selectedDeviceId, device, getCustomCommands, t, dispatch]);

  const cancelLockOpen = useCallback(() => {
    setShowLockOpenConfirmation(false);
  }, []);

  // Lock closed confirmation handlers
  const confirmLockClosed = useCallback(async () => {
    setShowLockClosedConfirmation(false);
    
    if (!selectedDeviceId || !device) return;

    setIsLockClosedLoading(true);
    try {
      const customCommands = getCustomCommands(device);
      let commandType = 'engineStop';
      let successMessage = t('commandQueued');

      // Check if custom command exists
      if (customCommands?.engineStop) {
        commandType = customCommands.engineStop;
        successMessage = `${t('commandQueued')}: ${customCommands.engineStop}`;
      }

      const commandPayload = {
        type: commandType,
        attributes: {},
        deviceId: selectedDeviceId
      };

      const response = await fetchOrThrow('/api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandPayload),
      });

      if (response.ok) {
        // Show success message with custom command info if applicable
        setSuccessMessage(successMessage);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
    } catch (error) {
      console.error('Error sending engineStop command:', error);
      dispatch(errorsActions.push(error.message));
    } finally {
      setIsLockClosedLoading(false);
    }
  }, [selectedDeviceId, device, getCustomCommands, t, dispatch]);

  const cancelLockClosed = useCallback(() => {
    setShowLockClosedConfirmation(false);
  }, []);

  // Lock open button handler - show confirmation dialog
  const handleLockOpen = useCallback(() => {
    if (!selectedDeviceId || !device) return;
    setShowLockOpenConfirmation(true);
  }, [selectedDeviceId, device]);

  // Lock closed button handler - show confirmation dialog
  const handleLockClosed = useCallback(() => {
    if (!selectedDeviceId || !device) return;
    setShowLockClosedConfirmation(true);
  }, [selectedDeviceId, device]);

  // Device image upload handler
  const handleImageUpload = useCatch(async (event) => {
    const file = event.target.files[0];
    if (!file || !device?.id) return;
    
    // Reset file input value to allow same file selection again
    event.target.value = '';

    // Validate file
    const validation = validateImageFile(file, 120); // 120KB max input
    if (!validation.success) {
      showSnackbar(validation.message, 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      // Compress the image to target size (10-15KB)
      const compressedFile = await compressImage(file, {
        maxSizeKB: 15,
        minSizeKB: 10,
        maxWidth: 800,
        maxHeight: 600,
        outputFormat: 'image/jpeg',
        initialQuality: 0.8
      });

      // Upload the compressed image to get the image URL
      const response = await fetchOrThrow(`/api/devices/${device.id}/image`, {
        method: 'POST',
        body: compressedFile,
      });
      
      const imageUrl = await response.text();
      
      // Update device attributes with new image
      const updatedDeviceData = {
        ...device,
        attributes: {
          ...device.attributes,
          deviceImage: imageUrl
        }
      };
      
      // Save the full device payload to the database
      await fetchOrThrow(`/api/devices/${device.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDeviceData),
      });
      
      // Update Redux store
      dispatch(devicesActions.update([updatedDeviceData]));
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries(['devices']);
      
      // Show success message with compression info
      const originalSizeKB = (file.size / 1024).toFixed(1);
      const compressedSizeKB = (compressedFile.size / 1024).toFixed(1);
      showSnackbar(
        t('deviceImageCompressedSuccess', { originalSize: originalSizeKB, compressedSize: compressedSizeKB }), 
        'success'
      );
    } catch (error) {
      console.error('Error uploading device image:', error);
      showSnackbar(t('deviceImageUploadError'), 'error');
    } finally {
      setIsUploadingImage(false);
    }
  });

  // Clear replay positions when device selection changes
  useEffect(() => {
    dispatch(sessionActions.updateReplayPositions([]));
    setCurrentReplayIndex(0);
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [selectedDeviceId, dispatch]);

  // Replay form handlers
  const handleReplayShow = useCallback(async () => {
    if (!replayDeviceId) return;

    setReplayLoading(true);
    dispatch(sessionActions.updateReplayPositions([])); // Clear previous positions when starting new search
    setCurrentReplayIndex(0);
    dispatch(sessionActions.updateCurrentReplayIndex(0));
    setIsPlaying(false);
    try {
      let selectedFrom;
      let selectedTo;
      
      switch (period) {
        case 'today':
          selectedFrom = dayjs().startOf('day');
          selectedTo = dayjs().endOf('day');
          break;
        case 'yesterday':
          selectedFrom = dayjs().subtract(1, 'day').startOf('day');
          selectedTo = dayjs().subtract(1, 'day').endOf('day');
          break;
        case 'thisWeek':
          selectedFrom = dayjs().startOf('week');
          selectedTo = dayjs().endOf('week');
          break;
        case 'previousWeek':
          selectedFrom = dayjs().subtract(1, 'week').startOf('week');
          selectedTo = dayjs().subtract(1, 'week').endOf('week');
          break;
        case 'thisMonth':
          selectedFrom = dayjs().startOf('month');
          selectedTo = dayjs().endOf('month');
          break;
        case 'previousMonth':
          selectedFrom = dayjs().subtract(1, 'month').startOf('month');
          selectedTo = dayjs().subtract(1, 'month').endOf('month');
          break;
        default:
          selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
          selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
          break;
      }

      const query = new URLSearchParams({
        deviceId: replayDeviceId,
        from: selectedFrom.toISOString(),
        to: selectedTo.toISOString()
      });

      
      const response = await fetchOrThrow(`/api/positions?${query.toString()}`);
      const positions = await response.json();
      
             
             // Store positions for map plotting
             dispatch(sessionActions.updateReplayPositions(positions));
             
             if (!positions.length) {
               // No positions available
             }
      
    } catch (error) {
      console.error('Error fetching replay data:', error);
    } finally {
      setReplayLoading(false);
    }
  }, [replayDeviceId, period, customFrom, customTo, dispatch]);

  // Replay control handlers
  const handlePlay = useCallback(() => {
    if (!replayPositions.length || isPlaying) return;
    
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentReplayIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= replayPositions.length) {
          setIsPlaying(false);
          return prevIndex; // Stay at last position
        }
        // Update Redux state
        dispatch(sessionActions.updateCurrentReplayIndex(nextIndex));
        return nextIndex;
      });
    }, 1000 / playbackSpeed);
  }, [replayPositions, isPlaying, playbackSpeed, dispatch]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);


  // Screenshot handler
  const handleScreenshot = useCallback(async () => {
    if (!replayPositions.length || isScreenshotting) return;
    
    setIsScreenshotting(true);
    
    try {
      // Calculate bounding box from all replay positions
      const lngs = replayPositions.map(p => p.longitude);
      const lats = replayPositions.map(p => p.latitude);
      
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      
      // Calculate tighter bounds with minimal padding
      const lngRange = maxLng - minLng;
      const latRange = maxLat - minLat;
      
      // Use a percentage of the route size for padding, with minimum values
      const lngPadding = Math.max(lngRange * 0.05, 0.001); // 5% of route width, min 0.001
      const latPadding = Math.max(latRange * 0.05, 0.001); // 5% of route height, min 0.001
      
      const bounds = [
        [minLng - lngPadding, minLat - latPadding], // Southwest corner
        [maxLng + lngPadding, maxLat + latPadding]  // Northeast corner
      ];
      
      // Fit map to the route bounds with minimal padding
      map.fitBounds(bounds, {
        padding: 20, // Reduced padding around the bounds
        duration: 1000 // Animation duration
      });
      
      // Wait for map to finish rendering and fitting
      await new Promise(resolve => {
        map.once('idle', resolve);
        // Also add a timeout as fallback
        setTimeout(resolve, 2000);
      });
      
      // Wait a bit more to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the map canvas
      const canvas = map.getCanvas();
      
      // Check if canvas is ready and has content
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas not ready or has zero dimensions');
      }
      
      // Try to get image data from canvas
      let dataURL;
      try {
        
        // Method 1: Try using map's built-in export functionality
        try {
          // Get the current map style as a static image
          // const style = map.getStyle();
          
          // Try to export the map as a static image
          const mapCanvas = map.getCanvas();
          
          // Force a repaint and wait
          map.triggerRepaint();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to get the canvas as a blob first
          const blob = await new Promise((resolve, reject) => {
            mapCanvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('toBlob returned null'));
              }
            }, 'image/png', 1.0);
          });
          
          if (blob && blob.size > 1000) {
            dataURL = URL.createObjectURL(blob);
          } else {
            throw new Error('Blob too small or null');
          }
          
        } catch (blobError) {
          // Intentionally unused - fallback to Method 2
          console.warn('Blob export failed, trying direct toDataURL:', blobError);
          
          // Method 2: Try direct toDataURL
          const mapCanvas = map.getCanvas();
          dataURL = mapCanvas.toDataURL('image/png', 1.0);
          
          if (dataURL.length < 1000) {
            throw new Error('Direct toDataURL too short');
          }
        }
        
        // Method 3: If still no success, try a different approach
        if (!dataURL || dataURL.length < 1000) {
          
          // Create a new map instance temporarily for export
          const mapContainer = map.getContainer();
          const tempDiv = document.createElement('div');
          tempDiv.style.width = mapContainer.offsetWidth + 'px';
          tempDiv.style.height = mapContainer.offsetHeight + 'px';
          tempDiv.style.position = 'absolute';
          tempDiv.style.top = '-9999px';
          tempDiv.style.left = '-9999px';
          document.body.appendChild(tempDiv);
          
          try {
            // Create a temporary map with the same style and data, fitted to route bounds
            const tempMap = new (await import('maplibre-gl')).Map({
              container: tempDiv,
              style: map.getStyle(),
              center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2], // Center on route
              zoom: map.getZoom(),
              bearing: map.getBearing(),
              pitch: map.getPitch()
            });
            
            // Wait for the temp map to load
            await new Promise(resolve => {
              tempMap.on('idle', resolve);
              setTimeout(resolve, 3000); // Fallback timeout
            });
            
            // Fit the temp map to the same bounds
            tempMap.fitBounds(bounds, {
              padding: 20,
              duration: 0 // No animation for temp map
            });
            
            // Add the same data sources and layers
            // const sources = map.getStyle().sources;
            // const layers = map.getStyle().layers;
            
            // Add replay positions as a source
            tempMap.addSource('replay-positions', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: replayPositions.map(pos => ({
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [pos.longitude, pos.latitude]
                  },
                  properties: {}
                }))
              }
            });
            
            // Add a line layer for the route
            tempMap.addLayer({
              id: 'replay-route',
              type: 'line',
              source: 'replay-positions',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#ff0000',
                'line-width': 3
              }
            });
            
            // Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Capture the temp map
            const tempCanvas = tempMap.getCanvas();
            dataURL = tempCanvas.toDataURL('image/png', 1.0);
            
            // Clean up
            tempMap.remove();
            document.body.removeChild(tempDiv);
            
          } catch (tempMapError) {
            console.error('Temp map method failed:', tempMapError);
            if (tempDiv.parentNode) {
              document.body.removeChild(tempDiv);
            }
          }
        }
        
        if (!dataURL || dataURL.length < 1000) {
          throw new Error('All capture methods failed to produce valid image data');
        }
        
      } catch (canvasError) {
        console.error('All canvas methods failed:', canvasError);
        throw new Error('Failed to capture map screenshot: ' + canvasError.message);
      }
      
      // Create download link
      const link = document.createElement('a');
      link.download = `route-screenshot-${device?.name || 'device'}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataURL;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL if we used it
      if (dataURL.startsWith('blob:')) {
        URL.revokeObjectURL(dataURL);
      }
      
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      alert(`Failed to capture screenshot: ${error.message}`);
    } finally {
      setIsScreenshotting(false);
    }
  }, [replayPositions, device?.name, isScreenshotting]);

  const handleSliderChange = useCallback((event) => {
    const newIndex = parseInt(event.target.value);
    setCurrentReplayIndex(newIndex);
    dispatch(sessionActions.updateCurrentReplayIndex(newIndex));
  }, [dispatch]);

  const handleCloseReplayPopover = useCallback(() => {
    setShowReplayPopover(false);
    
    // Clear all replay-related state variables
    setReplayDeviceId(null);
    setPeriod('today');
    setCustomFrom('');
    setCustomTo('');
    setReplayLoading(false);
    setIsPlaying(false);
    setPlaybackSpeed(1);
    
    // Clear local and Redux replay state
    setCurrentReplayIndex(0);
    dispatch(sessionActions.updateCurrentReplayIndex(0));
    dispatch(sessionActions.updateReplayPositions([]));
    
    // Clear interval if running
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Reopen device list when closing replay popover
    if (onShowDeviceList) {
      onShowDeviceList();
    }
  }, [dispatch, onShowDeviceList]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Hide replay popover when device list is shown
  useEffect(() => {
    if (isDeviceListVisible && showReplayPopover) {
      setShowReplayPopover(false);
    }
  }, [isDeviceListVisible, showReplayPopover, setShowReplayPopover]);

  // Handle replay mode changes - ensure proper data source switching
  useEffect(() => {
    // When exiting replay mode, reset to first position and stop playback
    if (!showReplayPopover && replayPositions.length > 0) {
      setCurrentReplayIndex(0);
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [showReplayPopover, replayPositions.length]);

  // Close replay popover when status card is closed (selectedDeviceId becomes null)
  // But not when we're intentionally entering replay mode (replayDeviceId is set)
  useEffect(() => {
    if (!selectedDeviceId && showReplayPopover && !replayDeviceId) {
      handleCloseReplayPopover();
    }
  }, [selectedDeviceId, showReplayPopover, replayDeviceId, handleCloseReplayPopover]);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10B981';
      case 'offline': return '#EF4444';
      case 'unknown': return '#F59E0B';
      default: return '#6B7280';
    }
  };
  
  
  
  return (
    <>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
    
    {/* Hidden file input for device image upload */}
    <input
      type="file"
      accept="image/*"
      onChange={handleImageUpload}
      style={{ display: 'none' }}
      id="device-image-upload"
      disabled={isUploadingImage}
    />
    <AnimatePresence mode="wait">
      {((selectedDeviceId && device && !showReplayPopover) || (showReplayPopover && replayDeviceId && devices[replayDeviceId])) && (
        <motion.div
          key={`status-card-${selectedDeviceId || replayDeviceId}-${showReplayPopover ? 'replay' : 'normal'}`}
          initial={{ x: !desktop ? 0 : -400, y: !desktop ? 100 : 0, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={{ x: !desktop ? 0 : -400, y: !desktop ? 100 : 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          position: 'fixed',
          top: !desktop ? 'auto' : '8px',
          bottom: !desktop ? '0px' : 'auto',
          left: !desktop ? '0px' : (isDeviceListVisible || showReplayPopover ? (isMenuExpanded ? '510px' : '370px') : (isMenuExpanded ? '200px' : '63px')),
          width: !desktop ? '100vw' : '310px',
          height: !desktop ? '47vh' : 'calc(100vh - 16px)',
          zIndex: 9998,
          pointerEvents: 'auto',
          transition: 'left 0.3s ease'
        }}
      >
        <Card style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: !desktop ? '16px 16px 0px 0px' : (isDeviceListVisible ? '0px 16px 16px 0px' : '0px 16px 16px 0px'),
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          boxShadow: !desktop ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Back Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              
              // If in replay mode, close replay popover (which will also show device list)
              if (showReplayPopover) {
                handleCloseReplayPopover();
              } else {
                // Normal mode: just deselect device
                dispatch(devicesActions.selectId(null));
              }
            }}
            style={{
              position: !desktop ? 'fixed' : 'absolute',
              top: !desktop ? '10px' : '12px',
              left: !desktop ? '10px' : '12px',
              zIndex: !desktop ? 10000 : 10,
              width: !desktop ? '34px' : '32px',
              height: !desktop ? '34px' : '32px',
              borderRadius: !desktop ? '12px' : '0px',
              backgroundColor: !desktop ? colors.surface : 'transparent',
              border: 'none',
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: !desktop ? '0 2px 8px rgba(0, 0, 0, 0.25)' : 'none',
              ...(desktop ? {} : {
                outline: 'none !important',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              })
            }}
          >
            <ChevronLeft size={20} color={colors.textSecondary} />
          </button>

          {/* Reports Button - Hidden in replay mode */}
          {!showReplayPopover && onOpenReports && (
            <button
              onClick={onOpenReports}
              style={{
                position: 'absolute',
                top: !desktop ? '8px' : '12px',
                right: !desktop ? '103px' : '108px',
                zIndex: 10,
                width: '28px',
                height: '28px',
                backgroundColor: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={t('sharedReports') || 'Reports'}
            >
              <PieChart size={18} color={colors.textSecondary} />
            </button>
          )}

          {/* More Details Button - Hidden in replay mode */}
          {!showReplayPopover && !deviceReadonly && hasEditSensorsPermission && (
            <button
              onClick={() => setMoreDetailsModalOpen(true)}
              style={{
                position: 'absolute',
                top: !desktop ? '8px' : '12px',
                right: !desktop ? '71px' : '76px',
                zIndex: 10,
                width: '28px',
                height: '28px',
                backgroundColor: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="More Details"
            >
              <HiOutlinePlay style={{ fontSize: '18px', color: colors.textSecondary }} />
            </button>
          )}

          {/* Sensor Edit Button - Hidden in replay mode */}
          {!showReplayPopover && !deviceReadonly && hasEditSensorsPermission && (
            <button
              onClick={handleOpenSensorEdit}
              style={{
                position: 'absolute',
                top: !desktop ? '8px' : '12px',
                right: !desktop ? '39px' : '44px',
                zIndex: 10,
                width: '28px',
                height: '28px',
                backgroundColor: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Edit Sensors"
            >
              <SensorsOutlinedIcon style={{ fontSize: '18px', color: colors.textSecondary }} />
            </button>
          )}

          {/* Details Button - Hidden in replay mode */}
          {!showReplayPopover && hasMoreInfoPermission && (
            <button
              onClick={handleMoreDetails}
              style={{
                position: 'absolute',
                top: !desktop ? '8px' : '12px',
                right: !desktop ? '7px' : '12px',
                zIndex: 10,
                width: '28px',
                height: '28px',
                backgroundColor: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <InfoOutlinedIcon style={{ fontSize: '18px', color: colors.textSecondary }} />
            </button>
          )}
          
          {/* Header */}
          <div style={{
            padding: '20px',
            backgroundColor: colors.surface
          }}>
            {!desktop ? (
              /* Mobile Layout - 2 Columns */
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* Column 1: Picture and Speed */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '80px', position: 'relative' }}>
                  {/* Device Image */}
                  <div 
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: colors.secondary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: `3px solid ${getStatusColor(device.status)}`,
                      position: 'relative',
                      cursor: device.attributes?.deviceImage ? 'pointer' : 'default'
                    }}
                    onMouseMove={(e) => {
                      if (device.attributes?.deviceImage) {
                        let tooltip = document.getElementById('device-image-tooltip');
                        if (!tooltip) {
                          tooltip = document.createElement('div');
                          tooltip.id = 'device-image-tooltip';
                          tooltip.style.cssText = `
                            position: fixed;
                            z-index: 10000;
                            pointer-events: none;
                            border-radius: 8px;
                            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                            max-width: 300px;
                            max-height: 300px;
                          `;
                          const img = document.createElement('img');
                          img.src = `/api/media/${device.uniqueId}/${device.attributes.deviceImage}`;
                          img.style.cssText = `
                            width: auto;
                            height: auto;
                            max-width: 100%;
                            max-height: 100%;
                            border-radius: 8px;
                            display: block;
                          `;
                          tooltip.appendChild(img);
                          document.body.appendChild(tooltip);
                        }
                        // Position tooltip with top-left anchor at mouse pointer
                        tooltip.style.left = `${e.clientX}px`;
                        tooltip.style.top = `${e.clientY}px`;
                        tooltip.style.transform = 'none';
                      }
                    }}
                    onMouseLeave={() => {
                      const tooltip = document.getElementById('device-image-tooltip');
                      if (tooltip) {
                        tooltip.remove();
                      }
                    }}
                  >
                    <img 
                      style={{ 
                        width: '60px', 
                        height: '60px', 
                        objectFit: 'cover', 
                        borderRadius: '50%',
                        display: device.attributes?.deviceImage ? 'block' : 'none'
                      }} 
                      src={device.attributes?.deviceImage ? `/api/media/${device.uniqueId}/${device.attributes.deviceImage}` : undefined} 
                      alt=""
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div style={{
                      width: '60px',
                      height: '60px',
                      display: device.attributes?.deviceImage ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#E5E7EB',
                      borderRadius: '50%'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Camera Button - Mobile */}
                  {hasChangePicturePermission && (
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: '25%',
                      right: '5%',
                      width: '20px',
                      height: '20px',
                      backgroundColor: isUploadingImage ? colors.textSecondary : colors.primary,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      zIndex: 1000,
                      border: 'none',
                      opacity: isUploadingImage ? 0.7 : 1
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isUploadingImage) {
                        document.getElementById('device-image-upload').click();
                      }
                    }}
                  >
                    {isUploadingImage ? (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        border: `2px solid ${colors.background}`,
                        borderTop: `2px solid ${colors.primary}`,
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="13" r="4" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  )}
                  
                  {/* Speed */}
                  {position && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Gauge size={12} color={colors.textSecondary} />
                      <span style={{ fontSize: '11px', color: colors.textSecondary, fontWeight: '500' }}>
                        {position.speed ? formatSpeed(position.speed, speedUnit, t) : formatSpeed(0, speedUnit, t)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Column 2: Device Name, Status, Address */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Device Name centered */}
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: colors.text,
                    margin: '0 0 8px 0',
                    lineHeight: '1.2',
                    textAlign: 'center',
                    paddingRight: '80px' // Space for buttons
                  }}>
                    {device[devicePrimary]}
                  </h3>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(device.status)
                    }} />
                    <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: '500' }}>
                      {t(`deviceStatus${device.status.charAt(0).toUpperCase() + device.status.slice(1)}`)}
                    </span>
                  </div>

                  {/* Address */}
                  <p style={{
                    fontSize: '12px',
                    color: colors.textSecondary,
                    margin: 0,
                    lineHeight: '1.4'
                  }}>
                    {position?.address || (position?.latitude && position?.longitude ?
                      `${formatCoordinate('latitude', position.latitude, coordinateFormat)}, ${formatCoordinate('longitude', position.longitude, coordinateFormat)}` :
                      t('sharedNoData'))}
                  </p>
                </div>
              </div>
            ) : (
              /* Desktop Layout - Original */
              <>
                {/* Chevron and uniqueId on first line, Device Name below */}
                <div style={{ marginBottom: '16px' }}>
                  {/* Chevron and space for alignment */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    {/* Chevron placeholder for alignment */}
                    <div style={{ width: '20px' }} />
                    
                    {/* Empty space to preserve layout */}
                    <div style={{ flex: 1 }} />
                  </div>

                  {/* Device Name centered */}
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: colors.text,
                    margin: !desktop ? '-30px 0 0 0' : '0',
                    lineHeight: '1.2',
                    textAlign: 'center'
                  }}>
                    {device[devicePrimary]}
                  </h3>
                </div>

            {/* Device Image */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', position: 'relative' }}>
              <div 
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: colors.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: `3px solid ${getStatusColor(device.status)}`,
                  position: 'relative',
                  cursor: device.attributes?.deviceImage ? 'pointer' : 'default'
                }}
                onMouseMove={(e) => {
                  if (device.attributes?.deviceImage) {
                    let tooltip = document.getElementById('device-image-tooltip');
                    if (!tooltip) {
                      tooltip = document.createElement('div');
                      tooltip.id = 'device-image-tooltip';
                      tooltip.style.cssText = `
                        position: fixed;
                        z-index: 10000;
                        pointer-events: none;
                        border-radius: 8px;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                        max-width: 300px;
                        max-height: 300px;
                      `;
                      const img = document.createElement('img');
                      img.src = `/api/media/${device.uniqueId}/${device.attributes.deviceImage}`;
                      img.style.cssText = `
                        width: auto;
                        height: auto;
                        max-width: 100%;
                        max-height: 100%;
                        border-radius: 8px;
                        display: block;
                      `;
                      tooltip.appendChild(img);
                      document.body.appendChild(tooltip);
                    }
                    // Position tooltip with top-left anchor at mouse pointer
                    tooltip.style.left = `${e.clientX}px`;
                    tooltip.style.top = `${e.clientY}px`;
                    tooltip.style.transform = 'none';
                  }
                }}
                onMouseLeave={() => {
                  const tooltip = document.getElementById('device-image-tooltip');
                  if (tooltip) {
                    tooltip.remove();
                  }
                }}
              >
                <img 
                  style={{ 
                    width: '120px', 
                    height: '120px', 
                    objectFit: 'cover', 
                    borderRadius: '50%',
                    display: device.attributes?.deviceImage ? 'block' : 'none'
                  }} 
                  src={device.attributes?.deviceImage ? `/api/media/${device.uniqueId}/${device.attributes.deviceImage}` : undefined} 
                  alt=""
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{
                  width: '120px',
                  height: '120px',
                  display: device.attributes?.deviceImage ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '50%'
                }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              
              {/* Camera Button */}
              {hasChangePicturePermission && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: !desktop ? '-2px' : '3%',
                  right: !desktop ? '-2px' : '30%',
                  width: !desktop ? '20px' : '24px',
                  height: !desktop ? '20px' : '24px',
                  backgroundColor: isUploadingImage ? colors.textSecondary : colors.primary,
                  borderRadius: !desktop ? '4px' : '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 1000,
                  border: 'none',
                  opacity: isUploadingImage ? 0.7 : 1
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isUploadingImage) {
                    document.getElementById('device-image-upload').click();
                  }
                }}
              >
                {isUploadingImage ? (
                  <div style={{
                    width: !desktop ? '8px' : '10px',
                    height: !desktop ? '8px' : '10px',
                    border: `2px solid ${colors.background}`,
                    borderTop: `2px solid ${colors.primary}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                ) : (
                  <svg width={!desktop ? "12" : "14"} height={!desktop ? "12" : "14"} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="4" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              )}
            </div>

            {/* Status and Speed */}
            <div style={{ textAlign: 'left', marginBottom: '8px' }}>
              <div style={{ marginBottom: '0px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(device.status)
                    }} />
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                      {t(`deviceStatus${device.status.charAt(0).toUpperCase() + device.status.slice(1)}`)}
                    </span>
                  </div>
                  
                  {/* Speed */}
                  {position && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Gauge size={14} color={colors.textSecondary} />
                      <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                        {position.speed ? formatSpeed(position.speed, speedUnit, t) : formatSpeed(0, speedUnit, t)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div style={{ textAlign: 'left', marginBottom: '4px' }}>
              <p style={{
                fontSize: '12px',
                color: colors.textSecondary,
                margin: 0,
                lineHeight: '1.4'
              }}>
                {position?.address || (position?.latitude && position?.longitude ?
                  `${formatCoordinate('latitude', position.latitude, coordinateFormat)}, ${formatCoordinate('longitude', position.longitude, coordinateFormat)}` :
                  t('sharedNoData'))}
              </p>
            </div>
              </>
            )}
            
            {/* Action Buttons */}
            {hasAnyActionButtons && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-around',
              gap: '4px',
              width: '100%',
              marginTop: !desktop ? '18px' : '10px',
              marginBottom: !desktop ? '8px' : '4px',
              minHeight: !desktop ? '58px' : '42px'
            }}>
              {/* Button 1 - Lock Open (Outlined) */}
              {hasResumeEnginePermission && (
              <button
                onClick={handleLockOpen}
                disabled={isLockOpenLoading || !selectedDeviceId}
                style={{
                  width: !desktop ? '58px' : '42px',
                  height: !desktop ? '58px' : '42px',
                  minWidth: !desktop ? '58px' : '42px',
                  minHeight: !desktop ? '58px' : '42px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.textSecondary}`,
                  backgroundColor: 'transparent',
                  cursor: (isLockOpenLoading || !selectedDeviceId) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box',
                  opacity: (isLockOpenLoading || !selectedDeviceId) ? 0.5 : 1
                }}
              >
                {isLockOpenLoading ? (
                  <Loader2 size={16} color={colors.textSecondary} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                <LockOpenIcon style={{ fontSize: '20px', color: colors.textSecondary }} />
                )}
              </button>
              )}
              
              {/* Button 2 - Lock Closed (Outlined) */}
              {hasStopEnginePermission && (
              <button
                onClick={handleLockClosed}
                disabled={isLockClosedLoading || !selectedDeviceId}
                style={{
                  width: !desktop ? '58px' : '42px',
                  height: !desktop ? '58px' : '42px',
                  minWidth: !desktop ? '58px' : '42px',
                  minHeight: !desktop ? '58px' : '42px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.textSecondary}`,
                  backgroundColor: 'transparent',
                  cursor: (isLockClosedLoading || !selectedDeviceId) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box',
                  opacity: (isLockClosedLoading || !selectedDeviceId) ? 0.5 : 1
                }}
              >
                {isLockClosedLoading ? (
                  <Loader2 size={16} color={colors.textSecondary} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                <LockOutlinedIcon style={{ fontSize: '20px', color: colors.textSecondary }} />
                )}
              </button>
              )}
              
              {/* Button 3 - Refresh (Outlined) - Hidden on mobile */}
              {desktop && hasReplayPermission && (
                <button
             onClick={(e) => {
               e.stopPropagation(); // Prevent event bubbling to map
               
               // Store the current deviceId for replay
               setReplayDeviceId(selectedDeviceId);
               
               // Hide device list but keep device selection
               onHideDeviceList();
               
               // Initialize form with current time
               const now = dayjs();
               setCustomFrom(now.subtract(1, 'hour').format('YYYY-MM-DDTHH:mm'));
               setCustomTo(now.format('YYYY-MM-DDTHH:mm'));
               
               // Show popover and close device list
               setShowReplayPopover(true);
               onHideDeviceList();
               
             }}
                  style={{
                    width: '42px',
                    height: '42px',
                    minWidth: '42px',
                    minHeight: '42px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.textSecondary}`,
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    boxSizing: 'border-box'
                  }}
                >
                  <RefreshOutlinedIcon style={{ fontSize: '20px', color: colors.textSecondary }} />
                </button>
              )}
              
              {/* Button 4 - Send Commands (Outlined) */}
              {hasSendCommandPermission && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCommandDialog(true);
                }}
                style={{
                  width: !desktop ? '58px' : '42px',
                  height: !desktop ? '58px' : '42px',
                  minWidth: !desktop ? '58px' : '42px',
                  minHeight: !desktop ? '58px' : '42px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.textSecondary}`,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box'
                }}
              >
                <UploadIcon style={{ fontSize: '20px', color: colors.textSecondary }} />
              </button>
              )}
              
              {/* Button 5 - Share (Outlined) */}
              {hasShareDevicePermission && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareDialog(true);
                }}
                style={{
                  width: !desktop ? '58px' : '42px',
                  height: !desktop ? '58px' : '42px',
                  minWidth: !desktop ? '58px' : '42px',
                  minHeight: !desktop ? '58px' : '42px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.textSecondary}`,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box'
                }}
              >
                <ShareIcon style={{ fontSize: '20px', color: colors.textSecondary }} />
              </button>
              )}
              
              {/* Button 6 - Anchor (Outlined) */}
              {hasAnchorPermission && (
              <button
                onClick={handleAnchorClick}
                disabled={isAnchorLoading || !position}
                style={{
                  width: !desktop ? '58px' : '42px',
                  height: !desktop ? '58px' : '42px',
                  minWidth: !desktop ? '58px' : '42px',
                  minHeight: !desktop ? '58px' : '42px',
                  borderRadius: '8px',
                  border: `1px solid ${isAnchored ? '#10B981' : colors.textSecondary}`,
                  backgroundColor: isAnchored ? '#D1FAE5' : 'transparent',
                  cursor: (isAnchorLoading || !position) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box',
                  opacity: (isAnchorLoading || !position) ? 0.5 : 1
                }}
              >
                {isAnchorLoading ? (
                  <Loader2 size={16} color={isAnchored ? '#10B981' : colors.textSecondary} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <AnchorIcon style={{ fontSize: '20px', color: isAnchored ? '#10B981' : colors.textSecondary }} />
                )}
              </button>
              )}
            </div>
            )}
          </div>
          
          {/* Content */}
          <div style={{
            flex: 1,
            padding: '0px 16px 16px 16px',
            overflow: 'auto'
          }}>
            
            {/* Position Attributes */}
            {position && (
              <div style={{ marginBottom: '4px' }}>
                
                {positionItems.split(',').filter((key) => key && key !== 'address' && (position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key))).map((key, index) => {
                  const attributeName = getSensorDisplayName(key);
                  const value = position.hasOwnProperty(key) ? position[key] : position.attributes[key];
                  
                  return (
                    <div key={`position-${key || 'empty'}-${index}`} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      borderBottom: `1px solid ${colors.border}`
                    }}>
                      <span style={{
                        fontSize: '12px',
                        color: colors.textSecondary,
                        fontWeight: '500'
                      }}>
                        {attributeName}
                      </span>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: colors.text
                        }}>
                          {key === 'fixTime' || key === 'deviceTime' || key === 'serverTime' ? 
                            formatTime(value, 'seconds') :
                          key === 'speed' ? 
                            formatSpeed(value, speedUnit, t) :
                          key === 'course' ? 
                            formatCourse(value, t) :
                          key === 'altitude' ? 
                            formatAltitude(value, altitudeUnit, t) :
                      key === 'accuracy' || key === 'odometer' || key === 'serviceOdometer' || 
                      key === 'tripOdometer' || key === 'obdOdometer' || key === 'distance' || 
                      key === 'totalDistance' ? 
                        formatDistance(value, distanceUnit, t) :
                          key === 'batteryLevel' ? 
                            formatPercentage(value) :
                          key === 'battery' ? 
                            formatVoltage(value, t) :
                      key === 'fuel' ? 
                        formatVolume(value, volumeUnit, t) :
                      key === 'hours' ? 
                        formatNumericHours(value, t) :
                      key === 'ignition' || key === 'motion' || key === 'armed' ? 
                        formatBoolean(value, t) :
                      key === 'alarm' ? 
                        formatAlarm(value, t) :
                          key === 'latitude' || key === 'longitude' ? 
                            formatCoordinate(key, value, coordinateFormat) :
                          key === 'address' ? 
                            value || t('sharedUnknown') :
                          value !== null && value !== undefined && typeof value === 'number' ? 
                            formatNumber(value, 2) :
                            value || t('sharedUnknown')}
                        </span>
                        {!deviceReadonly && (key === 'totalDistance' || key === 'hours') && (
                          (key === 'totalDistance' && hasTotalDistancePermission) || (key === 'hours' && hasHoursPermission)
                        ) && (
                          <button
                            onClick={() => handleEditField(key, value)}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '2px'
                            }}
                          >
                            <Settings size={14} color={colors.textSecondary} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
      )}
    </AnimatePresence>

    {/* More Details Modal */}
    <AnimatePresence>
        {showDetailsModal && (
          <motion.div
            key="details-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10002
            }}
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '8px',
                width: '90vw',
                maxWidth: '800px',
                maxHeight: '70vh',
                overflow: 'hidden',
                boxShadow: colors.shadow
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                padding: '20px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    marginRight: '4px',
                    padding: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.secondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <ChevronLeft size={20} color={colors.textSecondary} style={{ pointerEvents: 'none' }} />
                </button>
                <h2 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '600',
                  color: colors.text
                }}>
                  {device?.name} {t('sharedDetails')}
                </h2>
              </div>

              {/* Modal Content */}
              <div style={{
                padding: '20px',
                maxHeight: 'calc(80vh - 80px)',
                overflowY: 'auto'
              }}>
                {isLoadingDetails ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px',
                    gap: '16px'
                  }}>
                    <Loader2 size={32} color={colors.textSecondary} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : detailedPosition ? (
                  <div>
                    
                    {/* Position Properties Table */}
                    <div style={{
                      backgroundColor: colors.surface,
                      overflow: 'hidden',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{
                        backgroundColor: colors.secondary,
                        padding: '12px 16px',
                        borderBottom: `1px solid ${colors.border}`
                      }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: desktop ? '20% 20% 60%' : '30% 70%',
                          gap: '16px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: colors.textSecondary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {desktop && <div>{t('stateName')}</div>}
                          <div>{t('sharedName')}</div>
                          <div>{t('stateValue')}</div>
                        </div>
                      </div>
                      
                      <div style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden' }}>
                        {/* Position Properties */}
                        {Object.getOwnPropertyNames(detailedPosition).filter((it) => it && it !== 'attributes').map((property, propIndex) => {
                          const value = detailedPosition[property];
                          return (
                            <div key={`property-${property || 'empty'}-${propIndex}`} style={{
                              display: 'grid',
                              gridTemplateColumns: desktop ? '20% 20% 60%' : '30% 70%',
                              gap: '16px',
                              padding: '8px 16px',
                              borderBottom: `1px solid ${colors.border}`,
                              fontSize: '12px',
                              lineHeight: '1.4',
                              minHeight: '32px'
                            }}>
                              {desktop && (
                                <div style={{ color: colors.textSecondary, fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>
                                  {property}
                                </div>
                              )}
                              <div style={{ color: colors.text, fontWeight: '500', display: 'flex', alignItems: 'center' }}>
                                {(() => {
                                  // Check for custom sensor name first
                                  if (device?.attributes?.customSensors) {
                                    try {
                                      const customSensors = JSON.parse(device.attributes.customSensors);
                                      if (customSensors[property]) {
                                        return customSensors[property];
                                      }
                                    } catch (error) {
                                      console.error('Error parsing customSensors:', error);
                                    }
                                  }
                                  // Fall back to position attributes or property name
                                  return positionAttributes[property]?.name || property;
                                })()}
                              </div>
                              <div style={{ 
                                color: colors.text, 
                                textAlign: 'right', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'flex-end', 
                                gap: '8px', 
                                flexWrap: 'wrap', 
                                paddingLeft: '16px', 
                                paddingRight: '8px' 
                              }}>
                                <div style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4', overflowX: 'hidden', overflowY: 'visible', paddingRight: (property === 'totalDistance' || property === 'hours') ? '4px' : '16px' }}>
                                  {property === 'fixTime' || property === 'deviceTime' || property === 'serverTime' ? 
                                    formatTime(value, 'seconds') :
                                property === 'speed' ? 
                                  formatSpeed(value, speedUnit, t) :
                                property === 'course' ? 
                                  formatCourse(value, t) :
                                property === 'altitude' ? 
                                  formatAltitude(value, altitudeUnit, t) :
                              property === 'accuracy' || property === 'odometer' || property === 'serviceOdometer' || 
                              property === 'tripOdometer' || property === 'obdOdometer' || property === 'distance' || 
                              property === 'totalDistance' ? 
                                formatDistance(value, distanceUnit, t) :
                                  property === 'batteryLevel' ? 
                                    formatPercentage(value) :
                                  property === 'battery' ? 
                                    formatVoltage(value, t) :
                                property === 'fuel' ? 
                                  formatVolume(value, volumeUnit, t) :
                                property === 'hours' ? 
                                  formatNumericHours(value, t) :
                                property === 'ignition' || property === 'motion' || property === 'armed' ? 
                                  formatBoolean(value, t) :
                                property === 'alarm' ? 
                                  formatAlarm(value, t) :
                                  property === 'latitude' || property === 'longitude' ? 
                                    formatCoordinate(property, value, coordinateFormat) :
                                  property === 'address' ? 
                                    value || t('sharedUnknown') :
                                  value !== null && value !== undefined && typeof value === 'number' ? 
                                    formatNumber(value, 2) :
                                  value !== null && value !== undefined && typeof value === 'object' ? 
                                    JSON.stringify(value) :
                                    value || t('sharedUnknown')}
                              </div>
                              {!deviceReadonly && (property === 'totalDistance' || property === 'hours') && (
                                (property === 'totalDistance' && hasTotalDistancePermission) || (property === 'hours' && hasHoursPermission)
                              ) && (
                                <button
                                  onClick={() => handleEditField(property, detailedPosition[property])}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                    marginRight: '16px',
                                    padding: '2px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = colors.secondary;
                                    e.target.style.borderColor = colors.border;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.borderColor = colors.border;
                                  }}
                                  onMouseDown={(e) => {
                                    e.target.style.backgroundColor = colors.hover;
                                  }}
                                  onMouseUp={(e) => {
                                    e.target.style.backgroundColor = colors.secondary;
                                  }}
                                >
                                  <Settings size={14} color={colors.textSecondary} />
                                </button>
                              )}
                            </div>
                          </div>
                          );
                        })}
                        
                        {/* Position Attributes */}
                        {Object.getOwnPropertyNames(detailedPosition.attributes).filter((attr) => attr).map((attribute, attrIndex) => {
                          const value = detailedPosition.attributes[attribute];
                          return (
                            <div key={`attribute-${attribute || 'empty'}-${attrIndex}`} style={{
                              display: 'grid',
                              gridTemplateColumns: desktop ? '20% 20% 60%' : '30% 70%',
                              gap: '16px',
                              padding: '8px 16px',
                              borderBottom: `1px solid ${colors.border}`,
                              fontSize: '12px',
                              lineHeight: '1.4',
                              minHeight: '32px'
                            }}>
                              {desktop && (
                                <div style={{ color: colors.textSecondary, fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>
                                  {attribute}
                                </div>
                              )}
                              <div style={{ color: colors.text, fontWeight: '500', display: 'flex', alignItems: 'center' }}>
                                {(() => {
                                  // Check for custom sensor name first
                                  if (device?.attributes?.customSensors) {
                                    try {
                                      const customSensors = JSON.parse(device.attributes.customSensors);
                                      if (customSensors[attribute]) {
                                        return customSensors[attribute];
                                      }
                                    } catch (error) {
                                      console.error('Error parsing customSensors:', error);
                                    }
                                  }
                                  // Fall back to position attributes or attribute name
                                  return positionAttributes[attribute]?.name || attribute;
                                })()}
                              </div>
                              <div style={{ 
                                color: colors.text, 
                                textAlign: 'right', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'flex-end', 
                                gap: '8px', 
                                flexWrap: 'wrap', 
                                paddingLeft: '16px', 
                                paddingRight: '8px' 
                              }}>
                                <div style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4', overflowX: 'hidden', overflowY: 'visible', paddingRight: (attribute === 'totalDistance' || attribute === 'hours') ? '4px' : '16px' }}>
                                  {attribute === 'fixTime' || attribute === 'deviceTime' || attribute === 'serverTime' ? 
                                    formatTime(value, 'seconds') :
                                attribute === 'speed' ? 
                                  formatSpeed(value, speedUnit, t) :
                                attribute === 'course' ? 
                                  formatCourse(value, t) :
                                attribute === 'altitude' ? 
                                  formatAltitude(value, altitudeUnit, t) :
                                attribute === 'accuracy' || attribute === 'odometer' || attribute === 'serviceOdometer' || 
                                attribute === 'tripOdometer' || attribute === 'obdOdometer' || attribute === 'distance' || 
                                attribute === 'totalDistance' ? 
                                formatDistance(value, distanceUnit, t) :
                                  attribute === 'batteryLevel' ? 
                                    formatPercentage(value) :
                                  attribute === 'battery' ? 
                                    formatVoltage(value, t) :
                                attribute === 'fuel' ? 
                                  formatVolume(value, volumeUnit, t) :
                                attribute === 'hours' ? 
                                  formatNumericHours(value, t) :
                                attribute === 'ignition' || attribute === 'motion' || attribute === 'armed' ? 
                                  formatBoolean(value, t) :
                                attribute === 'alarm' ? 
                                  formatAlarm(value, t) :
                                  attribute === 'latitude' || attribute === 'longitude' ? 
                                    formatCoordinate(attribute, value, coordinateFormat) :
                                  attribute === 'address' ? 
                                    value || t('sharedUnknown') :
                                  value !== null && value !== undefined && typeof value === 'number' ? 
                                    formatNumber(value, 2) :
                                  value !== null && value !== undefined && typeof value === 'object' ? 
                                    JSON.stringify(value) :
                                    value || t('sharedUnknown')}
                              </div>
                              {!deviceReadonly && (attribute === 'totalDistance' || attribute === 'hours') && (
                                (attribute === 'totalDistance' && hasTotalDistancePermission) || (attribute === 'hours' && hasHoursPermission)
                              ) && (
                                <button
                                  onClick={() => handleEditField(attribute, detailedPosition.attributes[attribute])}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                    marginRight: '16px',
                                    padding: '2px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = colors.secondary;
                                    e.target.style.borderColor = colors.border;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.borderColor = colors.border;
                                  }}
                                  onMouseDown={(e) => {
                                    e.target.style.backgroundColor = colors.hover;
                                  }}
                                  onMouseUp={(e) => {
                                    e.target.style.backgroundColor = colors.secondary;
                                  }}
                                >
                                  <Settings size={14} color={colors.textSecondary} />
                                </button>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px',
                    gap: '16px'
                  }}>
                    <p                     style={{
                      margin: 0,
                      fontSize: '16px',
                      color: colors.textSecondary
                    }}>
                      {t('sharedNoData')}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
    </AnimatePresence>

    {/* Edit Modal */}
    <AnimatePresence>
        {showEditModal && (
          <motion.div
            key="edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10004
            }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '8px',
                width: '400px',
                maxWidth: '90vw',
                overflow: 'hidden',
                boxShadow: colors.shadow
              }}
              onClick={(e) => e.stopPropagation()}
            >

              {/* Modal Content */}
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <label                     style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.text,
                      margin: 0
                    }}>
                      {editField === 'hours' ? t('positionHours') : `${t('deviceTotalDistance')} (${distanceUnitString(distanceUnit, t)})`}
                    </label>
                    <button
                      onClick={() => setShowEditModal(false)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: colors.secondary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = colors.hover;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = colors.secondary;
                      }}
                    >
                      <X size={16} color={colors.textSecondary} />
                    </button>
                  </div>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: colors.secondary,
                      border: 'none',
                      borderRadius: '8px',
                      color: colors.text,
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.backgroundColor = colors.hover;
                    }}
                    onBlur={(e) => {
                      e.target.style.backgroundColor = colors.secondary;
                    }}
                    step={editField === 'hours' ? '0.1' : '0.01'}
                    min="0"
                  />
                </div>

                {/* Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'space-between'
                }}>
                  <button
                    onClick={() => setShowEditModal(false)}
                    disabled={isSaving}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: colors.secondary,
                      color: colors.text,
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving) {
                        e.target.style.backgroundColor = colors.hover;
                        e.target.style.color = colors.text;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving) {
                        e.target.style.backgroundColor = colors.secondary;
                        e.target.style.color = colors.text;
                      }
                    }}
                  >
                    {t('sharedCancel')}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isSaving ? colors.secondary : '#D1FAE5',
                      color: isSaving ? colors.text : '#065F46',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving) {
                        e.target.style.backgroundColor = '#A7F3D0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving) {
                        e.target.style.backgroundColor = '#D1FAE5';
                      }
                    }}
                  >
                    {isSaving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                    {isSaving ? t('sharedSaving') : t('sharedSave')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sensor Edit Modal */}
      <AnimatePresence>
        {sensorEditModalOpen && position && (
          <motion.div
            key="sensor-edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10004
            }}
            onClick={() => setSensorEditModalOpen(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '8px',
                width: '500px',
                maxWidth: '95vw',
                maxHeight: '80vh',
                overflow: 'hidden',
                boxShadow: colors.shadow
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Content */}
              <div style={{ padding: '16px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <button
                      onClick={() => setSensorEditModalOpen(false)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '8px',
                        transition: 'all 0.2s',
                        padding: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.hover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Close"
                    >
                      <ChevronLeft size={20} color={colors.textSecondary} />
                    </button>
                    <label style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: colors.text,
                      margin: 0,
                      flex: 1
                    }}>
                      {t('editSensorNames')}
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <button
                        onClick={handleImportSensors}
                        disabled={savingSensors}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: savingSensors ? colors.border : colors.secondary,
                          cursor: savingSensors ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!savingSensors) {
                            e.target.style.backgroundColor = colors.hover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!savingSensors) {
                            e.target.style.backgroundColor = colors.secondary;
                          }
                        }}
                        title={savingSensors ? "Importing and saving..." : "Import Sensors"}
                      >
                        {savingSensors ? (
                          <CircularProgress size={16} style={{ color: colors.textSecondary }} />
                        ) : (
                          <UploadIcon style={{ fontSize: '16px', color: colors.textSecondary }} />
                        )}
                      </button>
                      <button
                        onClick={handleExportSensors}
                        disabled={savingSensors}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: savingSensors ? colors.border : colors.secondary,
                          cursor: savingSensors ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!savingSensors) {
                            e.target.style.backgroundColor = colors.hover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!savingSensors) {
                            e.target.style.backgroundColor = colors.secondary;
                          }
                        }}
                        title={savingSensors ? "Saving and exporting..." : "Export Sensors"}
                      >
                        {savingSensors ? (
                          <CircularProgress size={16} style={{ color: colors.textSecondary }} />
                        ) : (
                          <DownloadIcon style={{ fontSize: '16px', color: colors.textSecondary }} />
                        )}
                      </button>
                      <button
                        onClick={handleOpenAddSensor}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: colors.secondary,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = colors.hover;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = colors.secondary;
                        }}
                        title={t('customizeSensor')}
                      >
                        <AddIcon style={{ fontSize: '16px', color: colors.textSecondary }} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Sensor List */}
                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    marginBottom: '20px'
                  }}>
                    {Object.keys(sensorNames).map((key) => (
                      <div key={key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        minWidth: 0
                      }}>
                        <div style={{
                          minWidth: '80px',
                          maxWidth: '120px',
                          fontSize: '12px',
                          fontWeight: '500',
                          color: colors.textSecondary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          {key}
                        </div>
                        <div style={{
                          flex: 1,
                          minWidth: 0,
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <input
                            type="text"
                            value={sensorNames[key] || ''}
                            onChange={(e) => handleSensorNameChange(key, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              paddingRight: !positionItems.split(',').includes(key) ? '36px' : '12px',
                              backgroundColor: colors.secondary,
                              border: 'none',
                              borderRadius: '6px',
                              color: colors.text,
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                              e.target.style.backgroundColor = colors.hover;
                            }}
                            onBlur={(e) => {
                              e.target.style.backgroundColor = colors.secondary;
                            }}
                            placeholder={t('customName')}
                          />
                        {/* Delete button for customized sensors - positioned inside input */}
                        {(() => {
                          const currentName = positionAttributes[key]?.name || key;
                          const newName = sensorNames[key];
                          const isCustomized = newName && newName !== currentName;
                          return isCustomized;
                        })() && (
                            <button
                              onClick={() => handleDeleteCustomSensor(key)}
                              style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '24px',
                                height: '24px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: '4px',
                                color: colors.textSecondary,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                transition: 'all 0.2s',
                                zIndex: 1
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.color = '#ef4444';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.color = colors.textSecondary;
                              }}
                              title="Delete custom sensor"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={handleSaveSensorEdit}
                    disabled={savingSensors}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: savingSensors ? '#E5E7EB' : '#D1FAE5',
                      color: savingSensors ? '#6B7280' : '#065F46',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: savingSensors ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: savingSensors ? 0.7 : 1,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!savingSensors) {
                        e.target.style.backgroundColor = '#A7F3D0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!savingSensors) {
                        e.target.style.backgroundColor = '#D1FAE5';
                      }
                    }}
                  >
                    {savingSensors && (
                      <CircularProgress 
                        size={16} 
                        thickness={4}
                        style={{ color: '#6B7280' }}
                      />
                    )}
                    {!savingSensors && t('sharedSave')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Sensor Modal */}
      <AnimatePresence>
        {addSensorModalOpen && (
          <motion.div
            key="add-sensor-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10005
            }}
            onClick={() => setAddSensorModalOpen(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '8px',
                width: '400px',
                maxWidth: '90vw',
                overflow: 'hidden',
                boxShadow: colors.shadow
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Content */}
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <button
                      onClick={() => setAddSensorModalOpen(false)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '8px',
                        transition: 'all 0.2s',
                        padding: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.hover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Close"
                    >
                      <ChevronLeft size={20} color={colors.textSecondary} />
                    </button>
                    <label style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: colors.text,
                      margin: 0,
                      flex: 1
                    }}>
                      {t('customizeSensor')}
                    </label>
                  </div>
                  
                  {/* Sensor Selection */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: colors.textSecondary,
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      {t('selectSensor')}
                    </label>
                    <div ref={dropdownRef} style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={sensorSearchTerm}
                        onChange={(e) => {
                          setSensorSearchTerm(e.target.value);
                        }}
                        onClick={() => {
                          setShowSensorDropdown(true);
                        }}
                        onFocus={(e) => {
                          setShowSensorDropdown(true);
                          e.target.style.backgroundColor = colors.hover;
                        }}
                        onBlur={(e) => {
                          setTimeout(() => setShowSensorDropdown(false), 100);
                          e.target.style.backgroundColor = colors.secondary;
                        }}
                        placeholder={t('selectSensor')}
                        style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: colors.secondary,
                          border: 'none',
                          borderRadius: '8px',
                          color: colors.text,
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                      />
                      {showSensorDropdown && createPortal(
                        <div 
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          style={{
                            position: 'fixed',
                            top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + 4 : 0,
                            left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().left : 0,
                            width: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().width : 0,
                            backgroundColor: colors.secondary,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 10010,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}>
                          {allPossibleSensors
                            .filter(sensor => !Object.keys(sensorNames).includes(sensor.value))
                            .filter(sensor => {
                              if (!sensorSearchTerm) return true;
                              return sensor.label.toLowerCase().includes(sensorSearchTerm.toLowerCase()) ||
                                     sensor.value.toLowerCase().includes(sensorSearchTerm.toLowerCase());
                            })
                            .slice(0, 20) // Limit to 20 results for performance
                            .map(sensor => (
                              <div
                                key={sensor.value}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedNewSensor(sensor.value);
                                  setSensorSearchTerm(sensor.label);
                                  setShowSensorDropdown(false);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  color: colors.text,
                                  fontSize: '14px',
                                  borderBottom: `1px solid ${colors.border}`,
                                  transition: 'background-color 0.2s',
                                  backgroundColor: 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <div style={{ fontWeight: '500', lineHeight: '1.2' }}>{sensor.label}</div>
                                <div style={{ fontSize: '11px', color: colors.textSecondary, lineHeight: '1.2', marginTop: '2px' }}>
                                  {sensor.value}
                                </div>
                              </div>
                            ))}
                        </div>,
                        document.body
                      )}
                    </div>
                  </div>

                  {/* Sensor Name Input */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: colors.textSecondary,
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      {t('customName')}
                    </label>
                    <input
                      type="text"
                      value={newSensorName}
                      onChange={(e) => setNewSensorName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: colors.secondary,
                        border: 'none',
                        borderRadius: '8px',
                        color: colors.text,
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.backgroundColor = colors.hover;
                      }}
                      onBlur={(e) => {
                        e.target.style.backgroundColor = colors.secondary;
                      }}
                      placeholder={t('customName')}
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={handleAddSensor}
                    disabled={!selectedNewSensor || !newSensorName}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: (!selectedNewSensor || !newSensorName) ? colors.border : '#D1FAE5',
                      color: (!selectedNewSensor || !newSensorName) ? colors.textSecondary : '#065F46',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: (!selectedNewSensor || !newSensorName) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedNewSensor && newSensorName) {
                        e.target.style.backgroundColor = '#A7F3D0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedNewSensor && newSensorName) {
                        e.target.style.backgroundColor = '#D1FAE5';
                      }
                    }}
                  >
                    {t('addSensor')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Command Dialog */}
      <CommandDialog
        open={showCommandDialog}
        onClose={() => setShowCommandDialog(false)}
        deviceId={device?.id}
      />
      
      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        deviceId={device?.id}
      />

    {/* Success Message Snackbar */}
    <AnimatePresence>
      {showSuccessMessage && (
        <motion.div
          key="success-message"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#10B981',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 10003,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {successMessage || t('commandQueued')}
        </motion.div>
      )}
    </AnimatePresence>

    {/* Replay Popover */}
    <AnimatePresence>
      {showReplayPopover && (
        <motion.div
          key="replay-popover"
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: !desktop ? '0px' : '8px',
            left: !desktop ? '0px' : (isMenuExpanded ? '200px' : '63px'),
            width: !desktop ? '100vw' : '310px',
            height: !desktop ? '100vh' : 'calc(100vh - 16px)',
            zIndex: 10000,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: !desktop ? '0px' : (selectedDeviceId && device ? '0px 0px 0px 0px' : '0px 16px 16px 0px'),
            boxShadow: !desktop ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'left 0.3s ease'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.surface
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleCloseReplayPopover}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.textSecondary,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.color = colors.text;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = colors.textSecondary;
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: colors.text
              }}>
                {t('reportReplay')}
              </h3>
            </div>
          </div>

          {/* Content - Replay Form */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto'
            }}
          >
            {/* Device Selection - Hidden since device is already selected */}
            {/* {false && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.text
                }}>
                  {t('reportDevice')}
                </label>
                <select
                  value={replayDeviceId || ''}
                  onChange={(e) => setReplayDeviceId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.surface,
                    color: colors.text,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ backgroundColor: colors.surface, color: colors.text }}>
                    Select Device
                  </option>
                  {Object.values(devices).map((device) => (
                    <option 
                      key={device.id} 
                      value={device.id}
                      style={{ backgroundColor: colors.surface, color: colors.text }}
                    >
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>
            )} */}

            {/* Period Selection */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.text
              }}>
                {t('reportPeriod')}
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  paddingRight: '32px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontSize: '14px',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(colors.textSecondary)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  backgroundSize: '16px'
                }}
              >
                <option value="today" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportToday')}
                </option>
                <option value="yesterday" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportYesterday')}
                </option>
                <option value="thisWeek" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportThisWeek')}
                </option>
                <option value="previousWeek" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportPreviousWeek')}
                </option>
                <option value="thisMonth" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportThisMonth')}
                </option>
                <option value="previousMonth" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportPreviousMonth')}
                </option>
                <option value="custom" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportCustom')}
                </option>
              </select>
            </div>

            {/* Date/Time Inputs */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.text
              }}>
                {t('reportFrom')}
              </label>
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                disabled={period !== 'custom'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: period === 'custom' ? colors.surface : colors.surface,
                  color: period === 'custom' ? colors.text : colors.textSecondary,
                  fontSize: '14px',
                  cursor: period === 'custom' ? 'text' : 'not-allowed',
                  opacity: period === 'custom' ? 1 : 0.6,
                  colorScheme: colors.surface === '#1F2937' ? 'dark' : 'light'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.text
              }}>
                {t('reportTo')}
              </label>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                disabled={period !== 'custom'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: period === 'custom' ? colors.surface : colors.surface,
                  color: period === 'custom' ? colors.text : colors.textSecondary,
                  fontSize: '14px',
                  cursor: period === 'custom' ? 'text' : 'not-allowed',
                  opacity: period === 'custom' ? 1 : 0.6,
                  colorScheme: colors.surface === '#1F2937' ? 'dark' : 'light'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px'
            }}>
                       <button
                         onClick={handleCloseReplayPopover}
                         style={{
                           flex: 1,
                           padding: '12px 20px',
                           borderRadius: '8px',
                           border: `1px solid ${colors.border}`,
                           backgroundColor: colors.surface,
                           color: colors.text,
                           cursor: 'pointer',
                           fontSize: '14px',
                           fontWeight: '500',
                           transition: 'all 0.2s'
                         }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.borderColor = colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.surface;
                  e.target.style.borderColor = colors.border;
                }}
              >
                {t('sharedCancel')}
              </button>
              
              <button
                onClick={handleReplayShow}
                disabled={!replayDeviceId || replayLoading}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.primary,
                  color: colors.text,
                  cursor: replayLoading || !replayDeviceId ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: replayLoading || !replayDeviceId ? 0.6 : 1,
                  boxShadow: 'none',
                  outline: 'none'
                }}
              >
                {replayLoading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    {t('sharedLoading')}
                  </>
                ) : (
                  t('reportShow')
                )}
              </button>
            </div>

            {/* Replay Controls Section - BELOW the Cancel and Show buttons */}
            <>

                {/* Slider */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.text
                  }}>
                    {t('sharedTimeline')}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, replayPositions.length - 1)}
                    value={currentReplayIndex}
                    onChange={handleSliderChange}
                    disabled={replayPositions.length === 0}
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: replayPositions.length === 0 
                        ? colors.border 
                        : `linear-gradient(to right, #18a9fd 0%, #18a9fd ${(currentReplayIndex / Math.max(1, replayPositions.length - 1)) * 100}%, ${colors.border} ${(currentReplayIndex / Math.max(1, replayPositions.length - 1)) * 100}%, ${colors.border} 100%)`,
                      outline: 'none',
                      cursor: replayPositions.length === 0 ? 'not-allowed' : 'pointer',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      opacity: replayPositions.length === 0 ? 0.5 : 1,
                      border: 'none'
                    }}
                  />
                  <style>
                    {`
                      input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: #18a9fd;
                        cursor: pointer;
                        border: 3px solid #ffffff;
                        box-shadow: 0 0 0 1px #18a9fd, 0 2px 6px rgba(0,0,0,0.4);
                      }
                      
                      input[type="range"]::-moz-range-thumb {
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: #18a9fd;
                        cursor: pointer;
                        border: 3px solid #ffffff;
                        box-shadow: 0 0 0 1px #18a9fd, 0 2px 6px rgba(0,0,0,0.4);
                      }
                    `}
                  </style>
                </div>

                {/* Playback Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: colors.surface,
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`
                }}>
                  {/* Fast Backward Button */}
                  <button
                    onClick={() => {
                      const newIndex = Math.max(0, currentReplayIndex - 1);
                      setCurrentReplayIndex(newIndex);
                      // Update Redux state to trigger map updates
                      dispatch({ type: 'session/updateCurrentReplayIndex', payload: newIndex });
                    }}
                    disabled={replayPositions.length === 0 || currentReplayIndex <= 0}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '2px solid #000000',
                      backgroundColor: colors.background,
                      color: colors.textSecondary,
                      cursor: (replayPositions.length === 0 || currentReplayIndex <= 0) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (replayPositions.length === 0 || currentReplayIndex <= 0) ? 0.5 : 1
                    }}
                    title={t('sharedFastBackward')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 19V5L5 12L11 19Z" fill="currentColor"/>
                      <path d="M19 19V5L13 12L19 19Z" fill="currentColor"/>
                    </svg>
                  </button>

                  <button
                    onClick={isPlaying ? handlePause : handlePlay}
                    disabled={replayPositions.length === 0 || (currentReplayIndex >= replayPositions.length - 1 && !isPlaying)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: "#18a9fd",
                      color: colors.surface,
                      cursor: (replayPositions.length === 0 || (currentReplayIndex >= replayPositions.length - 1 && !isPlaying)) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (replayPositions.length === 0 || (currentReplayIndex >= replayPositions.length - 1 && !isPlaying)) ? 0.5 : 1
                    }}
                  >
                    {isPlaying ? (
                      <PauseIcon style={{ fontSize: '28px', width: '28px', height: '28px', color: "#ffffff"}} />
                    ) : (
                      <PlayArrowIcon style={{ fontSize: '28px', width: '28px', height: '28px', color: "#ffffff" }} />
                    )}
                  </button>

                  {/* Fast Forward Button */}
                  <button
                    onClick={() => {
                      const newIndex = Math.min(replayPositions.length - 1, currentReplayIndex + 1);
                      setCurrentReplayIndex(newIndex);
                      // Update Redux state to trigger map updates
                      dispatch({ type: 'session/updateCurrentReplayIndex', payload: newIndex });
                    }}
                    disabled={replayPositions.length === 0 || currentReplayIndex >= replayPositions.length - 1}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '2px solid #000000',
                      backgroundColor: colors.background,
                      color: colors.textSecondary,
                      cursor: (replayPositions.length === 0 || currentReplayIndex >= replayPositions.length - 1) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (replayPositions.length === 0 || currentReplayIndex >= replayPositions.length - 1) ? 0.5 : 1
                    }}
                    title={t('sharedFastForward')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 5V19L19 12L13 5Z" fill="currentColor"/>
                      <path d="M5 5V19L11 12L5 5Z" fill="currentColor"/>
                    </svg>
                  </button>

                  {/* Screenshot Button */}
                  <button
                    onClick={handleScreenshot}
                    disabled={replayPositions.length === 0 || isScreenshotting}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '2px solid #000000',
                      backgroundColor: colors.background,
                      color: isScreenshotting ? colors.textSecondary : colors.textSecondary,
                      cursor: (replayPositions.length === 0 || isScreenshotting) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (replayPositions.length === 0 || isScreenshotting) ? 0.5 : 1
                    }}
                    title={isScreenshotting ? t('sharedProcessing') : t('sharedScreenshot')}
                  >
                    {isScreenshotting ? (
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: `2px solid ${colors.textSecondary}`,
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    )}
                  </button>

                  {/* Speed Control */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <select
                      value={playbackSpeed}
                      disabled={replayPositions.length === 0}
                      onChange={(e) => {
                        const newSpeed = Number(e.target.value);
                        setPlaybackSpeed(newSpeed);
                        // Stop playback when speed changes
                        setIsPlaying(false);
                        if (intervalRef.current) {
                          clearInterval(intervalRef.current);
                          intervalRef.current = null;
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.surface,
                        color: colors.text,
                        fontSize: '12px',
                        cursor: replayPositions.length === 0 ? 'not-allowed' : 'pointer',
                        outline: 'none',
                        opacity: replayPositions.length === 0 ? 0.5 : 1
                      }}
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={5}>5x</option>
                      <option value={10}>10x</option>
                    </select>
                  </div>
                </div>
            </>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Lock Open Confirmation Modal */}
    <AnimatePresence>
      {showLockOpenConfirmation && (
        <motion.div
          key="lock-open-confirmation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={cancelLockOpen}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              color: colors.text,
              lineHeight: '1.5'
            }}>
              {t('commandConfirm')}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={cancelLockOpen}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  backgroundColor: colors.secondary,
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.color = colors.text;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                  e.target.style.color = colors.text;
                }}
              >
                {t('sharedCancel')}
              </button>
              <button
                onClick={confirmLockOpen}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#FEE2E2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FEF2F2';
                }}
              >
                {t('commandSend')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Lock Closed Confirmation Modal */}
    <AnimatePresence>
      {showLockClosedConfirmation && (
        <motion.div
          key="lock-closed-confirmation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={cancelLockClosed}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              color: colors.text,
              lineHeight: '1.5'
            }}>
              {t('commandConfirm')}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={cancelLockClosed}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  backgroundColor: colors.secondary,
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.color = colors.text;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                  e.target.style.color = colors.text;
                }}
              >
                {t('sharedCancel')}
              </button>
              <button
                onClick={confirmLockClosed}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#FEE2E2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FEF2F2';
                }}
              >
                {t('commandSend')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* More Details Modal */}
    <AnimatePresence>
      {moreDetailsModalOpen && (
        <motion.div
          key="more-details-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10004
          }}
          onClick={() => setMoreDetailsModalOpen(false)}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '8px',
              width: '99vw',
              height: '98vh',
              maxWidth: '99vw',
              maxHeight: '98vh',
              overflow: 'hidden',
              boxShadow: colors.shadow,
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tabs Navigation with Close Button */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <button
                onClick={() => setMoreDetailsModalOpen(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Close"
              >
                <ChevronLeft size={20} color={colors.textSecondary} />
              </button>
              <Typography variant="h6" style={{
                color: colors.text,
                fontSize: '16px',
                fontWeight: '600',
                margin: 0,
                flex: 1
              }}>
                RouteGuardian <span style={{ fontStyle: 'italic', fontSize: '0.7em', verticalAlign: 'super' }}>beta</span>
              </Typography>
              <Tabs
                value={moreDetailsActiveTab}
                onChange={(e, newValue) => setMoreDetailsActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                style={{
                  borderBottom: 'none',
                }}
                sx={{
                  '& .MuiTab-root': {
                    color: '#666666',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'none',
                    minHeight: '40px',
                    padding: '8px 16px',
                    '&.Mui-selected': {
                      color: '#1976d2',
                      fontWeight: '600',
                      backgroundColor: 'transparent',
                    },
                    '&:hover': {
                      color: '#1976d2',
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    },
                    '&.Mui-selected:hover': {
                      color: '#1976d2',
                      backgroundColor: 'rgba(25, 118, 210, 0.15)',
                    },
                    '&.Mui-disabled': {
                      opacity: 0.5,
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#1976d2',
                    height: '2px',
                  },
                }}
              >
                <Tab 
                  label="IoTHub" 
                  disabled={!device?.attributes?.iothub}
                />
                <Tab 
                  label="HikiVision" 
                  disabled={!device?.attributes?.hikivision}
                />
                <Tab 
                  label="Device Responses" 
                />
              </Tabs>
            </div>

            {/* Modal Content */}
            <div style={{ 
              flex: 1, 
              overflow: 'hidden', 
              padding: '0 24px 24px 24px', 
              display: 'flex', 
              flexDirection: 'column' 
            }}>
              {/* Tab Content */}
              <Box style={{ flex: 1, overflow: 'auto', paddingTop: '16px' }}>
                {moreDetailsActiveTab === 0 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: desktop ? '100%' : 'auto',
                    minHeight: desktop ? 0 : 'auto'
                  }}>
                    {/* Device Model Support Warning */}
                    {(() => {
                      const deviceModel = getDeviceModel;
                      const apiTemplate = deviceModel ? getApiTemplate(deviceModel) : null;
                      if (deviceModel && !apiTemplate) {
                        return (
                          <Alert 
                            severity="warning" 
                            style={{ 
                              marginBottom: '16px',
                              backgroundColor: '#fff3cd',
                              color: '#856404',
                              border: '1px solid #ffc107'
                            }}
                          >
                            <Typography variant="body2" style={{ fontWeight: '600', marginBottom: '4px' }}>
                              Device Model Not Supported
                            </Typography>
                            <Typography variant="body2" style={{ fontSize: '13px' }}>
                              Device model "{deviceModel}" is not currently supported. Currently "jc181" and "jc400" are supported. 
                              Video playback and streaming features will not work for this device.
                            </Typography>
                          </Alert>
                        );
                      }
                      if (!deviceModel) {
                        return (
                          <Alert 
                            severity="info" 
                            style={{ 
                              marginBottom: '16px',
                              backgroundColor: '#d1ecf1',
                              color: '#0c5460',
                              border: '1px solid #bee5eb'
                            }}
                          >
                            <Typography variant="body2" style={{ fontSize: '13px' }}>
                              Device model not configured in iothub settings. Please configure the device model to enable video features.
                            </Typography>
                          </Alert>
                        );
                      }
                      return null;
                    })()}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: `1px solid ${colors.border}`,
                      marginBottom: '16px',
                    }}>
                      <Tabs
                        value={selectedChannel}
                        onChange={handleChannelChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        style={{
                          flex: 1,
                        }}
                        sx={{
                          '& .MuiTab-root': {
                            color: '#666666',
                            fontSize: '12px',
                            fontWeight: '500',
                            textTransform: 'none',
                            minHeight: '40px',
                            padding: '8px 16px',
                            '&.Mui-selected': {
                              color: '#1976d2',
                              fontWeight: '600',
                              backgroundColor: 'transparent',
                            },
                            '&:hover': {
                              color: '#1976d2',
                              backgroundColor: 'rgba(25, 118, 210, 0.08)',
                            },
                            '&.Mui-selected:hover': {
                              color: '#1976d2',
                              backgroundColor: 'rgba(25, 118, 210, 0.15)',
                            },
                          },
                          '& .MuiTabs-indicator': {
                            backgroundColor: '#1976d2',
                            height: '2px',
                          },
                        }}
                      >
                        <Tab label="Playback" />
                        {Array.from({ length: getIoTHubChannels }, (_, i) => i + 1).map((channelNum) => (
                          <Tab 
                            key={channelNum}
                            label={`Channel ${channelNum}`}
                          />
                        ))}
                      </Tabs>
                      {selectedChannel > 0 && (
                        <IconButton
                          onClick={handleRefreshStreaming}
                          disabled={streamingLoading}
                          size="small"
                          style={{
                            marginRight: '8px',
                            color: streamingLoading ? colors.textSecondary : '#1976d2',
                          }}
                          title="Refresh streaming"
                        >
                          <RefreshOutlinedIcon style={{ fontSize: '20px' }} />
                        </IconButton>
                      )}
                    </div>

                    {/* Playback Tab Content */}
                    {selectedChannel === 0 && (() => {
                        return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          height: desktop ? '100%' : 'auto',
                          overflow: desktop ? 'hidden' : 'visible',
                          boxSizing: 'border-box',
                          minHeight: desktop ? 0 : 'auto'
                        }}>
                          {/* On Server Content - moved outside tabs */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              height: desktop ? '100%' : 'auto',
                              overflow: desktop ? 'hidden' : 'visible',
                              boxSizing: 'border-box',
                              minHeight: desktop ? 0 : 'auto'
                            }}>
                              <Typography variant="subtitle2" style={{ 
                                color: colors.text, 
                                marginBottom: '16px',
                                fontWeight: '600'
                              }}>
                                Videos
                              </Typography>
                        
                        {/* Date pickers and channel selection */}
                        <div style={{
                          display: 'flex',
                          flexDirection: desktop ? 'row' : 'column',
                          gap: '12px',
                          alignItems: desktop ? 'center' : 'stretch',
                          marginBottom: '16px'
                        }}>
                          {/* Date pickers row */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '12px',
                            alignItems: 'center',
                            flex: desktop ? '0 1 auto' : 'none',
                            width: desktop ? 'auto' : '100%'
                          }}>
                            <TextField
                              label="Start Date"
                              type="datetime-local"
                              value={videoListStartDate}
                              onChange={(e) => setVideoListStartDate(e.target.value)}
                              size="small"
                              InputLabelProps={{
                                shrink: true,
                              }}
                              sx={{
                                flex: desktop ? '0 1 auto' : '1 1 auto',
                                minWidth: '130px',
                                maxWidth: desktop ? '200px' : 'none',
                                '& .MuiOutlinedInputRoot': {
                                  backgroundColor: colors.secondary,
                                  '& fieldset': { borderColor: colors.border },
                                  '&:hover fieldset': { borderColor: colors.primary },
                                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                                },
                                '& .MuiInputLabelRoot': { 
                                  color: colors.textSecondary,
                                  '&.Mui-focused': { color: colors.primary }
                                },
                                '& .MuiInputBase-input': {
                                  color: colors.text,
                                },
                              }}
                            />
                            <TextField
                              label="End Date"
                              type="datetime-local"
                              value={videoListEndDate}
                              onChange={(e) => setVideoListEndDate(e.target.value)}
                              size="small"
                              InputLabelProps={{
                                shrink: true,
                              }}
                              sx={{
                                flex: desktop ? '0 1 auto' : '1 1 auto',
                                minWidth: '130px',
                                maxWidth: desktop ? '200px' : 'none',
                                '& .MuiOutlinedInputRoot': {
                                  backgroundColor: colors.secondary,
                                  '& fieldset': { borderColor: colors.border },
                                  '&:hover fieldset': { borderColor: colors.primary },
                                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                                },
                                '& .MuiInputLabelRoot': { 
                                  color: colors.textSecondary,
                                  '&.Mui-focused': { color: colors.primary }
                                },
                                '& .MuiInputBase-input': {
                                  color: colors.text,
                                },
                              }}
                            />
                          </div>
                          
                          {/* Channels and refresh button row */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '8px',
                            alignItems: 'center',
                            flex: desktop ? '1 1 auto' : 'none',
                            flexWrap: desktop ? 'wrap' : 'nowrap',
                            justifyContent: 'space-between',
                            minWidth: desktop ? '200px' : 'auto',
                            width: desktop ? 'auto' : '100%'
                          }}>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'row',
                              gap: '8px',
                              alignItems: 'center',
                              flexWrap: 'wrap'
                            }}>
                              {/* For jc400, use channels from videos; for others, use getIoTHubChannels */}
                              {(() => {
                                const deviceModel = getDeviceModel;
                                let channelsToShow = [];
                                
                                if (deviceModel === 'jc400') {
                                  // For jc400, get unique channels from videos
                                  const uniqueChannels = [...new Set(videos.map(v => v.channel).filter(Boolean))];
                                  channelsToShow = uniqueChannels.sort((a, b) => a - b);
                                } else {
                                  // For other devices, use configured channels
                                  channelsToShow = Array.from({ length: getIoTHubChannels }, (_, i) => i + 1);
                                }
                                
                                return channelsToShow.map((channelNum) => (
                                  <FormControlLabel
                                    key={channelNum}
                                    control={
                                      <Checkbox
                                        checked={videoListSelectedChannels.includes(String(channelNum))}
                                        onChange={(e) => {
                                          const channelStr = String(channelNum);
                                          if (e.target.checked) {
                                            setVideoListSelectedChannels(prev => 
                                              prev.includes(channelStr) ? prev : [...prev, channelStr]
                                            );
                                          } else {
                                            setVideoListSelectedChannels(prev => prev.filter(ch => ch !== channelStr));
                                          }
                                        }}
                                      sx={{
                                        color: colors.text,
                                        '&.Mui-checked': {
                                          color: colors.text,
                                        },
                                        '&.MuiCheckbox-root': {
                                          color: colors.text,
                                        },
                                      }}
                                    />
                                  }
                                  label={`Ch ${channelNum}`}
                                  sx={{ 
                                    color: colors.text,
                                    margin: 0,
                                  }}
                                />
                              ));
                              })()}
                            </div>
                            {/* Hide status tag buttons for jc400 - event-based uploads don't need status filtering */}
                            {getDeviceModel !== 'jc400' && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'row',
                              gap: '6px',
                              alignItems: 'center',
                              flexWrap: 'wrap'
                            }}>
                              {[
                                { status: 'uploaded_ok', label: 'Upload Ok', color: '#4caf50' },
                                { status: 'not_uploaded', label: 'Not Uploaded', color: '#ff9800' },
                                { status: 'upload_errored', label: 'Upload Error', color: '#f44336' },
                                { status: 'pending', label: 'Pending', color: '#2196f3' }
                              ].map(({ status, label, color }) => {
                                const isSelected = videoListSelectedStatuses.includes(status);
                                return (
                                  <button
                                    key={status}
                                    onClick={() => {
                                      if (isSelected) {
                                        setVideoListSelectedStatuses(prev => prev.filter(s => s !== status));
                                      } else {
                                        setVideoListSelectedStatuses(prev => [...prev, status]);
                                      }
                                    }}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      border: `1px solid ${isSelected ? color : colors.border}`,
                                      backgroundColor: isSelected ? `${color}20` : colors.secondary,
                                      color: isSelected ? color : colors.text,
                                      fontSize: '11px',
                                      fontWeight: isSelected ? '600' : '500',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) {
                                        e.currentTarget.style.borderColor = color;
                                        e.currentTarget.style.backgroundColor = `${color}15`;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected) {
                                        e.currentTarget.style.borderColor = colors.border;
                                        e.currentTarget.style.backgroundColor = colors.secondary;
                                      }
                                    }}
                                  >
                                    <div style={{
                                      width: '6px',
                                      height: '6px',
                                      borderRadius: '50%',
                                      backgroundColor: color
                                    }} />
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                            )}
                            <button
                              onClick={async () => {
                                // Reload videos with current date picker values
                                await fetchVideos();
                              }}
                              disabled={videosLoading}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                border: `1px solid #1976d2`,
                                backgroundColor: '#1976d220',
                                color: '#1976d2',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: videosLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                opacity: videosLoading ? 0.6 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (!videosLoading) {
                                  e.currentTarget.style.backgroundColor = '#1976d230';
                                  e.currentTarget.style.borderColor = '#1565c0';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!videosLoading) {
                                  e.currentTarget.style.backgroundColor = '#1976d220';
                                  e.currentTarget.style.borderColor = '#1976d2';
                                }
                              }}
                              title="Reload videos"
                            >
                              {videosLoading ? (
                                <CircularProgress size={12} style={{ color: '#1976d2' }} />
                              ) : (
                                <RefreshOutlinedIcon style={{ fontSize: '14px', color: '#1976d2' }} />
                              )}
                              Reload
                            </button>
                          </div>
                        </div>

                        {/* Video grid - only y-scrollable */}
                        {videosError && (
                          <Typography variant="body2" style={{ 
                            color: colors.error || '#f44336',
                            marginBottom: '16px',
                            padding: '12px',
                            backgroundColor: colors.secondary,
                            borderRadius: '8px'
                          }}>
                            Error loading videos: {videosError}
                          </Typography>
                        )}
                        {videosLoading && filteredVideos.length === 0 ? (
                          <Box style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px'
                          }}>
                            <CircularProgress />
                          </Box>
                        ) : filteredVideos.length === 0 ? (
                          <Typography variant="body2" style={{ 
                            color: colors.textSecondary,
                            padding: '40px',
                            textAlign: 'center'
                          }}>
                            No videos found for selected channels and status
                          </Typography>
                        ) : (
                          <>
                            <Box style={{
                              display: 'grid',
                              gridTemplateColumns: desktop ? 'repeat(4, minmax(0, 1fr))' : 'minmax(0, 1fr)',
                              gap: '4px',
                              rowGap: '4px',
                              columnGap: '4px',
                              overflowY: desktop ? 'auto' : 'visible', // ENABLE SCROLLING
                              overflowX: 'hidden',
                              paddingRight: '4px',
                              flex: desktop ? '1 1 auto' : 'none',
                              minHeight: desktop ? 0 : 'auto',
                              width: '100%',
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                              // CRITICAL: Fixed row height exactly 205px (200px item + 5px spacing)
                              gridAutoRows: '205px',
                              alignItems: 'start',
                              alignContent: 'start',
                            }}>
                              {paginatedVideos.map((video, index) => (
                                <VideoItem 
                                  key={`${video.channel}-${video.beginTime}-${video.status}-${index}`} 
                                  video={video} 
                                  index={index}
                                  colors={colors}
                                  setSelectedVideo={setSelectedVideo}
                                  setShowVideoPlayer={setShowVideoPlayer}
                                  device={device}
                                  fetchVideos={fetchVideos}
                                  setVideos={setVideos}
                                  showSnackbar={showSnackbar}
                                />
                              ))}
                            </Box>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                              <Box style={{
                                display: 'flex',
                                flexDirection: desktop ? 'row' : 'column',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '4px 0',
                                borderTop: `1px solid ${colors.border}`,
                                marginTop: '4px',
                                marginBottom: '0'
                              }}>
                                {desktop && (
                                  <Typography variant="body2" style={{ 
                                    color: colors.textSecondary,
                                    fontSize: '12px'
                                  }}>
                                    Showing {((videosCurrentPage - 1) * videosPerPage) + 1} - {Math.min(videosCurrentPage * videosPerPage, filteredVideos.length)} of {filteredVideos.length} videos
                                    {videosTotalCount > 0 && ` (Total: ${videosTotalCount})`}
                                  </Typography>
                                )}
                                <CustomPagination
                                  page={videosCurrentPage}
                                  totalPages={totalPages}
                                  onPageChange={setVideosCurrentPage}
                                  colors={colors}
                                  size="small"
                                  showFirstLastButtons={true}
                                />
                              </Box>
                            )}
                            {totalPages === 1 && filteredVideos.length > 0 && (
                              <Box style={{
                                padding: '4px 0',
                                borderTop: `1px solid ${colors.border}`,
                                marginTop: '4px',
                                marginBottom: '0',
                                display: desktop ? 'flex' : 'none',
                                justifyContent: 'flex-start'
                              }}>
                                <Typography variant="body2" style={{ 
                                  color: colors.textSecondary,
                                  fontSize: '12px'
                                }}>
                                  Showing {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
                                  {videosTotalCount > 0 && ` (Total: ${videosTotalCount})`}
                                </Typography>
                              </Box>
                            )}
                          </>
                        )}
                            </div>
                        </div>
                      );
                    })()}

                    {/* Channel Tabs Content - Real-time Video */}
                    {selectedChannel > 0 && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: desktop ? '100%' : 'auto'
                      }}>
                        {getIoTHubChannels === 0 ? (
                          <Typography variant="body2" style={{ 
                            color: colors.textSecondary,
                            padding: '12px 16px',
                            fontStyle: 'italic'
                          }}>
                            No channels configured
                          </Typography>
                        ) : (
                          <div style={{
                            width: '100%',
                            maxWidth: '1024px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: colors.secondary,
                            borderRadius: '8px',
                            border: `1px solid ${colors.border}`,
                            aspectRatio: '16/9',
                            position: 'relative',
                            overflow: 'hidden',
                            margin: '0 auto'
                          }}>
                            {streamingLoading && (
                              <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                zIndex: 10
                              }}>
                                <CircularProgress size={48} style={{ color: colors.primary }} />
                                <Typography variant="body2" style={{ 
                                  color: colors.text,
                                  marginTop: '16px',
                                  fontSize: '14px'
                                }}>
                                  Connecting to device... {streamingRetryCount > 0 && `(Retry ${streamingRetryCount}/10)`}
                                </Typography>
                              </div>
                            )}
                            {streamingError && !streamingLoading && (
                              <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                zIndex: 10,
                                padding: '16px'
                              }}>
                                <Typography variant="body2" style={{ 
                                  color: '#f44336',
                                  fontSize: '14px',
                                  textAlign: 'center'
                                }}>
                                  {streamingError}
                                </Typography>
                              </div>
                            )}
                            {streamingVideoUrl && (
                              <video
                                ref={streamingVideoRef}
                                autoPlay
                                controls
                                muted
                                playsInline
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  backgroundColor: '#000'
                                }}
                                onError={(e) => {
                                  // Ignore native video errors - flv.js handles FLV playback
                                  // Only log if flv.js is not handling it
                                  if (!flvPlayerRef.current) {
                                    console.error('Video element error (no flv player):', e);
                                  }
                                }}
                              />
                            )}
                            {!streamingVideoUrl && !streamingLoading && !streamingError && (
                              <Typography variant="body2" style={{ 
                                color: colors.textSecondary,
                                fontSize: '14px'
                              }}>
                                Real-time Video - Channel {selectedChannel}
                              </Typography>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {moreDetailsActiveTab === 1 && (
                  <div style={{ color: colors.text }}>
                    <h3 style={{ color: colors.text, marginBottom: '16px' }}>HikiVision</h3>
                    <p style={{ color: colors.textSecondary }}>HikiVision content goes here...</p>
                  </div>
                )}
                {moreDetailsActiveTab === 2 && (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%',
                    color: colors.text 
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <Typography variant="h6" style={{ 
                        color: colors.text, 
                        fontWeight: '600' 
                      }}>
                        Device Responses
                      </Typography>
                      <IconButton
                        onClick={() => setDeviceMessages([])}
                        size="small"
                        style={{
                          color: colors.textSecondary
                        }}
                        title="Clear logs"
                      >
                        <RefreshOutlinedIcon />
                      </IconButton>
                    </div>
                    
                    <Box style={{
                      flex: 1,
                      overflow: 'auto',
                      backgroundColor: colors.secondary,
                      borderRadius: '8px',
                      padding: '12px',
                      border: `1px solid ${colors.border}`
                    }}>
                      {deviceMessages.length === 0 ? (
                        <Typography variant="body2" style={{ 
                          color: colors.textSecondary,
                          textAlign: 'center',
                          padding: '40px'
                        }}>
                          No device responses yet. Responses will appear here when you interact with the device.
                        </Typography>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {deviceMessages.map((msg) => {
                            // Theme-aware colors for better contrast
                            const isDarkMode = theme === 'dark';
                            const successBg = isDarkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)';
                            const successBorder = isDarkMode ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.4)';
                            const successBadge = isDarkMode ? '#22c55e' : '#16a34a';
                            const errorBg = isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)';
                            const errorBorder = isDarkMode ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.4)';
                            const errorBadge = isDarkMode ? '#ef4444' : '#dc2626';
                            const errorText = isDarkMode ? '#fca5a5' : '#dc2626';
                            const codeBg = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
                            const preBg = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
                            
                            return (
                              <div
                                key={msg.id}
                                style={{
                                  backgroundColor: msg.success ? successBg : errorBg,
                                  border: `1px solid ${msg.success ? successBorder : errorBorder}`,
                                  borderRadius: '6px',
                                  padding: '12px',
                                  fontFamily: 'monospace',
                                  fontSize: '12px'
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '8px',
                                  flexWrap: 'wrap',
                                  gap: '8px'
                                }}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{
                                      padding: '3px 10px',
                                      borderRadius: '4px',
                                      backgroundColor: msg.success ? successBadge : errorBadge,
                                      color: '#ffffff',
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      letterSpacing: '0.5px'
                                    }}>
                                      {msg.success ? 'SUCCESS' : 'ERROR'}
                                    </span>
                                    <span style={{
                                      padding: '3px 10px',
                                      borderRadius: '4px',
                                      backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.15)',
                                      color: isDarkMode ? '#93c5fd' : '#2563eb',
                                      fontSize: '10px',
                                      fontWeight: '600',
                                      border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`
                                    }}>
                                      {msg.type}
                                    </span>
                                    <span style={{
                                      color: colors.text,
                                      fontWeight: '600',
                                      fontSize: '11px'
                                    }}>
                                      {msg.action}
                                    </span>
                                  </div>
                                  <span style={{
                                    color: colors.textSecondary,
                                    fontSize: '11px',
                                    fontWeight: '500'
                                  }}>
                                    {dayjs(msg.timestamp).format('HH:mm:ss.SSS')}
                                  </span>
                                </div>
                                
                                {msg._msg && (
                                  <div style={{
                                    marginTop: '8px',
                                    padding: '10px',
                                    backgroundColor: codeBg,
                                    borderRadius: '4px',
                                    color: colors.text,
                                    fontWeight: '500',
                                    border: `1px solid ${colors.border}`
                                  }}>
                                    <strong style={{ color: colors.text, fontWeight: '600' }}>Message:</strong> <span style={{ color: colors.text }}>{msg._msg}</span>
                                  </div>
                                )}
                                
                                {msg._code && (
                                  <div style={{
                                    marginTop: '6px',
                                    color: colors.textSecondary,
                                    fontSize: '11px',
                                    fontWeight: '500'
                                  }}>
                                    <strong style={{ color: colors.text, fontWeight: '600' }}>Code:</strong> <span style={{ color: colors.textSecondary }}>{msg._code}</span>
                                  </div>
                                )}
                                
                                {msg.videoName && (
                                  <div style={{
                                    marginTop: '6px',
                                    color: colors.textSecondary,
                                    fontSize: '11px',
                                    fontWeight: '500'
                                  }}>
                                    <strong style={{ color: colors.text, fontWeight: '600' }}>Video:</strong> <span style={{ color: colors.textSecondary }}>{msg.videoName}</span>
                                  </div>
                                )}
                                
                                {msg.videoFileName && (
                                  <div style={{
                                    marginTop: '6px',
                                    color: colors.textSecondary,
                                    fontSize: '11px',
                                    fontWeight: '500'
                                  }}>
                                    <strong style={{ color: colors.text, fontWeight: '600' }}>Filename:</strong> <span style={{ color: colors.textSecondary, fontFamily: 'monospace' }}>{msg.videoFileName}</span>
                                  </div>
                                )}
                                
                                {msg.videoDownloadUrl && (
                                  <div style={{
                                    marginTop: '6px',
                                    color: colors.textSecondary,
                                    fontSize: '11px',
                                    fontWeight: '500'
                                  }}>
                                    <strong style={{ color: colors.text, fontWeight: '600' }}>Download URL:</strong>{' '}
                                    <a 
                                      href={msg.videoDownloadUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      download
                                      style={{
                                        color: isDarkMode ? '#93c5fd' : '#2563eb',
                                        textDecoration: 'none',
                                        fontFamily: 'monospace',
                                        fontSize: '10px',
                                        wordBreak: 'break-all',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                    >
                                      <DownloadIcon style={{ fontSize: '12px' }} />
                                      {msg.videoDownloadUrl}
                                    </a>
                                  </div>
                                )}
                                
                                {msg.videoUrl && (
                                  <div style={{
                                    marginTop: '6px',
                                    color: colors.textSecondary,
                                    fontSize: '11px',
                                    fontWeight: '500'
                                  }}>
                                    <strong style={{ color: colors.text, fontWeight: '600' }}>Playback URL:</strong>{' '}
                                    <a 
                                      href={msg.videoUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      style={{
                                        color: isDarkMode ? '#93c5fd' : '#2563eb',
                                        textDecoration: 'none',
                                        fontFamily: 'monospace',
                                        fontSize: '10px',
                                        wordBreak: 'break-all'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                    >
                                      {msg.videoUrl}
                                    </a>
                                  </div>
                                )}
                                
                                {msg.error && (
                                  <div style={{
                                    marginTop: '8px',
                                    padding: '10px',
                                    backgroundColor: errorBg,
                                    borderRadius: '4px',
                                    color: errorText,
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    border: `1px solid ${errorBorder}`
                                  }}>
                                    <strong style={{ color: errorText, fontWeight: '700' }}>Message:</strong> <span style={{ color: errorText }}>{msg.error}</span>
                                  </div>
                                )}
                                
                                {msg.request && (
                                  <details style={{ marginTop: '8px' }}>
                                    <summary style={{
                                      cursor: 'pointer',
                                      color: isDarkMode ? '#93c5fd' : '#2563eb',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      userSelect: 'none',
                                      padding: '4px 0'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                    >
                                      Request Details
                                    </summary>
                                    <pre style={{
                                      marginTop: '8px',
                                      padding: '12px',
                                      backgroundColor: preBg,
                                      borderRadius: '4px',
                                      overflow: 'auto',
                                      fontSize: '10px',
                                      color: colors.text,
                                      maxHeight: '200px',
                                      border: `1px solid ${colors.border}`,
                                      lineHeight: '1.5'
                                    }}>
                                      {msg.request}
                                    </pre>
                                  </details>
                                )}
                                
                                {msg.response && (
                                  <details style={{ marginTop: '8px' }}>
                                    <summary style={{
                                      cursor: 'pointer',
                                      color: isDarkMode ? '#93c5fd' : '#2563eb',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      userSelect: 'none',
                                      padding: '4px 0'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                    >
                                      Response Details
                                    </summary>
                                    <pre style={{
                                      marginTop: '8px',
                                      padding: '12px',
                                      backgroundColor: preBg,
                                      borderRadius: '4px',
                                      overflow: 'auto',
                                      fontSize: '10px',
                                      color: colors.text,
                                      maxHeight: '200px',
                                      border: `1px solid ${colors.border}`,
                                      lineHeight: '1.5'
                                    }}>
                                      {msg.response}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Box>
                  </div>
                )}
              </Box>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Video Player Overlay */}
    <AnimatePresence>
      {showVideoPlayer && selectedVideo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 10005,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowVideoPlayer(false);
              setSelectedVideo(null);
              // Clear videos list to prevent showing old device's videos when switching devices
              setVideos([]);
              setVideosTotalCount(0);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              width: '100%',
              maxWidth: '95vw',
              maxHeight: '95vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#000',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Video Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ flex: 1 }}>
                <Typography variant="body2" style={{ 
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Channel {selectedVideo.channel} • {dayjs(selectedVideo.beginTime, 'YYYY-MM-DD HH:mm:ss').format('MMM DD, YYYY HH:mm')}{user?.name && user?.email ? ` - ${user.name} - ${user.email}` : ''}
                </Typography>
                {selectedVideo.expected_file && (
                  <Typography variant="caption" style={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '11px',
                    display: 'block',
                    marginTop: '2px'
                  }}>
                    {selectedVideo.expected_file}
                  </Typography>
                )}
              </div>
              <IconButton
                onClick={() => {
                  setShowVideoPlayer(false);
                  setSelectedVideo(null);
                  // Clear videos list to prevent showing old device's videos when switching devices
                  setVideos([]);
                  setVideosTotalCount(0);
                }}
                size="small"
                style={{
                  color: '#fff',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  marginLeft: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <X size={20} />
              </IconButton>
            </div>

            {/* Video Player */}
            <div style={{
              position: 'relative',
              width: '100%',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              minHeight: '400px'
            }}>
              <video
                ref={videoRef}
                src={selectedVideo.video_url}
                controls
                controlsList="nodownload nofullscreen"
                autoPlay
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: 'calc(95vh - 120px)',
                  outline: 'none',
                  opacity: 1.0
                }}
                onError={(e) => {
                  console.error('Video playback error:', e);
                  showSnackbar('Failed to load video', 'error');
                }}
              />
              {/* Logo Overlay */}
              {(() => {
                const logoUrl = getLogoUrl() || logo || logoInverted;
                if (!logoUrl) return null;
                
                return (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(-30deg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      pointerEvents: 'none',
                      width: '60%',
                      height: '60%'
                    }}>
                      <img 
                        src={logoUrl} 
                        alt="Logo" 
                        style={{ 
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          opacity: 0.3
                        }}
                        onError={(e) => {
                          const fallbackUrl = logo || logoInverted || fallbackLogo;
                          e.target.src = fallbackUrl;
                        }}
                      />
                    </div>
                    {user?.name && user?.email && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(50% + 15%)',
                        left: '55%',
                        transform: 'translate(-50%, -50%) rotate(-30deg)',
                        zIndex: 10,
                        pointerEvents: 'none',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        <Typography style={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '18px',
                          fontWeight: '500',
                          textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)'
                        }}>
                          {user.name} {user.email}
                        </Typography>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    
    {/* Snackbar for notifications */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={6000}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ 
        zIndex: 999999,
        position: 'fixed',
        '& .MuiSnackbar-root': {
          zIndex: '999999 !important'
        }
      }}
      style={{
        zIndex: 999999,
        position: 'fixed'
      }}
    >
      <Alert
        onClose={hideSnackbar}
        severity={snackbar.severity}
        sx={{ 
          width: '100%',
          zIndex: 999999,
          position: 'relative'
        }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
    
    </>
  );
};

export default FloatingStatusCard;
