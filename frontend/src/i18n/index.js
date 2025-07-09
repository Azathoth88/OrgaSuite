// frontend/src/i18n/index.js - ERWEITERT mit Beitrittsquellen und Kündigungsgründen
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Sync loading von lokalen Ressourcen ERWEITERT
const getTranslations = (orgType, language) => {
  // Fallback-Übersetzungen die immer verfügbar sind ERWEITERT
  const commonTranslations = {
    // Common (existing)
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
    'common.optional': language === 'en' ? 'optional' : 'optional',
    'common.info': language === 'en' ? 'Info' : 'Info',
    'common.deleteError': language === 'en' ? 'Error deleting' : 'Fehler beim Löschen',
    'common.pleaseSelect': language === 'en' ? 'Please select' : 'Bitte wählen',
    
    // Actions (existing)
    'actions.create': language === 'en' ? 'Create' : 'Erstellen',
    'actions.edit': language === 'en' ? 'Edit' : 'Bearbeiten',
    'actions.delete': language === 'en' ? 'Delete' : 'Löschen',
    'actions.save': language === 'en' ? 'Save' : 'Speichern',
    'actions.cancel': language === 'en' ? 'Cancel' : 'Abbrechen',
    'actions.view': language === 'en' ? 'View' : 'Anzeigen',
    'actions.retry': language === 'en' ? 'Retry' : 'Erneut versuchen',
    
    // Navigation (existing + new)
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
    'navigation.configuration': language === 'en' ? 'Configuration' : 'Konfiguration',
    'navigation.configurationDesc': language === 'en' ? 'System Settings' : 'Systemeinstellungen',
    
    // Configuration - General (existing)
    'configuration.title': language === 'en' ? 'Configuration' : 'Konfiguration',
    'configuration.subtitle': language === 'en' ? 'System settings and membership configuration management' : 'Systemeinstellungen und Mitgliedschaftskonfiguration verwalten',
    'configuration.reset': language === 'en' ? 'Reset to defaults' : 'Auf Standardwerte zurücksetzen',
    'configuration.save': language === 'en' ? 'Save' : 'Speichern',
    'configuration.saving': language === 'en' ? 'Saving...' : 'Speichere...',
    'configuration.loading': language === 'en' ? 'Loading configuration...' : 'Lade Konfiguration...',
    'configuration.loadError': language === 'en' ? 'Error loading configuration' : 'Fehler beim Laden der Konfiguration',
    'configuration.noStatuses': language === 'en' ? 'No status configured' : 'Keine Status konfiguriert',

    // ✅ NEUE RESET-FUNKTIONEN
    'configuration.reset.confirm': language === 'en' ? 
      'Do you really want to reset all settings to default values? This action cannot be undone.' : 
      'Möchten Sie wirklich alle Einstellungen auf die Standardwerte zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.',
    'configuration.reset.success': language === 'en' ? 
      'Configuration has been successfully reset to default values.' : 
      'Konfiguration wurde erfolgreich auf Standardwerte zurückgesetzt.',
    'configuration.reset.error': language === 'en' ? 
      'Error resetting configuration.' : 
      'Fehler beim Zurücksetzen der Konfiguration.',

    // Configuration Tabs (existing + new)
    'configuration.tabs.membership': language === 'en' ? 'Membership' : 'Mitgliedschaft',
    'configuration.tabs.membershipDesc': language === 'en' ? 'Status, fees and billing cycles' : 'Status, Beiträge und Abrechnungszyklen',
    'configuration.tabs.general': language === 'en' ? 'General' : 'Allgemein',
    'configuration.tabs.generalDesc': language === 'en' ? 'Basic settings' : 'Grundeinstellungen',
    // ✅ NEUER TAB
    'configuration.tabs.sourcesReasons': language === 'en' ? 'Sources & Reasons' : 'Quellen & Gründe',
    'configuration.tabs.sourcesReasonsDesc': language === 'en' ? 'Joining sources and leaving reasons' : 'Beitrittsquellen und Kündigungsgründe',

    // ✅ NEUE JOINING SOURCES (BEITRITTSQUELLEN)
    'configuration.joiningSources.title': language === 'en' ? 'Manage Joining Sources' : 'Beitrittsquellen verwalten',
    'configuration.joiningSources.add': language === 'en' ? 'Add Source' : 'Quelle hinzufügen',
    'configuration.joiningSources.key': language === 'en' ? 'Key' : 'Schlüssel',
    'configuration.joiningSources.keyPlaceholder': language === 'en' ? 'e.g. website' : 'z.B. website',
    'configuration.joiningSources.label': language === 'en' ? 'Label' : 'Bezeichnung',
    'configuration.joiningSources.labelPlaceholder': language === 'en' ? 'e.g. Internet / Website' : 'z.B. Internet / Webseite',
    'configuration.joiningSources.color': language === 'en' ? 'Color' : 'Farbe',
    'configuration.joiningSources.preview': language === 'en' ? 'Preview' : 'Vorschau',
    'configuration.joiningSources.active': language === 'en' ? 'Active' : 'Aktiv',
    'configuration.joiningSources.remove': language === 'en' ? 'Remove source' : 'Quelle entfernen',
    'configuration.joiningSources.description': language === 'en' ? 'Description' : 'Beschreibung',
    'configuration.joiningSources.descriptionPlaceholder': language === 'en' ? 'Description of the joining source (optional)' : 'Beschreibung der Beitrittsquelle (optional)',
    'configuration.joiningSources.minRequired': language === 'en' ? 'At least one joining source must exist.' : 'Mindestens eine Beitrittsquelle muss vorhanden sein.',

    // ✅ NEUE LEAVING REASONS (KÜNDIGUNGSGRÜNDE)
    'configuration.leavingReasons.title': language === 'en' ? 'Manage Leaving Reasons' : 'Kündigungsgründe verwalten',
    'configuration.leavingReasons.add': language === 'en' ? 'Add Reason' : 'Grund hinzufügen',
    'configuration.leavingReasons.key': language === 'en' ? 'Key' : 'Schlüssel',
    'configuration.leavingReasons.keyPlaceholder': language === 'en' ? 'e.g. deceased' : 'z.B. deceased',
    'configuration.leavingReasons.label': language === 'en' ? 'Label' : 'Bezeichnung',
    'configuration.leavingReasons.labelPlaceholder': language === 'en' ? 'e.g. Deceased' : 'z.B. Verstorben',
    'configuration.leavingReasons.color': language === 'en' ? 'Color' : 'Farbe',
    'configuration.leavingReasons.preview': language === 'en' ? 'Preview' : 'Vorschau',
    'configuration.leavingReasons.active': language === 'en' ? 'Active' : 'Aktiv',
    'configuration.leavingReasons.requiresDate': language === 'en' ? 'Requires date' : 'Datum erforderlich',
    'configuration.leavingReasons.remove': language === 'en' ? 'Remove reason' : 'Grund entfernen',
    'configuration.leavingReasons.description': language === 'en' ? 'Description' : 'Beschreibung',
    'configuration.leavingReasons.descriptionPlaceholder': language === 'en' ? 'Description of the leaving reason (optional)' : 'Beschreibung des Kündigungsgrunds (optional)',
    'configuration.leavingReasons.minRequired': language === 'en' ? 'At least one leaving reason must exist.' : 'Mindestens ein Kündigungsgrund muss vorhanden sein.',

    // Color Options (existing + new)
    'configuration.colors.green': language === 'en' ? 'Green' : 'Grün',
    'configuration.colors.blue': language === 'en' ? 'Blue' : 'Blau',
    'configuration.colors.yellow': language === 'en' ? 'Yellow' : 'Gelb',
    'configuration.colors.red': language === 'en' ? 'Red' : 'Rot',
    'configuration.colors.gray': language === 'en' ? 'Gray' : 'Grau',
    'configuration.colors.purple': language === 'en' ? 'Purple' : 'Lila',
    // ✅ NEUE FARBEN
    'configuration.colors.orange': language === 'en' ? 'Orange' : 'Orange',
    'configuration.colors.cyan': language === 'en' ? 'Cyan' : 'Cyan',

    // Members - Form and Validation (existing + new)
    'members.personalInfo': language === 'en' ? 'Personal Information' : 'Persönliche Informationen',
    'members.firstName': language === 'en' ? 'First Name' : 'Vorname',
    'members.lastName': language === 'en' ? 'Last Name' : 'Nachname',
    'members.address': language === 'en' ? 'Address' : 'Anschrift',
    'members.membershipData': language === 'en' ? 'Membership Data' : 'Mitgliedschaftsdaten',
    'members.membershipType': language === 'en' ? 'Membership Type' : 'Mitgliedschaftstyp',
    'members.membershipStatus': language === 'en' ? 'Membership Status' : 'Mitgliedsstatus',
    'members.paymentMethod': language === 'en' ? 'Payment Method' : 'Zahlungsweise',
    'members.bankDetails': language === 'en' ? 'Bank Details' : 'Bankverbindung',
    'members.confirmDelete': language === 'en' ? 'Delete Member?' : 'Mitglied löschen?',
    'members.memberSince': orgType === 'verein' 
      ? (language === 'en' ? 'Member since' : 'Mitglied seit')
      : (language === 'en' ? 'Customer since' : 'Kunde seit'),

    // ✅ NEUE MEMBER-FELDER
    'members.joiningSource': language === 'en' ? 'Joining Source' : 'Beitrittsquelle',
    'members.joiningSource.pleaseSelect': language === 'en' ? 'Please select...' : 'Bitte wählen...',
    'members.leavingReason': language === 'en' ? 'Leaving Reason' : 'Kündigungsgrund',
    'members.leavingReason.pleaseSelect': language === 'en' ? 'Please select...' : 'Bitte wählen...',
    'members.leavingDate': language === 'en' ? 'Leaving Date' : 'Kündigungsdatum',
    'members.leavingDateRequired': language === 'en' ? 'A date is required for this leaving reason' : 'Für diesen Kündigungsgrund ist ein Datum erforderlich',

    // Member Form Tabs (existing)
    'members.tabs.personal': language === 'en' ? 'Personal' : 'Person',
    'members.tabs.contact': language === 'en' ? 'Contact' : 'Kontakt',
    'members.tabs.address': language === 'en' ? 'Address' : 'Anschrift',
    'members.tabs.membership': language === 'en' ? 'Membership' : 'Mitgliedschaft',
    'members.tabs.bank': language === 'en' ? 'Bank Details' : 'Bankdaten',
    
    // Validation (existing + new)
    'validation.required': language === 'en' ? 'Required field' : 'Pflichtfeld',
    'validation.invalidEmail': language === 'en' ? 'Invalid email address' : 'Ungültige E-Mail-Adresse',
    'validation.invalidIban': language === 'en' ? 'Invalid IBAN' : 'Ungültige IBAN',
    'validation.invalidUrl': language === 'en' ? 'Invalid URL' : 'Ungültige URL',
    // ✅ NEUE VALIDIERUNG
    'validation.leavingDateRequired': language === 'en' ? 'Leaving date is required for this reason' : 'Kündigungsdatum ist für diesen Grund erforderlich',

    // Enhanced Configuration Info (existing + new)
    'configuration.info.title': language === 'en' ? 'Configuration Notes' : 'Hinweise zur Konfiguration',
    'configuration.info.membershipChanges': language === 'en' ? 
      'Changes to membership configuration affect all future billings' : 
      'Änderungen an der Mitgliedschaftskonfiguration wirken sich auf alle zukünftigen Abrechnungen aus',
    'configuration.info.existingBills': language === 'en' ? 
      'Already sent invoices will not be changed retroactively' : 
      'Bereits versendete Rechnungen werden nicht rückwirkend geändert',
    'configuration.info.individualOverride': language === 'en' ? 
      'Default settings can be overridden for individual members' : 
      'Die Standardeinstellungen können für einzelne Mitglieder überschrieben werden',
    'configuration.info.autoBackup': language === 'en' ? 
      'A backup of the current configuration is created automatically' : 
      'Ein Backup der aktuellen Konfiguration wird automatisch erstellt',
    // ✅ NEUE INFO
    'configuration.info.sourcesReasons': language === 'en' ?
      'Joining sources and leaving reasons help with statistical evaluation of member movements' :
      'Beitrittsquellen und Kündigungsgründe helfen bei der statistischen Auswertung der Mitgliederbewegungen',

    // Organization (existing)
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
    
    // Bank Details (existing)
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

    // Dashboard (existing)
    'dashboard.modules': language === 'en' ? 'Modules' : 'Module',
    'dashboard.recentMembers': language === 'en' ? 'Recent' : 'Neueste',
    'dashboard.viewAllMembers': language === 'en' ? 'View all' : 'Alle anzeigen',

    // Member Status (existing)
    'members.bankDetailsInfo': language === 'en' ? 'Bank details are optional and only needed for direct debit.' : 'Bankdaten sind optional und werden nur für Lastschriftverfahren benötigt.',
    'members.salutation': language === 'en' ? 'Salutation' : 'Anrede',
    'members.title': language === 'en' ? 'Title' : 'Titel',
    'members.titlePlaceholder': language === 'en' ? 'e.g. Prof. Dr. med.' : 'z.B. Prof. Dr. med.',
    'members.gender': language === 'en' ? 'Gender' : 'Geschlecht',
    'members.birthDate': language === 'en' ? 'Birth Date' : 'Geburtsdatum',
    'members.age': language === 'en' ? 'Age' : 'Alter',
    'members.years': language === 'en' ? 'years' : 'Jahre',
    'members.landline': language === 'en' ? 'Landline' : 'Festnetz',
    'members.mobile': language === 'en' ? 'Mobile' : 'Mobil',
    'members.website': language === 'en' ? 'Website' : 'Webseite',
    'members.bankName': language === 'en' ? 'Bank Name' : 'Bankbezeichnung',
    'members.sepaActive': language === 'en' ? 'SEPA Direct Debit Mandate active' : 'SEPA-Lastschriftmandat eingerichtet',
    'members.autoGenerated': language === 'en' ? 'will be generated automatically' : 'wird automatisch generiert',
    
    // Salutations
    'members.salutations.mr': language === 'en' ? 'Mr.' : 'Herr',
    'members.salutations.mrs': language === 'en' ? 'Mrs.' : 'Frau',
    'members.salutations.dr': language === 'en' ? 'Dr.' : 'Dr.',
    'members.salutations.prof': language === 'en' ? 'Prof.' : 'Prof.',
    'members.salutations.profDr': language === 'en' ? 'Prof. Dr.' : 'Prof. Dr.',
    
    // Genders
    'members.genders.notSpecified': language === 'en' ? 'Not specified' : 'Nicht angegeben',
    'members.genders.male': language === 'en' ? 'Male' : 'Männlich',
    'members.genders.female': language === 'en' ? 'Female' : 'Weiblich',
    'members.genders.diverse': language === 'en' ? 'Diverse' : 'Divers',

    // Member Status Configuration (existing)
    'configuration.status.title': language === 'en' ? 'Manage Member Status' : 'Mitgliedsstatus verwalten',
    'configuration.status.add': language === 'en' ? 'Add Status' : 'Status hinzufügen',
    'configuration.status.key': language === 'en' ? 'Key' : 'Schlüssel',
    'configuration.status.keyPlaceholder': language === 'en' ? 'e.g. active' : 'z.B. active',
    'configuration.status.label': language === 'en' ? 'Label' : 'Bezeichnung',
    'configuration.status.labelPlaceholder': language === 'en' ? 'e.g. Active' : 'z.B. Aktiv',
    'configuration.status.color': language === 'en' ? 'Color' : 'Farbe',
    'configuration.status.preview': language === 'en' ? 'Preview' : 'Vorschau',
    'configuration.status.default': language === 'en' ? 'Default' : 'Standard',
    'configuration.status.remove': language === 'en' ? 'Remove status' : 'Status entfernen',
    'configuration.status.description': language === 'en' ? 'Description' : 'Beschreibung',
    'configuration.status.descriptionPlaceholder': language === 'en' ? 'Description of the status (optional)' : 'Beschreibung des Status (optional)',
    'configuration.status.minRequired': language === 'en' ? 'At least one status must exist.' : 'Mindestens ein Status muss vorhanden sein.',

    // Billing Configuration (existing)
    'configuration.status.billingTitle': language === 'en' ? 'Fee and Billing Settings' : 'Beitrags- und Abrechnungseinstellungen',
    'configuration.status.billingActive': language === 'en' ? 'Charge fees' : 'Beiträge erheben',
    'configuration.status.billingActiveHelp': language === 'en' ? 'If disabled, no fees will be calculated' : 'Wenn deaktiviert, werden keine Beiträge berechnet',
    'configuration.status.feeAmount': language === 'en' ? 'Fee Amount' : 'Beitragshöhe',
    'configuration.status.billingFrequency': language === 'en' ? 'Billing Cycle' : 'Abrechnungsturnus',
    'configuration.status.dueDay': language === 'en' ? 'Due Day' : 'Fälligkeitstag',
    'configuration.status.previewInfo': language === 'en' ? 'Preview: Members with status' : 'Vorschau: Mitglieder mit Status',
    'configuration.status.previewPay': language === 'en' ? 'pay' : 'zahlen',
    'configuration.status.previewOn': language === 'en' ? 'on the' : 'am',
    'configuration.status.previewOfPeriod': language === 'en' ? 'of the period' : 'des Zeitraums',
    'configuration.status.noFeesInfo': language === 'en' ? 'Info: No automatic fees are charged for this status.' : 'Info: Für diesen Status werden keine automatischen Beiträge erhoben.',

    // Default Currency
    'configuration.defaultCurrency.title': language === 'en' ? 'Default Currency' : 'Standard-Währung',
    'configuration.defaultCurrency.label': language === 'en' ? 'Currency for all fees' : 'Währung für alle Beiträge',

    // Billing Configuration
    'configuration.billing.title': language === 'en' ? 'Billing Cycle' : 'Abrechnungszyklus',
    'configuration.billing.frequency': language === 'en' ? 'Billing Frequency' : 'Abrechnungsfrequenz',
    'configuration.billing.dueDay': language === 'en' ? 'Due Day' : 'Fälligkeitstag',
    'configuration.billing.dueDayHelp.monthly': language === 'en' ? 'Day of the month (1-31)' : 'Tag im Monat (1-31)',
    'configuration.billing.dueDayHelp.quarterly': language === 'en' ? 'Day in the first quarter month (1-31)' : 'Tag im ersten Quartalsmonat (1-31)',
    'configuration.billing.dueDayHelp.yearly': language === 'en' ? 'Day of the year (1-365)' : 'Tag im Jahr (1-365)',

    // Billing Frequencies
    'configuration.billing.monthly': language === 'en' ? 'Monthly' : 'Monatlich',
    'configuration.billing.monthlyDesc': language === 'en' ? 'Every month' : 'Jeden Monat',
    'configuration.billing.quarterly': language === 'en' ? 'Quarterly' : 'Quartalsweise',
    'configuration.billing.quarterlyDesc': language === 'en' ? 'Every 3 months' : 'Alle 3 Monate',
    'configuration.billing.yearly': language === 'en' ? 'Yearly' : 'Jährlich',
    'configuration.billing.yearlyDesc': language === 'en' ? 'Once per year' : 'Einmal pro Jahr',
    'configuration.billing.custom': language === 'en' ? 'Custom' : 'Benutzerdefiniert',
    'configuration.billing.customDesc': language === 'en' ? 'Individual period' : 'Individueller Zeitraum',

    // General Settings (existing)
    'configuration.general.title': language === 'en' ? 'Basic Settings' : 'Grundeinstellungen',
    'configuration.general.dateFormat': language === 'en' ? 'Date Format' : 'Datumsformat',
    'configuration.general.timeZone': language === 'en' ? 'Time Zone' : 'Zeitzone',
    'configuration.general.preview': language === 'en' ? 'Configuration Preview' : 'Konfigurationsvorschau',
    'configuration.timezone.berlin': language === 'en' ? 'Europe/Berlin (CEST)' : 'Europa/Berlin (MESZ)',
    'configuration.timezone.vienna': language === 'en' ? 'Europe/Vienna (CEST)' : 'Europa/Wien (MESZ)',
    'configuration.timezone.zurich': language === 'en' ? 'Europe/Zurich (CEST)' : 'Europa/Zürich (MESZ)',
    'configuration.timezone.utc': language === 'en' ? 'UTC (Coordinated Universal Time)' : 'UTC (koordinierte Weltzeit)',

    // Currency Options (existing)
    'configuration.currency.eur': language === 'en' ? 'Euro (€)' : 'Euro (€)',
    'configuration.currency.usd': language === 'en' ? 'US Dollar ($)' : 'US-Dollar ($)',
    'configuration.currency.chf': language === 'en' ? 'Swiss Franc (CHF)' : 'Schweizer Franken (CHF)',
    'configuration.currency.gbp': language === 'en' ? 'British Pound (£)' : 'Britisches Pfund (£)',

    // Coming Soon Messages (existing)
    'members.comingSoon': language === 'en' ? 'Member management will be available soon...' : 'Mitgliederverwaltung wird bald verfügbar sein...',
    'accounting.comingSoon': language === 'en' ? 'Accounting module will be available soon...' : 'Buchhaltungsmodul wird bald verfügbar sein...',
    'documents.comingSoon': language === 'en' ? 'Document management will be available soon...' : 'Dokumentenmanagement wird bald verfügbar sein...',
    'events.comingSoon': language === 'en' ? 'Event management will be available soon...' : 'Terminverwaltung wird bald verfügbar sein...'
  };

  // Verein Deutsch ERWEITERT
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
    'members.membershipFee': 'Mitgliedsbeitrag',
    'members.status.active': 'Aktives Mitglied',
    'members.status.inactive': 'Inaktives Mitglied',
    'members.status.suspended': 'Suspendiertes Mitglied',
    'members.addFirst': 'Erstes Mitglied hinzufügen',
    'noMembers': 'Keine Mitglieder vorhanden'
  };

  // Verein English ERWEITERT
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
    'members.membershipFee': 'Membership Fee',
    'members.status.active': 'Active Member',
    'members.status.inactive': 'Inactive Member',
    'members.status.suspended': 'Suspended Member',
    'members.addFirst': 'Add first Member',
    'noMembers': 'No members available'
  };

  // Unternehmen Deutsch ERWEITERT
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
    'members.membershipFee': 'Rechnung',
    'members.status.active': 'Aktiver Kunde',
    'members.status.inactive': 'Inaktiver Kunde',
    'members.status.suspended': 'Gesperrter Kunde',
    'members.addFirst': 'Ersten Kunden hinzufügen',
    'noMembers': 'Keine Kunden vorhanden',
    // ✅ ANGEPASSTE ÜBERSETZUNGEN FÜR UNTERNEHMEN
    'members.joiningSource': 'Akquisequelle',
    'members.leavingReason': 'Kündigungsgrund',
    'configuration.joiningSources.title': 'Akquisequellen verwalten',
    'configuration.joiningSources.labelPlaceholder': 'z.B. Online-Marketing',
    'configuration.leavingReasons.title': 'Kündigungsgründe verwalten'
  };

  // Unternehmen English ERWEITERT
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
    'members.membershipFee': 'Invoice',
    'members.status.active': 'Active Customer',
    'members.status.inactive': 'Inactive Customer',
    'members.status.suspended': 'Blocked Customer',
    'members.addFirst': 'Add first Customer',
    'noMembers': 'No customers available',
    // ✅ ANGEPASSTE ÜBERSETZUNGEN FÜR UNTERNEHMEN (ENGLISCH)
    'members.joiningSource': 'Acquisition Source',
    'members.leavingReason': 'Cancellation Reason',
    'configuration.joiningSources.title': 'Manage Acquisition Sources',
    'configuration.joiningSources.labelPlaceholder': 'e.g. Online Marketing',
    'configuration.leavingReasons.title': 'Manage Cancellation Reasons'
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
      debug: false,
      
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