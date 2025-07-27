import React, { useState, useEffect } from 'react';
import { Settings, Search, X } from 'lucide-react';
import { snipeItApi } from '../services/snipeItApi';

interface StatusSelectorProps {
  selectedStatusId: number | null;
  onStatusSelect: (statusId: number, statusName: string) => void;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  selectedStatusId,
  onStatusSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allStatuses, setAllStatuses] = useState<Array<{ id: number; name: string }>>([]);
  const [filteredStatuses, setFilteredStatuses] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedStatus, setSelectedStatus] = useState<{ id: number; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load all statuses on mount
  useEffect(() => {
    const loadStatuses = async () => {
      setIsLoading(true);
      try {
        const statuses = await snipeItApi.getStatusLabels();
        setAllStatuses(statuses);
        setFilteredStatuses(statuses);
        
        // Set selected status if provided
        if (selectedStatusId) {
          const found = statuses.find(s => s.id === selectedStatusId);
          if (found) {
            setSelectedStatus(found);
          }
        }
      } catch (error) {
        console.error('Failed to load statuses:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStatuses();
  }, [selectedStatusId]);

  // Filter statuses based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStatuses(allStatuses);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allStatuses.filter(status => {
      const name = status.name.toLowerCase();
      return name.includes(query);
    });
    
    setFilteredStatuses(filtered);
  }, [searchQuery, allStatuses]);

  const handleStatusSelect = (status: { id: number; name: string }) => {
    setSelectedStatus(status);
    onStatusSelect(status.id, status.name);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mr-3"></div>
        <span className="text-lg text-gray-600 dark:text-gray-400">Loading statuses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search statuses..."
          className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Selected Status Display */}
      {selectedStatus && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl flex items-center">
          <Settings className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3" />
          <span className="text-orange-800 dark:text-orange-200 font-medium text-lg">
            Selected: {selectedStatus.name}
          </span>
        </div>
      )}

      {/* Status Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {searchQuery ? `Search Results (${filteredStatuses.length})` : `All Statuses (${filteredStatuses.length})`}
          </h3>
        </div>
        
        {filteredStatuses.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchQuery ? 'No statuses found matching your search.' : 'No statuses available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredStatuses.map((status) => (
              <button
                key={status.id}
                onClick={() => handleStatusSelect(status)}
                className={`p-4 rounded-xl text-left transition-all duration-200 border-2 hover:shadow-md ${
                  selectedStatus?.id === status.id
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-400 text-orange-900 dark:text-orange-100'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    selectedStatus?.id === status.id
                      ? 'bg-orange-100 dark:bg-orange-800'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    <Settings className={`w-5 h-5 ${
                      selectedStatus?.id === status.id
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-lg">{status.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status ID: {status.id}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};