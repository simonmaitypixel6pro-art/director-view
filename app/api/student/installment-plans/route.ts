import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { validateStudentAuth } from '@/lib/student-auth-server'

export async function GET(req: NextRequest) {
  try {
    // Validate student authentication
    const studentAuth = await validateStudentAuth(req)

    if (!studentAuth.success || !studentAuth.student) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const studentId = studentAuth.student.id

    // Get semester from query params (optional filter)
    const semester = req.nextUrl.searchParams.get('semester')

    // Get installment plans for student
    let plansQuery = `
      SELECT id, semester, fee_type, total_amount, plan_type, status 
      FROM fee_installment_plans 
      WHERE student_id = $1 AND status = 'approved'
    `

    const params: any[] = [studentId]

    if (semester) {
      plansQuery += ` AND semester = $2`
      params.push(parseInt(semester))
    }

    plansQuery += ` ORDER BY semester ASC`

    const plansResult = await query(plansQuery, params)
    const plans = plansResult.rows || []

    // Get installments for each plan
    const plansWithInstallments = await Promise.all(
      plans.map(async (plan: any) => {
        const installmentsResult = await query(
          `SELECT id, installment_number, amount, status, paid_at 
           FROM fee_installments 
           WHERE plan_id = $1
           ORDER BY installment_number ASC`,
          [plan.id]
        )
        return {
          ...plan,
          installments: installmentsResult.rows || []
        }
      })
    )

    return NextResponse.json({
      success: true,
      plans: plansWithInstallments
    })
  } catch (error) {
    console.error('[v0] Error fetching installment plans:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
