const express = require('express');
const { DataTypes, Op } = require('sequelize');
const { validateIBANWithLogging } = require('../utils/ibanUtils');

// Router erstellen
const router = express.Router();

// Member Model Definition
function defineMemberModel(sequelize) {
  const Member = sequelize.define('Member', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organizationId: {
      type: DataTypes.INTEGER,
      field: 'organization_id'
    },
    memberNumber: {
      type: DataTypes.STRING,
      field: 'member_number'
    },
    // Persönliche Daten
    salutation: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Anrede (Herr, Frau, Dr., Prof., etc.)'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Titel (z.B. Prof. Dr.)'
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
    gender: {
      type: DataTypes.ENUM('male', 'female', 'diverse', ''),
      defaultValue: '',
      comment: 'Geschlecht'
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'birth_date',
      comment: 'Geburtsdatum'
    },
    // Kontaktdaten
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    landline: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Festnetznummer'
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Mobilnummer'
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: {
          args: [{ require_protocol: false }]
        }
      },
      comment: 'Webseite'
    },
    // Alte phone Spalte für Rückwärtskompatibilität
    phone: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('landline') || this.getDataValue('mobile');
      }
    },
    // Anschrift
    address: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    // Mitgliedschaftsdaten inkl. erweiterte Bankdaten
    membershipData: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: 'membership_data'
    },
    // Sonstige Felder
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'password_hash'
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
    updatedAt: 'updated_at',
    // Virtual field für berechnetes Alter
    getterMethods: {
      age() {
        if (!this.birthDate) return null;
        const today = new Date();
        const birthDate = new Date(this.birthDate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['email', 'organization_id'],
        name: 'unique_email_per_org'
      },
      {
        unique: true,
        fields: ['member_number', 'organization_id'],
        name: 'unique_member_number_per_org'
      }
    ]
  });

  return Member;
}

// Setup Hooks for Member model
function setupMemberHooks(Member, Organization) {
  Member.beforeCreate(async (member) => {
    if (!member.memberNumber && member.organizationId) {
      try {
        const organization = await Organization.findByPk(member.organizationId);
        if (!organization) {
          console.error('❌ [Hook] Organization not found:', member.organizationId);
          return;
        }
        
        const prefix = organization.type === 'verein' ? 'M' : 'K';
        
        const lastMember = await Member.findOne({
          where: { 
            organizationId: member.organizationId,
            memberNumber: {
              [Op.like]: `${prefix}%`
            }
          },
          order: [['memberNumber', 'DESC']]
        });
        
        let nextNumber = 1;
        if (lastMember && lastMember.memberNumber) {
          const match = lastMember.memberNumber.match(/\d+$/);
          if (match) {
            nextNumber = parseInt(match[0]) + 1;
          }
        }
        
        member.memberNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
        console.log(`🔢 [Hook] Generated member number: ${member.memberNumber} for org ${organization.name}`);
      } catch (error) {
        console.error('❌ [Hook] Error generating member number:', error);
        member.memberNumber = `TEMP${Date.now()}`;
      }
    }
  });
}

// Routes definieren
function setupRoutes(models) {
  const { Member, Organization, sequelize } = models;

  // GET /api/members - List members with search, filter, sort, pagination
  router.get('/', async (req, res) => {
    try {
      console.log('📊 Members API called with query:', req.query);

      if (!Op || !Op.or || !Op.iLike) {
        console.error('❌ Sequelize Op not available');
        throw new Error('Sequelize operators not available');
      }

      const {
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        search = '',
        status = '',
        memberNumber = '',
        firstName = '',
        lastName = '',
        email = '',
        landline = '',
        mobile = '',
        gender = ''
      } = req.query;

      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const pageLimit = parseInt(limit);

      // Build where conditions
      const whereConditions = {
        organizationId: organization.id
      };
      
      if (status && ['active', 'inactive', 'suspended'].includes(status)) {
        whereConditions.status = status;
      }

      if (memberNumber) {
        whereConditions.memberNumber = { [Op.iLike]: `%${memberNumber}%` };
      }

      if (firstName) {
        whereConditions.firstName = { [Op.iLike]: `%${firstName}%` };
      }

      if (lastName) {
        whereConditions.lastName = { [Op.iLike]: `%${lastName}%` };
      }

      if (email) {
        whereConditions.email = { [Op.iLike]: `%${email}%` };
      }

      if (landline) {
        whereConditions.landline = { [Op.iLike]: `%${landline}%` };
      }

      if (mobile) {
        whereConditions.mobile = { [Op.iLike]: `%${mobile}%` };
      }

      if (gender && ['male', 'female', 'diverse'].includes(gender)) {
        whereConditions.gender = gender;
      }

      // Full-text search
      let searchCondition = {};
      if (search && search.trim() !== '') {
        searchCondition = {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { memberNumber: { [Op.iLike]: `%${search}%` } },
            { landline: { [Op.iLike]: `%${search}%` } },
            { mobile: { [Op.iLike]: `%${search}%` } },
            { title: { [Op.iLike]: `%${search}%` } }
          ]
        };
      }

      const finalWhereCondition = {
        ...whereConditions,
        ...searchCondition
      };

      // Validate and build sort order
      const validSortFields = ['firstName', 'lastName', 'email', 'memberNumber', 'status', 'created_at', 'joinedAt', 'birthDate'];
      const validSortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      let orderClause;
      if (sortBy === 'name') {
        orderClause = [
          ['firstName', validSortOrder],
          ['lastName', validSortOrder]
        ];
      } else {
        orderClause = [[validSortField, validSortOrder]];
      }

      // Execute query
      const queryResult = await Member.findAndCountAll({
        where: finalWhereCondition,
        include: [{ 
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'type']
        }],
        order: orderClause,
        limit: pageLimit,
        offset: offset,
        distinct: true
      });

      const { count, rows: members } = queryResult;

      // Add calculated age to response
      const membersWithAge = members.map(member => ({
        ...member.toJSON(),
        age: member.age
      }));

      const totalPages = Math.ceil(count / pageLimit);
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      console.log(`✅ Retrieved ${members.length} of ${count} members for org ${organization.id}`);

      res.json({
        members: membersWithAge,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: pageLimit,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          search,
          status,
          memberNumber,
          firstName,
          lastName,
          email,
          landline,
          mobile,
          gender
        },
        sorting: {
          sortBy: validSortField,
          sortOrder: validSortOrder
        },
        organizationId: organization.id,
        timestamp: new Date().toISOString(),
        success: true
      });

    } catch (error) {
      console.error('❌ [GET_MEMBERS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch members',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
        success: false
      });
    }
  });

  // Member statistics
  router.get('/stats', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }

      const [total, active, inactive, suspended, male, female, diverse] = await Promise.all([
        Member.count({ where: { organizationId: organization.id } }),
        Member.count({ where: { status: 'active', organizationId: organization.id } }),
        Member.count({ where: { status: 'inactive', organizationId: organization.id } }),
        Member.count({ where: { status: 'suspended', organizationId: organization.id } }),
        Member.count({ where: { gender: 'male', organizationId: organization.id } }),
        Member.count({ where: { gender: 'female', organizationId: organization.id } }),
        Member.count({ where: { gender: 'diverse', organizationId: organization.id } })
      ]);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const newMembersThisWeek = await Member.count({
        where: {
          organizationId: organization.id,
          created_at: {
            [Op.gte]: oneWeekAgo
          }
        }
      });

      // Age distribution
      const ageDistribution = await sequelize.query(`
        SELECT 
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(birth_date)) < 18 THEN 'under18'
            WHEN EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 18 AND 25 THEN '18-25'
            WHEN EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 26 AND 35 THEN '26-35'
            WHEN EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 36 AND 50 THEN '36-50'
            WHEN EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 51 AND 65 THEN '51-65'
            WHEN EXTRACT(YEAR FROM AGE(birth_date)) > 65 THEN 'over65'
            ELSE 'unknown'
          END as age_group,
          COUNT(*) as count
        FROM members 
        WHERE organization_id = :orgId
        GROUP BY age_group
        ORDER BY age_group
      `, {
        replacements: { orgId: organization.id },
        type: sequelize.QueryTypes.SELECT
      });

      const monthlyStats = await sequelize.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count
        FROM members 
        WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
          AND organization_id = :orgId
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `, {
        replacements: { orgId: organization.id },
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        overview: {
          total,
          active,
          inactive,
          suspended,
          newThisWeek: newMembersThisWeek
        },
        gender: {
          male,
          female,
          diverse,
          notSpecified: total - male - female - diverse
        },
        ageDistribution,
        monthlyGrowth: monthlyStats,
        organizationId: organization.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [MEMBER_STATS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch member statistics',
        details: error.message
      });
    }
  });

  // Get single member
  router.get('/:id', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }

      const member = await Member.findOne({
        where: { 
          id: req.params.id,
          organizationId: organization.id 
        },
        include: [{ 
          model: Organization,
          as: 'organization'
        }]
      });
      
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      
      // Add calculated age
      const memberData = member.toJSON();
      memberData.age = member.age;
      
      res.json(memberData);
    } catch (error) {
      console.error('❌ [GET_MEMBER] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch member',
        details: error.message
      });
    }
  });

  // Create new member
  router.post('/', async (req, res) => {
    try {
      const { 
        salutation, title, firstName, lastName, gender, birthDate,
        email, landline, mobile, website, address, memberNumber, 
        status = 'active', membershipData 
      } = req.body;
      
      if (!firstName || !lastName) {
        return res.status(400).json({ 
          error: 'Vorname und Nachname sind Pflichtfelder' 
        });
      }
      
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }
      
      // Check if email already exists FOR THIS ORGANIZATION (only if email provided)
      if (email) {
        const existingMember = await Member.findOne({
          where: { 
            email: email.toLowerCase(),
            organizationId: organization.id 
          }
        });
        
        if (existingMember) {
          console.log(`⚠️ Email already exists in organization ${organization.id}: ${email}`);
          return res.status(400).json({ 
            error: 'Diese E-Mail-Adresse wird bereits in Ihrer Organisation verwendet',
            field: 'email'
          });
        }
      }
      
      let validatedMembershipData = membershipData || {};
      
      // Validate IBAN if provided
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
      
      let generatedMemberNumber = memberNumber;
      if (!generatedMemberNumber) {
        const prefix = organization.type === 'verein' ? 'M' : 'K';
        
        const lastMember = await Member.findOne({
          where: { 
            organizationId: organization.id,
            memberNumber: {
              [Op.like]: `${prefix}%`
            }
          },
          order: [['memberNumber', 'DESC']]
        });
        
        let nextNumber = 1;
        if (lastMember && lastMember.memberNumber) {
          const match = lastMember.memberNumber.match(/\d+$/);
          if (match) {
            nextNumber = parseInt(match[0]) + 1;
          }
        }
        
        generatedMemberNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
        console.log(`🔢 Generated member number: ${generatedMemberNumber} for org ${organization.id}`);
      }
      
      const member = await Member.create({
        salutation,
        title,
        firstName,
        lastName,
        gender: gender || '',
        birthDate,
        email: email ? email.toLowerCase() : null,
        landline,
        mobile,
        website,
        address,
        memberNumber: generatedMemberNumber,
        passwordHash: 'temp_password',
        organizationId: organization.id,
        status,
        membershipData: validatedMembershipData
      });
      
      const createdMember = await Member.findByPk(member.id, {
        include: [{ 
          model: Organization,
          as: 'organization'
        }]
      });
      
      // Add calculated age
      const memberData = createdMember.toJSON();
      memberData.age = createdMember.age;
      
      console.log(`✅ Member created: ${firstName} ${lastName} (${createdMember.memberNumber}) in org ${organization.id}`);
      
      res.status(201).json(memberData);
    } catch (error) {
      console.error('❌ [CREATE_MEMBER] Error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        if (error.fields?.email) {
          res.status(400).json({ 
            error: 'Diese E-Mail-Adresse wird bereits verwendet',
            field: 'email' 
          });
        } else if (error.fields?.member_number) {
          res.status(400).json({ 
            error: 'Diese Mitgliedsnummer existiert bereits',
            field: 'memberNumber' 
          });
        } else {
          res.status(400).json({ 
            error: 'Ein Datensatz mit diesen Angaben existiert bereits' 
          });
        }
      } else {
        res.status(500).json({ 
          error: 'Failed to create member',
          details: error.message
        });
      }
    }
  });

  // Update member
  router.put('/:id', async (req, res) => {
    try {
      const { 
        salutation, title, firstName, lastName, gender, birthDate,
        email, landline, mobile, website, address, memberNumber, 
        status, membershipData 
      } = req.body;
      
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }
      
      const member = await Member.findOne({
        where: { 
          id: req.params.id,
          organizationId: organization.id 
        }
      });
      
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      
      // Check if email is being changed and already exists (only if email provided)
      if (email && email.toLowerCase() !== (member.email || '').toLowerCase()) {
        const existingMember = await Member.findOne({
          where: { 
            email: email.toLowerCase(),
            organizationId: organization.id,
            id: { [Op.ne]: member.id }
          }
        });
        
        if (existingMember) {
          return res.status(400).json({ 
            error: 'Diese E-Mail-Adresse wird bereits in Ihrer Organisation verwendet',
            field: 'email'
          });
        }
      }
      
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
        salutation,
        title,
        firstName,
        lastName,
        gender: gender || '',
        birthDate,
        email: email ? email.toLowerCase() : null,
        landline,
        mobile,
        website,
        address,
        memberNumber,
        status,
        membershipData: validatedMembershipData
      });
      
      const updatedMember = await Member.findByPk(member.id, {
        include: [{ 
          model: Organization,
          as: 'organization'
        }]
      });
      
      // Add calculated age
      const memberData = updatedMember.toJSON();
      memberData.age = updatedMember.age;
      
      console.log(`✅ Member updated: ${firstName} ${lastName} in org ${organization.id}`);
      
      res.json(memberData);
    } catch (error) {
      console.error('❌ [UPDATE_MEMBER] Error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        if (error.fields?.email) {
          res.status(400).json({ 
            error: 'Diese E-Mail-Adresse wird bereits verwendet',
            field: 'email' 
          });
        } else if (error.fields?.member_number) {
          res.status(400).json({ 
            error: 'Diese Mitgliedsnummer existiert bereits',
            field: 'memberNumber' 
          });
        } else {
          res.status(400).json({ 
            error: 'Ein Datensatz mit diesen Angaben existiert bereits' 
          });
        }
      } else {
        res.status(500).json({ 
          error: 'Failed to update member',
          details: error.message
        });
      }
    }
  });

  // Delete member
  router.delete('/:id', async (req, res) => {
    try {
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }

      const member = await Member.findOne({
        where: { 
          id: req.params.id,
          organizationId: organization.id 
        }
      });
      
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      
      const memberInfo = `${member.firstName} ${member.lastName}`;
      await member.destroy();
      
      console.log(`✅ Member deleted: ${memberInfo} from org ${organization.id}`);
      
      res.json({ message: 'Member deleted successfully' });
    } catch (error) {
      console.error('❌ [DELETE_MEMBER] Error:', error);
      res.status(500).json({ 
        error: 'Failed to delete member',
        details: error.message
      });
    }
  });

  // Bulk update members
  router.patch('/bulk', async (req, res) => {
    try {
      const { memberIds, updates } = req.body;

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ error: 'memberIds array is required' });
      }

      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'updates object is required' });
      }
      
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }

      const allowedFields = ['status', 'landline', 'mobile', 'address', 'gender'];
      const updateData = {};
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ 
          error: 'No valid update fields provided',
          allowedFields
        });
      }

      const [affectedCount] = await Member.update(updateData, {
        where: {
          id: {
            [Op.in]: memberIds
          },
          organizationId: organization.id
        }
      });

      console.log(`✅ Bulk updated ${affectedCount} members in org ${organization.id}`);

      res.json({
        message: 'Bulk update successful',
        affectedCount,
        updates: updateData
      });

    } catch (error) {
      console.error('❌ [BULK_UPDATE_MEMBERS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to bulk update members',
        details: error.message
      });
    }
  });

  // Bulk delete members
  router.delete('/bulk', async (req, res) => {
    try {
      const { memberIds } = req.body;

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ error: 'memberIds array is required' });
      }

      if (memberIds.length > 50) {
        return res.status(400).json({ 
          error: 'Too many members for bulk deletion. Maximum 50 allowed.' 
        });
      }
      
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }

      const membersToDelete = await Member.findAll({
        where: {
          id: {
            [Op.in]: memberIds
          },
          organizationId: organization.id
        },
        attributes: ['id', 'firstName', 'lastName', 'memberNumber']
      });

      const deletedCount = await Member.destroy({
        where: {
          id: {
            [Op.in]: memberIds
          },
          organizationId: organization.id
        }
      });

      console.log(`✅ Bulk deleted ${deletedCount} members from org ${organization.id}`);

      res.json({
        message: 'Bulk deletion successful',
        deletedCount,
        deletedMembers: membersToDelete.map(m => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          memberNumber: m.memberNumber
        }))
      });

    } catch (error) {
      console.error('❌ [BULK_DELETE_MEMBERS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to bulk delete members',
        details: error.message
      });
    }
  });

  // Export members as CSV
  router.get('/export/csv', async (req, res) => {
    try {
      const { status, search } = req.query;
      
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }
      
      const whereConditions = {
        organizationId: organization.id
      };
      if (status) whereConditions.status = status;
      
      let searchCondition = {};
      if (search) {
        searchCondition = {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { memberNumber: { [Op.iLike]: `%${search}%` } }
          ]
        };
      }

      const members = await Member.findAll({
        where: { ...whereConditions, ...searchCondition },
        include: [{ 
          model: Organization,
          as: 'organization',
          attributes: ['name', 'type']
        }],
        order: [['firstName', 'ASC'], ['lastName', 'ASC']]
      });

      const orgType = organization.type;
      const csvHeaders = [
        orgType === 'verein' ? 'Mitgliedsnummer' : 'Kundennummer',
        'Anrede',
        'Titel',
        'Vorname',
        'Nachname', 
        'Geschlecht',
        'Geburtsdatum',
        'Alter',
        'E-Mail',
        'Festnetz',
        'Mobil',
        'Webseite',
        'Status',
        'Straße',
        'PLZ',
        'Stadt',
        'Land',
        'IBAN',
        'BIC',
        'Bankbezeichnung',
        'SEPA eingerichtet',
        orgType === 'verein' ? 'Mitglied seit' : 'Kunde seit',
        'Erstellt am'
      ];

      const csvRows = members.map(member => {
        const bankDetails = member.membershipData?.bankDetails || {};
        const genderMap = {
          male: 'Männlich',
          female: 'Weiblich',
          diverse: 'Divers',
          '': 'Nicht angegeben'
        };
        
        return [
          member.memberNumber || '',
          member.salutation || '',
          member.title || '',
          member.firstName || '',
          member.lastName || '',
          genderMap[member.gender] || 'Nicht angegeben',
          member.birthDate ? new Date(member.birthDate).toLocaleDateString('de-DE') : '',
          member.age !== null ? member.age.toString() : '',
          member.email || '',
          member.landline || '',
          member.mobile || '',
          member.website || '',
          member.status || '',
          member.address?.street || '',
          member.address?.zip || '',
          member.address?.city || '',
          member.address?.country || '',
          bankDetails.iban || '',
          bankDetails.bic || '',
          bankDetails.bankName || '',
          bankDetails.sepaActive ? 'Ja' : 'Nein',
          member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('de-DE') : '',
          new Date(member.created_at).toLocaleDateString('de-DE')
        ];
      });

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const fileName = `${orgType}_${organization.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      res.write('\uFEFF');
      res.write(csvContent);
      res.end();

      console.log(`✅ Exported ${members.length} members to CSV for org ${organization.id}: ${fileName}`);

    } catch (error) {
      console.error('❌ [EXPORT_MEMBERS_CSV] Error:', error);
      res.status(500).json({ 
        error: 'Failed to export members',
        details: error.message
      });
    }
  });

  // Autocomplete suggestions
  router.get('/suggestions', async (req, res) => {
    try {
      const { q: query, field = 'all', limit = 10 } = req.query;

      if (!query || query.length < 2) {
        return res.json({ suggestions: [] });
      }
      
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }

      let suggestions = [];
      const searchTerm = `%${query}%`;
      const orgCondition = { organizationId: organization.id };

      switch (field) {
        case 'firstName':
          suggestions = await Member.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('first_name')), 'value']],
            where: { 
              firstName: { [Op.iLike]: searchTerm },
              ...orgCondition 
            },
            limit: parseInt(limit),
            raw: true
          });
          break;

        case 'lastName':
          suggestions = await Member.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('last_name')), 'value']],
            where: { 
              lastName: { [Op.iLike]: searchTerm },
              ...orgCondition 
            },
            limit: parseInt(limit),
            raw: true
          });
          break;

        case 'email':
          suggestions = await Member.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('email')), 'value']],
            where: { 
              email: { [Op.iLike]: searchTerm },
              ...orgCondition 
            },
            limit: parseInt(limit),
            raw: true
          });
          break;

        case 'memberNumber':
          suggestions = await Member.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('member_number')), 'value']],
            where: { 
              memberNumber: { [Op.iLike]: searchTerm },
              ...orgCondition 
            },
            limit: parseInt(limit),
            raw: true
          });
          break;

        default:
          const [firstNames, lastNames, emails] = await Promise.all([
            Member.findAll({
              attributes: [[sequelize.fn('DISTINCT', sequelize.col('first_name')), 'value']],
              where: { 
                firstName: { [Op.iLike]: searchTerm },
                ...orgCondition 
              },
              limit: 3,
              raw: true
            }),
            Member.findAll({
              attributes: [[sequelize.fn('DISTINCT', sequelize.col('last_name')), 'value']],
              where: { 
                lastName: { [Op.iLike]: searchTerm },
                ...orgCondition 
              },
              limit: 3,
              raw: true
            }),
            Member.findAll({
              attributes: [[sequelize.fn('DISTINCT', sequelize.col('email')), 'value']],
              where: { 
                email: { [Op.iLike]: searchTerm },
                ...orgCondition 
              },
              limit: 4,
              raw: true
            })
          ]);

          suggestions = [
            ...firstNames.map(s => ({ ...s, type: 'firstName' })),
            ...lastNames.map(s => ({ ...s, type: 'lastName' })),
            ...emails.map(s => ({ ...s, type: 'email' }))
          ];
          break;
      }

      res.json({
        suggestions: suggestions.map(s => s.value || s).filter(Boolean).slice(0, parseInt(limit)),
        query,
        field
      });

    } catch (error) {
      console.error('❌ [MEMBER_SUGGESTIONS] Error:', error);
      res.status(500).json({ 
        error: 'Failed to get suggestions',
        details: error.message
      });
    }
  });

  return router;
}

module.exports = {
  defineMemberModel,
  setupMemberHooks,
  setupRoutes
};