import { sql } from '@vercel/postgres';

async function addDirector() {
  try {
    console.log("Adding director user to database...");
    
    // Check if director already exists
    const existing = await sql`
      SELECT id FROM admins WHERE username = 'director' AND role = 'director'
    `;
    
    if (existing.rows.length > 0) {
      console.log("Director user already exists");
      return;
    }
    
    // Insert new director user
    const result = await sql`
      INSERT INTO admins (username, password, role, created_at)
      VALUES ('director', 'director123', 'director', NOW())
      RETURNING id, username, role
    `;
    
    console.log("Director user created successfully:", result.rows[0]);
  } catch (error) {
    console.error("Error adding director:", error);
    process.exit(1);
  }
}

addDirector();
