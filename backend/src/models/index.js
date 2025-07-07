// backend/src/models/index.js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Organization Model - MIT BANKDATEN
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
  // ✅ NEUES FELD: Bankdaten
  bankDetails: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'bank_details',
    comment: 'Bankverbindungsdaten (IBAN, BIC, Kontoinhaber, Bankname)'
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

// Account Model (für zukünftige Buchhaltung)
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

// Transaction Model (für zukünftige Buchhaltung)
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

// Model Associations
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

// Hooks für automatische Member-Nummern
Member.beforeCreate(async (member) => {
  if (!member.memberNumber) {
    const organization = await Organization.findByPk(member.organizationId);
    const prefix = organization.type === 'verein' ? 'M' : 'K';
    
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

module.exports = {
  sequelize,
  Organization,
  Member,
  Account,
  Transaction
};