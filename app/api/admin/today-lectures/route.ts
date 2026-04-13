import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get("date")
    const courseParam = searchParams.get("course")
    const semesterParam = searchParams.get("semester")
    const batchParam = searchParams.get("batch")

    const selectedDate = dateParam || new Date().toISOString().split('T')[0]

    // First, get all unique courses and semesters from lectures for this date
    const coursesResult = await db.query(`
      SELECT DISTINCT 
        c.id,
        c.name,
        sub.semester
      FROM lectures l
      JOIN subjects sub ON l.subject_id = sub.id
      JOIN courses c ON sub.course_id = c.id
      WHERE DATE(l.created_at) = $1::date
      ORDER BY c.name, sub.semester
    `, [selectedDate])

    console.log("[v0] Courses query result:", coursesResult.rows.length, "rows")

    // Now fetch lectures with correct attendance counting
    let query = `
      SELECT 
        l.id,
        l.title,
        l.created_at,
        l.lecture_date,
        l.subject_id,
        l.tutor_id,
        l.batch_id,
        sub.name as subject_name,
        sub.semester,
        sub.course_id,
        c.name as course_name,
        t.name as tutor_name,
        -- Count ALL students in this course-semester
        COALESCE((SELECT COUNT(DISTINCT st.id) FROM students st WHERE st.course_id = sub.course_id AND st.current_semester = sub.semester), 0) as total_students,
        -- Count present students
        COALESCE(COUNT(DISTINCT CASE WHEN la.status = 'Present' THEN la.student_id END), 0) as present_count,
        -- Count absent students
        COALESCE(COUNT(DISTINCT CASE WHEN la.status = 'Absent' THEN la.student_id END), 0) as absent_count
      FROM lectures l
      LEFT JOIN subjects sub ON l.subject_id = sub.id
      LEFT JOIN courses c ON sub.course_id = c.id
      LEFT JOIN tutors t ON l.tutor_id = t.id
      LEFT JOIN lecture_attendance la ON l.id = la.lecture_id
      WHERE DATE(l.created_at) = $1::date
    `

    const params: any[] = [selectedDate]

    // Add course filter if provided
    if (courseParam && courseParam !== 'all') {
      query += ` AND sub.course_id = $${params.length + 1}`
      params.push(parseInt(courseParam))
    }

    // Add semester filter if provided
    if (semesterParam && semesterParam !== 'all') {
      query += ` AND sub.semester = $${params.length + 1}`
      params.push(parseInt(semesterParam))
    }

    // Add batch filter if provided
    if (batchParam && batchParam !== 'all') {
      query += ` AND l.batch_id = $${params.length + 1}`
      params.push(parseInt(batchParam))
    }

    query += `
      GROUP BY l.id, l.title, l.created_at, l.lecture_date, l.subject_id, l.tutor_id, l.batch_id, 
               sub.id, sub.name, sub.semester, sub.course_id, c.id, c.name, t.id, t.name
      ORDER BY l.created_at DESC
    `

    console.log("[v0] Query:", query)
    console.log("[v0] Params:", params)

    const result = await db.query(query, params)

    console.log("[v0] Lectures query result:", result.rows.length, "rows")

    // Group by course and semester
    const grouped = new Map<string, any>()

    result.rows.forEach((row: any) => {
      const key = `${row.course_id}_${row.semester}`

      if (!grouped.has(key)) {
        grouped.set(key, {
          course_name: row.course_name || 'Unassigned Course',
          course_id: row.course_id,
          semester: row.semester || 0,
          lecture_count: 0,
          lectures: []
        })
      }

      const group = grouped.get(key)
      group.lecture_count += 1

      // Calculate not_marked: total - present - absent
      const totalStudents = row.total_students || 0
      const presentCount = row.present_count || 0
      const absentCount = row.absent_count || 0
      const notMarkedCount = Math.max(0, totalStudents - presentCount - absentCount)

      group.lectures.push({
        id: row.id,
        title: row.title || 'Untitled Lecture',
        subject: row.subject_name || 'No Subject',
        tutor: row.tutor_name || 'No Tutor',
        created_at: row.created_at,
        attendance: {
          total: totalStudents,
          present: presentCount,
          absent: absentCount,
          not_marked: notMarkedCount
        }
      })
    })

    const lectureGroups = Array.from(grouped.values())
    const totalLectures = result.rows.length

    console.log("[v0] Final response:", { lectureGroups: lectureGroups.length, coursesData: coursesResult.rows.length })

    return NextResponse.json({
      success: true,
      data: lectureGroups,
      totalLectures,
      date: selectedDate,
      courses: coursesResult.rows.map(c => ({
        id: c.id,
        name: c.name,
        semester: c.semester,
        has_batch: false,
        batches: []
      }))
    })
  } catch (error) {
    console.error("[v0] Error fetching lectures:", error)
    return NextResponse.json({
      success: false,
      data: [],
      totalLectures: 0,
      courses: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}










