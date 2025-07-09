import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';
import MemberFormModal from '../MemberFormModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const MembersView = () => {
  const { t, organization } = useOrgTranslation();
  
  // Refs für Input-Felder zur Fokus-Verwaltung
  const searchInputRef = useRef(null);
  const filterRefs = useRef({
    status: null,
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
  
  // Search and Filter States mit Debouncing
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [filters, setFilters] = useState({
    status: '',
    memberNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // UI States
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce filters (mit längerer Verzögerung für bessere UX)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 800); // 800ms delay für Filter

    return () => clearTimeout(timer);
  }, [filters]);

  // Speichere Fokus vor dem Fetch
  const saveFocusState = () => {
    const activeElement = document.activeElement;
    
    // Check if search input is focused
    if (searchInputRef.current && activeElement === searchInputRef.current) {
      currentFocusedField.current = 'search';
      currentCursorPosition.current = searchInputRef.current.selectionStart;
      return;
    }
    
    // Check filter inputs
    Object.entries(filterRefs.current).forEach(([key, ref]) => {
      if (ref && activeElement === ref) {
        currentFocusedField.current = key;
        currentCursorPosition.current = ref.selectionStart;
      }
    });
  };

  // Stelle Fokus nach dem Fetch wieder her
  const restoreFocusState = () => {
    // Kleine Verzögerung, damit DOM-Updates abgeschlossen sind
    setTimeout(() => {
      if (currentFocusedField.current === 'search' && searchInputRef.current) {
        searchInputRef.current.focus();
        if (currentCursorPosition.current !== null) {
          searchInputRef.current.setSelectionRange(
            currentCursorPosition.current, 
            currentCursorPosition.current
          );
        }
      } else if (currentFocusedField.current && filterRefs.current[currentFocusedField.current]) {
        const input = filterRefs.current[currentFocusedField.current];
        input.focus();
        if (currentCursorPosition.current !== null) {
          input.setSelectionRange(
            currentCursorPosition.current, 
            currentCursorPosition.current
          );
        }
      }
      
      // Reset
      currentFocusedField.current = null;
      currentCursorPosition.current = null;
    }, 50);
  };

  useEffect(() => {
    fetchMembers();
  }, [currentPage, itemsPerPage, sortConfig, debouncedFilters, debouncedSearchTerm]);

  const fetchMembers = async () => {
    try {
      // Speichere Fokus-Status VOR dem Loading
      saveFocusState();
      
      setLoading(true);
      
      // Build query parameters for backend
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction.toUpperCase(),
        search: debouncedSearchTerm,
        ...Object.fromEntries(
          Object.entries(debouncedFilters).filter(([_, value]) => value !== '')
        )
      });

      const response = await axios.get(`${API_URL}/members?${params}`);
      
      // Handle both old and new API response formats
      if (response.data.members) {
        // New enhanced API response
        setMembers(response.data.members);
        setPagination(response.data.pagination);
      } else {
        // Legacy API response - fallback
        setMembers(Array.isArray(response.data) ? response.data : []);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: Array.isArray(response.data) ? response.data.length : 0,
          itemsPerPage: Array.isArray(response.data) ? response.data.length : 0
        });
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError(t('common.loadError', 'Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
      // Stelle Fokus wieder her NACH dem Loading
      restoreFocusState();
    }
  };

  // Sorting Logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter Logic - OHNE automatischen Seitenwechsel während der Eingabe
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    // Setze currentPage NICHT sofort auf 1, sondern erst wenn debounced
  };

  // Setze Seite zurück, wenn debouncedFilters sich ändern
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters, debouncedSearchTerm]);

  const clearFilters = () => {
    setFilters({
      status: '',
      memberNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Handler for member creation/update
  const handleAddMember = () => {
    setEditingMember(null);
    setShowMemberModal(true);
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setShowMemberModal(true);
  };

  const handleMemberSaved = (savedMember) => {
    // Refresh the members list
    fetchMembers();
    setShowMemberModal(false);
    setEditingMember(null);
  };

  const handleDeleteMember = async (member) => {
    const confirmText = t('members.confirmDelete', 
      `Möchten Sie ${member.firstName} ${member.lastName} wirklich löschen?`
    );
    
    if (!window.confirm(confirmText)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/members/${member.id}`);
      
      alert(t('members.deleteSuccess', 'Mitglied erfolgreich gelöscht!'));
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      alert(t('members.deleteError', 'Fehler beim Löschen des Mitglieds'));
    }
  };

  // Server-side Daten werden direkt verwendet (keine client-side Filterung mehr nötig)
  const displayMembers = members;
  
  // Pagination von Server verwenden
  const totalPages = pagination.totalPages;
  const totalItems = pagination.totalItems;

  // Selection Logic
  const handleSelectMember = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === displayMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(displayMembers.map(member => member.id));
    }
  };

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      active: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        label: t('members.status.active') 
      },
      inactive: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-800', 
        label: t('members.status.inactive') 
      },
      suspended: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        label: t('members.status.suspended') 
      }
    };

    const config = statusConfig[status] || statusConfig.inactive;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Sort Icon Component
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return <span className="text-gray-400">↕️</span>;
    }
    return (
      <span className="text-blue-600">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Loading Indicator - Subtiler, blockiert nicht das ganze UI
  const LoadingOverlay = () => {
    if (!loading) return null;
    
    return (
      <div className="absolute top-0 right-0 m-4">
        <div className="bg-white rounded-lg shadow-lg p-3 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Lade...</span>
        </div>
      </div>
    );
  };

  if (error && members.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('common.error', 'Fehler')}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchMembers}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {t('actions.retry', 'Erneut versuchen')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative">
      {/* Subtile Loading-Anzeige */}
      <LoadingOverlay />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              👥 <span className="ml-2">{t('members.plural')}</span>
            </h1>
            <p className="text-gray-600 mt-1">
              {totalItems} {t('members.plural')} 
              {pagination.currentPage > 1 && 
                ` (Seite ${pagination.currentPage}/${totalPages})`
              }
            </p>
          </div>
          <div className="flex space-x-2">
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
              onClick={() => {
                // Export current filtered results
                const params = new URLSearchParams({
                  search: debouncedSearchTerm,
                  ...Object.fromEntries(
                    Object.entries(debouncedFilters).filter(([_, value]) => value !== '')
                  )
                });
                window.open(`${API_URL}/members/export/csv?${params}`, '_blank');
              }}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  ref={el => filterRefs.current.status = el}
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Alle</option>
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                  <option value="suspended">Gesperrt</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('members.memberNumber')}
                </label>
                <input
                  ref={el => filterRefs.current.memberNumber = el}
                  type="text"
                  value={filters.memberNumber}
                  onChange={(e) => handleFilterChange('memberNumber', e.target.value)}
                  placeholder="z.B. M001"
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vorname</label>
                <input
                  ref={el => filterRefs.current.firstName = el}
                  type="text"
                  value={filters.firstName}
                  onChange={(e) => handleFilterChange('firstName', e.target.value)}
                  placeholder="Vorname"
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nachname</label>
                <input
                  ref={el => filterRefs.current.lastName = el}
                  type="text"
                  value={filters.lastName}
                  onChange={(e) => handleFilterChange('lastName', e.target.value)}
                  placeholder="Nachname"
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail</label>
                <input
                  ref={el => filterRefs.current.email = el}
                  type="text"
                  value={filters.email}
                  onChange={(e) => handleFilterChange('email', e.target.value)}
                  placeholder="E-Mail"
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full p-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Filter zurücksetzen
                </button>
              </div>
            </div>
          )}
          
          {/* Aktive Filter-Anzeige */}
          {(debouncedSearchTerm || Object.values(debouncedFilters).some(f => f)) && (
            <div className="mt-3 flex items-center text-sm text-gray-600">
              <span className="mr-2">Aktive Filter:</span>
              {debouncedSearchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                  Suche: {debouncedSearchTerm}
                </span>
              )}
              {Object.entries(debouncedFilters).map(([key, value]) => 
                value ? (
                  <span key={key} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                    {key}: {value}
                  </span>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedMembers.length === displayMembers.length && displayMembers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('memberNumber')}
                >
                  <div className="flex items-center">
                    {t('members.memberNumber')}
                    <SortIcon column="memberNumber" />
                  </div>
                </th>

                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    {t('common.name')}
                    <SortIcon column="name" />
                  </div>
                </th>

                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center">
                    {t('common.email')}
                    <SortIcon column="email" />
                  </div>
                </th>

                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center">
                    {t('common.phone')}
                    <SortIcon column="phone" />
                  </div>
                </th>

                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    {t('common.status')}
                    <SortIcon column="status" />
                  </div>
                </th>

                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    {t('members.memberSince')}
                    <SortIcon column="created_at" />
                  </div>
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {displayMembers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <div className="text-6xl mb-4">👥</div>
                      <p className="text-lg font-medium">
                        {searchTerm || Object.values(filters).some(f => f) 
                          ? 'Keine Ergebnisse gefunden' 
                          : `Keine ${t('members.plural')} vorhanden`
                        }
                      </p>
                      {(searchTerm || Object.values(filters).some(f => f)) && (
                        <button
                          onClick={clearFilters}
                          className="mt-2 text-blue-600 hover:text-blue-800"
                        >
                          Filter zurücksetzen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    className={`hover:bg-gray-50 ${
                      selectedMembers.includes(member.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => handleSelectMember(member.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {member.memberNumber}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.email}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {member.phone || '—'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={member.status} />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.joinedAt 
                        ? new Date(member.joinedAt).toLocaleDateString('de-DE')
                        : new Date(member.created_at).toLocaleDateString('de-DE')
                      }
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditMember(member)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('actions.view')}
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleEditMember(member)}
                          className="text-green-600 hover:text-green-900"
                          title={t('actions.edit')}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member)}
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
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Zurück
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Weiter
                </button>
              </div>
              
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                  <p className="text-sm text-gray-700">
                    Zeige {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} bis {Math.min(pagination.currentPage * pagination.itemsPerPage, totalItems)} von {totalItems} Einträgen
                  </p>
                  
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value={5}>5 pro Seite</option>
                    <option value={10}>10 pro Seite</option>
                    <option value={25}>25 pro Seite</option>
                    <option value={50}>50 pro Seite</option>
                  </select>
                </div>
                
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      ‹
                    </button>
                    
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      ›
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedMembers.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
          <div className="flex items-center space-x-4">
            <span>{selectedMembers.length} {t('members.plural')} ausgewählt</span>
            <button
              onClick={() => {/* TODO: Bulk edit */}}
              className="bg-blue-500 hover:bg-blue-400 px-3 py-1 rounded text-sm"
            >
              Bearbeiten
            </button>
            <button
              onClick={() => {/* TODO: Bulk delete */}}
              className="bg-red-500 hover:bg-red-400 px-3 py-1 rounded text-sm"
            >
              Löschen
            </button>
            <button
              onClick={() => setSelectedMembers([])}
              className="text-blue-200 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Member Form Modal */}
      <MemberFormModal
        isOpen={showMemberModal}
        onClose={() => {
          setShowMemberModal(false);
          setEditingMember(null);
        }}
        member={editingMember}
        onSuccess={handleMemberSaved}
      />
    </div>
  );
};

export default MembersView;