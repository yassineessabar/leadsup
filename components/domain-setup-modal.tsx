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
  const [isChecking, setIsChecking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showManualSetup, setShowManualSetup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [detectedProvider, setDetectedProvider] = useState("");
  const [validationError, setValidationError] = useState("");

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
    onClose();
  };

  const handleBack = () => {
    setShowLogin(false);
    setIsAnalyzing(true);
  };

  const handleLogin = async () => {
    // Here you would integrate with the Domain Connect flow
    try {
      // Simulate successful login and domain setup
      await createDomainManually(); // For now, create manually
      handleClose();
    } catch (error) {
      console.error('Login failed:', error);
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
      <DialogContent className="sm:max-w-md bg-white rounded-3xl border-0 shadow-lg p-0">
        <DialogTitle className="sr-only">
          {showLogin ? `Login to ${detectedProvider}` : 
           showManualSetup ? 'Manual Setup Required' :
           isAnalyzing ? 'Analyzing Domain' : 
           'Add Domain'}
        </DialogTitle>
        <div className="relative p-8">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>

          {/* Content */}
          {showManualSetup ? (
            <div className="space-y-6">
              {/* Progress dots */}
              <div className="flex justify-center space-x-2 pt-4">
                <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                <div className="w-6 h-2 rounded-full bg-gray-900"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              </div>

              {/* Manual setup content */}
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⚙️</span>
                  </div>
                </div>

                <div className="px-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Manual Setup Required</h2>
                  <p className="text-lg text-gray-700">
                    We couldn't detect your DNS provider automatically. Don't worry - you can still set up your domain manually.
                  </p>
                </div>

                <div className="space-y-4 text-sm text-gray-600">
                  <div className="bg-blue-50 p-4 rounded-lg text-left">
                    <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
                    <ul className="space-y-1 text-sm">
                      <li>• We'll create your domain configuration</li>
                      <li>• You'll get step-by-step DNS setup instructions</li>
                      <li>• Copy the DNS records to your domain provider</li>
                      <li>• Verify your domain when ready</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={async () => {
                      // Create domain and redirect to verification view
                      try {
                        const response = await fetch('/api/domains', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            domain,
                            verificationType: 'manual'
                          })
                        });

                        const data = await response.json();

                        if (response.ok) {
                          onDomainAdded(data.domain);
                          
                          // Close modal first
                          handleClose();
                          
                          // Then dispatch custom event to navigate to verification
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('domain-verification-redirect', { 
                              detail: { 
                                view: 'verification',
                                domain: domain
                              } 
                            }));
                          }, 100);
                          
                        } else {
                          console.error('Failed to add domain:', data.error);
                        }
                      } catch (error) {
                        console.error('Error creating domain:', error);
                      }
                    }}
                    className="w-full h-12 text-lg font-medium bg-blue-600 text-white border-0 rounded-xl hover:bg-blue-700 mt-6"
                  >
                    Continue with Manual Setup
                  </Button>
                </div>

                <div className="text-center">
                  <button 
                    onClick={() => {
                      setShowManualSetup(false);
                      setIsAnalyzing(false);
                      setIsChecking(false);
                      // Reset to domain input screen
                    }}
                    className="text-blue-600 underline hover:text-blue-700 text-sm"
                  >
                    ← Go back and try again
                  </button>
                </div>
              </div>
            </div>
          ) : showLogin ? (
            <div className="space-y-6">
              {/* Header with back arrow and progress */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                
                {/* Progress dots */}
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                  <div className="w-6 h-2 rounded-full bg-gray-900"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                </div>
                
                <div className="w-9"></div> {/* Spacer for centering */}
              </div>

              {/* Provider logo and content */}
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  {getProviderLogo(detectedProvider)}
                </div>

                <div className="px-4">
                  <p className="text-lg text-gray-700">
                    By logging in with your {detectedProvider} details, you give us <span className="font-semibold">one-time</span> permission to connect your domain.
                  </p>
                </div>

                {/* Login form */}
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="h-14 text-lg border-gray-300 rounded-xl bg-gray-50 pl-12 pr-4 focus:bg-white focus:border-gray-400"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="h-14 text-lg border-gray-300 rounded-xl bg-gray-50 pl-12 pr-12 focus:bg-white focus:border-gray-400"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2"
                    >
                      <Eye className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  <div className="text-right">
                    <a href="#" className="text-gray-600 underline hover:text-gray-800">
                      Forgot password?
                    </a>
                  </div>

                  <Button 
                    onClick={handleLogin}
                    className="w-full h-12 text-lg font-medium bg-blue-600 text-white border-0 rounded-xl hover:bg-blue-700 mt-6"
                  >
                    Continue
                  </Button>
                </div>

                {/* Additional options */}
                <div className="space-y-4 text-sm text-gray-600">
                  <p>
                    If you can't log in or you signed up with a social account, you'll need to{" "}
                    <button 
                      onClick={async () => {
                        await createDomainManually();
                      }}
                      className="text-blue-600 underline hover:text-blue-700"
                    >
                      go to our manual setup
                    </button>.
                  </p>

                </div>
              </div>
            </div>
          ) : isAnalyzing ? (
            <div className="space-y-8">
              {/* Progress dots */}
              <div className="flex justify-center space-x-2 pt-4">
                <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              </div>

              {/* Browser illustration */}
              <div className="flex justify-center">
                <div className="relative bg-gray-100 rounded-lg p-4 w-48 h-32">
                  <div className="flex space-x-1 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-blue-200 h-8 w-20 rounded"></div>
                    <div className="space-y-1">
                      <div className="bg-gray-300 h-2 w-full rounded"></div>
                      <div className="bg-gray-300 h-2 w-3/4 rounded"></div>
                      <div className="bg-gray-300 h-2 w-1/2 rounded"></div>
                    </div>
                  </div>
                  {/* Spinning C icon */}
                  <div className="absolute -top-2 -right-2 bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center">
                    <div className="text-xl font-bold animate-spin">C</div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">Analyzing your domain</h2>
              </div>

              {/* Progress steps */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg text-gray-900">Analyzed {domain}</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-white animate-ping"></div>
                  </div>
                  <span className="text-lg text-gray-900">
                    Checking Domain Connect support: <span className="underline decoration-2">Analyzing...</span>
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                    <Check className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-lg text-gray-500">Getting your setup ready</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">Add a domain</h2>
                {!isChecking && <p className="text-lg text-gray-700">Enter your domain name</p>}
              </div>

              {/* Checking banner */}
              {isChecking && (
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl">
                  <p className="text-base">
                    We are checking if the domain provided is available and valid.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Input
                    value={domain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    placeholder="E.g. my-website.com"
                    className={`h-14 text-lg border-gray-300 rounded-xl bg-gray-50 px-4 focus:bg-white focus:border-gray-400 ${
                      validationError ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
                  />
                  {validationError && (
                    <p className="text-red-500 text-sm mt-2">{validationError}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 h-12 text-lg font-medium bg-gray-100 text-gray-700 border-0 rounded-xl hover:bg-gray-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddDomain}
                    disabled={!domain.trim() || validationError || isChecking}
                    className="flex-1 h-12 text-lg font-medium bg-blue-600 text-white border-0 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300"
                  >
                    {isChecking ? 'Checking...' : 'Add domain'}
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