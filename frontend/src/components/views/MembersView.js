// frontend/src/components/views/MembersView.js - VOLLSTÄNDIG MIT BEIDEN STATUS-SPALTEN
import React, { useState, useEffect, useRef, useContext } from 'react';
import { OrganizationContext } from '../../contexts/OrganizationContext';
import axios from 'axios';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';
import MemberFormModal from '../modals/MemberFormModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const MembersView = () => {
  const { organization } = useContext(OrganizationContext);
  const { t } = useOrgTranslation();
  
  // Refs für Input-Felder zur Fokus-Verwaltung
  const searchInputRef = useRef(null);
  const filterRefs = useRef({
    status: null,
    calculatedStatus: null,
    membershipStatus: null,
    memberNumber: null,
    firstName: null,
    lastName: null,
    email: null,
    phone: null
  });
  const currentFocusedField = useRef(null);
  const currentCursorPosition = useRef(null);
  
  // States
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  
  // Modal States
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  
  // Search and Filter States mit Debouncing
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [filters, setFilters] = useState({
    status: '',
    calculatedStatus: '',
    membershipStatus: '',
    memberNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [showFilters, setShowFilters] = useState(false);
  
  // Selection States
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Autocomplete States
  const [suggestions, setSuggestions] = useState({});
  const [showSuggestions, setShowSuggestions] = useState({});
  
  // Status Configuration from Organization
  const [statusConfig, setStatusConfig] = useState([]);
  
  // Hilfsfunktion zur Überprüfung ob ein Element setSelectionRange unterstützt
  const supportsSetSelectionRange = (element) => {
    return element && typeof element.setSelectionRange === 'function';
  };
  
  // Load status configuration
  useEffect(() => {
    if (organization?.settings?.membershipConfig?.statuses) {
      setStatusConfig(organization.settings.membershipConfig.statuses);
    }
  }, [organization]);
  
  // Debouncing für Suche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debouncing für Filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  // Fokus-State speichern
  const saveFocusState = () => {
    const activeElement = document.activeElement;
    
    if (activeElement === searchInputRef.current) {
      currentFocusedField.current = 'search';
      currentCursorPosition.current = activeElement.selectionStart;
    } else {
      Object.entries(filterRefs.current).forEach(([field, ref]) => {
        if (ref === activeElement) {
          currentFocusedField.current = field;
          // Nur für Elemente die setSelectionRange unterstützen
          if (supportsSetSelectionRange(activeElement)) {
            currentCursorPosition.current = activeElement.selectionStart;
          } else {
            currentCursorPosition.current = null;
          }
        }
      });
    }
  };

  // Fokus-State wiederherstellen
  const restoreFocusState = () => {
    setTimeout(() => {
      if (currentFocusedField.current === 'search' && searchInputRef.current) {
        searchInputRef.current.focus();
        if (currentCursorPosition.current !== null && supportsSetSelectionRange(searchInputRef.current)) {
          searchInputRef.current.setSelectionRange(
            currentCursorPosition.current, 
            currentCursorPosition.current
          );
        }
      } else if (currentFocusedField.current && filterRefs.current[currentFocusedField.current]) {
        const input = filterRefs.current[currentFocusedField.current];
        input.focus();
        // Nur setSelectionRange aufrufen wenn unterstützt
        if (currentCursorPosition.current !== null && supportsSetSelectionRange(input)) {
          input.setSelectionRange(
            currentCursorPosition.current, 
            currentCursorPosition.current
          );
        }
      }
      
      currentFocusedField.current = null;
      currentCursorPosition.current = null;
    }, 50);
  };

  // Data Loading
  useEffect(() => {
    fetchMembers();
  }, [debouncedSearchTerm, debouncedFilters, sortConfig, pagination.currentPage, pagination.itemsPerPage]);

  const fetchMembers = async () => {
    try {
      saveFocusState();
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString(),
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction.toUpperCase(),
        search: debouncedSearchTerm
      });

      // Filter nur hinzufügen, wenn sie gesetzt sind
      Object.entries(debouncedFilters).forEach(([key, value]) => {
        if (value !== '') {
          // Debug: Log each filter
          console.log(`Adding filter: ${key} = ${value}`);
          params.append(key, value);
        }
      });

      console.log('Fetching members with params:', params.toString());
      console.log('Full URL:', `${API_URL}/members?${params}`);
      
      const response = await axios.get(`${API_URL}/members?${params}`);
      
      console.log('Response from backend:', response.data);
      
      if (response.data.members) {
        setMembers(response.data.members);
        console.log('Number of members received:', response.data.members.length);
        setPagination(prev => ({
          ...prev,
          totalPages: response.data.pagination.pages || 1,
          totalItems: response.data.pagination.total || 0
        }));
      } else {
        setMembers(Array.isArray(response.data) ? response.data : []);
        console.log('Number of members received:', Array.isArray(response.data) ? response.data.length : 0);
      }
      
      setSelectAll(false);
      setSelectedRows([]);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError(t('common.loadError', 'Fehler beim Laden der Mitglieder'));
    } finally {
      setLoading(false);
      restoreFocusState();
    }
  };

  // Autocomplete
  const fetchSuggestions = async (field, value) => {
    if (!value || value.length < 2) {
      setSuggestions(prev => ({ ...prev, [field]: [] }));
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/members/suggestions`, {
        params: { q: value, field }
      });
      
      // Handle response structure
      if (response.data.suggestions) {
        setSuggestions(prev => ({ ...prev, [field]: response.data.suggestions }));
      } else if (Array.isArray(response.data)) {
        setSuggestions(prev => ({ ...prev, [field]: response.data }));
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  // Handlers
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (field, value) => {
    console.log(`Filter changed: ${field} = ${value}`);
    
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      
      // Spezielle Behandlung für Status-Filter
      // Wenn membershipStatus gesetzt wird, auch status für Backend-Kompatibilität setzen
      if (field === 'membershipStatus') {
        newFilters.status = value;
      }
      
      console.log('New filters:', newFilters);
      return newFilters;
    });
    
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    
    // Fetch suggestions for autocomplete fields
    if (['firstName', 'lastName', 'email'].includes(field)) {
      fetchSuggestions(field, value);
    }
  };

  const handleSuggestionClick = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setShowSuggestions(prev => ({ ...prev, [field]: false }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const toggleRowSelection = (memberId) => {
    setSelectedRows(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
    } else {
      setSelectedRows(members.map(member => member._id || member.id));
    }
    setSelectAll(!selectAll);
  };

  const handleAddMember = () => {
    setSelectedMember(null);
    setShowMemberModal(true);
  };

  const handleEditMember = (member) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  const handleDeleteClick = (member) => {
    setMemberToDelete(member);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;

    try {
      await axios.delete(`${API_URL}/members/${memberToDelete._id || memberToDelete.id}`);
      fetchMembers();
      setShowDeleteConfirm(false);
      setMemberToDelete(null);
    } catch (error) {
      console.error('Error deleting member:', error);
      alert(t('common.deleteError', 'Fehler beim Löschen'));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    
    if (!window.confirm(t('members.confirmBulkDelete', `${selectedRows.length} Mitglieder wirklich löschen?`))) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/members/bulk`, {
        data: { memberIds: selectedRows }
      });
      fetchMembers();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert(t('common.deleteError', 'Fehler beim Löschen'));
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API_URL}/members/export/csv`, {
        responseType: 'blob',
        params: {
          ...filters,
          search: searchTerm
        }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `members_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Fehler beim Exportieren der Daten');
    }
  };

  // 1. StatusBadge für den berechneten Status (Aktiv/Inaktiv)
  const StatusBadge = ({ member }) => {
    // Berechne den Status basierend auf den Daten
    const calculateStatus = () => {
      // Debug: Log member data
      console.log('Member status data:', {
        id: member._id || member.id,
        calculatedStatus: member.calculatedStatus,
        status: member.status,
        joinedAt: member.joinedAt,
        leavingDate: member.membershipData?.leavingDate
      });
      
      // Verwende den vom Backend berechneten Status, falls vorhanden
      if (member.calculatedStatus) {
        return member.calculatedStatus;
      }
      
      // Fallback auf member.status wenn vorhanden
      if (member.status === 'active' || member.status === 'inactive') {
        return member.status;
      }
      
      // Fallback: Berechne lokal
      if (!member.joinedAt) return 'inactive';
      if (!member.membershipData?.leavingDate) return 'active';
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const leaving = new Date(member.membershipData.leavingDate);
      leaving.setHours(0, 0, 0, 0);
      
      return leaving >= today ? 'active' : 'inactive';
    };

    const status = calculateStatus();
    const config = {
      active: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        label: 'Aktiv' 
      },
      inactive: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-800', 
        label: 'Inaktiv' 
      }
    };

    const statusConfig = config[status] || config.inactive;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
        {statusConfig.label}
      </span>
    );
  };

  // 2. MitgliedsstatusBadge für den Konfigurations-Status
  const MitgliedsstatusBadge = ({ status, statuses }) => {
    // Hole die Status-Konfiguration aus den Organization-Einstellungen
    const statusConfig = statuses?.find(s => s.key === status);
    
    // Fallback für unbekannte Status
    if (!statusConfig) {
      return status ? (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>
      ) : null;
    }

    const colorMap = {
      green: { bg: 'bg-green-100', text: 'text-green-800' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      red: { bg: 'bg-red-100', text: 'text-red-800' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-800' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-800' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-800' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-800' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800' }
    };

    const colors = colorMap[statusConfig.color] || colorMap.gray;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
        {statusConfig.label}
      </span>
    );
  };

  // Column component
  const SortableColumn = ({ column, children }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortConfig.key === column && (
          <span className="text-blue-600">
            {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  // Loading state
  if (loading && members.length === 0) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('members.plural')}
        </h1>
        <p className="text-gray-600">
          {t('members.subtitle', 'Verwalten Sie Ihre Mitglieder')}
        </p>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {pagination.totalItems} {t('members.total', 'Mitglieder insgesamt')}
            </span>
            {selectedRows.length > 0 && (
              <>
                <span className="text-sm text-gray-400">|</span>
                <span className="text-sm text-blue-600 font-medium">
                  {selectedRows.length} {t('members.selected', 'ausgewählt')}
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  🗑️ {t('actions.delete')}
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                showFilters 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              🔍 Filter
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              title="Als CSV exportieren"
            >
              📄 Export
            </button>
            <button
              onClick={handleAddMember}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              ➕ {t('members.addMember')}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4">
          {/* Full-text Search */}
          <div className="mb-4">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`${t('members.plural')} durchsuchen...`}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Column Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Calculated Status Filter (Aktiv/Inaktiv) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  ref={el => filterRefs.current.calculatedStatus = el}
                  value={filters.calculatedStatus}
                  onChange={(e) => handleFilterChange('calculatedStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle</option>
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                </select>
              </div>

              {/* Membership Status Filter */}
              {statusConfig.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('members.membershipStatus', 'Mitgliedsstatus')}
                  </label>
                  <select
                    ref={el => filterRefs.current.membershipStatus = el}
                    value={filters.membershipStatus}
                    onChange={(e) => handleFilterChange('membershipStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Alle</option>
                    {statusConfig.map(status => (
                      <option key={status.key} value={status.key}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Member Number Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('members.memberNumber')}
                </label>
                <input
                  ref={el => filterRefs.current.memberNumber = el}
                  type="text"
                  value={filters.memberNumber}
                  onChange={(e) => handleFilterChange('memberNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. M001"
                />
              </div>

              {/* First Name Filter */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('members.firstName')}
                </label>
                <input
                  ref={el => filterRefs.current.firstName = el}
                  type="text"
                  value={filters.firstName}
                  onChange={(e) => handleFilterChange('firstName', e.target.value)}
                  onFocus={() => setShowSuggestions(prev => ({ ...prev, firstName: true }))}
                  onBlur={() => setTimeout(() => setShowSuggestions(prev => ({ ...prev, firstName: false })), 200)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Vorname filtern"
                />
                {showSuggestions.firstName && suggestions.firstName?.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-auto">
                    {suggestions.firstName.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick('firstName', suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Last Name Filter */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('members.lastName')}
                </label>
                <input
                  ref={el => filterRefs.current.lastName = el}
                  type="text"
                  value={filters.lastName}
                  onChange={(e) => handleFilterChange('lastName', e.target.value)}
                  onFocus={() => setShowSuggestions(prev => ({ ...prev, lastName: true }))}
                  onBlur={() => setTimeout(() => setShowSuggestions(prev => ({ ...prev, lastName: false })), 200)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nachname filtern"
                />
                {showSuggestions.lastName && suggestions.lastName?.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-auto">
                    {suggestions.lastName.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick('lastName', suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Email Filter */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.email')}
                </label>
                <input
                  ref={el => filterRefs.current.email = el}
                  type="text"
                  value={filters.email}
                  onChange={(e) => handleFilterChange('email', e.target.value)}
                  onFocus={() => setShowSuggestions(prev => ({ ...prev, email: true }))}
                  onBlur={() => setTimeout(() => setShowSuggestions(prev => ({ ...prev, email: false })), 200)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="E-Mail filtern"
                />
                {showSuggestions.email && suggestions.email?.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-auto">
                    {suggestions.email.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick('email', suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.phone')}
                </label>
                <input
                  ref={el => filterRefs.current.phone = el}
                  type="text"
                  value={filters.phone}
                  onChange={(e) => handleFilterChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Telefon filtern"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <SortableColumn column="memberNumber">
                  {t('members.memberNumber')}
                </SortableColumn>
                <SortableColumn column="lastName">
                  {t('common.name')}
                </SortableColumn>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.phone')}
                </th>
                <SortableColumn column="calculatedStatus">
                  Status
                </SortableColumn>
                <SortableColumn column="membershipStatus">
                  {t('members.membershipStatus', 'Mitgliedsstatus')}
                </SortableColumn>
                <SortableColumn column="joinedAt">
                  {t('members.memberSince')}
                </SortableColumn>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('actions.title', 'Aktionen')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    {debouncedSearchTerm || Object.values(debouncedFilters).some(v => v) 
                      ? t('members.noResults', 'Keine Ergebnisse gefunden')
                      : t('members.empty', 'Noch keine Mitglieder vorhanden')}
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member._id || member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(member._id || member.id)}
                        onChange={() => toggleRowSelection(member._id || member.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.memberNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {member.salutation && `${member.salutation} `}
                          {member.firstName} {member.lastName}
                        </div>
                        {member.company && (
                          <div className="text-sm text-gray-500">{member.company}</div>
                        )}
                        {member.title && (
                          <div className="text-sm text-gray-500">{member.title}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.mobile || member.phone || member.landline || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge member={member} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(member.membershipData?.membershipStatus || member.membershipStatus || member.status) && (
                        <MitgliedsstatusBadge 
                          status={member.membershipData?.membershipStatus || member.membershipStatus || member.status} 
                          statuses={statusConfig}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.joinedAt 
                        ? new Date(member.joinedAt).toLocaleDateString('de-DE')
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditMember(member)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('actions.edit')}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteClick(member)}
                          className="text-red-600 hover:text-red-900"
                          title={t('actions.delete')}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {t('pagination.showing', 'Zeige')} {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} {t('pagination.to', 'bis')} {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} {t('pagination.of', 'von')} {pagination.totalItems} {t('pagination.results', 'Ergebnissen')}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 rounded border border-gray-300 bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ←
                </button>
                {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                  let pageNumber;
                  if (pagination.totalPages <= 5) {
                    pageNumber = index + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNumber = index + 1;
                  } else if (pagination.currentPage >= pagination.totalPages - 2) {
                    pageNumber = pagination.totalPages - 4 + index;
                  } else {
                    pageNumber = pagination.currentPage - 2 + index;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`px-3 py-1 rounded text-sm ${
                        pagination.currentPage === pageNumber
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 rounded border border-gray-300 bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Member Form Modal */}
      {showMemberModal && (
        <MemberFormModal
          isOpen={showMemberModal}
          onClose={() => {
            setShowMemberModal(false);
            setSelectedMember(null);
          }}
          member={selectedMember}
          onSuccess={() => {
            setShowMemberModal(false);
            setSelectedMember(null);
            fetchMembers();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && memberToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {t('members.confirmDelete', 'Mitglied löschen?')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('members.deleteConfirmText', 'Möchten Sie dieses Mitglied wirklich löschen?')}
              <br />
              <strong>{memberToDelete.firstName} {memberToDelete.lastName}</strong>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setMemberToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('actions.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('actions.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersView;