'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface PaymentReceiptProps {
  studentName: string
  enrollmentNumber: string
  courseName: string
  semester: number
  transactionId: string
  feeType: string
  amount: number
  paymentDate: string
}

export function PaymentReceipt({
  studentName,
  enrollmentNumber,
  courseName,
  semester,
  transactionId,
  feeType,
  amount,
  paymentDate,
}: PaymentReceiptProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownloadReceipt = async () => {
    setIsLoading(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default

      const receiptDate = new Date(paymentDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const watermarkText = "GUCPC GUJARAT UNIVERSITY SAMANVAY &nbsp;&nbsp;•&nbsp;&nbsp; ".repeat(600)

      // Build complete HTML as one string
      const completeHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: white; position: relative; overflow: hidden;">
          
          <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; transform: rotate(-35deg); pointer-events: none; opacity: 0.035; font-size: 16px; font-weight: bold; color: #000; line-height: 1.4; text-align: center; z-index: 50; user-select: none;">
            ${watermarkText}
          </div>

          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2563eb; position: relative; z-index: 1;">
            
            <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 15px; width: 100%;">
              <div style="width: 30%; text-align: left;">
                <img src="${baseUrl}/images/gujarat-university-logo.png" alt="Gujarat University" style="height: 60px; width: auto;" />
              </div>
              
              <div style="width: 40%; text-align: center;">
                <img src="${baseUrl}/images/gucpc-logo.png" alt="GUCPC" style="height: 55px; width: auto;" />
              </div>
              
              <div style="width: 30%; text-align: right;">
                <img src="${baseUrl}/images/samanvay-black.png" alt="Samanvay" style="height: 30px; width: auto;" />
              </div>
            </div>
            
            <div style="font-weight: bold; font-size: 20px; color: #2563eb; letter-spacing: 1px; margin-top: 15px;">
              PAYMENT RECEIPT
            </div>

          </div> 
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 25px; padding: 15px; background: #f3f4f6; border-radius: 8px; text-align: left; position: relative; z-index: 1;">
            <div style="flex: 1;">
              <div style="font-size: 11px; color: #666; margin-bottom: 5px; font-weight: 600;">TRANSACTION ID</div>
              <div style="font-weight: bold; font-size: 14px; font-family: 'Courier New', monospace; color: #000;">${transactionId}</div>
            </div>
            <div style="flex: 1; text-align: right;">
              <div style="font-size: 11px; color: #666; margin-bottom: 5px; font-weight: 600;">PAYMENT DATE</div>
              <div style="font-weight: bold; font-size: 14px; color: #000;">${receiptDate}</div>
            </div>
          </div>

          <div style="margin-bottom: 25px; text-align: left; position: relative; z-index: 1;">
            <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 12px; color: #1f2937;">STUDENT INFORMATION</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <tr>
                <td style="padding: 8px 0; font-size: 12px; color: #666; width: 40%; text-align: left;">Student Name:</td>
                <td style="padding: 8px 0; font-size: 12px; font-weight: bold; color: #1f2937; text-align: left;">${studentName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 12px; color: #666; text-align: left;">Enrollment Number:</td>
                <td style="padding: 8px 0; font-size: 12px; font-weight: bold; color: #1f2937; text-align: left;">${enrollmentNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 12px; color: #666; text-align: left;">Course:</td>
                <td style="padding: 8px 0; font-size: 12px; font-weight: bold; color: #1f2937; text-align: left;">${courseName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 12px; color: #666; text-align: left;">Semester:</td>
                <td style="padding: 8px 0; font-size: 12px; font-weight: bold; color: #1f2937; text-align: left;">Semester ${semester}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 25px; padding: 15px; background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px; text-align: left; position: relative; z-index: 1;">
            <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 12px; color: #1f2937;">PAYMENT DETAILS</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <tr>
                <td style="padding: 8px 0; font-size: 12px; color: #666; width: 40%; text-align: left;">Fee Type:</td>
                <td style="padding: 8px 0; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: capitalize; text-align: left;">${feeType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 12px; color: #666; text-align: left;">Amount Paid:</td>
                <td style="padding: 8px 0; font-size: 14px; font-weight: bold; color: #059669; text-align: left;">₹${amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 12px; color: #666; text-align: left;">Payment Status:</td>
                <td style="padding: 8px 0; font-size: 12px; font-weight: bold; color: #059669; text-align: left;">SUCCESS</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; position: relative; z-index: 1;">
            <div style="font-size: 11px; color: #999; margin-bottom: 10px;">This is an electronically generated receipt and is valid without a signature.</div>
            <div style="font-size: 10px; color: #bbb;">
              <div>Samanvay Fee Management System</div>
              <div>For any support or issue fill the form : https://forms.gle/4oYSojDwRCHpagNJA</div>
            </div>
          </div>
        </div>
      `

      const element = document.createElement('div')
      element.innerHTML = completeHTML

      const opt = {
        margin: 10,
        filename: `receipt_${transactionId}_sem_${semester}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      }

      await html2pdf().set(opt).from(element).save()
    } catch (error) {
      console.error('Error downloading receipt:', error)
      alert('Failed to download receipt. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleDownloadReceipt}
      disabled={isLoading}
      size="sm"
      variant="outline"
      className="gap-2"
      title="Download Receipt"
    >
      <Download className="h-4 w-4" />
      {isLoading ? 'Generating...' : 'Receipt'}
    </Button>
  )
}