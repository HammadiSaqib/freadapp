import mysql from 'mysql2/promise';

async function checkCourses() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('Connected to MySQL database');
    
    const [courses] = await connection.execute('SELECT * FROM courses');
    console.log('Courses in database:', JSON.stringify(courses, null, 2));
    
    const [chapters] = await connection.execute('SELECT * FROM course_chapters');
    console.log('Course chapters in database:', JSON.stringify(chapters, null, 2));
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCourses();