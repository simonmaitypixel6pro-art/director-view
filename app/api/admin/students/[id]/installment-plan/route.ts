import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const studentId = parseInt(params.id)
    const semester = parseInt(req.nextUrl.searchParams.get('semester') || '0')

    // Verify admin auth
    const adminAuth = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!adminAuth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the installment plan for this semester
    const planResult = await query(
      `SELECT id, semester, fee_type, total_amount, plan_type, status 
       FROM fee_installment_plans 
       WHERE student_id = $1 AND semester = $2 AND status = 'approved'`,
      [studentId, semester]
    )

    if (!planResult.rows || planResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 })
    }

    const plan = planResult.rows[0]

    // Fetch installments for this plan
    const installmentsResult = await query(
      `SELECT id, installment_number, amount, status, paid_at, due_date 
       FROM fee_installments 
       WHERE plan_id = $1
       ORDER BY installment_number ASC`,
      [plan.id]
    )

    return NextResponse.json({
      success: true,
      plan: {
        ...plan,
        installments: installmentsResult.rows || []
      }
    })
  } catch (error) {
    console.error('[v0] Error fetching plan details:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const studentId = parseInt(params.id)
    const { semester, feeType, planType, customAmounts } = await req.json()

    // Verify admin auth
    const adminAuth = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!adminAuth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Get student fee structure
    const studentResult = await query(
      `SELECT course_id FROM students WHERE id = $1`,
      [studentId]
    )

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 })
    }

    const courseId = studentResult.rows[0].course_id

    // Get fee amount from fee_structure
    const feeStructureResult = await query(
      `SELECT semester_fee, exam_fee 
       FROM fee_structure 
       WHERE course_id = $1 AND semester = $2`,
      [courseId, semester]
    )

    if (!feeStructureResult.rows || feeStructureResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Fee structure not found' }, { status: 404 })
    }

    const { semester_fee, exam_fee } = feeStructureResult.rows[0]
    let totalAmount = 0

    if (feeType === 'semester') totalAmount = Number(semester_fee)
    else if (feeType === 'exam') totalAmount = Number(exam_fee)
    else if (feeType === 'both') totalAmount = Number(semester_fee) + Number(exam_fee)

    // Create installment plan
    const planResult = await query(
      `INSERT INTO fee_installment_plans 
       (student_id, semester, fee_type, total_amount, plan_type, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, 'approved', NOW(), NOW())
       RETURNING id`,
      [studentId, semester, feeType, totalAmount, planType]
    )

    const planId = planResult.rows[0].id

    // Create individual installments
    let installmentAmounts: number[] = []

    if (planType === '2_installments') {
      installmentAmounts = [totalAmount / 2, totalAmount / 2]
    } else if (planType === '3_installments') {
      installmentAmounts = [totalAmount / 3, totalAmount / 3, totalAmount / 3]
    } else if (planType === 'custom' && customAmounts && Array.isArray(customAmounts)) {
      installmentAmounts = customAmounts
    }

    // Insert installments
    for (let i = 0; i < installmentAmounts.length; i++) {
      await query(
        `INSERT INTO fee_installments 
         (plan_id, installment_number, amount, status, created_at, updated_at) 
         VALUES ($1, $2, $3, 'pending', NOW(), NOW())`,
        [planId, i + 1, installmentAmounts[i]]
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Installment plan created successfully',
      planId,
      installmentCount: installmentAmounts.length,
    })
  } catch (error) {
    console.error('[v0] Error creating installment plan:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
