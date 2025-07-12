import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';
import MemberFormModal from '../modals/MemberFormModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DashboardView = () => {
  const { t } = useOrgTranslation();
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, membersRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`),
        axios.get(`${API_URL}/members?limit=5&sortBy=created_at&sortOrder=DESC`)
      ]);
      
      setStats(statsRes.data);
      
      // Handle Enhanced API Response Format
      if (membersRes.data.members) {
        // New enhanced API response
        setMembers(membersRes.data.members);
      } else {
        // Legacy API response - fallback
        setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(t('common.loadError', 'Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  };

  // Handler für Member bearbeiten
  const handleEditMember = (member) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  // Handler für Modal schließen
  const handleModalClose = () => {
    setShowMemberModal(false);
    setSelectedMember(null);
  };

  // Handler für Member löschen
  const handleDeleteMember = async (member) => {
    if (!window.confirm(t('members.deleteConfirmText', `Möchten Sie ${member.firstName} ${member.lastName} wirklich löschen?`))) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/members/${member.id}`);
      // Daten neu laden nach dem Löschen
      fetchData();
    } catch (error) {
      console.error('Error deleting member:', error);
      alert(t('common.deleteError', 'Fehler beim Löschen'));
    }
  };

  // Handler für Member speichern
  const handleMemberSave = () => {
    setShowMemberModal(false);
    setSelectedMember(null);
    // Daten neu laden nach dem Speichern
    fetchData();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading', 'Lädt...')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('common.error', 'Fehler')}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {t('actions.retry', 'Erneut versuchen')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          📊 <span className="ml-2">{t('dashboard.title')}</span>
        </h1>
        <p className="text-gray-600 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-700">
                {t('dashboard.stats.totalMembers')}
              </h3>
              <p className="text-3xl font-bold text-blue-600">{stats?.members || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-700">
                {t('dashboard.stats.activeMembers')}
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {stats?.activeMembers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-700">
                {t('dashboard.stats.pendingFees')}
              </h3>
              <p className="text-3xl font-bold text-orange-600">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <span className="text-2xl">📦</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-700">
                {t('dashboard.modules', 'Module')}
              </h3>
              <p className="text-3xl font-bold text-purple-600">{stats?.modules?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Optional: Zusätzliche Stats für Inaktive/Interessenten */}
      {(stats?.inactiveMembers !== undefined || stats?.interessenten !== undefined) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {stats?.inactiveMembers !== undefined && (
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <span className="text-2xl">⏸️</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-700">
                    {t('dashboard.stats.inactiveMembers', 'Inaktive Mitglieder')}
                  </h3>
                  <p className="text-3xl font-bold text-gray-600">
                    {stats?.inactiveMembers || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {stats?.interessenten !== undefined && (
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">🔍</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-700">
                    {t('dashboard.stats.prospects', 'Interessenten')}
                  </h3>
                  <p className="text-3xl font-bold text-yellow-600">
                    {stats?.interessenten || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Members */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {t('dashboard.recentMembers', 'Neueste')} {t('members.plural')}
            </h2>
          </div>
        </div>
        <div className="p-6">
          {!Array.isArray(members) || members.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-500 mb-4">{t('noMembers', 'Keine Mitglieder vorhanden')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.slice(0, 5).map(member => {
                // Verwende den berechneten Status, falls vorhanden
                const displayStatus = member.calculatedStatus || member.status || 'inactive';
                
                return (
                  <div 
                    key={member.id} 
                    className="flex justify-between items-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {member.firstName?.charAt(0) || '?'}{member.lastName?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <h4 
                          className="font-semibold hover:text-blue-600 cursor-pointer"
                          onClick={() => handleEditMember(member)}
                        >
                          {member.firstName} {member.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        displayStatus === 'active' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {displayStatus === 'active' 
                          ? t('members.status.active', 'Aktiv')
                          : t('members.status.inactive', 'Inaktiv')
                        }
                      </span>
                      <span className="text-sm text-gray-500">{member.memberNumber}</span>
                      
                      {/* Action Buttons - Same style as MembersView */}
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/members/${member.id}`;
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('actions.view')}
                        >
                          👁️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditMember(member);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title={t('actions.edit')}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMember(member);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title={t('actions.delete')}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {members.length > 5 && (
                <div className="text-center pt-4">
                  <a href="/members" className="text-blue-600 hover:text-blue-800 text-sm">
                    {t('dashboard.viewAllMembers', `Alle ${stats?.members || members.length} ${t('members.plural')} anzeigen`)}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.quickActions', 'Schnellaktionen')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/members/new"
            className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow flex items-center"
          >
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-2xl">➕</span>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-800">
                {t('members.addMember', 'Mitglied hinzufügen')}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('dashboard.addMemberDesc', 'Neues Mitglied erfassen')}
              </p>
            </div>
          </a>

          <a
            href="/accounting"
            className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow flex items-center"
          >
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">💳</span>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-800">
                {t('dashboard.accounting', 'Buchhaltung')}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('dashboard.accountingDesc', 'Finanzen verwalten')}
              </p>
            </div>
          </a>

          <a
            href="/documents"
            className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow flex items-center"
          >
            <div className="p-3 bg-purple-100 rounded-lg">
              <span className="text-2xl">📄</span>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-800">
                {t('dashboard.documents', 'Dokumente')}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('dashboard.documentsDesc', 'Dokumente erstellen')}
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Member Form Modal */}
      {showMemberModal && (
        <MemberFormModal
          isOpen={showMemberModal}
          onClose={handleModalClose}
          member={selectedMember}
          onSave={handleMemberSave}
        />
      )}
    </div>
  );
};

export default DashboardView;