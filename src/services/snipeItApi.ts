import axios from 'axios';
import { Equipment, StatusUpdate } from '../types/Equipment';

class SnipeItApiService {
  private baseUrl: string = '';
  private apiToken: string = '';

  setConfig(baseUrl: string, apiToken: string) {
    // Use proxy path for development, full URL for production
    this.baseUrl = import.meta.env.DEV ? '' : baseUrl.replace(/\/$/, '');
    this.apiToken = apiToken;
    console.log('API Config set:', { baseUrl: this.baseUrl, hasToken: !!this.apiToken });
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async getEquipmentById(id: number): Promise<Equipment | null> {
    try {
      if (!this.apiToken) {
        throw new Error('API configuration not set');
      }

      const response = await axios.get(
        `${this.baseUrl}/api/v1/hardware/${id}`,
        { 
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching equipment:', error);
      throw error;
    }
  }

  async updateEquipmentStatus(id: number, update: StatusUpdate, extraFields?: Record<string, any>): Promise<boolean> {
    try {
      if (!this.apiToken) {
        throw new Error('API configuration not set');
      }
      const response = await axios.patch(
        `${this.baseUrl}/api/v1/hardware/${id}`,
        { ...update, ...(extraFields || {}) },
        { 
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      return response.status === 200;
    } catch (error) {
      console.error('Error updating equipment status:', error);
      throw error;
    }
  }

  // Get status IDs for the three actions
  async getStatusIds(): Promise<{ bench: number; ready: number; storage: number }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/statuslabels`,
        { 
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      const statuses = response.data.rows;
      
      // Find status IDs by name (you may need to adjust these names based on your Snipe-IT setup)
      const bench = statuses.find((s: any) => s.name.toLowerCase().includes('bench'))?.id || 1;
      const ready = statuses.find((s: any) => s.name.toLowerCase().includes('ready'))?.id || 2;
      const storage = statuses.find((s: any) => s.name.toLowerCase().includes('storage'))?.id || 3;

      return { bench, ready, storage };
    } catch (error) {
      console.error('Error fetching status IDs:', error);
      return { bench: 1, ready: 2, storage: 3 }; // Default fallback IDs
    }
  }

  // Get Cowen Cottage location ID
  async getCowenCottageLocationId(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/locations`,
        { 
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      const locations = response.data.rows;
      const cowenCottage = locations.find((l: any) => 
        l.name.toLowerCase().includes('cowen cottage')
      );

      return cowenCottage?.id || 1; // Default fallback ID
    } catch (error) {
      console.error('Error fetching location ID:', error);
      return 1; // Default fallback ID
    }
  }

  async getLocations(): Promise<Array<{ id: number; name: string }>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/locations`,
        { 
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      return response.data.rows.map((loc: any) => ({ id: loc.id, name: loc.name }));
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  // Unassign equipment (set assigned_to to null)
  async unassignEquipment(id: number): Promise<boolean> {
    try {
      if (!this.apiToken) {
        throw new Error('API configuration not set');
      }
      const response = await axios.patch(
        `${this.baseUrl}/api/v1/hardware/${id}`,
        { assigned_to: null },
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      return response.status === 200;
    } catch (error) {
      console.error('Error unassigning equipment:', error);
      throw error;
    }
  }

  // Get Auburn Storage location ID
  async getAuburnStorageLocationId(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/locations`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      const locations = response.data.rows;
      const auburn = locations.find((l: any) =>
        l.name.toLowerCase().includes('auburn') && l.name.toLowerCase().includes('storage')
      );
      return auburn?.id || 1; // Default fallback ID
    } catch (error) {
      console.error('Error fetching Auburn Storage location ID:', error);
      return 1; // Default fallback ID
    }
  }

  // Get all storage locations (name contains 'storage')
  async getStorageLocations(): Promise<Array<{ id: number; name: string }>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/locations`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      return response.data.rows
        .filter((loc: any) => loc.name.toLowerCase().includes('storage'))
        .map((loc: any) => ({ id: loc.id, name: loc.name }));
    } catch (error) {
      console.error('Error fetching storage locations:', error);
      return [];
    }
  }

  // Get user ID by name (case-insensitive, trimmed, paginated)
  async getUserIdByName(name: string): Promise<number | null> {
    try {
      const target = name.trim().toLowerCase();
      let page = 1;
      const pageSize = 500;
      while (true) {
        const response = await axios.get(
          `${this.baseUrl}/api/v1/users?limit=${pageSize}&offset=${(page - 1) * pageSize}`,
          {
            headers: this.getHeaders(),
            timeout: 10000
          }
        );
        const users = response.data.rows;
        console.log('Fetched users:', users.map((u: any) => u.name));
        const user = users.find((u: any) => (u.name || '').trim().toLowerCase() === target);
        if (user) return user.id;
        if (users.length < pageSize) break; // No more pages
        page++;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user ID by name:', error);
      return null;
    }
  }

  // Get all users whose name contains 'storage' (case-insensitive, paginated)
  async getStorageUsers(): Promise<Array<{ id: number; name: string }>> {
    try {
      let page = 1;
      const pageSize = 500;
      let allUsers: Array<{ id: number; name: string }> = [];
      while (true) {
        const response = await axios.get(
          `${this.baseUrl}/api/v1/users?limit=${pageSize}&offset=${(page - 1) * pageSize}`,
          {
            headers: this.getHeaders(),
            timeout: 10000
          }
        );
        const users = response.data.rows;
        allUsers = allUsers.concat(
          users
            .filter((u: any) => (u.name || '').toLowerCase().includes('storage'))
            .map((u: any) => ({ id: u.id, name: u.name }))
        );
        if (users.length < pageSize) break;
        page++;
      }
      return allUsers;
    } catch (error) {
      console.error('Error fetching storage users:', error);
      return [];
    }
  }

  // Search for equipment by asset name
  async getEquipmentByName(name: string): Promise<Equipment | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/hardware?search=${encodeURIComponent(name)}`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      const found = response.data.rows.find((e: any) => (e.name || '').toLowerCase() === name.toLowerCase());
      return found || null;
    } catch (error) {
      console.error('Error searching equipment by name:', error);
      return null;
    }
  }

  // Search for equipment by serial number, then by name
  async getEquipmentBySerial(serial: string): Promise<Equipment | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/hardware?search=${encodeURIComponent(serial)}`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      let found = response.data.rows.find((e: any) => (e.serial || '').toLowerCase() === serial.toLowerCase());
      if (!found) {
        found = response.data.rows.find((e: any) => (e.name || '').toLowerCase() === serial.toLowerCase());
      }
      return found || null;
    } catch (error) {
      console.error('Error searching equipment by serial:', error);
      return null;
    }
  }

  // Search for equipment by asset tag, then by name
  async getEquipmentByAssetTag(assetTag: string): Promise<Equipment | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/hardware?search=${encodeURIComponent(assetTag)}`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      let found = response.data.rows.find((e: any) => (e.asset_tag || '').toLowerCase() === assetTag.toLowerCase());
      if (!found) {
        found = response.data.rows.find((e: any) => (e.name || '').toLowerCase() === assetTag.toLowerCase());
      }
      return found || null;
    } catch (error) {
      console.error('Error searching equipment by asset tag:', error);
      return null;
    }
  }

  // Fetch all models
  async getModels(): Promise<Array<{ id: number; name: string }>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/models`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      return response.data.rows.map((m: any) => ({ id: m.id, name: m.name }));
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  // Fetch all status labels
  async getStatusLabels(): Promise<Array<{ id: number; name: string }>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/statuslabels`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      return response.data.rows.map((s: any) => ({ id: s.id, name: s.name }));
    } catch (error) {
      console.error('Error fetching status labels:', error);
      return [];
    }
  }

  // Fetch all locations
  async getAllLocations(): Promise<Array<{ id: number; name: string }>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/locations`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      return response.data.rows.map((l: any) => ({ id: l.id, name: l.name }));
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  // Fetch all users
  async getAllUsers(): Promise<Array<{ id: number; name: string }>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/users?limit=1000`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      return response.data.rows.map((u: any) => ({ id: u.id, name: u.name }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  // Create a new device
  async createDevice(data: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/hardware`,
        data,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating device:', error);
      throw error;
    }
  }

  // Search users by name (autocomplete)
  async searchUsers(query: string): Promise<Array<{ id: number; name: string }>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/users?search=${encodeURIComponent(query)}&limit=10`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );
      return response.data.rows.map((u: any) => ({ id: u.id, name: u.name }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
}

export const snipeItApi = new SnipeItApiService();