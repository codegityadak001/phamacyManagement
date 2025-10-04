"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Pill,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Save,
  Send,
  FileText,
  X,
  Check,
  AlertCircle,
  Package,
  DollarSign,
} from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface Drug {
  id: string
  name: string
  genericName?: string
  brandName?: string
  category: string
  manufacturer: string
  strength: string
  dosageForm: string
  unitPrice: number
  availableStock: number
  requiresPrescription: boolean
}

interface PrescriptionItem {
  id: string
  drugId: string
  drugName: string
  dosage: string
  frequency: string
  duration: string
  route: string
  instructions: string
  quantityPrescribed: number
  unitPrice: number
  totalPrice: number
}

interface ConsultationData {
  id: string
  consultationNo: string
  patient: {
    id: string
    name: string
    matricNumber: string
    age: number
    gender: string
  }
  diagnosis: string
  createdAt: string
}

// Drugs will be fetched from API

const frequencies = [
  "Once daily (OD)",
  "Twice daily (BD)",
  "3 times daily (TDS)",
  "4 times daily (QDS)",
  "Every 4 hours",
  "Every 6 hours",
  "Every 8 hours",
  "Every 12 hours",
  "As needed (PRN)",
  "Before meals",
  "After meals",
  "At bedtime"
]

const durations = [
  "1 day",
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "21 days",
  "1 month",
  "2 months",
  "3 months"
]

const routes = [
  "Oral",
  "Topical",
  "Intravenous (IV)",
  "Intramuscular (IM)",
  "Subcutaneous (SC)",
  "Inhalation",
  "Rectal",
  "Vaginal",
  "Ophthalmic",
  "Otic"
]

export default function PrescribePage() {
  const params = useParams()
  const router = useRouter()
  const consultationId = params.consultationId as string

  const [consultation, setConsultation] = useState<ConsultationData | null>(null)
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Drug[]>([])
  const [allDrugs, setAllDrugs] = useState<Drug[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [generalInstructions, setGeneralInstructions] = useState("")
  const [priority, setPriority] = useState<"normal" | "urgent" | "emergency">("urgent")
  const [validUntil, setValidUntil] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days from now
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchConsultation = async () => {
      try {
        const response = await fetch(`/api/physician/consultations/${consultationId}`)
        const data = await response.json()
        
        if (response.ok) {
          setConsultation(data)
        } else {
          console.error("Failed to fetch consultation:", data.error)
        }
      } catch (error) {
        console.error("Failed to fetch consultation:", error)
      }
    }

    const fetchDrugs = async () => {
      try {
        const response = await fetch('/api/drugs/list')
        const data = await response.json()
        
        if (response.ok) {
          setAllDrugs(data)
        } else {
          console.error("Failed to fetch drugs:", data.error)
        }
      } catch (error) {
        console.error("Failed to fetch drugs:", error)
      }
    }

    fetchConsultation()
    fetchDrugs()
  }, [consultationId])

  const searchDrugs = (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const filtered = allDrugs.filter(drug =>
      drug.name.toLowerCase().includes(query.toLowerCase()) ||
      drug.genericName?.toLowerCase().includes(query.toLowerCase()) ||
      drug.brandName?.toLowerCase().includes(query.toLowerCase()) ||
      drug.category.toLowerCase().includes(query.toLowerCase())
    )
    setSearchResults(filtered)
  }

  const addDrugToPrescription = (drug: Drug) => {
    const newItem: PrescriptionItem = {
      id: Date.now().toString(),
      drugId: drug.id,
      drugName: drug.name,
      dosage: drug.strength,
      frequency: "",
      duration: "",
      route: "Oral",
      instructions: "",
      quantityPrescribed: 0,
      unitPrice: drug.unitPrice,
      totalPrice: 0
    }

    setPrescriptionItems(prev => [...prev, newItem])
    setSearchQuery("")
    setSearchResults([])
    setIsSearchOpen(false)
  }

  const updatePrescriptionItem = (id: string, field: keyof PrescriptionItem, value: any) => {
    setPrescriptionItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          
          // Auto-calculate quantity and total price
          if (field === 'frequency' || field === 'duration') {
            const quantity = calculateQuantity(updatedItem.frequency, updatedItem.duration)
            updatedItem.quantityPrescribed = quantity
            updatedItem.totalPrice = quantity * updatedItem.unitPrice
          }
          
          return updatedItem
        }
        return item
      })
    )
  }

  const calculateQuantity = (frequency: string, duration: string): number => {
    // Extract numbers from frequency and duration strings
    const freqMatch = frequency.match(/(\d+)/)
    const durationMatch = duration.match(/(\d+)/)
    
    if (!freqMatch || !durationMatch) return 0
    
    const timesPerDay = parseInt(freqMatch[1])
    const days = parseInt(durationMatch[1])
    
    // Adjust for different duration units
    let totalDays = days
    if (duration.includes('week')) totalDays = days * 7
    if (duration.includes('month')) totalDays = days * 30
    
    return timesPerDay * totalDays
  }

  const removePrescriptionItem = (id: string) => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id))
  }

  const getTotalCost = () => {
    return prescriptionItems.reduce((total, item) => total + item.totalPrice, 0)
  }

  const getDrugByName = (drugName: string) => {
    return allDrugs.find(drug => drug.name === drugName)
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    
    try {
      const prescriptionData = {
        consultationId,
        prescriptionItems,
        generalInstructions,
        priority,
        validUntil,
        totalCost: getTotalCost(),
        status: 'draft'
      }

      const response = await fetch('/api/physician/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prescriptionData)
      })

      const data = await response.json()

      if (response.ok) {
        alert("Prescription draft saved successfully!")
      } else {
        alert(`Failed to save draft: ${data.error}`)
      }
    } catch (error) {
      console.error("Failed to save draft:", error)
      alert("Failed to save draft")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmitToPharmacy = async () => {
    if (prescriptionItems.length === 0) {
      alert("Please add at least one medication to the prescription")
      return
    }

    const incompleteItems = prescriptionItems.filter(item => 
      !item.frequency || !item.duration || item.quantityPrescribed === 0
    )

    if (incompleteItems.length > 0) {
      alert("Please complete all prescription items (frequency, duration)")
      return
    }

    setIsSaving(true)
    
    try {
      const prescriptionData = {
        consultationId,
        prescriptionItems,
        generalInstructions,
        priority,
        validUntil,
        totalCost: getTotalCost(),
        status: 'pending'
      }

      const response = await fetch('/api/physician/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prescriptionData)
      })

      const data = await response.json()

      if (response.ok) {
        alert("Prescription submitted to pharmacy successfully!")
        router.push("/users/physician/dashboard")
      } else {
        alert(`Failed to submit prescription: ${data.error}`)
      }
    } catch (error) {
      console.error("Failed to submit prescription:", error)
      alert("Failed to submit prescription")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreview = () => {
    // Mock preview functionality
    alert("Prescription preview would open here")
  }

  if (!consultation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p>Loading consultation data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create Prescription</h1>
        <p className="text-muted-foreground">
          Consultation: {consultation.consultationNo}
        </p>
      </div>

      {/* Patient & Consultation Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium">Patient</p>
              <p className="text-lg font-semibold">{consultation.patient.name}</p>
              <p className="text-sm text-muted-foreground">{consultation.patient.matricNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Diagnosis</p>
              <p className="text-lg font-semibold">{consultation.diagnosis}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Date</p>
              <p className="text-lg font-semibold">{format(new Date(consultation.createdAt), "MMM d, yyyy")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drug Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Add Prescription Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isSearchOpen}
                  className="w-full justify-between"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search drugs...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search drugs..."
                    value={searchQuery}
                    onValueChange={(value) => {
                      setSearchQuery(value)
                      searchDrugs(value)
                    }}
                  />
                  <CommandEmpty>No drugs found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-y-auto">
                    {searchResults.map((drug) => (
                      <CommandItem
                        key={drug.id}
                        onSelect={() => addDrugToPrescription(drug)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <p className="font-medium">{drug.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {drug.strength} • {drug.dosageForm} • {drug.category}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Stock: {drug.availableStock} • ₦{drug.unitPrice}
                            </p>
                          </div>
                          {drug.availableStock > 0 ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Prescription Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Pill className="h-5 w-5 mr-2" />
            Prescription Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {prescriptionItems.map((item, index) => {
              const drug = getDrugByName(item.drugName)
              return (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{index + 1}. {item.drugName}</h3>
                      {drug && (
                        <p className="text-sm text-muted-foreground">
                          {drug.strength} • {drug.dosageForm} • Stock: {drug.availableStock}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePrescriptionItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Label className="text-sm font-medium">Dosage</Label>
                      <Input
                        value={item.dosage}
                        onChange={(e) => updatePrescriptionItem(item.id, 'dosage', e.target.value)}
                        placeholder="e.g., 500mg"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Frequency</Label>
                      <Select
                        value={item.frequency}
                        onValueChange={(value) => updatePrescriptionItem(item.id, 'frequency', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          {frequencies.map((freq) => (
                            <SelectItem key={freq} value={freq}>
                              {freq}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Duration</Label>
                      <Select
                        value={item.duration}
                        onValueChange={(value) => updatePrescriptionItem(item.id, 'duration', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {durations.map((duration) => (
                            <SelectItem key={duration} value={duration}>
                              {duration}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Route</Label>
                      <Select
                        value={item.route}
                        onValueChange={(value) => updatePrescriptionItem(item.id, 'route', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {routes.map((route) => (
                            <SelectItem key={route} value={route}>
                              {route}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label className="text-sm font-medium">Instructions</Label>
                    <Textarea
                      value={item.instructions}
                      onChange={(e) => updatePrescriptionItem(item.id, 'instructions', e.target.value)}
                      placeholder="e.g., Take after meals with plenty of water"
                      className="mt-1"
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                      <Label className="text-sm font-medium">Quantity</Label>
                      <Input
                        value={item.quantityPrescribed}
                        readOnly
                        className="mt-1 bg-muted"
                        placeholder="Auto-calculated"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Auto-calculated</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Unit Price</Label>
                      <Input
                        value={`₦${item.unitPrice}`}
                        readOnly
                        className="mt-1 bg-muted"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total</Label>
                      <Input
                        value={`₦${item.totalPrice}`}
                        readOnly
                        className="mt-1 bg-muted font-semibold"
                      />
                    </div>
                  </div>

                  {drug && drug.availableStock < item.quantityPrescribed && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Insufficient stock! Available: {drug.availableStock}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}

            {prescriptionItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2" />
                <p>No medications added yet. Search and add drugs above.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* General Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            General Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={generalInstructions}
            onChange={(e) => setGeneralInstructions(e.target.value)}
            placeholder="General instructions for the patient..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Prescription Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Prescription Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-sm font-medium">Total Items</Label>
              <p className="text-2xl font-bold">{prescriptionItems.length}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Total Cost</Label>
              <p className="text-2xl font-bold">₦{getTotalCost()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Priority</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Valid Until</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-1 justify-start text-left font-normal",
                      !validUntil && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validUntil ? format(validUntil, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={validUntil}
                    onSelect={(date) => date && setValidUntil(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button
          onClick={handleSubmitToPharmacy}
          disabled={isSaving || prescriptionItems.length === 0}
        >
          <Send className="h-4 w-4 mr-2" />
          {isSaving ? "Submitting..." : "Submit to Pharmacy"}
        </Button>
        <Button
          variant="outline"
          onClick={handlePreview}
        >
          <FileText className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}