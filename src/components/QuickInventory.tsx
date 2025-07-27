import React, { useState, useRef } from 'react';
import { ArrowLeft, Search, User, MapPin, Save, Edit3, Monitor, Hash, Calendar, Settings, ExternalLink, Printer } from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { EquipmentDisplay } from './EquipmentDisplay';
import { UserSelector } from './UserSelector';
import { LocationSelector } from './LocationSelector';
import { StatusSelector } from './StatusSelector';
import { ModelSelector } from './ModelSelector';
import { LabelGenerator } from './LabelGenerator';
import { snipeItApi } from '../services/snipeItApi';
import { Equipment } from '../types/Equipment';

interface QuickInventoryProps {
  onBack: () => void;
  config: any;
  showToast: (message: string, type: 'success' | 'error') => void;
}

type InventoryView = 'scanner' | 'equipment' | 'edit-field' | 'label-generator';
type EditField = 'user' | 'location' | 'status' | 'model' | 'serial' | 'asset_tag';

interface EditFieldState {
  field: EditField;
  title: string;
  currentValue: any;
}

export const QuickInventory: React.FC<QuickInventoryProps> = ({ onBack, config, showToast }) => {
  const [currentView, setCurrentView] = useState<InventoryView>('scanner');
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [editField, setEditField] = useState<EditFieldState | null>(null);
  const lastScannedIdRef = useRef<number | null>(null);
  const scanCooldownRef = useRef(false);
  
  // Add state for display names/values
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [selectedStatusName, setSelectedStatusName] = useState<string>('');
  const [selectedModelName, setSelectedModelName] = useState<string>('');
  
  // Add state to track if changes have been made
  const [hasChanges, setHasChanges] = useState(false);
  // Add state to track original values for comparison
  const [originalValues, setOriginalValues] = useState<any>({});

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

  const handleEditField = (field: EditField, title: string, currentValue: any) => {
    setEditField({ field, title, currentValue });
    setCurrentView('edit-field');
  };

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

  const handleUpdateAsset = async () => {
    if (!equipment) return;
    
    setUpdateLoading(true);
    try {
      const updateData: any = {
        name: equipment.name,
        asset_tag: assetTag,
        serial: serialNumber,
        model_id: selectedModelId || equipment.model.id,
        status_id: selectedStatusId || equipment.status_label.id,
        notes: 'Updated via Quick Inventory'
      };

      if (selectedLocationId) {
        updateData.location_id = selectedLocationId;
      }

      const extraFields: any = {};
      if (selectedUserId) {
        extraFields.assigned_user = selectedUserId;
      } else {
        extraFields.assigned_user = null;
      }

      const success = await snipeItApi.updateEquipmentStatus(
        equipment.id,
        updateData,
        extraFields
      );

      if (success) {
        showToast('Asset updated successfully!', 'success');
        // Refresh equipment data
        const updated = await snipeItApi.getEquipmentById(equipment.id);
        if (updated) {
          setEquipment(updated);
          initializeEquipmentState(updated);
        }
      } else {
        showToast('Failed to update asset', 'error');
      }
    } catch (err) {
      showToast('Failed to update asset', 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleNewScan = () => {
    setEquipment(null);
    setCurrentView('scanner');
    setSelectedUserId(null);
    setSelectedLocationId(null);
    setSelectedStatusId(null);
    setSelectedModelId(null);
    setSerialNumber('');
    setAssetTag('');
    setEditField(null);
    lastScannedIdRef.current = null;
    scanCooldownRef.current = false;
    setSearchValue('');
    setOriginalValues({});
    setHasChanges(false);
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
      
      {/* Quick Edit Fields */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Quick Edit Fields</h3>
        
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
                <Settings className="w-5 h-5 text-green-500 mr-3" />
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
                <Monitor className="w-5 h-5 text-indigo-500 mr-3" />
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

          {/* Serial Number */}
          <button
            onClick={() => handleEditField('serial', 'Serial Number', serialNumber)}
            className={`p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-left transition-colors border ${
              isFieldChanged('serial') 
                ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                : 'border-gray-200 dark:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Hash className="w-5 h-5 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Serial Number</p>
                  <p className={`text-lg font-mono ${isFieldChanged('serial') ? 'text-orange-700 dark:text-orange-300 font-semibold' : 'text-gray-900 dark:text-white'}`}>
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
                <Calendar className="w-5 h-5 text-red-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Asset Tag</p>
                  <p className={`text-lg font-mono ${isFieldChanged('asset_tag') ? 'text-orange-700 dark:text-orange-300 font-semibold' : 'text-gray-900 dark:text-white'}`}>
                    {getDisplayValue('asset_tag')}
                    {isFieldChanged('asset_tag') && <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">Modified</span>}
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <button
            onClick={handleCancelChanges}
            disabled={!hasChanges || updateLoading}
            className="p-4 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white rounded-xl text-xl font-semibold transition-colors flex items-center justify-center disabled:opacity-50"
          >
            Cancel Changes
          </button>
          <button
            onClick={handleUpdateAsset}
            disabled={!hasChanges || updateLoading}
            className="p-4 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-xl text-xl font-semibold transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {updateLoading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-6 h-6 mr-3" />
                Save Changes
              </>
            )}
          </button>
        </div>
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

  const renderEditField = () => {
    if (!editField) return null;

    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit {editField.title}</h2>
            <button
              onClick={() => {
                setEditField(null);
                setCurrentView('equipment');
              }}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>

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
            onClick={editField ? () => {
              setEditField(null);
              setCurrentView('equipment');
            } : (currentView === 'label-generator' ? () => setCurrentView('equipment') : onBack)}
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            <span className="text-lg">
              {editField ? 'Back to Asset' : currentView === 'label-generator' ? 'Back to Asset' : 'Back to Menu'}
            </span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentView === 'label-generator' ? 'Generate Label' : 'Quick Inventory'}
          </h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {currentView === 'scanner' && renderScanner()}
        {currentView === 'equipment' && renderEquipment()}
        {currentView === 'edit-field' && renderEditField()}
        {currentView === 'label-generator' && renderLabelGenerator()}
      </div>
    </div>
  );
};