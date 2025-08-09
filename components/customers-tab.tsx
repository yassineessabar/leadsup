"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Search,
  Download,
  Filter,
  Plus,
  Upload,
  Users,
  Mail,
  Phone,
  Edit,
  Trash2,
  Send,
  X,
  AlertTriangle,
  UploadCloud,
  UserPlus,
  Zap,
  Crown,
  Info,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lock,
  Plug
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { UpgradeProDialog } from "./upgrade-pro-dialog"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  type: "sms" | "email" | "both"
  status: "active" | "inactive"
  created_at: Date
  updated_at: Date
  last_request_sent?: Date
  last_request_type?: "sms" | "email"
  last_request_status?: "pending" | "sent" | "delivered" | "failed" | "opened" | "clicked"
  shopify_customer_id?: string
  shopify_total_spent?: number
  shopify_orders_count?: number
  shopify_tags?: string
  request_history?: Array<{
    id: string
    sent_at: Date
    request_type: "sms" | "email"
    status: string
  }>
}

interface CustomersTabProps {
  onTabChange?: (tab: string) => void
}

export function CustomersTab({ onTabChange }: CustomersTabProps = {}) {
  const { toast } = useToast()
  const router = useRouter()

  // Table state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [userInfo, setUserInfo] = useState<{
    subscription_type?: string;
    subscription_status?: string;
  }>({})
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [customerRequests, setCustomerRequests] = useState<{[key: string]: any[]}>({})

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showIndividualSendDialog, setShowIndividualSendDialog] = useState(false)
  const [selectedCustomerForSend, setSelectedCustomerForSend] = useState<Customer | null>(null)
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null)
  const [selectedCustomerForDelete, setSelectedCustomerForDelete] = useState<Customer | null>(null)

  // Form states
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    type: "email" as "sms" | "email"
  })

  // Form validation errors
  const [formErrors, setFormErrors] = useState({
    name: "",
    email: "",
    phone: ""
  })

  const [editCustomer, setEditCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    type: "email" as "sms" | "email"
  })

  // Edit form validation errors
  const [editFormErrors, setEditFormErrors] = useState({
    name: "",
    email: "",
    phone: ""
  })

  // CSV upload states
  const [uploadingCsv, setUploadingCsv] = useState(false)
  const [csvErrors, setCsvErrors] = useState<string[]>([])

  // Shopify sync states
  const [syncingShopify, setSyncingShopify] = useState(false)
  const [isShopifyConnected, setIsShopifyConnected] = useState(false)

  // Send requests states
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [sendType, setSendType] = useState<"sms" | "email">("email")
  const [isSending, setIsSending] = useState(false)

  // Load customers (mock data for now)
  // Load customers from API
  const fetchCustomers = async () => {
    setLoading(true)
    try {

      // First, sync request status from review_requests table
      try {
        await fetch('/api/customers/sync-request-status', {
          method: 'POST',
          credentials: 'include'
        })
      } catch (syncError) {
        // Status sync failed (non-critical)
      }

      const queryParams = new URLSearchParams()
      if (searchTerm) queryParams.set("search", searchTerm)
      if (filterType !== "all") queryParams.set("type", filterType)
      if (filterStatus !== "all") queryParams.set("status", filterStatus)

      const response = await fetch(`/api/customers?${queryParams}`, {
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        const transformedCustomers = result.data.map((customer: any) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          type: customer.type,
          status: customer.status,
          last_request_sent: customer.last_request_sent ? new Date(customer.last_request_sent) : undefined,
          last_request_type: customer.last_request_type,
          last_request_status: customer.last_request_status,
          shopify_customer_id: customer.shopify_customer_id,
          shopify_total_spent: customer.shopify_total_spent,
          shopify_orders_count: customer.shopify_orders_count,
          shopify_tags: customer.shopify_tags,
          created_at: new Date(customer.created_at),
          updated_at: new Date(customer.updated_at)
        }))
        setCustomers(transformedCustomers)
      } else {
        throw new Error(result.error || "Failed to fetch customers")
      }
    } catch (error) {
      // Error fetching customers
      toast({
        title: "Error",
        description: "Failed to load customers. Please try again.",
        variant: "destructive",
      })
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  // Check Shopify connection status
  const checkShopifyConnection = async () => {
    try {
      const response = await fetch('/api/integrations', {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        const integrations = result.data || result.integrations || []
        const shopifyIntegration = integrations.find((int: any) =>
          int.platform_name === 'shopify' && int.integration_status === 'connected'
        )
        setIsShopifyConnected(!!shopifyIntegration)
      }
    } catch (error) {
      // Error checking Shopify connection
      setIsShopifyConnected(false)
    }
  }

  // Fetch review request history for a customer
  const fetchCustomerRequests = async (customerEmail: string | undefined, customerPhone: string | undefined) => {
    if (!customerEmail && !customerPhone) return []

    try {
      const queryParams = new URLSearchParams()
      if (customerEmail) queryParams.set('email', customerEmail)
      if (customerPhone) queryParams.set('phone', customerPhone)

      const response = await fetch(`/api/review-requests?${queryParams.toString()}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          return result.data.filter((req: any) =>
            (customerEmail && req.contact_email === customerEmail) ||
            (customerPhone && req.contact_phone === customerPhone)
          )
        }
      }
    } catch (error) {
      console.error('Error:', error)
    }
    return []
  }

  // Toggle row expansion
  const toggleRowExpansion = async (customerId: string, customerEmail?: string, customerPhone?: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId)
    } else {
      newExpanded.add(customerId)
      // Fetch requests if not already loaded
      if (!customerRequests[customerId]) {
        const requests = await fetchCustomerRequests(customerEmail, customerPhone)
        setCustomerRequests(prev => ({ ...prev, [customerId]: requests }))
      }
    }
    setExpandedRows(newExpanded)
  }

  // Fetch user subscription info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" })
        const data = await response.json()
        if (data.success && data.user) {
          setUserInfo({
            subscription_type: data.user.subscription_type,
            subscription_status: data.user.subscription_status,
          })
        }
      } catch (error) {
        // Error fetching user info
      }
    }
    fetchUserInfo()
  }, [])

  // Initial load
  useEffect(() => {
    fetchCustomers()
    checkShopifyConnection()
  }, [])

  // Reload when filters change
  useEffect(() => {
    fetchCustomers()
  }, [searchTerm, filterType, filterStatus])

  const handleAddCustomer = async () => {
    // Reset errors
    setFormErrors({ name: "", email: "", phone: "" })

    let hasErrors = false
    const errors = { name: "", email: "", phone: "" }

    // Validate name
    if (!newCustomer.name.trim()) {
      errors.name = "Please enter a customer name."
      hasErrors = true
    }

    // Validate contact information
    if (!newCustomer.email && !newCustomer.phone) {
      errors.email = "Please provide at least an email or phone number."
      hasErrors = true
    }

    // Validate email format if provided
    if (newCustomer.email && newCustomer.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newCustomer.email.trim())) {
        errors.email = "Please enter a valid email address (e.g., user@example.com)."
        hasErrors = true
      } else {
        // Check for duplicate email in existing customers
        const existingEmailCustomer = customers.find(customer =>
          customer.email && customer.email.toLowerCase() === newCustomer.email.trim().toLowerCase()
        )
        if (existingEmailCustomer) {
          errors.email = `A customer with this email already exists.`
          hasErrors = true
        }
      }
    }

    // Validate phone format if provided
    if (newCustomer.phone && newCustomer.phone.trim()) {
      const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/
      const cleanPhone = newCustomer.phone.replace(/\D/g, '')
      if (!phoneRegex.test(newCustomer.phone) || cleanPhone.length < 10) {
        errors.phone = "Please enter a valid phone number with at least 10 digits."
        hasErrors = true
      } else {
        // Check for duplicate phone number in existing customers
        const existingPhoneCustomer = customers.find(customer =>
          customer.phone && customer.phone.replace(/\D/g, '') === cleanPhone
        )
        if (existingPhoneCustomer) {
          errors.phone = `A customer with this phone number already exists.`
          hasErrors = true
        }
      }
    }

    if (hasErrors) {
      setFormErrors(errors)
      return
    }

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          name: newCustomer.name,
          email: newCustomer.email || null,
          phone: newCustomer.phone || null,
          type: newCustomer.type
        })
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle duplicate customer error (409 status)
        if (response.status === 409) {
          throw new Error("Customer already exists")
        }
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      if (result.success && result.data) {
        // Refresh the customers list
        await fetchCustomers()

        setNewCustomer({ name: "", email: "", phone: "", type: "email" })
        setFormErrors({ name: "", email: "", phone: "" })
        setShowAddDialog(false)

        // Enhanced success message based on communication type
        let enrollmentMessage = ""
        if (newCustomer.type === "email") {
          enrollmentMessage = " and enrolled in email campaigns"
        } else if (newCustomer.type === "sms") {
          enrollmentMessage = " and enrolled in SMS campaigns"
        } else if (newCustomer.type === "both") {
          enrollmentMessage = " and enrolled in email & SMS campaigns"
        }

        toast({
          title: "Customer Added",
          description: `${newCustomer.name} has been added successfully${enrollmentMessage}.`,
        })
      } else {
        throw new Error(result.error || "Failed to create customer")
      }
    } catch (error: any) {
      // Handle duplicate customer error specifically
      if (error.message?.includes("Customer already exists")) {
        // Try to determine which field has the duplicate
        if (newCustomer.email) {
          setFormErrors(prev => ({ ...prev, email: "A customer with this email already exists." }))
        }
        if (newCustomer.phone) {
          setFormErrors(prev => ({ ...prev, phone: "A customer with this phone number already exists." }))
        }
        toast({
          title: "Customer Already Exists",
          description: "A customer with this email or phone number already exists in your database.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create customer. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleEditCustomer = async () => {
    if (!selectedCustomerForEdit) return

    // Validate name
    if (!editCustomer.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a customer name.",
        variant: "destructive",
      })
      return
    }

    // Validate contact information
    if (!editCustomer.email && !editCustomer.phone) {
      toast({
        title: "Contact Information Required",
        description: "Please provide at least an email or phone number.",
        variant: "destructive",
      })
      return
    }

    // Validate email format if provided
    if (editCustomer.email && editCustomer.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(editCustomer.email.trim())) {
        toast({
          title: "Invalid Email Format",
          description: "Please enter a valid email address (e.g., user@example.com).",
          variant: "destructive",
        })
        return
      }

      // Check for duplicate email in existing customers (excluding current customer)
      const existingEmailCustomer = customers.find(customer =>
        customer.id !== selectedCustomerForEdit?.id &&
        customer.email && customer.email.toLowerCase() === editCustomer.email.trim().toLowerCase()
      )
      if (existingEmailCustomer) {
        toast({
          title: "Email Already Exists",
          description: `A customer with the email "${editCustomer.email.trim()}" already exists in your database.`,
          variant: "destructive",
        })
        return
      }
    }

    // Validate phone format if provided
    if (editCustomer.phone && editCustomer.phone.trim()) {
      const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/
      const cleanPhone = editCustomer.phone.replace(/\D/g, '')
      if (!phoneRegex.test(editCustomer.phone) || cleanPhone.length < 10) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number with at least 10 digits.",
          variant: "destructive",
        })
        return
      }

      // Check for duplicate phone number in existing customers (excluding current customer)
      const existingPhoneCustomer = customers.find(customer =>
        customer.id !== selectedCustomerForEdit?.id &&
        customer.phone && customer.phone.replace(/\D/g, '') === cleanPhone
      )
      if (existingPhoneCustomer) {
        toast({
          title: "Phone Number Already Exists",
          description: `A customer with the phone number "${editCustomer.phone.trim()}" already exists in your database.`,
          variant: "destructive",
        })
        return
      }
    }

    try {
      const response = await fetch("/api/customers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          id: selectedCustomerForEdit.id,
          name: editCustomer.name,
          email: editCustomer.email || null,
          phone: editCustomer.phone || null,
          type: editCustomer.type
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${result.error || 'Unknown error'}`)
      }

      if (result.success && result.data) {
        // Refresh the customers list
        await fetchCustomers()

        setShowEditDialog(false)
        setSelectedCustomerForEdit(null)
        setEditCustomer({ name: "", email: "", phone: "", type: "both" })

        toast({
          title: "Customer Updated",
          description: `${editCustomer.name} has been updated successfully.`,
        })
      } else {
        throw new Error(result.error || "Failed to update customer")
      }
    } catch (error: any) {
      // Error updating customer
      toast({
        title: "Error",
        description: error.message || "Failed to update customer. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCustomer = async () => {
    if (!selectedCustomerForDelete) return

    try {
      const response = await fetch(`/api/customers?id=${selectedCustomerForDelete.id}`, {
        method: "DELETE",
        credentials: "include"
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${result.error || 'Unknown error'}`)
      }

      if (result.success) {
        // Refresh the customers list
        await fetchCustomers()

        toast({
          title: "Customer Deleted",
          description: `${selectedCustomerForDelete.name} has been deleted successfully.`,
        })

        setShowDeleteDialog(false)
        setSelectedCustomerForDelete(null)
      } else {
        throw new Error(result.error || "Failed to delete customer")
      }
    } catch (error: any) {
      // Error deleting customer
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomerForEdit(customer)
    setEditCustomer({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      type: customer.type
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomerForDelete(customer)
    setShowDeleteDialog(true)
  }

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadingCsv(true)
    setCsvErrors([])

    const file = event.target.files?.[0]
    if (!file) {
      setUploadingCsv(false)
      return
    }

    try {
      const fileText = await file.text()
      const lines = fileText.split('\n').filter(line => line.trim())

      if (lines.length === 0) {
        toast({
          title: "Empty File",
          description: "The CSV file appears to be empty.",
          variant: "destructive",
        })
        setUploadingCsv(false)
        return
      }

      const customersToUpload: any[] = []

      const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0

      lines.slice(startIndex).forEach((line) => {
        const parts = line.split(',').map(part => part.trim().replace(/^"(.+)"$/, '$1'))

        if (parts.length >= 2) {
          const name = parts[0]
          const email = parts[1]
          const phone = parts[2] || ""

          if (name && (email || phone)) {
            customersToUpload.push({
              name,
              email: email || null,
              phone: phone || null
            })
          }
        }
      })

      if (customersToUpload.length === 0) {
        toast({
          title: "No Valid Customers",
          description: "No valid customers found in the CSV file.",
          variant: "destructive",
        })
        setUploadingCsv(false)
        return
      }

      // Send to bulk API
      const response = await fetch("/api/customers/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          customers: customersToUpload
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        // Refresh the customers list
        await fetchCustomers()

        setShowBulkDialog(false)

        const { insertedCount, errorCount, errors } = result.data

        if (insertedCount > 0) {
          toast({
            title: "Bulk Upload Successful",
            description: `${insertedCount} customer${insertedCount > 1 ? 's' : ''} added${errorCount > 0 ? `. ${errorCount} row${errorCount > 1 ? 's' : ''} had errors.` : '.'}`
          })
        }

        if (errorCount > 0 && errors) {
          setCsvErrors(errors)
          if (insertedCount === 0) {
            toast({
              title: "Bulk Upload Failed",
              description: `All ${errorCount} row${errorCount > 1 ? 's' : ''} had errors.`,
              variant: "destructive",
            })
          }
        }
      } else {
        throw new Error(result.error || "Failed to upload customers")
      }

    } catch (error: any) {
      // Error uploading customers
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to process CSV file.",
        variant: "destructive",
      })
    } finally {
      setUploadingCsv(false)
      event.target.value = ""
    }
  }

  const handleSendRequests = async () => {
    if (selectedCustomers.length === 0) {
      toast({
        title: "No Customers Selected",
        description: "Please select customers to send requests to.",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    let successCount = 0
    let failCount = 0

    try {
      // Send requests to each selected customer
      for (const customerId of selectedCustomers) {
        const customer = customers.find(c => c.id === customerId)
        if (!customer) continue

        // Skip if customer doesn't have the required contact method
        if (sendType === "email" && !customer.email) {
          failCount++
          continue
        }
        if (sendType === "sms" && !customer.phone) {
          failCount++
          continue
        }

        try {
          const response = await fetch("/api/customers/send-request", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              customer_id: customerId,
              request_type: sendType
            })
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          // Failed to send to customer
          failCount++
        }
      }

      // Refresh customers list to show updated last request info
      await fetchCustomers()

      // Show results
      if (successCount > 0 && failCount === 0) {
        toast({
          title: "Requests Sent Successfully",
          description: `Review requests sent to ${successCount} customer${successCount > 1 ? 's' : ''} via ${sendType.toUpperCase()}.`,
        })
      } else if (successCount > 0 && failCount > 0) {
        toast({
          title: "Partial Success",
          description: `Sent to ${successCount} customer${successCount > 1 ? 's' : ''}, failed for ${failCount} customer${failCount > 1 ? 's' : ''}.`,
          variant: "default",
        })
      } else {
        toast({
          title: "Send Failed",
          description: `Failed to send review requests to all ${failCount} selected customer${failCount > 1 ? 's' : ''}.`,
          variant: "destructive",
        })
      }

      setSelectedCustomers([])
      setShowSendDialog(false)
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send review requests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone?.includes(searchTerm)
    const matchesType = filterType === "all" || customer.type === filterType
    const matchesStatus = filterStatus === "all" || customer.status === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType, filterStatus])

  const handleIndividualSendRequest = async (customer: Customer) => {
    if (!sendType) {
      toast({
        title: "Send Type Required",
        description: "Please select SMS or Email send method.",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)

    // Close the dialog immediately for better UX
    setShowIndividualSendDialog(false)
    setSelectedCustomerForSend(null)

    // Show immediate feedback that the request is being processed
    toast({
      title: "Sending Request...",
      description: `Preparing to send ${sendType.toUpperCase()} review request to ${customer.name}`,
    })

    try {
      // Send actual review request via SMS or Email
      const response = await fetch("/api/customers/send-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          customer_id: customer.id,
          request_type: sendType
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${result.error || 'Unknown error'}`)
      }

      if (result.success) {
        // Refresh customers list to show updated last request info
        await fetchCustomers()

        const statusMessage = result.data.status === "sent"
          ? `Review request sent successfully to ${customer.name} via ${sendType.toUpperCase()}.`
          : `Review request was queued for ${customer.name} via ${sendType.toUpperCase()}.`

        toast({
          title: result.data.status === "sent" ? "✅ Request Sent" : "📤 Request Queued",
          description: statusMessage,
        })
      } else {
        throw new Error(result.error || "Failed to send review request")
      }
    } catch (error: any) {
      // Error sending request
      console.error("Send request error:", error)
      toast({
        title: "❌ Send Failed",
        description: error.message || "Failed to send review request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
      setSendType("email") // Reset send type
    }
  }

  const handleExportCustomers = () => {
    const csvContent = [
      ["Name", "Email", "Phone", "Type", "Status", "Created", "Last Request", "Shopify Orders", "Shopify Spent"],
      ...filteredCustomers.map(customer => [
        customer.name,
        customer.email || "",
        customer.phone || "",
        customer.type,
        customer.status,
        customer.created_at.toLocaleDateString(),
        customer.last_request_sent ? customer.last_request_sent.toLocaleDateString() : "",
        customer.shopify_orders_count?.toString() || "",
        customer.shopify_total_spent?.toString() || ""
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "customers.csv"
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Export Successful",
      description: "Customers have been exported to CSV.",
    })
  }

  const handleShopifySync = async () => {
    setSyncingShopify(true)
    try {

      // Use the proper Shopify sync API with duplicate prevention
      const response = await fetch('/api/integrations/shopify/sync-customers', {
        method: 'POST',
        credentials: 'include'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync Shopify customers')
      }

      if (result.success) {
        // Refresh customers list
        await fetchCustomers()

        const { totalFetched, totalInserted, totalSkipped, errors, message } = result.data

        if (totalInserted === 0 && message) {
          // No new customers to import
          toast({
            title: "Shopify Sync Complete",
            description: message,
          })
        } else {
          // New customers were imported
          toast({
            title: "Shopify Sync Complete",
            description: `Imported ${totalInserted} new customers from Shopify${totalSkipped > 0 ? ` (skipped ${totalSkipped} existing)` : ''}${errors?.length > 0 ? ` (${errors.length} errors)` : ''}.`,
          })
        }
      } else {
        throw new Error(result.error || 'Sync failed')
      }
    } catch (error: any) {
      // Shopify sync error
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync Shopify customers. Make sure you've run the database migration first.",
        variant: "destructive",
      })
    } finally {
      setSyncingShopify(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "sms": return "bg-green-100 text-green-800"
      case "email": return "bg-blue-100 text-blue-800"
      case "both": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "inactive": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full bg-white shadow-sm px-4 py-2 flex items-center gap-2 text-lg font-semibold hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Audience
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {!(userInfo.subscription_type && userInfo.subscription_type !== 'free' && userInfo.subscription_status === 'active') && (
            <UpgradeProDialog>
              <Button
                variant="outline"
                className="rounded-full gap-2 bg-violet-50 text-violet-600 border-violet-300 hover:bg-violet-100 shadow-sm"
              >
                <Crown className="h-4 w-4" />
                Try Pro for free
              </Button>
            </UpgradeProDialog>
          )}
          <Button
      onClick={() => router.push("?tab=integrations")}
      variant="outline"
      className="rounded-full gap-2 shadow-sm bg-white hover:bg-gray-50"
    >
      <Plug className="h-4 w-4" />
      Integrations
    </Button>
          <Button
            onClick={() => setShowSendDialog(true)}
            variant="outline"
            className="rounded-full gap-2 shadow-sm bg-white hover:bg-gray-50"
            disabled={selectedCustomers.length === 0}
          >
            <Send className="w-4 h-4" />
            Send Requests {selectedCustomers.length > 0 && `(${selectedCustomers.length})`}
          </Button>
          <Button onClick={handleExportCustomers} variant="outline" className="rounded-full gap-2 shadow-sm bg-white hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Gradient Banner - Hidden for Pro/Enterprise users */}
      {!(userInfo.subscription_type && userInfo.subscription_type !== 'free' && userInfo.subscription_status === 'active') && (
        <div className="relative flex items-center justify-between rounded-xl p-6 text-white mb-6" style={{ background: 'linear-gradient(90deg, hsla(31, 90%, 76%, 1) 0%, hsla(279, 92%, 90%, 1) 100%)' }}>
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">Convert more contacts into customers</h2>
            <p className="text-sm">Unlock smarter data to grow and sell faster on Pro</p>
            <UpgradeProDialog>
              <Button className="mt-4 w-fit rounded-full bg-black px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700">
                <Zap className="mr-2 h-5 w-5" />
                Try it for free
              </Button>
            </UpgradeProDialog>
          </div>
        </div>
      )}

      {/* Main Content Card for Audience */}
      <Card className="p-6 rounded-xl shadow-sm bg-white dark:bg-gray-800">
        {/* Filter and Actions */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px] rounded-full">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sms">SMS Only</SelectItem>
              <SelectItem value="email">Email Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] rounded-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Filter by email..."
              className="pl-9 rounded-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={() => setShowBulkDialog(true)}
            variant="outline"
            className="flex items-center gap-2 rounded-full bg-transparent"
          >
            <Upload className="w-4 h-4" />
            Bulk Add
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 rounded-full bg-black text-white hover:bg-gray-800"
          >
            <UserPlus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>

        {/* Table Headers - Updated to match database fields */}
        <div className="grid grid-cols-7 gap-4 py-3 text-sm font-medium text-gray-500 border-b border-gray-200 dark:border-gray-700">
          <span className="col-span-2">Customer</span>
          <span>Type</span>
          <span>Status</span>
          <span>Added on</span>
          <span>Email History</span>
          <span className="text-center">Actions</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading customers...</p>
            </div>
          </div>
        ) : paginatedCustomers.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500 dark:text-gray-400">
            <Users className="h-16 w-16 mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-semibold">You don't have any subscribers that meet this criteria.</p>
            <p className="text-sm mt-1">To grow your list, share your Linktree!</p>
          </div>
        ) : (
          /* Customer Data in New Format - Updated to match database fields */
          <div className="space-y-4">
            {paginatedCustomers.map((customer) => (
              <React.Fragment key={customer.id}>
              <div className="grid grid-cols-7 gap-4 py-4 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                {/* Customer (Name + Email/Phone) */}
                <div className="col-span-2 flex items-center gap-3">
                  <Checkbox
                    checked={selectedCustomers.includes(customer.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCustomers(prev => [...prev, customer.id])
                      } else {
                        setSelectedCustomers(prev => prev.filter(id => id !== customer.id))
                      }
                    }}
                  />
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      {customer.name}
                      {customer.shopify_customer_id && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14.2 10.6L10.6 14.2C10.4 14.4 10.4 14.7 10.6 14.9C10.8 15.1 11.1 15.1 11.3 14.9L14.9 11.3C15.1 11.1 15.1 10.8 14.9 10.6C14.7 10.4 14.4 10.4 14.2 10.6Z"/>
                            <path d="M8 7H6.5C5.1 7 4 8.1 4 9.5V17.5C4 18.9 5.1 20 6.5 20H14.5C15.9 20 17 18.9 17 17.5V16M13 4H20V11M20 4L13 11"/>
                          </svg>
                          <span className="text-xs text-green-600 font-medium">Shopify</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.shopify_orders_count !== undefined && customer.shopify_orders_count > 0 && (
                        <div className="text-xs text-gray-500">
                          {customer.shopify_orders_count} orders • ${customer.shopify_total_spent?.toFixed(2) || '0.00'} spent
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Type */}
                <div className="flex items-center">
                  {(customer.type as any) === 'both' ? (
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        EMAIL
                      </Badge>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        SMS
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="secondary" className={getTypeColor(customer.type)}>
                      {customer.type.toUpperCase()}
                    </Badge>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center">
                  <Badge variant="secondary" className={getStatusColor(customer.status)}>
                    {customer.status}
                  </Badge>
                </div>

                {/* Added on (Created Date) */}
                <div className="flex items-center text-gray-600">
                  {customer.created_at.toLocaleDateString()}
                </div>

                {/* Email History */}
                <div className="flex items-center text-gray-600">
                  {customer.last_request_sent ? (
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-gray-100 rounded"
                          onClick={() => toggleRowExpansion(customer.id, customer.email, customer.phone)}
                        >
                          {expandedRows.has(customer.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <div>
                          <div className="text-gray-900">
                            {customer.last_request_sent.toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                              {customer.last_request_type?.toUpperCase()}
                            </Badge>
                            {customerRequests[customer.id] && customerRequests[customer.id].length > 1 && (
                              <span className="text-xs text-gray-500">
                                +{customerRequests[customer.id].length - 1} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500">Never</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-blue-50"
                    onClick={() => {
                      setSelectedCustomerForSend(customer)
                      setSendType(customer.type === "sms" ? "sms" : "email")
                      setShowIndividualSendDialog(true)
                    }}
                    title="Send Review Request"
                  >
                    <Send className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-gray-50"
                    onClick={() => openEditDialog(customer)}
                    title="Edit Customer"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-red-50"
                    onClick={() => openDeleteDialog(customer)}
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>

              {/* Expanded Email History */}
              {expandedRows.has(customer.id) && customerRequests[customer.id] && (
                <div className="col-span-7 bg-gray-50 p-4 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Email History</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customerRequests[customer.id].length === 0 ? (
                      <p className="text-sm text-gray-500">No email history found</p>
                    ) : (
                      customerRequests[customer.id].map((request: any) => (
                        <div key={request.id} className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              <span className="font-medium">
                                {new Date(request.sent_at).toLocaleDateString()}
                              </span>
                              <span className="text-gray-500 ml-2">
                                {new Date(request.sent_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {request.request_type?.toUpperCase() || 'EMAIL'}
                            </Badge>
                            {request.status && (
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  request.status === 'sent' ? 'bg-green-100 text-green-800' :
                                  request.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                                  request.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  request.status === 'opened' ? 'bg-purple-100 text-purple-800' :
                                  request.status === 'clicked' ? 'bg-indigo-100 text-indigo-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {request.status.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          {request.subject_line && (
                            <div className="text-sm text-gray-600 truncate max-w-xs" title={request.subject_line}>
                              Subject: {request.subject_line}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-transparent"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-transparent"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Items per page</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value))
                setCurrentPage(1) // Reset to first page when changing items per page
              }}
            >
              <SelectTrigger className="w-[70px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Shopify Sync Button */}
      {isShopifyConnected && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleShopifySync}
            variant="outline"
            className="flex items-center gap-2 rounded-full"
            disabled={syncingShopify}
          >
            {syncingShopify ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.2 10.6L10.6 14.2C10.4 14.4 10.4 14.7 10.6 14.9C10.8 15.1 11.1 15.1 11.3 14.9L14.9 11.3C15.1 11.1 15.1 10.8 14.9 10.6C14.7 10.4 14.4 10.4 14.2 10.6Z"/>
                <path d="M8 7H6.5C5.1 7 4 8.1 4 9.5V17.5C4 18.9 5.1 20 6.5 20H14.5C15.9 20 17 18.9 17 17.5V16M13 4H20V11M20 4L13 11"/>
              </svg>
            )}
            {syncingShopify ? 'Syncing...' : 'Sync Shopify'}
          </Button>
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open)
        if (!open) {
          // Clear form and errors when dialog closes
          setNewCustomer({ name: "", email: "", phone: "", type: "email" })
          setFormErrors({ name: "", email: "", phone: "" })
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add New Customer
            </DialogTitle>
            <DialogDescription>
              Enter the customer's information to add them to your database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name *</Label>
              <Input
                id="customer-name"
                placeholder="Enter customer name"
                value={newCustomer.name}
                onChange={(e) => {
                  setNewCustomer(prev => ({ ...prev, name: e.target.value }))
                  if (formErrors.name) setFormErrors(prev => ({ ...prev, name: "" }))
                }}
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && (
                <p className="text-sm text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-email">Email Address</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="customer@email.com"
                value={newCustomer.email}
                onChange={(e) => {
                  setNewCustomer(prev => ({ ...prev, email: e.target.value }))
                  if (formErrors.email) setFormErrors(prev => ({ ...prev, email: "" }))
                }}
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && (
                <p className="text-sm text-red-500">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone Number</Label>
              <Input
                id="customer-phone"
                placeholder="+1 (555) 123-4567"
                value={newCustomer.phone}
                onChange={(e) => {
                  setNewCustomer(prev => ({ ...prev, phone: e.target.value }))
                  if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: "" }))
                }}
                className={formErrors.phone ? "border-red-500" : ""}
              />
              {formErrors.phone && (
                <p className="text-sm text-red-500">{formErrors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-type">Communication Type</Label>
              <Select
                value={newCustomer.type}
                onValueChange={(value: "sms" | "email" | "both") =>
                  setNewCustomer(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="both">Both Email & SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer}>
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Bulk Add Customers
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to add multiple customers at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV file with columns: Name, Email, Phone
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkUpload}
                className="hidden"
                id="csv-upload"
                disabled={uploadingCsv}
              />
              <Button
                onClick={() => document.getElementById('csv-upload')?.click()}
                disabled={uploadingCsv}
                className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5]"
              >
                {uploadingCsv ? "Uploading..." : "Choose File"}
              </Button>
            </div>

            {/* CSV Upload Errors */}
            {csvErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800 font-medium mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  CSV Upload Errors ({csvErrors.length} issues found)
                </div>
                <div className="space-y-2 text-sm text-red-700 max-h-32 overflow-y-auto">
                  {csvErrors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              <p className="font-medium mb-2">CSV Format:</p>
              <p>• First row can be headers (Name, Email, Phone)</p>
              <p>• Each row should have: Customer Name, Email, Phone Number</p>
              <p>• Email and Phone are optional but at least one is required</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Requests Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Review Requests
            </DialogTitle>
            <DialogDescription>
              Send review requests to {selectedCustomers.length} selected customer{selectedCustomers.length > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Send Method</Label>
              <select
                value={sendType}
                onChange={(e) => setSendType(e.target.value as "sms" | "email")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                This will send review requests using your configured {sendType.toUpperCase()} campaign template
                to {selectedCustomers.length} customer{selectedCustomers.length > 1 ? 's' : ''}.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendRequests}
              disabled={isSending}
              className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5]"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Requests
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Send Request Dialog */}
      <Dialog open={showIndividualSendDialog} onOpenChange={setShowIndividualSendDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Review Request
            </DialogTitle>
            <DialogDescription>
              Send a review request to {selectedCustomerForSend?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{selectedCustomerForSend?.name}</span>
                <Badge variant="secondary" className={getTypeColor(selectedCustomerForSend?.type || "email")}>
                  {selectedCustomerForSend?.type?.toUpperCase()}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {selectedCustomerForSend?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    <span>{selectedCustomerForSend.email}</span>
                  </div>
                )}
                {selectedCustomerForSend?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    <span>{selectedCustomerForSend.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Send Method Selection */}
            <div className="space-y-2">
              <Label>Send Method</Label>
              <select
                value={sendType}
                onChange={(e) => setSendType(e.target.value as "sms" | "email")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {(selectedCustomerForSend?.email || selectedCustomerForSend?.type === "email" || selectedCustomerForSend?.type === "both") && (
                  <option value="email">Email</option>
                )}
                {(selectedCustomerForSend?.phone || selectedCustomerForSend?.type === "sms" || selectedCustomerForSend?.type === "both") && (
                  <option value="sms">SMS</option>
                )}
              </select>
            </div>

            {/* Last Request Info */}
            {selectedCustomerForSend?.last_request_sent && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <span className="font-medium">Last request sent:</span> {selectedCustomerForSend.last_request_sent.toLocaleDateString()} via {selectedCustomerForSend.last_request_type?.toUpperCase()}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowIndividualSendDialog(false)
                setSelectedCustomerForSend(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedCustomerForSend && handleIndividualSendRequest(selectedCustomerForSend)}
              disabled={isSending || !sendType}
              className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending {sendType.toUpperCase()}...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send {sendType.toUpperCase()} Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Customer
            </DialogTitle>
            <DialogDescription>
              Update {selectedCustomerForEdit?.name}'s information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-customer-name">Customer Name *</Label>
              <Input
                id="edit-customer-name"
                placeholder="Enter customer name"
                value={editCustomer.name}
                onChange={(e) => setEditCustomer(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-customer-email">Email Address</Label>
              <Input
                id="edit-customer-email"
                type="email"
                placeholder="customer@email.com"
                value={editCustomer.email}
                onChange={(e) => setEditCustomer(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-customer-phone">Phone Number</Label>
              <Input
                id="edit-customer-phone"
                placeholder="+1 (555) 123-4567"
                value={editCustomer.phone}
                onChange={(e) => setEditCustomer(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-customer-type">Communication Type</Label>
              <Select
                value={editCustomer.type}
                onValueChange={(value: "sms" | "email" | "both") =>
                  setEditCustomer(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="both">Both Email & SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false)
                setSelectedCustomerForEdit(null)
                setEditCustomer({ name: "", email: "", phone: "", type: "both" })
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditCustomer}>
              Update Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Customer
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCustomerForDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomerForDelete && (
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <div className="font-medium text-red-900">{selectedCustomerForDelete.name}</div>
                  {selectedCustomerForDelete.email && (
                    <div className="flex items-center gap-2 text-red-700">
                      <Mail className="w-3 h-3" />
                      <span>{selectedCustomerForDelete.email}</span>
                    </div>
                  )}
                  {selectedCustomerForDelete.phone && (
                    <div className="flex items-center gap-2 text-red-700">
                      <Phone className="w-3 h-3" />
                      <span>{selectedCustomerForDelete.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setSelectedCustomerForDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCustomer}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}