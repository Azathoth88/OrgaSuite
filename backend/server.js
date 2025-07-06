const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { sequelize, Organization, Member, Account, Transaction } = require('./src/models');

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

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'OrgaSuite PostgreSQL API is running!',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL'
  });
});

// Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [memberCount, orgCount, transactionCount, accountCount] = await Promise.all([
      Member.count(),
      Organization.count(),
      Transaction.count(),
      Account.count()
    ]);
    
    res.json({
      members: memberCount,
      organizations: orgCount,
      transactions: transactionCount,
      accounts: accountCount,
      modules: ['Dashboard', 'Mitgliederverwaltung', 'Buchhaltung', 'Dokumente', 'Termine']
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Members CRUD
app.get('/api/members', async (req, res) => {
  try {
    const members = await Member.findAll({
      include: [{ model: Organization }],
      order: [['created_at', 'DESC']]
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, memberNumber } = req.body;
    
    const member = await Member.create({
      firstName,
      lastName,
      email,
      phone,
      memberNumber: memberNumber || `M${Date.now()}`,
      passwordHash: 'temp_password', // In production: hash properly
      organizationId: 1 // Default organization
    });
    
    res.status(201).json(member);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Email or member number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create member' });
    }
  }
});

// Initialize Demo Data
app.post('/api/init-demo', async (req, res) => {
  try {
    const existingOrg = await Organization.findOne();
    if (existingOrg) {
      return res.json({ message: 'Demo data already exists' });
    }

    // Create organization
    const org = await Organization.create({
      name: 'Demo Verein e.V.',
      type: 'verein',
      taxNumber: '12345/67890',
      address: {
        street: 'Musterstraße 123',
        city: 'Berlin',
        zip: '10115',
        country: 'Deutschland'
      }
    });

    // Create demo members
    const members = await Member.bulkCreate([
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@orgasuite.de',
        passwordHash: 'admin123',
        memberNumber: 'A001',
        organizationId: org.id,
        permissions: { role: 'admin' }
      },
      {
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max@orgasuite.de',
        passwordHash: 'member123',
        memberNumber: 'M001',
        organizationId: org.id
      },
      {
        firstName: 'Anna',
        lastName: 'Schmidt',
        email: 'anna@orgasuite.de',
        passwordHash: 'member123',
        memberNumber: 'M002',
        organizationId: org.id
      }
    ]);

    // Create demo accounts
    await Account.bulkCreate([
      {
        organizationId: org.id,
        accountNumber: '1000',
        name: 'Kasse',
        type: 'asset'
      },
      {
        organizationId: org.id,
        accountNumber: '1200',
        name: 'Bank',
        type: 'asset'
      },
      {
        organizationId: org.id,
        accountNumber: '8000',
        name: 'Mitgliedsbeiträge',
        type: 'revenue'
      }
    ]);

    res.json({ 
      message: 'Demo data initialized successfully',
      organization: org.name,
      members: members.length
    });
  } catch (error) {
    console.error('Demo init error:', error);
    res.status(500).json({ error: 'Failed to initialize demo data' });
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OrgaSuite PostgreSQL API running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🗄️ pgAdmin: http://localhost:8080`);
});