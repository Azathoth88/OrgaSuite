// backend/src/configuration/configuration.js - ERWEITERT um Custom Fields und Groups
const express = require('express');

// Router erstellen
const router = express.Router();

/**
 * Validate groups configuration
 * @param {object} groups - Groups configuration
 * @returns {object} - Validation result
 */
function validateGroups(groups, groupSettings) {
  const errors = [];
  
  if (!groups || !Array.isArray(groups)) {
    return { isValid: true, errors: [] }; // Groups are optional
  }
  
  groups.forEach((group, index) => {
    if (!group.key || typeof group.key !== 'string') {
      errors.push(`Group ${index + 1}: key is required and must be a string`);
    }
    
    // Validate key format
    if (group.key && !/^[a-z0-9_]+$/.test(group.key)) {
      errors.push(`Group ${index + 1}: key must contain only lowercase letters, numbers, and underscores`);
    }
    
    if (!group.label || typeof group.label !== 'string') {
      errors.push(`Group ${index + 1}: label is required and must be a string`);
    }
    
    const validColors = ['green', 'blue', 'yellow', 'red', 'gray', 'purple', 'orange', 'cyan'];
    if (group.color && !validColors.includes(group.color)) {
      errors.push(`Group ${index + 1}: color must be one of: ${validColors.join(', ')}`);
    }
    
    if (group.icon && typeof group.icon !== 'string') {
      errors.push(`Group ${index + 1}: icon must be a string`);
    }
    
    if (group.active !== undefined && typeof group.active !== 'boolean') {
      errors.push(`Group ${index + 1}: active must be a boolean`);
    }
  });
  
  // Check for duplicate keys
  const groupKeys = groups.map(g => g.key);
  const uniqueGroupKeys = [...new Set(groupKeys)];
  if (groupKeys.length !== uniqueGroupKeys.length) {
    errors.push('Group keys must be unique');
  }
  
  // Validate groupSettings if present
  if (groupSettings) {
    if (groupSettings.allowMultiple !== undefined && typeof groupSettings.allowMultiple !== 'boolean') {
      errors.push('groupSettings.allowMultiple must be a boolean');
    }
    
    if (groupSettings.requiredOnJoin !== undefined && typeof groupSettings.requiredOnJoin !== 'boolean') {
      errors.push('groupSettings.requiredOnJoin must be a boolean');
    }
    
    if (groupSettings.showInReports !== undefined && typeof groupSettings.showInReports !== 'boolean') {
      errors.push('groupSettings.showInReports must be a boolean');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate custom fields configuration
 * @param {object} customFields - Custom fields configuration
 * @returns {object} - Validation result
 */
function validateCustomFields(customFields) {
  const errors = [];
  
  if (!customFields || !Array.isArray(customFields.tabs)) {
    return { isValid: true, errors: [] }; // Custom fields are optional
  }
  
  customFields.tabs.forEach((tab, tabIndex) => {
    if (!tab.key || typeof tab.key !== 'string') {
      errors.push(`Custom tab ${tabIndex + 1}: key is required and must be a string`);
    }
    
    if (!tab.label || typeof tab.label !== 'string') {
      errors.push(`Custom tab ${tabIndex + 1}: label is required and must be a string`);
    }
    
    if (!tab.fields || !Array.isArray(tab.fields)) {
      errors.push(`Custom tab ${tabIndex + 1}: fields array is required`);
      return;
    }
    
    tab.fields.forEach((field, fieldIndex) => {
      const fieldPath = `Tab "${tab.label}", Field ${fieldIndex + 1}`;
      
      if (!field.key || typeof field.key !== 'string') {
        errors.push(`${fieldPath}: key is required and must be a string`);
      }
      
      if (!field.label || typeof field.label !== 'string') {
        errors.push(`${fieldPath}: label is required and must be a string`);
      }
      
      const validTypes = ['text', 'textarea', 'checkbox', 'select', 'multiselect', 'multi-entry', 'multi-entry-date', 'number', 'date'];
      if (!validTypes.includes(field.type)) {
        errors.push(`${fieldPath}: type must be one of: ${validTypes.join(', ')}`);
      }
      
      // Validate type-specific properties
      if (['select', 'multiselect'].includes(field.type)) {
        if (!field.options || !Array.isArray(field.options) || field.options.length === 0) {
          errors.push(`${fieldPath}: options array is required for ${field.type} fields`);
        } else {
          field.options.forEach((option, optIndex) => {
            if (!option.value || !option.label) {
              errors.push(`${fieldPath}, Option ${optIndex + 1}: value and label are required`);
            }
          });
        }
      }
      
      if (field.type === 'multi-entry') {
        if (!field.entryConfig || !field.entryConfig.baseOptions || !Array.isArray(field.entryConfig.baseOptions)) {
          errors.push(`${fieldPath}: multi-entry fields require entryConfig.baseOptions array`);
        }
        
        if (!field.entryConfig.remarkLabel) {
          errors.push(`${fieldPath}: multi-entry fields require entryConfig.remarkLabel`);
        }
      }
      
      if (field.type === 'multi-entry-date') {
        if (!field.entryConfig) {
          errors.push(`${fieldPath}: multi-entry-date fields require entryConfig object`);
        } else {
          if (!field.entryConfig.remarkLabel) {
            errors.push(`${fieldPath}: multi-entry-date fields require entryConfig.remarkLabel`);
          }
        }
      }

      if (typeof field.position !== 'number' || field.position < 0) {
        errors.push(`${fieldPath}: position must be a non-negative number`);
      }
    });
    
    // Check for duplicate field keys within tab
    const fieldKeys = tab.fields.map(f => f.key);
    const uniqueFieldKeys = [...new Set(fieldKeys)];
    if (fieldKeys.length !== uniqueFieldKeys.length) {
      errors.push(`Tab "${tab.label}": field keys must be unique within tab`);
    }
  });
  
  // Check for duplicate tab keys
  const tabKeys = customFields.tabs.map(t => t.key);
  const uniqueTabKeys = [...new Set(tabKeys)];
  if (tabKeys.length !== uniqueTabKeys.length) {
    errors.push('Custom tab keys must be unique');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Enhanced membership config validation including custom fields and groups
 */
function validateMembershipConfig(config) {
  const errors = [];
  
  if (!config.membershipConfig) {
    errors.push('membershipConfig is required');
    return { isValid: false, errors };
  }
  
  const { statuses, defaultCurrency, joiningSources, leavingReasons, customFields, groups, groupSettings } = config.membershipConfig;
  
  // Existing validation (statuses, sources, reasons)
  if (!Array.isArray(statuses) || statuses.length === 0) {
    errors.push('At least one membership status is required');
  } else {
    // Status-specific validation
    statuses.forEach((status, index) => {
      if (!status.key || typeof status.key !== 'string') {
        errors.push(`Status ${index + 1}: key is required and must be a string`);
      }
      
      if (!status.label || typeof status.label !== 'string') {
        errors.push(`Status ${index + 1}: label is required and must be a string`);
      }
      
      if (!status.color || typeof status.color !== 'string') {
        errors.push(`Status ${index + 1}: color is required and must be a string`);
      }
      
      // Validate billing configuration if present
      if (status.billing) {
        const { fee, frequency, dueDay, active } = status.billing;
        
        if (typeof active !== 'boolean') {
          errors.push(`Status ${index + 1}: billing.active must be a boolean`);
        }
        
        if (active) {
          if (typeof fee !== 'number' || fee < 0) {
            errors.push(`Status ${index + 1}: billing.fee must be a non-negative number when billing is active`);
          }
          
          if (!['monthly', 'quarterly', 'yearly', 'custom'].includes(frequency)) {
            errors.push(`Status ${index + 1}: billing.frequency must be one of: monthly, quarterly, yearly, custom`);
          }
          
          if (typeof dueDay !== 'number' || dueDay < 1 || dueDay > 31) {
            errors.push(`Status ${index + 1}: billing.dueDay must be a number between 1 and 31`);
          }
        }
      }
    });
    
    // Check exactly one default status exists
    const defaultStatuses = statuses.filter(s => s.default === true);
    if (defaultStatuses.length === 0) {
      errors.push('Exactly one status must be marked as default');
    } else if (defaultStatuses.length > 1) {
      errors.push('Only one status can be marked as default');
    }
    
    // Check for duplicate keys
    const keys = statuses.map(s => s.key);
    const uniqueKeys = [...new Set(keys)];
    if (keys.length !== uniqueKeys.length) {
      errors.push('Status keys must be unique');
    }
  }
  
  // Existing joining sources validation
  if (joiningSources && Array.isArray(joiningSources)) {
    joiningSources.forEach((source, index) => {
      if (!source.key || typeof source.key !== 'string') {
        errors.push(`Joining source ${index + 1}: key is required and must be a string`);
      }
      
      if (!source.label || typeof source.label !== 'string') {
        errors.push(`Joining source ${index + 1}: label is required and must be a string`);
      }
    });
    
    const sourceKeys = joiningSources.map(s => s.key);
    const uniqueSourceKeys = [...new Set(sourceKeys)];
    if (sourceKeys.length !== uniqueSourceKeys.length) {
      errors.push('Joining source keys must be unique');
    }
  }
  
  // Existing leaving reasons validation
  if (leavingReasons && Array.isArray(leavingReasons)) {
    leavingReasons.forEach((reason, index) => {
      if (!reason.key || typeof reason.key !== 'string') {
        errors.push(`Leaving reason ${index + 1}: key is required and must be a string`);
      }
      
      if (!reason.label || typeof reason.label !== 'string') {
        errors.push(`Leaving reason ${index + 1}: label is required and must be a string`);
      }
    });
    
    const reasonKeys = leavingReasons.map(r => r.key);
    const uniqueReasonKeys = [...new Set(reasonKeys)];
    if (reasonKeys.length !== uniqueReasonKeys.length) {
      errors.push('Leaving reason keys must be unique');
    }
  }
  
  // Validate currency
  if (!['EUR', 'USD', 'CHF', 'GBP'].includes(defaultCurrency)) {
    errors.push('defaultCurrency must be one of: EUR, USD, CHF, GBP');
  }
  
  // Validate custom fields
  const customFieldsValidation = validateCustomFields(customFields);
  if (!customFieldsValidation.isValid) {
    errors.push(...customFieldsValidation.errors);
  }
  
  // Validate groups
  const groupsValidation = validateGroups(groups, groupSettings);
  if (!groupsValidation.isValid) {
    errors.push(...groupsValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate default configuration with custom fields and groups for breeding club
 */
function getDefaultMembershipConfig(orgType = 'verein') {
  const baseConfig = {
    statuses: [
      { 
        key: 'active', 
        label: orgType === 'verein' ? 'Aktives Mitglied' : 'Aktiver Kunde', 
        color: 'green', 
        default: true,
        description: orgType === 'verein' 
          ? 'Vollwertige Mitgliedschaft mit allen Rechten' 
          : 'Aktiver Kunde mit vollem Zugang',
        billing: {
          fee: orgType === 'verein' ? 50.00 : 120.00,
          frequency: orgType === 'verein' ? 'yearly' : 'monthly',
          dueDay: 1,
          active: true
        }
      },
      { 
        key: 'inactive', 
        label: orgType === 'verein' ? 'Inaktives Mitglied' : 'Inaktiver Kunde',
        color: 'gray',
        description: orgType === 'verein' 
          ? 'Mitgliedschaft ruht temporär' 
          : 'Kunde pausiert temporär',
        billing: { fee: 0.00, frequency: 'yearly', dueDay: 1, active: false }
      },
      { 
        key: 'suspended', 
        label: orgType === 'verein' ? 'Gesperrtes Mitglied' : 'Gesperrter Kunde',
        color: 'red',
        description: orgType === 'verein' 
          ? 'Mitgliedschaft ist gesperrt' 
          : 'Kunde ist gesperrt',
        billing: { fee: 0.00, frequency: 'yearly', dueDay: 1, active: false }
      }
    ],
    joiningSources: [
      { key: 'website', label: 'Internet / Webseite', color: 'blue', description: 'Anmeldung über die Vereinswebseite', active: true },
      { key: 'social_media', label: 'Social Media', color: 'purple', description: 'Gefunden über soziale Medien', active: true },
      { key: 'advertising', label: 'Werbung Geflügelzeitung', color: 'yellow', description: 'Durch Werbeanzeige in Fachzeitschrift', active: true },
      { key: 'recommendation', label: 'Empfehlung SV-Mitglied', color: 'green', description: 'Weiterempfehlung durch bestehendes Mitglied', active: true },
      { key: 'event', label: 'Veranstaltung / Ausstellung', color: 'orange', description: 'Kennengelernt auf Vereinsveranstaltung', active: true },
      { key: 'other', label: 'Sonstiges', color: 'gray', description: 'Andere Beitrittsquelle', active: true }
    ],
    leavingReasons: [
      { key: 'voluntary_resignation', label: 'Freiwillige Kündigung', color: 'blue', description: 'Mitglied hat selbst gekündigt', requiresDate: true, active: true },
      { key: 'stopped_breeding', label: 'Zuchtaufgabe', color: 'orange', description: 'Aufgabe der Geflügelzucht', requiresDate: true, active: true },
      { key: 'deceased', label: 'Verstorben', color: 'gray', description: 'Mitglied ist verstorben', requiresDate: true, active: true },
      { key: 'expelled', label: 'Kündigung durch Verein', color: 'red', description: 'Ausschluss durch Vereinsvorstand', requiresDate: true, active: true },
      { key: 'no_reason', label: 'Keine Angabe', color: 'gray', description: 'Grund nicht bekannt', requiresDate: false, active: true }
    ],
    defaultCurrency: 'EUR'
  };

  // Add groups based on organization type
  if (orgType === 'verein') {
    baseConfig.groups = [
      {
        key: 'vorstand',
        label: 'Vorstand',
        description: 'Mitglieder des Vereinsvorstands',
        color: 'purple',
        icon: '👔',
        active: true
      },
      {
        key: 'zuchtausschuss',
        label: 'Zuchtausschuss',
        description: 'Mitglieder des Zuchtausschusses',
        color: 'blue',
        icon: '🔬',
        active: true
      },
      {
        key: 'preisrichter',
        label: 'Preisrichter',
        description: 'Qualifizierte Preisrichter für Ausstellungen',
        color: 'orange',
        icon: '⚖️',
        active: true
      },
      {
        key: 'jugend',
        label: 'Jugendgruppe',
        description: 'Jugendliche Mitglieder unter 18 Jahren',
        color: 'green',
        icon: '🌱',
        active: true
      },
      {
        key: 'ehrenmitglied',
        label: 'Ehrenmitglied',
        description: 'Ehrenmitglieder des Vereins',
        color: 'yellow',
        icon: '🏆',
        active: true
      }
    ];
    
    baseConfig.groupSettings = {
      allowMultiple: true,
      requiredOnJoin: false,
      showInReports: true
    };
  } else {
    // For companies, different groups
    baseConfig.groups = [
      {
        key: 'premium',
        label: 'Premium Kunden',
        description: 'Kunden mit Premium-Status',
        color: 'yellow',
        icon: '⭐',
        active: true
      },
      {
        key: 'partner',
        label: 'Geschäftspartner',
        description: 'Strategische Geschäftspartner',
        color: 'blue',
        icon: '🤝',
        active: true
      },
      {
        key: 'reseller',
        label: 'Wiederverkäufer',
        description: 'Autorisierte Wiederverkäufer',
        color: 'green',
        icon: '🏪',
        active: true
      }
    ];
    
    baseConfig.groupSettings = {
      allowMultiple: false,
      requiredOnJoin: false,
      showInReports: true
    };
  }

  // Add custom fields based on organization type
  if (orgType === 'verein') {
    baseConfig.customFields = {
      tabs: [
        {
          key: 'breeding_data',
          label: 'Zuchtdaten',
          icon: '🐓',
          description: 'Informationen zu gezüchteten Rassen und Zuchtaktivitäten',
          position: 1,
          active: true,
          fields: [
            {
              key: 'breeding_species',
              label: 'Gezüchtete Rassen',
              type: 'multi-entry',
              position: 1,
              required: false,
              description: 'Welche Rassen züchten Sie? Fügen Sie Bemerkungen hinzu.',
              entryConfig: {
                baseOptions: [
                  { value: 'huhn', label: 'Huhn' },
                  { value: 'ente', label: 'Ente' },
                  { value: 'gans', label: 'Gans' },
                  { value: 'truthahn', label: 'Truthahn' },
                  { value: 'perlhuhn', label: 'Perlhuhn' },
                  { value: 'fasan', label: 'Fasan' },
                  { value: 'wachtel', label: 'Wachtel' },
                  { value: 'taube', label: 'Taube' }
                ],
                remarkLabel: 'Bemerkung/Rasse Details',
                allowMultiple: true,
                addButtonText: 'Weitere Rasse hinzufügen'
              }
            },
            {
              key: 'breeding_experience',
              label: 'Zuchterfahrung (Jahre)',
              type: 'number',
              position: 2,
              required: false,
              description: 'Wie viele Jahre Zuchterfahrung haben Sie?',
              min: 0,
              max: 80
            },
            {
              key: 'exhibition_participation',
              label: 'Ausstellungsteilnahme',
              type: 'checkbox',
              position: 3,
              required: false,
              description: 'Nehmen Sie regelmäßig an Geflügelausstellungen teil?'
            },
            {
              key: 'breeding_goals',
              label: 'Zuchtziele',
              type: 'textarea',
              position: 4,
              required: false,
              description: 'Beschreiben Sie Ihre Zuchtziele und besonderen Interessen',
              rows: 3
            },
            {
              key: 'facility_type',
              label: 'Art der Haltung',
              type: 'select',
              position: 5,
              required: false,
              description: 'Wie halten Sie Ihr Geflügel?',
              options: [
                { value: 'freiland', label: 'Freilandhaltung' },
                { value: 'voliere', label: 'Volierenhaltung' },
                { value: 'stall', label: 'Stallhaltung' },
                { value: 'gemischt', label: 'Gemischte Haltung' }
              ]
            }
          ]
        },
        {
          key: 'contact_preferences',
          label: 'Kommunikation',
          icon: '📧',
          description: 'Einstellungen für Kommunikation und Newsletter',
          position: 2,
          active: true,
          fields: [
            {
              key: 'newsletter_subscription',
              label: 'Newsletter abonnieren',
              type: 'checkbox',
              position: 1,
              required: false,
              description: 'Möchten Sie unseren monatlichen Newsletter erhalten?'
            },
            {
              key: 'communication_channels',
              label: 'Bevorzugte Kommunikationswege',
              type: 'multiselect',
              position: 2,
              required: false,
              description: 'Wie möchten Sie kontaktiert werden?',
              options: [
                { value: 'email', label: 'E-Mail' },
                { value: 'phone', label: 'Telefon' },
                { value: 'letter', label: 'Brief' },
                { value: 'whatsapp', label: 'WhatsApp' }
              ]
            },
            {
              key: 'meeting_availability',
              label: 'Verfügbarkeit für Vereinstreffen',
              type: 'select',
              position: 3,
              required: false,
              description: 'Wann können Sie normalerweise an Vereinstreffen teilnehmen?',
              options: [
                { value: 'weekday_evening', label: 'Wochentag abends' },
                { value: 'saturday_morning', label: 'Samstag vormittag' },
                { value: 'saturday_afternoon', label: 'Samstag nachmittag' },
                { value: 'sunday_morning', label: 'Sonntag vormittag' },
                { value: 'sunday_afternoon', label: 'Sonntag nachmittag' },
                { value: 'flexible', label: 'Flexibel' }
              ]
            }
          ]
        }
      ]
    };
  } else {
    // For companies, different custom fields
    baseConfig.customFields = {
      tabs: [
        {
          key: 'business_data',
          label: 'Unternehmensdaten',
          icon: '🏢',
          description: 'Geschäftsspezifische Informationen',
          position: 1,
          active: true,
          fields: [
            {
              key: 'company_size',
              label: 'Unternehmensgröße',
              type: 'select',
              position: 1,
              required: false,
              description: 'Wie viele Mitarbeiter hat Ihr Unternehmen?',
              options: [
                { value: 'micro', label: '1-9 Mitarbeiter' },
                { value: 'small', label: '10-49 Mitarbeiter' },
                { value: 'medium', label: '50-249 Mitarbeiter' },
                { value: 'large', label: '250+ Mitarbeiter' }
              ]
            },
            {
              key: 'business_sector',
              label: 'Branche',
              type: 'multiselect',
              position: 2,
              required: false,
              description: 'In welchen Branchen sind Sie tätig?',
              options: [
                { value: 'technology', label: 'Technologie' },
                { value: 'healthcare', label: 'Gesundheitswesen' },
                { value: 'finance', label: 'Finanzwesen' },
                { value: 'education', label: 'Bildung' },
                { value: 'retail', label: 'Einzelhandel' },
                { value: 'manufacturing', label: 'Produktion' },
                { value: 'services', label: 'Dienstleistungen' }
              ]
            },
            {
              key: 'annual_revenue',
              label: 'Jahresumsatz (EUR)',
              type: 'number',
              position: 3,
              required: false,
              description: 'Geschätzter Jahresumsatz',
              min: 0
            }
          ]
        }
      ]
    };
  }

  return baseConfig;
}

// Enhanced routes with custom fields and groups support
function setupRoutes(models) {
  const { Organization, Member } = models;

  // GET /api/organization/config - Enhanced with custom fields and groups
  router.get('/', async (req, res) => {
    try {
      const organization = await Organization.findOne({
        order: [['created_at', 'ASC']]
      });
      
      if (!organization) {
        return res.status(404).json({ 
          error: 'Organization not found',
          message: 'Please set up an organization first' 
        });
      }
      
      const config = organization.settings || {};
      
      res.json({
        config,
        lastUpdated: organization.updated_at,
        organization: {
          id: organization.id,
          name: organization.name,
          type: organization.type
        },
        customFieldsInfo: {
          tabCount: config.membershipConfig?.customFields?.tabs?.length || 0,
          fieldCount: config.membershipConfig?.customFields?.tabs?.reduce((sum, tab) => sum + (tab.fields?.length || 0), 0) || 0,
          activeTabCount: config.membershipConfig?.customFields?.tabs?.filter(tab => tab.active !== false)?.length || 0
        },
        groupsInfo: {
          totalGroups: config.membershipConfig?.groups?.length || 0,
          activeGroups: config.membershipConfig?.groups?.filter(g => g.active !== false)?.length || 0,
          allowMultiple: config.membershipConfig?.groupSettings?.allowMultiple ?? true
        }
      });
    } catch (error) {
      console.error('❌ [GET_ORGANIZATION_CONFIG] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch organization configuration',
        details: error.message
      });
    }
  });

  // GET /api/organization/config/member-statuses - Get member statuses configuration
  router.get('/member-statuses', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const membershipConfig = organization.settings?.membershipConfig || {};
      const statuses = membershipConfig.statuses || [];
      
      // Add additional info for each status
      const enrichedStatuses = statuses.map(status => ({
        ...status,
        isDefault: status.default === true,
        hasActiveBilling: status.billing?.active === true,
        billingInfo: status.billing?.active ? {
          fee: status.billing.fee,
          currency: membershipConfig.defaultCurrency || 'EUR',
          frequency: status.billing.frequency,
          dueDay: status.billing.dueDay
        } : null
      }));
      
      res.json({
        statuses: enrichedStatuses,
        stats: {
          total: statuses.length,
          withBilling: statuses.filter(s => s.billing?.active).length,
          defaultStatus: statuses.find(s => s.default)?.key || null,
          availableColors: [...new Set(statuses.map(s => s.color))],
          defaultCurrency: membershipConfig.defaultCurrency || 'EUR'
        }
      });
    } catch (error) {
      console.error('❌ [GET_MEMBER_STATUSES] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch member statuses',
        details: error.message
      });
    }
  });
    
  // GET /api/organization/config/custom-fields - Get custom fields configuration
  router.get('/custom-fields', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const customFields = organization.settings?.membershipConfig?.customFields || { tabs: [] };
      const activeTabs = customFields.tabs?.filter(tab => tab.active !== false) || [];
      
      res.json({
        customFields,
        stats: {
          totalTabs: customFields.tabs?.length || 0,
          activeTabs: activeTabs.length,
          totalFields: customFields.tabs?.reduce((sum, tab) => sum + (tab.fields?.length || 0), 0) || 0,
          activeFields: activeTabs.reduce((sum, tab) => sum + (tab.fields?.length || 0), 0)
        }
      });
    } catch (error) {
      console.error('❌ [GET_CUSTOM_FIELDS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch custom fields',
        details: error.message
      });
    }
  });

  // GET /api/organization/config/groups - Get all groups
  router.get('/groups', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const groups = organization.settings?.membershipConfig?.groups || [];
      const activeGroups = groups.filter(g => g.active !== false);
      
      // Get member count for each group
      const groupStats = await Promise.all(
        activeGroups.map(async (group) => {
          const memberCount = await Member.count({ 
            where: {
              groups: {
                [models.Sequelize.Op.contains]: [group.key]
              },
              isDeleted: { [models.Sequelize.Op.ne]: true }
            }
          });
          return {
            ...group,
            memberCount
          };
        })
      );
      
      res.json({
        groups: groupStats,
        settings: organization.settings?.membershipConfig?.groupSettings || {},
        stats: {
          total: groups.length,
          active: activeGroups.length,
          totalMembers: await Member.count({ where: { isDeleted: { [models.Sequelize.Op.ne]: true } } }),
          membersWithGroups: await Member.count({ 
            where: {
              groups: { [models.Sequelize.Op.ne]: null },
              groups: { [models.Sequelize.Op.ne]: [] },
              isDeleted: { [models.Sequelize.Op.ne]: true }
            }
          })
        }
      });
    } catch (error) {
      console.error('❌ [GET_GROUPS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch groups',
        details: error.message
      });
    }
  });

  // GET /api/organization/config/groups/:groupKey/members - Get members of a specific group
  router.get('/groups/:groupKey/members', async (req, res) => {
    try {
      const { groupKey } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const members = await Member.findAll({
        where: {
          groups: {
            [models.Sequelize.Op.contains]: [groupKey]
          },
          isDeleted: { [models.Sequelize.Op.ne]: true }
        },
        attributes: ['id', 'memberNumber', 'firstName', 'lastName', 'email', 'status', 'groups'],
        limit: limit * 1,
        offset: (page - 1) * limit,
        order: [['lastName', 'ASC'], ['firstName', 'ASC']]
      });
      
      const total = await Member.count({
        where: {
          groups: {
            [models.Sequelize.Op.contains]: [groupKey]
          },
          isDeleted: { [models.Sequelize.Op.ne]: true }
        }
      });
      
      res.json({
        members,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('❌ [GET_GROUP_MEMBERS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch group members',
        details: error.message
      });
    }
  });

  // POST /api/members/:id/groups - Update member's groups
  router.post('/members/:id/groups', async (req, res) => {
    try {
      const { id } = req.params;
      const { groups } = req.body;
      
      // Validate that all groups exist
      const organization = await Organization.findOne();
      const validGroups = organization.settings?.membershipConfig?.groups
        ?.filter(g => g.active !== false)
        ?.map(g => g.key) || [];
      
      const invalidGroups = groups.filter(g => !validGroups.includes(g));
      if (invalidGroups.length > 0) {
        return res.status(400).json({
          error: 'Invalid groups',
          invalidGroups
        });
      }
      
      const member = await Member.findByPk(id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      
      await member.update({ groups });
      
      res.json({ 
        success: true,
        groups: member.groups
      });
    } catch (error) {
      console.error('❌ [UPDATE_MEMBER_GROUPS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to update member groups',
        details: error.message
      });
    }
  });

  // PUT /api/organization/config - Enhanced validation
  router.put('/', async (req, res) => {
    try {
      const { config } = req.body;
      
      if (!config) {
        return res.status(400).json({ 
          error: 'Configuration data is required' 
        });
      }
      
      // Enhanced validation with custom fields and groups
      const validation = validateMembershipConfig(config);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Configuration validation failed',
          details: validation.errors
        });
      }
      
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      // Create backup of current configuration
      const backupConfig = {
        ...organization.settings,
        _backup: {
          timestamp: new Date().toISOString(),
          previousConfig: organization.settings
        }
      };
      
      // Update configuration
      await organization.update({
        settings: {
          ...backupConfig,
          ...config,
          lastConfigUpdate: new Date().toISOString()
        }
      });
      
      console.log(`✅ Organization configuration updated for: ${organization.name}`);
      
      res.json({
        message: 'Configuration updated successfully',
        config: organization.settings,
        validation: {
          statusCount: config.membershipConfig?.statuses?.length || 0,
          billingEnabledStatuses: config.membershipConfig?.statuses?.filter(s => s.billing?.active)?.length || 0,
          joiningSourcesCount: config.membershipConfig?.joiningSources?.length || 0,
          leavingReasonsCount: config.membershipConfig?.leavingReasons?.length || 0,
          customFieldsTabCount: config.membershipConfig?.customFields?.tabs?.length || 0,
          customFieldsTotalFields: config.membershipConfig?.customFields?.tabs?.reduce((sum, tab) => sum + (tab.fields?.length || 0), 0) || 0,
          groupsCount: config.membershipConfig?.groups?.length || 0,
          activeGroupsCount: config.membershipConfig?.groups?.filter(g => g.active !== false)?.length || 0,
          defaultCurrency: config.membershipConfig?.defaultCurrency || 'EUR'
        }
      });
    } catch (error) {
      console.error('❌ [UPDATE_ORGANIZATION_CONFIG] Error:', error);
      if (error.name === 'SequelizeValidationError') {
        res.status(400).json({ 
          error: 'Validation error',
          details: error.errors.map(e => e.message)
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to update configuration',
          details: error.message
        });
      }
    }
  });

  // POST /api/organization/config/reset-defaults - Enhanced with custom fields and groups
  router.post('/reset-defaults', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const defaultConfig = {
        membershipConfig: getDefaultMembershipConfig(organization.type),
        generalConfig: {
          dateFormat: 'DD.MM.YYYY',
          timeZone: 'Europe/Berlin',
          currency: 'EUR'
        }
      };

      // Create backup before reset
      const backupConfig = {
        ...organization.settings,
        _resetBackup: {
          timestamp: new Date().toISOString(),
          previousConfig: organization.settings
        }
      };

      await organization.update({
        settings: {
          ...defaultConfig,
          _resetBackup: backupConfig._resetBackup,
          lastConfigUpdate: new Date().toISOString()
        }
      });

      console.log(`✅ Configuration reset to defaults for: ${organization.name}`);

      res.json({
        message: 'Configuration reset to defaults successfully',
        config: organization.settings,
        resetInfo: {
          statusCount: defaultConfig.membershipConfig.statuses.length,
          joiningSourcesCount: defaultConfig.membershipConfig.joiningSources.length,
          leavingReasonsCount: defaultConfig.membershipConfig.leavingReasons.length,
          customFieldsTabCount: defaultConfig.membershipConfig.customFields?.tabs?.length || 0,
          customFieldsTotalFields: defaultConfig.membershipConfig.customFields?.tabs?.reduce((sum, tab) => sum + (tab.fields?.length || 0), 0) || 0,
          groupsCount: defaultConfig.membershipConfig.groups?.length || 0,
          backupCreated: true
        }
      });
    } catch (error) {
      console.error('❌ [RESET_CONFIG_DEFAULTS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to reset configuration',
        details: error.message
      });
    }
  });

  // Enhanced validation endpoint
  router.post('/validate', async (req, res) => {
    try {
      const { config } = req.body;
      
      if (!config) {
        return res.status(400).json({ 
          error: 'Configuration data is required for validation' 
        });
      }
      
      const validation = validateMembershipConfig(config);
      
      // Calculate additional statistics including custom fields and groups
      let stats = {};
      if (validation.isValid && config.membershipConfig) {
        const { statuses, joiningSources, leavingReasons, customFields, groups } = config.membershipConfig;
        
        stats = {
          totalStatuses: statuses?.length || 0,
          billingEnabledStatuses: statuses?.filter(s => s.billing?.active).length || 0,
          defaultStatus: statuses?.find(s => s.default)?.label || 'None',
          totalJoiningSources: joiningSources?.length || 0,
          activeJoiningSources: joiningSources?.filter(s => s.active !== false).length || 0,
          totalLeavingReasons: leavingReasons?.length || 0,
          activeLeavingReasons: leavingReasons?.filter(r => r.active !== false).length || 0,
          reasonsRequiringDate: leavingReasons?.filter(r => r.requiresDate).length || 0,
          customFieldsTabCount: customFields?.tabs?.length || 0,
          customFieldsTotalFields: customFields?.tabs?.reduce((sum, tab) => sum + (tab.fields?.length || 0), 0) || 0,
          customFieldsActiveTabCount: customFields?.tabs?.filter(tab => tab.active !== false)?.length || 0,
          groupsCount: groups?.length || 0,
          activeGroupsCount: groups?.filter(g => g.active !== false)?.length || 0,
          uniqueFrequencies: [...new Set(statuses?.map(s => s.billing?.frequency).filter(Boolean))] || [],
          totalFeesIfAllActive: statuses
            ?.filter(s => s.billing?.active)
            .reduce((sum, s) => sum + (s.billing?.fee || 0), 0) || 0,
          currency: config.membershipConfig.defaultCurrency || 'EUR'
        };
      }
      
      res.json({
        ...validation,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [VALIDATE_ORGANIZATION_CONFIG] Error:', error);
      res.status(500).json({ 
        error: 'Failed to validate configuration',
        details: error.message
      });
    }
  });

  return router;
}

module.exports = {
  validateMembershipConfig,
  validateCustomFields,
  validateGroups,
  getDefaultMembershipConfig,
  setupRoutes
};