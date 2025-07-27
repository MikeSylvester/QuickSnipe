import React, { useState, useEffect } from 'react';
import { Search, X, User, ArrowLeft } from 'lucide-react';
import { snipeItApi } from '../services/snipeItApi';

interface UserSelectorProps {
  selectedUserId: number | null;
  onUserSelect: (userId: number, userName: string) => void;
  onClearUser: () => void;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  selectedUserId,
  onUserSelect,
  onClearUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [filteredUsers, setFilteredUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load all users on mount
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const users = await snipeItApi.getAllUsers();
        setAllUsers(users);
        setFilteredUsers(users);
        
        // Set selected user if provided
        if (selectedUserId) {
          const found = users.find(u => u.id === selectedUserId);
          if (found) {
            setSelectedUser(found);
          }
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUsers();
  }, [selectedUserId]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allUsers.filter(user => {
      const name = user.name.toLowerCase();
      const nameParts = name.split(' ');
      
      // Check if query matches any part of the name (first name, last name, or full name)
      return nameParts.some(part => part.includes(query)) || name.includes(query);
    });
    
    setFilteredUsers(filtered);
  }, [searchQuery, allUsers]);

  const handleUserSelect = (user: { id: number; name: string }) => {
    setSelectedUser(user);
    onUserSelect(user.id, user.name);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    onClearUser();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mr-3"></div>
        <span className="text-lg text-gray-600 dark:text-gray-400">Loading users...</span>
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
          placeholder="Search users by name..."
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

      {/* Selected User Display */}
      {selectedUser && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl flex items-center justify-between">
          <div className="flex items-center">
            <User className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3" />
            <span className="text-orange-800 dark:text-orange-200 font-medium text-lg">
              Selected: {selectedUser.name}
            </span>
          </div>
          <button
            onClick={handleClearUser}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg transition-colors flex items-center text-sm"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </button>
        </div>
      )}

      {/* User Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {searchQuery ? `Search Results (${filteredUsers.length})` : `All Users (${filteredUsers.length})`}
          </h3>
        </div>
        
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchQuery ? 'No users found matching your search.' : 'No users available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`p-4 rounded-xl text-left transition-all duration-200 border-2 hover:shadow-md ${
                  selectedUser?.id === user.id
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-400 text-orange-900 dark:text-orange-100'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    selectedUser?.id === user.id
                      ? 'bg-orange-100 dark:bg-orange-800'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    <User className={`w-5 h-5 ${
                      selectedUser?.id === user.id
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-lg">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">User ID: {user.id}</p>
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