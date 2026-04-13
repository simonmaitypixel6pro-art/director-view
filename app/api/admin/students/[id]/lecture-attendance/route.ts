import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const studentId = params.id

    // Get student's course and current semester
    const student = await sql`
      SELECT course_id, current_semester
      FROM students
      WHERE id = ${studentId}
    `

    if (!student || student.length === 0) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
    }

    const { course_id, current_semester } = student[0]

    // Fetch lecture attendance for the student
    const attendance = await sql`
      SELECT 
        l.id,
        l.title,
        l.description,
        l.lecture_date,
        la.status,
        t.name as tutor_name,
        s.name as subject_name
      FROM lectures l
      JOIN subjects s ON l.subject_id = s.id
      JOIN tutors t ON l.tutor_id = t.id
      LEFT JOIN lecture_attendance la ON l.id = la.lecture_id AND la.student_id = ${studentId}
      WHERE s.course_id = ${course_id}
        AND s.semester = ${current_semester}
        AND (
          l.batch_id IS NULL
          OR l.batch_id IN (
            SELECT DISTINCT batch_id FROM batch_students 
            WHERE student_id = ${studentId}
          )
        )
      ORDER BY l.lecture_date DESC
    `

    const stats = {
      total: attendance.length,
      present: attendance.filter((a: any) => a.status === "Present").length,
      absent: attendance.filter((a: any) => a.status === "Absent").length,
      notMarked: attendance.filter((a: any) => a.status === null).length,
    }

    // Group attendance by subject
    const subjectWiseAttendance: any = {}
    attendance.forEach((record: any) => {
      if (!subjectWiseAttendance[record.subject_name]) {
        subjectWiseAttendance[record.subject_name] = {
          subject: record.subject_name,
          total: 0,
          present: 0,
          absent: 0,
          notMarked: 0,
          percentage: 0,
        }
      }
      subjectWiseAttendance[record.subject_name].total++
      if (record.status === "Present") {
        subjectWiseAttendance[record.subject_name].present++
      } else if (record.status === "Absent") {
        subjectWiseAttendance[record.subject_name].absent++
      } else {
        subjectWiseAttendance[record.subject_name].notMarked++
      }
    })

    // Calculate percentage for each subject
    Object.values(subjectWiseAttendance).forEach((subject: any) => {
      if (subject.total > 0) {
        subject.percentage = Math.round((subject.present / subject.total) * 100)
      }
    })

    return NextResponse.json({
      success: true,
      stats,
      attendance,
      subjectWiseAttendance: Object.values(subjectWiseAttendance)
    })
  } catch (error: any) {
    console.error("[Admin] Lecture attendance error:", error)
    return NextResponse.json({ success: false, message: "Failed to load lecture attendance" }, { status: 500 })
  }
}
