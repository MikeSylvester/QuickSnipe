import React, { useState, useEffect } from 'react';
import { Package, Search, Users, Settings, Smartphone, Plus, Moon, Sun, X, BarChart3 } from 'lucide-react';
import { AppMode } from '../App';
import { UpdateManager } from './UpdateManager';

interface MainMenuProps {
  onModeSelect: (mode: AppMode) => void;
  onShowConfig: () => void;
  isConfigured: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  kioskMode: boolean;
  onToggleKioskMode: () => void;
  onExitApplication: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ 
  onModeSelect, 
  onShowConfig, 
  isConfigured, 
  darkMode, 
  onToggleDarkMode,
  kioskMode,
  onToggleKioskMode,
  onExitApplication
}) => {
  const [appVersion, setAppVersion] = useState('1.0.2');

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
  const menuItems = [
    {
      id: 'storeroom' as AppMode,
      title: 'Storeroom Sorter',
      description: 'Process computers in storeroom',
      icon: Package,
      color: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600',
      disabled: !isConfigured
    },
    {
      id: 'inventory' as AppMode,
      title: 'Quick Inventory',
      description: 'Field audits and updates',
      icon: Search,
      color: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
      disabled: !isConfigured
    },
    {
      id: 'kiosk' as AppMode,
      title: 'Check-in/Checkout',
      description: 'Asset assignment kiosk',
      icon: Users,
      color: 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600',
      disabled: !isConfigured
    },
    {
      id: 'add-device' as AppMode,
      title: 'Add New Device',
      description: 'Create new asset entries',
      icon: Plus,
      color: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600',
      disabled: !isConfigured
    },
    {
      id: 'reports' as AppMode,
      title: 'Reports & Analytics',
      description: 'Interactive charts and insights',
      icon: BarChart3,
      color: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
      disabled: !isConfigured
    }
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8 transition-colors">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Smartphone className="w-16 h-16 text-orange-500 mr-4" />
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white">Quicksnipe</h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Tablet-First Inventory Management</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Version {appVersion}</p>
        </div>

        {/* Configuration Warning */}
        {!isConfigured && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-2xl p-6 mb-8">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Setup Required</h3>
                <p className="text-yellow-700 dark:text-yellow-300">Configure your Snipe-IT connection to get started.</p>
              </div>
            </div>
          </div>
        )}

        {/* Mode Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => !item.disabled && onModeSelect(item.id)}
                disabled={item.disabled}
                className={`
                  relative p-8 rounded-3xl text-white transition-all duration-300 transform
                  ${item.disabled 
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50' 
                    : `${item.color} hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl`
                  }
                `}
              >
                <div className="text-center">
                  <Icon className="w-16 h-16 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
                  <p className="text-lg opacity-90">{item.description}</p>
                </div>
                
                {item.disabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-3xl">
                    <span className="text-white font-semibold">Setup Required</span>
                  </div>
                )}
              </button>
            );
          })}

        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onShowConfig}
              className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 text-white rounded-2xl text-base sm:text-lg font-semibold transition-colors"
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              Settings
            </button>

            <button
              onClick={onToggleDarkMode}
              className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white rounded-2xl text-base sm:text-lg font-semibold transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" /> : <Moon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            <UpdateManager darkMode={darkMode} />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onToggleKioskMode}
              className={`inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-semibold transition-colors ${
                kioskMode 
                  ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white' 
                  : 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white'
              }`}
            >
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              {kioskMode ? 'Exit Kiosk' : 'Kiosk Mode'}
            </button>

            <button
              onClick={onExitApplication}
              className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-2xl text-base sm:text-lg font-semibold transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};