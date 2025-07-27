import React from 'react';
import { Equipment } from '../types/Equipment';
import { Calendar, MapPin, Monitor, Hash, Settings } from 'lucide-react';

interface EquipmentDisplayProps {
  equipment: Equipment;
}

export const EquipmentDisplay: React.FC<EquipmentDisplayProps> = ({ equipment }) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString();
  };

  const getStatusColor = (statusType: string) => {
    switch (statusType.toLowerCase()) {
      case 'deployable': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'undeployable': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{equipment.name}</h2>
          <div className="flex items-center gap-4">
            <span className={`px-4 py-2 rounded-full text-lg font-semibold border ${getStatusColor(equipment.status_label.status_type)}`}>
              {equipment.status_label.name}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-lg">ID: {equipment.id}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 mt-4 md:mt-0 md:items-end">
          <div className="flex items-center gap-2">
            <span className="px-4 py-2 rounded-full text-lg font-semibold border bg-blue-50 text-blue-800 border-blue-200">
              Assigned To: {equipment.assigned_to?.name || 'Not assigned'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-4 py-2 rounded-full text-lg font-semibold border bg-green-50 text-green-800 border-green-200">
              Location: {equipment.location?.name || 'Not assigned'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <Hash className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Asset Tag</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{equipment.asset_tag}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <Settings className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Serial Number</p>
              <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white">{equipment.serial || 'Not specified'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <Monitor className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Model</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{equipment.model.name}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <Calendar className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Purchase Date</p>
              <p className="text-xl text-gray-900 dark:text-white">{equipment.purchase_date?.formatted || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <Calendar className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Created At</p>
              <p className="text-xl text-gray-900 dark:text-white">{equipment.created_at?.formatted || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <Calendar className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Asset EOL Date</p>
              <p className="text-xl text-gray-900 dark:text-white">{equipment.asset_eol_date?.formatted || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <Calendar className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Last Checkin</p>
              <p className="text-xl text-gray-900 dark:text-white">{equipment.last_checkin?.formatted || 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};