"use client"

import { useState } from "react";
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
      setValidationError("Please enter a valid domain (e.g., example.com)");
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          domain,
          replySubdomain,
          verificationType: 'manual'
        })
      });

      const data = await response.json();

      if (response.ok) {
        onDomainAdded(data.domain);
        
        // Redirect to domain verification view for the specific domain
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.set("tab", "domain")
          url.searchParams.set("view", "verification")
          url.searchParams.set("selectedDomain", domain)
          window.history.pushState({}, "", url.toString())
          
          // Dispatch custom event with domain verification details
          window.dispatchEvent(new CustomEvent('domain-verification-redirect', { 
            detail: { 
              tab: 'domain',
              view: 'verification',
              domain: domain
            } 
          }))
        }
        
        handleClose();
      } else {
        console.error('Failed to add domain:', data.error);
      }
    } catch (error) {
      console.error('Error creating domain:', error);
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
      setAuthError("Username is required");
      return;
    }
    
    if (!trimmedPassword) {
      setAuthError("Password is required");
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
        
        // Show success message and redirect to verification view
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set("tab", "domain");
          url.searchParams.set("view", "verification");
          url.searchParams.set("selectedDomain", domain.trim());
          window.history.pushState({}, "", url.toString());
          
          // Dispatch custom event with domain verification details
          window.dispatchEvent(new CustomEvent('domain-verification-redirect', { 
            detail: { 
              tab: 'domain',
              view: 'verification',
              domain: domain.trim()
            } 
          }));
        }
        
        handleClose();
      } else {
        // Authentication failed
        setAuthError(data.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setAuthError('Connection failed. Please try again.');
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white rounded-xl border border-gray-200 shadow-xl p-0">
        <DialogTitle className="sr-only">
          {showLogin ? `Login to ${detectedProvider}` : 
           showManualSetup ? 'Manual Setup Required' :
           isAnalyzing ? 'Analyzing Domain' : 
           'Add Domain'}
        </DialogTitle>
        <div className="relative p-6">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          {showManualSetup ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                  <span className="text-xl">⚙️</span>
                </div>
                <h2 className="text-2xl font-light text-gray-900">Manual Setup</h2>
                <p className="text-gray-500">
                  We'll guide you through setting up your domain manually
                </p>
              </div>

              {/* Steps */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">What happens next:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    We'll create your domain configuration
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    You'll get step-by-step DNS setup instructions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    Copy the DNS records to your domain provider
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    Verify your domain when ready
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button 
                  onClick={async () => {
                    // Create domain and redirect to verification view
                    try {
                      const response = await fetch('/api/domains', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          domain,
                          replySubdomain,
                          verificationType: 'manual'
                        })
                      });

                      const data = await response.json();

                      if (response.ok) {
                        onDomainAdded(data.domain);
                        handleClose();
                        
                        // Force reload the page to refresh domains list and navigate to verification
                        window.location.reload();
                        
                      } else {
                        console.error('Failed to add domain:', data.error);
                      }
                    } catch (error) {
                      console.error('Error creating domain:', error);
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
                  Continue with Manual Setup
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
                  ← Go back and try again
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
                <h2 className="text-2xl font-light text-gray-900">Connect with {detectedProvider}</h2>
              </div>

              {/* Provider description */}
              <div className="text-center">
                <p className="text-gray-500">
                  Login to automatically configure your domain
                </p>
              </div>

              {/* Login form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setAuthError(""); 
                      }}
                      placeholder="Enter username"
                      className="h-12 border-gray-300 rounded-lg pl-10 focus:ring-2 focus:ring-black focus:border-black transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setAuthError("");
                      }}
                      placeholder="Enter password"
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
                      Authenticating...
                    </>
                  ) : (
                    'Connect Domain'
                  )}
                </Button>

                {/* Manual setup option */}
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600">
                    Can't login?{" "}
                    <button 
                      onClick={async () => {
                        await createDomainManually();
                      }}
                      className="text-gray-900 hover:text-black font-medium"
                    >
                      Use manual setup instead
                    </button>
                  </p>
                </div>
              </div>
            </div>
          ) : isAnalyzing ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                  <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h2 className="text-2xl font-light text-gray-900">Analyzing Domain</h2>
                <p className="text-gray-500">
                  Checking your domain configuration
                </p>
              </div>

              {/* Progress steps */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-gray-900">Analyzed {domain}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center animate-pulse flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
                  </div>
                  <span className="text-gray-900">
                    Checking automated setup support...
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                  </div>
                  <span className="text-gray-500">Preparing your setup</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-light text-gray-900">Add New Domain</h2>
                {!isChecking && (
                  <p className="text-gray-500">
                    Enter your domain to start sending emails
                  </p>
                )}
              </div>

              {/* Checking banner */}
              {isChecking && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-700">
                      Checking domain configuration...
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Domain Name
                  </label>
                  <Input
                    value={domain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    placeholder="example.com"
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
                    Reply Subdomain
                    <span className="text-gray-500 text-xs ml-2">(where replies will be routed)</span>
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
                      <span className="text-gray-600 text-sm">.{domain || 'yourdomain.com'}</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    Full address will be: <strong>{replySubdomain}.{domain || 'yourdomain.com'}</strong>
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    Cancel
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
                    {isChecking ? 'Checking...' : 'Add Domain'}
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