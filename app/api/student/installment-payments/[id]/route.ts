import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const installmentId = parseInt(params.id)
    const { transactionId } = await req.json()

    // Update installment status to paid
    const result = await query(
      `UPDATE fee_installments 
       SET status = 'paid', paid_at = NOW(), payment_transaction_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING plan_id`,
      [transactionId, installmentId]
    )

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Installment not found' }, { status: 404 })
    }

    const planId = result.rows[0].plan_id

    // Check if all installments are paid
    const checkResult = await query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid
       FROM fee_installments 
       WHERE plan_id = $1`,
      [planId]
    )

    const { total, paid } = checkResult.rows[0]

    // If all installments paid, update plan status
    if (total === paid) {
      await query(
        `UPDATE fee_installment_plans 
         SET status = 'completed', updated_at = NOW()
         WHERE id = $1`,
        [planId]
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Installment marked as paid',
      allPaid: total === paid
    })
  } catch (error) {
    console.error('[v0] Error updating installment:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
