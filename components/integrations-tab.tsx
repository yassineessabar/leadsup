import { useState } from "react"
import { useI18n } from '@/hooks/use-i18n'
import { Settings, AlertTriangle, Play, Info, User, Cog, Clock, Zap, Plus, Mail, CheckCircle, XCircle, Linkedin, Phone } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

export function IntegrationsTab() {
  const { t, ready } = useI18n()
  const [showConnectDropdown, setShowConnectDropdown] = useState(false)
  
  if (!ready) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">{t ? t('common.loading') : 'Loading...'}</div>
    </div>
  }
  const [showLinkedInModal, setShowLinkedInModal] = useState(false)
  const [showEmailProviderModal, setShowEmailProviderModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500 border-green-500"
    if (score >= 60) return "text-orange-500 border-orange-500" 
    return "text-red-500 border-red-500"
  }

  const handleConnectAccount = (type: string) => {
    setShowConnectDropdown(false)
    if (type === 'email') {
      setShowEmailProviderModal(true)
    } else if (type === 'linkedin') {
      setShowLinkedInModal(true)
    }
  }

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

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('integrations.connectedAccounts')}</h1>
              <p className="text-gray-600 mt-1">{t('integrations.manageAccounts')}</p>
            </div>
            <div className="relative">
              <Button
                variant="default"
                className="flex items-center space-x-2 text-white bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowConnectDropdown(!showConnectDropdown)}
              >
                <Plus className="w-4 h-4" />
                <span>{t('integrations.connectAccount')}</span>
              </Button>
              
              {/* Connect Account Dropdown */}
              {showConnectDropdown && (
                <div className="absolute right-0 top-12 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => handleConnectAccount('email')}
                  >
                    <Mail className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <div className="font-medium">{t('integrations.emailAccount')}</div>
                      <div className="text-xs text-gray-500">{t('integrations.emailAccountDesc')}</div>
                    </div>
                  </button>
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => handleConnectAccount('linkedin')}
                  >
                    <Linkedin className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <div className="font-medium">{t('integrations.linkedinAccount')}</div>
                      <div className="text-xs text-gray-500">{t('integrations.linkedinAccountDesc')}</div>
                    </div>
                  </button>
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => handleConnectAccount('phone')}
                  >
                    <Phone className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <div className="font-medium">{t('integrations.phoneNumber')}</div>
                      <div className="text-xs text-gray-500">{t('integrations.phoneNumberDesc')}</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('integrations.totalAccounts')}</p>
                  <p className="text-2xl font-bold text-gray-900">{emailAccounts.length}</p>
                </div>
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('integrations.activeWarmup')}</p>
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
                  <p className="text-sm font-medium text-gray-600">{t('integrations.needAttention')}</p>
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
                  <p className="text-sm font-medium text-gray-600">{t('integrations.avgScore')}</p>
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

      {/* Accounts Table */}
      <div className="px-6 py-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-1 flex items-center space-x-2 text-gray-500 text-sm font-medium">
                <User className="w-4 h-4" />
                <span>{t('integrations.account')}</span>
              </div>
              <div className="w-32 flex items-center justify-center text-gray-500 text-sm font-medium">
                <Cog className="w-4 h-4" />
                <span className="ml-1">{t('integrations.setupStatus')}</span>
              </div>
              <div className="w-32 flex items-center justify-center text-gray-500 text-sm font-medium">
                <Clock className="w-4 h-4" />
                <span className="ml-1">{t('integrations.dailyLimit')}</span>
              </div>
              <div className="w-32 flex items-center justify-center text-gray-500 text-sm font-medium">
                <Zap className="w-4 h-4" />
                <span className="ml-1">{t('integrations.healthScore')}</span>
              </div>
              <div className="w-20 flex items-center justify-center text-gray-500 text-sm font-medium">
                <Settings className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {emailAccounts.map((account) => (
              <div key={account.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center">
                  
                  {/* Account Info */}
                  <div className="flex-1 flex items-center space-x-4">
                    <Switch
                      checked={account.enabled}
                      onCheckedChange={() => toggleAccount(account.id)}
                    />
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-red-500 text-sm font-bold">G</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{account.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={account.warmupStatus === 'active' 
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-100" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-100"}>
                            {account.warmupStatus === 'active' ? t('integrations.active') : t('integrations.paused')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Setup Status */}
                  <div className="w-32 flex justify-center">
                    {account.techSetupComplete ? (
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-50">
                        <XCircle className="w-5 h-5 text-orange-500" />
                      </div>
                    )}
                  </div>

                  {/* Daily Limit */}
                  <div className="w-32 flex justify-center">
                    <div className="flex items-center space-x-3">
                      <button 
                        className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 text-gray-500 transition-colors"
                        onClick={() => updateDailyLimit(account.id, -5)}
                      >
                        <span className="text-sm">−</span>
                      </button>
                      <span className="text-lg font-semibold text-gray-900 min-w-[40px] text-center">{account.dailyLimit}</span>
                      <button 
                        className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 text-gray-500 transition-colors"
                        onClick={() => updateDailyLimit(account.id, 5)}
                      >
                        <span className="text-sm">+</span>
                      </button>
                    </div>
                  </div>

                  {/* Health Score */}
                  <div className="w-32 flex justify-center">
                    <div className={`w-12 h-12 bg-white border-2 rounded-full flex items-center justify-center ${getScoreColor(account.score)}`}>
                      <span className="text-sm font-bold">{account.score}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-20 flex justify-center">
                    <Button 
                      variant="ghost"
                      size="sm" 
                      className="p-2 hover:bg-gray-100 transition-colors"
                      onClick={() => openSettingsModal(account.id)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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
                    <h3 className="font-semibold text-gray-900 mb-2">{t('integrations.downloadExtension')}</h3>
                    <p className="text-sm text-gray-600">{t('integrations.downloadExtensionDesc')}</p>
                  </div>
                  <Button className="ml-4 bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center space-x-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/>
                    </svg>
                    <span>{t('integrations.downloadFor')}</span>
                    <span className="font-semibold">{t('integrations.googleChrome')}</span>
                  </Button>
                </div>

                {/* Step 2 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">{t('integrations.linkAccount')}</h3>
                    <p className="text-sm text-gray-600">{t('integrations.linkAccountDesc')}</p>
                  </div>
                  <Button className="ml-4 bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2">
                    <span>{t('integrations.goToLinkedin')}</span>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15,3 21,3 21,9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </Button>
                </div>

                {/* Step 3 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('integrations.importContacts')}</h3>
                  <p className="text-sm text-gray-600">{t('integrations.importContactsDesc')}</p>
                </div>
              </div>
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
                <h2 className="text-lg font-semibold text-gray-900">{t('integrations.selectEmailProvider')}</h2>
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
                {t('integrations.chooseProvider')}
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
                    <span className="font-medium text-gray-900">{t('integrations.googleGmail')}</span>
                  </div>
                  <Button variant="outline" size="sm">{t('integrations.connect')}</Button>
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
                    <span className="font-medium text-gray-900">{t('integrations.microsoftOutlook')}</span>
                  </div>
                  <Button variant="outline" size="sm">{t('integrations.connect')}</Button>
                </div>

                <div className="text-center text-gray-500 text-sm py-2">{t('integrations.or')}</div>

                {/* Other email provider */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">{t('integrations.otherEmailProvider')}</span>
                  </div>
                  <Button variant="outline" size="sm">{t('integrations.connect')}</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && selectedAccountId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('integrations.emailWarmupSettings')}</h2>
            
            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-600">
                {t('integrations.warmupImportance')}
              </p>
              
              <p className="text-sm text-gray-600">
                {t('integrations.warmupRecommendation')}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* Email warmup settings would go here */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">{t('integrations.emailWarmupSettings')}</span>
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('integrations.configureWarmupParams')}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={closeSettingsModal}>
                {t('button.cancel')}
              </Button>
              <Button onClick={closeSettingsModal} className="bg-blue-600 hover:bg-blue-700">
                {t('button.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}