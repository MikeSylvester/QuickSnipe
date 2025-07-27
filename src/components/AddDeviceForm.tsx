import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { snipeItApi } from '../services/snipeItApi';

interface AddDeviceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const AddDeviceForm: React.FC<AddDeviceFormProps> = ({ onSuccess, onCancel, showToast }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    serial: '',
    assetTag: '',
    computerName: '',
    modelId: null as number | null,
    statusId: null as number | null,
    locationId: null as number | null,
    userId: null as number | null
  });

  const [options, setOptions] = useState({
    models: [] as Array<{ id: number; name: string }>,
    statuses: [] as Array<{ id: number; name: string }>,
    locations: [] as Array<{ id: number; name: string }>,
    users: [] as Array<{ id: number; name: string }>
  });

  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<Array<{ id: number; name: string }>>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Load form options
  useEffect(() => {
    setLoading(true);
    Promise.all([
      snipeItApi.getModels(),
      snipeItApi.getStatusLabels(),
      snipeItApi.getAllLocations(),
      snipeItApi.getAllUsers()
    ]).then(([models, statuses, locations, users]) => {
      setOptions({
        models,
        statuses: statuses.filter(s => !/e-?wasted?/i.test(s.name)),
        locations: locations.filter(l => !/e-?waste/i.test(l.name)),
        users
      });
      setLoading(false);
    }).catch(() => {
      showToast('Failed to load form options', 'error');
      setLoading(false);
    });
  }, [showToast]);

  // User search
  useEffect(() => {
    if (userQuery.length > 1) {
      snipeItApi.searchUsers(userQuery).then(users => {
        setUserResults(users);
        setShowUserDropdown(true);
      });
    } else {
      setUserResults([]);
      setShowUserDropdown(false);
    }
  }, [userQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serial || !formData.modelId || !formData.statusId || !formData.locationId) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      // Check for duplicate serial
      const existing = await snipeItApi.getEquipmentBySerial(formData.serial.trim());
      if (existing) {
        showToast('A device with this serial number already exists', 'error');
        setLoading(false);
        return;
      }

      // Check for duplicate asset tag if provided
      if (formData.assetTag.trim()) {
        const existingTag = await snipeItApi.getEquipmentByAssetTag(formData.assetTag.trim());
        if (existingTag) {
          showToast('A device with this asset tag already exists', 'error');
          setLoading(false);
          return;
        }
      }

      const data: any = {
        serial: formData.serial,
        model_id: formData.modelId,
        status_id: formData.statusId,
        location_id: formData.locationId
      };

      if (formData.computerName.trim()) {
        data.name = formData.computerName.trim();
      }

      if (formData.assetTag.trim()) {
        data.asset_tag = formData.assetTag.trim();
      }

      if (formData.userId) {
        data.assigned_user = formData.userId;
      }

      const result = await snipeItApi.createDevice(data);
      showToast(`Device added! Asset Tag: ${result.asset_tag || result.assetTag || 'Auto'}`, 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err?.response?.data?.messages?.join(', ') || 'Failed to add device', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: { id: number; name: string }) => {
    setFormData({ ...formData, userId: user.id });
    setUserQuery(user.name);
    setShowUserDropdown(false);
  };

  if (loading && options.models.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Add New Device</h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Serial Number */}
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Serial Number *
          </label>
          <input
            type="text"
            value={formData.serial}
            onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* Asset Tag */}
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Asset Tag (optional)
          </label>
          <input
            type="text"
            value={formData.assetTag}
            onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            placeholder="Leave blank for auto-generation"
          />
        </div>

        {/* Computer Name */}
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Computer Name (optional)
          </label>
          <input
            type="text"
            value={formData.computerName}
            onChange={(e) => setFormData({ ...formData, computerName: e.target.value })}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Model */}
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Model *
          </label>
          <select
            value={formData.modelId || ''}
            onChange={(e) => setFormData({ ...formData, modelId: Number(e.target.value) })}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">Select a model...</option>
            {options.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Status *
          </label>
          <select
            value={formData.statusId || ''}
            onChange={(e) => setFormData({ ...formData, statusId: Number(e.target.value) })}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">Select a status...</option>
            {options.statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Location *
          </label>
          <select
            value={formData.locationId || ''}
            onChange={(e) => setFormData({ ...formData, locationId: Number(e.target.value) })}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">Select a location...</option>
            {options.locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {/* User Assignment */}
        <div className="relative">
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Assign to User (optional)
          </label>
          <input
            type="text"
            value={userQuery}
            onChange={(e) => {
              setUserQuery(e.target.value);
              if (!e.target.value) {
                setFormData({ ...formData, userId: null });
              }
            }}
            onFocus={() => userResults.length > 0 && setShowUserDropdown(true)}
            onBlur={() => setTimeout(() => setShowUserDropdown(false), 150)}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            placeholder="Search for user..."
          />
          
          {showUserDropdown && userResults.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {userResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleUserSelect(user)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors"
                >
                  {user.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
            ) : (
              <Plus className="w-6 h-6 mr-3" />
            )}
            Add Device
          </button>
        </div>
      </form>
    </div>
  );
};