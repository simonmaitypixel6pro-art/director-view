import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    console.log("[Director] Fetching dashboard stats")

    // Total Students
    const studentsResult = await sql`
      SELECT COUNT(*) as count FROM students WHERE is_active = true
    `
    const totalStudents = parseInt(studentsResult[0]?.count || 0)

    // Total Tutors
    const tutorsResult = await sql`
      SELECT COUNT(*) as count FROM tutors WHERE is_active = true
    `
    const totalTutors = parseInt(tutorsResult[0]?.count || 0)

    // Today's Lectures
    const lecturesResult = await sql`
      SELECT COUNT(*) as count FROM lectures 
      WHERE DATE(scheduled_at) = CURRENT_DATE
    `
    const todayLectures = parseInt(lecturesResult[0]?.count || 0)

    // Active Exams (today)
    const examsResult = await sql`
      SELECT COUNT(*) as count FROM exams 
      WHERE DATE(exam_date) = CURRENT_DATE AND status = 'active'
    `
    const activeExams = parseInt(examsResult[0]?.count || 0)

    // Attendance Percentage
    const attendanceResult = await sql`
      SELECT 
        ROUND((COUNT(CASE WHEN status = 'Present' THEN 1 END)::numeric / 
        NULLIF(COUNT(*), 0)) * 100, 2) as percentage
      FROM lecture_attendance
    `
    const attendancePercentage = parseFloat(attendanceResult[0]?.percentage || 0)

    // Average Feedback Rating
    const feedbackResult = await sql`
      SELECT ROUND(AVG(rating)::numeric, 2) as avg_rating FROM tutor_feedback
    `
    const avgFeedbackRating = parseFloat(feedbackResult[0]?.avg_rating || 0)

    // Feedback submissions count
    const feedbackCountResult = await sql`
      SELECT COUNT(*) as count FROM tutor_feedback
    `
    const feedbackCount = parseInt(feedbackCountResult[0]?.count || 0)

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalTutors,
        todayLectures,
        activeExams,
        attendancePercentage,
        avgFeedbackRating,
        feedbackCount,
      },
    })
  } catch (error: any) {
    console.error("[Director] Stats fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
