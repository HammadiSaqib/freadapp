const mysql = require('mysql2/promise');

async function addCardTypes() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('🏦 Adding new card types to database...\n');

    // First, let's check if we have any banks to associate cards with
    const [banks] = await connection.execute('SELECT * FROM banks WHERE is_active = 1 LIMIT 5');
    
    if (banks.length === 0) {
      console.log('❌ No active banks found. Creating sample banks first...');
      
      // Create sample banks
      const sampleBanks = [
        {
          bank_name: 'Chase Bank',
          bank_logo: 'https://logos-world.net/wp-content/uploads/2021/02/Chase-Logo.png',
          website: 'https://www.chase.com',
          phone: '1-800-935-9935'
        },
        {
          bank_name: 'Bank of America',
          bank_logo: 'https://logos-world.net/wp-content/uploads/2020/04/Bank-of-America-Logo.png',
          website: 'https://www.bankofamerica.com',
          phone: '1-800-432-1000'
        },
        {
          bank_name: 'Wells Fargo',
          bank_logo: 'https://logos-world.net/wp-content/uploads/2020/04/Wells-Fargo-Logo.png',
          website: 'https://www.wellsfargo.com',
          phone: '1-800-869-3557'
        },
        {
          bank_name: 'Capital One',
          bank_logo: 'https://logos-world.net/wp-content/uploads/2020/04/Capital-One-Logo.png',
          website: 'https://www.capitalone.com',
          phone: '1-800-227-4825'
        },
        {
          bank_name: 'American Express',
          bank_logo: 'https://logos-world.net/wp-content/uploads/2020/04/American-Express-Logo.png',
          website: 'https://www.americanexpress.com',
          phone: '1-800-528-4800'
        }
      ];

      for (const bank of sampleBanks) {
        await connection.execute(
          'INSERT INTO banks (bank_name, bank_logo, website, phone, is_active) VALUES (?, ?, ?, ?, ?)',
          [bank.bank_name, bank.bank_logo, bank.website, bank.phone, true]
        );
      }

      // Refresh banks list
      const [newBanks] = await connection.execute('SELECT * FROM banks WHERE is_active = 1');
      banks.push(...newBanks);
      console.log('✅ Created sample banks');
    }

    console.log(`📋 Found ${banks.length} active banks to associate cards with\n`);

    // Get bank IDs safely
    const bankIds = banks.map(bank => bank.id);
    console.log('Bank IDs available:', bankIds);

    // Personal Card Types
    const personalCards = [
      {
        card_name: 'Chase Freedom Unlimited',
        card_type: 'personal',
        funding_type: 'Credit Card',
        card_image: 'https://creditcards.chase.com/K-Marketplace/images/cardart/freedom_unlimited_card.png',
        card_link: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
        credit_bureaus: JSON.stringify(['Experian', 'Equifax', 'TransUnion']),
        bank_id: bankIds[0] || 1
      },
      {
        card_name: 'Personal Installment Loan',
        card_type: 'personal',
        funding_type: 'Loan',
        card_image: 'https://via.placeholder.com/300x190/1f4e79/ffffff?text=Personal+Loan',
        card_link: 'https://www.bankofamerica.com/loans/personal-loans/',
        credit_bureaus: JSON.stringify(['Experian', 'Equifax', 'TransUnion']),
        bank_id: bankIds[1] || bankIds[0] || 1
      },
      {
        card_name: 'Subprime Credit Builder',
        card_type: 'personal',
        funding_type: 'Sub Prime Lenders',
        card_image: 'https://via.placeholder.com/300x190/d32f2f/ffffff?text=Credit+Builder',
        card_link: 'https://www.creditone.com/credit-cards',
        credit_bureaus: JSON.stringify(['Experian', 'Equifax']),
        bank_id: bankIds[2] || bankIds[0] || 1
      },
      {
        card_name: 'Personal Line of Credit',
        card_type: 'personal',
        funding_type: 'Line of Credit',
        card_image: 'https://via.placeholder.com/300x190/388e3c/ffffff?text=Line+of+Credit',
        card_link: 'https://www.wellsfargo.com/personal-credit-line/',
        credit_bureaus: JSON.stringify(['Experian', 'Equifax', 'TransUnion']),
        bank_id: bankIds[2] || bankIds[0] || 1
      }
    ];

    // Business Card Types
    const businessCards = [
      {
        card_name: 'Chase Ink Business Preferred',
        card_type: 'business',
        funding_type: 'Credit Card',
        card_image: 'https://creditcards.chase.com/K-Marketplace/images/cardart/ink_business_preferred_card.png',
        card_link: 'https://creditcards.chase.com/business-credit-cards/ink/business-preferred',
        credit_bureaus: JSON.stringify(['Experian', 'Equifax']),
        bank_id: bankIds[0] || 1
      },
      {
        card_name: 'Business Term Loan',
        card_type: 'business',
        funding_type: 'Loan',
        card_image: 'https://via.placeholder.com/300x190/1565c0/ffffff?text=Business+Loan',
        card_link: 'https://www.bankofamerica.com/smallbusiness/loans-credit/business-loans/',
        credit_bureaus: JSON.stringify(['Experian', 'Equifax', 'TransUnion']),
        bank_id: bankIds[1] || bankIds[0] || 1
      },
      {
        card_name: 'SBA 7(a) Loan Program',
        card_type: 'business',
        funding_type: 'SBA Loan',
        card_image: 'https://via.placeholder.com/300x190/2e7d32/ffffff?text=SBA+Loan',
        card_link: 'https://www.sba.gov/funding-programs/loans/7a-loans',
        credit_bureaus: JSON.stringify(['Experian', 'Equifax', 'TransUnion']),
        bank_id: bankIds[2] || bankIds[0] || 1
      },
      {
        card_name: 'Business Cash Advance',
        card_type: 'business',
        funding_type: 'Merchant Cash Advance',
        card_image: 'https://via.placeholder.com/300x190/f57c00/ffffff?text=Cash+Advance',
        card_link: 'https://www.capitalone.com/small-business/merchant-services/',
        credit_bureaus: JSON.stringify(['Experian']),
        bank_id: bankIds[3] || bankIds[0] || 1
      },
      {
        card_name: 'Business Line of Credit',
        card_type: 'business',
        funding_type: 'Line of Credit',
        card_image: 'https://via.placeholder.com/300x190/7b1fa2/ffffff?text=Business+LOC',
        card_link: 'https://www.americanexpress.com/us/small-business/business-line-of-credit/',
        credit_bureaus: JSON.stringify(['Experian', 'Equifax']),
        bank_id: bankIds[4] || bankIds[0] || 1
      }
    ];

    // Insert Personal Cards
    console.log('💳 Adding Personal Cards:');
    for (const card of personalCards) {
      try {
        await connection.execute(
          `INSERT INTO cards (card_name, card_type, funding_type, card_image, card_link, credit_bureaus, bank_id, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [card.card_name, card.card_type, card.funding_type, card.card_image, card.card_link, card.credit_bureaus, card.bank_id, true]
        );
        console.log(`✅ Added: ${card.card_name} (${card.funding_type})`);
      } catch (error) {
        console.log(`❌ Failed to add ${card.card_name}: ${error.message}`);
      }
    }

    // Insert Business Cards
    console.log('\n🏢 Adding Business Cards:');
    for (const card of businessCards) {
      try {
        await connection.execute(
          `INSERT INTO cards (card_name, card_type, funding_type, card_image, card_link, credit_bureaus, bank_id, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [card.card_name, card.card_type, card.funding_type, card.card_image, card.card_link, card.credit_bureaus, card.bank_id, true]
        );
        console.log(`✅ Added: ${card.card_name} (${card.funding_type})`);
      } catch (error) {
        console.log(`❌ Failed to add ${card.card_name}: ${error.message}`);
      }
    }

    // Show summary
    const [cardCount] = await connection.execute('SELECT COUNT(*) as total FROM cards');
    const [personalCount] = await connection.execute('SELECT COUNT(*) as total FROM cards WHERE card_type = "personal"');
    const [businessCount] = await connection.execute('SELECT COUNT(*) as total FROM cards WHERE card_type = "business"');

    console.log('\n📊 Summary:');
    console.log(`Total Cards: ${cardCount[0].total}`);
    console.log(`Personal Cards: ${personalCount[0].total}`);
    console.log(`Business Cards: ${businessCount[0].total}`);

    // Show all cards by type
    console.log('\n📋 All Cards by Funding Type:');
    const [allCards] = await connection.execute(`
      SELECT c.card_name, c.card_type, c.funding_type, b.bank_name 
      FROM cards c 
      LEFT JOIN banks b ON c.bank_id = b.id 
      ORDER BY c.card_type, c.funding_type
    `);

    let currentType = '';
    allCards.forEach(card => {
      if (card.card_type !== currentType) {
        currentType = card.card_type;
        console.log(`\n${currentType.toUpperCase()} CARDS:`);
      }
      console.log(`  • ${card.card_name} (${card.funding_type}) - ${card.bank_name}`);
    });

  } catch (error) {
    console.error('❌ Error adding card types:', error);
  } finally {
    await connection.end();
  }
}

addCardTypes();