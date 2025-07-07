import React from 'react';
import { useOrgTranslation } from '../hooks/useOrgTranslation';

const Sidebar = ({ activeView, setActiveView, isCollapsed, setIsCollapsed }) => {
  const { t, organization } = useOrgTranslation();

  const menuItems = [
    {
      id: 'dashboard',
      label: t('navigation.dashboard', 'Dashboard'),
      icon: '📊',
      description: t('navigation.dashboardDesc', 'Übersicht und Statistiken')
    },
    {
      id: 'organization',
      label: organization?.type === 'verein' 
        ? t('navigation.club', 'Verein') 
        : t('navigation.company', 'Unternehmen'),
      icon: organization?.type === 'verein' ? '🏛️' : '🏢',
      description: t('navigation.organizationDesc', 'Name und Anschrift')
    },
    {
      id: 'members',
      label: t('members.plural', organization?.type === 'verein' ? 'Mitglieder' : 'Kunden'),
      icon: '👥',
      description: t('navigation.membersDesc', 'Verwaltung und Listen')
    },
    {
      id: 'accounting',
      label: t('navigation.accounting', 'Buchhaltung'),
      icon: '💰',
      description: t('navigation.accountingDesc', 'Finanzen und Buchungen')
    },
    {
      id: 'documents',
      label: t('navigation.documents', 'Dokumente'),
      icon: '📄',
      description: t('navigation.documentsDesc', 'Dateien und Anhänge')
    },
    {
      id: 'events',
      label: t('navigation.events', 'Termine'),
      icon: '📅',
      description: t('navigation.eventsDesc', 'Veranstaltungen und Meetings')
    }
  ];

  return (
    <div className={`bg-white shadow-lg transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } flex-shrink-0`}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h3 className="font-semibold text-gray-800">
                {t('navigation.menu', 'Menü')}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {organization?.name}
              </p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600"
            title={isCollapsed ? 'Menü ausklappen' : 'Menü einklappen'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="p-2 flex-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center p-3 rounded-lg transition-colors mb-1 text-left ${
              activeView === item.id
                ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={isCollapsed ? `${item.label} - ${item.description}` : undefined}
          >
            <span className="text-xl mr-3 flex-shrink-0">{item.icon}</span>
            {!isCollapsed && (
              <div className="text-left flex-1 min-w-0">
                <div className="font-medium truncate">{item.label}</div>
                <div className="text-xs text-gray-500 truncate">{item.description}</div>
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            <div>OrgaSuite v1.0</div>
            <div className="mt-1">
              {organization?.type === 'verein' ? '🏛️ Vereins-' : '🏢 Unternehmens-'}
              Version
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;