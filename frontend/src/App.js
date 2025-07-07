import React, { useState, useContext } from 'react';
import { OrganizationProvider, OrganizationContext } from './contexts/OrganizationContext';
import { useOrgTranslation } from './hooks/useOrgTranslation';
import LanguageSwitcher from './components/LanguageSwitcher';
import Sidebar from './components/Sidebar';
import DashboardView from './components/views/DashboardView';
import OrganizationView from './components/views/OrganizationView';
import MembersView from './components/views/MembersView'; // ✅ Import der neuen MembersView
import OrganizationSetup from './components/OrganizationSetup';
import './i18n'; // Initialize i18n

function AppContent() {
  const { organization, loading: orgLoading, setupRequired } = useContext(OrganizationContext);
  const { t, ready } = useOrgTranslation();
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Show loading while organization or i18n is loading
  if (orgLoading || !ready) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">
            {ready ? t('common.loading', 'Lädt...') : 'OrgaSuite wird initialisiert...'}
          </p>
        </div>
      </div>
    );
  }

  // Show setup if required
  if (setupRequired || !organization) {
    return <OrganizationSetup />;
  }

  // Render different views based on activeView
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'organization':
        return <OrganizationView />;
      case 'members':
        return <MembersView />; // ✅ Neue MembersView anstatt Platzhalter
      case 'accounting':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold">💰 {t('navigation.accounting', 'Buchhaltung')}</h1>
            <p className="text-gray-600 mt-2">
              {t('accounting.comingSoon', 'Buchhaltungsmodul wird bald verfügbar sein...')}
            </p>
          </div>
        );
      case 'documents':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold">📄 {t('navigation.documents', 'Dokumente')}</h1>
            <p className="text-gray-600 mt-2">
              {t('documents.comingSoon', 'Dokumentenmanagement wird bald verfügbar sein...')}
            </p>
          </div>
        );
      case 'events':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold">📅 {t('navigation.events', 'Termine')}</h1>
            <p className="text-gray-600 mt-2">
              {t('events.comingSoon', 'Terminverwaltung wird bald verfügbar sein...')}
            </p>
          </div>
        );
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar 
        activeView={activeView}
        setActiveView={setActiveView}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-blue-600 text-white shadow-lg">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold">🏢 OrgaSuite</h1>
                <p className="text-blue-100 text-sm truncate">{organization.name}</p>
              </div>
              <div className="flex items-center space-x-4 flex-shrink-0">
                <span className="text-blue-100 text-sm">
                  {organization.type === 'verein' ? '🏛️ Verein' : '🏢 Unternehmen'}
                </span>
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <OrganizationProvider>
      <AppContent />
    </OrganizationProvider>
  );
}

export default App;