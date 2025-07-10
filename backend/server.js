// backend/server.js - Erweitert um Bank-Funktionalität
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

// ✅ NEU: Bank-Routen hinzufügen
const bankRoutes = require('./src/routes/bank');

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
        },
        bankAPI: true // ✅ NEU: Bank-API verfügbar
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
          in: !!Op?.in,
          ne: !!Op?.ne,
          between: !!Op?.between,
          notBetween: !!Op?.notBetween
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: PORT,
        databaseUrl: !!process.env.DATABASE_URL
      }
    };

    res.json({
      timestamp: new Date().toISOString(),
      status: 'DEBUG',
      ...status
    });
  } catch (error) {
    logError('DB_STATUS', error);
    res.status(500).json({
      error: 'Failed to get database status',
      details: error.message
    });
  }
});

// Enhanced IBAN validation for testing
const { validateIBANWithLogging } = require('./src/utils/ibanUtils');

// Development Routes (nur in Development-Mode)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/dev/test-iban', (req, res) => {
    const testIbans = [
      'DE89370400440532013000',
      'GB82WEST12345698765432',
      'FR1420041010050500013M02606',
      'AT611904300234573201',
      'CH9300762011623852957',
      'invalid-iban',
      '',
      null,
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

// Bank data initialization
async function initializeBankData() {
  try {
    console.log('🏦 [BANK_INIT] Starting bank data initialization...');
    
    // Check if bank data already exists
    const bankService = require('./src/services/bankService');
    const status = await bankService.getStatus();
    
    if (status.totalBanks > 0) {
      console.log(`✅ [BANK_INIT] Bank data already available: ${status.totalBanks} banks loaded`);
      return;
    }
    
    console.log('📥 [BANK_INIT] No bank data found, starting import...');
    const { importBundesbankData } = require('./src/data/bundesbank/import-banks');
    
    const result = await importBundesbankData();
    console.log('🎉 [BANK_INIT] Bank data import completed:', result);
    
  } catch (error) {
    console.error('❌ [BANK_INIT] Failed to initialize bank data:', error);
    // Don't crash the server if bank import fails
  }
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
    
    // Organization Routes - ✅ KORRIGIERT: setupRoutes statt createOrganizationRoutes
    app.use('/api/organizations', organizationModule.setupRoutes(models));
    console.log('✅ Organization routes registered');

    // Member Routes - ✅ KORRIGIERT: setupRoutes statt createMembersRoutes
    app.use('/api/members', membersModule.setupRoutes(models));
    console.log('✅ Member routes registered');

    // Configuration Routes - ✅ KORRIGIERT: setupRoutes statt createConfigurationRoutes
    app.use('/api/configuration', configurationModule.setupRoutes(models));
    console.log('✅ Configuration routes registered');

    // Dashboard Routes - ✅ KORRIGIERT: setupRoutes statt createDashboardRoutes
    app.use('/api/dashboard', dashboardModule.setupRoutes(models));
    console.log('✅ Dashboard routes registered');

    // ✅ NEU: Bank-Routen registrieren
    app.use('/api/banks', bankRoutes);
    console.log('✅ Bank routes registered');

    // ✅ Bank-API-Dokumentation
    app.get('/api/docs/banks', (req, res) => {
      res.json({
        title: 'Bank API Documentation',
        version: '1.0.0',
        endpoints: {
          'GET /api/banks/lookup-iban/:iban': 'Bankdaten anhand IBAN ermitteln',
          'GET /api/banks/lookup-blz/:blz': 'Bankdaten anhand Bankleitzahl ermitteln',
          'GET /api/banks/lookup-bic/:bic': 'Bankdaten anhand BIC ermitteln',
          'GET /api/banks/search?q=term': 'Banken suchen (Autocomplete)',
          'GET /api/banks/status': 'Status der Bankdatenbank',
          'POST /api/banks/batch-lookup': 'Mehrere IBANs gleichzeitig prüfen'
        },
        examples: {
          iban_lookup: '/api/banks/lookup-iban/DE89370400440532013000',
          bank_search: '/api/banks/search?q=Deutsche&limit=5',
          status: '/api/banks/status'
        }
      });
    });

    // 404 Handler für alle anderen Routen
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        availableEndpoints: [
          '/api/health',
          '/api/organizations',
          '/api/members', 
          '/api/configuration',
          '/api/dashboard',
          '/api/banks', // ✅ NEU
          '/api/docs/banks' // ✅ NEU
        ]
      });
    });

    // Globaler Error Handler
    app.use((error, req, res, next) => {
      logError('SERVER_ERROR', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });

    // ✅ Server starten
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📚 Bank API docs: http://localhost:${PORT}/api/docs/banks`);
      console.log('🏢 ====================================');
      
      // ✅ Bank-Import nach 3 Sekunden starten (Server muss laufen)
      setTimeout(initializeBankData, 3000);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logError('SERVER_STARTUP', error);
    process.exit(1);
  }
}

// Server starten
startServer();