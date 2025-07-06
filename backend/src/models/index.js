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

// Associations
Organization.hasMany(Member, { foreignKey: 'organizationId' });
Member.belongsTo(Organization, { foreignKey: 'organizationId' });

module.exports = {
  sequelize,
  Organization,
  Member
};