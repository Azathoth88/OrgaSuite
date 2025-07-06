const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Organization Model
const Organization = sequelize.define('Organization', {
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

// Member Model
const Member = sequelize.define('Member', {
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

// Account Model
const Account = sequelize.define('Account', {
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

// Transaction Model
const Transaction = sequelize.define('Transaction', {
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

// Associations
Organization.hasMany(Member, { foreignKey: 'organizationId' });
Member.belongsTo(Organization, { foreignKey: 'organizationId' });

Organization.hasMany(Account, { foreignKey: 'organizationId' });
Account.belongsTo(Organization, { foreignKey: 'organizationId' });

Organization.hasMany(Transaction, { foreignKey: 'organizationId' });
Transaction.belongsTo(Organization, { foreignKey: 'organizationId' });

Member.hasMany(Transaction, { foreignKey: 'memberId' });
Transaction.belongsTo(Member, { foreignKey: 'memberId' });

Account.hasMany(Transaction, { as: 'DebitTransactions', foreignKey: 'debitAccountId' });
Account.hasMany(Transaction, { as: 'CreditTransactions', foreignKey: 'creditAccountId' });
Transaction.belongsTo(Account, { as: 'DebitAccount', foreignKey: 'debitAccountId' });
Transaction.belongsTo(Account, { as: 'CreditAccount', foreignKey: 'creditAccountId' });

module.exports = {
  sequelize,
  Organization,
  Member,
  Account,
  Transaction
};