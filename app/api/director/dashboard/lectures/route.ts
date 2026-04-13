import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const dateStr = request.nextUrl.searchParams.get("date")
    
    if (!dateStr) {
      return NextResponse.json(
        { success: false, message: "Date parameter is required" },
        { status: 400 }
      )
    }

    console.log("[Director] Fetching lectures for date:", dateStr)

    const result = await sql`
      SELECT 
        l.id, 
        l.subject_id, 
        s.name as subject_name, 
        s.course_id,
        s.semester, 
        l.tutor_id, 
        t.full_name as tutor_name,
        c.name as course_name, 
        l.scheduled_at,
        l.status
      FROM lectures l
      JOIN subjects s ON l.subject_id = s.id
      JOIN tutors t ON l.tutor_id = t.id
      JOIN courses c ON s.course_id = c.id
      WHERE DATE(l.scheduled_at) = ${dateStr}::date
      ORDER BY c.name, s.semester, s.name, l.scheduled_at
    `

    // Group by course and semester
    const grouped = (result as any[]).reduce((acc: any, lecture: any) => {
      const courseKey = lecture.course_name
      const semesterKey = `${lecture.course_name} - Semester ${lecture.semester}`

      if (!acc[courseKey]) {
        acc[courseKey] = {
          course: lecture.course_name,
          semesters: {},
        }
      }

      if (!acc[courseKey].semesters[semesterKey]) {
        acc[courseKey].semesters[semesterKey] = {
          semester: lecture.semester,
          lectures: [],
        }
      }

      acc[courseKey].semesters[semesterKey].lectures.push(lecture)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      date: dateStr,
      totalLectures: result.length,
      data: grouped,
    })
  } catch (error: any) {
    console.error("[Director] Lectures fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch lectures" },
      { status: 500 }
    )
  }
}
