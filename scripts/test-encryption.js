import crypto from 'crypto';

// Test data
const workingKey = '335F1032B23D227123D338C61F3BC423';
const testData = 'merchant_id=4201125&order_id=TEST&currency=INR&amount=100.00&redirect_url=https://amanvay.gucpc.in/api/student/fees/payment-callback&cancel_url=https://amanvay.gucpc.in/student/fees&language=EN&billing_name=Test';

console.log('[v0] Testing CCAvenue Encryption');
console.log('[v0] Working Key:', workingKey);
console.log('[v0] Data Length:', testData.length);
console.log('[v0] Data:', testData.substring(0, 100));

// Step 1: MD5 hash of working key
const md5Hash = crypto.createHash('md5').update(workingKey).digest();
console.log('[v0] MD5 Hash (hex):', md5Hash.toString('hex'));
console.log('[v0] MD5 Hash Length (bytes):', md5Hash.length);

// Step 2: Base64 encode the MD5
const keyBase64 = Buffer.from(md5Hash).toString('base64');
console.log('[v0] Key Base64:', keyBase64);

// Step 3: Create IV
const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
const ivBase64 = iv.toString('base64');
console.log('[v0] IV Base64:', ivBase64);

// Step 4: Convert back for encryption
const keyBuffer = Buffer.from(keyBase64, 'base64');
const ivBuffer = Buffer.from(ivBase64, 'base64');

console.log('[v0] Key Buffer Length:', keyBuffer.length);
console.log('[v0] IV Buffer Length:', ivBuffer.length);

// Step 5: Encrypt
try {
  const cipher = crypto.createCipheriv('aes-128-cbc', keyBuffer, ivBuffer);
  let encrypted = cipher.update(testData, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  console.log('[v0] ✓ Encryption Successful');
  console.log('[v0] Encrypted (first 100 chars):', encrypted.substring(0, 100));
  console.log('[v0] Encrypted Length:', encrypted.length);

  // Try to decrypt to verify
  const decipher = crypto.createDecipheriv('aes-128-cbc', keyBuffer, ivBuffer);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  if (decrypted === testData) {
    console.log('[v0] ✓ Decryption Verified - Encryption is Correct!');
  } else {
    console.log('[v0] ✗ Decryption Failed - Something is Wrong');
  }
} catch (error) {
  console.error('[v0] Encryption Error:', error.message);
}
