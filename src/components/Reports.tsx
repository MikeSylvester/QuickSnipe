import React, { useState, useEffect } from 'react';
import { snipeItApi } from '../services/snipeItApi';
import { Equipment } from '../types/Equipment';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

interface ReportsProps {
  onBack: () => void;
  config: any;
  showToast: (message: string, type: 'success' | 'error') => void;
}

type ReportType = 'asset-distribution' | 'status-breakdown' | 'location-utilization' | 'model-analysis' | 'user-assignments' | 'activity-trends' | 'availability-report';

interface FilterState {
  locationIds: number[];
  statusIds: number[];
  modelIds: number[];
  manufacturerId: number | null;
  dateRange: '7days' | '30days' | '90days' | 'all';
}

export const Reports: React.FC<ReportsProps> = ({ onBack, config, showToast }) => {
  const [currentReport, setCurrentReport] = useState<ReportType>('asset-distribution');
  const [filters, setFilters] = useState<FilterState>({
    locationIds: [],
    statusIds: [],
    modelIds: [],
    manufacturerId: null,
    dateRange: 'all'
  });
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([]);
  const [statuses, setStatuses] = useState<Array<{ id: number; name: string }>>([]);
  const [models, setModels] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    locations: true,
    statuses: true,
    models: true,
    mobileFilters: false
  });

  // Color palette for charts
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [equipmentData, locationsData, statusesData, modelsData] = await Promise.all([
        snipeItApi.getAllEquipment(),
        snipeItApi.getAllLocations(),
        snipeItApi.getStatusLabels(),
        snipeItApi.getModels()
      ]);

      setEquipment(equipmentData);
      setLocations(locationsData);
      setStatuses(statusesData);
      setModels(modelsData);
    } catch (error) {
      console.error('Failed to load report data:', error);
      showToast('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterEquipment = (): Equipment[] => {
    let filtered = [...equipment];

    if (filters.locationIds.length > 0) {
      filtered = filtered.filter(e => e.location?.id && filters.locationIds.includes(e.location.id));
    }
    if (filters.statusIds.length > 0) {
      filtered = filtered.filter(e => e.status_label?.id && filters.statusIds.includes(e.status_label.id));
    }
    if (filters.modelIds.length > 0) {
      filtered = filtered.filter(e => e.model?.id && filters.modelIds.includes(e.model.id));
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.name?.toLowerCase().includes(searchLower) ||
        e.asset_tag?.toLowerCase().includes(searchLower) ||
        e.model?.name?.toLowerCase().includes(searchLower) ||
        e.location?.name?.toLowerCase().includes(searchLower) ||
        e.status_label?.name?.toLowerCase().includes(searchLower) ||
        e.assigned_to?.name?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filterLocations = () => {
    let filteredLocations = locations;
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredLocations = filteredLocations.filter(loc => loc.name.toLowerCase().includes(searchLower));
    }
    
    // Filter by selected statuses (only show locations that have assets with selected statuses)
    if (filters.statusIds.length > 0) {
      const locationsWithSelectedStatuses = new Set(
        equipment
          .filter(e => e.status_label?.id && filters.statusIds.includes(e.status_label.id))
          .map(e => e.location?.id)
          .filter(Boolean)
      );
      filteredLocations = filteredLocations.filter(loc => locationsWithSelectedStatuses.has(loc.id));
    }
    
    // Filter by selected models (only show locations that have assets with selected models)
    if (filters.modelIds.length > 0) {
      const locationsWithSelectedModels = new Set(
        equipment
          .filter(e => e.model?.id && filters.modelIds.includes(e.model.id))
          .map(e => e.location?.id)
          .filter(Boolean)
      );
      filteredLocations = filteredLocations.filter(loc => locationsWithSelectedModels.has(loc.id));
    }
    
    return filteredLocations;
  };

  const filterStatuses = () => {
    let filteredStatuses = statuses;
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredStatuses = filteredStatuses.filter(status => status.name.toLowerCase().includes(searchLower));
    }
    
    // Filter by selected locations (only show statuses that exist in selected locations)
    if (filters.locationIds.length > 0) {
      const statusesInSelectedLocations = new Set(
        equipment
          .filter(e => e.location?.id && filters.locationIds.includes(e.location.id))
          .map(e => e.status_label?.id)
          .filter(Boolean)
      );
      filteredStatuses = filteredStatuses.filter(status => statusesInSelectedLocations.has(status.id));
    }
    
    // Filter by selected models (only show statuses that exist for selected models)
    if (filters.modelIds.length > 0) {
      const statusesForSelectedModels = new Set(
        equipment
          .filter(e => e.model?.id && filters.modelIds.includes(e.model.id))
          .map(e => e.status_label?.id)
          .filter(Boolean)
      );
      filteredStatuses = filteredStatuses.filter(status => statusesForSelectedModels.has(status.id));
    }
    
    return filteredStatuses;
  };

  const filterModels = () => {
    let filteredModels = models;
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredModels = filteredModels.filter(model => model.name.toLowerCase().includes(searchLower));
    }
    
    // Filter by selected locations (only show models that exist in selected locations)
    if (filters.locationIds.length > 0) {
      const modelsInSelectedLocations = new Set(
        equipment
          .filter(e => e.location?.id && filters.locationIds.includes(e.location.id))
          .map(e => e.model?.id)
          .filter(Boolean)
      );
      filteredModels = filteredModels.filter(model => modelsInSelectedLocations.has(model.id));
    }
    
    // Filter by selected statuses (only show models that have assets with selected statuses)
    if (filters.statusIds.length > 0) {
      const modelsWithSelectedStatuses = new Set(
        equipment
          .filter(e => e.status_label?.id && filters.statusIds.includes(e.status_label.id))
          .map(e => e.model?.id)
          .filter(Boolean)
      );
      filteredModels = filteredModels.filter(model => modelsWithSelectedStatuses.has(model.id));
    }
    
    return filteredModels;
  };

  // Function to clean up invalid filter selections
  const cleanupInvalidFilters = () => {
    const availableLocations = filterLocations();
    const availableStatuses = filterStatuses();
    const availableModels = filterModels();
    
    const availableLocationIds = new Set(availableLocations.map(loc => loc.id));
    const availableStatusIds = new Set(availableStatuses.map(status => status.id));
    const availableModelIds = new Set(availableModels.map(model => model.id));
    
    const newFilters = { ...filters };
    let hasChanges = false;
    
    // Remove invalid location selections
    if (filters.locationIds.some(id => !availableLocationIds.has(id))) {
      newFilters.locationIds = filters.locationIds.filter(id => availableLocationIds.has(id));
      hasChanges = true;
    }
    
    // Remove invalid status selections
    if (filters.statusIds.some(id => !availableStatusIds.has(id))) {
      newFilters.statusIds = filters.statusIds.filter(id => availableStatusIds.has(id));
      hasChanges = true;
    }
    
    // Remove invalid model selections
    if (filters.modelIds.some(id => !availableModelIds.has(id))) {
      newFilters.modelIds = filters.modelIds.filter(id => availableModelIds.has(id));
      hasChanges = true;
    }
    
    if (hasChanges) {
      setFilters(newFilters);
    }
  };

  // Clean up invalid filters when equipment data changes
  useEffect(() => {
    if (equipment.length > 0) {
      cleanupInvalidFilters();
    }
  }, [equipment, searchTerm]);

  const generateAssetDistributionChart = () => {
    const filteredEquipment = filterEquipment();
    const locationCounts: { [key: string]: number } = {};

    filteredEquipment.forEach(e => {
      const location = e.location?.name || 'Unknown Location';
      locationCounts[location] = (locationCounts[location] || 0) + 1;
    });

    const labels = Object.keys(locationCounts);
    const data = Object.values(locationCounts);

    return {
      labels,
      datasets: [{
        label: 'Assets by Location',
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 2
      }]
    };
  };

  const generateStatusBreakdownChart = () => {
    const filteredEquipment = filterEquipment();
    const statusCounts: { [key: string]: number } = {};
    
    filteredEquipment.forEach(e => {
      const status = e.status_label?.name || 'Unknown Status';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);

    return {
      labels,
      datasets: [{
        label: 'Assets by Status',
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 2
      }]
    };
  };

  const generateLocationUtilizationChart = () => {
    const filteredEquipment = filterEquipment();
    const locationData: { [key: string]: { total: number; assigned: number } } = {};
    
    filteredEquipment.forEach(e => {
      const location = e.location?.name || 'Unknown Location';
      if (!locationData[location]) {
        locationData[location] = { total: 0, assigned: 0 };
      }
      locationData[location].total++;
      if (e.assigned_to) {
        locationData[location].assigned++;
      }
    });

    const labels = Object.keys(locationData);
    const assignedData = labels.map(loc => locationData[loc].assigned);
    const availableData = labels.map(loc => locationData[loc].total - locationData[loc].assigned);

    return {
      labels,
      datasets: [
        {
          label: 'Assigned',
          data: assignedData,
          backgroundColor: '#FF6B6B',
          borderColor: '#FF6B6B',
          borderWidth: 2
        },
        {
          label: 'Available',
          data: availableData,
          backgroundColor: '#4ECDC4',
          borderColor: '#4ECDC4',
          borderWidth: 2
        }
      ]
    };
  };

  const generateModelAnalysisChart = () => {
    const filteredEquipment = filterEquipment();
    const modelCounts: { [key: string]: number } = {};
    
    filteredEquipment.forEach(e => {
      const model = e.model?.name || 'Unknown Model';
      modelCounts[model] = (modelCounts[model] || 0) + 1;
    });

    // Sort by count and take top 10
    const sortedModels = Object.entries(modelCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const labels = sortedModels.map(([name]) => name);
    const data = sortedModels.map(([,count]) => count);

    return {
      labels,
      datasets: [{
        label: 'Assets by Model',
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 2
      }]
    };
  };

  const generateUserAssignmentsChart = () => {
    const filteredEquipment = filterEquipment();
    const userCounts: { [key: string]: number } = {};
    let unassigned = 0;
    
    filteredEquipment.forEach(e => {
      if (e.assigned_to) {
        const userName = e.assigned_to.name || 'Unknown User';
        userCounts[userName] = (userCounts[userName] || 0) + 1;
      } else {
        unassigned++;
      }
    });

    // Sort by count and take top 10 users + unassigned
    const sortedUsers = Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 9);

    const labels = ['Unassigned', ...sortedUsers.map(([name]) => name)];
    const data = [unassigned, ...sortedUsers.map(([,count]) => count)];

    return {
      labels,
      datasets: [{
        label: 'Assets per User',
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 2
      }]
    };
  };

  const generateActivityTrendsChart = () => {
    // Simulate activity data based on check-in/out dates
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const checkouts = months.map(() => Math.floor(Math.random() * 50) + 10);
    const checkins = months.map(() => Math.floor(Math.random() * 40) + 5);

    return {
      labels: months,
      datasets: [
        {
          label: 'Check-outs',
          data: checkouts,
          backgroundColor: 'rgba(255, 107, 107, 0.2)',
          borderColor: '#FF6B6B',
          borderWidth: 2,
          fill: true
        },
        {
          label: 'Check-ins',
          data: checkins,
          backgroundColor: 'rgba(78, 205, 196, 0.2)',
          borderColor: '#4ECDC4',
          borderWidth: 2,
          fill: true
        }
      ]
    };
  };

  const generateAvailabilityReport = () => {
    const filteredEquipment = filterEquipment();
    const total = filteredEquipment.length;
    const assigned = filteredEquipment.filter(e => e.assigned_to).length;
    const available = total - assigned;
    const inMaintenance = filteredEquipment.filter(e => e.status_label?.name?.toLowerCase().includes('maintenance')).length;
    const ready = filteredEquipment.filter(e => e.status_label?.name?.toLowerCase().includes('ready')).length;

    return {
      labels: ['Assigned', 'Available', 'In Maintenance', 'Ready'],
      datasets: [{
        label: 'Asset Availability',
        data: [assigned, available, inMaintenance, ready],
        backgroundColor: ['#FF6B6B', '#4ECDC4', '#F7DC6F', '#96CEB4'],
        borderColor: ['#FF6B6B', '#4ECDC4', '#F7DC6F', '#96CEB4'],
        borderWidth: 2
      }]
    };
  };

  const getChartData = () => {
    switch (currentReport) {
      case 'asset-distribution':
        return generateAssetDistributionChart();
      case 'status-breakdown':
        return generateStatusBreakdownChart();
      case 'location-utilization':
        return generateLocationUtilizationChart();
      case 'model-analysis':
        return generateModelAnalysisChart();
      case 'user-assignments':
        return generateUserAssignmentsChart();
      case 'activity-trends':
        return generateActivityTrendsChart();
      case 'availability-report':
        return generateAvailabilityReport();
      default:
        return generateAssetDistributionChart();
    }
  };

  const getChartType = () => {
    switch (currentReport) {
      case 'asset-distribution':
      case 'status-breakdown':
      case 'model-analysis':
      case 'user-assignments':
      case 'availability-report':
        return 'pie';
      case 'location-utilization':
        return 'bar';
      case 'activity-trends':
        return 'line';
      default:
        return 'pie';
    }
  };

  const getChartOptions = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#ffffff' : '#000000';
    const gridColor = isDark ? '#374151' : '#E5E7EB';
    const backgroundColor = isDark ? '#374151' : '#ffffff';
    const borderColor = isDark ? '#4B5563' : '#E5E7EB';

    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
                      labels: {
              color: textColor,
              padding: 20,
              font: {
                size: 12
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
        },
        tooltip: {
          backgroundColor: backgroundColor,
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: borderColor,
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          titleFont: {
            size: 14
          },
          bodyFont: {
            size: 12
          }
        }
      }
    };

    if (currentReport === 'activity-trends') {
      return {
        ...baseOptions,
        scales: {
          x: {
            ticks: {
              color: textColor,
              font: {
                size: 11
              }
            },
            grid: {
              color: gridColor,
              drawBorder: false
            },
            border: {
              color: gridColor
            }
          },
          y: {
            ticks: {
              color: textColor,
              font: {
                size: 11
              }
            },
            grid: {
              color: gridColor,
              drawBorder: false
            },
            border: {
              color: gridColor
            }
          }
        }
      };
    }

    return baseOptions;
  };

  const renderChart = () => {
    const chartData = getChartData();
    const chartType = getChartType();
    const options = getChartOptions();

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg lg:text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {getReportTitle()}
        </h3>
        <div className="h-64 lg:h-96">
          {chartType === 'pie' && <Pie data={chartData} options={options} />}
          {chartType === 'bar' && <Bar data={chartData} options={options} />}
          {chartType === 'line' && <Line data={chartData} options={options} />}
        </div>
      </div>
    );
  };

  const getReportTitle = () => {
    const titles = {
      'asset-distribution': 'Asset Distribution by Location',
      'status-breakdown': 'Asset Status Breakdown',
      'location-utilization': 'Location Utilization',
      'model-analysis': 'Top Equipment Models',
      'user-assignments': 'User Assignment Distribution',
      'activity-trends': 'Activity Trends (Last 6 Months)',
      'availability-report': 'Asset Availability Overview'
    };
    return titles[currentReport];
  };

  const renderChartDataTable = () => {
    const chartData = getChartData();
    const chartType = getChartType();

    if (chartType === 'line') {
      // For line charts, show monthly data
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Monthly Activity Data</h3>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Month</th>
                  <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Check-outs</th>
                  <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Check-ins</th>
                </tr>
              </thead>
              <tbody>
                {chartData.labels.map((month, index) => (
                  <tr key={month} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{month}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{chartData.datasets[0].data[index]}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{chartData.datasets[1].data[index]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (chartType === 'bar') {
      // For bar charts, show location utilization data
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Location Utilization Data</h3>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Location</th>
                  <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Assigned</th>
                  <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Available</th>
                  <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Total</th>
                </tr>
              </thead>
              <tbody>
                {chartData.labels.map((location, index) => (
                  <tr key={location} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{location}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{chartData.datasets[0].data[index]}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{chartData.datasets[1].data[index]}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{chartData.datasets[0].data[index] + chartData.datasets[1].data[index]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // For pie charts, show category data
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Chart Data</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Category</th>
                <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Count</th>
                <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {chartData.labels.map((label, index) => {
                const count = chartData.datasets[0].data[index];
                const total = chartData.datasets[0].data.reduce((sum, val) => sum + val, 0);
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                
                return (
                  <tr key={label} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{label}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{count}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{percentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFilters = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Search assets, locations, models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Selected Filters Header */}
      {(filters.locationIds.length > 0 || filters.statusIds.length > 0 || filters.modelIds.length > 0) && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Active Filters:</h4>
            <button
              onClick={() => setFilters({
                locationIds: [],
                statusIds: [],
                modelIds: [],
                manufacturerId: null,
                dateRange: 'all'
              })}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.locationIds.map(id => {
              const location = locations.find(loc => loc.id === id);
              return location ? (
                <span key={`loc-${id}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                  📍 {location.name}
                  <button
                    onClick={() => setFilters({...filters, locationIds: filters.locationIds.filter(lid => lid !== id)})}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
            {filters.statusIds.map(id => {
              const status = statuses.find(s => s.id === id);
              return status ? (
                <span key={`status-${id}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
                  🏷️ {status.name}
                  <button
                    onClick={() => setFilters({...filters, statusIds: filters.statusIds.filter(sid => sid !== id)})}
                    className="ml-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
            {filters.modelIds.map(id => {
              const model = models.find(m => m.id === id);
              return model ? (
                <span key={`model-${id}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200">
                  💻 {model.name}
                  <button
                    onClick={() => setFilters({...filters, modelIds: filters.modelIds.filter(mid => mid !== id)})}
                    className="ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Filter Sections */}
      <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
        {/* Locations Filter */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <button
            onClick={() => toggleSection('locations')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">📍 Locations</span>
              {filters.locationIds.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                  {filters.locationIds.length}
                </span>
              )}
            </div>
            <svg 
              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${expandedSections.locations ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.locations && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {filterLocations().map(loc => (
                <label key={loc.id} className="flex items-center cursor-pointer p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 shadow-sm hover:shadow-md">
                  <input
                    type="checkbox"
                    checked={filters.locationIds.includes(loc.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({...filters, locationIds: [...filters.locationIds, loc.id]});
                      } else {
                        setFilters({...filters, locationIds: filters.locationIds.filter(id => id !== loc.id)});
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">{loc.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Statuses Filter */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <button
            onClick={() => toggleSection('statuses')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">🏷️ Statuses</span>
              {filters.statusIds.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded-full">
                  {filters.statusIds.length}
                </span>
              )}
            </div>
            <svg 
              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${expandedSections.statuses ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.statuses && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {filterStatuses().map(status => (
                <label key={status.id} className="flex items-center cursor-pointer p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 shadow-sm hover:shadow-md">
                  <input
                    type="checkbox"
                    checked={filters.statusIds.includes(status.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({...filters, statusIds: [...filters.statusIds, status.id]});
                      } else {
                        setFilters({...filters, statusIds: filters.statusIds.filter(id => id !== status.id)});
                      }
                    }}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">{status.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Models Filter */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <button
            onClick={() => toggleSection('models')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">💻 Models</span>
              {filters.modelIds.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded-full">
                  {filters.modelIds.length}
                </span>
              )}
            </div>
            <svg 
              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${expandedSections.models ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.models && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {filterModels().map(model => (
                <label key={model.id} className="flex items-center cursor-pointer p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 shadow-sm hover:shadow-md">
                  <input
                    type="checkbox"
                    checked={filters.modelIds.includes(model.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({...filters, modelIds: [...filters.modelIds, model.id]});
                      } else {
                        setFilters({...filters, modelIds: filters.modelIds.filter(id => id !== model.id)});
                      }
                    }}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-600 dark:border-gray-700"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">{model.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

                 {/* Results Summary */}
         <div className="pt-4">
           <div className="text-sm text-gray-600 dark:text-gray-400">
             <span className="font-semibold text-gray-900 dark:text-white">{filterEquipment().length}</span> assets found
           </div>
           {(filters.locationIds.length > 0 || filters.statusIds.length > 0 || filters.modelIds.length > 0 || searchTerm.trim()) && (
             <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
               Filtered from {equipment.length} total assets
             </div>
           )}
           
           {/* Dynamic Filtering Indicator */}
           {(filters.locationIds.length > 0 || filters.statusIds.length > 0 || filters.modelIds.length > 0) && (
             <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
               <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                 🔄 Dynamic Filtering Active
               </div>
               <div className="text-xs text-blue-600 dark:text-blue-400">
                 Filter options are automatically updated based on your selections
               </div>
             </div>
           )}
         </div>
      </div>
    </div>
  );

  const renderReportSelector = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Report Type</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
        {[
          { id: 'asset-distribution', name: 'Asset Distribution', icon: '📊' },
          { id: 'status-breakdown', name: 'Status Breakdown', icon: '📈' },
          { id: 'location-utilization', name: 'Location Utilization', icon: '🏢' },
          { id: 'model-analysis', name: 'Model Analysis', icon: '💻' },
          { id: 'user-assignments', name: 'User Assignments', icon: '👥' },
          { id: 'activity-trends', name: 'Activity Trends', icon: '📅' },
          { id: 'availability-report', name: 'Availability', icon: '✅' }
        ].map(report => (
          <button
            key={report.id}
            onClick={() => setCurrentReport(report.id as ReportType)}
            className={`p-3 lg:p-4 rounded-lg border-2 transition-all ${
              currentReport === report.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <div className="text-xl lg:text-2xl mb-1 lg:mb-2">{report.icon}</div>
            <div className="text-xs lg:text-sm font-medium text-gray-900 dark:text-white">{report.name}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderFilteredAssetsList = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Filtered Assets</h3>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Asset Tag</th>
              <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Name</th>
              <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Model</th>
              <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Location</th>
              <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Status</th>
              <th className="text-left py-2 px-3 text-gray-900 dark:text-white">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {filterEquipment().slice(0, 20).map((asset) => (
              <tr key={asset.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{asset.asset_tag}</td>
                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{asset.name}</td>
                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{asset.model?.name || 'N/A'}</td>
                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{asset.location?.name || 'N/A'}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    asset.status_label?.name?.toLowerCase().includes('ready') 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : asset.status_label?.name?.toLowerCase().includes('maintenance')
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {asset.status_label?.name || 'N/A'}
                  </span>
                </td>
                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{asset.assigned_to?.name || 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filterEquipment().length > 20 && (
        <div className="text-center mt-4 text-gray-600 dark:text-gray-400">
          Showing first 20 of {filterEquipment().length} assets
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                📊 Inventory Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Interactive charts and analytics for your inventory data
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
      </div>

             {/* Main Content with Responsive Layout */}
       <div className="flex flex-1 overflow-hidden">
         {/* Sidebar Filters - Responsive */}
         <div className="hidden lg:block w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
           {renderFilters()}
         </div>
 
         {/* Mobile Filter Toggle */}
         <div className="lg:hidden fixed bottom-6 right-6 z-50">
           <button
             onClick={() => setExpandedSections(prev => ({ ...prev, mobileFilters: !prev.mobileFilters }))}
             className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
             </svg>
           </button>
         </div>
 
         {/* Mobile Filters Overlay */}
         {expandedSections.mobileFilters && (
           <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setExpandedSections(prev => ({ ...prev, mobileFilters: false }))}>
             <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
               {renderFilters()}
             </div>
           </div>
         )}
 
         {/* Main Content */}
         <div className="flex-1 overflow-y-auto">
           <div className="p-4 lg:p-6">
             <div className="max-w-6xl mx-auto space-y-6">
               {/* Report Selector */}
               {renderReportSelector()}
 
               {/* Chart */}
               {renderChart()}
 
               {/* Chart Data Table */}
               {renderChartDataTable()}
 
               {/* Filtered Assets List */}
               {renderFilteredAssetsList()}
 
               {/* Summary Stats */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                 <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                   <div className="text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400">
                     {equipment.length}
                   </div>
                   <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Total Assets</div>
                 </div>
                 <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                   <div className="text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">
                     {equipment.filter(e => e.assigned_to).length}
                   </div>
                   <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Assigned Assets</div>
                 </div>
                 <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                   <div className="text-xl lg:text-2xl font-bold text-orange-600 dark:text-orange-400">
                     {equipment.filter(e => !e.assigned_to).length}
                   </div>
                   <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Available Assets</div>
                 </div>
                 <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                   <div className="text-xl lg:text-2xl font-bold text-purple-600 dark:text-purple-400">
                     {new Set(equipment.map(e => e.location?.name)).size}
                   </div>
                   <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Locations</div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
    </div>
  );
}; 