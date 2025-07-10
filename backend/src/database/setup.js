const { Sequelize, DataTypes } = require('sequelize');
const organizationModule = require('../organization/organization');
const membersModule = require('../members/members');

// Models für Account und Transaction (noch nicht modularisiert)
function defineAccountModel(sequelize) {
  const Account = sequelize.define('Account', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organizationId: {
      type: DataTypes.INTEGER,
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

  return Account;
}

function defineTransactionModel(sequelize) {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organizationId: {
      type: DataTypes.INTEGER,
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
      field: 'debit_account_id'
    },
    creditAccountId: {
      type: DataTypes.INTEGER,
      field: 'credit_account_id'
    },
    memberId: {
      type: DataTypes.INTEGER,
      field: 'member_id'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    createdBy: {
      type: DataTypes.INTEGER,
      field: 'created_by'
    }
  }, {
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return Transaction;
}

// Setup all associations
function setupAssociations(models) {
  const { Organization, Member, Account, Transaction } = models;

  // Organization <-> Member
  Organization.hasMany(Member, { 
    foreignKey: 'organizationId',
    as: 'members'
  });
  Member.belongsTo(Organization, { 
    foreignKey: 'organizationId',
    as: 'organization'
  });

  // Organization <-> Account
  Organization.hasMany(Account, { 
    foreignKey: 'organizationId',
    as: 'accounts'
  });
  Account.belongsTo(Organization, { 
    foreignKey: 'organizationId',
    as: 'organization'
  });

  // Organization <-> Transaction
  Organization.hasMany(Transaction, { 
    foreignKey: 'organizationId',
    as: 'transactions'
  });
  Transaction.belongsTo(Organization, { 
    foreignKey: 'organizationId',
    as: 'organization'
  });

  // Member <-> Transaction
  Member.hasMany(Transaction, { 
    foreignKey: 'memberId',
    as: 'transactions'
  });
  Transaction.belongsTo(Member, { 
    foreignKey: 'memberId',
    as: 'member'
  });

  // Account <-> Transaction
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
}

// Main database initialization
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database connection...');
    console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    
    // Create sequelize instance
    const sequelize = new Sequelize(
      process.env.DATABASE_URL || 'postgres://orgasuite_user:orgasuite_password@localhost:5432/orgasuite', 
      {
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
      }
    );

    // Test connection
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully');

    // Define all models
    const Organization = organizationModule.defineOrganizationModel(sequelize);
    const Member = membersModule.defineMemberModel(sequelize);
    const Account = defineAccountModel(sequelize);
    const Transaction = defineTransactionModel(sequelize);

    const models = {
      sequelize,
      Organization,
      Member,
      Account,
      Transaction
    };

    // Setup associations
    setupAssociations(models);

    // Setup hooks
    membersModule.setupMemberHooks(Member, Organization);

    // Sync database
    console.log('🔄 Synchronizing database models...');
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized successfully');

    // Run migration for bank_details
    await runSimpleMigration(sequelize);

    console.log('✅ Database initialization completed successfully');
    
    return models;

  } catch (error) {
    console.error('❌ [DATABASE_INIT] Error:', error);
    throw error;
  }
}

// Migration function
async function runSimpleMigration(sequelize) {
  try {
    console.log('🔄 Running database migrations...');
    
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
    console.error('⚠️ [MIGRATION] Error:', error);
  }
}

module.exports = {
  initializeDatabase,
  defineAccountModel,
  defineTransactionModel,
  setupAssociations
};