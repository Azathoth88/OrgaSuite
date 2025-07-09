// backend/src/configuration/configuration.js - ERWEITERT
const express = require('express');

// Router erstellen
const router = express.Router();

/**
 * Validate membership configuration including joining sources and leaving reasons
 * @param {object} config - Configuration object to validate
 * @returns {object} - Validation result with isValid and errors
 */
function validateMembershipConfig(config) {
  const errors = [];
  
  if (!config.membershipConfig) {
    errors.push('membershipConfig is required');
    return { isValid: false, errors };
  }
  
  const { statuses, defaultCurrency, joiningSources, leavingReasons } = config.membershipConfig;
  
  // Validate status array (existing code)
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
  
  // ✅ NEW: Validate joining sources
  if (joiningSources && Array.isArray(joiningSources)) {
    joiningSources.forEach((source, index) => {
      if (!source.key || typeof source.key !== 'string') {
        errors.push(`Joining source ${index + 1}: key is required and must be a string`);
      }
      
      if (!source.label || typeof source.label !== 'string') {
        errors.push(`Joining source ${index + 1}: label is required and must be a string`);
      }
      
      if (source.color && typeof source.color !== 'string') {
        errors.push(`Joining source ${index + 1}: color must be a string if provided`);
      }
    });
    
    // Check for duplicate keys in joining sources
    const sourceKeys = joiningSources.map(s => s.key);
    const uniqueSourceKeys = [...new Set(sourceKeys)];
    if (sourceKeys.length !== uniqueSourceKeys.length) {
      errors.push('Joining source keys must be unique');
    }
  }
  
  // ✅ NEW: Validate leaving reasons
  if (leavingReasons && Array.isArray(leavingReasons)) {
    leavingReasons.forEach((reason, index) => {
      if (!reason.key || typeof reason.key !== 'string') {
        errors.push(`Leaving reason ${index + 1}: key is required and must be a string`);
      }
      
      if (!reason.label || typeof reason.label !== 'string') {
        errors.push(`Leaving reason ${index + 1}: label is required and must be a string`);
      }
      
      if (reason.color && typeof reason.color !== 'string') {
        errors.push(`Leaving reason ${index + 1}: color must be a string if provided`);
      }
      
      if (reason.requiresDate && typeof reason.requiresDate !== 'boolean') {
        errors.push(`Leaving reason ${index + 1}: requiresDate must be a boolean if provided`);
      }
    });
    
    // Check for duplicate keys in leaving reasons
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
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate default configuration with predefined sources and reasons
 */
function getDefaultMembershipConfig(orgType = 'verein') {
  return {
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
      { 
        key: 'website', 
        label: 'Internet / Webseite', 
        color: 'blue',
        description: 'Anmeldung über die Vereinswebseite',
        active: true
      },
      { 
        key: 'social_media', 
        label: 'Social Media', 
        color: 'purple',
        description: 'Gefunden über soziale Medien (Facebook, Instagram, etc.)',
        active: true
      },
      { 
        key: 'advertising', 
        label: 'Werbung Geflügelzeitung', 
        color: 'yellow',
        description: 'Durch Werbeanzeige in Fachzeitschrift',
        active: true
      },
      { 
        key: 'recommendation', 
        label: 'Empfehlung SV-Mitglied', 
        color: 'green',
        description: 'Weiterempfehlung durch bestehendes Mitglied',
        active: true
      },
      { 
        key: 'event', 
        label: 'Veranstaltung / Ausstellung', 
        color: 'orange',
        description: 'Kennengelernt auf Vereinsveranstaltung',
        active: true
      },
      { 
        key: 'personal_contact', 
        label: 'Persönlicher Kontakt', 
        color: 'cyan',
        description: 'Direkter persönlicher Kontakt',
        active: true
      },
      { 
        key: 'other', 
        label: 'Sonstiges', 
        color: 'gray',
        description: 'Andere Beitrittsquelle',
        active: true
      }
    ],
    leavingReasons: [
      { 
        key: 'voluntary_resignation', 
        label: 'Freiwillige Kündigung', 
        color: 'blue',
        description: 'Mitglied hat selbst gekündigt',
        requiresDate: true,
        active: true
      },
      { 
        key: 'stopped_breeding', 
        label: 'Zuchtaufgabe', 
        color: 'orange',
        description: 'Aufgabe der Geflügelzucht',
        requiresDate: true,
        active: true
      },
      { 
        key: 'deceased', 
        label: 'Verstorben', 
        color: 'gray',
        description: 'Mitglied ist verstorben',
        requiresDate: true,
        active: true
      },
      { 
        key: 'expelled', 
        label: 'Kündigung durch Verein', 
        color: 'red',
        description: 'Ausschluss durch Vereinsvorstand',
        requiresDate: true,
        active: true
      },
      { 
        key: 'non_payment', 
        label: 'Beitragsnichtzahlung', 
        color: 'red',
        description: 'Kündigung wegen Zahlungsverzug',
        requiresDate: true,
        active: true
      },
      { 
        key: 'relocation', 
        label: 'Umzug', 
        color: 'blue',
        description: 'Wegzug aus dem Vereinsgebiet',
        requiresDate: true,
        active: true
      },
      { 
        key: 'no_reason', 
        label: 'Keine Angabe', 
        color: 'gray',
        description: 'Grund nicht bekannt oder nicht angegeben',
        requiresDate: false,
        active: true
      }
    ],
    defaultCurrency: 'EUR'
  };
}

// Routes definieren
function setupRoutes(models) {
  const { Organization } = models;

  // GET /api/organization/config - Get organization configuration (existing, unchanged)
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
      
      // Extract configuration data
      const config = organization.settings || {};
      
      res.json({
        config,
        lastUpdated: organization.updated_at,
        organization: {
          id: organization.id,
          name: organization.name,
          type: organization.type
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

  // PUT /api/organization/config - Update organization configuration (enhanced)
  router.put('/', async (req, res) => {
    try {
      const { config } = req.body;
      
      if (!config) {
        return res.status(400).json({ 
          error: 'Configuration data is required' 
        });
      }
      
      // Validate configuration
      const validation = validateMembershipConfig(config);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Configuration validation failed',
          details: validation.errors
        });
      }
      
      // Find organization
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

  // ✅ NEW: GET /api/organization/config/joining-sources - Get joining sources
  router.get('/joining-sources', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const joiningSources = organization.settings?.membershipConfig?.joiningSources || [];
      const activeSources = joiningSources.filter(source => source.active !== false);
      
      res.json({
        joiningSources: activeSources,
        totalSources: joiningSources.length,
        activeSources: activeSources.length
      });
    } catch (error) {
      console.error('❌ [GET_JOINING_SOURCES] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch joining sources',
        details: error.message
      });
    }
  });

  // ✅ NEW: GET /api/organization/config/leaving-reasons - Get leaving reasons
  router.get('/leaving-reasons', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const leavingReasons = organization.settings?.membershipConfig?.leavingReasons || [];
      const activeReasons = leavingReasons.filter(reason => reason.active !== false);
      
      res.json({
        leavingReasons: activeReasons,
        totalReasons: leavingReasons.length,
        activeReasons: activeReasons.length
      });
    } catch (error) {
      console.error('❌ [GET_LEAVING_REASONS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch leaving reasons',
        details: error.message
      });
    }
  });

  // ✅ NEW: POST /api/organization/config/reset-defaults - Reset to default configuration
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

  // POST /api/organization/config/validate - Enhanced validation
  router.post('/validate', async (req, res) => {
    try {
      const { config } = req.body;
      
      if (!config) {
        return res.status(400).json({ 
          error: 'Configuration data is required for validation' 
        });
      }
      
      const validation = validateMembershipConfig(config);
      
      // Calculate additional statistics
      let stats = {};
      if (validation.isValid && config.membershipConfig) {
        const { statuses, joiningSources, leavingReasons } = config.membershipConfig;
        
        stats = {
          totalStatuses: statuses?.length || 0,
          billingEnabledStatuses: statuses?.filter(s => s.billing?.active).length || 0,
          defaultStatus: statuses?.find(s => s.default)?.label || 'None',
          totalJoiningSources: joiningSources?.length || 0,
          activeJoiningSources: joiningSources?.filter(s => s.active !== false).length || 0,
          totalLeavingReasons: leavingReasons?.length || 0,
          activeLeavingReasons: leavingReasons?.filter(r => r.active !== false).length || 0,
          reasonsRequiringDate: leavingReasons?.filter(r => r.requiresDate).length || 0,
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

  // GET /api/organization/member-statuses - Enhanced with sources and reasons
  router.get('/member-statuses', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const membershipConfig = organization.settings?.membershipConfig || {};
      const statuses = membershipConfig.statuses || [];
      const joiningSources = membershipConfig.joiningSources || [];
      const leavingReasons = membershipConfig.leavingReasons || [];
      const defaultCurrency = membershipConfig.defaultCurrency || 'EUR';
      
      // Format status data for frontend
      const formattedStatuses = statuses.map(status => ({
        key: status.key,
        label: status.label,
        color: status.color,
        description: status.description,
        isDefault: status.default || false,
        billing: {
          active: status.billing?.active || false,
          fee: status.billing?.fee || 0,
          frequency: status.billing?.frequency || 'yearly',
          dueDay: status.billing?.dueDay || 1,
          currency: defaultCurrency
        }
      }));

      // Format joining sources
      const formattedJoiningSources = joiningSources
        .filter(source => source.active !== false)
        .map(source => ({
          key: source.key,
          label: source.label,
          color: source.color,
          description: source.description
        }));

      // Format leaving reasons
      const formattedLeavingReasons = leavingReasons
        .filter(reason => reason.active !== false)
        .map(reason => ({
          key: reason.key,
          label: reason.label,
          color: reason.color,
          description: reason.description,
          requiresDate: reason.requiresDate || false
        }));
      
      res.json({
        statuses: formattedStatuses,
        joiningSources: formattedJoiningSources,
        leavingReasons: formattedLeavingReasons,
        defaultCurrency,
        counts: {
          totalStatuses: formattedStatuses.length,
          billingEnabledCount: formattedStatuses.filter(s => s.billing.active).length,
          joiningSourcesCount: formattedJoiningSources.length,
          leavingReasonsCount: formattedLeavingReasons.length
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

  return router;
}

module.exports = {
  validateMembershipConfig,
  getDefaultMembershipConfig,
  setupRoutes
};