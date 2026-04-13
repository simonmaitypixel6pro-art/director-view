import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

// GET - Fetch feedback settings and student pending feedback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const action = searchParams.get("action")

    if (action === "settings") {
      // Get feedback settings
      try {
        const settingsResult = await sql`
          SELECT * FROM feedback_settings 
          ORDER BY created_at DESC 
          LIMIT 1
        `
        const settings = settingsResult.rows[0] || { is_active: false }
        return NextResponse.json({ success: true, settings })
      } catch (tableError: any) {
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, settings: { is_active: false } })
        }
        throw tableError
      }
    }

    if (action === "pending" && studentId) {
      // Get pending feedback subjects for student - based on their course and semester
      // Exclude both legacy feedback (tutor_feedback) and 10-question feedback (tutor_feedback_questions)
      try {
        // Get student's course and current semester
        const studentResult = await sql`
          SELECT course_id, current_semester FROM students WHERE id = ${studentId}
        `
        const student = studentResult.rows[0]
        
        if (!student?.course_id || !student?.current_semester) {
          return NextResponse.json({ success: true, pending: [] })
        }

        // Get all subjects for the student's course and semester with their assigned tutors
        // Exclude subjects where feedback already exists in either table
        const pendingResult = await sql`
          SELECT DISTINCT 
            s.id,
            s.name,
            t.id as tutor_id,
            t.name as tutor_name
          FROM subjects s
          INNER JOIN tutor_subjects ts ON s.id = ts.subject_id
          INNER JOIN tutors t ON ts.tutor_id = t.id
          WHERE s.course_id = ${student.course_id}
          AND s.semester = ${student.current_semester}
          AND NOT EXISTS (
            SELECT 1 FROM tutor_feedback tf
            WHERE tf.student_id = ${studentId}
            AND tf.subject_id = s.id
            AND tf.tutor_id = t.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM tutor_feedback_questions tfq
            WHERE tfq.student_id = ${studentId}
            AND tfq.subject_id = s.id
            AND tfq.tutor_id = t.id
          )
          ORDER BY s.name, t.name
        `
        console.log("[v0] Found", pendingResult.rows.length, "pending feedback items for student", studentId)
        return NextResponse.json({ success: true, pending: pendingResult.rows })
      } catch (tableError: any) {
        console.error("[v0] Pending feedback error:", tableError.message)
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, pending: [] })
        }
        throw tableError
      }
    }

    if (action === "submitted" && studentId) {
      // Get submitted feedback for student
      try {
        const submittedResult = await sql`
          SELECT 
            tf.id,
            tf.rating,
            tf.comments,
            s.name as subject_name,
            t.name as tutor_name,
            tf.submitted_at
          FROM tutor_feedback tf
          JOIN subjects s ON tf.subject_id = s.id
          JOIN tutors t ON tf.tutor_id = t.id
          WHERE tf.student_id = ${studentId}
          ORDER BY tf.submitted_at DESC
        `
        return NextResponse.json({ success: true, submitted: submittedResult.rows })
      } catch (tableError: any) {
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, submitted: [] })
        }
        throw tableError
      }
    }

    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("Feedback GET error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// POST - Submit feedback (supports both single rating and 10-question format)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      studentId,
      tutorId,
      subjectId,
      rating,
      comments,
      overall_rating,
      q1_teaching_style,
      q2_overcome_challenges,
      q3_learning_objectives,
      q4_real_world_examples,
      q5_measure_progress,
      q6_approachability,
      q7_well_prepared,
      q8_concept_understanding,
      q9_resources_helpful,
      q10_recommendation_nps,
    } = body

    // Validate basic input
    if (!studentId || !tutorId || !subjectId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if this is 10-question feedback or legacy single rating
    const isTenQuestionFeedback = q1_teaching_style !== undefined && overall_rating !== undefined

    if (!isTenQuestionFeedback && (!rating || rating < 1 || rating > 5)) {
      return NextResponse.json(
        { success: false, error: "Invalid rating" },
        { status: 400 }
      )
    }

    // Validate 10-question ratings
    if (isTenQuestionFeedback) {
      const questions = [
        q1_teaching_style,
        q2_overcome_challenges,
        q3_learning_objectives,
        q4_real_world_examples,
        q5_measure_progress,
        q6_approachability,
        q7_well_prepared,
        q8_concept_understanding,
        q9_resources_helpful,
        q10_recommendation_nps,
      ]

      for (const q of questions) {
        if (q < 1 || q > 5) {
          return NextResponse.json(
            { success: false, error: "All questions must be rated 1-5" },
            { status: 400 }
          )
        }
      }
    }

    // Check if feedback period is active
    try {
      const settingsResult = await sql`
        SELECT is_active FROM feedback_settings 
        ORDER BY created_at DESC 
        LIMIT 1
      `
      const settings = settingsResult.rows[0]
      if (!settings?.is_active) {
        return NextResponse.json(
          { success: false, error: "Feedback period is not active" },
          { status: 403 }
        )
      }
    } catch (tableError: any) {
      if (tableError.message?.includes("does not exist")) {
        return NextResponse.json(
          { success: false, error: "Feedback system not initialized" },
          { status: 503 }
        )
      }
      throw tableError
    }

    // Insert feedback based on format
    try {
      if (isTenQuestionFeedback) {
        // Insert 10-question feedback
        const result = await sql`
          INSERT INTO tutor_feedback_questions (
            student_id, tutor_id, subject_id,
            q1_teaching_style, q2_overcome_challenges, q3_learning_objectives,
            q4_real_world_examples, q5_measure_progress, q6_approachability,
            q7_well_prepared, q8_concept_understanding, q9_resources_helpful,
            q10_recommendation_nps, overall_rating, comments
          )
          VALUES (
            ${studentId}, ${tutorId}, ${subjectId},
            ${q1_teaching_style}, ${q2_overcome_challenges}, ${q3_learning_objectives},
            ${q4_real_world_examples}, ${q5_measure_progress}, ${q6_approachability},
            ${q7_well_prepared}, ${q8_concept_understanding}, ${q9_resources_helpful},
            ${q10_recommendation_nps}, ${overall_rating}, ${comments || null}
          )
          RETURNING *
        `
        
        console.log("[v0] 10-question feedback submitted for student", studentId, "tutor", tutorId)
        return NextResponse.json({
          success: true,
          feedback: result.rows[0],
          type: "ten_question",
        })
      } else {
        // Insert legacy single rating feedback
        const result = await sql`
          INSERT INTO tutor_feedback (student_id, tutor_id, subject_id, rating, comments)
          VALUES (${studentId}, ${tutorId}, ${subjectId}, ${rating}, ${comments || null})
          RETURNING *
        `
        
        console.log("[v0] Legacy feedback submitted for student", studentId, "tutor", tutorId)
        return NextResponse.json({
          success: true,
          feedback: result.rows[0],
          type: "legacy",
        })
      }
    } catch (tableError: any) {
      if (tableError.message?.includes("does not exist")) {
        return NextResponse.json(
          { success: false, error: "Feedback system not initialized" },
          { status: 503 }
        )
      }
      // Handle duplicate feedback error
      if (tableError.message?.includes("duplicate") || tableError.message?.includes("Unique")) {
        return NextResponse.json(
          { success: false, error: "Feedback already submitted for this tutor-subject pair" },
          { status: 409 }
        )
      }
      throw tableError
    }
  } catch (error: any) {
    console.error("[v0] Feedback POST error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
