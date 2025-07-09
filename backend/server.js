// backend/server.js - Refactored Main Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Op } = require('sequelize');
require('dotenv').config();

// Import modules
const databaseSetup = require('./src/database/setup');
const organizationModule = require('./src/organization/organization');
const membersModule = require('./src/members/members');
const configurationModule = require('./src/configuration/configuration');
const dashboardModule = require('./src/dashboard/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global error logger
const logError = (context, error) => {
  console.error(`❌ [${context}] Error:`, {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });
};

let models = {}; // Placeholder for DB models

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    if (models.sequelize) {
      await models.sequelize.authenticate();
    }

    res.json({
      status: 'OK',
      message: 'OrgaSuite PostgreSQL API is running!',
      timestamp: new Date().toISOString(),
      database: models.sequelize ? 'PostgreSQL - Connected' : 'Not initialized',
      version: '1.0.0',
      features: {
        models: {
          Organization: !!models.Organization,
          Member: !!models.Member,
          Account: !!models.Account,
          Transaction: !!models.Transaction
        },
        sequelizeOp: !!Op,
        operators: {
          or: !!Op?.or,
          iLike: !!Op?.iLike,
          gte: !!Op?.gte,
          in: !!Op?.in
        }
      }
    });
  } catch (error) {
    logError('HEALTH_CHECK', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database status
app.get('/api/debug/db-status', async (req, res) => {
  try {
    const status = {
      sequelize: !!models.sequelize,
      models: {
        Organization: !!models.Organization,
        Member: !!models.Member,
        Account: !!models.Account,
        Transaction: !!models.Transaction
      },
      features: {
        sequelizeOp: !!Op,
        operators: {
          or: !!Op?.or,
          and: !!Op?.and,
          iLike: !!Op?.iLike,
          like: !!Op?.like,
          gte: !!Op?.gte,
          lte: !!Op?.lte,
          in: !!Op?.in
        }
      },
      connection: false,
      tables: {}
    };

    if (models.sequelize) {
      try {
        await models.sequelize.authenticate();
        status.connection = true;

        const [results] = await models.sequelize.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `);

        status.tables = results.map(r => r.table_name);
      } catch (error) {
        status.connectionError = error.message;
      }
    }

    res.json(status);
  } catch (error) {
    logError('DB_STATUS', error);
    res.status(500).json({
      error: 'Failed to get database status',
      details: error.message
    });
  }
});

// Dev-Endpoints
if (process.env.NODE_ENV === 'development') {
  app.get('/api/dev/test-iban', (req, res) => {
    const { validateIBANWithLogging } = require('./src/utils/ibanUtils');
    const testIbans = [
      'DE89370400440532013000',
      'DE12500105170648489890',
      'AT611904300234573201',
      'CH9300762011623852957',
      'FR1420041010050500013M02606',
      'DE89370400440532013999',
      'DE8937040044053201300',
      'XX89370400440532013000',
      '',
      'INVALID',
      'DE89 3704 0044 0532 0130 00'
    ];

    const results = testIbans.map(iban => ({
      input: iban || '(empty)',
      validation: validateIBANWithLogging(iban, 'TEST')
    }));

    res.json({
      message: 'IBAN Test Results',
      timestamp: new Date().toISOString(),
      testCount: results.length,
      validCount: results.filter(r => r.validation.isValid).length,
      results
    });
  });

  app.post('/api/dev/reset', async (req, res) => {
    try {
      if (!models.Member || !models.Organization) {
        throw new Error('Models not initialized');
      }

      await models.Member.destroy({ where: {} });
      await models.Organization.destroy({ where: {} });

      console.log('🧹 Database reset completed');

      res.json({
        message: 'Database reset successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logError('RESET_DATABASE', error);
      res.status(500).json({
        error: 'Failed to reset database',
        details: error.message
      });
    }
  });
}

// Server startup mit fixierter Reihenfolge
async function startServer() {
  console.log('🏢 ====================================');
  console.log('🚀 OrgaSuite Backend Server Starting');
  console.log('🏢 ====================================');

  try {
    // ✅ Datenbankinitialisierung zuerst
    models = await databaseSetup.initializeDatabase();
    console.log('✅ Models initialized:', Object.keys(models).filter(k => k !== 'sequelize').join(', '));

    // ✅ Routen NACH der Modell-Initialisierung und VOR app.listen() registrieren
    // WICHTIGE REIHENFOLGE: Spezifischere Routen zuerst!
    app.use('/api/dashboard', dashboardModule.setupRoutes(models));
    app.use('/api/members', membersModule.setupRoutes(models));
    
    // Organization routes (includes /setup-demo)
    app.use('/api/organization', organizationModule.setupRoutes(models));
    
    // NACH organization muss config kommen (wegen /api/organization/config)
    app.use('/api/organization/config', configurationModule.setupRoutes(models));

    console.log('✅ Routes registered successfully');

    // 404 handler - MUSS nach allen Routen kommen
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    app.use((err, req, res, next) => {
      logError('GLOBAL_ERROR', err);

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
        timestamp: new Date().toISOString()
      });
    });

    // Starte Server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('✅ OrgaSuite Backend Server Started Successfully');
      console.log('🏢 ====================================');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🐛 DB Status: http://localhost:${PORT}/api/debug/db-status`);
      console.log('');
      console.log('📍 Available routes:');
      console.log('   - GET  /api/health');
      console.log('   - GET  /api/organization');
      console.log('   - POST /api/organization');
      console.log('   - POST /api/organization/setup-demo');
      console.log('   - GET  /api/members');
      console.log('   - GET  /api/dashboard/stats');
      console.log('   - GET  /api/organization/config');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
}

// Signal handling
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  if (models.sequelize) await models.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  if (models.sequelize) await models.sequelize.close();
  process.exit(0);
});

// Start server
startServer().catch(error => {
  logError('SERVER_START', error);
  process.exit(1);
});