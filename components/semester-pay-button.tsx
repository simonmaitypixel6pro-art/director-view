'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Loader2, CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SemesterPayButtonProps {
  semester: number
  remaining: number
  semesterFee?: number
  examFee?: number
  semesterFeePaid?: boolean
  examFeePaid?: boolean
  studentId: string
  enrollmentNumber: string
  fullName: string
  courseName: string
  status: string
  onPaymentComplete?: () => void
}

interface Installment {
  id: number
  amount: number
  dueDate: string
  status: string
  installmentNumber: number
}

interface InstallmentPlan {
  id: number
  semester: number
  totalAmount: number
  planType: string
  installments: Installment[]
}

export function SemesterPayButton({
  semester,
  remaining,
  semesterFee = 0,
  examFee = 0,
  semesterFeePaid = false,
  examFeePaid = false,
  studentId,
  enrollmentNumber,
  fullName,
  courseName,
  status,
  onPaymentComplete,
}: SemesterPayButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [feeType, setFeeType] = useState('Both')
  const [error, setError] = useState('')
  const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan | null>(null)
  const [nextInstallment, setNextInstallment] = useState<Installment | null>(null)
  const [amountToPay, setAmountToPay] = useState(remaining)
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(10)

  // Countdown timer effect for warning modal
  useEffect(() => {
    if (!showWarning) return

    if (countdown === 0) {
      // Auto-proceed to payment when countdown reaches 0
      proceedToPaymentGateway()
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [showWarning, countdown])

  // Calculate amount based on fee type and installment status
  useEffect(() => {
    let amount = remaining

    // Normalize fee type strings for comparison
    const normalizedFeeType = feeType.toLowerCase().replace(/\s+/g, '').replace('_', '')
    const normalizedInstallmentFeeType = (installmentPlan?.fee_type || 'Both').toLowerCase().replace(/\s+/g, '').replace('_', '')

    // If installment is active and fee type matches, use installment amount
    if (installmentPlan && nextInstallment) {
      // Check if selected fee type matches installment fee type
      if (
        normalizedFeeType.includes('semester') === normalizedInstallmentFeeType.includes('semester') &&
        normalizedFeeType.includes('exam') === normalizedInstallmentFeeType.includes('exam')
      ) {
        amount = parseFloat(nextInstallment.amount) || remaining
      } else {
        // Different fee type selected - calculate that fee's amount
        if (feeType === 'Semester' && semesterFee) {
          amount = semesterFee
        } else if (feeType === 'Exam' && examFee) {
          amount = examFee
        } else {
          amount = remaining
        }
      }
    } else {
      // No installment - calculate normally based on fee type
      if (feeType === 'Semester' && semesterFee) {
        amount = semesterFee
      } else if (feeType === 'Exam' && examFee) {
        amount = examFee
      } else {
        amount = remaining
      }
    }
    setAmountToPay(amount)
  }, [feeType, remaining, semesterFee, examFee, installmentPlan, nextInstallment])

  // Only show button if there's a remaining amount and status is not fully paid
  const canPay = remaining > 0 && status !== 'Paid'

  // Fetch installment plans when dialog opens
  useEffect(() => {
    if (open && canPay) {
      fetchInstallmentPlans()
    }
  }, [open, canPay])

  const fetchInstallmentPlans = async () => {
    try {
      setLoadingPlans(true)
      const token = localStorage.getItem('studentToken')
      if (!token) {
        console.log('[v0] No student token found, skipping installment plan fetch')
        return
      }

      const response = await fetch(`/api/student/installment-plans?semester=${semester}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.plans && data.plans.length > 0) {
          const plan = data.plans[0] // Get the first active plan
          setInstallmentPlan(plan)

          // Find the first unpaid installment
          if (plan.installments && plan.installments.length > 0) {
            const unpaid = plan.installments.find((inst: any) => inst.status !== 'Paid')
            if (unpaid) {
              setNextInstallment(unpaid)
              setAmountToPay(parseFloat(unpaid.amount) || 0)
            }
          }
        }
      } else {
        console.log('[v0] No installment plans found, using regular payment flow')
      }
    } catch (err) {
      console.error('[v0] Error fetching installment plans:', err)
      // Silently fail - user can still pay the full amount
    } finally {
      setLoadingPlans(false)
    }
  }

  const handlePayNow = async () => {
    if (!canPay) return

    setError('')

    // Show warning modal first instead of going directly to payment
    setShowWarning(true)
    setCountdown(10)
  }

  const proceedToPaymentGateway = async () => {
    setLoading(true)

    try {
      // Step 1: Initiate payment
      const response = await fetch('/api/student/fees/initiate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('studentToken')}`,
        },
        body: JSON.stringify({
          semester,
          feeType: feeType === 'Both' ? 'Semester + Exam' : feeType,
          amount: amountToPay,
          studentId,
          enrollmentNumber,
          fullName,
          courseName,
          installmentId: nextInstallment?.id || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment')
      }

      // Step 2: Create form and submit to CCAvenue
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction'
      form.style.display = 'none'

      const encRequestInput = document.createElement('input')
      encRequestInput.type = 'hidden'
      encRequestInput.name = 'encRequest'
      encRequestInput.value = data.encRequest

      const accessCodeInput = document.createElement('input')
      accessCodeInput.type = 'hidden'
      accessCodeInput.name = 'access_code'
      accessCodeInput.value = data.accessCode

      form.appendChild(encRequestInput)
      form.appendChild(accessCodeInput)
      document.body.appendChild(form)

      console.log('[v0] Submitting to CCAvenue:', {
        encRequestLength: data.encRequest.length,
        accessCode: data.accessCode,
        amount: amountToPay,
        installmentId: nextInstallment?.id || 'full',
      });

      form.submit()

      setOpen(false)
      setShowWarning(false)
      // Note: Page will redirect to bank gateway
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment initiation failed'
      setError(errorMsg)
      console.error('[v0] Payment error:', err)
      setShowWarning(false)
    } finally {
      setLoading(false)
    }
  }

  if (!canPay) {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="gap-2"
        disabled={loading}
      >
        <CreditCard className="h-4 w-4" />
        {loading ? 'Processing...' : 'Pay Now'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Pay Semester {semester} Fees</DialogTitle>
            <DialogDescription>
              Complete your payment through secure online gateway
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Installment Plan Display */}
            {loadingPlans ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : installmentPlan ? (
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <CardTitle className="text-base">Installment Plan Active</CardTitle>
                    </div>
                    <Badge className="bg-blue-600 text-white capitalize">
                      {installmentPlan.fee_type ? installmentPlan.fee_type.replace('_', ' ') : 'Both'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-2">Plan: {installmentPlan.plan_type ? installmentPlan.plan_type.replace(/_/g, ' ') : installmentPlan.planType ? installmentPlan.planType.replace(/_/g, ' ') : 'Custom'}</p>
                    <div className="space-y-1">
                      {installmentPlan.installments && installmentPlan.installments.length > 0 ? (
                        installmentPlan.installments.map((inst, idx) => (
                          <div key={inst.id} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-white/10 rounded">
                            <span>
                              Installment {inst.installment_number || inst.installmentNumber}: ₹{(parseFloat(inst.amount) || 0).toFixed(2)}
                              {inst.status === 'Paid' && <Badge className="ml-2 bg-emerald-600" variant="secondary">Paid</Badge>}
                              {inst.status === 'Pending' && nextInstallment?.id === inst.id && <Badge className="ml-2 bg-blue-600">Due</Badge>}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No installments found</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Student Name:</span>
                  <span className="font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Enrollment:</span>
                  <span className="font-medium font-mono">{enrollmentNumber}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Course:</span>
                  <span className="font-medium">{courseName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Semester:</span>
                  <Badge variant="secondary">Semester {semester}</Badge>
                </div>
                {nextInstallment && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Installment:</span>
                    <Badge variant="outline">#{nextInstallment.installmentNumber}</Badge>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{installmentPlan ? 'Installment Amount:' : 'Amount Due:'}</span>
                    <span className="text-xl font-bold text-blue-600">₹{(parseFloat(String(amountToPay)) || 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Fee Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 border rounded-lg ${semesterFeePaid ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                    onClick={() => !semesterFeePaid && setFeeType('Semester')}>
                    <input
                      type="radio"
                      name="feeType"
                      value="Semester"
                      checked={feeType === 'Semester'}
                      onChange={() => !semesterFeePaid && setFeeType('Semester')}
                      disabled={semesterFeePaid}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${semesterFeePaid ? 'line-through text-muted-foreground' : ''}`}>
                        {semesterFeePaid ? 'Semester Fee - Paid' : 'Semester Fee Only'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {semesterFeePaid ? 'Payment already completed' : 'Pay only semester tuition'}
                      </p>
                    </div>
                    {semesterFeePaid && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  </label>

                  <label className={`flex items-center gap-3 p-3 border rounded-lg ${examFeePaid ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                    onClick={() => !examFeePaid && setFeeType('Exam')}>
                    <input
                      type="radio"
                      name="feeType"
                      value="Exam"
                      checked={feeType === 'Exam'}
                      onChange={() => !examFeePaid && setFeeType('Exam')}
                      disabled={examFeePaid}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${examFeePaid ? 'line-through text-muted-foreground' : ''}`}>
                        {examFeePaid ? 'Exam Fee - Paid' : 'Exam Fee Only'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {examFeePaid ? 'Payment already completed' : 'Pay only exam fee'}
                      </p>
                    </div>
                    {examFeePaid && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  </label>

                  <label className={`flex items-center gap-3 p-3 border-2 ${semesterFeePaid && examFeePaid ? 'border-gray-300 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'border-blue-400 bg-blue-50 dark:bg-blue-950 cursor-pointer'}`}
                    onClick={() => !(semesterFeePaid && examFeePaid) && setFeeType('Both')}>
                    <input
                      type="radio"
                      name="feeType"
                      value="Both"
                      checked={feeType === 'Both'}
                      onChange={() => !(semesterFeePaid && examFeePaid) && setFeeType('Both')}
                      disabled={semesterFeePaid && examFeePaid}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${semesterFeePaid && examFeePaid ? 'line-through text-muted-foreground' : ''}`}>
                        {semesterFeePaid && examFeePaid ? 'All Fees - Paid' : 'Semester + Exam Fee'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {semesterFeePaid && examFeePaid ? 'All payments completed' : 'Pay both semester and exam fees (recommended)'}
                      </p>
                    </div>
                    {semesterFeePaid && examFeePaid && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-semibold text-sm">Secure Online Payment</p>
                    <p className="text-xs text-muted-foreground">CCAvenue Gateway (Bank Integration)</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  You will be redirected to a secure payment gateway. Your banking details are encrypted and protected.
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayNow}
                disabled={loading}
                className="flex-1 gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Proceed to Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Warning Modal */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <DialogTitle>Important: Payment Instructions</DialogTitle>
            </div>
            <DialogDescription className="text-sm mt-2">
              Please read this carefully before proceeding
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warning Messages */}
            <div className="space-y-3">
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                  <strong>Do NOT go back or cancel during payment.</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong>After successful payment:</strong> You will be automatically redirected to Samanvay dashboard
                  </p>
                </div>
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong>If you cancel or go back:</strong> Your payment will be marked as <span className="font-semibold text-red-600">PENDING</span> and fees may be deducted
                  </p>
                </div>
              </div>

              <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                  <strong>Your payment is secure:</strong> All banking details are encrypted and protected by CCAvenue gateway
                </AlertDescription>
              </Alert>
            </div>

            {/* Countdown Timer */}
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-semibold">
                Redirecting to payment in <span className="text-lg text-blue-600">{countdown}</span>s
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowWarning(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setCountdown(0)
                }}
                disabled={loading || countdown === 0}
                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Skip ({countdown}s)
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
