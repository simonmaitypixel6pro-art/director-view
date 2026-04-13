import crypto from 'crypto';

// Your credentials from Vercel
const MERCHANT_ID = '4201125';
const ACCESS_CODE = 'AVBR61MC91BNB1RBN8'; // From your vars
const WORKING_KEY = '335F1832B230227123D333B8C61F38C423'; // From your vars

function encryptCCAvenue(plainText, workingKey) {
  // MD5 hash of working key as the AES-128 encryption key
  const key = crypto.createHash('md5').update(workingKey).digest();

  console.log('[TEST] MD5 Hash of working key:', key.toString('hex').toUpperCase());
  console.log('[TEST] Key length:', key.length, 'bytes');

  // Standard 16-byte IV for CCAvenue
  const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);

  // AES-128-CBC encryption
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const result = encrypted.toUpperCase();
  console.log('[TEST] Encrypted result:', result);
  console.log('[TEST] Encrypted length:', result.length);

  return result;
}

// Test with sample order
const testOrder = {
  merchant_id: MERCHANT_ID,
  order_id: 'TEST-SFP-1-S1-S-1234567890123',
  amount: '3.00',
  redirect_url: 'https://amanvay.gucpc.in/api/student/fees/payment-callback',
  cancel_url: 'https://amanvay.gucpc.in/student/fees',
  language: 'EN',
  currency: 'INR'
};

const queryString = Object.entries(testOrder)
  .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
  .join('&');

console.log('\n[TEST] Query String:');
console.log(queryString);
console.log('\n[TEST] Query String Length:', queryString.length);

console.log('\n[TEST] Starting Encryption...');
const encrypted = encryptCCAvenue(queryString, WORKING_KEY);

console.log('\n[TEST] Final Encrypted Request:');
console.log('encRequest:', encrypted);
console.log('access_code:', ACCESS_CODE);

console.log('\n[TEST] Form Submit Parameters:');
console.log('POST to: https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction');
console.log('encRequest:', encrypted.substring(0, 100) + '...');
console.log('access_code:', ACCESS_CODE);
