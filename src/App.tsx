import React, { useState, useEffect } from 'react';
import { MainMenu } from './components/MainMenu';
import { StoreroomSorter } from './components/StoreroomSorter';
import { QuickInventory } from './components/QuickInventory';
import { CheckInOutKiosk } from './components/CheckInOutKiosk';
import { ConfigModal } from './components/ConfigModal';
import { snipeItApi } from './services/snipeItApi';
import { Toast } from './components/Toast';

// Type declaration for window.electronAPI
declare global {
  interface Window {
    electronAPI?: {
      openExternal: (url: string) => void;
      getConfig?: () => Promise<any>;
      setConfig?: (config: any) => Promise<void>;
      searchAD: (pattern: string) => Promise<any>;
      toggleKioskMode?: () => Promise<void>;
      exitApplication?: () => Promise<void>;
      exitKioskMode?: () => Promise<void>;
    };
  }
}

export type AppMode = 'menu' | 'storeroom' | 'inventory' | 'kiosk' | 'config';

const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('menu');
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [kioskMode, setKioskMode] = useState(false);
  const [config, setConfig] = useState({
    baseUrl: '',
    apiToken: '',
    locationId: 0,
    locationName: '',
    setupComplete: false,
    techBenchLocationId: 0,
    storageLocationId: 0,
    returnBinLocationId: 0,
    preferredCamera: '',
    labelSettings: {
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
      namePosition: 'right' as 'right' | 'below',
      modelPosition: 'right' as 'right' | 'below',
      serialPosition: 'right' as 'right' | 'below',
      assetTagPosition: 'right' as 'right' | 'below',
    }
  });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isConfigured = Boolean(config.baseUrl && config.apiToken);

  // Load dark mode preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Load config from Electron or localStorage
  useEffect(() => {
    const loadConfig = async () => {
      if (isElectron) {
        let electronConfig: any = {};
        try {
          electronConfig = await (window as any).electronAPI.getConfig();
        } catch (error) {
          console.error('Error loading Electron config:', error);
        }
        setConfig({
          baseUrl: electronConfig.baseUrl || '',
          apiToken: electronConfig.apiToken || '',
          locationId: electronConfig.locationId || 0,
          locationName: electronConfig.locationName || '',
          setupComplete: electronConfig.setupComplete || false,
          techBenchLocationId: electronConfig.techBenchLocationId || 0,
          storageLocationId: electronConfig.storageLocationId || 0,
          returnBinLocationId: electronConfig.returnBinLocationId || 0,
          preferredCamera: electronConfig.preferredCamera || '',
          labelSettings: electronConfig.labelSettings ? {
            widthMM: electronConfig.labelSettings.widthMM ?? 40,
            heightMM: electronConfig.labelSettings.heightMM ?? 30,
            qrCodeSize: electronConfig.labelSettings.qrCodeSize ?? 0.6,
            baseFontSize: electronConfig.labelSettings.baseFontSize ?? 12,
            margin: electronConfig.labelSettings.margin ?? 10,
            includeName: electronConfig.labelSettings.includeName ?? true,
            includeModel: electronConfig.labelSettings.includeModel ?? true,
            includeSerial: electronConfig.labelSettings.includeSerial ?? true,
            includeAssetTag: electronConfig.labelSettings.includeAssetTag ?? true,
            useVerticalLayout: electronConfig.labelSettings.useVerticalLayout ?? false,
            // New settings for enhanced label customization
            nameFontSize: electronConfig.labelSettings.nameFontSize ?? 72,
            modelFontSize: electronConfig.labelSettings.modelFontSize ?? 72,
            serialFontSize: electronConfig.labelSettings.serialFontSize ?? 72,
            assetTagFontSize: electronConfig.labelSettings.assetTagFontSize ?? 72,
            namePosition: electronConfig.labelSettings.namePosition ?? 'right',
            modelPosition: electronConfig.labelSettings.modelPosition ?? 'right',
            serialPosition: electronConfig.labelSettings.serialPosition ?? 'right',
            assetTagPosition: electronConfig.labelSettings.assetTagPosition ?? 'right'
          } : {
            widthMM: 40,
            heightMM: 30,
            qrCodeSize: 0.6,
            baseFontSize: 12,
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
            namePosition: 'right' as const,
            modelPosition: 'right' as const,
            serialPosition: 'right' as const,
            assetTagPosition: 'right' as const
          }
        });
      } else {
        const baseUrl = localStorage.getItem('snipe_base_url') || '';
        const apiToken = localStorage.getItem('snipe_api_token') || '';
        const locationId = Number(localStorage.getItem('snipe_location_id')) || 0;
        const locationName = localStorage.getItem('snipe_location_name') || '';
        const setupVal = localStorage.getItem('snipe_setup_complete');
        setConfig({
          baseUrl,
          apiToken,
          locationId,
          locationName,
          setupComplete: setupVal === 'true',
          techBenchLocationId: Number(localStorage.getItem('snipe_tech_bench_location_id')) || 0,
          storageLocationId: Number(localStorage.getItem('snipe_storage_location_id')) || 0,
          returnBinLocationId: Number(localStorage.getItem('snipe_return_bin_location_id')) || 0,
          preferredCamera: localStorage.getItem('snipe_preferred_camera') || '',
          labelSettings: (() => {
            try {
              const stored = localStorage.getItem('snipe_label_settings');
              if (!stored) return null;
              return JSON.parse(stored);
            } catch (error) {
              console.error('Error parsing label settings from localStorage:', error);
              return null;
            }
          })() || {
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
            namePosition: 'right' as const,
            modelPosition: 'right' as const,
            serialPosition: 'right' as const,
            assetTagPosition: 'right' as const
          }
        });
      }
      setConfigLoaded(true);
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (!configLoaded) return;
    // Set up Snipe-IT API if we have configuration
    if (config.baseUrl && config.apiToken) {
      snipeItApi.setConfig(config.baseUrl, config.apiToken);
    }
  }, [config, configLoaded]);



  const handleConfigSave = async (newConfig: { 
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
  }) => {
    const updatedConfig = { 
      ...newConfig, 
      setupComplete: true
    };
    setConfig(updatedConfig);
    
    if (isElectron) {
      await (window as any).electronAPI.setConfig(updatedConfig);
    } else {
      localStorage.setItem('snipe_base_url', newConfig.baseUrl);
      localStorage.setItem('snipe_api_token', newConfig.apiToken);
      localStorage.setItem('snipe_location_id', String(newConfig.locationId));
      localStorage.setItem('snipe_location_name', newConfig.locationName);
      localStorage.setItem('snipe_setup_complete', 'true');
      localStorage.setItem('snipe_tech_bench_location_id', String(newConfig.techBenchLocationId));
      localStorage.setItem('snipe_storage_location_id', String(newConfig.storageLocationId));
      localStorage.setItem('snipe_return_bin_location_id', String(newConfig.returnBinLocationId));
      localStorage.setItem('snipe_preferred_camera', newConfig.preferredCamera);
      localStorage.setItem('snipe_label_settings', JSON.stringify(newConfig.labelSettings));
    }
    
    snipeItApi.setConfig(newConfig.baseUrl, newConfig.apiToken);
    setCurrentMode('menu');
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const toggleKioskMode = async () => {
    if (isElectron) {
      try {
        await (window as any).electronAPI.toggleKioskMode();
        setKioskMode(!kioskMode);
      } catch (error) {
        console.error('Error toggling kiosk mode:', error);
      }
    }
  };

  const exitApplication = async () => {
    if (isElectron) {
      try {
        await (window as any).electronAPI.exitApplication();
      } catch (error) {
        console.error('Error exiting application:', error);
      }
    }
  };

  // Handle escape key to exit kiosk mode
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Escape' && kioskMode && isElectron) {
        try {
          await (window as any).electronAPI.exitKioskMode();
          setKioskMode(false);
        } catch (error) {
          console.error('Error exiting kiosk mode:', error);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [kioskMode]);



  const renderCurrentMode = () => {
    if (!isConfigured && currentMode !== 'menu' && currentMode !== 'config') {
      setCurrentMode('menu');
      return null;
    }

    switch (currentMode) {
      case 'menu':
        return (
          <MainMenu 
            onModeSelect={setCurrentMode}
            onShowConfig={() => setCurrentMode('config')}
            isConfigured={isConfigured}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            kioskMode={kioskMode}
            onToggleKioskMode={toggleKioskMode}
            onExitApplication={exitApplication}
          />
        );
      case 'storeroom':
        return (
          <StoreroomSorter 
            onBack={() => setCurrentMode('menu')}
            config={config}
            showToast={showToast}
          />
        );
      case 'inventory':
        return (
          <QuickInventory 
            onBack={() => setCurrentMode('menu')}
            config={config}
            showToast={showToast}
          />
        );
      case 'kiosk':
        return (
          <CheckInOutKiosk 
            onBack={() => setCurrentMode('menu')}
            config={config}
            showToast={showToast}
          />
        );
      case 'config':
        return (
          <ConfigModal 
            onBack={() => setCurrentMode('menu')}
            onSave={handleConfigSave}
            currentConfig={config}
            darkMode={darkMode}
          />
        );
      default:
        return (
          <MainMenu 
            onModeSelect={setCurrentMode} 
            onShowConfig={() => setCurrentMode('config')} 
            isConfigured={isConfigured}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            kioskMode={kioskMode}
            onToggleKioskMode={toggleKioskMode}
            onExitApplication={exitApplication}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {renderCurrentMode()}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;