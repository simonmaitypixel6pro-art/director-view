import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { decryptCCAvenue } from '@/lib/ccavenue-util';

const CCAVENUE_WORKING_KEY = process.env.CCAVENUE_WORKING_KEY || '';

export async function POST(request: NextRequest) {
  console.log('[v0] ===== PAYMENT CALLBACK RECEIVED =====');

  try {
    // Read the raw body
    const body = await request.text();
    console.log('[v0] Request body length:', body.length);

    // Parse encResp from the body
    const params = new URLSearchParams(body);
    const encResp = params.get('encResp');

    if (!encResp) {
      console.error('[v0] ERROR: No encResp in request body');
      return NextResponse.json({ error: 'No encResp provided' }, { status: 400 });
    }

    console.log('[v0] Found encResp, length:', encResp.length);

    // Decrypt the response
    let decrypted: string;
    try {
      decrypted = decryptCCAvenue(encResp, CCAVENUE_WORKING_KEY);
      console.log('[v0] Decryption successful, length:', decrypted.length);
      console.log('[v0] Decrypted content:', decrypted.substring(0, 300));
    } catch (decryptError) {
      console.error('[v0] Decryption failed:', decryptError);
      return NextResponse.json({ error: 'Decryption failed' }, { status: 400 });
    }

    // Parse the decrypted response
    const responseParams = new URLSearchParams(decrypted);
    const orderId = responseParams.get('order_id') || '';
    const orderStatus = (responseParams.get('order_status') || '').toUpperCase();
    const trackingId = responseParams.get('tracking_id') || '';
    const bankRefNo = responseParams.get('bank_ref_no') || '';
    const amount = parseFloat(responseParams.get('amount') || '0');
    const authDesc = responseParams.get('auth_desc') || '';

    // Extract merchant params
    const studentId = responseParams.get('merchant_param1') || '';
    const semester = parseInt(responseParams.get('merchant_param3') || '0');
    const feeType = responseParams.get('merchant_param4') || '';

    console.log('[v0] Payment details:', {
      orderId,
      orderStatus,
      trackingId,
      studentId,
      semester,
      feeType,
      amount,
      authDesc,
    });

    // Determine payment status
    let paymentStatus = 'FAILED';
    if (orderStatus === 'SUCCESS' || authDesc === 'Approved') {
      paymentStatus = 'SUCCESS';
    } else if (orderStatus === 'PENDING') {
      paymentStatus = 'PENDING';
    }

    console.log('[v0] All parsed values:', {
      orderId: `"${orderId}"`,
      studentId: `"${studentId}"`,
      semester: semester,
      feeType: `"${feeType}"`,
      amount: amount,
      trackingId: `"${trackingId}"`,
      bankRefNo: `"${bankRefNo}"`,
      paymentStatus: `"${paymentStatus}"`,
      orderStatus: `"${orderStatus}"`,
      authDesc: `"${authDesc}"`,
    });

    // Save/update payment record
    try {
      console.log('[v0] Saving payment record with status:', paymentStatus);
      console.log('[v0] INSERT values:', [studentId, semester, feeType, amount, paymentStatus, orderId, trackingId, bankRefNo]);

      // Check if record exists
      let existingResult;
      try {
        existingResult = await query(
          `SELECT id FROM online_fee_payments WHERE reference_id = $1`,
          [orderId]
        );
      } catch (checkError) {
        console.log('[v0] Table may not exist yet, will attempt INSERT:', checkError);
        existingResult = { rows: [] };
      }

      const records = existingResult?.rows || [];
      const exists = records.length > 0;
      console.log('[v0] Check existing - found:', exists, 'records:', records.length);

      if (exists) {
        console.log('[v0] Updating existing record...');
        const updateResult = await query(
          `UPDATE online_fee_payments 
           SET status = $1, transaction_id = $2, bank_ref_no = $3, updated_at = NOW()
           WHERE reference_id = $4`,
          [paymentStatus, trackingId, bankRefNo, orderId]
        );
        console.log('[v0] Update result:', updateResult);
        console.log('[v0] Updated existing payment record');
      } else {
        console.log('[v0] Inserting new record with values:', {
          student_id: studentId,
          semester: semester,
          fee_type: feeType,
          amount: amount,
          status: paymentStatus,
          reference_id: orderId,
          transaction_id: trackingId,
          bank_ref_no: bankRefNo,
        });
        const insertResult = await query(
          `INSERT INTO online_fee_payments 
           (student_id, semester, fee_type, amount, status, reference_id, transaction_id, bank_ref_no, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [studentId, semester, feeType, amount, paymentStatus, orderId, trackingId, bankRefNo]
        );
        console.log('[v0] Insert result:', insertResult);
        console.log('[v0] Inserted new payment record');
      }
    } catch (dbError) {
      console.error('[v0] Database error:', dbError);
      console.error('[v0] Error details:', {
        name: dbError instanceof Error ? dbError.name : 'Unknown',
        message: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : 'No stack',
      });
      // Don't fail the request - payment was successful, just DB issue
    }

    // If successful, also update fee_payments table and installment status
    if (paymentStatus === 'SUCCESS') {
      try {
        // Parse student_id as integer (critical for matching)
        const studentIdInt = parseInt(studentId);
        const semesterInt = parseInt(semester);

        console.log('[v0] Updating fee_payments for:', {
          student_id: studentIdInt,
          semester: semesterInt,
          fee_type: feeType,
          amount: amount,
        });

        // Update the fee_payments record
        const updateResult = await query(
          `UPDATE fee_payments 
           SET payment_date = NOW()::date, 
               transaction_id = $1, 
               payment_source = $2,
               amount_paid = $4
           WHERE student_id = $3 AND semester = $5 AND fee_type = $6`,
          [trackingId, 'Online Payment', studentIdInt, amount, semesterInt, feeType]
        );

        console.log('[v0] fee_payments UPDATE - rows affected:', updateResult?.rowCount);

        // If no rows were updated, the fee_payments record may not exist
        // This is OK - the payment is recorded in online_fee_payments
        if (!updateResult?.rowCount || updateResult.rowCount === 0) {
          console.log('[v0] No fee_payments record found for this student - this may be normal');
        }

        // UPDATE INSTALLMENT STATUS - Mark the paid installment as Paid
        try {
          console.log('[v0] Attempting to update installment status for student:', studentIdInt, 'semester:', semesterInt);

          // Get the installment plan for this semester
          const planResult = await query(
            `SELECT id FROM fee_installment_plans WHERE student_id = $1 AND semester = $2 AND status = 'approved'`,
            [studentIdInt, semesterInt]
          );

          if (planResult.rows && planResult.rows.length > 0) {
            const planId = planResult.rows[0].id;
            console.log('[v0] Found installment plan:', planId);

            // Find the first unpaid installment and mark it as paid
            const updateInstallmentResult = await query(
              `UPDATE fee_installments 
               SET status = 'paid', paid_at = NOW()
               WHERE id = (
                 SELECT id FROM fee_installments 
                 WHERE plan_id = $1 AND status = 'pending'
                 ORDER BY installment_number ASC
                 LIMIT 1
               )`,
              [planId]
            );

            console.log('[v0] Installment update - rows affected:', updateInstallmentResult?.rowCount);
          } else {
            console.log('[v0] No installment plan found for student');
          }
        } catch (installmentError) {
          console.error('[v0] Installment update error:', installmentError instanceof Error ? installmentError.message : String(installmentError));
          // Non-critical - payment is already recorded
        }
      } catch (feeError) {
        console.error('[v0] fee_payments update error:', feeError instanceof Error ? feeError.message : String(feeError));
        // Non-critical - payment is already recorded in online_fee_payments
      }
    }

    // Return success response - redirect to fees page with success status
    if (paymentStatus === 'SUCCESS') {
      // Redirect to fees page with payment success indicator
      return NextResponse.redirect(new URL('/student/fees?payment_status=SUCCESS', request.url), { status: 303 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed',
      orderId,
      status: paymentStatus,
    });
  } catch (error) {
    console.error('[v0] Callback error:', error);
    return NextResponse.json({
      success: false,
      message: 'Error processing callback',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET handler for payment verification
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const result = await query(
      `SELECT * FROM online_fee_payments WHERE reference_id = $1`,
      [orderId]
    );

    const payments = result?.rows || [];
    const payment = payments[0];

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      payment: {
        orderId: payment.reference_id,
        status: payment.status,
        amount: payment.amount,
        transactionId: payment.transaction_id,
        bankRefNo: payment.bank_ref_no,
        createdAt: payment.created_at,
      },
    });
  } catch (error) {
    console.error('[v0] Error verifying payment:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
