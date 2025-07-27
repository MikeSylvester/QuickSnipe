import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, Square, ChevronDown } from 'lucide-react';

interface CameraScannerProps {
  onQrDetected: (url: string) => void;
  isScanning: boolean;
  preferredCamera?: string;
}

interface CameraDevice {
  id: string;
  label: string;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onQrDetected, isScanning, preferredCamera }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Request camera permissions first
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch (err) {
      console.error('Camera permission denied:', err);
      setHasPermission(false);
      setError('Camera permission denied. Please allow camera access and refresh the page.');
      return false;
    }
  };

  // Get available cameras
  const getAvailableCameras = async () => {
    try {
      const devices = await QrScanner.listCameras(true);
      const cameraDevices = devices.map(device => ({
        id: device.id,
        label: device.label || `Camera ${device.id}`
      }));
      setCameras(cameraDevices);
      
      // Select camera based on preferred camera setting or fallback to back camera
      if (cameraDevices.length > 0 && !selectedCamera) {
        let targetCamera = null;
        
        // First try to find the preferred camera
        if (preferredCamera) {
          targetCamera = cameraDevices.find(cam => 
            cam.label.toLowerCase().includes(preferredCamera.toLowerCase())
          );
          console.log('Looking for preferred camera:', preferredCamera, 'Found:', targetCamera?.label);
        }
        
        // If preferred camera not found, try back camera
        if (!targetCamera) {
          targetCamera = cameraDevices.find(cam => 
          cam.label.toLowerCase().includes('back') || 
          cam.label.toLowerCase().includes('environment')
        );
          console.log('Preferred camera not found, using back camera:', targetCamera?.label);
        }
        
        // Fallback to first camera
        if (!targetCamera) {
          targetCamera = cameraDevices[0];
          console.log('Using first available camera:', targetCamera?.label);
        }
        
        setSelectedCamera(targetCamera.id);
      }
      
      return cameraDevices.length > 0;
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Failed to access cameras. Please check permissions and refresh.');
      return false;
    }
  };

  // Initialize QR Scanner with selected camera
  const initializeScanner = async (cameraId?: string) => {
    try {
      if (!videoRef.current) {
        console.error('Video element not available');
        return;
      }

      setError('');

      // Enhanced cleanup of existing scanner
      if (qrScannerRef.current) {
        try {
          console.log('Stopping existing QR scanner...');
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
          console.log('Existing QR scanner destroyed');
        } catch (e) {
          console.warn('Error cleaning up previous scanner:', e);
        }
        qrScannerRef.current = null;
      }

      // Additional cleanup: stop any existing video tracks and wait for them to stop
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        
        console.log('Stopping video tracks in initializeScanner:', tracks.length);
        tracks.forEach(track => {
          console.log('Stopping video track:', track.label);
          track.stop();
        });
        
        // Wait for tracks to actually stop
        await new Promise<void>((resolve) => {
          const checkTracks = () => {
            const activeTracks = tracks.filter(track => track.readyState === 'live');
            if (activeTracks.length === 0) {
              console.log('All video tracks stopped in initializeScanner');
              resolve();
            } else {
              console.log('Waiting for tracks to stop in initializeScanner, active:', activeTracks.length);
              setTimeout(checkTracks, 50);
            }
          };
          checkTracks();
        });
        
        videoRef.current.srcObject = null;
      }

      // Ensure video element is in a clean state
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }

      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const targetCameraId = cameraId || selectedCamera;
      console.log('Initializing scanner with camera:', targetCameraId);

      // Ensure video element is ready
      if (!videoRef.current) {
        throw new Error('Video element not available after cleanup');
      }

      // Create new scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data);
          if (isScanning) {
            // Check if the QR code contains a Snipe-IT hardware URL
            const match = result.data.match(/hardware\/(\d+)$/);
            if (match) {
              console.log('Valid Snipe-IT QR code found, ID:', match[1]);
              onQrDetected(result.data);
            } else {
              console.log('QR code does not match Snipe-IT hardware format');
            }
          }
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: targetCameraId || 'environment',
          maxScansPerSecond: 5,
        }
      );

      console.log('Starting QR scanner...');
      
      // Ensure video element is ready before starting
      if (videoRef.current) {
        videoRef.current.pause();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Start the scanner
      await qrScannerRef.current.start();
      console.log('QR scanner started successfully');
      
      setError('');
    } catch (err) {
      console.error('Scanner initialization error:', err);
      setError(`Failed to start camera: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Initial setup
  useEffect(() => {
    const setup = async () => {
      console.log('Setting up camera scanner...');
      
      // First request camera permission
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        return;
      }

      // Then get available cameras
      const hasCamera = await getAvailableCameras();
      if (!hasCamera) {
        setError('No cameras found. Please connect a webcam and refresh the page.');
        return;
      }

      // Allow video element to render
      setIsInitializing(false);
    };

    setup();

    return () => {
      console.log('Cleaning up camera scanner...');
      if (qrScannerRef.current) {
        try {
          console.log('Stopping QR scanner during cleanup...');
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
          console.log('QR scanner destroyed during cleanup');
        } catch (e) {
          console.warn('Error during cleanup:', e);
        }
        qrScannerRef.current = null;
      }
      
      // Additional cleanup: stop any video tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          console.log('Stopping video track during cleanup:', track.label);
          track.stop();
        });
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // Initialize scanner when video element is ready
  useEffect(() => {
    if (!isInitializing && videoRef.current && selectedCamera && !isSwitchingCamera) {
      console.log('Video element ready, initializing scanner...');
      // Small delay to ensure video element is fully rendered
      setTimeout(() => {
        initializeScanner();
      }, 100);
    }
  }, [isInitializing, selectedCamera, isSwitchingCamera]);

  // Handle camera selection change
  const handleCameraChange = async (cameraId: string) => {
    if (isSwitchingCamera) {
      console.log('Camera switch already in progress, ignoring...');
      return;
    }
    
    console.log('Changing camera to:', cameraId);
    setIsSwitchingCamera(true);
    setError(''); // Clear any previous errors
    
    try {
      // Step 1: Stop the QR scanner
      if (qrScannerRef.current) {
        try {
          console.log('Stopping existing QR scanner for camera switch...');
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
          console.log('Existing QR scanner destroyed for camera switch');
        } catch (e) {
          console.warn('Error cleaning up previous scanner during switch:', e);
        }
        qrScannerRef.current = null;
      }

      // Step 2: Stop all video tracks and wait for them to fully stop
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        
        console.log('Stopping video tracks:', tracks.length);
        tracks.forEach(track => {
          console.log('Stopping video track:', track.label);
          track.stop();
        });
        
        // Wait for tracks to actually stop
        await new Promise<void>((resolve) => {
          const checkTracks = () => {
            const activeTracks = tracks.filter(track => track.readyState === 'live');
            if (activeTracks.length === 0) {
              console.log('All video tracks stopped');
              resolve();
            } else {
              console.log('Waiting for tracks to stop, active:', activeTracks.length);
              setTimeout(checkTracks, 50);
            }
          };
          checkTracks();
        });
        
        videoRef.current.srcObject = null;
      }

      // Step 3: Update state
    setSelectedCamera(cameraId);
      
      // Step 4: Reset video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.load();
      }
      
      // Step 5: Wait for everything to be ready
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Step 6: Initialize the new camera
    await initializeScanner(cameraId);
      console.log('Camera switch completed successfully');
    } catch (error) {
      console.error('Error switching camera:', error);
      setError(`Failed to switch camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  // Handle scanning state changes
  useEffect(() => {
    if (qrScannerRef.current) {
      try {
        if (isScanning) {
          console.log('Resuming QR scanning...');
          qrScannerRef.current.start();
        } else {
          console.log('Pausing QR scanning...');
          qrScannerRef.current.stop();
        }
      } catch (err) {
        console.error('Error changing scanning state:', err);
      }
    }
  }, [isScanning]);

  // Retry function
  const handleRetry = async () => {
    setError('');
    console.log('Retrying camera initialization...');
    
    // Force cleanup before retry
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      } catch (e) {
        console.warn('Error during retry cleanup:', e);
      }
      qrScannerRef.current = null;
    }
    
    // Clean up video tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        console.log('Stopping video track during retry:', track.label);
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    
    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (videoRef.current && selectedCamera) {
      await initializeScanner();
    } else {
      // Re-trigger the setup flow
      setIsInitializing(true);
      window.location.reload();
    }
  };

  if (hasPermission === false) {
    return (
      <div className="space-y-4">
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
          <div className="text-center text-white p-6">
            <Camera className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-400 font-medium mb-2">Camera Permission Required</p>
            <p className="text-sm text-gray-300 mb-4">
              This application needs camera access to scan QR codes. Please allow camera permissions and refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !isInitializing) {
    return (
      <div className="space-y-4">
        {cameras.length > 0 && (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Camera
            </label>
            <select
              value={selectedCamera}
              onChange={(e) => handleCameraChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
            >
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
        
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
          <div className="text-center text-white p-6">
            <Camera className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-400 font-medium mb-2">Camera Error</p>
            <p className="text-sm text-gray-300 mb-4">{error}</p>
            <div className="space-x-2">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Camera Selector */}
      {cameras.length > 1 && (
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Camera
          </label>
          <select
            value={selectedCamera}
            onChange={(e) => handleCameraChange(e.target.value)}
            disabled={isInitializing || isSwitchingCamera}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10 disabled:opacity-50"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      )}

      {/* Camera Preview */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        {isInitializing ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white p-6">
              <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
              <p className="text-gray-300 mb-2">Initializing camera...</p>
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <Square className="w-48 h-48 text-blue-500 opacity-70" strokeWidth={2} />
                {isScanning && (
                  <div className="absolute inset-0 border-2 border-blue-400 animate-pulse rounded-lg" />
                )}
              </div>
            </div>

            {/* Status indicator */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
              {isScanning ? 'Scanning for QR codes...' : 'Scanning paused'}
            </div>

            {/* Camera info */}
            {cameras.length > 0 && (
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
                {isSwitchingCamera ? (
                  <>
                    <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
                    Switching camera...
                  </>
                ) : (
                  cameras.find(c => c.id === selectedCamera)?.label || 'Camera'
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};