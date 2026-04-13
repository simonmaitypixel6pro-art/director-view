import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

// GET - Fetch feedback analytics and data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const attendanceThreshold = parseInt(searchParams.get("attendanceThreshold") || "0")

    if (action === "summary") {
      // Overall feedback summary - combines both legacy and 10-question feedback
      try {
        const summaryResult = await sql`
          WITH student_attendance AS (
            SELECT 
              tfq.student_id,
              ROUND((COUNT(DISTINCT CASE WHEN la.status = 'Present' THEN la.id END)::numeric / NULLIF(COUNT(DISTINCT l.id), 0)) * 100, 2) as attendance_percentage
            FROM tutor_feedback_questions tfq
            JOIN lectures l ON l.tutor_id = tfq.tutor_id AND l.subject_id = tfq.subject_id
            LEFT JOIN lecture_attendance la ON l.id = la.lecture_id AND la.student_id = tfq.student_id
            GROUP BY tfq.student_id
          ),
          all_feedback AS (
            SELECT student_id, rating as rating_value FROM tutor_feedback
            WHERE student_id IN (
              SELECT student_id FROM student_attendance WHERE attendance_percentage >= ${attendanceThreshold}
              UNION ALL
              SELECT student_id FROM students WHERE ${attendanceThreshold} = 0
            )
            UNION ALL
            SELECT student_id, overall_rating as rating_value FROM tutor_feedback_questions
            WHERE student_id IN (
              SELECT student_id FROM student_attendance WHERE attendance_percentage >= ${attendanceThreshold}
            )
          ),
          feedback_counts AS (
            SELECT 
              (SELECT COUNT(DISTINCT id) FROM students) as total_eligible_students,
              (SELECT COUNT(DISTINCT student_id) FROM all_feedback) as total_submitted,
              (SELECT COUNT(*) FROM all_feedback) as total_feedback_count,
              COALESCE((SELECT AVG(rating_value) FROM all_feedback), 0) as overall_avg_rating
          )
          SELECT 
            total_eligible_students,
            total_submitted,
            total_feedback_count,
            COALESCE(ROUND(total_submitted::numeric / NULLIF(total_eligible_students, 0) * 100, 2), 0) as completion_percentage,
            overall_avg_rating
          FROM feedback_counts
        `
        return NextResponse.json({ success: true, summary: summaryResult.rows[0] })
      } catch (tableError: any) {
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({
            success: true,
            summary: {
              total_eligible_students: 0,
              total_submitted: 0,
              total_feedback_count: 0,
              completion_percentage: 0,
              overall_avg_rating: 0
            }
          })
        }
        throw tableError
      }
    }

    if (action === "tutorwise") {
      // Tutor-wise breakdown - get all feedback (both legacy and 10-question) grouped by tutor and subject
      try {
        // First get all tutors with feedback from either table
        const tutorWiseResult = await sql`
          SELECT DISTINCT t.id, t.name
          FROM tutors t
          WHERE EXISTS (
            SELECT 1 FROM tutor_feedback tf WHERE tf.tutor_id = t.id
            UNION ALL
            SELECT 1 FROM tutor_feedback_questions tfq WHERE tfq.tutor_id = t.id
          )
          ORDER BY t.name
        `
        console.log("[v0] Tutorwise tutors found:", tutorWiseResult.rows.length)

        // For each tutor, get their subject feedback summaries from both tables
        const tutorData = await Promise.all(
          tutorWiseResult.rows.map(async (tutor: any) => {
            const subjectData = await sql`
              WITH student_attendance AS (
                SELECT 
                  tfq.student_id,
                  tfq.subject_id,
                  ROUND((COUNT(DISTINCT CASE WHEN la.status = 'Present' THEN la.id END)::numeric / NULLIF(COUNT(DISTINCT l.id), 0)) * 100, 2) as attendance_percentage
                FROM tutor_feedback_questions tfq
                JOIN lectures l ON l.tutor_id = tfq.tutor_id AND l.subject_id = tfq.subject_id
                LEFT JOIN lecture_attendance la ON l.id = la.lecture_id AND la.student_id = tfq.student_id
                WHERE tfq.tutor_id = ${tutor.id}
                GROUP BY tfq.student_id, tfq.subject_id
              ),
              all_subject_feedback AS (
                SELECT 
                  s.id,
                  s.name,
                  tf.student_id,
                  tf.rating as rating_value
                FROM tutor_feedback tf
                JOIN subjects s ON tf.subject_id = s.id
                LEFT JOIN student_attendance sa ON tf.student_id = sa.student_id AND tf.subject_id = sa.subject_id
                WHERE tf.tutor_id = ${tutor.id}
                AND COALESCE(sa.attendance_percentage, 100) >= ${attendanceThreshold}
                UNION ALL
                SELECT 
                  s.id,
                  s.name,
                  tfq.student_id,
                  tfq.overall_rating as rating_value
                FROM tutor_feedback_questions tfq
                JOIN subjects s ON tfq.subject_id = s.id
                LEFT JOIN student_attendance sa ON tfq.student_id = sa.student_id AND tfq.subject_id = sa.subject_id
                WHERE tfq.tutor_id = ${tutor.id}
                AND COALESCE(sa.attendance_percentage, 100) >= ${attendanceThreshold}
              )
              SELECT 
                id as subject_id,
                name as subject_name,
                COUNT(DISTINCT student_id) as feedback_count,
                ROUND(AVG(rating_value)::numeric, 2) as average_rating,
                COUNT(DISTINCT CASE WHEN rating_value >= 4 THEN student_id END) as positive_count
              FROM all_subject_feedback
              GROUP BY id, name
              ORDER BY name
            `
            return {
              id: tutor.id,
              name: tutor.name,
              subjects: subjectData.rows
            }
          })
        )

        console.log("[v0] Tutorwise data prepared:", tutorData.length, "tutors")
        return NextResponse.json({ success: true, tutorwise: tutorData })
      } catch (tableError: any) {
        console.error("[v0] Tutorwise query error:", tableError.message)
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, tutorwise: [] })
        }
        throw tableError
      }
    }

    if (action === "studentwise") {
      // Student-wise tracking grouped by course and semester - simplified approach
      try {
        // Get all course/semester combinations directly from students table
        const courseSemesterResult = await sql`
          SELECT DISTINCT
            st.course_id,
            st.current_semester as semester
          FROM students st
          ORDER BY st.course_id, st.current_semester
        `
        console.log("[v0] Course/Semester combinations found:", courseSemesterResult.rows.length)

        // For each course/semester, get all students and their feedback status
        const courseData = await Promise.all(
          courseSemesterResult.rows.map(async (cs: any) => {
            const studentsResult = await sql`
              SELECT 
                st.id,
                st.full_name as name,
                st.enrollment_number
              FROM students st
              WHERE st.course_id = ${cs.course_id}
              AND st.current_semester = ${cs.semester}
              ORDER BY st.full_name
            `

            // First, get ALL subjects in this course
            const courseSubjectsResult = await sql`
              SELECT DISTINCT id as subject_id
              FROM subjects
              WHERE course_id = ${cs.course_id}
            `
            const totalCourseSubjects = courseSubjectsResult.rows.length
            console.log("[v0] Course", cs.course_id, "has", totalCourseSubjects, "total subjects")

            // For each student in this course/semester, check if they gave feedback for ALL subjects
            const studentDetails = await Promise.all(
              studentsResult.rows.map(async (student: any) => {
                try {
                  // Get subjects this student has actually submitted feedback for
                  const feedbackSubjectsResult = await sql`
                    SELECT DISTINCT subject_id
                    FROM (
                      SELECT DISTINCT subject_id FROM tutor_feedback WHERE student_id = ${student.id}
                      UNION
                      SELECT DISTINCT subject_id FROM tutor_feedback_questions WHERE student_id = ${student.id}
                    ) as feedback_subjects
                    WHERE subject_id IN (SELECT id FROM subjects WHERE course_id = ${cs.course_id})
                  `

                  const subjectsWithFeedback = feedbackSubjectsResult.rows.length
                  console.log("[v0] Student", student.id, "gave feedback for", subjectsWithFeedback, "out of", totalCourseSubjects, "subjects")

                  // Only mark as submitted if they've given feedback for ALL course subjects
                  const allSubjectsCompleted = totalCourseSubjects > 0 && subjectsWithFeedback === totalCourseSubjects

                  return {
                    id: student.id,
                    name: student.name,
                    enrollment_number: student.enrollment_number,
                    feedback_submitted: allSubjectsCompleted
                  }
                } catch (studentError: any) {
                  console.error("[v0] Error processing student", student.id, ":", studentError.message)
                  return {
                    id: student.id,
                    name: student.name,
                    enrollment_number: student.enrollment_number,
                    feedback_submitted: false
                  }
                }
              })
            )

            const submitted_count = studentDetails.filter(s => s.feedback_submitted).length
            const total_students = studentDetails.length

            // Get course name if needed - optional query
            const courseName = cs.course_id ? `Course ${cs.course_id}` : "Unknown"

            return {
              course_id: cs.course_id,
              course_name: courseName,
              semester: cs.semester,
              submitted_count,
              total_students,
              not_submitted_count: total_students - submitted_count,
              students: studentDetails
            }
          })
        )

        console.log("[v0] Studentwise data prepared:", courseData.length, "course/semester groups")
        return NextResponse.json({ success: true, studentwise: courseData })
      } catch (tableError: any) {
        console.error("[v0] Studentwise query error:", tableError.message)
        return NextResponse.json({ success: true, studentwise: [] })
      }
    }

    if (action === "subjectfeedback") {
      // Get all students who gave feedback for a specific subject
      try {
        const tutorId = request.nextUrl.searchParams.get("tutorId")
        const subjectId = request.nextUrl.searchParams.get("subjectId")
        const tutorIdNum = tutorId ? parseInt(tutorId) : null
        const subjectIdNum = subjectId ? parseInt(subjectId) : null

        console.log("[v0] Subjectfeedback request - tutorId:", tutorId, "subjectId:", subjectId)

        if (!tutorIdNum || !subjectIdNum) {
          console.log("[v0] Missing tutorId or subjectId - tutorIdNum:", tutorIdNum, "subjectIdNum:", subjectIdNum)
          return NextResponse.json({ success: false, error: "Missing tutorId or subjectId" }, { status: 400 })
        }

        // Get feedback from both legacy and 10-question tables
        const feedbackResult = await sql`
          -- Legacy feedback
          SELECT 
            st.id,
            st.full_name as name,
            st.enrollment_number,
            tf.rating,
            tf.comments,
            'legacy' as feedback_type
          FROM tutor_feedback tf
          JOIN students st ON tf.student_id = st.id
          WHERE tf.tutor_id = ${tutorIdNum}
          AND tf.subject_id = ${subjectIdNum}
          
          UNION ALL
          
          -- 10-question feedback
          SELECT 
            st.id,
            st.full_name as name,
            st.enrollment_number,
            tfq.overall_rating as rating,
            tfq.comments,
            'ten_question' as feedback_type
          FROM tutor_feedback_questions tfq
          JOIN students st ON tfq.student_id = st.id
          WHERE tfq.tutor_id = ${tutorIdNum}
          AND tfq.subject_id = ${subjectIdNum}
          
          ORDER BY name
        `
        console.log("[v0] Subject feedback details found:", feedbackResult.rows.length, "records for tutor", tutorIdNum, "subject", subjectIdNum)
        return NextResponse.json({ success: true, feedbackDetails: feedbackResult.rows })
      } catch (tableError: any) {
        console.error("[v0] Subject feedback query error:", tableError.message)
        return NextResponse.json({ success: true, feedbackDetails: [] })
      }
    }

    if (action === "questionwise") {
      // Question-wise analytics for 10-question feedback
      try {
        const questionWiseResult = await sql`
          SELECT 
            t.id as tutor_id,
            t.full_name as tutor_name,
            s.id as subject_id,
            s.name as subject_name,
            COUNT(DISTINCT tfq.student_id) as total_responses,
            ROUND(AVG(tfq.overall_rating)::numeric, 2) as avg_overall_rating,
            ROUND(AVG(tfq.q1_teaching_style)::numeric, 2) as avg_q1_teaching_style,
            ROUND(AVG(tfq.q2_overcome_challenges)::numeric, 2) as avg_q2_overcome_challenges,
            ROUND(AVG(tfq.q3_learning_objectives)::numeric, 2) as avg_q3_learning_objectives,
            ROUND(AVG(tfq.q4_real_world_examples)::numeric, 2) as avg_q4_real_world_examples,
            ROUND(AVG(tfq.q5_measure_progress)::numeric, 2) as avg_q5_measure_progress,
            ROUND(AVG(tfq.q6_approachability)::numeric, 2) as avg_q6_approachability,
            ROUND(AVG(tfq.q7_well_prepared)::numeric, 2) as avg_q7_well_prepared,
            ROUND(AVG(tfq.q8_concept_understanding)::numeric, 2) as avg_q8_concept_understanding,
            ROUND(AVG(tfq.q9_resources_helpful)::numeric, 2) as avg_q9_resources_helpful,
            ROUND(AVG(tfq.q10_recommendation_nps)::numeric, 2) as avg_q10_recommendation_nps
          FROM tutor_feedback_questions tfq
          JOIN tutors t ON tfq.tutor_id = t.id
          JOIN subjects s ON tfq.subject_id = s.id
          GROUP BY t.id, t.full_name, s.id, s.name
          ORDER BY t.full_name, s.name
        `
        console.log("[v0] Question-wise analytics found:", questionWiseResult.rows.length, "tutor-subject combinations")
        return NextResponse.json({ success: true, questionwise: questionWiseResult.rows })
      } catch (tableError: any) {
        console.error("[v0] Question-wise analytics error:", tableError.message)
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, questionwise: [] })
        }
        throw tableError
      }
    }

    if (action === "withattendance") {
      // Get feedback filtered by attendance percentage
      try {
        const feedbackWithAttendance = await sql`
          SELECT DISTINCT
            tf.id,
            st.id as student_id,
            st.name as student_name,
            st.enrollment_number,
            t.id as tutor_id,
            t.name as tutor_name,
            s.id as subject_id,
            s.name as subject_name,
            c.name as course_name,
            s.semester,
            tf.rating,
            tf.comments,
            COALESCE(ROUND((COUNT(DISTINCT al.id)::numeric / NULLIF(COUNT(DISTINCT l.id), 0)) * 100, 2), 0) as attendance_percentage
          FROM tutor_feedback tf
          JOIN students st ON tf.student_id = st.id
          JOIN tutors t ON tf.tutor_id = t.id
          JOIN subjects s ON tf.subject_id = s.id
          JOIN courses c ON s.course_id = c.id
          LEFT JOIN lectures l ON s.id = l.subject_id
          LEFT JOIN attendance_logs al ON st.id = al.student_id AND l.id = al.lecture_id AND l.id IS NOT NULL
          GROUP BY tf.id, st.id, st.name, st.enrollment_number, t.id, t.name, s.id, s.name, c.name, s.semester, tf.rating, tf.comments
          HAVING COALESCE(ROUND((COUNT(DISTINCT al.id)::numeric / NULLIF(COUNT(DISTINCT l.id), 0)) * 100, 2), 0) >= ${attendanceThreshold}
          ORDER BY c.name, s.semester, st.name
        `
        console.log("[v0] Attendance filtered data found:", feedbackWithAttendance.rows.length)
        return NextResponse.json({ success: true, feedbackWithAttendance: feedbackWithAttendance.rows })
      } catch (tableError: any) {
        console.error("[v0] Attendance filter error:", tableError.message)
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, feedbackWithAttendance: [] })
        }
        throw tableError
      }
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Admin feedback GET error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// POST - Manage feedback period (start/end)
export async function POST(request: NextRequest) {
  try {
    const { action, adminId } = await request.json()

    if (action === "start") {
      // Start feedback period
      const result = await sql`
        INSERT INTO feedback_settings (is_active, started_at, created_by)
        VALUES (true, CURRENT_TIMESTAMP, ${adminId})
        ON CONFLICT DO NOTHING
        RETURNING *
      `
      return NextResponse.json({ success: true, settings: result.rows[0] })
    }

    if (action === "end") {
      // End feedback period
      const result = await sql`
        UPDATE feedback_settings 
        SET is_active = false, ended_at = CURRENT_TIMESTAMP
        WHERE is_active = true
        RETURNING *
      `
      return NextResponse.json({ success: true, settings: result.rows[0] })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Admin feedback POST error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
