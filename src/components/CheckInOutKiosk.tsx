import React, { useState, useRef } from 'react';
import { ArrowLeft, LogIn, LogOut, Calendar, User, MapPin, Settings, Clock, ExternalLink, Printer } from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { EquipmentDisplay } from './EquipmentDisplay';
import { UserSelector } from './UserSelector';
import { LocationSelector } from './LocationSelector';
import { StatusSelector } from './StatusSelector';
import { LabelGenerator } from './LabelGenerator';
import { snipeItApi } from '../services/snipeItApi';
import { Equipment } from '../types/Equipment';

interface CheckInOutKioskProps {
  onBack: () => void;
  config: any;
  showToast: (message: string, type: 'success' | 'error') => void;
}

type KioskView = 'mode-select' | 'scanner' | 'checkout' | 'checkin' | 'duration-select' | 'custom-duration' | 'label-generator' | 'edit-field';
type KioskMode = 'checkout' | 'checkin';

export const CheckInOutKiosk: React.FC<CheckInOutKioskProps> = ({ onBack, config, showToast }) => {
  const [currentView, setCurrentView] = useState<KioskView>('mode-select');
  const [kioskMode, setKioskMode] = useState<KioskMode>('checkout');
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [checkoutDuration, setCheckoutDuration] = useState<{ days: number; label: string } | null>(null);
  const [customDays, setCustomDays] = useState<string>('');
  const lastScannedIdRef = useRef<number | null>(null);
  const scanCooldownRef = useRef(false);
  
  // Add state for display names/values
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
    const [selectedStatusName, setSelectedStatusName] = useState<string>('');
  
  // Add edit field state
  const [editField, setEditField] = useState<{ field: string; title: string; currentValue: any } | null>(null);
  
  const durationOptions = [
    { days: 1, label: '1 Day' },
    { days: 3, label: '3 Days' },
    { days: 7, label: '1 Week' },
    { days: 14, label: '2 Weeks' },
    { days: 30, label: '1 Month' },
    { days: 90, label: '3 Months' },
    { days: 180, label: '6 Months' },
    { days: 365, label: '1 Year' },
    { days: -1, label: 'Permanent' },
    { days: 0, label: 'Custom...' }
  ];

  const handleOpenInSnipeIt = () => {
    if (!equipment) return;
    
    const url = `${config.baseUrl}/hardware/${equipment.id}`;
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleGenerateLabel = () => {
    setCurrentView('label-generator');
  };

  const handleModeSelect = (mode: KioskMode) => {
    setKioskMode(mode);
    setCurrentView('scanner');
  };

  // Function to set default bench status for check-in
  const setDefaultBenchStatus = async () => {
    try {
      const statusLabels = await snipeItApi.getStatusLabels();
      const benchStatus = statusLabels.find(s => 
        s.name.toLowerCase().includes('bench') || 
        s.name.toLowerCase().includes('tech')
      );
      if (benchStatus) {
        setSelectedStatusId(benchStatus.id);
        setSelectedStatusName(benchStatus.name);
      } else {
        // Fallback to first available status if no bench status found
        if (statusLabels.length > 0) {
          setSelectedStatusId(statusLabels[0].id);
          setSelectedStatusName(statusLabels[0].name);
        }
      }
    } catch (error) {
      console.error('Error setting default bench status:', error);
      // Set fallback values
      setSelectedStatusId(null);
      setSelectedStatusName('Bench');
    }
  };

  const handleQrDetected = async (url: string) => {
    if (scanCooldownRef.current) return;
    
    const match = url.match(/hardware\/(\d+)$/);
    if (!match) {
      showToast('Invalid QR code format', 'error');
      return;
    }

    const equipmentId = parseInt(match[1], 10);
    if (equipmentId === lastScannedIdRef.current) return;

    scanCooldownRef.current = true;
    setTimeout(() => { scanCooldownRef.current = false; }, 3000);
    lastScannedIdRef.current = equipmentId;

    setLoading(true);
    try {
      const equipmentData = await snipeItApi.getEquipmentById(equipmentId);
      if (equipmentData) {
        setEquipment(equipmentData);
        if (kioskMode === 'checkout') {
          // Check if asset is available for checkout
          if (equipmentData.assigned_to) {
            showToast('Asset is already checked out', 'error');
            setEquipment(null);
            return;
          }
          setSelectedLocationId(equipmentData.location?.id || null);
          setSelectedLocationName(equipmentData.location?.name || '');
          setCurrentView('checkout');
        } else {
          // Check if asset is checked out
          if (!equipmentData.assigned_to) {
            showToast('Asset is not currently checked out', 'error');
            setEquipment(null);
            return;
          }
          setSelectedLocationId(config.returnBinLocationId || null);
          // Try to get the return bin location name
          if (config.returnBinLocationId) {
            // We'll need to fetch the location name or set it from config
            setSelectedLocationName('Return Bin'); // Default name
          }
          // Set default status to bench for check-in
          await setDefaultBenchStatus();
          setCurrentView('checkin');
        }
      } else {
        throw new Error('Equipment not found');
      }
    } catch (err) {
      showToast('Failed to fetch equipment data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    
    setSearchLoading(true);
    try {
      let found = await snipeItApi.getEquipmentBySerial(searchValue.trim());
      if (!found) {
        found = await snipeItApi.getEquipmentByAssetTag(searchValue.trim());
      }
      if (!found) {
        found = await snipeItApi.getEquipmentByName(searchValue.trim());
      }

      if (found) {
        setEquipment(found);
        if (kioskMode === 'checkout') {
          if (found.assigned_to) {
            showToast('Asset is already checked out', 'error');
            setEquipment(null);
            return;
          }
          setSelectedLocationId(found.location?.id || null);
          setSelectedLocationName(found.location?.name || '');
          setCurrentView('checkout');
        } else {
          if (!found.assigned_to) {
            showToast('Asset is not currently checked out', 'error');
            setEquipment(null);
            return;
          }
          setSelectedLocationId(config.returnBinLocationId || null);
          // Try to get the return bin location name
          if (config.returnBinLocationId) {
            setSelectedLocationName('Return Bin'); // Default name
          }
          // Set default status to bench for check-in
          await setDefaultBenchStatus();
          setCurrentView('checkin');
        }
      } else {
        showToast('No equipment found', 'error');
      }
    } catch (err) {
      showToast('Error searching for equipment', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!equipment || !selectedUserId || !selectedLocationId || !checkoutDuration) return;
    
    setActionLoading(true);
    try {
      const updateData: any = {
        name: equipment.name,
        asset_tag: equipment.asset_tag,
        model_id: equipment.model.id,
        status_id: equipment.status_label.id,
        location_id: selectedLocationId,
        notes: `Checked out via Kiosk - ${checkoutDuration.label}`
      };

      const extraFields = { assigned_user: selectedUserId };

      const success = await snipeItApi.updateEquipmentStatus(
        equipment.id,
        updateData,
        extraFields
      );

      if (success) {
        showToast('Asset checked out successfully!', 'success');
        handleNewScan();
      } else {
        showToast('Failed to check out asset', 'error');
      }
    } catch (err) {
      showToast('Failed to check out asset', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckin = async () => {
    if (!equipment || !selectedLocationId || !selectedStatusId) return;
    
    setActionLoading(true);
    try {
      const updateData: any = {
        name: equipment.name,
        asset_tag: equipment.asset_tag,
        model_id: equipment.model.id,
        status_id: selectedStatusId,
        location_id: selectedLocationId,
        notes: 'Checked in via Kiosk'
      };

      const extraFields = { assigned_user: null };

      const success = await snipeItApi.updateEquipmentStatus(
        equipment.id,
        updateData,
        extraFields
      );

      if (success) {
        showToast('Asset checked in successfully!', 'success');
        handleNewScan();
      } else {
        showToast('Failed to check in asset', 'error');
      }
    } catch (err) {
      showToast('Failed to check in asset', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNewScan = () => {
    setEquipment(null);
    setCurrentView('scanner');
    setSelectedUserId(null);
    setSelectedLocationId(null);
    setSelectedStatusId(null);
    setSelectedUserName('');
    setSelectedLocationName('');
    setSelectedStatusName('');
    setCheckoutDuration(null);
    setCustomDays('');
    lastScannedIdRef.current = null;
    scanCooldownRef.current = false;
    setSearchValue('');
  };

  // Handler to open edit modal for a field
  const handleEditField = (field: string, title: string, currentValue: any) => {
    setEditField({ field, title, currentValue });
    setCurrentView('edit-field');
  };

  // Handler to update field value and close modal
  const handleFieldUpdate = (value: any, displayName?: string) => {
    if (!editField) return;
    
    if (editField.field === 'user') {
      setSelectedUserId(value);
      setSelectedUserName(displayName || '');
    }
    if (editField.field === 'location') {
      setSelectedLocationId(value);
      setSelectedLocationName(displayName || '');
    }
    if (editField.field === 'status') {
      setSelectedStatusId(value);
      setSelectedStatusName(displayName || '');
    }
    
    setEditField(null);
    setCurrentView(kioskMode === 'checkout' ? 'checkout' : 'checkin');
  };

  const handleBackToModeSelect = () => {
    setCurrentView('mode-select');
    setEquipment(null);
    setSelectedUserId(null);
    setSelectedLocationId(null);
    setSelectedStatusId(null);
    setSelectedUserName('');
    setSelectedLocationName('');
    setSelectedStatusName('');
    setCheckoutDuration(null);
    setCustomDays('');
    setSearchValue('');
    setEditField(null);
    // Reset scan state
    lastScannedIdRef.current = null;
    scanCooldownRef.current = false;
  };

  const renderModeSelect = () => (
    <div className="p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Select Mode</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            onClick={() => handleModeSelect('checkout')}
            className="p-8 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-3xl text-2xl font-bold transition-colors transform hover:scale-105"
          >
            <LogOut className="w-16 h-16 mx-auto mb-4" />
            Check Out
            <p className="text-lg opacity-90 mt-2">Assign asset to user</p>
          </button>
          <button
            onClick={() => handleModeSelect('checkin')}
            className="p-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-3xl text-2xl font-bold transition-colors transform hover:scale-105"
          >
            <LogIn className="w-16 h-16 mx-auto mb-4" />
            Check In
            <p className="text-lg opacity-90 mt-2">Return asset</p>
          </button>
        </div>
      </div>
    </div>
  );

  const renderScanner = () => (
    <div className="p-6 space-y-6">
      {/* Manual Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Manual Search</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            placeholder="Enter Asset Tag or Serial Number"
            className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          />
          <button
            onClick={handleSearch}
            disabled={searchLoading || !searchValue.trim()}
            className="px-8 py-3 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white rounded-xl text-lg font-semibold disabled:opacity-50 transition-colors"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* QR Scanner */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">QR Code Scanner</h3>
        <CameraScanner
          onQrDetected={handleQrDetected}
          isScanning={true}
        />
        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center px-6 py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 rounded-xl">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600 dark:border-orange-400 mr-3"></div>
              Loading equipment data...
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDurationSelect = () => (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Select Checkout Duration</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {durationOptions.map((option) => (
            <button
              key={option.days}
              onClick={() => {
                if (option.days === 0) {
                  setCurrentView('custom-duration');
                } else {
                  setCheckoutDuration(option);
                }
              }}
              className={`p-4 rounded-xl text-lg font-semibold transition-colors border-2 ${
                checkoutDuration?.days === option.days
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-400 text-orange-900 dark:text-orange-100'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <Clock className="w-6 h-6 mx-auto mb-2" />
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setCurrentView('checkout')}
            className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-xl text-lg font-semibold transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => setCurrentView('checkout')}
            disabled={!checkoutDuration}
            className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white rounded-xl text-lg font-semibold transition-colors disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  const renderCustomDuration = () => (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Custom Checkout Duration</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
              Number of Days
            </label>
            <input
              type="number"
              min="1"
              max="3650"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              placeholder="Enter number of days"
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={() => setCurrentView('duration-select')}
            className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-xl text-lg font-semibold transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => {
              const days = parseInt(customDays);
              if (days > 0) {
                setCheckoutDuration({ days, label: `${days} Day${days > 1 ? 's' : ''}` });
                setCurrentView('checkout');
              }
            }}
            disabled={!customDays || parseInt(customDays) <= 0}
            className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white rounded-xl text-lg font-semibold transition-colors disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  const renderCheckout = () => (
    <div className="p-6 space-y-6">
      <EquipmentDisplay equipment={equipment!} />
      
      {/* Utility Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleOpenInSnipeIt}
          className="p-4 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-400 text-white rounded-xl text-lg font-semibold transition-colors flex items-center justify-center"
        >
          <ExternalLink className="w-6 h-6 mr-3" />
          Open in Snipe-IT
        </button>
        
        <button
          onClick={handleGenerateLabel}
          className="p-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-lg font-semibold transition-colors flex items-center justify-center"
        >
          <Printer className="w-6 h-6 mr-3" />
          Generate Label
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Check Out Asset</h3>
        
        {/* User Selection */}
        <div>
          <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
            <User className="w-5 h-5 inline mr-2" />
            Assign to User
          </label>
          <button
            onClick={() => handleEditField('user', 'Assign to User', selectedUserId)}
            className="w-full p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="w-5 h-5 text-orange-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned User</p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {selectedUserName || 'Not assigned'}
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Location Selection */}
        <div>
          <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
            <MapPin className="w-5 h-5 inline mr-2" />
            Checkout Location
          </label>
          <button
            onClick={() => handleEditField('location', 'Checkout Location', selectedLocationId)}
            className="w-full p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {selectedLocationName || 'No location'}
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Duration Selection */}
        <div>
          <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
            <Calendar className="w-5 h-5 inline mr-2" />
            Checkout Duration
          </label>
          <button
            onClick={() => setCurrentView('duration-select')}
            className="w-full p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-orange-500 mr-3" />
                <span className="text-lg text-gray-900 dark:text-white">
                  {checkoutDuration ? checkoutDuration.label : 'Select duration...'}
                </span>
              </div>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        </div>

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={actionLoading || !selectedUserId || !selectedLocationId || !checkoutDuration}
          className="w-full p-4 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-xl text-xl font-semibold transition-colors flex items-center justify-center disabled:opacity-50"
        >
          {actionLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
          ) : (
            <LogOut className="w-6 h-6 mr-3" />
          )}
          Check Out Asset
        </button>
      </div>

      <button
        onClick={handleNewScan}
        className="w-full p-4 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-400 text-white rounded-2xl text-lg font-semibold transition-colors"
      >
        Scan Next Asset
      </button>
    </div>
  );

  const renderCheckin = () => (
    <div className="p-6 space-y-6">
      <EquipmentDisplay equipment={equipment!} />
      
      {/* Utility Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleOpenInSnipeIt}
          className="p-4 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-400 text-white rounded-xl text-lg font-semibold transition-colors flex items-center justify-center"
        >
          <ExternalLink className="w-6 h-6 mr-3" />
          Open in Snipe-IT
        </button>
        
        <button
          onClick={handleGenerateLabel}
          className="p-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-lg font-semibold transition-colors flex items-center justify-center"
        >
          <Printer className="w-6 h-6 mr-3" />
          Generate Label
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Check In Asset</h3>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <p className="text-blue-800 dark:text-blue-200">
            <strong>Currently assigned to:</strong> {equipment?.assigned_to?.name}
          </p>
        </div>

        {/* Location Selection */}
        <div>
          <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
            <MapPin className="w-5 h-5 inline mr-2" />
            Check-in Location
          </label>
          <button
            onClick={() => handleEditField('location', 'Check-in Location', selectedLocationId)}
            className="w-full p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {selectedLocationName || 'No location'}
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Status Selection */}
        <div>
          <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
            <Settings className="w-5 h-5 inline mr-2" />
            Status
          </label>
          <button
            onClick={() => handleEditField('status', 'Status', selectedStatusId)}
            className="w-full p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Settings className="w-5 h-5 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {selectedStatusName || 'Bench'}
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={handleCheckin}
          disabled={actionLoading || !selectedLocationId || !selectedStatusId}
          className="w-full p-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl text-xl font-semibold transition-colors flex items-center justify-center disabled:opacity-50"
        >
          {actionLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
          ) : (
            <LogIn className="w-6 h-6 mr-3" />
          )}
          Check In Asset
        </button>
      </div>

      <button
        onClick={handleNewScan}
        className="w-full p-4 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-400 text-white rounded-2xl text-lg font-semibold transition-colors"
      >
        Scan Next Asset
      </button>
    </div>
  );

  const renderEditField = () => {
    if (!editField) return null;
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-6">
            <button
              onClick={() => {
                setEditField(null);
                setCurrentView(kioskMode === 'checkout' ? 'checkout' : 'checkin');
              }}
              className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6 mr-2" />
              <span className="text-lg">Back to Asset</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit {editField.title}</h1>
            <div className="w-32"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="space-y-6">
              {editField.field === 'user' && (
                <UserSelector
                  selectedUserId={selectedUserId}
                  onUserSelect={(userId, userName) => handleFieldUpdate(userId, userName)}
                  onClearUser={() => handleFieldUpdate(null)}
                />
              )}

              {editField.field === 'location' && (
                <LocationSelector
                  selectedLocationId={selectedLocationId}
                  onLocationSelect={(locationId, locationName) => handleFieldUpdate(locationId, locationName)}
                />
              )}

              {editField.field === 'status' && (
                <StatusSelector
                  selectedStatusId={selectedStatusId}
                  onStatusSelect={(statusId, statusName) => handleFieldUpdate(statusId, statusName)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLabelGenerator = () => (
    <div className="p-6">
      <LabelGenerator
        equipment={equipment!}
        config={config}
        onBack={() => setCurrentView(kioskMode === 'checkout' ? 'checkout' : 'checkin')}
        showToast={showToast}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-6">
          <button
            onClick={
              currentView === 'mode-select' ? onBack : 
              currentView === 'label-generator' ? () => setCurrentView(kioskMode === 'checkout' ? 'checkout' : 'checkin') :
              currentView === 'edit-field' ? () => {
                setEditField(null);
                setCurrentView(kioskMode === 'checkout' ? 'checkout' : 'checkin');
              } :
              handleBackToModeSelect
            }
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            <span className="text-lg">
              {currentView === 'mode-select' ? 'Back to Menu' : 
               currentView === 'label-generator' ? 'Back to Asset' : 
               currentView === 'edit-field' ? 'Back to Asset' :
               'Back to Mode Select'}
            </span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentView === 'label-generator' ? 'Generate Label' : 
             `Check-in/Checkout Kiosk${currentView !== 'mode-select' ? ` (${kioskMode === 'checkout' ? 'Check Out' : 'Check In'})` : ''}`}
          </h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {currentView === 'mode-select' && renderModeSelect()}
        {currentView === 'scanner' && renderScanner()}
        {currentView === 'duration-select' && renderDurationSelect()}
        {currentView === 'custom-duration' && renderCustomDuration()}
        {currentView === 'checkout' && renderCheckout()}
        {currentView === 'checkin' && renderCheckin()}
        {currentView === 'edit-field' && renderEditField()}
        {currentView === 'label-generator' && renderLabelGenerator()}
      </div>
    </div>
  );
};