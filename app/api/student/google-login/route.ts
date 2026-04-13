import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sql } from "@vercel/postgres"

// This endpoint handles Google OAuth callback
export async function POST(request: NextRequest) {
  try {
    const { googleId, email, name, picture } = await request.json()

    if (!googleId || !email) {
      return NextResponse.json(
        { success: false, message: "Google ID and email are required" },
        { status: 400 },
      )
    }

    console.log("[v0] Google OAuth login attempt for:", email)

    // Check if student exists with this Google ID
    let student = await sql`
      SELECT * FROM students WHERE google_id = ${googleId}
    `

    if (student.rows.length === 0) {
      // Try finding by email if Google ID not found
      student = await sql`
        SELECT * FROM students WHERE email = ${email}
      `

      if (student.rows.length === 0) {
        // No student found - return error asking them to contact admin or register
        return NextResponse.json(
          {
            success: false,
            message: "No student account found. Please use your enrollment number and password, or contact your administrator.",
            studentFound: false,
          },
          { status: 404 },
        )
      } else {
        // Student found by email - link Google ID to existing account
        const studentData = student.rows[0]
        await sql`
          UPDATE students 
          SET google_id = ${googleId}, auth_provider = 'google'
          WHERE id = ${studentData.id}
        `
        console.log("[v0] Linked Google ID to existing student account:", studentData.enrollment_number)
      }
    }

    const studentData = student.rows[0]

    // Set authentication cookies - use names that middleware expects
    const cookieStore = cookies()
    const sessionData = JSON.stringify({
      id: studentData.id,
      enrollment_number: studentData.enrollment_number,
      role: "student",
      auth_provider: "google",
      email: studentData.email,
    })

    // Set cookies with name the middleware checks for (student_token)
    cookieStore.set({
      name: "student_token",
      value: sessionData,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    })

    console.log("[v0] Student token cookie set for Google OAuth")

    const responseData = NextResponse.json({
      success: true,
      message: "Login successful",
      student: {
        id: studentData.id,
        full_name: studentData.full_name || studentData.name || "Student",
        enrollment_number: studentData.enrollment_number,
        course_id: studentData.course_id,
        email: studentData.email,
        current_semester: studentData.current_semester || 1,
        course_name: studentData.course_name || "Course",
      },
      credentials: {
        enrollment: studentData.enrollment_number,
        googleId: googleId,
      },
    })

    // Also set cookie on the response
    responseData.cookies.set({
      name: "student_token",
      value: sessionData,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    })

    console.log("[v0] Sending response with student_token cookie")
    return responseData
  } catch (error) {
    console.error("[v0] Google OAuth error:", error)
    return NextResponse.json(
      { success: false, message: "Authentication failed. Please try again." },
      { status: 500 },
    )
  }
}
