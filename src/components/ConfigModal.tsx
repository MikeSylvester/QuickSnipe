import React, { useState, useEffect } from 'react';
import { X, Settings, Eye, ArrowLeft } from 'lucide-react';
import { snipeItApi } from '../services/snipeItApi';
import { LabelGenerator } from './LabelGenerator';

interface ConfigModalProps {
  onBack: () => void;
  onSave: (config: { 
    baseUrl: string; 
    apiToken: string; 
    locationId: number; 
    locationName: string; 
    techBenchLocationId: number;
    storageLocationId: number;
    returnBinLocationId: number;
    preferredCamera: string;
    labelSettings: {
      widthMM: number;
      heightMM: number;
      qrCodeSize: number;
      baseFontSize: number;
      margin: number;
      includeName: boolean;
      includeModel: boolean;
      includeSerial: boolean;
      includeAssetTag: boolean;
      useVerticalLayout: boolean;
      // New settings for enhanced label customization
      nameFontSize: number;
      modelFontSize: number;
      serialFontSize: number;
      assetTagFontSize: number;
      namePosition: 'right' | 'below';
      modelPosition: 'right' | 'below';
      serialPosition: 'right' | 'below';
      assetTagPosition: 'right' | 'below';
    };
  }) => void;
  currentConfig: { 
    baseUrl: string; 
    apiToken: string; 
    locationId: number; 
    locationName: string; 
    techBenchLocationId: number;
    storageLocationId: number;
    returnBinLocationId: number;
    preferredCamera: string;
    labelSettings: {
      widthMM: number;
      heightMM: number;
      qrCodeSize: number;
      baseFontSize: number;
      margin: number;
      includeName: boolean;
      includeModel: boolean;
      includeSerial: boolean;
      includeAssetTag: boolean;
      useVerticalLayout: boolean;
      // New settings for enhanced label customization
      nameFontSize: number;
      modelFontSize: number;
      serialFontSize: number;
      assetTagFontSize: number;
      namePosition: 'right' | 'below';
      modelPosition: 'right' | 'below';
      serialPosition: 'right' | 'below';
      assetTagPosition: 'right' | 'below';
    };
  };
  darkMode?: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  onBack,
  onSave,
  currentConfig,
  darkMode = false
}) => {
  const [appVersion, setAppVersion] = useState('1.0.2');
  const [baseUrl, setBaseUrl] = useState(currentConfig.baseUrl);
  const [apiToken, setApiToken] = useState(currentConfig.apiToken);

  // Get app version
  useEffect(() => {
    const getVersion = async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.getAppVersion) {
        try {
          const version = await (window as any).electronAPI.getAppVersion();
          setAppVersion(version);
        } catch (error) {
          console.error('Failed to get app version:', error);
        }
      }
    };
    getVersion();
  }, []);
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([]);
  const [locationId, setLocationId] = useState(currentConfig.locationId || '');
  const [locationName, setLocationName] = useState(currentConfig.locationName || '');
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [techBenchLocationId, setTechBenchLocationId] = useState(currentConfig.techBenchLocationId || '');
  const [storageLocationId, setStorageLocationId] = useState(currentConfig.storageLocationId || '');
  const [returnBinLocationId, setReturnBinLocationId] = useState(currentConfig.returnBinLocationId || '');
  const [preferredCamera, setPreferredCamera] = useState(currentConfig.preferredCamera || '');
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [showLabelSettings, setShowLabelSettings] = useState(false);
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [isInPreviewMode, setIsInPreviewMode] = useState(false);
  const [labelSettings, setLabelSettings] = useState(currentConfig.labelSettings || {
    widthMM: 40,
    heightMM: 30,
    qrCodeSize: 0.6,
    baseFontSize: 72,
    margin: 10,
    includeName: true,
    includeModel: true,
    includeSerial: true,
    includeAssetTag: true,
    useVerticalLayout: false,
    // New settings for enhanced label customization
    nameFontSize: 72,
    modelFontSize: 72,
    serialFontSize: 72,
    assetTagFontSize: 72,
    namePosition: 'right',
    modelPosition: 'right',
    serialPosition: 'right',
    assetTagPosition: 'right',
  });

  // Sample equipment data for preview
  const sampleEquipment = {
    id: 999999,
    name: 'Dell Latitude 5520',
    asset_tag: 'ASSET001',
    serial: 'ABC123456789',
    model: {
      id: 1,
      name: 'Latitude 5520'
    },
    status_label: {
      id: 1,
      name: 'Ready to Deploy',
      status_type: 'deployable',
      status_meta: 'ready'
    },
    location: {
      id: 1,
      name: 'Main Office'
    },
    assigned_to: null,
    checkout_date: null,
    eol_date: null,
    last_checkout: null
  };

  // Create config with current label settings for preview
  const previewConfig = {
    ...currentConfig,
    labelSettings: labelSettings
  };

  useEffect(() => {
    setBaseUrl(currentConfig.baseUrl);
    setApiToken(currentConfig.apiToken);
    setLocationId(currentConfig.locationId || '');
    setLocationName(currentConfig.locationName || '');
    setTechBenchLocationId(currentConfig.techBenchLocationId || '');
    setStorageLocationId(currentConfig.storageLocationId || '');
    setReturnBinLocationId(currentConfig.returnBinLocationId || '');
    // Update label settings when currentConfig changes
    if (currentConfig.labelSettings) {
      setLabelSettings(currentConfig.labelSettings);
    }
  }, [currentConfig]);

  // Fetch storage users when component mounts
  useEffect(() => {
    if (baseUrl && apiToken) {
      setLoadingLocations(true);
      snipeItApi.setConfig(baseUrl, apiToken);
      snipeItApi.getLocations().then(locs => {
        setLocations(locs);
        setLoadingLocations(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, apiToken]);

  // Load available cameras
  const loadAvailableCameras = async () => {
    setLoadingCameras(true);
    try {
      // Request camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      
      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const cameraDevices = videoDevices.map(device => ({
        id: device.deviceId,
        label: device.label || `Camera ${device.deviceId}`
      }));
      
      setAvailableCameras(cameraDevices);
    } catch (error) {
      console.error('Error loading cameras:', error);
      setAvailableCameras([]);
    } finally {
      setLoadingCameras(false);
    }
  };

  // Load cameras when component mounts
  useEffect(() => {
    loadAvailableCameras();
  }, []);



  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    const selectedLoc = locations.find(l => l.id === Number(locationId));
    const configToSave = {
      baseUrl,
      apiToken,
      locationId: Number(locationId),
      locationName: selectedLoc ? selectedLoc.name : '',
      techBenchLocationId: Number(techBenchLocationId),
      storageLocationId: Number(storageLocationId),
      returnBinLocationId: Number(returnBinLocationId),
      preferredCamera,
      labelSettings
    };
    await onSave(configToSave);
    setSaving(false);
    onBack();
  };

  const handleShowPreview = () => {
    setIsInPreviewMode(true);
  };

  const handleClosePreview = () => {
    setIsInPreviewMode(false);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    // Simple toast for preview - could be enhanced with a proper toast system
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  // If in preview mode, show the label generator directly
  if (isInPreviewMode) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-6">
            <button
              onClick={handleClosePreview}
              className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6 mr-2" />
              <span className="text-lg">Back to Settings</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Label Preview</h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto p-6">
          <LabelGenerator
            equipment={sampleEquipment}
            config={previewConfig}
            onBack={handleClosePreview}
            showToast={showToast}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between p-6">
            <button
              onClick={onBack}
              className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6 mr-2" />
              <span className="text-lg">Back to Menu</span>
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentConfig.baseUrl && currentConfig.apiToken ? 'Configuration' : 'Initial Setup'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Version {appVersion}</p>
            </div>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-120px)] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Snipe-IT Configuration</h2>
            </div>
            <div className="w-5 h-5"></div>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {!currentConfig.baseUrl && !currentConfig.apiToken && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-6 mb-6">
                <div className="flex items-center">
                  <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-4" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Welcome to Quicksnipe!</h3>
                    <p className="text-blue-700 dark:text-blue-300">Please configure your Snipe-IT connection to get started. You'll need your Snipe-IT URL and an API token.</p>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Snipe-IT Base URL
              </label>
              <input
                type="url"
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://your-snipe-it.example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter your Snipe-IT installation URL</p>
            </div>

            <div>
              <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Token
              </label>
              <input
                type="password"
                id="apiToken"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Your API token"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Generate this in Snipe-IT under Account Preferences → API Keys
              </p>
            </div>

            <div>
              <label htmlFor="location" className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Location
              </label>
              <select
                id="location"
                value={locationId}
                onChange={e => {
                  setLocationId(Number(e.target.value));
                  const loc = locations.find(l => l.id === Number(e.target.value));
                  setLocationName(loc ? loc.name : '');
                }}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                disabled={loadingLocations}
              >
                <option value="">{loadingLocations ? 'Loading locations...' : 'Select a location'}</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="techBenchLocation" className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tech Bench Location
              </label>
              <select
                id="techBenchLocation"
                value={techBenchLocationId}
                onChange={e => setTechBenchLocationId(Number(e.target.value))}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                disabled={loadingLocations}
              >
                <option value="">{loadingLocations ? 'Loading locations...' : 'Select tech bench location'}</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="storageLocation" className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Storage Location
              </label>
              <select
                id="storageLocation"
                value={storageLocationId}
                onChange={e => setStorageLocationId(Number(e.target.value))}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                disabled={loadingLocations}
              >
                <option value="">{loadingLocations ? 'Loading locations...' : 'Select storage location'}</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="returnBinLocation" className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Return Bin Location
              </label>
              <select
                id="returnBinLocation"
                value={returnBinLocationId}
                onChange={e => setReturnBinLocationId(Number(e.target.value))}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                disabled={loadingLocations}
              >
                <option value="">{loadingLocations ? 'Loading locations...' : 'Select return bin location'}</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="preferredCamera" className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Camera
              </label>
              <select
                id="preferredCamera"
                value={preferredCamera}
                onChange={e => setPreferredCamera(e.target.value)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={loadingCameras}
              >
                <option value="">{loadingCameras ? 'Loading cameras...' : 'Select preferred camera (optional)'}</option>
                {availableCameras.map(camera => (
                  <option key={camera.id} value={camera.label}>
                    {camera.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select your preferred camera. If not selected, the system will use the back camera or first available camera.
              </p>
            </div>

            {/* Label Settings Section */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Label Generation Settings</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleShowPreview}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLabelSettings(!showLabelSettings)}
                    className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 text-sm font-medium"
                  >
                    {showLabelSettings ? 'Hide Settings' : 'Show Settings'}
                  </button>
                </div>
              </div>
              
              {showLabelSettings && (
                <div className="space-y-4 bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  {/* Label Size */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Width (mm)
                      </label>
                      <input
                        type="number"
                        value={labelSettings.widthMM}
                        onChange={e => setLabelSettings({...labelSettings, widthMM: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                        min="20"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Height (mm)
                      </label>
                      <input
                        type="number"
                        value={labelSettings.heightMM}
                        onChange={e => setLabelSettings({...labelSettings, heightMM: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                        min="15"
                        max="80"
                      />
                    </div>
                  </div>

                  {/* QR Code Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      QR Code Size ({Math.round(labelSettings.qrCodeSize * 100)}%)
                    </label>
                    <div className="relative">
                      <input
                        type="range"
                        value={labelSettings.qrCodeSize}
                        onChange={e => setLabelSettings({...labelSettings, qrCodeSize: Number(e.target.value)})}
                        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
                        min="0.3"
                        max="1.5"
                        step="0.05"
                        style={{
                          background: `linear-gradient(to right, #f97316 0%, #f97316 ${(labelSettings.qrCodeSize - 0.3) / 1.2 * 100}%, #e5e7eb ${(labelSettings.qrCodeSize - 0.3) / 1.2 * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>30%</span>
                        <span>150%</span>
                      </div>
                    </div>
                  </div>

                  {/* Font Sizes */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Font Sizes:</h4>
                    
                    {/* Base Font Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Base Font Size ({labelSettings.baseFontSize}px)
                      </label>
                      <div className="relative">
                        <input
                          type="range"
                          value={labelSettings.baseFontSize}
                          onChange={e => setLabelSettings({...labelSettings, baseFontSize: Number(e.target.value)})}
                          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
                          min="8"
                          max="120"
                          step="1"
                          style={{
                            background: `linear-gradient(to right, #f97316 0%, #f97316 ${(labelSettings.baseFontSize - 8) / 112 * 100}%, #e5e7eb ${(labelSettings.baseFontSize - 8) / 112 * 100}%, #e5e7eb 100%)`
                          }}
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>8px</span>
                          <span>120px</span>
                        </div>
                      </div>
                    </div>

                    {/* Individual Font Sizes */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Name Font Size ({labelSettings.nameFontSize}px)
                        </label>
                        <input
                          type="range"
                          value={labelSettings.nameFontSize}
                          onChange={e => setLabelSettings({...labelSettings, nameFontSize: Number(e.target.value)})}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
                          min="8"
                          max="120"
                          step="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Model Font Size ({labelSettings.modelFontSize}px)
                        </label>
                        <input
                          type="range"
                          value={labelSettings.modelFontSize}
                          onChange={e => setLabelSettings({...labelSettings, modelFontSize: Number(e.target.value)})}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
                          min="8"
                          max="120"
                          step="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Serial Font Size ({labelSettings.serialFontSize}px)
                        </label>
                        <input
                          type="range"
                          value={labelSettings.serialFontSize}
                          onChange={e => setLabelSettings({...labelSettings, serialFontSize: Number(e.target.value)})}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
                          min="8"
                          max="120"
                          step="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Asset Tag Font Size ({labelSettings.assetTagFontSize}px)
                        </label>
                        <input
                          type="range"
                          value={labelSettings.assetTagFontSize}
                          onChange={e => setLabelSettings({...labelSettings, assetTagFontSize: Number(e.target.value)})}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
                          min="8"
                          max="120"
                          step="1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Margin */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Margin ({labelSettings.margin}px)
                    </label>
                    <div className="relative">
                      <input
                        type="range"
                        value={labelSettings.margin}
                        onChange={e => setLabelSettings({...labelSettings, margin: Number(e.target.value)})}
                        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
                        min="0"
                        max="20"
                        step="1"
                        style={{
                          background: `linear-gradient(to right, #f97316 0%, #f97316 ${(labelSettings.margin - 0) / 20 * 100}%, #e5e7eb ${(labelSettings.margin - 0) / 20 * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>0px</span>
                        <span>20px</span>
                      </div>
                    </div>
                  </div>

                  {/* Layout Toggle */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={labelSettings.useVerticalLayout}
                        onChange={e => setLabelSettings({...labelSettings, useVerticalLayout: e.target.checked})}
                        className="rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Force Vertical Layout (QR code on top, text below)
                      </span>
                    </label>
                  </div>

                  {/* Content Options */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Include in Label:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={labelSettings.includeName}
                          onChange={e => setLabelSettings({...labelSettings, includeName: e.target.checked})}
                          className="rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Asset Name</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={labelSettings.includeModel}
                          onChange={e => setLabelSettings({...labelSettings, includeModel: e.target.checked})}
                          className="rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Model</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={labelSettings.includeSerial}
                          onChange={e => setLabelSettings({...labelSettings, includeSerial: e.target.checked})}
                          className="rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Serial Number</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={labelSettings.includeAssetTag}
                          onChange={e => setLabelSettings({...labelSettings, includeAssetTag: e.target.checked})}
                          className="rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Asset Tag</span>
                      </label>
                    </div>
                  </div>

                  {/* Element Positioning */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Element Positioning:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Name Position
                        </label>
                        <select
                          value={labelSettings.namePosition}
                          onChange={e => setLabelSettings({...labelSettings, namePosition: e.target.value as 'right' | 'below'})}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          <option value="right">Right of QR Code</option>
                          <option value="below">Below QR Code</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Model Position
                        </label>
                        <select
                          value={labelSettings.modelPosition}
                          onChange={e => setLabelSettings({...labelSettings, modelPosition: e.target.value as 'right' | 'below'})}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          <option value="right">Right of QR Code</option>
                          <option value="below">Below QR Code</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Serial Position
                        </label>
                        <select
                          value={labelSettings.serialPosition}
                          onChange={e => setLabelSettings({...labelSettings, serialPosition: e.target.value as 'right' | 'below'})}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          <option value="right">Right of QR Code</option>
                          <option value="below">Below QR Code</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Asset Tag Position
                        </label>
                        <select
                          value={labelSettings.assetTagPosition}
                          onChange={e => setLabelSettings({...labelSettings, assetTagPosition: e.target.value as 'right' | 'below'})}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          <option value="right">Right of QR Code</option>
                          <option value="below">Below QR Code</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Preview Info */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-600 rounded p-2">
                    <p>Preview: {labelSettings.widthMM}mm × {labelSettings.heightMM}mm label</p>
                    <p>QR Code: {Math.round(labelSettings.qrCodeSize * 100)}% of available space</p>
                    <p>Font Sizes: Name({labelSettings.nameFontSize}px), Model({labelSettings.modelFontSize}px), Serial({labelSettings.serialFontSize}px), Tag({labelSettings.assetTagFontSize}px)</p>
                  </div>
                </div>
              )}
            </div>

          </div>
          
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-xl text-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white rounded-xl text-lg font-semibold transition-colors"
              disabled={loadingLocations || saving}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};