import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAdminAuth } from '@/lib/admin-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request)
    if (!authResult.valid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const studentId = parseInt(params.id)
    if (isNaN(studentId)) {
      return NextResponse.json({ success: false, message: 'Invalid student ID' }, { status: 400 })
    }

    // Get fee structure for the student's course AND get student's current semester
    const studentResult = await query(
      `SELECT course_id, current_semester FROM students WHERE id = $1`,
      [studentId]
    )

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 })
    }

    const courseId = studentResult.rows[0].course_id
    const currentSemester = studentResult.rows[0].current_semester

    // Get fee structure ONLY up to current semester
    const feeStructureResult = await query(
      `SELECT semester, semester_fee, exam_fee 
       FROM fee_structure 
       WHERE course_id = $1 AND semester <= $2
       ORDER BY semester ASC`,
      [courseId, currentSemester]
    )

    const feeStructure = feeStructureResult.rows || []

    // Get payments from both fee_payments and online_fee_payments
    const feePaymentsResult = await query(
      `SELECT semester, fee_type, amount_paid as amount 
       FROM fee_payments 
       WHERE student_id = $1`,
      [studentId]
    )

    // Get successful online payments
    const onlinePaymentsResult = await query(
      `SELECT semester, fee_type, amount 
       FROM online_fee_payments 
       WHERE student_id = $1 AND status = 'SUCCESS'`,
      [studentId]
    )

    const feePayments = feePaymentsResult.rows || []
    const onlinePayments = onlinePaymentsResult.rows || []
    const payments = [...feePayments, ...onlinePayments]

    // Calculate semester-wise breakdown with installment plan info
    let totalFees = 0
    let totalPaid = 0
    let totalRemaining = 0

    // Fetch installment plans for this student
    const installmentPlansResult = await query(
      `SELECT id, semester, plan_type, status FROM fee_installment_plans WHERE student_id = $1 AND status = 'approved'`,
      [studentId]
    )
    const installmentPlans = installmentPlansResult.rows || []

    const semesterBreakdown = feeStructure.map((fs: any) => {
      const semester = fs.semester
      const semesterFee = parseFloat(fs.semester_fee) || 0
      const examFee = parseFloat(fs.exam_fee) || 0
      const totalFee = semesterFee + examFee

      const semesterPayments = payments.filter((p: any) => p.semester === semester)
      const totalPaidAmount = semesterPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)
      const remaining = Math.max(0, totalFee - totalPaidAmount)

      totalFees += totalFee
      totalPaid += totalPaidAmount
      totalRemaining += remaining

      // Check if installment plan exists for this semester
      const hasSplitPayment = installmentPlans.some(plan => plan.semester === semester)

      return {
        semester,
        totalFee: totalFee.toFixed(2),
        totalPaid: totalPaidAmount.toFixed(2),
        remaining: remaining.toFixed(2),
        status: totalPaidAmount >= totalFee ? 'Paid' : totalPaidAmount > 0 ? 'Partial' : 'Pending',
        hasSplitPayment,
      }
    })

    return NextResponse.json({
      success: true,
      totalFees: totalFees.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalRemaining: totalRemaining.toFixed(2),
      semesterBreakdown,
    })
  } catch (error) {
    console.error('[v0] Error fetching student fees:', error)
    console.error('[v0] Error type:', error instanceof Error ? error.name : typeof error)
    console.error('[v0] Error message:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
