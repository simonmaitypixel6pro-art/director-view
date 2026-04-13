import { NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tutorId = searchParams.get("tutorId")
    const subjectId = searchParams.get("subjectId")
    const attendanceFilter = searchParams.get("attendanceFilter")

    if (!tutorId || !subjectId) {
      return NextResponse.json(
        { success: false, error: "tutorId and subjectId required" },
        { status: 400 }
      )
    }

    const tutorIdNum = parseInt(tutorId)
    const subjectIdNum = parseInt(subjectId)
    const minAttendance = attendanceFilter ? parseInt(attendanceFilter) : 0

    console.log("[v0] Fetching question distribution for tutor", tutorIdNum, "subject", subjectIdNum, "min attendance:", minAttendance)

    // Fetch all 10 questions and their rating distribution with attendance filtering
    const distributionResult = await sql`
      WITH student_attendance AS (
        SELECT 
          tfq.student_id,
          ROUND((COUNT(DISTINCT CASE WHEN la.status = 'Present' THEN la.id END)::numeric / NULLIF(COUNT(DISTINCT l.id), 0)) * 100, 2) as attendance_percentage
        FROM tutor_feedback_questions tfq
        JOIN lectures l ON l.tutor_id = tfq.tutor_id AND l.subject_id = tfq.subject_id
        LEFT JOIN lecture_attendance la ON l.id = la.lecture_id AND la.student_id = tfq.student_id
        WHERE tfq.tutor_id = ${tutorIdNum} AND tfq.subject_id = ${subjectIdNum}
        GROUP BY tfq.student_id
      ),
      question_ratings AS (
        SELECT 
          'q1_teaching_style' as question_id,
          'How well does the tutor explain concepts in teaching?' as question_text,
          tfq.q1_teaching_style as rating
        FROM tutor_feedback_questions tfq
        JOIN student_attendance sa ON tfq.student_id = sa.student_id
        WHERE tfq.tutor_id = ${tutorIdNum} AND tfq.subject_id = ${subjectIdNum}
        AND sa.attendance_percentage >= ${minAttendance}
        
        UNION ALL
        SELECT 'q2_overcome_challenges', 'Does the tutor help students overcome challenges?', tfq.q2_overcome_challenges
        FROM tutor_feedback_questions tfq
        JOIN student_attendance sa ON tfq.student_id = sa.student_id
        WHERE tfq.tutor_id = ${tutorIdNum} AND tfq.subject_id = ${subjectIdNum}
        AND sa.attendance_percentage >= ${minAttendance}
        
        UNION ALL
        SELECT 'q3_learning_objectives', 'Are learning objectives clear and achievable?', tfq.q3_learning_objectives
        FROM tutor_feedback_questions tfq
        JOIN student_attendance sa ON tfq.student_id = sa.student_id
        WHERE tfq.tutor_id = ${tutorIdNum} AND tfq.subject_id = ${subjectIdNum}
        AND sa.attendance_percentage >= ${minAttendance}
        
        UNION ALL
        SELECT 'q4_real_world_examples', 'Does the tutor use real-world examples effectively?', tfq.q4_real_world_examples
        FROM tutor_feedback_questions tfq
        JOIN student_attendance sa ON tfq.student_id = sa.student_id
        WHERE tfq.tutor_id = ${tutorIdNum} AND tfq.subject_id = ${subjectIdNum}
        AND sa.attendance_percentage >= ${minAttendance}
        
        UNION ALL
        SELECT 'q5_measure_progress', 'Does the tutor help measure student progress?', tfq.q5_measure_progress
        FROM tutor_feedback_questions tfq
        JOIN student_attendance sa ON tfq.student_id = sa.student_id
        WHERE tfq.tutor_id = ${tutorIdNum} AND tfq.subject_id = ${subjectIdNum}
        AND sa.attendance_percentage >= ${minAttendance}
        
        UNION ALL
        SELECT 'q6_approachability', 'How approachable is the tutor for questions?', tfq.q6_approachability
        FROM tutor_feedback_questions tfq
        JOIN student_attendance sa ON tfq.student_id = sa.student_id
        WHERE tfq.tutor_id = ${tutorIdNum} AND tfq.subject_id = ${subjectIdNum}
        AND sa.attendance_percentage >= ${minAttendance}
        
        UNION ALL
        SELECT 'q7_well_prepared', 'Is the tutor well prepared for sessions?', tfq.q7_well_prepared
        FROM tutor_feedback_questions tfq
        JOIN student_attendance sa ON tfq.student_id = sa.student_id
        WHERE tfq.tutor_id = ${tutorIdNum} AND tfq.subject_id = ${subjectIdNum}
        AND sa.attendance_percentage >= ${minAttendance}
        
        UNION ALL
        SELECT 'q8_concept_understanding', 'Does the tutor ensure concept understanding?', tfq.q8_concept_understanding
        FROM tutor_feedback_questions tfq
        JOIN student_attendance sa ON tfq.student_id = sa.student_id
        WHERE tfq.tutor_id = ${tutorIdNum} AND tfq.subject_id = ${subjectIdNum}
        AND sa.attendance_percentage >= ${minAttendance}
        
        UNION ALL
        SELECT 'q9_resources_helpful', 'Are provided resources helpful?', tfq.q9_resources_helpful
        FROM tutor_feedback_questions tfq
        JOIN student_attendance sa ON tfq.student_id = sa.student_id
        WHERE tfq.tutor_id = ${tutorIdNum} AND tfq.subject_id = ${subjectIdNum}
        AND sa.attendance_percentage >= ${minAttendance}
        
        UNION ALL
        SELECT 'q10_recommendation_nps', 'How likely are you to recommend this tutor?', tfq.q10_recommendation_nps
        FROM tutor_feedback_questions tfq
        JOIN student_attendance sa ON tfq.student_id = sa.student_id
        WHERE tfq.tutor_id = ${tutorIdNum} AND tfq.subject_id = ${subjectIdNum}
        AND sa.attendance_percentage >= ${minAttendance}
      )
      SELECT 
        question_id,
        question_text,
        rating,
        COUNT(*) as count
      FROM question_ratings
      WHERE rating IS NOT NULL
      GROUP BY question_id, question_text, rating
      ORDER BY question_id, rating DESC
    `

    console.log("[v0] Distribution result rows:", distributionResult.rows.length)

    // Transform data into question-wise structure
    const questions: Record<string, any> = {}
    const questionOrder = [
      "q1_teaching_style",
      "q2_overcome_challenges",
      "q3_learning_objectives",
      "q4_real_world_examples",
      "q5_measure_progress",
      "q6_approachability",
      "q7_well_prepared",
      "q8_concept_understanding",
      "q9_resources_helpful",
      "q10_recommendation_nps"
    ]

    const questionLabels: Record<string, string> = {
      q1_teaching_style: "How well does the tutor explain concepts in teaching?",
      q2_overcome_challenges: "Does the tutor help students overcome challenges?",
      q3_learning_objectives: "Are learning objectives clear and achievable?",
      q4_real_world_examples: "Does the tutor use real-world examples effectively?",
      q5_measure_progress: "Does the tutor help measure student progress?",
      q6_approachability: "How approachable is the tutor for questions?",
      q7_well_prepared: "Is the tutor well prepared for sessions?",
      q8_concept_understanding: "Does the tutor ensure concept understanding?",
      q9_resources_helpful: "Are provided resources helpful?",
      q10_recommendation_nps: "How likely are you to recommend this tutor?"
    }

    // Initialize questions with rating distribution
    for (const qId of questionOrder) {
      questions[qId] = {
        id: qId,
        label: questionLabels[qId],
        ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        total: 0
      }
    }

    // Populate with actual data
    for (const row of distributionResult.rows) {
      const rating = parseInt(row.rating)
      if (questions[row.question_id]) {
        questions[row.question_id].ratings[rating as keyof typeof questions[string]['ratings']] = row.count
        questions[row.question_id].total += row.count
      }
    }

    // Calculate totals
    let totalResponses = 0
    for (const q of Object.values(questions)) {
      totalResponses = Math.max(totalResponses, q.total)
    }

    const distribution = questionOrder.map((qId) => questions[qId])

    console.log("[v0] Processed distribution for", distribution.length, "questions")

    return NextResponse.json({
      success: true,
      distribution,
      totalResponses
    })
  } catch (error: any) {
    console.error("[v0] Error fetching question distribution:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
