
import { executeQuery, initializeMySQLPool } from '../database/mysqlConfig';

async function migrate() {
  try {
    await initializeMySQLPool();
    console.log('Checking if audio_url column exists in blog_posts...');
    
    const columns = await executeQuery<any[]>(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'blog_posts' 
      AND COLUMN_NAME = 'audio_url'
    `);

    if (columns.length === 0) {
      console.log('Adding audio_url column to blog_posts...');
      await executeQuery(`
        ALTER TABLE blog_posts 
        ADD COLUMN audio_url VARCHAR(500) AFTER featured_image
      `);
      console.log('Successfully added audio_url column.');
    } else {
      console.log('audio_url column already exists.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
