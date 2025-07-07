import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Sync loading von lokalen Ressourcen
const getTranslations = (orgType, language) => {
  // Fallback-Übersetzungen die immer verfügbar sind
  const commonTranslations = {
    // Common
    'common.loading': language === 'en' ? 'Loading...' : 'Lädt...',
    'common.error': language === 'en' ? 'Error' : 'Fehler',
    'common.success': language === 'en' ? 'Success' : 'Erfolgreich',
    'common.name': language === 'en' ? 'Name' : 'Name',
    'common.email': language === 'en' ? 'Email' : 'E-Mail',
    'common.phone': language === 'en' ? 'Phone' : 'Telefon',
    'common.status': language === 'en' ? 'Status' : 'Status',
    'common.saveSuccess': language === 'en' ? 'Successfully saved!' : 'Erfolgreich gespeichert!',
    'common.saveError': language === 'en' ? 'Error saving' : 'Fehler beim Speichern',
    'common.saving': language === 'en' ? 'Saving...' : 'Speichere...',
    'common.loadError': language === 'en' ? 'Error loading data' : 'Fehler beim Laden der Daten',
    
    // Actions
    'actions.create': language === 'en' ? 'Create' : 'Erstellen',
    'actions.edit': language === 'en' ? 'Edit' : 'Bearbeiten',
    'actions.delete': language === 'en' ? 'Delete' : 'Löschen',
    'actions.save': language === 'en' ? 'Save' : 'Speichern',
    'actions.cancel': language === 'en' ? 'Cancel' : 'Abbrechen',
    'actions.view': language === 'en' ? 'View' : 'Anzeigen',
    'actions.retry': language === 'en' ? 'Retry' : 'Erneut versuchen',
    
    // Navigation
    'navigation.menu': language === 'en' ? 'Menu' : 'Menü',
    'navigation.dashboard': language === 'en' ? 'Dashboard' : 'Dashboard',
    'navigation.dashboardDesc': language === 'en' ? 'Overview and Statistics' : 'Übersicht und Statistiken',
    'navigation.club': language === 'en' ? 'Club' : 'Verein',
    'navigation.company': language === 'en' ? 'Company' : 'Unternehmen',
    'navigation.organizationDesc': language === 'en' ? 'Name and Address' : 'Name und Anschrift',
    'navigation.membersDesc': language === 'en' ? 'Management and Lists' : 'Verwaltung und Listen',
    'navigation.accounting': language === 'en' ? 'Accounting' : 'Buchhaltung',
    'navigation.accountingDesc': language === 'en' ? 'Finance and Transactions' : 'Finanzen und Buchungen',
    'navigation.documents': language === 'en' ? 'Documents' : 'Dokumente',
    'navigation.documentsDesc': language === 'en' ? 'Files and Attachments' : 'Dateien und Anhänge',
    'navigation.events': language === 'en' ? 'Events' : 'Termine',
    'navigation.eventsDesc': language === 'en' ? 'Events and Meetings' : 'Veranstaltungen und Meetings',
    
    // Organization
    'organization.notFound': language === 'en' ? 'No organization found' : 'Keine Organisation gefunden',
    'organization.notFoundDesc': language === 'en' ? 'Please contact the administrator' : 'Bitte kontaktieren Sie den Administrator',
    'organization.clubDetails': language === 'en' ? 'Club Details' : 'Vereinsdetails',
    'organization.companyDetails': language === 'en' ? 'Company Details' : 'Unternehmensdetails',
    'organization.manageInfo': language === 'en' ? 'Manage your organization\'s basic information' : 'Verwalten Sie die Grunddaten Ihrer Organisation',
    'organization.basicInfo': language === 'en' ? 'Basic Information' : 'Grundinformationen',
    'organization.name': language === 'en' ? 'Name' : 'Name',
    'organization.namePlaceholder': language === 'en' ? 'Organization name' : 'Name der Organisation',
    'organization.type': language === 'en' ? 'Organization Type' : 'Organisationstyp',
    'organization.typeClub': language === 'en' ? 'Club' : 'Verein',
    'organization.typeCompany': language === 'en' ? 'Company' : 'Unternehmen',
    'organization.typeWarning': language === 'en' ? 'Warning: Changing the type changes all labels (Members ↔ Customers)' : 'Achtung: Änderung des Typs ändert alle Labels (Mitglieder ↔ Kunden)',
    'organization.taxNumber': language === 'en' ? 'Tax Number' : 'Steuernummer',
    'organization.noTaxNumber': language === 'en' ? 'Not specified' : 'Nicht angegeben',
    'organization.address': language === 'en' ? 'Address' : 'Anschrift',
    'organization.street': language === 'en' ? 'Street and Number' : 'Straße und Hausnummer',
    'organization.streetPlaceholder': language === 'en' ? 'e.g. Main Street 123' : 'z.B. Musterstraße 123',
    'organization.noStreet': language === 'en' ? 'Not specified' : 'Nicht angegeben',
    'organization.zip': language === 'en' ? 'ZIP' : 'PLZ',
    'organization.city': language === 'en' ? 'City' : 'Stadt',
    'organization.cityPlaceholder': language === 'en' ? 'e.g. Berlin' : 'z.B. Berlin',
    'organization.noCity': language === 'en' ? 'Not specified' : 'Nicht angegeben',
    'organization.country': language === 'en' ? 'Country' : 'Land',
    'organization.created': language === 'en' ? 'Created on' : 'Erstellt am',
    'organization.lastUpdated': language === 'en' ? 'Last updated' : 'Zuletzt aktualisiert',
    'organization.additionalInfo': language === 'en' ? 'Additional Information' : 'Zusätzliche Informationen',
    'organization.typeChangeTitle': language === 'en' ? 'Organization type will be changed' : 'Organisationstyp wird geändert',
    'organization.typeChangeDesc': language === 'en' ? 'This change will have the following effects:' : 'Diese Änderung hat folgende Auswirkungen:',
    'organization.changeToClub': language === 'en' ? 'All "Customers" will become "Members"' : 'Alle "Kunden" werden zu "Mitgliedern"',
    'organization.changeToCompany': language === 'en' ? 'All "Members" will become "Customers"' : 'Alle "Mitglieder" werden zu "Kunden"',
    'organization.changeLabels': language === 'en' ? 'Dashboard and menu labels will change automatically' : 'Dashboard und Menü-Labels ändern sich automatisch',
    'organization.changeNumbers': language === 'en' ? 'New number series (M001... or K001...)' : 'Neue Nummernkreise (M001... oder K001...)',
    

    // Bank Details (Deutsch)
    'organization.bank.title': language === 'en' ? 'Bank Details' : 'Bankverbindung',
    'organization.bank.accountHolder': language === 'en' ? 'Account Holder' : 'Kontoinhaber',
    'organization.bank.accountHolderPlaceholder': language === 'en' ? 'Name of account holder' : 'Name des Kontoinhabers',
    'organization.bank.iban': language === 'en' ? 'IBAN' : 'IBAN',
    'organization.bank.bic': language === 'en' ? 'BIC / SWIFT' : 'BIC / SWIFT',
    'organization.bank.bankName': language === 'en' ? 'Bank Name' : 'Bankname',
    'organization.bank.bankNamePlaceholder': language === 'en' ? 'e.g. Deutsche Bank AG' : 'z.B. Commerzbank AG',
    'organization.bank.notSpecified': language === 'en' ? 'Not specified' : 'Nicht angegeben',
    'organization.bank.invalidIban': language === 'en' ? 'Invalid IBAN format' : 'Ungültiges IBAN-Format',
    'organization.bank.infoTitle': language === 'en' ? 'Usage of Bank Details' : 'Verwendung der Bankdaten',
    'organization.bank.infoDesc': language === 'en' ? 'These bank details will be used for outgoing invoices, payment requests and other documents.' : 'Diese Bankverbindung wird für ausgehende Rechnungen, Zahlungsaufforderungen und andere Dokumente verwendet.',



    // Dashboard
    'dashboard.modules': language === 'en' ? 'Modules' : 'Module',
    'dashboard.recentMembers': language === 'en' ? 'Recent' : 'Neueste',
    'dashboard.viewAllMembers': language === 'en' ? 'View all' : 'Alle anzeigen',
    
    // Coming Soon Messages
    'members.comingSoon': language === 'en' ? 'Member management will be available soon...' : 'Mitgliederverwaltung wird bald verfügbar sein...',
    'accounting.comingSoon': language === 'en' ? 'Accounting module will be available soon...' : 'Buchhaltungsmodul wird bald verfügbar sein...',
    'documents.comingSoon': language === 'en' ? 'Document management will be available soon...' : 'Dokumentenmanagement wird bald verfügbar sein...',
    'events.comingSoon': language === 'en' ? 'Event management will be available soon...' : 'Terminverwaltung wird bald verfügbar sein...'
  };

  // Verein Deutsch
  const vereinDe = {
    ...commonTranslations,
    'dashboard.title': 'Vereins-Dashboard',
    'dashboard.subtitle': 'Vereinsverwaltung',
    'dashboard.stats.totalMembers': 'Mitglieder gesamt',
    'dashboard.stats.activeMembers': 'Aktive Mitglieder',
    'dashboard.stats.inactiveMembers': 'Inaktive Mitglieder',
    'dashboard.stats.pendingFees': 'Offene Beiträge',
    'dashboard.stats.totalRevenue': 'Gesamteinnahmen',
    'members.single': 'Mitglied',
    'members.plural': 'Mitglieder',
    'members.newMember': 'Neues Mitglied',
    'members.addMember': 'Mitglied hinzufügen',
    'members.editMember': 'Mitglied bearbeiten',
    'members.deleteMember': 'Mitglied löschen',
    'members.memberNumber': 'Mitgliedsnummer',
    'members.memberSince': 'Mitglied seit',
    'members.membershipFee': 'Mitgliedsbeitrag',
    'members.status.active': 'Aktives Mitglied',
    'members.status.inactive': 'Inaktives Mitglied',
    'members.status.suspended': 'Suspendiertes Mitglied',
    'members.addFirst': 'Erstes Mitglied hinzufügen',
    'noMembers': 'Keine Mitglieder vorhanden'
  };

  // Verein English
  const vereinEn = {
    ...commonTranslations,
    'dashboard.title': 'Club Dashboard',
    'dashboard.subtitle': 'Club Management',
    'dashboard.stats.totalMembers': 'Total Members',
    'dashboard.stats.activeMembers': 'Active Members',
    'dashboard.stats.inactiveMembers': 'Inactive Members',
    'dashboard.stats.pendingFees': 'Pending Fees',
    'dashboard.stats.totalRevenue': 'Total Revenue',
    'members.single': 'Member',
    'members.plural': 'Members',
    'members.newMember': 'New Member',
    'members.addMember': 'Add Member',
    'members.editMember': 'Edit Member',
    'members.deleteMember': 'Delete Member',
    'members.memberNumber': 'Member Number',
    'members.memberSince': 'Member since',
    'members.membershipFee': 'Membership Fee',
    'members.status.active': 'Active Member',
    'members.status.inactive': 'Inactive Member',
    'members.status.suspended': 'Suspended Member',
    'members.addFirst': 'Add first Member',
    'noMembers': 'No members available'
  };

  // Unternehmen Deutsch
  const unternehmenDe = {
    ...commonTranslations,
    'dashboard.title': 'Unternehmens-Dashboard',
    'dashboard.subtitle': 'Kundenmanagement',
    'dashboard.stats.totalMembers': 'Kunden gesamt',
    'dashboard.stats.activeMembers': 'Aktive Kunden',
    'dashboard.stats.inactiveMembers': 'Inaktive Kunden',
    'dashboard.stats.pendingFees': 'Offene Rechnungen',
    'dashboard.stats.totalRevenue': 'Gesamtumsatz',
    'members.single': 'Kunde',
    'members.plural': 'Kunden',
    'members.newMember': 'Neuer Kunde',
    'members.addMember': 'Kunde hinzufügen',
    'members.editMember': 'Kunde bearbeiten',
    'members.deleteMember': 'Kunde löschen',
    'members.memberNumber': 'Kundennummer',
    'members.memberSince': 'Kunde seit',
    'members.membershipFee': 'Rechnung',
    'members.status.active': 'Aktiver Kunde',
    'members.status.inactive': 'Inaktiver Kunde',
    'members.status.suspended': 'Gesperrter Kunde',
    'members.addFirst': 'Ersten Kunden hinzufügen',
    'noMembers': 'Keine Kunden vorhanden'
  };

  // Unternehmen English
  const unternehmenEn = {
    ...commonTranslations,
    'dashboard.title': 'Company Dashboard',
    'dashboard.subtitle': 'Customer Management',
    'dashboard.stats.totalMembers': 'Total Customers',
    'dashboard.stats.activeMembers': 'Active Customers',
    'dashboard.stats.inactiveMembers': 'Inactive Customers',
    'dashboard.stats.pendingFees': 'Outstanding Invoices',
    'dashboard.stats.totalRevenue': 'Total Revenue',
    'members.single': 'Customer',
    'members.plural': 'Customers',
    'members.newMember': 'New Customer',
    'members.addMember': 'Add Customer',
    'members.editMember': 'Edit Customer',
    'members.deleteMember': 'Delete Customer',
    'members.memberNumber': 'Customer Number',
    'members.memberSince': 'Customer since',
    'members.membershipFee': 'Invoice',
    'members.status.active': 'Active Customer',
    'members.status.inactive': 'Inactive Customer',
    'members.status.suspended': 'Blocked Customer',
    'members.addFirst': 'Add first Customer',
    'noMembers': 'No customers available'
  };

  // Return appropriate translations
  const key = `${orgType}_${language}`;
  
  switch (key) {
    case 'verein_de': return vereinDe;
    case 'verein_en': return vereinEn;
    case 'unternehmen_de': return unternehmenDe;
    case 'unternehmen_en': return unternehmenEn;
    default: return vereinDe; // Fallback
  }
};

// Initial orgType from localStorage or default
const getInitialOrgType = () => {
  return localStorage.getItem('orgType') || 'verein';
};

// Initialize i18next with sync resources
const initI18n = () => {
  const initialOrgType = getInitialOrgType();
  
  console.log('🌍 Initializing i18n with orgType:', initialOrgType);
  
  return i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'de',
      debug: false, // Reduced debug noise
      
      // Initial resources (sync)
      resources: {
        de: {
          translation: getTranslations(initialOrgType, 'de')
        },
        en: {
          translation: getTranslations(initialOrgType, 'en')
        }
      },
      
      interpolation: {
        escapeValue: false,
      },
      
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng'
      },
      
      react: {
        useSuspense: false
      }
    });
};

// Function to update translations when org type changes
export const updateTranslationsForOrgType = (orgType, currentLanguage = 'de') => {
  console.log('🔄 Updating translations for orgType:', orgType, 'language:', currentLanguage);
  
  // Update resources for both languages
  const deTranslations = getTranslations(orgType, 'de');
  const enTranslations = getTranslations(orgType, 'en');
  
  i18n.addResourceBundle('de', 'translation', deTranslations, true, true);
  i18n.addResourceBundle('en', 'translation', enTranslations, true, true);
  
  // Store orgType for future use
  localStorage.setItem('orgType', orgType);
  
  console.log('✅ Translations updated for:', orgType);
  
  // Force re-render by changing language (if needed)
  if (i18n.language !== currentLanguage) {
    i18n.changeLanguage(currentLanguage);
  } else {
    // Trigger re-render by emitting event
    i18n.emit('languageChanged', currentLanguage);
  }
};

// Initialize on import
initI18n();

export default i18n;