import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DashboardView = () => {
  const { t } = useOrgTranslation();
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, membersRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`),
        axios.get(`${API_URL}/members?limit=5&sortBy=created_at&sortOrder=DESC`) // Enhanced API call
      ]);
      
      setStats(statsRes.data);
      
      // ✅ Handle Enhanced API Response Format
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
                {Array.isArray(members) ? members.filter(m => m.status === 'active').length : 0}
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

      {/* Recent Members */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {t('dashboard.recentMembers', 'Neueste')} {t('members.plural')}
            </h2>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              {t('members.addMember')}
            </button>
          </div>
        </div>
        <div className="p-6">
          {!Array.isArray(members) || members.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-500 mb-4">{t('noMembers', 'Keine Mitglieder vorhanden')}</p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
                {t('members.addFirst', `Ersten ${t('members.single')} hinzufügen`)}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {members.slice(0, 5).map(member => (
                <div key={member.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {member.firstName?.charAt(0) || '?'}{member.lastName?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold">{member.firstName} {member.lastName}</h4>
                      <p className="text-sm text-gray-600">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      member.status === 'active' ? 'bg-green-100 text-green-800' :
                      member.status === 'suspended' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.status === 'active' 
                        ? t('members.status.active')
                        : member.status === 'suspended'
                        ? t('members.status.suspended')
                        : t('members.status.inactive')
                      }
                    </span>
                    <span className="text-sm text-gray-500">{member.memberNumber}</span>
                  </div>
                </div>
              ))}
              
              {members.length > 5 && (
                <div className="text-center pt-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    {t('dashboard.viewAllMembers', `Alle ${members.length} ${t('members.plural')} anzeigen`)}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;