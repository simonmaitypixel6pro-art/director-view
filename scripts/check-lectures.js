// Quick script to check what lecture dates exist
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkLectures() {
  try {
    // Check distinct dates in lectures table
    const result = await pool.query(`
      SELECT DISTINCT DATE(created_at) as lecture_date, COUNT(*) as count
      FROM lectures
      GROUP BY DATE(created_at)
      ORDER BY lecture_date DESC
      LIMIT 10
    `);

    console.log('Lectures exist on these dates:');
    result.rows.forEach(row => {
      console.log(`  ${row.lecture_date}: ${row.count} lectures`);
    });

    // Now test with a specific date
    const testDate = '2026-03-15';
    console.log(`\nTesting query for date: ${testDate}`);

    const testResult = await pool.query(`
      SELECT COUNT(*) as total_count
      FROM lectures l
      WHERE CAST(l.created_at AS DATE) = $1::DATE
    `, [testDate]);

    console.log(`Query result: ${testResult.rows[0].total_count} lectures found`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLectures();
