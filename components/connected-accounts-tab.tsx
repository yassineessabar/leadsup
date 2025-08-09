"use client"

import { useState } from "react"
import { Settings, AlertTriangle, Play, Info, User, Cog, Clock, Zap, Plus, Mail, Phone, Linkedin, Search, Filter, HelpCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function Component() {
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [warmupSettings, setWarmupSettings] = useState({
    increment: 1,
    emailCap: 10,
    usePlaintextSignature: true
  })

  const [emailAccounts, setEmailAccounts] = useState([
    {
      id: 1,
      email: "essabar.yassine@gmail.com",
      provider: "gmail",
      enabled: true,
      dailyLimit: 50,
      score: 85,
      actionRequired: false,
      warmupStatus: "active",
      techSetupComplete: true
    },
    {
      id: 2,
      email: "mouai.tax@gmail.com",
      provider: "gmail",
      enabled: true,
      dailyLimit: 50,
      score: 70,
      actionRequired: true,
      warmupStatus: "paused",
      techSetupComplete: false
    }
  ])

  const [showTechnicalModal, setShowTechnicalModal] = useState(false)
  const [selectedTechnicalAccount, setSelectedTechnicalAccount] = useState<string>('')
  const [showTooltip, setShowTooltip] = useState<number | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<{id: number, email: string} | null>(null)

  const [showConnectDropdown, setShowConnectDropdown] = useState(false)
  const [showEmailProviderModal, setShowEmailProviderModal] = useState(false)
  const [showLinkedInModal, setShowLinkedInModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const updateDailyLimit = (id: number, change: number) => {
    setEmailAccounts(accounts =>
      accounts.map(account =>
        account.id === id
          ? { ...account, dailyLimit: Math.max(0, account.dailyLimit + change) }
          : account
      )
    )
  }

  const toggleAccount = (id: number) => {
    setEmailAccounts(accounts =>
      accounts.map(account =>
        account.id === id
          ? { ...account, enabled: !account.enabled }
          : account
      )
    )
  }

  const openSettingsModal = (accountId: number) => {
    setSelectedAccountId(accountId)
    setShowSettingsModal(true)
  }

  const closeSettingsModal = () => {
    setShowSettingsModal(false)
    setSelectedAccountId(null)
  }

  const updateWarmupSetting = (setting: 'increment' | 'emailCap', change: number) => {
    setWarmupSettings(prev => ({
      ...prev,
      [setting]: Math.max(1, prev[setting] + change)
    }))
  }

  const openTechnicalModal = (email: string) => {
    setSelectedTechnicalAccount(email)
    setShowTechnicalModal(true)
  }

  const closeTechnicalModal = () => {
    setShowTechnicalModal(false)
    setSelectedTechnicalAccount('')
  }

  const openDeleteModal = (accountId: number, email: string) => {
    setAccountToDelete({ id: accountId, email })
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setAccountToDelete(null)
  }

  const confirmDelete = () => {
    if (accountToDelete) {
      setEmailAccounts(accounts => 
        accounts.filter(account => account.id !== accountToDelete.id)
      )
    }
    closeDeleteModal()
  }

  const handleConnectAccount = (type: string) => {
    setShowConnectDropdown(false)
    if (type === 'email') {
      setShowEmailProviderModal(true)
    } else if (type === 'linkedin') {
      setShowLinkedInModal(true)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500 border-green-500"
    if (score >= 60) return "text-orange-500 border-orange-500"
    return "text-red-500 border-red-500"
  }

  const getWarmupStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Active</Badge>
      case 'paused':
        return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">Paused</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">Inactive</Badge>
    }
  }

  const filteredAccounts = emailAccounts.filter(account =>
    account.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Connected Accounts</h1>
              <p className="text-gray-600 mt-1">Manage your email and social accounts for outreach campaigns</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="default"
                className="flex items-center space-x-2 text-white bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowConnectDropdown(!showConnectDropdown)}
              >
                <Plus className="w-4 h-4" />
                <span>Connect Account</span>
              </Button>
              
              {/* Connect Account Dropdown */}
              {showConnectDropdown && (
                <div className="absolute right-6 top-20 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => handleConnectAccount('email')}
                  >
                    <Mail className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <div className="font-medium">Email Account</div>
                      <div className="text-xs text-gray-500">Gmail, Outlook, or SMTP</div>
                    </div>
                  </button>
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => handleConnectAccount('linkedin')}
                  >
                    <Linkedin className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <div className="font-medium">LinkedIn Account</div>
                      <div className="text-xs text-gray-500">Social outreach & prospecting</div>
                    </div>
                  </button>
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => handleConnectAccount('phone')}
                  >
                    <Phone className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <div className="font-medium">Phone Number</div>
                      <div className="text-xs text-gray-500">SMS & calling campaigns</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                  <p className="text-2xl font-bold text-gray-900">{emailAccounts.length}</p>
                </div>
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Warmup</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {emailAccounts.filter(acc => acc.warmupStatus === 'active').length}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Need Attention</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {emailAccounts.filter(acc => acc.actionRequired).length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(emailAccounts.reduce((sum, acc) => sum + acc.score, 0) / emailAccounts.length)}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showConnectDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowConnectDropdown(false)}
        />
      )}

      {/* Accounts List */}
      <div className="px-6 py-6">
        {filteredAccounts.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? "No accounts match your search." : "Connect your first account to get started with outreach campaigns."}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setShowConnectDropdown(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Connect Your First Account
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAccounts.map((account) => (
              <div key={account.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  
                  {/* Account Info */}
                  <div className="lg:col-span-4">
                    <div className="flex items-center space-x-4">
                      <Switch
                        checked={account.enabled}
                        onCheckedChange={() => toggleAccount(account.id)}
                        className="data-[state=checked]:bg-blue-500"
                      />
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                          {account.provider === 'gmail' && (
                            <span className="text-red-500 text-sm font-bold">G</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{account.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getWarmupStatusBadge(account.warmupStatus)}
                            {account.techSetupComplete ? (
                              <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Setup Complete
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
                                <XCircle className="w-3 h-3 mr-1" />
                                Setup Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tech Setup */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-center">
                      {account.actionRequired ? (
                        <button
                          className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-50 hover:bg-orange-100 transition-colors"
                          onClick={() => openTechnicalModal(account.email)}
                          onMouseEnter={() => setShowTooltip(account.id)}
                          onMouseLeave={() => setShowTooltip(null)}
                        >
                          <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z"/>
                          </svg>
                          {showTooltip === account.id && (
                            <div className="absolute bg-gray-900 text-white text-xs rounded px-2 py-1 z-10 whitespace-nowrap mt-12">
                              Technical setup required
                            </div>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50">
                          <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4"/>
                            <path d="M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.745 3.745 0 0 1 3.296-1.043A3.745 3.745 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Daily Limit */}
                  <div className="lg:col-span-2">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">Daily Limit</p>
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 text-gray-500 transition-colors"
                          onClick={() => updateDailyLimit(account.id, -5)}
                        >
                          <span className="text-sm leading-none">−</span>
                        </button>
                        <span className="text-lg font-semibold text-gray-900 min-w-[40px]">{account.dailyLimit}</span>
                        <button
                          className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 text-gray-500 transition-colors"
                          onClick={() => updateDailyLimit(account.id, 5)}
                        >
                          <span className="text-sm leading-none">+</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="lg:col-span-2">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">Health Score</p>
                      <div className={`w-12 h-12 mx-auto bg-white border-3 rounded-full flex items-center justify-center ${getScoreColor(account.score)}`}>
                        <span className="text-lg font-bold">{account.score}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center space-x-2"
                        disabled={!account.enabled}
                      >
                        <Play className="w-3 h-3" />
                        <span>Launch Warmup</span>
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSettingsModal(account.id)}
                          className="p-2"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(account.id, account.email)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="px-6 pb-6">
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <div className="flex items-start space-x-4">
            <HelpCircle className="w-6 h-6 text-gray-500 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Need Help Getting Started?</h3>
              <p className="text-gray-600 mb-4">
                Email warmup is crucial for deliverability. We recommend warming up accounts for 3-4 weeks before sending campaigns.
              </p>
              <div className="flex space-x-3">
                <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  View Setup Guide
                </Button>
                <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All existing modals remain the same */}
      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email warm up settings</h2>
            
            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-600">
                Warming up your emails is a very important step in optimizing your deliverability. This will help your emails avoid the spam folder and get more replies.
              </p>
              
              <p className="text-sm text-gray-600">
                We recommend you warming up your emails for about 3 to 4 weeks before sending cold emails with lemlist campaigns
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* Email warmup increment */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Email warmup increment</span>
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      className="w-6 h-6 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
                      onClick={() => updateWarmupSetting('increment', -1)}
                    >
                      <span className="text-sm leading-none">−</span>
                    </button>
                    <span className="text-sm font-medium min-w-[20px] text-center">{warmupSettings.increment}</span>
                    <button
                      className="w-6 h-6 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
                      onClick={() => updateWarmupSetting('increment', 1)}
                    >
                      <span className="text-sm leading-none">+</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Email warmup email cap */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Email warmup email cap</span>
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      className="w-6 h-6 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
                      onClick={() => updateWarmupSetting('emailCap', -1)}
                    >
                      <span className="text-sm leading-none">−</span>
                    </button>
                    <span className="text-sm font-medium min-w-[20px] text-center">{warmupSettings.emailCap}</span>
                    <button
                      className="w-6 h-6 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
                      onClick={() => updateWarmupSetting('emailCap', 1)}
                    >
                      <span className="text-sm leading-none">+</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Access analytics section */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Access your warm-up analytics</h3>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Get a full picture about your warm-up process and how your deliverability evolves over time
                </p>
                <Button variant="outline" size="sm" className="ml-4 flex items-center space-x-1">
                  <span className="text-sm">Open analytics</span>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15,3 21,3 21,9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </Button>
              </div>
            </div>

            {/* Plaintext signature toggle */}
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Switch
                  checked={warmupSettings.usePlaintextSignature}
                  onCheckedChange={(checked) => 
                    setWarmupSettings(prev => ({ ...prev, usePlaintextSignature: checked }))
                  }
                  className="data-[state=checked]:bg-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Use plaintext signature in lemwarm</span>
              </div>
              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                <span className="text-sm">Setup</span>
                <Settings className="w-3 h-3" />
              </Button>
            </div>

            {/* Modal buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={closeSettingsModal}>
                Cancel
              </Button>
              <Button onClick={closeSettingsModal} className="bg-blue-600 hover:bg-blue-700">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Technical Setup Modal */}
      {showTechnicalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Technical setup for {selectedTechnicalAccount}
              </h2>
              <button
                onClick={closeTechnicalModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                To avoid landing in spam, each technical setup below is required before sending emails.
              </p>
              
              <div className="space-y-4">
                {/* SPF */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">SPF</h3>
                      <p className="text-sm text-gray-600">Guarantees that your emails have been sent from your domain.</p>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">All good</span>
                        <button className="text-blue-600 text-sm hover:text-blue-700">
                          <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          See test details
                        </button>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                </div>

                {/* DKIM */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">DKIM</h3>
                      <p className="text-sm text-gray-600">Guarantees your email content isn't changed after you send it.</p>
                      <div className="mt-2">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">All good</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                </div>

                {/* MX Records */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">MX Records</h3>
                      <p className="text-sm text-gray-600">Helps email providers know what servers accept your emails.</p>
                      <div className="mt-2">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">All good</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                </div>

                {/* DMARC */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">DMARC</h3>
                      <p className="text-sm text-gray-600">Protects your domain from hacking attacks.</p>
                      <div className="mt-2">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">All good</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                </div>

                {/* Custom Tracking Domain */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Custom Tracking Domain</h3>
                      <p className="text-sm text-gray-600">Allows you to track open/click rates safely and add images to emails.</p>
                      <div className="mt-2">
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not configured</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                </div>

                {/* Blacklists */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Blacklists</h3>
                      <p className="text-sm text-gray-600">Helps email providers know that you are not a spammer.</p>
                      <div className="mt-2">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">All good</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && accountToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Unlink Google account</h2>
            
            <p className="text-sm text-gray-600 mb-6">
              Unlinking your Google account will stop all campaigns for that account. Are you sure?
            </p>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={closeDeleteModal}>
                Cancel
              </Button>
              <Button onClick={confirmDelete} className="bg-blue-600 hover:bg-blue-700">
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Provider Selection Modal */}
      {showEmailProviderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-gray-900">Select your email provider</h2>
                <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                  <Mail className="w-3 h-3 text-white" />
                </div>
              </div>
              <button
                onClick={() => setShowEmailProviderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Choose the provider you use to log into your email account.
              </p>
              
              <div className="space-y-4">
                {/* Google/Gmail */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">Google / Gmail</span>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>

                {/* Microsoft/Outlook */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 9v6h10V9H7zm8 4H9v-2h6v2z"/>
                        <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H4V5h16v14z"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">Microsoft / Outlook</span>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>

                <div className="text-center text-gray-500 text-sm py-2">or</div>

                {/* Other email provider */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">Other email provider (SMTP/IMAP)</span>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LinkedIn Connection Modal */}
      {showLinkedInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4">
            <div className="flex items-center justify-end p-4">
              <button
                onClick={() => setShowLinkedInModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="px-6 pb-6">
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">1. Download the lemlist extension</h3>
                    <p className="text-sm text-gray-600">Make sure to have the lemlist Chrome extension for LinkedIn.</p>
                  </div>
                  <Button className="ml-4 bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center space-x-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/>
                    </svg>
                    <span>Download for</span>
                    <span className="font-semibold">Google chrome</span>
                  </Button>
                </div>

                {/* Step 2 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">2. Link your lemlist account to your LinkedIn account</h3>
                    <p className="text-sm text-gray-600">Make sure your lemlist account is linked to the extension.</p>
                  </div>
                  <Button className="ml-4 bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2">
                    <span>Go to LinkedIn</span>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15,3 21,3 21,9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </Button>
                </div>

                {/* Step 3 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. Import your contacts and refresh lemlist page</h3>
                  <p className="text-sm text-gray-600">Do a LinkedIn search and import the contacts to your CRM.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}