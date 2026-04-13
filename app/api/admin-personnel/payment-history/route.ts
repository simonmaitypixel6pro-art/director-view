import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    // Get manual payments from fee_payments table
    const manualResult = await db.query(
      `SELECT 
        id,
        semester,
        fee_type as "feeType",
        amount_paid as amount,
        payment_date as "paymentDate",
        transaction_id as "transactionId",
        notes,
        created_at as "recordedAt",
        'manual' as "paymentSource"
       FROM fee_payments
       WHERE student_id = $1
       ORDER BY created_at DESC`,
      [studentId]
    )

    // Get successful online payments from online_fee_payments table
    const onlineResult = await db.query(
      `SELECT 
        id,
        semester,
        fee_type as "feeType",
        amount,
        created_at as "paymentDate",
        transaction_id as "transactionId",
        NULL as notes,
        created_at as "recordedAt",
        'online' as "paymentSource"
       FROM online_fee_payments
       WHERE student_id = $1
         AND status = 'SUCCESS'
       ORDER BY created_at DESC`,
      [studentId]
    )

    // Combine both payment sources
    const allPayments = [...manualResult.rows, ...onlineResult.rows].sort(
      (a: any, b: any) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    )

    const paymentHistory = allPayments.map((row: any) => ({
      id: row.id,
      semester: row.semester,
      feeType: row.feeType,
      amount: Number(row.amount),
      paymentDate: row.paymentDate,
      transactionId: row.transactionId,
      notes: row.notes,
      recordedAt: row.recordedAt,
      paymentSource: row.paymentSource,
    }))

    return NextResponse.json({ paymentHistory, success: true })
  } catch (error) {
    console.error("[v0] Admin-personnel payment history fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

