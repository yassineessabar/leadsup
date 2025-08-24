"use client"

import { useState } from "react";
import { useI18n } from '@/hooks/use-i18n';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Check, ArrowLeft, User, Lock, Eye, ChevronDown } from "lucide-react";

interface DomainSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDomainAdded: (domain: any) => void;
}

export function DomainSetupModal({ isOpen, onClose, onDomainAdded }: DomainSetupModalProps) {
  const { t, ready: translationsReady } = useI18n()
  const [domain, setDomain] = useState("");
  const [replySubdomain, setReplySubdomain] = useState("reply");
  const [isChecking, setIsChecking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showManualSetup, setShowManualSetup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [detectedProvider, setDetectedProvider] = useState("");
  const [validationError, setValidationError] = useState("");
  const [authError, setAuthError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [domainError, setDomainError] = useState("");

  const validateDomain = (domain: string): boolean => {
    // More lenient domain validation regex
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
    const trimmed = domain.trim();
    return domainRegex.test(trimmed);
  };

  const handleDomainChange = (value: string) => {
    setDomain(value);
    setValidationError(""); // Clear error when user types
    
    // Show validation error if domain is not empty and invalid
    if (value.trim() && !validateDomain(value.trim())) {
      setValidationError(t('domainSetup.validation.invalidDomain'));
    }
  };

  const handleAddDomain = () => {
    const trimmedDomain = domain.trim();
    
    if (!trimmedDomain) {
      return; // Button should be disabled, but just in case
    }
    
    if (!validateDomain(trimmedDomain)) {
      // You could show an error message here if needed
      return;
    }

    setIsChecking(true);
    // Simulate domain checking process, then move to analysis
    setTimeout(() => {
      setIsChecking(false);
      setIsAnalyzing(true);
      
      // Check domain with local Domain Connect API
      setTimeout(async () => {
        try {
          // Call local API endpoint to check Domain Connect support
          const response = await fetch(`/api/domain-connect/check?domain=${encodeURIComponent(trimmedDomain)}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            }
          });

          let detectedRegistrar = null;
          let isSupported = false;

          if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.supported) {
              // Domain Connect or direct API support found
              detectedRegistrar = data.providerName || data.provider || 'Supported Provider';
              isSupported = true;
            } else {
              // No support found
              isSupported = false;
            }
          } else {
            // API error - treat as unsupported
            console.log('Domain Connect API error:', response.status);
            isSupported = false;
          }

          if (detectedRegistrar && isSupported) {
            // Provider found and supports automated setup - show login screen
            setDetectedProvider(detectedRegistrar);
            setIsAnalyzing(false);
            setShowLogin(true);
          } else {
            // No automated support found - show manual setup screen in modal
            setIsAnalyzing(false);
            setShowManualSetup(true);
          }
        } catch (error) {
          console.error('Domain Connect API failed:', error);
          // If API fails, show manual setup screen in modal
          setIsAnalyzing(false);
          setShowManualSetup(true);
        }
      }, 2000);
    }, 1500);
  };

  const createDomainManually = async () => {
    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          domain,
          replySubdomain,
          verificationType: 'manual'
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Domain created successfully (createDomainManually):', data.domain);
        onDomainAdded(data.domain);
        handleClose();
      } else {
        console.error('Failed to add domain (createDomainManually) - API response not OK:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
      }
    } catch (error) {
      console.error('Error creating domain (createDomainManually) - Exception thrown:', error);
    }
  };

  const handleCancel = () => {
    handleClose();
  };

  const handleClose = () => {
    setIsChecking(false);
    setIsAnalyzing(false);
    setShowLogin(false);
    setShowManualSetup(false);
    setDomain("");
    setUsername("");
    setPassword("");
    setDetectedProvider("");
    setValidationError("");
    setAuthError("");
    setDomainError("");
    setAuthenticating(false);
    setShowPassword(false);
    onClose();
  };

  const handleBack = () => {
    setShowLogin(false);
    setIsAnalyzing(true);
  };

  const handleLogin = async () => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    // Validation
    if (!trimmedUsername) {
      setAuthError(t('domainSetup.login.errors.usernameRequired'));
      return;
    }
    
    if (!trimmedPassword) {
      setAuthError(t('domainSetup.login.errors.passwordRequired'));
      return;
    }
    
    setAuthError("");
    setAuthenticating(true);
    
    try {
      // Authenticate with the provider
      const response = await fetch('/api/domain-connect/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          domain: domain.trim(),
          provider: detectedProvider,
          username: trimmedUsername,
          password: trimmedPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success! Domain has been configured
        onDomainAdded(data.domain);
        handleClose();
      } else {
        // Authentication failed
        setAuthError(data.error || t('domainSetup.login.errors.authFailed'));
      }
    } catch (error) {
      console.error('Login failed:', error);
      setAuthError(t('domainSetup.login.errors.connectionFailed'));
    } finally {
      setAuthenticating(false);
    }
  };

  const getProviderLogo = (provider: string) => {
    switch (provider) {
      case 'Namecheap':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded transform rotate-45"></div>
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded transform -rotate-45 -ml-4"></div>
            <span className="text-2xl font-light text-gray-600 ml-2">namecheap</span>
          </div>
        );
      case 'GoDaddy':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">Go</span>
            </div>
            <span className="text-2xl font-light text-gray-600">GoDaddy</span>
          </div>
        );
      case 'Cloudflare':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">CF</span>
            </div>
            <span className="text-2xl font-light text-gray-600">Cloudflare</span>
          </div>
        );
      default:
        return (
          <span className="text-2xl font-light text-gray-600">{provider}</span>
        );
    }
  };

  if (!translationsReady) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white rounded-xl border border-gray-200 shadow-xl p-0">
        <DialogTitle className="sr-only">
          {showLogin ? t('domainSetup.login.title', { provider: detectedProvider }) : 
           showManualSetup ? t('domainSetup.manual.title') :
           isAnalyzing ? t('domainSetup.analyzing.title') : 
           t('domainSetup.title')}
        </DialogTitle>
        <div className="relative p-6">
          {/* Content */}
          {showManualSetup ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-light text-gray-900">{t('domainSetup.manual.title')}</h2>
                <p className="text-gray-500">
                  {t('domainSetup.manual.description')}
                </p>
              </div>

              {/* Steps */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">{t('domainSetup.manual.steps.title')}</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    {t('domainSetup.manual.steps.createConfig')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    {t('domainSetup.manual.steps.getInstructions')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    {t('domainSetup.manual.steps.copyRecords')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    {t('domainSetup.manual.steps.verifyDomain')}
                  </li>
                </ul>
              </div>

              {/* Error display */}
              {domainError && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">
                  {domainError}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Button 
                  onClick={async () => {
                    // Clear any previous errors
                    setDomainError("");
                    
                    // Create domain and redirect to verification view
                    try {
                      const response = await fetch('/api/domains', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          domain,
                          replySubdomain,
                          verificationType: 'manual'
                        })
                      });

                      const data = await response.json();

                      if (response.ok) {
                        console.log('✅ Domain created successfully:', data.domain);
                        onDomainAdded(data.domain);
                        handleClose();
                        
                      } else {
                        console.error('Failed to add domain - API response not OK:', {
                          status: response.status,
                          statusText: response.statusText,
                          data
                        });
                        setDomainError(data.error || `Server error: ${response.status} ${response.statusText}`);
                      }
                    } catch (error) {
                      console.error('Error creating domain - Exception thrown:', error);
                      setDomainError(`Network error: ${error.message}`);
                    }
                  }}
                  className="w-full text-white py-2.5 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                  }}
                >
                  {t('domainSetup.manual.continueButton')}
                </Button>

                <button 
                  onClick={() => {
                    setShowManualSetup(false);
                    setIsAnalyzing(false);
                    setIsChecking(false);
                    // Reset to domain input screen
                  }}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors"
                >
                  {t('domainSetup.manual.backButton')}
                </button>
              </div>
            </div>
          ) : showLogin ? (
            <div className="space-y-6">
              {/* Header with back arrow */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-2xl font-light text-gray-900">{t('domainSetup.login.connectWith', { provider: detectedProvider })}</h2>
              </div>

              {/* Provider description */}
              <div className="text-center">
                <p className="text-gray-500">
                  {t('domainSetup.login.description')}
                </p>
              </div>

              {/* Login form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('domainSetup.login.username')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setAuthError(""); 
                      }}
                      placeholder={t('domainSetup.login.usernamePlaceholder')}
                      className="h-12 border-gray-300 rounded-lg pl-10 focus:ring-2 focus:ring-black focus:border-black transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('domainSetup.login.password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setAuthError("");
                      }}
                      placeholder={t('domainSetup.login.passwordPlaceholder')}
                      className="h-12 border-gray-300 rounded-lg pl-10 pr-10 focus:ring-2 focus:ring-black focus:border-black transition-colors"
                      onKeyPress={(e) => e.key === 'Enter' && !authenticating && username.trim() && password.trim() && handleLogin()}
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">
                    {authError}
                  </div>
                )}

                <Button 
                  onClick={handleLogin}
                  disabled={authenticating || !username.trim() || !password.trim()}
                  className="w-full text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300"
                  style={{ backgroundColor: authenticating || !username.trim() || !password.trim() ? undefined : 'rgb(87, 140, 255)' }}
                  onMouseEnter={(e) => {
                    if (!(authenticating || !username.trim() || !password.trim())) {
                      e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(authenticating || !username.trim() || !password.trim())) {
                      e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                    }
                  }}
                >
                  {authenticating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {t('domainSetup.login.authenticating')}
                    </>
                  ) : (
                    t('domainSetup.login.connectButton')
                  )}
                </Button>

                {/* Manual setup option */}
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600">
                    {t('domainSetup.login.cantLogin')}{" "}
                    <button 
                      onClick={async () => {
                        await createDomainManually();
                      }}
                      className="text-gray-900 hover:text-black font-medium"
                    >
                      {t('domainSetup.login.useManualSetup')}
                    </button>
                  </p>
                </div>
              </div>
            </div>
          ) : isAnalyzing ? (
            <div className="space-y-8">
              {/* Header with better spinner */}
              <div className="text-center space-y-4">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-blue-400 animate-spin animate-reverse"></div>
                </div>
                <div>
                  <h2 className="text-2xl font-light text-gray-900 mb-2">{t('domainSetup.analyzing.title')}</h2>
                  <p className="text-gray-500">
                    {t('domainSetup.analyzing.description')}
                  </p>
                </div>
              </div>

              {/* Enhanced progress steps */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('domainSetup.analyzing.steps.validation')}</div>
                      <div className="text-sm text-gray-500">{t('domainSetup.analyzing.steps.verified', { domain })}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('domainSetup.analyzing.steps.detection')}</div>
                      <div className="text-sm text-gray-500">{t('domainSetup.analyzing.steps.checking')}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-500">{t('domainSetup.analyzing.steps.preparation')}</div>
                      <div className="text-sm text-gray-400">{t('domainSetup.analyzing.steps.preparing')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-light text-gray-900">{t('domainSetup.title')}</h2>
                {!isChecking && (
                  <p className="text-gray-500">
                    {t('domainSetup.description')}
                  </p>
                )}
              </div>

              {/* Checking banner */}
              {isChecking && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-700">
                      {t('domainSetup.checking')}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t('domainSetup.domainName')}
                  </label>
                  <Input
                    value={domain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    placeholder={t('domainSetup.domainPlaceholder')}
                    className={`h-12 border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors ${
                      validationError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
                    }`}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
                  />
                  {validationError && (
                    <p className="text-red-500 text-sm mt-2">{validationError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t('domainSetup.replySubdomain')}
                    <span className="text-gray-500 text-xs ml-2">({t('domainSetup.replySubdomainNote')})</span>
                  </label>
                  <div className="flex items-center">
                    <Input
                      value={replySubdomain}
                      onChange={(e) => setReplySubdomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                      placeholder="reply"
                      className="h-12 border-gray-300 rounded-l-lg focus:ring-2 focus:ring-black focus:border-black transition-colors flex-shrink-0"
                      style={{ maxWidth: '120px' }}
                    />
                    <div className="bg-gray-50 border border-l-0 border-gray-300 h-12 px-3 flex items-center rounded-r-lg">
                      <span className="text-gray-600 text-sm">.{domain || t('domainSetup.yourDomainExample')}</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    {t('domainSetup.fullAddressWillBe')} <strong>{replySubdomain}.{domain || t('domainSetup.yourDomainExample')}</strong>
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    {t('domainSetup.cancel')}
                  </Button>
                  <Button
                    onClick={handleAddDomain}
                    disabled={!domain.trim() || validationError || isChecking}
                    className="flex-1 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:bg-gray-300"
                    style={{ backgroundColor: !domain.trim() || validationError || isChecking ? undefined : 'rgb(87, 140, 255)' }}
                    onMouseEnter={(e) => {
                      if (!(!domain.trim() || validationError || isChecking)) {
                        e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(!domain.trim() || validationError || isChecking)) {
                        e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                      }
                    }}
                  >
                    {isChecking ? t('domainSetup.checking') : t('domainSetup.addButton')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}