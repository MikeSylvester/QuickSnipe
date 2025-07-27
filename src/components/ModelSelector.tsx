import React, { useState, useEffect } from 'react';
import { Monitor, Search, X } from 'lucide-react';
import { snipeItApi } from '../services/snipeItApi';

interface ModelSelectorProps {
  selectedModelId: number | null;
  onModelSelect: (modelId: number, modelName: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  onModelSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allModels, setAllModels] = useState<Array<{ id: number; name: string }>>([]);
  const [filteredModels, setFilteredModels] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedModel, setSelectedModel] = useState<{ id: number; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load all models on mount
  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);
      try {
        const models = await snipeItApi.getModels();
        setAllModels(models);
        setFilteredModels(models);
        
        // Set selected model if provided
        if (selectedModelId) {
          const found = models.find(m => m.id === selectedModelId);
          if (found) {
            setSelectedModel(found);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadModels();
  }, [selectedModelId]);

  // Filter models based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredModels(allModels);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allModels.filter(model => {
      const name = model.name.toLowerCase();
      return name.includes(query);
    });
    
    setFilteredModels(filtered);
  }, [searchQuery, allModels]);

  const handleModelSelect = (model: { id: number; name: string }) => {
    setSelectedModel(model);
    onModelSelect(model.id, model.name);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mr-3"></div>
        <span className="text-lg text-gray-600 dark:text-gray-400">Loading models...</span>
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
          placeholder="Search models..."
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

      {/* Selected Model Display */}
      {selectedModel && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl flex items-center">
          <Monitor className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3" />
          <span className="text-orange-800 dark:text-orange-200 font-medium text-lg">
            Selected: {selectedModel.name}
          </span>
        </div>
      )}

      {/* Model Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {searchQuery ? `Search Results (${filteredModels.length})` : `All Models (${filteredModels.length})`}
          </h3>
        </div>
        
        {filteredModels.length === 0 ? (
          <div className="text-center py-12">
            <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchQuery ? 'No models found matching your search.' : 'No models available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model)}
                className={`p-4 rounded-xl text-left transition-all duration-200 border-2 hover:shadow-md ${
                  selectedModel?.id === model.id
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-400 text-orange-900 dark:text-orange-100'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    selectedModel?.id === model.id
                      ? 'bg-orange-100 dark:bg-orange-800'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    <Monitor className={`w-5 h-5 ${
                      selectedModel?.id === model.id
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-lg">{model.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Model ID: {model.id}</p>
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