const express = require('express');

// Router erstellen
const router = express.Router();

/**
 * Validate membership configuration
 * @param {object} config - Configuration object to validate
 * @returns {object} - Validation result with isValid and errors
 */
function validateMembershipConfig(config) {
  const errors = [];
  
  if (!config.membershipConfig) {
    errors.push('membershipConfig is required');
    return { isValid: false, errors };
  }
  
  const { statuses, defaultCurrency } = config.membershipConfig;
  
  // Validate status array
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
  
  // Validate currency
  if (!['EUR', 'USD', 'CHF', 'GBP'].includes(defaultCurrency)) {
    errors.push('defaultCurrency must be one of: EUR, USD, CHF, GBP');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Routes definieren
function setupRoutes(models) {
  const { Organization } = models;

  // GET /api/organization/config - Get organization configuration
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

  // PUT /api/organization/config - Update organization configuration
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

  // POST /api/organization/config/validate - Validate configuration without saving
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
      if (validation.isValid && config.membershipConfig?.statuses) {
        const statuses = config.membershipConfig.statuses;
        stats = {
          totalStatuses: statuses.length,
          billingEnabledStatuses: statuses.filter(s => s.billing?.active).length,
          defaultStatus: statuses.find(s => s.default)?.label || 'None',
          uniqueFrequencies: [...new Set(statuses.map(s => s.billing?.frequency).filter(Boolean))],
          totalFeesIfAllActive: statuses
            .filter(s => s.billing?.active)
            .reduce((sum, s) => sum + (s.billing?.fee || 0), 0),
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

  // GET /api/organization/member-statuses - Get available member statuses
  router.get('/member-statuses', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const statuses = organization.settings?.membershipConfig?.statuses || [];
      const defaultCurrency = organization.settings?.membershipConfig?.defaultCurrency || 'EUR';
      
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
      
      res.json({
        statuses: formattedStatuses,
        defaultCurrency,
        totalStatuses: formattedStatuses.length,
        billingEnabledCount: formattedStatuses.filter(s => s.billing.active).length
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
  setupRoutes
};