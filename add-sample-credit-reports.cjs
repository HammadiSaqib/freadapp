const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'creditrepair_db'
};

// Sample credit report data
const sampleCreditReports = [
  {
    client_id: 33,
    bureau: 'experian',
    report_date: '2024-01-15',
    credit_score: 650,
    status: 'completed',
    created_by: 9,
    updated_by: 9,
    report_data: JSON.stringify({
      personalInfo: {
        name: 'ALI BADI',
        address: '123 Main St, City, State 12345',
        ssn: '***-**-1234',
        dateOfBirth: '1985-05-15'
      },
      summary: {
        creditScore: 650,
        totalAccounts: 12,
        openAccounts: 8,
        closedAccounts: 4,
        totalBalance: 15420,
        totalCreditLimit: 25000,
        utilization: 61.7
      },
      accounts: [
        {
          id: 1,
          creditor: 'Chase Bank',
          accountNumber: '****1234',
          type: 'Credit Card',
          status: 'Open',
          balance: 2500,
          limit: 5000,
          utilization: 50,
          opened: '2020-03-15',
          paymentHistory: 'Current'
        },
        {
          id: 2,
          creditor: 'Bank of America',
          accountNumber: '****5678',
          type: 'Credit Card',
          status: 'Open',
          balance: 1200,
          limit: 3000,
          utilization: 40,
          opened: '2019-08-22',
          paymentHistory: 'Current'
        },
        {
          id: 3,
          creditor: 'Capital One',
          accountNumber: '****9012',
          type: 'Credit Card',
          status: 'Open',
          balance: 800,
          limit: 2000,
          utilization: 40,
          opened: '2021-01-10',
          paymentHistory: '30 days late'
        }
      ],
      inquiries: [
        {
          creditor: 'Wells Fargo',
          date: '2023-12-01',
          type: 'Hard Inquiry'
        },
        {
          creditor: 'Discover',
          date: '2023-11-15',
          type: 'Hard Inquiry'
        }
      ],
      publicRecords: [],
      negativeItems: [
        {
          creditor: 'Capital One',
          type: 'Late Payment',
          date: '2023-10-15',
          status: 'Verified'
        }
      ]
    })
  },
  {
    client_id: 33,
    bureau: 'equifax',
    report_date: '2024-01-15',
    credit_score: 645,
    status: 'completed',
    created_by: 9,
    updated_by: 9,
    report_data: JSON.stringify({
      personalInfo: {
        name: 'ALI BADI',
        address: '123 Main St, City, State 12345',
        ssn: '***-**-1234',
        dateOfBirth: '1985-05-15'
      },
      summary: {
        creditScore: 645,
        totalAccounts: 11,
        openAccounts: 7,
        closedAccounts: 4,
        totalBalance: 14800,
        totalCreditLimit: 24000,
        utilization: 61.7
      },
      accounts: [
        {
          id: 1,
          creditor: 'Chase Bank',
          accountNumber: '****1234',
          type: 'Credit Card',
          status: 'Open',
          balance: 2500,
          limit: 5000,
          utilization: 50,
          opened: '2020-03-15',
          paymentHistory: 'Current'
        },
        {
          id: 2,
          creditor: 'Bank of America',
          accountNumber: '****5678',
          type: 'Credit Card',
          status: 'Open',
          balance: 1200,
          limit: 3000,
          utilization: 40,
          opened: '2019-08-22',
          paymentHistory: 'Current'
        }
      ],
      inquiries: [
        {
          creditor: 'Wells Fargo',
          date: '2023-12-01',
          type: 'Hard Inquiry'
        }
      ],
      publicRecords: [],
      negativeItems: []
    })
  },
  {
    client_id: 33,
    bureau: 'transunion',
    report_date: '2024-01-15',
    credit_score: 655,
    status: 'completed',
    created_by: 9,
    updated_by: 9,
    report_data: JSON.stringify({
      personalInfo: {
        name: 'ALI BADI',
        address: '123 Main St, City, State 12345',
        ssn: '***-**-1234',
        dateOfBirth: '1985-05-15'
      },
      summary: {
        creditScore: 655,
        totalAccounts: 13,
        openAccounts: 9,
        closedAccounts: 4,
        totalBalance: 16200,
        totalCreditLimit: 26000,
        utilization: 62.3
      },
      accounts: [
        {
          id: 1,
          creditor: 'Chase Bank',
          accountNumber: '****1234',
          type: 'Credit Card',
          status: 'Open',
          balance: 2500,
          limit: 5000,
          utilization: 50,
          opened: '2020-03-15',
          paymentHistory: 'Current'
        },
        {
          id: 2,
          creditor: 'Bank of America',
          accountNumber: '****5678',
          type: 'Credit Card',
          status: 'Open',
          balance: 1200,
          limit: 3000,
          utilization: 40,
          opened: '2019-08-22',
          paymentHistory: 'Current'
        },
        {
          id: 3,
          creditor: 'Capital One',
          accountNumber: '****9012',
          type: 'Credit Card',
          status: 'Open',
          balance: 800,
          limit: 2000,
          utilization: 40,
          opened: '2021-01-10',
          paymentHistory: 'Current'
        },
        {
          id: 4,
          creditor: 'Citi Bank',
          accountNumber: '****3456',
          type: 'Credit Card',
          status: 'Open',
          balance: 1500,
          limit: 4000,
          utilization: 37.5,
          opened: '2018-06-20',
          paymentHistory: 'Current'
        }
      ],
      inquiries: [
        {
          creditor: 'Wells Fargo',
          date: '2023-12-01',
          type: 'Hard Inquiry'
        },
        {
          creditor: 'Discover',
          date: '2023-11-15',
          type: 'Hard Inquiry'
        },
        {
          creditor: 'American Express',
          date: '2023-10-20',
          type: 'Hard Inquiry'
        }
      ],
      publicRecords: [],
      negativeItems: []
    })
  }
];

async function addSampleCreditReports() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    console.log('🗑️ Clearing existing credit reports for client 33...');
    await connection.execute('DELETE FROM credit_reports WHERE client_id = ?', [33]);
    console.log('✅ Cleared existing credit reports');

    console.log('📊 Adding sample credit reports...');
    
    for (const report of sampleCreditReports) {
      const query = `
        INSERT INTO credit_reports 
        (client_id, bureau, report_date, credit_score, status, created_by, updated_by, report_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        report.client_id,
        report.bureau,
        report.report_date,
        report.credit_score,
        report.status,
        report.created_by,
        report.updated_by,
        report.report_data
      ];
      
      await connection.execute(query, values);
      console.log(`✅ Added ${report.bureau} credit report for client ${report.client_id}`);
    }

    console.log('🎉 Successfully added all sample credit reports!');
    
    // Verify the data was inserted
    console.log('🔍 Verifying inserted data...');
    const [rows] = await connection.execute(
      'SELECT id, client_id, bureau, credit_score, report_date, status FROM credit_reports WHERE client_id = ? ORDER BY bureau',
      [33]
    );
    
    console.log('📋 Inserted credit reports:');
    rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Bureau: ${row.bureau}, Score: ${row.credit_score}, Date: ${row.report_date}, Status: ${row.status}`);
    });

  } catch (error) {
    console.error('❌ Error adding sample credit reports:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
addSampleCreditReports()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });