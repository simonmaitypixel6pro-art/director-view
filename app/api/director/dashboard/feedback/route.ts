import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    console.log("[Director] Fetching feedback analytics")

    // Tutor-wise average ratings
    const tutorFeedbackResult = await sql`
      SELECT 
        t.id, 
        t.full_name,
        s.id as subject_id, 
        s.name as subject_name,
        ROUND(AVG(tf.rating)::numeric, 2) as avg_rating,
        COUNT(tf.id) as feedback_count
      FROM tutor_feedback tf
      JOIN tutors t ON tf.tutor_id = t.id
      JOIN subjects s ON tf.subject_id = s.id
      GROUP BY t.id, t.full_name, s.id, s.name
      ORDER BY t.full_name, s.name
    `

    // Overall average by subject
    const subjectFeedbackResult = await sql`
      SELECT 
        s.id,
        s.name as subject_name,
        ROUND(AVG(tf.rating)::numeric, 2) as avg_rating,
        COUNT(tf.id) as feedback_count
      FROM tutor_feedback tf
      JOIN subjects s ON tf.subject_id = s.id
      GROUP BY s.id, s.name
      ORDER BY s.name
    `

    // Overall average by tutor
    const tutorOverallResult = await sql`
      SELECT 
        t.id,
        t.full_name,
        ROUND(AVG(tf.rating)::numeric, 2) as avg_rating,
        COUNT(tf.id) as feedback_count
      FROM tutor_feedback tf
      JOIN tutors t ON tf.tutor_id = t.id
      GROUP BY t.id, t.full_name
      ORDER BY avg_rating DESC, t.full_name
    `

    return NextResponse.json({
      success: true,
      feedback: {
        tutorWise: tutorFeedbackResult,
        subjectWise: subjectFeedbackResult,
        tutorOverall: tutorOverallResult,
      },
    })
  } catch (error: any) {
    console.error("[Director] Feedback fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch feedback data" },
      { status: 500 }
    )
  }
}
