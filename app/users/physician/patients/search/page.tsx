"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  AlertTriangle,
  Stethoscope,
  FileText,
  Clock,
  Pill,
  Activity,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface Patient {
  id: string
  matricNumber: string
  firstName: string
  lastName: string
  otherNames?: string
  age: number
  gender: string
  bloodGroup?: string
  genotype?: string
  allergies?: string
  chronicConditions?: string
  phone?: string
  department: string
  level: string
  faculty: string
  emergencyContact: string
  emergencyPhone: string
}

interface PatientHistory {
  consultations: Array<{
    id: string
    consultationNo: string
    date: string
    diagnosis: string
    physician: string
    status: string
  }>
  prescriptions: Array<{
    id: string
    prescriptionNo: string
    date: string
    diagnosis: string
    status: string
    itemCount: number
  }>
  vitalSigns: Array<{
    id: string
    date: string
    temperature?: number
    bloodPressure?: string
    pulse?: number
    weight?: number
  }>
}

export default function PatientSearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const router = useRouter()

  const searchPatients = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    
    try {
      const response = await fetch(`/api/physician/patients/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      
      if (response.ok) {
        setSearchResults(data.patients || [])
      } else {
        console.error("Failed to search patients:", data.error)
        setSearchResults([])
      }
    } catch (error) {
      console.error("Failed to search patients:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const loadPatientHistory = async (patientId: string) => {
    setIsLoadingHistory(true)
    

    try {
      const response = await fetch(`/api/physician/patients/${patientId}/history`)
      const data = await response.json()
      
      if (response.ok) {
        setPatientHistory(data)
      } else {
        console.error("Failed to load patient history:", data.error)
        setPatientHistory({
          consultations: [],
          prescriptions: [],
          vitalSigns: []
        })
      }
    } catch (error) {
      console.error("Failed to load patient history:", error)
      setPatientHistory({
        consultations: [],
        prescriptions: [],
        vitalSigns: []
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient)
    loadPatientHistory(patient.id)
  }

  const handleNewConsultation = () => {
    if (selectedPatient) {
      router.push(`/users/physician/consultations/new?patientId=${selectedPatient.id}`)
    }
  }

  const handleAddToQueue = async () => {
    if (!selectedPatient) return
    
    try {
      const response = await fetch('/api/physician/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: selectedPatient.id,
          priority: 'normal',
          notes: 'Added from patient search'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(`${selectedPatient.firstName} ${selectedPatient.lastName} added to queue`)
      } else {
        alert(`Failed to add patient to queue: ${data.error}`)
      }
    } catch (error) {
      console.error("Failed to add patient to queue:", error)
      alert("Failed to add patient to queue")
    }
  }

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      searchPatients(searchQuery)
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [searchQuery])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Patient Search</h1>
        <p className="text-muted-foreground">
          Search for patients and view their medical records
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Search Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Search Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Search by name, matric number, or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>

                {/* Search Results */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((patient) => (
                      <div
                        key={patient.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPatient?.id === patient.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => handlePatientSelect(patient)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {patient.matricNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {patient.department} • {patient.level} Level
                            </p>
                          </div>
                          <Badge variant="outline">{patient.gender}</Badge>
                        </div>
                      </div>
                    ))
                  ) : searchQuery.length >= 2 ? (
                    <div className="text-center py-4">
                      <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No patients found</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Type at least 2 characters to search
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient Details */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <div className="space-y-6">
              {/* Patient Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Patient Information
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button onClick={handleNewConsultation}>
                        <Stethoscope className="h-4 w-4 mr-2" />
                        New Consultation
                      </Button>
                      <Button variant="outline" onClick={handleAddToQueue}>
                        <Clock className="h-4 w-4 mr-2" />
                        Add to Queue
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                          {selectedPatient.otherNames && ` ${selectedPatient.otherNames}`}
                        </h3>
                        <p className="text-muted-foreground">{selectedPatient.matricNumber}</p>
                      </div>

                      <div className="grid gap-3">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">Age: {selectedPatient.age} years</span>
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">Gender: {selectedPatient.gender}</span>
                        </div>
                        {selectedPatient.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm">{selectedPatient.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">
                            {selectedPatient.department}, {selectedPatient.faculty}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Medical Info */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Medical Information</h4>
                        <div className="grid gap-2">
                          {selectedPatient.bloodGroup && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Blood Group:</span>
                              <span className="text-sm font-medium">{selectedPatient.bloodGroup}</span>
                            </div>
                          )}
                          {selectedPatient.genotype && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Genotype:</span>
                              <span className="text-sm font-medium">{selectedPatient.genotype}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedPatient.allergies && (
                        <div>
                          <h4 className="font-medium mb-2 text-red-600">Allergies</h4>
                          <Badge variant="destructive" className="text-xs">
                            {selectedPatient.allergies}
                          </Badge>
                        </div>
                      )}

                      {selectedPatient.chronicConditions && (
                        <div>
                          <h4 className="font-medium mb-2 text-orange-600">Chronic Conditions</h4>
                          <Badge variant="secondary" className="text-xs">
                            {selectedPatient.chronicConditions}
                          </Badge>
                        </div>
                      )}

                      <div>
                        <h4 className="font-medium mb-2">Emergency Contact</h4>
                        <div className="text-sm">
                          <p>{selectedPatient.emergencyContact}</p>
                          <p className="text-muted-foreground">{selectedPatient.emergencyPhone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical History */}
              {isLoadingHistory ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading medical history...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : patientHistory && (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Recent Consultations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <FileText className="h-5 w-5 mr-2" />
                        Recent Consultations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {patientHistory.consultations.length > 0 ? (
                          patientHistory.consultations.map((consultation) => (
                            <div key={consultation.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-sm">{consultation.diagnosis}</p>
                                <Badge variant="outline" className="text-xs">
                                  {consultation.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {consultation.consultationNo} • {consultation.date}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                by {consultation.physician}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No previous consultations
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Prescriptions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Pill className="h-5 w-5 mr-2" />
                        Recent Prescriptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {patientHistory.prescriptions.length > 0 ? (
                          patientHistory.prescriptions.map((prescription) => (
                            <div key={prescription.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-sm">{prescription.diagnosis}</p>
                                <Badge variant="outline" className="text-xs">
                                  {prescription.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {prescription.prescriptionNo} • {prescription.date}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {prescription.itemCount} medication(s)
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No previous prescriptions
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Latest Vital Signs */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Activity className="h-5 w-5 mr-2" />
                        Latest Vital Signs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {patientHistory.vitalSigns.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-4">
                          {patientHistory.vitalSigns[0].temperature && (
                            <div className="text-center">
                              <p className="text-2xl font-bold text-red-600">
                                {patientHistory.vitalSigns[0].temperature}°C
                              </p>
                              <p className="text-sm text-muted-foreground">Temperature</p>
                            </div>
                          )}
                          {patientHistory.vitalSigns[0].bloodPressure && (
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-600">
                                {patientHistory.vitalSigns[0].bloodPressure}
                              </p>
                              <p className="text-sm text-muted-foreground">Blood Pressure</p>
                            </div>
                          )}
                          {patientHistory.vitalSigns[0].pulse && (
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">
                                {patientHistory.vitalSigns[0].pulse} bpm
                              </p>
                              <p className="text-sm text-muted-foreground">Pulse</p>
                            </div>
                          )}
                          {patientHistory.vitalSigns[0].weight && (
                            <div className="text-center">
                              <p className="text-2xl font-bold text-purple-600">
                                {patientHistory.vitalSigns[0].weight} kg
                              </p>
                              <p className="text-sm text-muted-foreground">Weight</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No vital signs recorded
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Patient Selected</h3>
                  <p className="text-muted-foreground">
                    Search for a patient on the left to view their details and medical history
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}