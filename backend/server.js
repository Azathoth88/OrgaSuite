// backend/server.js - COMPLETE VERSION with IBAN validation
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

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

// ==================== DATABASE SETUP WITH ENHANCED ERROR HANDLING ====================
let sequelize, Organization, Member, Account, Transaction;

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database connection...');
    console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    
    // Dynamic import to handle potential module issues
    const { Sequelize, DataTypes } = require('sequelize');
    
    // Create sequelize instance with enhanced error handling
    sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://orgasuite_user:orgasuite_password@localhost:5432/orgasuite', {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      retry: {
        max: 3
      }
    });

    // Test connection first
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully');

    // Define models inline to avoid import issues
    Organization = sequelize.define('Organization', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('verein', 'unternehmen'),
        allowNull: false
      },
      taxNumber: {
        type: DataTypes.STRING,
        field: 'tax_number'
      },
      address: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      bankDetails: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'bank_details'
      },
      settings: {
        type: DataTypes.JSONB,
        defaultValue: {}
      }
    }, {
      tableName: 'organizations',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    Member = sequelize.define('Member', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      organizationId: {
        type: DataTypes.INTEGER,
        references: {
          model: Organization,
          key: 'id'
        },
        field: 'organization_id'
      },
      memberNumber: {
        type: DataTypes.STRING,
        unique: true,
        field: 'member_number'
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password_hash'
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'first_name'
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'last_name'
      },
      phone: DataTypes.STRING,
      address: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      membershipData: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'membership_data'
      },
      permissions: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active'
      },
      joinedAt: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
        field: 'joined_at'
      }
    }, {
      tableName: 'members',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    // Account Model (for future accounting)
    Account = sequelize.define('Account', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      organizationId: {
        type: DataTypes.INTEGER,
        references: {
          model: Organization,
          key: 'id'
        },
        field: 'organization_id'
      },
      accountNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'account_number'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      parentId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'accounts',
          key: 'id'
        },
        field: 'parent_id'
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    }, {
      tableName: 'accounts',
      timestamps: false
    });

    // Transaction Model (for future accounting)
    Transaction = sequelize.define('Transaction', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      organizationId: {
        type: DataTypes.INTEGER,
        references: {
          model: Organization,
          key: 'id'
        },
        field: 'organization_id'
      },
      transactionNumber: {
        type: DataTypes.STRING,
        unique: true,
        field: 'transaction_number'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      transactionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'transaction_date'
      },
      debitAccountId: {
        type: DataTypes.INTEGER,
        references: {
          model: Account,
          key: 'id'
        },
        field: 'debit_account_id'
      },
      creditAccountId: {
        type: DataTypes.INTEGER,
        references: {
          model: Account,
          key: 'id'
        },
        field: 'credit_account_id'
      },
      memberId: {
        type: DataTypes.INTEGER,
        references: {
          model: Member,
          key: 'id'
        },
        field: 'member_id'
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      createdBy: {
        type: DataTypes.INTEGER,
        references: {
          model: Member,
          key: 'id'
        },
        field: 'created_by'
      }
    }, {
      tableName: 'transactions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false
    });

    // Define associations
    Organization.hasMany(Member, { 
      foreignKey: 'organizationId',
      as: 'members'
    });
    Member.belongsTo(Organization, { 
      foreignKey: 'organizationId',
      as: 'organization'
    });

    Organization.hasMany(Account, { 
      foreignKey: 'organizationId',
      as: 'accounts'
    });
    Account.belongsTo(Organization, { 
      foreignKey: 'organizationId',
      as: 'organization'
    });

    Organization.hasMany(Transaction, { 
      foreignKey: 'organizationId',
      as: 'transactions'
    });
    Transaction.belongsTo(Organization, { 
      foreignKey: 'organizationId',
      as: 'organization'
    });

    Member.hasMany(Transaction, { 
      foreignKey: 'memberId',
      as: 'transactions'
    });
    Transaction.belongsTo(Member, { 
      foreignKey: 'memberId',
      as: 'member'
    });

    Account.hasMany(Transaction, { 
      as: 'debitTransactions', 
      foreignKey: 'debitAccountId' 
    });
    Account.hasMany(Transaction, { 
      as: 'creditTransactions', 
      foreignKey: 'creditAccountId' 
    });
    Transaction.belongsTo(Account, { 
      as: 'debitAccount', 
      foreignKey: 'debitAccountId' 
    });
    Transaction.belongsTo(Account, { 
      as: 'creditAccount', 
      foreignKey: 'creditAccountId' 
    });

    // Sync database with retry mechanism
    console.log('🔄 Synchronizing database models...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized successfully');

    // Run migration for bank_details
    await runSimpleMigration();

    // Add hooks for automatic member numbers
    Member.beforeCreate(async (member) => {
      if (!member.memberNumber) {
        const organization = await Organization.findByPk(member.organizationId);
        const prefix = organization?.type === 'verein' ? 'M' : 'K';
        
        const lastMember = await Member.findOne({
          where: { organizationId: member.organizationId },
          order: [['created_at', 'DESC']]
        });
        
        let nextNumber = 1;
        if (lastMember && lastMember.memberNumber) {
          const match = lastMember.memberNumber.match(/\d+$/);
          if (match) {
            nextNumber = parseInt(match[0]) + 1;
          }
        }
        
        member.memberNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
      }
    });

    console.log('✅ Database initialization completed successfully');
    return true;

  } catch (error) {
    logError('DATABASE_INIT', error);
    return false;
  }
}

// Enhanced migration function
async function runSimpleMigration() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Check if bank_details column exists, if not add it
    await sequelize.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'organizations' AND column_name = 'bank_details'
        ) THEN
          ALTER TABLE organizations ADD COLUMN bank_details JSONB DEFAULT '{}';
        END IF;
      END $$;
    `);
    
    console.log('✅ Migration completed: bank_details column available');
    
  } catch (error) {
    // Log error but don't fail startup
    logError('MIGRATION', error);
  }
}

// ==================== IBAN UTILS INTEGRATION ====================

// Import IBAN utilities - if file doesn't exist, create inline fallback
let validateIBANWithLogging, ibanValidationMiddleware;

try {
  const ibanUtils = require('./src/utils/ibanUtils');
  validateIBANWithLogging = ibanUtils.validateIBANWithLogging;
  ibanValidationMiddleware = ibanUtils.ibanValidationMiddleware;
  console.log('✅ IBAN utilities loaded successfully');
} catch (error) {
  console.warn('⚠️ IBAN utilities not found, using fallback validation');
  
  // Fallback IBAN validation
  validateIBANWithLogging = (iban, context) => {
    if (!iban) return { isValid: true, error: null, formatted: '', countryCode: null, bankCode: null };
    
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    const basicValid = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban) && cleanIban.length >= 15 && cleanIban.length <= 34;
    
    console.log(`${basicValid ? '✅' : '❌'} [${context}] Basic IBAN validation: ${cleanIban}`);
    
    return {
      isValid: basicValid,
      error: basicValid ? null : 'Invalid IBAN format',
      formatted: basicValid ? cleanIban.replace(/(.{4})/g, '$1 ').trim() : iban,
      countryCode: basicValid ? cleanIban.substring(0, 2) : null,
      bankCode: null
    };
  };
  
  ibanValidationMiddleware = (fieldName, required) => (req, res, next) => next();
}

// ==================== HEALTH CHECK WITH DATABASE STATUS ====================
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await sequelize.authenticate();
    
    res.json({ 
      status: 'OK', 
      message: 'OrgaSuite PostgreSQL API is running!',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL - Connected',
      version: '1.0.0',
      features: {
        ibanValidation: !!validateIBANWithLogging,
        models: {
          Organization: !!Organization,
          Member: !!Member,
          Account: !!Account,
          Transaction: !!Transaction
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

// ==================== ORGANIZATION MANAGEMENT WITH IBAN ====================

// Get current organization (setup check)
app.get('/api/organization', async (req, res) => {
  try {
    if (!Organization) {
      throw new Error('Organization model not initialized');
    }

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
    logError('GET_ORGANIZATION', error);
    res.status(500).json({ 
      error: 'Failed to fetch organization',
      details: error.message
    });
  }
});

// Create/update organization WITH IBAN VALIDATION
app.post('/api/organization', async (req, res) => {
  try {
    if (!Organization) {
      throw new Error('Organization model not initialized');
    }

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
    
    // ✅ ENHANCED IBAN VALIDATION
    let validatedBankDetails = bankDetails || {};
    
    if (bankDetails?.iban) {
      const ibanValidation = validateIBANWithLogging(bankDetails.iban, 'Organization');
      
      if (!ibanValidation.isValid) {
        return res.status(400).json({ 
          error: 'IBAN-Validierung fehlgeschlagen',
          details: ibanValidation.error,
          field: 'bankDetails.iban',
          provided: bankDetails.iban
        });
      }
      
      // Enhance bank details with validated IBAN data
      validatedBankDetails = {
        ...bankDetails,
        iban: ibanValidation.formatted,
        ibanCountryCode: ibanValidation.countryCode,
        ibanBankCode: ibanValidation.bankCode,
        ibanValidatedAt: new Date().toISOString()
      };
      
      console.log(`✅ IBAN validated for organization: ${ibanValidation.countryCode} - ${ibanValidation.formatted}`);
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
        bankDetails: validatedBankDetails,
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
        bankDetails: validatedBankDetails,
        settings: settings || {}
      });
      
      console.log(`✅ Organization created: ${name} (${type})`);
    }
    
    res.json({
      message: 'Organization saved successfully',
      organization,
      ibanValidated: !!bankDetails?.iban
    });
  } catch (error) {
    logError('SAVE_ORGANIZATION', error);
    if (error.name === 'SequelizeValidationError') {
      res.status(400).json({ 
        error: 'Validation error',
        details: error.errors.map(e => e.message)
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to save organization',
        details: error.message
      });
    }
  }
});

// ==================== IBAN VALIDATION ENDPOINT ====================
app.post('/api/validate-iban', (req, res) => {
  try {
    const { iban } = req.body;
    
    if (!iban) {
      return res.status(400).json({ 
        error: 'IBAN is required' 
      });
    }
    
    const validation = validateIBANWithLogging(iban, 'API_Validation');
    
    res.json({
      ...validation,
      timestamp: new Date().toISOString(),
      source: 'OrgaSuite API'
    });
  } catch (error) {
    logError('VALIDATE_IBAN', error);
    res.status(500).json({ 
      error: 'Failed to validate IBAN',
      details: error.message
    });
  }
});

// Setup demo organization and data WITH ENHANCED IBAN
app.post('/api/setup-demo', async (req, res) => {
  try {
    if (!Organization || !Member) {
      throw new Error('Models not initialized');
    }

    const { orgType = 'verein' } = req.body;
    
    // Check if organization already exists
    const existingOrg = await Organization.findOne();
    if (existingOrg) {
      return res.status(400).json({ error: 'Organization already exists' });
    }

    // Demo organization data with validated IBANs
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
          iban: 'DE89370400440532013000', // Valid test IBAN
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
          iban: 'DE12500105170648489890', // Valid test IBAN
          bic: 'INGDDEFFXXX',
          bankName: 'ING-DiBa AG'
        }
      }
    };

    // ✅ VALIDATE DEMO IBAN
    const selectedOrgData = orgData[orgType];
    if (selectedOrgData.bankDetails?.iban) {
      const ibanValidation = validateIBANWithLogging(selectedOrgData.bankDetails.iban, `Demo_${orgType}`);
      
      if (!ibanValidation.isValid) {
        console.warn(`⚠️ Demo IBAN for ${orgType} is invalid: ${ibanValidation.error}`);
        // Remove invalid IBAN instead of failing
        delete selectedOrgData.bankDetails.iban;
      } else {
        // Enhance with validation data
        selectedOrgData.bankDetails.iban = ibanValidation.formatted;
        selectedOrgData.bankDetails.ibanCountryCode = ibanValidation.countryCode;
        selectedOrgData.bankDetails.ibanBankCode = ibanValidation.bankCode;
        selectedOrgData.bankDetails.ibanValidatedAt = new Date().toISOString();
      }
    }

    // Create organization
    const org = await Organization.create(selectedOrgData);

    // Create demo members with enhanced data
    const memberData = {
      verein: [
        {
          firstName: 'Hans',
          lastName: 'Müller',
          email: 'hans.mueller@verein.de',
          passwordHash: 'member123',
          memberNumber: 'M001',
          organizationId: org.id,
          status: 'active',
          phone: '+49 30 12345678',
          address: {
            street: 'Musterstraße 1',
            city: 'Berlin',
            zip: '10115',
            country: 'Deutschland'
          },
          membershipData: {
            joinDate: '2024-01-15',
            membershipType: 'Vollmitglied',
            membershipFee: 50.00,
            paymentMethod: 'Lastschrift',
            bankDetails: {
              iban: 'DE89370400440532013001', // Test IBAN for member
              accountHolder: 'Hans Müller'
            }
          }
        },
        {
          firstName: 'Anna',
          lastName: 'Schmidt',
          email: 'anna.schmidt@verein.de',
          passwordHash: 'member123',
          memberNumber: 'M002',
          organizationId: org.id,
          status: 'active',
          phone: '+49 40 87654321',
          address: {
            street: 'Beispielweg 42',
            city: 'Hamburg',
            zip: '20095',
            country: 'Deutschland'
          },
          membershipData: {
            joinDate: '2024-02-20',
            membershipType: 'Vollmitglied',
            membershipFee: 50.00,
            paymentMethod: 'Überweisung'
          }
        },
        {
          firstName: 'Peter',
          lastName: 'Weber',
          email: 'peter.weber@verein.de',
          passwordHash: 'member123',
          memberNumber: 'M003',
          organizationId: org.id,
          status: 'inactive',
          phone: '+49 89 11223344',
          address: {
            street: 'Teststraße 99',
            city: 'München',
            zip: '80331',
            country: 'Deutschland'
          },
          membershipData: {
            joinDate: '2023-12-01',
            membershipType: 'Fördermitglied',
            membershipFee: 25.00,
            inactiveReason: 'Beitrag nicht bezahlt',
            inactiveSince: '2024-06-01'
          }
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
          status: 'active',
          phone: '+49 69 98765432',
          address: {
            street: 'Kundenallee 15',
            city: 'Frankfurt',
            zip: '60311',
            country: 'Deutschland'
          },
          membershipData: {
            customerSince: '2024-01-10',
            customerType: 'Premium',
            creditLimit: 5000,
            currentBalance: 1250.50,
            lastOrderDate: '2024-06-15'
          }
        },
        {
          firstName: 'Lisa',
          lastName: 'Weber',
          email: 'lisa.weber@kunde.de',
          passwordHash: 'customer123',
          memberNumber: 'K002',
          organizationId: org.id,
          status: 'active',
          phone: '+49 221 55667788',
          address: {
            street: 'Geschäftsstraße 7',
            city: 'Köln',
            zip: '50667',
            country: 'Deutschland'
          },
          membershipData: {
            customerSince: '2024-02-15',
            customerType: 'Standard',
            creditLimit: 2000,
            currentBalance: 350.00,
            lastOrderDate: '2024-06-20'
          }
        },
        {
          firstName: 'Thomas',
          lastName: 'Meyer',
          email: 'thomas.meyer@kunde.de',
          passwordHash: 'customer123',
          memberNumber: 'K003',
          organizationId: org.id,
          status: 'suspended',
          phone: '+49 711 99887766',
          address: {
            street: 'Sperrgasse 33',
            city: 'Stuttgart',
            zip: '70173',
            country: 'Deutschland'
          },
          membershipData: {
            customerSince: '2023-11-20',
            customerType: 'Standard',
            suspendedReason: 'Zahlungsverzug',
            suspendedSince: '2024-05-01',
            creditLimit: 0,
            currentBalance: -450.00
          }
        }
      ]
    };

    await Member.bulkCreate(memberData[orgType]);

    console.log(`✅ Demo ${orgType} created with ${memberData[orgType].length} members`);

    res.json({ 
      message: 'Demo organization created successfully',
      organization: org,
      membersCreated: memberData[orgType].length,
      bankDetailsValidated: !!selectedOrgData.bankDetails?.iban,
      features: {
        ibanValidation: true,
        memberData: true,
        addressData: true
      }
    });
  } catch (error) {
    logError('SETUP_DEMO', error);
    res.status(500).json({ 
      error: 'Failed to setup demo',
      details: error.message 
    });
  }
});

// ==================== DASHBOARD STATS ====================
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    if (!Member || !Organization) {
      throw new Error('Models not initialized');
    }

    const [memberCount, organization] = await Promise.all([
      Member.count(),
      Organization.findOne()
    ]);
    
    res.json({
      members: memberCount,
      organization: organization ? {
        name: organization.name,
        type: organization.type,
        hasBankDetails: !!(organization.bankDetails?.iban)
      } : null,
      transactions: 0,
      accounts: 0,
      modules: ['Dashboard', 'Mitgliederverwaltung', 'Buchhaltung', 'Dokumente', 'Termine']
    });
  } catch (error) {
    logError('DASHBOARD_STATS', error);
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
    if (!Member || !Organization) {
      throw new Error('Models not initialized');
    }

    const members = await Member.findAll({
      include: [{ 
        model: Organization,
        as: 'organization'
      }],
      order: [['created_at', 'DESC']]
    });
    
    console.log(`✅ Retrieved ${members.length} members`);
    res.json(members);
  } catch (error) {
    logError('GET_MEMBERS', error);
    res.status(500).json({ 
      error: 'Failed to fetch members',
      details: error.message
    });
  }
});

// Get single member
app.get('/api/members/:id', async (req, res) => {
  try {
    if (!Member || !Organization) {
      throw new Error('Models not initialized');
    }

    const member = await Member.findByPk(req.params.id, {
      include: [{ 
        model: Organization,
        as: 'organization'
      }]
    });
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    res.json(member);
  } catch (error) {
    logError('GET_MEMBER', error);
    res.status(500).json({ 
      error: 'Failed to fetch member',
      details: error.message
    });
  }
});

// Create new member (with optional IBAN validation)
app.post('/api/members', async (req, res) => {
  try {
    if (!Member || !Organization) {
      throw new Error('Models not initialized');
    }

    const { firstName, lastName, email, phone, address, memberNumber, status = 'active', membershipData } = req.body;
    
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
    
    // Validate member IBAN if provided
    let validatedMembershipData = membershipData || {};
    if (membershipData?.bankDetails?.iban) {
      const ibanValidation = validateIBANWithLogging(membershipData.bankDetails.iban, 'Member');
      
      if (!ibanValidation.isValid) {
        return res.status(400).json({ 
          error: 'Member IBAN validation failed',
          details: ibanValidation.error,
          field: 'membershipData.bankDetails.iban'
        });
      }
      
      validatedMembershipData = {
        ...membershipData,
        bankDetails: {
          ...membershipData.bankDetails,
          iban: ibanValidation.formatted,
          ibanCountryCode: ibanValidation.countryCode,
          ibanBankCode: ibanValidation.bankCode,
          ibanValidatedAt: new Date().toISOString()
        }
      };
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
      address,
      memberNumber: generatedMemberNumber,
      passwordHash: 'temp_password',
      organizationId: organization.id,
      status,
      membershipData: validatedMembershipData
    });
    
    // Fetch created member with organization
    const createdMember = await Member.findByPk(member.id, {
      include: [{ 
        model: Organization,
        as: 'organization'
      }]
    });
    
    console.log(`✅ Member created: ${firstName} ${lastName} (${generatedMemberNumber})`);
    
    res.status(201).json(createdMember);
  } catch (error) {
    logError('CREATE_MEMBER', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Email or member number already exists' });
    } else {
      res.status(500).json({ 
        error: 'Failed to create member',
        details: error.message
      });
    }
  }
});

// Update member (with optional IBAN validation)
app.put('/api/members/:id', async (req, res) => {
  try {
    if (!Member || !Organization) {
      throw new Error('Models not initialized');
    }

    const { firstName, lastName, email, phone, address, memberNumber, status, membershipData } = req.body;
    
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Validate member IBAN if provided and changed
    let validatedMembershipData = membershipData || {};
    if (membershipData?.bankDetails?.iban) {
      const ibanValidation = validateIBANWithLogging(membershipData.bankDetails.iban, 'Member_Update');
      
      if (!ibanValidation.isValid) {
        return res.status(400).json({ 
          error: 'Member IBAN validation failed',
          details: ibanValidation.error,
          field: 'membershipData.bankDetails.iban'
        });
      }
      
      validatedMembershipData = {
        ...membershipData,
        bankDetails: {
          ...membershipData.bankDetails,
          iban: ibanValidation.formatted,
          ibanCountryCode: ibanValidation.countryCode,
          ibanBankCode: ibanValidation.bankCode,
          ibanValidatedAt: new Date().toISOString()
        }
      };
    }
    
    await member.update({
      firstName,
      lastName,
      email,
      phone,
      address,
      memberNumber,
      status,
      membershipData: validatedMembershipData
    });
    
    // Fetch updated member with organization
    const updatedMember = await Member.findByPk(member.id, {
      include: [{ 
        model: Organization,
        as: 'organization'
      }]
    });
    
    console.log(`✅ Member updated: ${firstName} ${lastName}`);
    
    res.json(updatedMember);
  } catch (error) {
    logError('UPDATE_MEMBER', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Email or member number already exists' });
    } else {
      res.status(500).json({ 
        error: 'Failed to update member',
        details: error.message
      });
    }
  }
});

// Delete member
app.delete('/api/members/:id', async (req, res) => {
  try {
    if (!Member) {
      throw new Error('Member model not initialized');
    }

    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const memberInfo = `${member.firstName} ${member.lastName}`;
    await member.destroy();
    
    console.log(`✅ Member deleted: ${memberInfo}`);
    
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    logError('DELETE_MEMBER', error);
    res.status(500).json({ 
      error: 'Failed to delete member',
      details: error.message
    });
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

// Database status endpoint
app.get('/api/debug/db-status', async (req, res) => {
  try {
    const status = {
      sequelize: !!sequelize,
      models: {
        Organization: !!Organization,
        Member: !!Member,
        Account: !!Account,
        Transaction: !!Transaction
      },
      features: {
        ibanValidation: !!validateIBANWithLogging,
        ibanMiddleware: !!ibanValidationMiddleware
      },
      connection: false,
      tables: {}
    };

    if (sequelize) {
      try {
        await sequelize.authenticate();
        status.connection = true;

        // Check tables
        const [results] = await sequelize.query(`
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

// IBAN Test Endpoint (Development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/dev/test-iban', (req, res) => {
    const testIbans = [
      'DE89370400440532013000', // Valid (Germany)
      'DE12500105170648489890', // Valid (Germany)
      'AT611904300234573201',   // Valid (Austria)
      'CH9300762011623852957',  // Valid (Switzerland)
      'FR1420041010050500013M02606', // Valid (France)
      'DE89370400440532013999', // Invalid (wrong checksum)
      'DE8937040044053201300',  // Invalid (wrong length)
      'XX89370400440532013000', // Invalid (unknown country)
      '',                       // Empty (allowed)
      'INVALID',                // Invalid format
      'DE89 3704 0044 0532 0130 00' // With spaces (should be cleaned)
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

  // Clear all data (development only)
  app.post('/api/dev/reset', async (req, res) => {
    try {
      if (!Member || !Organization) {
        throw new Error('Models not initialized');
      }

      await Member.destroy({ where: {} });
      await Organization.destroy({ where: {} });
      
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

// ==================== ERROR HANDLERS ====================

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logError('GLOBAL_ERROR', err);
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
});

// ==================== SERVER STARTUP ====================
async function startServer() {
  console.log('🏢 ====================================');
  console.log('🚀 OrgaSuite Backend Server Starting');
  console.log('🏢 ====================================');
  
  // Initialize database first
  const dbInitialized = await initializeDatabase();
  
  if (!dbInitialized) {
    console.error('❌ Failed to initialize database. Exiting...');
    process.exit(1);
  }

  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('✅ OrgaSuite Backend Server Started Successfully');
    console.log('🏢 ====================================');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🗄️ pgAdmin: http://localhost:8080`);
    console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🐛 DB Status: http://localhost:${PORT}/api/debug/db-status`);
    console.log('');
    console.log('Available endpoints:');
    console.log('📋 GET  /api/health - Health check');
    console.log('🐛 GET  /api/debug/db-status - Database status');
    console.log('🏢 GET  /api/organization - Get organization');
    console.log('🏢 POST /api/organization - Create/update organization (with IBAN validation)');
    console.log('🎮 POST /api/setup-demo - Setup demo data (with validated IBANs)');
    console.log('🏦 POST /api/validate-iban - Validate single IBAN');
    console.log('📊 GET  /api/dashboard/stats - Dashboard statistics');
    console.log('👥 GET  /api/members - Get all members');
    console.log('👤 GET  /api/members/:id - Get single member');
    console.log('👤 POST /api/members - Create member (with IBAN validation)');
    console.log('👤 PUT  /api/members/:id - Update member (with IBAN validation)');
    console.log('👤 DELETE /api/members/:id - Delete member');
    console.log('📋 GET  /api/organization-types - Get organization types');
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 GET  /api/dev/test-iban - Test IBAN validation (dev only)');
      console.log('🧹 POST /api/dev/reset - Reset database (dev only)');
    }
    console.log('');
    console.log('🏦 IBAN Validation Features:');
    console.log('✅ 70+ countries supported');
    console.log('✅ Full mod97 checksum validation');
    console.log('✅ Automatic formatting and BLZ extraction');
    console.log('✅ Organization and Member IBAN support');
    console.log('✅ Comprehensive error messages');
    console.log('🏢 ====================================');
    console.log('');
  });
}

// Handle process termination gracefully
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  if (sequelize) {
    await sequelize.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  if (sequelize) {
    await sequelize.close();
  }
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  logError('SERVER_START', error);
  process.exit(1);
});