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

  return Member;
}

// Setup Hooks for Member model
function setupMemberHooks(Member, Organization) {
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
}

// Routes definieren
function setupRoutes(models) {
  const { Member, Organization, sequelize } = models;

  // GET /api/members - List members with search, filter, sort, pagination
  router.get('/', async (req, res) => {
    try {
      console.log('📊 Members API called with query:', req.query);

      // Check Op availability
      if (!Op || !Op.or || !Op.iLike) {
        console.error('❌ Sequelize Op not available');
        throw new Error('Sequelize operators not available');
      }

      // Extract query parameters
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
        phone = ''
      } = req.query;

      // Pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const pageLimit = parseInt(limit);

      // Build where conditions
      const whereConditions = {};
      
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

      if (phone) {
        whereConditions.phone = { [Op.iLike]: `%${phone}%` };
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
            { phone: { [Op.iLike]: `%${search}%` } }
          ]
        };
      }

      // Combine conditions
      const finalWhereCondition = {
        ...whereConditions,
        ...searchCondition
      };

      // Validate and build sort order
      const validSortFields = ['firstName', 'lastName', 'email', 'memberNumber', 'status', 'created_at', 'joinedAt'];
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

      // Pagination metadata
      const totalPages = Math.ceil(count / pageLimit);
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      console.log(`✅ Retrieved ${members.length} of ${count} members`);

      res.json({
        members,
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
          phone
        },
        sorting: {
          sortBy: validSortField,
          sortOrder: validSortOrder
        },
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
      const [total, active, inactive, suspended] = await Promise.all([
        Member.count(),
        Member.count({ where: { status: 'active' } }),
        Member.count({ where: { status: 'inactive' } }),
        Member.count({ where: { status: 'suspended' } })
      ]);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const newMembersThisWeek = await Member.count({
        where: {
          created_at: {
            [Op.gte]: oneWeekAgo
          }
        }
      });

      const monthlyStats = await sequelize.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count
        FROM members 
        WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `, {
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
        monthlyGrowth: monthlyStats,
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
      const { firstName, lastName, email, phone, address, memberNumber, status = 'active', membershipData } = req.body;
      
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ 
          error: 'First name, last name, and email are required' 
        });
      }
      
      const organization = await Organization.findOne();
      if (!organization) {
        return res.status(400).json({ error: 'No organization configured' });
      }
      
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
      
      const createdMember = await Member.findByPk(member.id, {
        include: [{ 
          model: Organization,
          as: 'organization'
        }]
      });
      
      console.log(`✅ Member created: ${firstName} ${lastName} (${generatedMemberNumber})`);
      
      res.status(201).json(createdMember);
    } catch (error) {
      console.error('❌ [CREATE_MEMBER] Error:', error);
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

  // Update member
  router.put('/:id', async (req, res) => {
    try {
      const { firstName, lastName, email, phone, address, memberNumber, status, membershipData } = req.body;
      
      const member = await Member.findByPk(req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
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
        firstName,
        lastName,
        email,
        phone,
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
      
      console.log(`✅ Member updated: ${firstName} ${lastName}`);
      
      res.json(updatedMember);
    } catch (error) {
      console.error('❌ [UPDATE_MEMBER] Error:', error);
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
  router.delete('/:id', async (req, res) => {
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

      const allowedFields = ['status', 'phone', 'address'];
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
          }
        }
      });

      console.log(`✅ Bulk updated ${affectedCount} members`);

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

      const membersToDelete = await Member.findAll({
        where: {
          id: {
            [Op.in]: memberIds
          }
        },
        attributes: ['id', 'firstName', 'lastName', 'memberNumber']
      });

      const deletedCount = await Member.destroy({
        where: {
          id: {
            [Op.in]: memberIds
          }
        }
      });

      console.log(`✅ Bulk deleted ${deletedCount} members`);

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
      
      const whereConditions = {};
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

      const orgType = members[0]?.organization?.type || 'verein';
      const csvHeaders = [
        orgType === 'verein' ? 'Mitgliedsnummer' : 'Kundennummer',
        'Vorname',
        'Nachname', 
        'E-Mail',
        'Telefon',
        'Status',
        'Straße',
        'PLZ',
        'Stadt',
        'Land',
        orgType === 'verein' ? 'Mitglied seit' : 'Kunde seit',
        'Erstellt am'
      ];

      const csvRows = members.map(member => [
        member.memberNumber || '',
        member.firstName || '',
        member.lastName || '',
        member.email || '',
        member.phone || '',
        member.status || '',
        member.address?.street || '',
        member.address?.zip || '',
        member.address?.city || '',
        member.address?.country || '',
        member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('de-DE') : '',
        new Date(member.created_at).toLocaleDateString('de-DE')
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const fileName = `${orgType}_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      res.write('\uFEFF');
      res.write(csvContent);
      res.end();

      console.log(`✅ Exported ${members.length} members to CSV: ${fileName}`);

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

      let suggestions = [];
      const searchTerm = `%${query}%`;

      switch (field) {
        case 'firstName':
          suggestions = await Member.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('first_name')), 'value']],
            where: { firstName: { [Op.iLike]: searchTerm } },
            limit: parseInt(limit),
            raw: true
          });
          break;

        case 'lastName':
          suggestions = await Member.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('last_name')), 'value']],
            where: { lastName: { [Op.iLike]: searchTerm } },
            limit: parseInt(limit),
            raw: true
          });
          break;

        case 'email':
          suggestions = await Member.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('email')), 'value']],
            where: { email: { [Op.iLike]: searchTerm } },
            limit: parseInt(limit),
            raw: true
          });
          break;

        case 'memberNumber':
          suggestions = await Member.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('member_number')), 'value']],
            where: { memberNumber: { [Op.iLike]: searchTerm } },
            limit: parseInt(limit),
            raw: true
          });
          break;

        default:
          const [firstNames, lastNames, emails] = await Promise.all([
            Member.findAll({
              attributes: [[sequelize.fn('DISTINCT', sequelize.col('first_name')), 'value']],
              where: { firstName: { [Op.iLike]: searchTerm } },
              limit: 3,
              raw: true
            }),
            Member.findAll({
              attributes: [[sequelize.fn('DISTINCT', sequelize.col('last_name')), 'value']],
              where: { lastName: { [Op.iLike]: searchTerm } },
              limit: 3,
              raw: true
            }),
            Member.findAll({
              attributes: [[sequelize.fn('DISTINCT', sequelize.col('email')), 'value']],
              where: { email: { [Op.iLike]: searchTerm } },
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