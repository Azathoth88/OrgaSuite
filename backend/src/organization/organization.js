const express = require('express');
const { DataTypes } = require('sequelize');
const { validateIBANWithLogging } = require('../utils/ibanUtils');

// Router erstellen
const router = express.Router();

// Organization Model Definition
function defineOrganizationModel(sequelize) {
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

  return Organization;
}

// Enhance organization data with default configuration
function enhanceOrgDataWithConfig(orgData, orgType) {
  const defaultConfig = {
    membershipConfig: {
      statuses: [
        { 
          key: 'active', 
          label: orgType === 'verein' ? 'Aktives Mitglied' : 'Aktiver Kunde', 
          color: 'green', 
          default: true,
          description: orgType === 'verein' 
            ? 'Vollwertige Mitgliedschaft mit allen Rechten' 
            : 'Aktiver Kunde mit vollem Zugang',
          billing: {
            fee: orgType === 'verein' ? 50.00 : 120.00,
            frequency: orgType === 'verein' ? 'yearly' : 'monthly',
            dueDay: 1,
            active: true
          }
        },
        { 
          key: 'inactive', 
          label: orgType === 'verein' ? 'Inaktives Mitglied' : 'Inaktiver Kunde',
          color: 'gray',
          description: orgType === 'verein' 
            ? 'Mitgliedschaft ruht temporär' 
            : 'Kunde pausiert temporär',
          billing: {
            fee: 0.00,
            frequency: 'yearly',
            dueDay: 1,
            active: false
          }
        },
        { 
          key: 'premium', 
          label: orgType === 'verein' ? 'Premium-Mitglied' : 'Premium-Kunde',
          color: 'purple',
          description: orgType === 'verein' 
            ? 'Mitgliedschaft mit erweiterten Leistungen' 
            : 'Premium-Kunde mit besonderen Konditionen',
          billing: {
            fee: orgType === 'verein' ? 100.00 : 250.00,
            frequency: 'yearly',
            dueDay: 1,
            active: true
          }
        },
        { 
          key: 'suspended', 
          label: orgType === 'verein' ? 'Gesperrtes Mitglied' : 'Gesperrter Kunde',
          color: 'red',
          description: orgType === 'verein' 
            ? 'Mitgliedschaft ist gesperrt' 
            : 'Kunde ist gesperrt',
          billing: {
            fee: 0.00,
            frequency: 'yearly',
            dueDay: 1,
            active: false
          }
        }
      ],
      defaultCurrency: 'EUR'
    },
    generalConfig: {
      dateFormat: 'DD.MM.YYYY',
      timeZone: 'Europe/Berlin',
      currency: 'EUR'
    }
  };
  
  return {
    ...orgData,
    settings: defaultConfig
  };
}

// Routes definieren
function setupRoutes(models) {
  const { Organization } = models;

  // Get current organization
  router.get('/', async (req, res) => {
    try {
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
      console.error('❌ [GET_ORGANIZATION] Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch organization',
        details: error.message
      });
    }
  });

  // Create/update organization
  router.post('/', async (req, res) => {
    try {
      const { name, type, taxNumber, address, settings, bankDetails } = req.body;
      
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
        
        validatedBankDetails = {
          ...bankDetails,
          iban: ibanValidation.formatted,
          ibanCountryCode: ibanValidation.countryCode,
          ibanBankCode: ibanValidation.bankCode,
          ibanValidatedAt: new Date().toISOString()
        };
      }
      
      let organization = await Organization.findOne();
      
      if (organization) {
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
      console.error('❌ [SAVE_ORGANIZATION] Error:', error);
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

  // Get organization types
  router.get('/types', (req, res) => {
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

  // Setup demo organization (moved from main server.js)
  router.post('/setup-demo', async (req, res) => {
    try {
      const { orgType = 'verein' } = req.body;
      const { Member } = models;
      
      const existingOrg = await Organization.findOne();
      if (existingOrg) {
        return res.status(400).json({ error: 'Organization already exists' });
      }

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
            iban: 'DE89370400440532013000',
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
            iban: 'DE12500105170648489890',
            bic: 'INGDDEFFXXX',
            bankName: 'ING-DiBa AG'
          }
        }
      };

      // Enhance with configuration
      let selectedOrgData = enhanceOrgDataWithConfig(orgData[orgType], orgType);
      
      if (selectedOrgData.bankDetails?.iban) {
        const ibanValidation = validateIBANWithLogging(selectedOrgData.bankDetails.iban, `Demo_${orgType}`);
        
        if (!ibanValidation.isValid) {
          console.warn(`⚠️ Demo IBAN for ${orgType} is invalid: ${ibanValidation.error}`);
          delete selectedOrgData.bankDetails.iban;
        } else {
          selectedOrgData.bankDetails.iban = ibanValidation.formatted;
          selectedOrgData.bankDetails.ibanCountryCode = ibanValidation.countryCode;
          selectedOrgData.bankDetails.ibanBankCode = ibanValidation.bankCode;
          selectedOrgData.bankDetails.ibanValidatedAt = new Date().toISOString();
        }
      }

      const org = await Organization.create(selectedOrgData);

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
                iban: 'DE89370400440532013001',
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
        configurationCreated: !!org.settings?.membershipConfig,
        features: {
          ibanValidation: true,
          memberData: true,
          addressData: true,
          membershipConfig: true
        }
      });
    } catch (error) {
      console.error('❌ [SETUP_DEMO] Error:', error);
      res.status(500).json({ 
        error: 'Failed to setup demo',
        details: error.message 
      });
    }
  });

  // IBAN validation endpoint
  router.post('/validate-iban', (req, res) => {
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
      console.error('❌ [VALIDATE_IBAN] Error:', error);
      res.status(500).json({ 
        error: 'Failed to validate IBAN',
        details: error.message
      });
    }
  });

  return router;
}

module.exports = {
  defineOrganizationModel,
  enhanceOrgDataWithConfig,
  setupRoutes
};