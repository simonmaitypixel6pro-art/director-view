import { NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET(request: NextRequest) {
  try {
    console.log("[Setup] Starting director user setup...")

    // Check if director user already exists
    const existingDirector = await sql`
      SELECT id, username, role FROM admins WHERE username = 'director' AND role = 'director'
    `

    if (existingDirector.rows.length > 0) {
      console.log("[Setup] Director user already exists")
      return NextResponse.json({
        success: true,
        message: "Director user already exists",
        director: existingDirector.rows[0],
      })
    }

    // Add director user
    console.log("[Setup] Creating director user...")
    const result = await sql`
      INSERT INTO admins (username, password, role, created_at)
      VALUES ('director', 'director123', 'director', NOW())
      RETURNING id, username, role, created_at
    `

    console.log("[Setup] Director user created successfully")
    return NextResponse.json({
      success: true,
      message: "Director user created successfully",
      director: result.rows[0],
      credentials: {
        username: "director",
        password: "director123",
      },
    })
  } catch (error: any) {
    console.error("[Setup] Error:", error)
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to create director user",
      error: error.toString(),
    })
  }
}
