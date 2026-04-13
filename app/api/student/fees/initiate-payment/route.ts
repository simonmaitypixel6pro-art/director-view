import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encryptCCAvenue, generateReferenceId } from '@/lib/ccavenue-util';

const CCAVENUE_MERCHANT_ID = process.env.CCAVENUE_MERCHANT_ID || '';
const CCAVENUE_ACCESS_CODE = process.env.CCAVENUE_ACCESS_CODE || '';
const CCAVENUE_WORKING_KEY = process.env.CCAVENUE_WORKING_KEY || '';
const REDIRECT_URL = process.env.CCAVENUE_REDIRECT_URL || 'http://localhost:3000/api/student/fees/payment-callback';
const CANCEL_URL = process.env.CCAVENUE_CANCEL_URL || 'http://localhost:3000/student/fees';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { semester, feeType, amount, studentId, enrollmentNumber, fullName, courseName } = await request.json();

    // Validate inputs
    if (!semester || !feeType || !amount || !studentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!CCAVENUE_MERCHANT_ID || !CCAVENUE_ACCESS_CODE || !CCAVENUE_WORKING_KEY) {
      console.error('[v0] CCAvenue credentials missing!');
      return NextResponse.json({
        error: 'Payment gateway not configured',
        details: 'Missing CCAvenue credentials in environment variables'
      }, { status: 500 });
    }

    // Generate reference ID
    const referenceId = generateReferenceId(studentId, semester, feeType);

    // Build form data exactly as reference implementation expects
    // The order matters - match the reference HTML form
    const formData = new URLSearchParams();
    formData.append('merchant_id', CCAVENUE_MERCHANT_ID);
    formData.append('order_id', referenceId);
    formData.append('currency', 'INR');
    formData.append('amount', amount.toFixed(2));
    formData.append('redirect_url', REDIRECT_URL);
    formData.append('cancel_url', CANCEL_URL);
    formData.append('language', 'EN');
    formData.append('billing_name', fullName || 'Student');
    formData.append('billing_city', 'Ahmedabad');
    formData.append('billing_state', 'Gujarat');
    formData.append('billing_country', 'India');
    formData.append('billing_zip', '380001');
    formData.append('merchant_param1', studentId);
    formData.append('merchant_param2', enrollmentNumber || '');
    formData.append('merchant_param3', semester.toString());
    formData.append('merchant_param4', feeType);
    formData.append('merchant_param5', courseName || '');

    const bodyString = formData.toString();
    console.log('[v0] Form body to encrypt:', bodyString);
    console.log('[v0] Redirect URL being sent:', REDIRECT_URL);
    console.log('[v0] Using working key:', CCAVENUE_WORKING_KEY.substring(0, 10) + '***');

    // Encrypt exactly as reference implementation
    const encryptedRequest = encryptCCAvenue(bodyString, CCAVENUE_WORKING_KEY);

    console.log('[v0] Encryption completed:', {
      referenceId,
      bodyLength: bodyString.length,
      encryptedLength: encryptedRequest.length,
      amount: amount.toFixed(2),
      redirectUrl: REDIRECT_URL,
      merchantId: CCAVENUE_MERCHANT_ID,
    });

    // Store pending transaction
    try {
      console.log('[v0] Inserting pending payment record:', { referenceId, studentId, semester, feeType, amount });
      const result = await query(`
        INSERT INTO online_fee_payments (
          student_id, semester, fee_type, amount, status, 
          reference_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [studentId, semester, feeType, amount, 'PENDING', referenceId]);
      console.log('[v0] Pending payment inserted:', result);
    } catch (dbError) {
      console.error('[v0] Database error (non-fatal, payment will still proceed):', dbError);
    }

    return NextResponse.json({
      success: true,
      encRequest: encryptedRequest,
      accessCode: CCAVENUE_ACCESS_CODE,
      redirectUrl: REDIRECT_URL,
    });
  } catch (error) {
    console.error('[v0] Error initiating payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to initiate payment';
    return NextResponse.json({
      error: 'Failed to initiate payment',
      details: errorMessage
    }, { status: 500 });
  }
}
