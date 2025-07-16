const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SecureWatch API',
      version: '1.0.0',
      description: 'Employee Security Monitoring System API - Comprehensive backend for monitoring employee security behavior and risk assessment',
      contact: {
        name: 'SecureWatch Team',
        email: 'admin@company.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'securewatch.session',
          description: 'Session-based authentication using secure cookies'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'name', 'role'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            role: {
              type: 'string',
              enum: ['admin', 'analyst', 'viewer'],
              description: 'User role determining access permissions'
            },
            department: {
              type: 'string',
              description: 'User department'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether user account is active'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        Employee: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique employee identifier'
            },
            name: {
              type: 'string',
              description: 'Employee full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Employee email address'
            },
            department: {
              type: 'string',
              description: 'Employee department'
            },
            jobTitle: {
              type: 'string',
              description: 'Employee job title'
            },
            photoUrl: {
              type: 'string',
              format: 'uri',
              description: 'Employee photo URL'
            },
            riskScore: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Risk score from 0-100'
            },
            riskLevel: {
              type: 'string',
              enum: ['Critical', 'High', 'Medium', 'Low'],
              description: 'Risk level classification'
            },
            lastActivity: {
              type: 'string',
              format: 'date-time',
              description: 'Last activity timestamp'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether employee is active'
            },
            violationCount: {
              type: 'integer',
              description: 'Total number of violations'
            },
            activeViolations: {
              type: 'integer',
              description: 'Number of active violations'
            }
          }
        },
        Violation: {
          type: 'object',
          required: ['employeeId', 'type', 'description'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique violation identifier'
            },
            employeeId: {
              type: 'integer',
              description: 'Associated employee ID'
            },
            type: {
              type: 'string',
              description: 'Type of violation'
            },
            severity: {
              type: 'string',
              enum: ['Critical', 'High', 'Medium', 'Low'],
              description: 'Violation severity level'
            },
            description: {
              type: 'string',
              description: 'Detailed violation description'
            },
            status: {
              type: 'string',
              enum: ['Active', 'Investigating', 'Resolved'],
              description: 'Current violation status'
            },
            evidence: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of evidence items'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Violation creation timestamp'
            },
            resolvedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Violation resolution timestamp'
            }
          }
        },
        EmployeeMetrics: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique metrics identifier'
            },
            employeeId: {
              type: 'integer',
              description: 'Associated employee ID'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Metrics date'
            },
            emailVolume: {
              type: 'integer',
              description: 'Number of emails sent/received'
            },
            externalContacts: {
              type: 'integer',
              description: 'Number of external contacts'
            },
            afterHoursActivity: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'After hours activity percentage'
            },
            dataTransfer: {
              type: 'number',
              format: 'float',
              description: 'Data transfer volume in GB'
            },
            securityEvents: {
              type: 'integer',
              description: 'Number of security events'
            },
            behaviorChange: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Behavior change percentage'
            }
          }
        },
        ChatMessage: {
          type: 'object',
          required: ['type', 'content'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique message identifier'
            },
            type: {
              type: 'string',
              enum: ['user', 'assistant'],
              description: 'Message type'
            },
            content: {
              type: 'string',
              description: 'Message content'
            },
            employeeId: {
              type: 'integer',
              description: 'Associated employee ID for context'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Message creation timestamp'
            },
            employee: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                email: { type: 'string' }
              }
            }
          }
        },
        DashboardMetrics: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                totalEmployees: { type: 'integer' },
                criticalRisk: { type: 'integer' },
                highRisk: { type: 'integer' },
                mediumRisk: { type: 'integer' },
                lowRisk: { type: 'integer' },
                totalViolations: { type: 'integer' },
                activeViolations: { type: 'integer' },
                criticalViolations: { type: 'integer' },
                recentActivity: { type: 'integer' }
              }
            },
            riskDistribution: {
              type: 'object',
              properties: {
                Critical: { type: 'integer' },
                High: { type: 'integer' },
                Medium: { type: 'integer' },
                Low: { type: 'integer' }
              }
            },
            departmentBreakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  department: { type: 'string' },
                  count: { type: 'integer' },
                  avgRiskScore: { type: 'string' }
                }
              }
            },
            trend: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', format: 'date' },
                  violations: { type: 'integer' },
                  avgSeverity: { type: 'string' }
                }
              }
            }
          }
        },
        Settings: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Setting key'
            },
            value: {
              type: 'object',
              description: 'Setting value (JSON object)'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last updated timestamp'
            }
          }
        },
        CompanyInfo: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Company name' },
            domain: { type: 'string', description: 'Company domain' },
            address: { type: 'string', description: 'Company address' },
            phone: { type: 'string', description: 'Company phone' },
            industry: { type: 'string', description: 'Company industry' },
            employeeCount: { type: 'integer', description: 'Number of employees' },
            logoUrl: { type: 'string', format: 'uri', description: 'Company logo URL' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password'
            }
          }
        },
        CreateUserRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            role: {
              type: 'string',
              enum: ['admin', 'analyst', 'viewer'],
              default: 'viewer',
              description: 'User role'
            },
            department: {
              type: 'string',
              description: 'User department'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', description: 'Current page number' },
            limit: { type: 'integer', description: 'Items per page' },
            total: { type: 'integer', description: 'Total number of items' },
            totalPages: { type: 'integer', description: 'Total number of pages' },
            hasNext: { type: 'boolean', description: 'Whether there is a next page' },
            hasPrev: { type: 'boolean', description: 'Whether there is a previous page' }
          }
        }
      }
    },
    security: [
      {
        sessionAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'Dashboard',
        description: 'Dashboard metrics and analytics'
      },
      {
        name: 'Employees',
        description: 'Employee management and data'
      },
      {
        name: 'Users',
        description: 'User administration (admin only)'
      },
      {
        name: 'Chat',
        description: 'AI security assistant chat'
      },
      {
        name: 'Settings',
        description: 'Application settings and configuration'
      },
      {
        name: 'Health',
        description: 'System health and status'
      }
    ]
  },
  apis: ['./src/routes/*.js', './server.js'] // Path to the API files
};

const specs = swaggerJsdoc(options);

module.exports = specs; 