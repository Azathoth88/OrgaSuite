const express = require('express');

// Router erstellen
const router = express.Router();

// Routes definieren
function setupRoutes(models) {
  const { Member, Organization } = models;

  // Dashboard stats - Alternative Implementierung
  router.get('/stats', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }

      // Alle Mitglieder abrufen und im Code filtern
      const allMembers = await Member.findAll({
        where: { organizationId: organization.id },
        attributes: ['id', 'joinedAt', 'membershipData']
      });

      // Statistiken berechnen
      let activeCount = 0;
      let inactiveCount = 0;
      let interessentenCount = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      allMembers.forEach(member => {
        if (!member.joinedAt) {
          // Kein Beitrittsdatum = Interessent
          interessentenCount++;
        } else {
          // Hat Beitrittsdatum
          const leavingDate = member.membershipData?.leavingDate;
          
          if (!leavingDate) {
            // Kein Austrittsdatum = Aktiv
            activeCount++;
          } else {
            // Austrittsdatum prüfen
            const leaving = new Date(leavingDate);
            leaving.setHours(0, 0, 0, 0);
            
            if (leaving >= today) {
              activeCount++;
            } else {
              inactiveCount++;
            }
          }
        }
      });
      
      res.json({
        members: allMembers.length,
        activeMembers: activeCount,
        inactiveMembers: inactiveCount,
        interessenten: interessentenCount,
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