import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, Square, ChevronDown } from 'lucide-react';

interface CameraScannerProps {
  onQrDetected: (url: string) => void;
  isScanning: boolean;
}

interface CameraDevice {
  id: string;
  label: string;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onQrDetected, isScanning }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
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
      
      // Select the first camera by default, preferring back camera if available
      if (cameraDevices.length > 0 && !selectedCamera) {
        const backCamera = cameraDevices.find(cam => 
          cam.label.toLowerCase().includes('back') || 
          cam.label.toLowerCase().includes('environment')
        );
        setSelectedCamera(backCamera?.id || cameraDevices[0].id);
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

      // Clean up existing scanner
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
        } catch (e) {
          console.warn('Error cleaning up previous scanner:', e);
        }
        qrScannerRef.current = null;
      }

      const targetCameraId = cameraId || selectedCamera;
      console.log('Initializing scanner with camera:', targetCameraId);

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
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
        } catch (e) {
          console.warn('Error during cleanup:', e);
        }
      }
    };
  }, []);

  // Initialize scanner when video element is ready
  useEffect(() => {
    if (!isInitializing && videoRef.current && selectedCamera) {
      console.log('Video element ready, initializing scanner...');
      // Small delay to ensure video element is fully rendered
      setTimeout(() => {
        initializeScanner();
      }, 100);
    }
  }, [isInitializing, selectedCamera]);

  // Handle camera selection change
  const handleCameraChange = async (cameraId: string) => {
    console.log('Changing camera to:', cameraId);
    setSelectedCamera(cameraId);
    await initializeScanner(cameraId);
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
            disabled={isInitializing}
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
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs">
                {cameras.find(c => c.id === selectedCamera)?.label || 'Camera'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};