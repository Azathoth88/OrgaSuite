const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { sequelize, Organization, Member } = require('./src/models');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
sequelize.authenticate()
  .then(() => {
    console.log('✅ PostgreSQL connected successfully');
    return sequelize.sync({ alter: true }); // Auto-sync models
  })
  .then(() => {
    console.log('✅ Database synchronized');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'OrgaSuite PostgreSQL API is running!',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL',
    version: '1.0.0'
  });
});

// ==================== ORGANIZATION MANAGEMENT ====================

// Get current organization (setup check)
app.get('/api/organization', async (req, res) => {
  try {
    const organization = await Organization.findOne({
      order: [['created_at', 'ASC']]
    });
    
    if (!organization) {
      return res.json({ 
        setupRequired: true,
        message: 'Organization setup required' 
      });
    }
    
    res.json(organization);
  } catch (error) {
    console.error('Organization fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Create/update organization
app.post('/api/organization', async (req, res) => {
  try {
    const { name, type, taxNumber, address, settings, bankDetails } = req.body;
    
    // Validation
    if (!name || !type) {
      return res.status(400).json({ 
        error: 'Name and type are required' 
      });
    }
    
    if (!['verein', 'unternehmen'].includes(type)) {
      return res.status(400).json({ 
        error: 'Type must be either "verein" or "unternehmen"' 
      });
    }
    
    // IBAN Basic Validation (optional)
    if (bankDetails?.iban) {
      const iban = bankDetails.iban.replace(/\s/g, '').toUpperCase();
      if (iban.length < 15 || iban.length > 34) {
        return res.status(400).json({ 
          error: 'Invalid IBAN format' 
        });
      }
      
      // Basic IBAN format check (2 letters, 2 digits, then alphanumeric)
      const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
      if (!ibanRegex.test(iban)) {
        return res.status(400).json({ 
          error: 'Invalid IBAN format' 
        });
      }
    }
    
    // Check if organization exists
    let organization = await Organization.findOne();
    
    if (organization) {
      // Update existing
      await organization.update({
        name,
        type,
        taxNumber,
        address,
        bankDetails, // Bank details support
        settings: settings || organization.settings
      });
      
      console.log(`✅ Organization updated: ${name} (${type})`);
    } else {
      // Create new
      organization = await Organization.create({
        name,
        type,
        taxNumber,
        address,
        bankDetails, // Bank details support
        settings: settings || {}
      });
      
      console.log(`✅ Organization created: ${name} (${type})`);
    }
    
    res.json({
      message: 'Organization saved successfully',
      organization
    });
  } catch (error) {
    console.error('Organization save error:', error);
    if (error.name === 'SequelizeValidationError') {
      res.status(400).json({ 
        error: 'Validation error',
        details: error.errors.map(e => e.message)
      });
    } else {
      res.status(500).json({ error: 'Failed to save organization' });
    }
  }
});

// Setup demo organization and data
app.post('/api/setup-demo', async (req, res) => {
  try {
    const { orgType = 'verein' } = req.body;
    
    // Check if organization already exists
    const existingOrg = await Organization.findOne();
    if (existingOrg) {
      return res.status(400).json({ error: 'Organization already exists' });
    }

    // Demo organization data
    const orgData = {
      verein: {
        name: 'Demo Verein e.V.',
        type: 'verein',
        taxNumber: '12345/67890',
        address: {
          street: 'Vereinsstraße 123',
          city: 'Berlin',
          zip: '10115',
          country: 'Deutschland'
        },
        bankDetails: {
          accountHolder: 'Demo Verein e.V.',
          iban: 'DE89370400440532013000',
          bic: 'COBADEFFXXX',
          bankName: 'Commerzbank AG'
        }
      },
      unternehmen: {
        name: 'Musterfirma GmbH',
        type: 'unternehmen',
        taxNumber: '98765/43210',
        address: {
          street: 'Businessstraße 456',
          city: 'München', 
          zip: '80331',
          country: 'Deutschland'
        },
        bankDetails: {
          accountHolder: 'Musterfirma GmbH',
          iban: 'DE12500105170648489890',
          bic: 'INGDDEFFXXX',
          bankName: 'ING-DiBa AG'
        }
      }
    };

    // Create organization
    const org = await Organization.create(orgData[orgType]);

    // Create demo members
    const memberData = {
      verein: [
        {
          firstName: 'Hans',
          lastName: 'Müller',
          email: 'hans.mueller@verein.de',
          passwordHash: 'member123',
          memberNumber: 'M001',
          organizationId: org.id,
          status: 'active'
        },
        {
          firstName: 'Anna',
          lastName: 'Schmidt',
          email: 'anna.schmidt@verein.de',
          passwordHash: 'member123',
          memberNumber: 'M002',
          organizationId: org.id,
          status: 'active'
        },
        {
          firstName: 'Peter',
          lastName: 'Weber',
          email: 'peter.weber@verein.de',
          passwordHash: 'member123',
          memberNumber: 'M003',
          organizationId: org.id,
          status: 'inactive'
        }
      ],
      unternehmen: [
        {
          firstName: 'Max',
          lastName: 'Mustermann',
          email: 'max.mustermann@kunde.de',
          passwordHash: 'customer123',
          memberNumber: 'K001',
          organizationId: org.id,
          status: 'active'
        },
        {
          firstName: 'Lisa',
          lastName: 'Weber',
          email: 'lisa.weber@kunde.de',
          passwordHash: 'customer123',
          memberNumber: 'K002',
          organizationId: org.id,
          status: 'active'
        },
        {
          firstName: 'Thomas',
          lastName: 'Meyer',
          email: 'thomas.meyer@kunde.de',
          passwordHash: 'customer123',
          memberNumber: 'K003',
          organizationId: org.id,
          status: 'suspended'
        }
      ]
    };

    await Member.bulkCreate(memberData[orgType]);

    console.log(`✅ Demo ${orgType} created with ${memberData[orgType].length} members`);

    res.json({ 
      message: 'Demo organization created successfully',
      organization: org,
      membersCreated: memberData[orgType].length
    });
  } catch (error) {
    console.error('Demo setup error:', error);
    res.status(500).json({ 
      error: 'Failed to setup demo',
      details: error.message 
    });
  }
});

// ==================== DASHBOARD STATS ====================
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [memberCount, organization] = await Promise.all([
      Member.count(),
      Organization.findOne()
    ]);
    
    res.json({
      members: memberCount,
      organization: organization ? {
        name: organization.name,
        type: organization.type
      } : null,
      transactions: 0, // Will be implemented later
      accounts: 0,     // Will be implemented later
      modules: ['Dashboard', 'Mitgliederverwaltung', 'Buchhaltung', 'Dokumente', 'Termine']
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      details: error.message 
    });
  }
});

// ==================== MEMBERS CRUD ====================

// Get all members
app.get('/api/members', async (req, res) => {
  try {
    const members = await Member.findAll({
      include: [{ model: Organization }],
      order: [['created_at', 'DESC']]
    });
    res.json(members);
  } catch (error) {
    console.error('Members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Get single member
app.get('/api/members/:id', async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id, {
      include: [{ model: Organization }]
    });
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    res.json(member);
  } catch (error) {
    console.error('Member fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// Create new member
app.post('/api/members', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, memberNumber, status = 'active' } = req.body;
    
    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        error: 'First name, last name, and email are required' 
      });
    }
    
    // Get the current organization
    const organization = await Organization.findOne();
    if (!organization) {
      return res.status(400).json({ error: 'No organization configured' });
    }
    
    // Generate member number if not provided
    let generatedMemberNumber = memberNumber;
    if (!generatedMemberNumber) {
      const prefix = organization.type === 'verein' ? 'M' : 'K';
      const lastMember = await Member.findOne({
        where: { organizationId: organization.id },
        order: [['created_at', 'DESC']]
      });
      
      let nextNumber = 1;
      if (lastMember && lastMember.memberNumber) {
        const match = lastMember.memberNumber.match(/\d+$/);
        if (match) {
          nextNumber = parseInt(match[0]) + 1;
        }
      }
      
      generatedMemberNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    }
    
    const member = await Member.create({
      firstName,
      lastName,
      email,
      phone,
      memberNumber: generatedMemberNumber,
      passwordHash: 'temp_password', // In production: hash properly
      organizationId: organization.id,
      status
    });
    
    // Fetch created member with organization
    const createdMember = await Member.findByPk(member.id, {
      include: [{ model: Organization }]
    });
    
    console.log(`✅ Member created: ${firstName} ${lastName} (${generatedMemberNumber})`);
    
    res.status(201).json(createdMember);
  } catch (error) {
    console.error('Create member error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Email or member number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create member' });
    }
  }
});

// Update member
app.put('/api/members/:id', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, memberNumber, status } = req.body;
    
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    await member.update({
      firstName,
      lastName,
      email,
      phone,
      memberNumber,
      status
    });
    
    // Fetch updated member with organization
    const updatedMember = await Member.findByPk(member.id, {
      include: [{ model: Organization }]
    });
    
    console.log(`✅ Member updated: ${firstName} ${lastName}`);
    
    res.json(updatedMember);
  } catch (error) {
    console.error('Update member error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Email or member number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update member' });
    }
  }
});

// Delete member
app.delete('/api/members/:id', async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const memberInfo = `${member.firstName} ${member.lastName}`;
    await member.destroy();
    
    console.log(`✅ Member deleted: ${memberInfo}`);
    
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// ==================== UTILITY ENDPOINTS ====================

// Get organization types
app.get('/api/organization-types', (req, res) => {
  res.json([
    {
      value: 'verein',
      label: 'Verein',
      icon: '🏛️',
      description: 'Klassische Vereinsverwaltung mit Mitgliedern'
    },
    {
      value: 'unternehmen',
      label: 'Unternehmen',
      icon: '🏢',
      description: 'Professionelle Kundenverwaltung'
    }
  ]);
});

// Clear all data (development only)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/dev/reset', async (req, res) => {
    try {
      await Member.destroy({ where: {} });
      await Organization.destroy({ where: {} });
      
      console.log('🧹 Database reset completed');
      
      res.json({ message: 'Database reset successfully' });
    } catch (error) {
      console.error('Reset error:', error);
      res.status(500).json({ error: 'Failed to reset database' });
    }
  });
}

// ==================== ERROR HANDLERS ====================

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// ==================== SERVER STARTUP ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🏢 ====================================');
  console.log('🚀 OrgaSuite Backend Server Started');
  console.log('🏢 ====================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🗄️ pgAdmin: http://localhost:8080`);
  console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
  console.log('');
  console.log('Available endpoints:');
  console.log('📋 GET  /api/health - Health check');
  console.log('🏢 GET  /api/organization - Get organization');
  console.log('🏢 POST /api/organization - Create/update organization');
  console.log('🎮 POST /api/setup-demo - Setup demo data');
  console.log('📊 GET  /api/dashboard/stats - Dashboard statistics');
  console.log('👥 GET  /api/members - Get all members');
  console.log('👤 GET  /api/members/:id - Get single member');
  console.log('👤 POST /api/members - Create member');
  console.log('👤 PUT  /api/members/:id - Update member');
  console.log('👤 DELETE /api/members/:id - Delete member');
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 POST /api/dev/reset - Reset database (dev only)');
  }
  console.log('🏢 ====================================');
  console.log('');
});