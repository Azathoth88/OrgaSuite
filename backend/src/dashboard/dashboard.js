const express = require('express');

// Router erstellen
const router = express.Router();

// Routes definieren
function setupRoutes(models) {
  const { Member, Organization } = models;

  // Dashboard stats
  router.get('/stats', async (req, res) => {
    try {
      const [memberCount, organization] = await Promise.all([
        Member.count(),
        Organization.findOne()
      ]);
      
      res.json({
        members: memberCount,
        organization: organization ? {
          name: organization.name,
          type: organization.type,
          hasBankDetails: !!(organization.bankDetails?.iban),
          hasConfiguration: !!(organization.settings?.membershipConfig)
        } : null,
        transactions: 0,
        accounts: 0,
        modules: ['Dashboard', 'Mitgliederverwaltung', 'Buchhaltung', 'Dokumente', 'Termine']
      });
    } catch (error) {
      console.error('❌ [DASHBOARD_STATS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch stats',
        details: error.message 
      });
    }
  });

  return router;
}

module.exports = {
  setupRoutes
};