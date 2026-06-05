const mysql = require('mysql2/promise');

async function createDemoTickets() {
  let connection;
  
  try {
    // Create MySQL connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db',
      port: 3306
    });
    
    console.log('🔌 Connected to MySQL database');
    
    // Get admin and client users (excluding super_admin)
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, role FROM users WHERE role IN ("admin", "user", "support") ORDER BY role, id'
    );
    
    console.log(`📊 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.first_name} ${user.last_name} (${user.email}) - Role: ${user.role}`);
    });
    
    if (users.length === 0) {
      console.log('❌ No admin or client users found. Please create some users first.');
      return;
    }
    
    // Get support users for assignment
    const supportUsers = users.filter(user => user.role === 'support');
    const clientUsers = users.filter(user => user.role === 'user');
    const adminUsers = users.filter(user => user.role === 'admin');
    
    console.log(`\n👥 User breakdown:`);
    console.log(`  - Support users: ${supportUsers.length}`);
    console.log(`  - Client users: ${clientUsers.length}`);
    console.log(`  - Admin users: ${adminUsers.length}`);
    
    // Demo tickets data
    const demoTickets = [
      // Client tickets
      {
        title: 'Unable to access credit report',
        description: 'I\'m having trouble accessing my credit report. The page keeps loading but never shows any data. I\'ve tried refreshing multiple times.',
        customer_id: clientUsers[0]?.id || users[0].id,
        priority: 'high',
        status: 'open',
        category: 'Technical',
        assignee_id: supportUsers[0]?.id || null,
        created_by: clientUsers[0]?.id || users[0].id,
        updated_by: clientUsers[0]?.id || users[0].id
      },
      {
        title: 'Billing question about subscription',
        description: 'I was charged twice this month for my subscription. Can someone please help me understand why this happened and process a refund?',
        customer_id: clientUsers[1]?.id || clientUsers[0]?.id || users[0].id,
        priority: 'medium',
        status: 'in_progress',
        category: 'Billing',
        assignee_id: supportUsers[1]?.id || supportUsers[0]?.id || null,
        created_by: clientUsers[1]?.id || clientUsers[0]?.id || users[0].id,
        updated_by: clientUsers[1]?.id || clientUsers[0]?.id || users[0].id
      },
      {
        title: 'Request for credit score improvement tips',
        description: 'My credit score has been stuck at 650 for months. I\'ve been paying all my bills on time. What else can I do to improve it?',
        customer_id: clientUsers[2]?.id || clientUsers[0]?.id || users[0].id,
        priority: 'low',
        status: 'resolved',
        category: 'General',
        assignee_id: supportUsers[0]?.id || null,
        created_by: clientUsers[2]?.id || clientUsers[0]?.id || users[0].id,
        updated_by: supportUsers[0]?.id || users[0].id
      },
      {
        title: 'Dispute letter template request',
        description: 'I need help creating a dispute letter for an incorrect item on my credit report. Do you have templates available?',
        customer_id: clientUsers[0]?.id || users[0].id,
        priority: 'medium',
        status: 'pending',
        category: 'General',
        assignee_id: null,
        created_by: clientUsers[0]?.id || users[0].id,
        updated_by: clientUsers[0]?.id || users[0].id
      },
      // Admin tickets
      {
        title: 'System performance issues',
        description: 'Users are reporting slow loading times across the platform. Database queries seem to be taking longer than usual.',
        customer_id: adminUsers[0]?.id || users[0].id,
        priority: 'urgent',
        status: 'open',
        category: 'Technical',
        assignee_id: supportUsers[0]?.id || null,
        created_by: adminUsers[0]?.id || users[0].id,
        updated_by: adminUsers[0]?.id || users[0].id
      },
      {
        title: 'Feature request: Bulk user import',
        description: 'We need the ability to import multiple users at once via CSV file. This would save significant time for onboarding new clients.',
        customer_id: adminUsers[0]?.id || users[0].id,
        priority: 'low',
        status: 'open',
        category: 'Feature Request',
        assignee_id: null,
        created_by: adminUsers[0]?.id || users[0].id,
        updated_by: adminUsers[0]?.id || users[0].id
      },
      {
        title: 'User account access issue',
        description: 'Client John Doe (john.doe@email.com) cannot log into his account. Password reset emails are not being received.',
        customer_id: adminUsers[0]?.id || users[0].id,
        priority: 'high',
        status: 'in_progress',
        category: 'Account',
        assignee_id: supportUsers[1]?.id || supportUsers[0]?.id || null,
        created_by: adminUsers[0]?.id || users[0].id,
        updated_by: supportUsers[1]?.id || supportUsers[0]?.id || users[0].id
      },
      {
        title: 'Monthly report generation failed',
        description: 'The automated monthly report for client analytics failed to generate. Error logs show database connection timeout.',
        customer_id: adminUsers[0]?.id || users[0].id,
        priority: 'medium',
        status: 'resolved',
        category: 'Technical',
        assignee_id: supportUsers[0]?.id || null,
        created_by: adminUsers[0]?.id || users[0].id,
        updated_by: supportUsers[0]?.id || users[0].id
      }
    ];
    
    console.log('\n🎫 Creating demo tickets...');
    
    // Insert tickets
    for (let i = 0; i < demoTickets.length; i++) {
      const ticket = demoTickets[i];
      
      const [result] = await connection.execute(
        `INSERT INTO tickets (title, description, customer_id, priority, status, category, assignee_id, created_by, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          ticket.title,
          ticket.description,
          ticket.customer_id,
          ticket.priority,
          ticket.status,
          ticket.category,
          ticket.assignee_id,
          ticket.created_by,
          ticket.updated_by
        ]
      );
      
      const ticketId = result.insertId;
      console.log(`  ✅ Created ticket #${ticketId}: "${ticket.title}" (${ticket.priority} priority, ${ticket.status})`);
      
      // Add some demo messages for a few tickets
      if (i < 3) {
        const messages = [
          {
            content: 'Thank you for contacting support. We have received your ticket and will respond within 24 hours.',
            author_id: supportUsers[0]?.id || users[0].id,
            author_type: 'support'
          },
          {
            content: 'I appreciate the quick response. Looking forward to resolving this issue.',
            author_id: ticket.customer_id,
            author_type: 'customer'
          }
        ];
        
        for (const message of messages) {
          await connection.execute(
            `INSERT INTO ticket_messages (ticket_id, content, author_id, author_type, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [ticketId, message.content, message.author_id, message.author_type]
          );
        }
        
        console.log(`    💬 Added ${messages.length} messages to ticket #${ticketId}`);
      }
    }
    
    // Get final count
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM tickets');
    const totalTickets = countResult[0].total;
    
    console.log(`\n🎉 Demo tickets created successfully!`);
    console.log(`📊 Total tickets in database: ${totalTickets}`);
    
  } catch (error) {
    console.error('❌ Error creating demo tickets:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

createDemoTickets();