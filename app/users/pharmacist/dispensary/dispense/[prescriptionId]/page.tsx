"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  User, 
  Phone, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Pill, 
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  ArrowLeft,
  Save,
  Printer,
  X
} from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"

interface PrescriptionItem {
  id: string
  drugName: string
  genericName?: string
  brandName?: string
  dosage: string
  frequency: string
  duration: string
  route?: string
  instructions: string
  quantityPrescribed: number
  quantityDispensed: number
  unitPrice: number
  totalPrice: number
  isDispensed: boolean
  product: {
    id: string
    availableStock: number
    batchNumber?: string
    expiryDate?: string
    dosageForm?: string
    strength?: string
  }
  hasStock: boolean
}

interface PrescriptionData {
  id: string
  prescriptionNo: string
  student: {
    id: string
    name: string
    matricNumber: string
    phone: string
    email?: string
    photo?: string
    department: string
    level: string
    bloodGroup?: string
    genotype?: string
    allergies?: string
  }
  physician: {
    name: string
    specialization: string
    qualification: string
  }
  diagnosis: string
  instructions?: string
  priority: 'emergency' | 'urgent' | 'normal'
  status: string
  totalCost: number
  createdAt: string
  validUntil?: string
  items: PrescriptionItem[]
}

interface DispenseItem {
  itemId: string
  productId: string
  quantityDispensed: number
  batchNumber?: string
}

export default function DispensePrescription() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const prescriptionId = params.prescriptionId as string

  const [prescription, setPrescription] = useState<PrescriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dispensing, setDispensing] = useState(false)
  const [studentVerified, setStudentVerified] = useState(false)
  const [dispensedItems, setDispensedItems] = useState<Record<string, DispenseItem>>({})
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [checklist, setChecklist] = useState({
    identityVerified: false,
    itemsChecked: false,
    dosageExplained: false,
    studentUnderstands: false
  })

  useEffect(() => {
    fetchPrescriptionDetails()
  }, [prescriptionId])

  const fetchPrescriptionDetails = async () => {
    try {
      const response = await fetch(`/api/pharmacist/prescriptions/${prescriptionId}`)
      if (response.ok) {
        const data = await response.json()
        setPrescription(data)
        
        // Initialize dispensed items with prescribed quantities
        const initialDispensedItems: Record<string, DispenseItem> = {}
        data.items.forEach((item: PrescriptionItem) => {
          initialDispensedItems[item.id] = {
            itemId: item.id,
            productId: item.product.id,
            quantityDispensed: item.quantityPrescribed,
            batchNumber: item.product.batchNumber
          }
        })
        setDispensedItems(initialDispensedItems)
        setAmountPaid(data.totalCost.toString())
      }
    } catch (error) {
      console.error('Failed to fetch prescription details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setDispensedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantityDispensed: quantity
      }
    }))
  }

  const handleItemDispensed = (itemId: string, dispensed: boolean) => {
    if (!dispensed) {
      setDispensedItems(prev => {
        const newItems = { ...prev }
        delete newItems[itemId]
        return newItems
      })
    } else {
      const item = prescription?.items.find(i => i.id === itemId)
      if (item) {
        setDispensedItems(prev => ({
          ...prev,
          [itemId]: {
            itemId: item.id,
            productId: item.product.id,
            quantityDispensed: item.quantityPrescribed,
            batchNumber: item.product.batchNumber
          }
        }))
      }
    }
  }

  const calculateTotals = () => {
    if (!prescription) return { subtotal: 0, total: 0, change: 0 }
    
    const subtotal = Object.values(dispensedItems).reduce((sum, dispensedItem) => {
      const item = prescription.items.find(i => i.id === dispensedItem.itemId)
      return sum + (item ? item.unitPrice * dispensedItem.quantityDispensed : 0)
    }, 0)
    
    const total = subtotal
    const change = Math.max(0, parseFloat(amountPaid || '0') - total)
    
    return { subtotal, total, change }
  }

  const canDispense = () => {
    const hasDispensedItems = Object.keys(dispensedItems).length > 0
    const allChecklistComplete = Object.values(checklist).every(Boolean)
    const hasPayment = parseFloat(amountPaid || '0') >= calculateTotals().total
    
    return hasDispensedItems && allChecklistComplete && hasPayment && studentVerified
  }

  const handleDispense = async () => {
    if (!canDispense() || !prescription || !session?.user) return

    setDispensing(true)
    try {
      const response = await fetch(`/api/pharmacist/prescriptions/${prescriptionId}/dispense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dispensedItems: Object.values(dispensedItems),
          totalAmount: calculateTotals().total,
          amountPaid: parseFloat(amountPaid),
          paymentMethod,
          notes,
          dispensedBy: session.user.id
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Show success modal or redirect
        alert(`Prescription dispensed successfully!\nDispensal No: ${result.data.dispensalNo}`)
        router.push('/users/pharmacist/dispensary/pending')
      } else {
        const error = await response.json()
        alert(`Failed to dispense prescription: ${error.error}`)
      }
    } catch (error) {
      console.error('Dispense error:', error)
      alert('Failed to dispense prescription. Please try again.')
    } finally {
      setDispensing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-500 text-white'
      case 'urgent': return 'bg-yellow-500 text-black'
      default: return 'bg-blue-500 text-white'
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center">
          <p className="text-gray-500">Prescription not found</p>
          <Button onClick={() => router.back()} className="mt-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const { subtotal, total, change } = calculateTotals()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            Dispense Prescription - {prescription.prescriptionNo}
          </h2>
        </div>
        <Badge className={getPriorityColor(prescription.priority)}>
          {prescription.priority.toUpperCase()}
        </Badge>
      </div>

      {/* Student Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Student Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={prescription.student.photo} />
              <AvatarFallback>
                {prescription.student.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{prescription.student.name}</h3>
              <p className="text-gray-600">Matric Number: {prescription.student.matricNumber}</p>
              <p className="text-gray-600">Department: {prescription.student.department}</p>
              <p className="text-gray-600">Level: {prescription.student.level}</p>
              <div className="flex items-center gap-1 text-gray-600 mt-1">
                <Phone className="h-4 w-4" />
                {prescription.student.phone}
              </div>
              {prescription.student.allergies && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Allergies:</strong> {prescription.student.allergies}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="text-right">
              {studentVerified ? (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Student ID Verified
                </Badge>
              ) : (
                <Button onClick={() => setStudentVerified(true)}>
                  Verify Student
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescription Details */}
      <Card>
        <CardHeader>
          <CardTitle>Prescription Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p><strong>Physician:</strong> {prescription.physician.name} ({prescription.physician.qualification})</p>
              <p><strong>Specialization:</strong> {prescription.physician.specialization}</p>
              <p><strong>Date Prescribed:</strong> {new Date(prescription.createdAt).toLocaleString()}</p>
              <p><strong>Priority:</strong> {prescription.priority.toUpperCase()}</p>
            </div>
            <div>
              <p><strong>Diagnosis:</strong> {prescription.diagnosis}</p>
              {prescription.validUntil && (
                <p><strong>Valid Until:</strong> {new Date(prescription.validUntil).toLocaleDateString()}</p>
              )}
              {prescription.instructions && (
                <div className="mt-2">
                  <strong>General Instructions:</strong>
                  <p className="text-sm text-gray-600 mt-1">{prescription.instructions}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items to Dispense */}
      <Card>
        <CardHeader>
          <CardTitle>Items to Dispense</CardTitle>
          <CardDescription>
            Progress: {Object.keys(dispensedItems).length}/{prescription.items.length} items selected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {prescription.items.map((item, index) => {
            const isSelected = dispensedItems[item.id]
            const dispensedQuantity = dispensedItems[item.id]?.quantityDispensed || 0
            
            return (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected !== undefined}
                    onCheckedChange={(checked) => handleItemDispensed(item.id, checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-lg">
                      {index + 1}. {item.drugName}
                    </h4>
                    
                    {isSelected && (
                      <div className="mt-3 space-y-3 bg-gray-50 p-3 rounded">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Quantity Prescribed: {item.quantityPrescribed}</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-sm ${item.hasStock ? 'text-green-600' : 'text-red-600'}`}>
                                Available Stock: {item.product.availableStock}
                                {item.hasStock ? ' ✅' : ' ⚠️'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`quantity-${item.id}`}>Quantity to Dispense</Label>
                            <Input
                              id={`quantity-${item.id}`}
                              type="number"
                              min="1"
                              max={Math.min(item.quantityPrescribed, item.product.availableStock)}
                              value={dispensedQuantity}
                              onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Dosage:</strong> {item.dosage}</p>
                            <p><strong>Frequency:</strong> {item.frequency}</p>
                            <p><strong>Duration:</strong> {item.duration}</p>
                            {item.route && <p><strong>Route:</strong> {item.route}</p>}
                          </div>
                          <div>
                            <p><strong>Instructions:</strong> {item.instructions}</p>
                            {item.product.batchNumber && (
                              <p><strong>Batch Number:</strong> {item.product.batchNumber}</p>
                            )}
                            {item.product.expiryDate && (
                              <p><strong>Expiry Date:</strong> {new Date(item.product.expiryDate).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t">
                          <div>
                            <p><strong>Unit Price:</strong> {formatCurrency(item.unitPrice)}</p>
                          </div>
                          <div>
                            <p><strong>Total:</strong> {formatCurrency(item.unitPrice * dispensedQuantity)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{formatCurrency(0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Amount:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Payment Method:</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Cash
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Card
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                    <Label htmlFor="bank_transfer" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Bank Transfer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mobile_money" id="mobile_money" />
                    <Label htmlFor="mobile_money" className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Mobile Money
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="amount-paid">Amount Paid</Label>
                <Input
                  id="amount-paid"
                  type="number"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="mt-1"
                />
                {change > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    Change: {formatCurrency(change)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter any additional notes about the dispensing..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Dispensing Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="identity-verified"
              checked={checklist.identityVerified}
              onCheckedChange={(checked) => 
                setChecklist(prev => ({ ...prev, identityVerified: checked as boolean }))
              }
            />
            <Label htmlFor="identity-verified">I have verified student identity</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="items-checked"
              checked={checklist.itemsChecked}
              onCheckedChange={(checked) => 
                setChecklist(prev => ({ ...prev, itemsChecked: checked as boolean }))
              }
            />
            <Label htmlFor="items-checked">All items checked and accounted for</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dosage-explained"
              checked={checklist.dosageExplained}
              onCheckedChange={(checked) => 
                setChecklist(prev => ({ ...prev, dosageExplained: checked as boolean }))
              }
            />
            <Label htmlFor="dosage-explained">Dosage instructions explained to student</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="student-understands"
              checked={checklist.studentUnderstands}
              onCheckedChange={(checked) => 
                setChecklist(prev => ({ ...prev, studentUnderstands: checked as boolean }))
              }
            />
            <Label htmlFor="student-understands">Student understands how to take medication</Label>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
        </div>
        <Button 
          onClick={handleDispense}
          disabled={!canDispense() || dispensing}
          className="bg-green-600 hover:bg-green-700"
        >
          {dispensing ? (
            <>Processing...</>
          ) : (
            <>
              <Pill className="mr-2 h-4 w-4" />
              Complete Dispensing & Print Receipt
            </>
          )}
        </Button>
      </div>
    </div>
  )
}