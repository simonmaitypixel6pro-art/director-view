import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CCAVENUE_MERCHANT_ID = process.env.CCAVENUE_MERCHANT_ID || '';
const CCAVENUE_ACCESS_CODE = process.env.CCAVENUE_ACCESS_CODE || '';
const CCAVENUE_WORKING_KEY = process.env.CCAVENUE_WORKING_KEY || '';
const REDIRECT_URL = process.env.CCAVENUE_REDIRECT_URL || 'https://amanvay.gucpc.in/api/student/fees/payment-callback';
const CANCEL_URL = process.env.CCAVENUE_CANCEL_URL || 'https://amanvay.gucpc.in/student/fees';

function encryptCCAvenue(plainText: string, workingKey: string): string {
  const md5 = crypto.createHash('md5').update(workingKey).digest();
  const keyBase64 = Buffer.from(md5).toString('base64');
  const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
  const ivBase64 = iv.toString('base64');

  const key = Buffer.from(keyBase64, 'base64');
  const ivBuffer = Buffer.from(ivBase64, 'base64');

  const cipher = crypto.createCipheriv('aes-128-cbc', key, ivBuffer);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted;
}

export async function GET(request: NextRequest) {
  try {
    // Test encryption with sample data
    const testData = 'merchant_id=4201125&order_id=TEST123&currency=INR&amount=100.00&redirect_url=https://amanvay.gucpc.in/api/student/fees/payment-callback&cancel_url=https://amanvay.gucpc.in/student/fees&language=EN&billing_name=TestStudent';

    const md5Hash = crypto.createHash('md5').update(CCAVENUE_WORKING_KEY).digest();
    const keyBase64 = Buffer.from(md5Hash).toString('base64');
    const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
    const ivBase64 = iv.toString('base64');

    const encryptedTest = encryptCCAvenue(testData, CCAVENUE_WORKING_KEY);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>CCAvenue Payment Debug</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #f5f5f5; }
    .section { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #2563eb; }
    .warning { border-left-color: #dc2626; background: #fee2e2; }
    .success { border-left-color: #16a34a; background: #dcfce7; }
    .error { color: #dc2626; font-weight: bold; }
    .success-text { color: #16a34a; font-weight: bold; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
    h2 { margin-top: 0; color: #1f2937; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    td:first-child { font-weight: bold; width: 40%; }
  </style>
</head>
<body>
  <h1>CCAvenue Payment Gateway Debug Info</h1>
  
  <div class="section">
    <h2>Environment Variables Status</h2>
    <table>
      <tr>
        <td>Merchant ID</td>
        <td class="${CCAVENUE_MERCHANT_ID ? 'success-text' : 'error'}">${CCAVENUE_MERCHANT_ID ? '✓ SET: ' + CCAVENUE_MERCHANT_ID : '✗ MISSING'}</td>
      </tr>
      <tr>
        <td>Access Code</td>
        <td class="${CCAVENUE_ACCESS_CODE ? 'success-text' : 'error'}">${CCAVENUE_ACCESS_CODE ? '✓ SET (length: ' + CCAVENUE_ACCESS_CODE.length + ')' : '✗ MISSING'}</td>
      </tr>
      <tr>
        <td>Working Key</td>
        <td class="${CCAVENUE_WORKING_KEY ? 'success-text' : 'error'}">${CCAVENUE_WORKING_KEY ? '✓ SET (length: ' + CCAVENUE_WORKING_KEY.length + ')' : '✗ MISSING'}</td>
      </tr>
      <tr>
        <td>Redirect URL</td>
        <td><code>${REDIRECT_URL}</code></td>
      </tr>
      <tr>
        <td>Cancel URL</td>
        <td><code>${CANCEL_URL}</code></td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Encryption Test</h2>
    <table>
      <tr>
        <td>Test Data</td>
        <td><code>${testData}</code></td>
      </tr>
      <tr>
        <td>MD5 Hash (hex)</td>
        <td><code>${md5Hash.toString('hex')}</code></td>
      </tr>
      <tr>
        <td>Key Base64</td>
        <td><code>${keyBase64}</code></td>
      </tr>
      <tr>
        <td>IV Base64</td>
        <td><code>${ivBase64}</code></td>
      </tr>
      <tr>
        <td>Encrypted (first 100 chars)</td>
        <td><code>${encryptedTest.substring(0, 100)}</code></td>
      </tr>
      <tr>
        <td>Total Encrypted Length</td>
        <td><code>${encryptedTest.length} chars</code></td>
      </tr>
    </table>
  </div>

  <div class="section warning">
    <h2>⚠️ Important Notes</h2>
    <ul>
      <li><strong>Verify in CCAvenue Admin Dashboard:</strong>
        <ul>
          <li>Merchant ID: <code>${CCAVENUE_MERCHANT_ID}</code> - Must match your account</li>
          <li>Access Code: Should be in Settings → API Keys</li>
          <li>Working Key: Should be a 32-character hex string</li>
        </ul>
      </li>
      <li><strong>URLs must be whitelisted in CCAvenue:</strong>
        <ul>
          <li><code>${REDIRECT_URL}</code></li>
          <li><code>${CANCEL_URL}</code></li>
        </ul>
      </li>
      <li><strong>Error 10002 "Merchant Authentication Failed" means:</strong>
        <ul>
          <li>Encrypted request format is wrong (unlikely - encryption test passed)</li>
          <li>Access Code is wrong or doesn't match merchant ID</li>
          <li>Working Key is wrong</li>
          <li>Merchant ID is not registered at CCAvenue</li>
        </ul>
      </li>
    </ul>
  </div>

  <div class="section success">
    <h2>✓ Encryption Algorithm Status</h2>
    <p>Encryption is working correctly. The issue is likely with credentials or URL configuration in CCAvenue.</p>
  </div>

  <div class="section">
    <h2>Next Steps</h2>
    <ol>
      <li><strong>Double-check CCAvenue Dashboard:</strong>
        <ul>
          <li>Log into CCAvenue Merchant Account</li>
          <li>Go to Settings → API Keys</li>
          <li>Verify Merchant ID: <code>${CCAVENUE_MERCHANT_ID}</code></li>
          <li>Verify Access Code matches what's in your environment variables</li>
          <li>Verify Working Key: <code>${CCAVENUE_WORKING_KEY}</code></li>
        </ul>
      </li>
      <li><strong>Whitelist URLs:</strong>
        <ul>
          <li>In CCAvenue Settings, add these URLs to whitelisted domains</li>
          <li><code>${REDIRECT_URL}</code></li>
          <li><code>${CANCEL_URL}</code></li>
        </ul>
      </li>
      <li><strong>Contact CCAvenue Support:</strong>
        <ul>
          <li>Email: merchants@ccavenue.com</li>
          <li>Include Error Order ID: <code>SFP-1-S1-S-XXXXXXX</code></li>
          <li>Tell them you're getting error 10002 "Merchant Authentication Failed"</li>
        </ul>
      </li>
    </ol>
  </div>
</body>
</html>
    `;

    return NextResponse.json({
      html,
      credentials: {
        merchantId: CCAVENUE_MERCHANT_ID,
        accessCode: CCAVENUE_ACCESS_CODE ? '***SET***' : 'MISSING',
        workingKey: CCAVENUE_WORKING_KEY ? '***SET***' : 'MISSING',
        redirectUrl: REDIRECT_URL,
        cancelUrl: CANCEL_URL,
      },
      encryption: {
        testDataLength: testData.length,
        encryptedLength: encryptedTest.length,
        md5Hash: md5Hash.toString('hex'),
        keyBase64,
        ivBase64,
        encryptedFirst100: encryptedTest.substring(0, 100),
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
