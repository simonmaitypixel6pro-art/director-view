import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAccountsPersonnelAuth } from "@/lib/accounts-personnel-auth"

export async function GET(request: Request) {
  try {
    const authResult = await verifyAccountsPersonnelAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 })
    }

    // Get all payment history for the student from manual payments
    const manualPayments = await sql`
      SELECT 
        id,
        semester,
        fee_type,
        amount_paid,
        payment_date,
        transaction_id,
        notes,
        created_at,
        'manual' as payment_source
      FROM fee_payments
      WHERE student_id = ${studentId}
      ORDER BY payment_date DESC, created_at DESC
    `

    // Get all successful online payments for the student
    const onlinePayments = await sql`
      SELECT 
        id,
        semester,
        fee_type,
        amount as amount_paid,
        created_at as payment_date,
        transaction_id,
        NULL as notes,
        created_at,
        'online' as payment_source
      FROM online_fee_payments
      WHERE student_id = ${studentId}
        AND status = 'SUCCESS'
      ORDER BY created_at DESC
    `

    // Combine and sort both payment sources
    const allPayments = [...manualPayments, ...onlinePayments].sort((a: any, b: any) => {
      const dateA = new Date(a.payment_date || a.created_at).getTime()
      const dateB = new Date(b.payment_date || b.created_at).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      paymentHistory: allPayments.map((row: any) => ({
        id: row.id,
        semester: row.semester,
        feeType: row.fee_type,
        amount: Number(row.amount_paid),
        paymentDate: row.payment_date,
        transactionId: row.transaction_id,
        notes: row.notes,
        recordedAt: row.created_at,
        paymentSource: row.payment_source,
      })),
      success: true,
    })
  } catch (error) {
    console.error("[v0] Payment history fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
