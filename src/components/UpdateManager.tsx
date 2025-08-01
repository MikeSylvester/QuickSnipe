import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

interface UpdateManagerProps {
  darkMode: boolean;
}

export const UpdateManager: React.FC<UpdateManagerProps> = ({ darkMode }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<UpdateProgress | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showNoUpdateMessage, setShowNoUpdateMessage] = useState(false);
  const [hasCheckedOnStartup, setHasCheckedOnStartup] = useState(false);

  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

  useEffect(() => {
    if (!isElectron) return;

    // Set up event listeners
    const handleUpdateAvailable = (event: any, info: UpdateInfo) => {
      setUpdateAvailable(true);
      setUpdateInfo(info);
      setError(null);
      setShowUpdateModal(true);
    };

    const handleUpdateNotAvailable = () => {
      setUpdateAvailable(false);
      setUpdateInfo(null);
      setError(null);
      if (hasCheckedOnStartup) {
        setShowNoUpdateMessage(true);
        // Hide the message after 3 seconds
        setTimeout(() => setShowNoUpdateMessage(false), 3000);
      }
    };

    const handleUpdateError = (event: any, errorMessage: string) => {
      setError(errorMessage);
      setIsChecking(false);
      setIsDownloading(false);
    };

    const handleDownloadProgress = (event: any, progress: UpdateProgress) => {
      setDownloadProgress(progress);
    };

    const handleUpdateDownloaded = () => {
      setIsDownloaded(true);
      setIsDownloading(false);
      setDownloadProgress(null);
    };

    // Register event listeners
    (window as any).electronAPI.onUpdateAvailable(handleUpdateAvailable);
    (window as any).electronAPI.onUpdateNotAvailable(handleUpdateNotAvailable);
    (window as any).electronAPI.onUpdateError(handleUpdateError);
    (window as any).electronAPI.onUpdateDownloadProgress(handleDownloadProgress);
    (window as any).electronAPI.onUpdateDownloaded(handleUpdateDownloaded);

    // Cleanup function
    return () => {
      // Note: In a real app, you'd want to remove these listeners
      // but electron-updater doesn't provide a removeListener method
    };
  }, [isElectron, hasCheckedOnStartup]);

  // Check for updates on startup
  useEffect(() => {
    if (!isElectron || hasCheckedOnStartup) return;

    const checkForUpdatesOnStartup = async () => {
      try {
        console.log('Checking for updates on startup...');
        await (window as any).electronAPI.checkForUpdates();
        setHasCheckedOnStartup(true);
      } catch (error) {
        console.error('Startup update check failed:', error);
        setHasCheckedOnStartup(true);
      }
    };

    // Wait a bit for the app to fully load
    const timer = setTimeout(checkForUpdatesOnStartup, 2000);
    return () => clearTimeout(timer);
  }, [isElectron, hasCheckedOnStartup]);

  const checkForUpdates = async () => {
    if (!isElectron) return;

    setIsChecking(true);
    setError(null);
    setShowNoUpdateMessage(false);
    
    try {
      const result = await (window as any).electronAPI.checkForUpdates();
      if (!result.success) {
        setError(result.error || 'Failed to check for updates');
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
      } else {
        // If the check was successful but no update event was fired, 
        // it means no updates are available
        setTimeout(() => {
          if (!updateAvailable && !error) {
            setShowNoUpdateMessage(true);
            setTimeout(() => setShowNoUpdateMessage(false), 3000);
          }
        }, 1000);
      }
    } catch (err) {
      setError('Failed to check for updates');
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsChecking(false);
    }
  };

  const downloadUpdate = async () => {
    if (!isElectron) return;

    setIsDownloading(true);
    setError(null);
    
    try {
      const result = await (window as any).electronAPI.downloadUpdate();
      if (!result.success) {
        setError(result.error || 'Failed to download update');
        setIsDownloading(false);
      }
    } catch (err) {
      setError('Failed to download update');
      setIsDownloading(false);
    }
  };

  const installUpdate = async () => {
    if (!isElectron) return;

    try {
      await (window as any).electronAPI.installUpdate();
    } catch (err) {
      setError('Failed to install update');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const formatReleaseNotes = (notes: string) => {
    // Remove HTML tags and decode entities
    const cleanNotes = notes
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<') // Decode HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    // Split into lines and format
    const lines = cleanNotes.split('\n').filter(line => line.trim());
    
    return (
      <div className="space-y-1">
        {lines.map((line, index) => {
          if (line.startsWith('##')) {
            // Version header
            return (
              <div key={index} className="font-semibold text-blue-600 dark:text-blue-400">
                {line.replace('##', '').trim()}
              </div>
            );
          } else if (line.startsWith('-') || line.startsWith('•')) {
            // List item
            return (
              <div key={index} className="flex items-start">
                <span className="text-gray-500 dark:text-gray-400 mr-2">•</span>
                <span className="flex-1">{line.replace(/^[-•]\s*/, '').trim()}</span>
              </div>
            );
          } else {
            // Regular text
            return (
              <div key={index} className="text-gray-700 dark:text-gray-300">
                {line}
              </div>
            );
          }
        })}
      </div>
    );
  };

  if (!isElectron) {
    return null; // Don't show update manager in web version
  }

  return (
    <>
      {/* Update Check Button */}
      <div className="relative">
        <button
          onClick={updateAvailable ? () => setShowUpdateModal(true) : checkForUpdates}
          disabled={isChecking}
          className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isChecking
              ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              : updateAvailable
              ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white'
          }`}
        >
          {isChecking ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : updateAvailable ? (
            <Download className="w-4 h-4 mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isChecking 
            ? 'Checking...' 
            : updateAvailable 
            ? 'Start Update' 
            : 'Check for Updates'
          }
        </button>
        
        {/* Update Available Badge */}
        {updateAvailable && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </div>

      {/* No Update Available Message */}
      {showNoUpdateMessage && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg border ${
            darkMode 
              ? 'bg-green-900/90 border-green-700 text-green-200' 
              : 'bg-green-100 border-green-300 text-green-800'
          }`}>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">You're up to date!</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg border ${
            darkMode 
              ? 'bg-red-900/90 border-red-700 text-red-200' 
              : 'bg-red-100 border-red-300 text-red-800'
          }`}>
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && updateAvailable && updateInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Update Available</h3>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Version {updateInfo.version} is available
              </p>
              {updateInfo.releaseNotes && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Release Notes:</strong>
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg max-h-32 overflow-y-auto">
                    {formatReleaseNotes(updateInfo.releaseNotes)}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2" />
                  <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </div>
              </div>
            )}

            {isDownloading && downloadProgress && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Downloading...</span>
                  <span>{Math.round(downloadProgress.percent)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>{formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}</span>
                  <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
                </div>
              </div>
            )}

            {isDownloaded && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
                  <span className="text-sm text-green-700 dark:text-green-300">Update downloaded and ready to install</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {!isDownloading && !isDownloaded && (
                <button
                  onClick={downloadUpdate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Download Update
                </button>
              )}
              
              {isDownloaded && (
                <button
                  onClick={installUpdate}
                  className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Install & Restart
                </button>
              )}
              
              <button
                onClick={() => setShowUpdateModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 