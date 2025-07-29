import React, { useState, useRef } from 'react';
import { ArrowLeft, Package, Wrench, Archive, CheckCircle, MapPin, User, X, Printer } from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { EquipmentDisplay } from './EquipmentDisplay';
import { snipeItApi } from '../services/snipeItApi';
import { Equipment } from '../types/Equipment';
import { UserSelector } from './UserSelector';
import { LocationSelector } from './LocationSelector';
import { StatusSelector } from './StatusSelector';
import { ModelSelector } from './ModelSelector';
import { LabelGenerator } from './LabelGenerator';

interface StoreroomSorterProps {
  onBack: () => void;
  config: any;
  showToast: (message: string, type: 'success' | 'error') => void;
}

type StoreroomView = 'scanner' | 'equipment' | 'location-select' | 'edit-field' | 'action-confirm' | 'label-generator';
type ActionType = 'store' | 'bench' | 'ready' | 'archive';

interface LocationSelectState {
  action: ActionType;
  locations: Array<{ id: number; name: string }>;
  selectedLocationId: number | null;
  showUnassignWarning: boolean;
}

interface ActionConfirmState {
  action: ActionType;
  locationId: number | null;
  locationName: string;
  statusName: string;
}

// Add edit field types and state

type EditField = 'user' | 'location' | 'status' | 'model' | 'serial' | 'asset_tag';
interface EditFieldState {
  field: EditField;
  title: string;
  currentValue: any;
}

export const StoreroomSorter: React.FC<StoreroomSorterProps> = ({ onBack, config, showToast }) => {
  const [currentView, setCurrentView] = useState<StoreroomView>('scanner');
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [locationSelect, setLocationSelect] = useState<LocationSelectState | null>(null);
  const [actionConfirm, setActionConfirm] = useState<ActionConfirmState | null>(null);
  const lastScannedIdRef = useRef<number | null>(null);
  const scanCooldownRef = useRef(false);
  const [editField, setEditField] = useState<EditFieldState | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  // Add state for each editable field
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [assetTag, setAssetTag] = useState('');
  
  // Add state for display names/values
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [selectedStatusName, setSelectedStatusName] = useState<string>('');
  const [selectedModelName, setSelectedModelName] = useState<string>('');
  // Add state for quick edit collapse
  const [quickEditCollapsed, setQuickEditCollapsed] = useState(true);
  // Add state to track if changes have been made
  const [hasChanges, setHasChanges] = useState(false);
  // Add state to track original values for comparison
  const [originalValues, setOriginalValues] = useState<any>({});
  // Add state to track save loading
  const [saveLoading, setSaveLoading] = useState(false);

  // Helper function to get display value for a field
  const getDisplayValue = (field: EditField) => {
    switch (field) {
      case 'user':
        if (selectedUserId === null) return 'Not assigned';
        return selectedUserName || equipment?.assigned_to?.name || 'Not assigned';
      case 'location':
        if (selectedLocationId === null) return 'No location';
        return selectedLocationName || equipment?.location?.name || 'No location';
      case 'status':
        if (selectedStatusId === null) return 'No status';
        return selectedStatusName || equipment?.status_label?.name || 'No status';
      case 'model':
        if (selectedModelId === null) return 'No model';
        return selectedModelName || equipment?.model?.name || 'No model';
      case 'serial':
        return serialNumber || equipment?.serial || 'No serial';
      case 'asset_tag':
        return assetTag || equipment?.asset_tag || 'No asset tag';
      default:
        return '';
    }
  };

  // Helper function to check if a field has been changed
  const isFieldChanged = (field: EditField) => {
    switch (field) {
      case 'user':
        return selectedUserId !== originalValues.userId;
      case 'location':
        return selectedLocationId !== originalValues.locationId;
      case 'status':
        return selectedStatusId !== originalValues.statusId;
      case 'model':
        return selectedModelId !== originalValues.modelId;
      case 'serial':
        return serialNumber !== originalValues.serial;
      case 'asset_tag':
        return assetTag !== originalValues.assetTag;
      default:
        return false;
    }
  };

  // Initialize state when equipment is loaded
  const initializeEquipmentState = (equipmentData: Equipment) => {
    setSelectedUserId(equipmentData.assigned_to?.id || null);
    setSelectedLocationId(equipmentData.location?.id || null);
    setSelectedStatusId(equipmentData.status_label?.id || null);
    setSelectedModelId(equipmentData.model?.id || null);
    setSerialNumber(equipmentData.serial || '');
    setAssetTag(equipmentData.asset_tag || '');
    
    // Initialize display names
    setSelectedUserName(equipmentData.assigned_to?.name || '');
    setSelectedLocationName(equipmentData.location?.name || '');
    setSelectedStatusName(equipmentData.status_label?.name || '');
    setSelectedModelName(equipmentData.model?.name || '');
    
    setOriginalValues({
      userId: equipmentData.assigned_to?.id || null,
      locationId: equipmentData.location?.id || null,
      statusId: equipmentData.status_label?.id || null,
      modelId: equipmentData.model?.id || null,
      serial: equipmentData.serial || '',
      assetTag: equipmentData.asset_tag || ''
    });
    setHasChanges(false);
  };

  // Cancel changes function
  const handleCancelChanges = () => {
    if (equipment) {
      initializeEquipmentState(equipment);
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
        initializeEquipmentState(equipmentData);
        setCurrentView('equipment');
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
        initializeEquipmentState(found);
        setCurrentView('equipment');
      } else {
        showToast('No equipment found', 'error');
      }
    } catch (err) {
      showToast('Error searching for equipment', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleActionClick = async (action: ActionType) => {
    if (!equipment) return;

    if (action === 'ready') {
      // Ready to Deploy doesn't need location selection
      await showActionConfirmation(action, null, 'Current Location', 'Ready to Deploy');
      return;
    }

    if (action === 'archive') {
      // Archive uses predefined locations
      await showActionConfirmation(action, null, 'E-Waste Location', 'E-Waste');
      return;
    }

    // For store and bench, automatically use default location if available
    const defaultLocationId = action === 'store' 
      ? config.storageLocationId 
      : config.techBenchLocationId;

    if (defaultLocationId) {
      // Show confirmation with default location
      const allLocations = await snipeItApi.getAllLocations();
      const defaultLocation = allLocations.find(l => l.id === defaultLocationId);
      const statusName = action === 'store' ? 'Storage' : 'Bench';
      await showActionConfirmation(action, defaultLocationId, defaultLocation?.name || 'Unknown Location', statusName);
      return;
    }

    // Fallback to location selection if no default is configured
    setActionLoading(action);
    try {
      const allLocations = await snipeItApi.getAllLocations();
      let filteredLocations = allLocations;

      if (action === 'store') {
        filteredLocations = allLocations.filter(l => 
          l.name.toLowerCase().includes('storage') || 
          l.name.toLowerCase().includes('store')
        );
      } else if (action === 'bench') {
        filteredLocations = allLocations.filter(l => 
          l.name.toLowerCase().includes('bench') || 
          l.name.toLowerCase().includes('tech')
        );
      }

      // If no filtered locations, fall back to all locations
      if (!filteredLocations.length) {
        filteredLocations = allLocations;
      }

      setLocationSelect({
        action,
        locations: filteredLocations,
        selectedLocationId: filteredLocations[0]?.id || null,
        showUnassignWarning: !!equipment.assigned_to
      });
      setCurrentView('location-select');
    } catch (err) {
      showToast('Failed to load locations', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const showActionConfirmation = async (action: ActionType, locationId: number | null, locationName: string, statusName: string) => {
    setActionConfirm({
      action,
      locationId,
      locationName,
      statusName
    });
    setCurrentView('action-confirm');
  };

  const executeAction = async (action: ActionType, locationId: number | null) => {
    if (!equipment) return;
    
    setActionLoading(action);
    try {
      let statusId: number | undefined;
      let finalLocationId: number | undefined;

      if (action === 'store') {
        const statusLabels = await snipeItApi.getStatusLabels();
        statusId = statusLabels.find(s => s.name.toLowerCase().includes('storage'))?.id;
        finalLocationId = locationId || config.storageLocationId;
      } else if (action === 'bench') {
        const statusLabels = await snipeItApi.getStatusLabels();
        statusId = statusLabels.find(s => s.name.toLowerCase().includes('bench'))?.id;
        finalLocationId = locationId || config.techBenchLocationId;
      } else if (action === 'ready') {
        const statusLabels = await snipeItApi.getStatusLabels();
        statusId = statusLabels.find(s => s.name.toLowerCase().includes('ready'))?.id;
        finalLocationId = equipment.location?.id; // Keep current location
      } else if (action === 'archive') {
        const statusLabels = await snipeItApi.getStatusLabels();
        statusId = statusLabels.find(s => /e-?wasted?/i.test(s.name))?.id;
        const allLocations = await snipeItApi.getAllLocations();
        finalLocationId = allLocations.find(l => /e-?waste/i.test(l.name))?.id;
      }

      if (!statusId || (action !== 'ready' && !finalLocationId)) {
        showToast('Could not find required status or location', 'error');
        return;
      }

      const updateData: any = {
        status_id: statusId,
        location_id: finalLocationId,
        notes: `Updated via Storeroom Sorter - ${action} action`
      };

      // Unassign user if needed (for 'store' and 'archive')
      const extraFields: any = {};
      if (equipment.assigned_to && (action === 'store' || action === 'archive')) {
        // Use checkin method to properly unassign user (this was working)
        try {
          await snipeItApi.checkinEquipment(equipment.id);
        } catch (error) {
          console.error('Failed to unassign user during action:', error);
        }
      }

      const success = await snipeItApi.updateEquipmentStatus(equipment.id, updateData, extraFields);

      if (success) {
        const actionMessages = {
          store: 'Asset stored successfully!',
          bench: 'Asset sent to bench!',
          ready: 'Asset marked ready to deploy!',
          archive: 'Asset archived!'
        };
        showToast(actionMessages[action], 'success');
        // Clear action confirm state and go to next scan
        setActionConfirm(null);
        handleNewScan();
      } else {
        showToast('Failed to update asset', 'error');
      }
    } catch (err) {
      showToast('Failed to update asset', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLocationConfirm = () => {
    if (locationSelect) {
      const selectedLocation = locationSelect.locations.find(l => l.id === locationSelect.selectedLocationId);
      const statusName = locationSelect.action === 'store' ? 'Storage' : 'Bench';
      showActionConfirmation(locationSelect.action, locationSelect.selectedLocationId, selectedLocation?.name || 'Unknown Location', statusName);
    }
  };

  const handleActionConfirm = () => {
    if (!actionConfirm) return;
    executeAction(actionConfirm.action, actionConfirm.locationId);
  };

  const handleChangeLocation = async () => {
    if (!actionConfirm) return;
    
    setActionLoading(actionConfirm.action);
    try {
      const allLocations = await snipeItApi.getAllLocations();
      let filteredLocations = allLocations;

      if (actionConfirm.action === 'store') {
        filteredLocations = allLocations.filter(l => 
          l.name.toLowerCase().includes('storage') || 
          l.name.toLowerCase().includes('store')
        );
      } else if (actionConfirm.action === 'bench') {
        filteredLocations = allLocations.filter(l => 
          l.name.toLowerCase().includes('bench') || 
          l.name.toLowerCase().includes('tech')
        );
      }

      // If no filtered locations, fall back to all locations
      if (!filteredLocations.length) {
        filteredLocations = allLocations;
      }

      setLocationSelect({
        action: actionConfirm.action,
        locations: filteredLocations,
        selectedLocationId: actionConfirm.locationId || filteredLocations[0]?.id || null,
        showUnassignWarning: !!equipment?.assigned_to
      });
      setActionConfirm(null);
      setCurrentView('location-select');
    } catch (err) {
      showToast('Failed to load locations', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNewScan = () => {
    setEquipment(null);
    setCurrentView('scanner');
    setLocationSelect(null);
    lastScannedIdRef.current = null;
    scanCooldownRef.current = false;
    setSearchValue('');
    setOriginalValues({});
    setHasChanges(false);
  };

  // Handler to open edit modal for a field
  const handleEditField = (field: EditField, title: string, currentValue: any) => {
    setEditField({ field, title, currentValue });
    if (field === 'user') setSelectedUserId(currentValue);
    if (field === 'location') setSelectedLocationId(currentValue);
    if (field === 'status') setSelectedStatusId(currentValue);
    if (field === 'model') setSelectedModelId(currentValue);
    if (field === 'serial') setSerialNumber(currentValue);
    if (field === 'asset_tag') setAssetTag(currentValue);
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
    if (editField.field === 'model') {
      setSelectedModelId(value);
      setSelectedModelName(displayName || '');
    }
    if (editField.field === 'serial') setSerialNumber(value);
    if (editField.field === 'asset_tag') setAssetTag(value);
    setHasChanges(true);
    setEditField(null);
    setCurrentView('equipment');
  };

  // Add save function
  const handleSaveChanges = async () => {
    if (!equipment || !hasChanges) return;
    
    setSaveLoading(true);
    try {
      const updateData: any = {
        name: equipment.name,
        asset_tag: assetTag || equipment.asset_tag,
        serial: serialNumber || equipment.serial,
        model_id: selectedModelId || equipment.model.id,
        status_id: selectedStatusId || equipment.status_label.id,
        notes: 'Updated via Storeroom Sorter Quick Edit'
      };

      if (selectedLocationId) {
        updateData.location_id = selectedLocationId;
      }

      let success = false;
      
      if (selectedUserId !== null) {
        // Assign user
        const extraFields: any = {
          assigned_user: selectedUserId
        };

        console.log('StoreroomSorter - Sending update request:', {
          equipmentId: equipment.id,
          updateData,
          extraFields,
          selectedUserId
        });

        success = await snipeItApi.updateEquipmentStatus(
          equipment.id,
          updateData,
          extraFields
        );
      } else {
        // Unassign user and update other fields
        console.log('StoreroomSorter - Unassigning user and updating fields:', {
          equipmentId: equipment.id,
          updateData
        });
        
        // First unassign the user
        try {
          await snipeItApi.checkinEquipment(equipment.id);
        } catch (error) {
          console.error('Failed to unassign user:', error);
        }
        
        // Then update other fields
        success = await snipeItApi.updateEquipmentStatus(
          equipment.id,
          updateData,
          {}
        );
      }

      if (success) {
        showToast('Asset updated successfully!', 'success');
        // Refresh equipment data
        console.log('StoreroomSorter - Refreshing equipment after update...');
        const updated = await snipeItApi.getEquipmentById(equipment.id);
        console.log('StoreroomSorter - Updated equipment data:', {
          id: updated?.id,
          asset_tag: updated?.asset_tag,
          assigned_to: updated?.assigned_to,
          status_label: updated?.status_label,
          location: updated?.location
        });
        if (updated) {
          setEquipment(updated);
          initializeEquipmentState(updated);
        }
      } else {
        showToast('Failed to update asset', 'error');
      }
    } catch (error: any) {
      console.error('Failed to update asset:', error);
      let errorMessage = 'Failed to update asset';
      
      if (error.response?.status === 422) {
        errorMessage = 'Validation error - please check the data';
      } else if (error.response?.status === 403) {
        errorMessage = 'Permission denied - you may not have access to modify this asset';
      } else if (error.response?.status === 404) {
        errorMessage = 'Asset not found - it may have been deleted';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error - please try again later';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out - please check your connection';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleGenerateLabel = () => {
    setCurrentView('label-generator');
  };

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
          preferredCamera={config.preferredCamera}
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

  const renderEquipment = () => (
    <div className="p-6 space-y-6">
      <EquipmentDisplay equipment={equipment!} />

      {/* Generate Label Button */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <button
          onClick={handleGenerateLabel}
          className="p-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-lg font-semibold transition-colors flex items-center justify-center"
        >
          <Printer className="w-6 h-6 mr-3" />
          Generate Label
        </button>
      </div>

      {/* Quick Edit Fields (collapsible) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 space-y-4">
        <button
          onClick={() => setQuickEditCollapsed(!quickEditCollapsed)}
          className="flex items-center w-full mb-6 text-left focus:outline-none"
        >
          <span className="text-xl font-semibold text-gray-900 dark:text-white flex-1">Quick Edit Fields</span>
          <span className={`transform transition-transform ${quickEditCollapsed ? 'rotate-[-90deg]' : 'rotate-0'}`}>
            <ArrowLeft className="w-6 h-6" />
          </span>
        </button>
        {!quickEditCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assigned User */}
            <button
              onClick={() => handleEditField('user', 'Assigned User', selectedUserId)}
              className={`p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border ${
                isFieldChanged('user') 
                  ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned User</p>
                    <p className={`text-lg ${isFieldChanged('user') ? 'text-orange-700 dark:text-orange-300 font-semibold' : 'text-gray-900 dark:text-white'}`}>
                      {getDisplayValue('user')}
                      {isFieldChanged('user') && <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">Modified</span>}
                    </p>
                  </div>
                </div>
              </div>
            </button>
            {/* Location */}
            <button
              onClick={() => handleEditField('location', 'Location', selectedLocationId)}
              className={`p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border ${
                isFieldChanged('location') 
                  ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
                    <p className={`text-lg ${isFieldChanged('location') ? 'text-orange-700 dark:text-orange-300 font-semibold' : 'text-gray-900 dark:text-white'}`}>
                      {getDisplayValue('location')}
                      {isFieldChanged('location') && <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">Modified</span>}
                    </p>
                  </div>
                </div>
              </div>
            </button>
            {/* Status */}
            <button
              onClick={() => handleEditField('status', 'Status', selectedStatusId)}
              className={`p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border ${
                isFieldChanged('status') 
                  ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                    <p className={`text-lg ${isFieldChanged('status') ? 'text-orange-700 dark:text-orange-300 font-semibold' : 'text-gray-900 dark:text-white'}`}>
                      {getDisplayValue('status')}
                      {isFieldChanged('status') && <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">Modified</span>}
                    </p>
                  </div>
                </div>
              </div>
            </button>
            {/* Model */}
            <button
              onClick={() => handleEditField('model', 'Model', selectedModelId)}
              className={`p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border ${
                isFieldChanged('model') 
                  ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="w-5 h-5 text-indigo-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Model</p>
                    <p className={`text-lg ${isFieldChanged('model') ? 'text-orange-700 dark:text-orange-300 font-semibold' : 'text-gray-900 dark:text-white'}`}>
                      {getDisplayValue('model')}
                      {isFieldChanged('model') && <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">Modified</span>}
                    </p>
                  </div>
                </div>
              </div>
            </button>
            {/* Serial */}
            <button
              onClick={() => handleEditField('serial', 'Serial', serialNumber)}
              className={`p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border ${
                isFieldChanged('serial') 
                  ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wrench className="w-5 h-5 text-yellow-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Serial</p>
                    <p className={`text-lg ${isFieldChanged('serial') ? 'text-orange-700 dark:text-orange-300 font-semibold' : 'text-gray-900 dark:text-white'}`}>
                      {getDisplayValue('serial')}
                      {isFieldChanged('serial') && <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">Modified</span>}
                    </p>
                  </div>
                </div>
              </div>
            </button>
            {/* Asset Tag */}
            <button
              onClick={() => handleEditField('asset_tag', 'Asset Tag', assetTag)}
              className={`p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border ${
                isFieldChanged('asset_tag') 
                  ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Archive className="w-5 h-5 text-red-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Asset Tag</p>
                    <p className={`text-lg ${isFieldChanged('asset_tag') ? 'text-orange-700 dark:text-orange-300 font-semibold' : 'text-gray-900 dark:text-white'}`}>
                      {getDisplayValue('asset_tag')}
                      {isFieldChanged('asset_tag') && <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">Modified</span>}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}
        {!quickEditCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <button
              onClick={handleCancelChanges}
              disabled={!hasChanges || saveLoading}
              className="p-4 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white rounded-xl text-xl font-semibold transition-colors flex items-center justify-center disabled:opacity-50"
            >
              Cancel Changes
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={!hasChanges || saveLoading}
              className="p-4 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-xl text-xl font-semibold transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {saveLoading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => handleActionClick('store')}
          disabled={actionLoading !== null}
          className="p-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-2xl text-xl font-semibold transition-colors flex flex-col items-center disabled:opacity-50"
        >
          {actionLoading === 'store' ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
          ) : (
            <Package className="w-8 h-8 mb-2" />
          )}
          Store
          <span className="text-sm opacity-90 mt-1">Storage - Undeployable</span>
        </button>

        <button
          onClick={() => handleActionClick('bench')}
          disabled={actionLoading !== null}
          className="p-6 bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white rounded-2xl text-xl font-semibold transition-colors flex flex-col items-center disabled:opacity-50"
        >
          {actionLoading === 'bench' ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
          ) : (
            <Wrench className="w-8 h-8 mb-2" />
          )}
          Bench
          <span className="text-sm opacity-90 mt-1">Needs Work</span>
        </button>

        <button
          onClick={() => handleActionClick('ready')}
          disabled={actionLoading !== null}
          className="p-6 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-2xl text-xl font-semibold transition-colors flex flex-col items-center disabled:opacity-50"
        >
          {actionLoading === 'ready' ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
          ) : (
            <CheckCircle className="w-8 h-8 mb-2" />
          )}
          Ready
          <span className="text-sm opacity-90 mt-1">Ready to Deploy</span>
        </button>

        <button
          onClick={() => handleActionClick('archive')}
          disabled={actionLoading !== null}
          className="p-6 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-2xl text-xl font-semibold transition-colors flex flex-col items-center disabled:opacity-50"
        >
          {actionLoading === 'archive' ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
          ) : (
            <Archive className="w-8 h-8 mb-2" />
          )}
          Archive
          <span className="text-sm opacity-90 mt-1">E-Waste</span>
        </button>
      </div>

      {/* New Scan Button */}
      <button
        onClick={handleNewScan}
        className="w-full p-4 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-400 text-white rounded-2xl text-lg font-semibold transition-colors"
      >
        Scan Next Asset
      </button>
    </div>
  );

  const renderLocationSelect = () => {
    if (!locationSelect) return null;

    // Filter locations by search
    const filteredLocations = locationSelect.locations.filter(location =>
      location.name.toLowerCase().includes(locationSearch.toLowerCase())
    );

    return (
      <div className="p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Select Location</h2>
            <button
              onClick={() => {
                setLocationSelect(null);
                setCurrentView('equipment');
              }}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search bar for locations */}
          <input
            type="text"
            value={locationSearch}
            onChange={e => setLocationSearch(e.target.value)}
            placeholder="Search locations..."
            className="w-full mb-4 px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />

          {/* Removed unassign warning */}

          <div className="space-y-4">
            <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
              <MapPin className="w-5 h-5 inline mr-2" />
              Choose Location
            </label>
            
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {filteredLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => setLocationSelect({
                    ...locationSelect,
                    selectedLocationId: location.id
                  })}
                  className={`p-4 rounded-xl text-left transition-colors border-2 ${
                    locationSelect.selectedLocationId === location.id
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-400 text-orange-900 dark:text-orange-100'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 mr-3 text-gray-400" />
                    <span className="text-lg font-medium">{location.name}</span>
                  </div>
                </button>
              ))}
              {filteredLocations.length === 0 && (
                <div className="text-gray-500 dark:text-gray-400 text-center py-8">No locations found.</div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              onClick={() => {
                setLocationSelect(null);
                setCurrentView('equipment');
              }}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-xl text-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLocationConfirm}
              disabled={!locationSelect.selectedLocationId || actionLoading !== null}
              className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white rounded-xl text-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {actionLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
              ) : null}
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add renderEditField modal
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
                setCurrentView('equipment');
              }}
              className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6 mr-2" />
              <span className="text-lg">Back to Equipment</span>
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
                          {editField.field === 'model' && (
              <ModelSelector
                selectedModelId={selectedModelId}
                onModelSelect={(modelId, modelName) => handleFieldUpdate(modelId, modelName)}
              />
            )}
              {(editField.field === 'serial' || editField.field === 'asset_tag') && (
                <div>
                  <input
                    type="text"
                    value={editField.field === 'serial' ? serialNumber : assetTag}
                    onChange={(e) => {
                      if (editField.field === 'serial') {
                        setSerialNumber(e.target.value);
                      } else {
                        setAssetTag(e.target.value);
                      }
                    }}
                    placeholder={`Enter ${editField.title}`}
                    className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={() => {
                        setEditField(null);
                        setCurrentView('equipment');
                      }}
                      className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-xl text-lg font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleFieldUpdate(editField.field === 'serial' ? serialNumber : assetTag)}
                      className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white rounded-xl text-lg font-semibold transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActionConfirm = () => {
    if (!actionConfirm || !equipment) return null;

    const getActionIcon = () => {
      switch (actionConfirm.action) {
        case 'store':
          return <Package className="w-8 h-8" />;
        case 'bench':
          return <Wrench className="w-8 h-8" />;
        case 'ready':
          return <CheckCircle className="w-8 h-8" />;
        case 'archive':
          return <Archive className="w-8 h-8" />;
        default:
          return <Package className="w-8 h-8" />;
      }
    };

    const getActionColor = () => {
      switch (actionConfirm.action) {
        case 'store':
          return 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600';
        case 'bench':
          return 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600';
        case 'ready':
          return 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600';
        case 'archive':
          return 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600';
        default:
          return 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600';
      }
    };

    return (
      <div className="p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${getActionColor().replace('hover:', '')}`}>
              {getActionIcon()}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Confirm {actionConfirm.action.charAt(0).toUpperCase() + actionConfirm.action.slice(1)} Action
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Review the changes that will be made to this asset
            </p>
          </div>

          {/* Asset Information */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Asset Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Asset Name</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{equipment.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Asset Tag</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{equipment.asset_tag}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Status</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{equipment.status_label?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Location</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{equipment.location?.name || 'No location'}</p>
              </div>
            </div>
          </div>

          {/* Changes Summary */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-4 mb-6">
            <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-3">Changes to be Made</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-orange-700 dark:text-orange-300">Status:</span>
                <span className="font-medium text-orange-800 dark:text-orange-200">{actionConfirm.statusName}</span>
              </div>
              {actionConfirm.locationId && (
                <div className="flex items-center justify-between">
                  <span className="text-orange-700 dark:text-orange-300">Location:</span>
                  <span className="font-medium text-orange-800 dark:text-orange-200">{actionConfirm.locationName}</span>
                </div>
              )}
              {equipment.assigned_to && actionConfirm.action === 'store' && (
                <div className="flex items-center justify-between">
                  <span className="text-orange-700 dark:text-orange-300">User Assignment:</span>
                  <span className="font-medium text-orange-800 dark:text-orange-200">Will be unassigned</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActionConfirm(null);
                setCurrentView('equipment');
              }}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-xl text-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            {actionConfirm.action !== 'ready' && actionConfirm.action !== 'archive' && (
              <button
                onClick={handleChangeLocation}
                disabled={actionLoading !== null}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl text-lg font-semibold transition-colors disabled:opacity-50"
              >
                Change Location
              </button>
            )}
            <button
              onClick={handleActionConfirm}
              disabled={actionLoading !== null}
              className={`flex-1 px-6 py-3 text-white rounded-xl text-lg font-semibold transition-colors disabled:opacity-50 ${getActionColor()}`}
            >
              {actionLoading === actionConfirm.action ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Processing...
                </div>
              ) : (
                `Confirm ${actionConfirm.action.charAt(0).toUpperCase() + actionConfirm.action.slice(1)}`
              )}
            </button>
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
        onBack={() => setCurrentView('equipment')}
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
            onClick={currentView === 'label-generator' ? () => setCurrentView('equipment') : onBack}
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            <span className="text-lg">
              {currentView === 'label-generator' ? 'Back to Asset' : 'Back to Menu'}
            </span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentView === 'label-generator' ? 'Generate Label' : 'Storeroom Sorter'}
          </h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {currentView === 'scanner' && renderScanner()}
        {currentView === 'equipment' && renderEquipment()}
        {currentView === 'location-select' && renderLocationSelect()}
        {currentView === 'edit-field' && renderEditField()}
        {currentView === 'action-confirm' && renderActionConfirm()}
        {currentView === 'label-generator' && renderLabelGenerator()}
      </div>
    </div>
  );
};