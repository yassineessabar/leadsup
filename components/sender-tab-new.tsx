import { useState, useEffect } from "react"

// Modern Sender Tab Component
export const SenderTabContent = ({
  connectedEmailAccounts,
  selectedEmailAccount,
  setSelectedEmailAccount,
  gmailAuthLoading,
  initiateGmailOAuth,
  testGmailConnection,
  campaignId,
  Send,
  toast
}) => {
  const [showTestModal, setShowTestModal] = useState(false)
  const [testModalEmail, setTestModalEmail] = useState('')
  const [testModalSender, setTestModalSender] = useState(null)
  const [testModalLoading, setTestModalLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  // Load user email
  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-cache"
        })
        const result = await response.json()
        if (result.success && result.user?.email) {
          setUserEmail(result.user.email)
        }
      } catch (error) {
        console.log('Could not fetch user email:', error)
      }
    }
    fetchUserEmail()
  }, [])

  // Handle test button click
  const handleTestClick = (account) => {
    setTestModalSender(account)
    setTestModalEmail(userEmail || 'essabar.yassine@gmail.com') // Pre-fill with logged-in user's email
    setShowTestModal(true)
  }

  // Send test email
  const sendTestEmail = async () => {
    if (!testModalEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to send the test to.",
        variant: "destructive"
      })
      return
    }

    if (!testModalSender) {
      toast({
        title: "Sender Required",
        description: "No sender selected for test email.",
        variant: "destructive"
      })
      return
    }

    setTestModalLoading(true)
    try {
      const response = await fetch('/api/campaigns/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          senderEmail: testModalSender.email,
          testEmail: testModalEmail,
          campaignId: campaignId
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Test Email Sent!",
          description: `Test email sent from ${testModalSender.email} to ${testModalEmail}. Reply to test the complete flow!`,
          variant: "default"
        })
        setShowTestModal(false)
        setTestModalEmail('')
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Test email error:', error)
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test email. Please try again.",
        variant: "destructive"
      })
    } finally {
      setTestModalLoading(false)
    }
  }

  return (
    <div style={{ padding: '32px' }} className="dark:bg-gray-900">
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '16px', 
        padding: '32px',
        boxShadow: '0 4px 20px rgba(37, 99, 235, 0.08)'
      }} className="dark:bg-gray-800">
        {/* Header Section */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          marginBottom: '32px',
          paddingBottom: '24px',
          borderBottom: '1px solid rgba(37, 99, 235, 0.1)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Send size={28} color="#2563EB" />
          </div>
          <div>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#1F2937', 
              margin: '0 0 4px 0' 
            }} className="dark:text-gray-100">
              Email Configuration
            </h2>
            <p style={{ 
              color: '#6B7280', 
              margin: '0',
              fontSize: '14px'
            }} className="dark:text-gray-400">
              Connect your email accounts to send campaigns
            </p>
          </div>
        </div>

        {/* Status Card */}
        <div style={{
          backgroundColor: 'rgba(37, 99, 235, 0.05)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connectedEmailAccounts.length > 0 ? '#10B981' : '#F59E0B',
              animation: 'pulse 2s infinite'
            }}>
            </div>
            <span style={{
              fontSize: '14px',
              color: '#1F2937',
              fontWeight: '500'
            }}>
              {connectedEmailAccounts.length > 0 
                ? `${connectedEmailAccounts.length} email account${connectedEmailAccounts.length > 1 ? 's' : ''} connected`
                : 'No email accounts connected'}
            </span>
          </div>
          <span style={{
            fontSize: '12px',
            color: '#6B7280',
            backgroundColor: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(37, 99, 235, 0.2)'
          }}>
            {connectedEmailAccounts.length}/5 accounts used
          </span>
        </div>

        {/* Connected Accounts */}
        {connectedEmailAccounts.length > 0 ? (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1F2937',
              marginBottom: '16px'
            }}>
              Connected Accounts
            </h3>
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {connectedEmailAccounts.map((account, index) => (
                <div 
                  key={account.id || index} 
                  onClick={() => setSelectedEmailAccount(account)}
                  style={{
                    padding: '16px 20px',
                    border: selectedEmailAccount?.id === account.id ? 
                      '2px solid rgb(37, 99, 235)' : '1px solid rgb(229, 231, 235)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: selectedEmailAccount?.id === account.id ? 
                      'rgba(37, 99, 235, 0.02)' : 'white',
                    transition: 'all 0.2s ease',
                    ':hover': {
                      borderColor: 'rgb(37, 99, 235)',
                      backgroundColor: 'rgba(37, 99, 235, 0.02)'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: account.profile_picture ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: '600',
                      overflow: 'hidden'
                    }}>
                      {account.profile_picture ? (
                        <img 
                          src={account.profile_picture} 
                          alt={`${account.name || account.email} profile`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '50%'
                          }}
                        />
                      ) : (
                        account.email ? account.email.charAt(0).toUpperCase() : 'G'
                      )}
                    </div>
                    <div>
                      <div style={{ 
                        fontWeight: '500', 
                        fontSize: '15px', 
                        color: '#1F2937',
                        marginBottom: '4px'
                      }}>
                        {account.email || 'Gmail Account'}
                      </div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#10B981'
                        }}></span>
                        Connected via Gmail
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {selectedEmailAccount?.id === account.id && (
                      <span style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: 'rgb(37, 99, 235)',
                        color: 'white',
                        borderRadius: '6px',
                        fontWeight: '500'
                      }}>
                        Active
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTestClick(account)
                      }}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        backgroundColor: 'transparent',
                        color: 'rgb(37, 99, 235)',
                        border: '1px solid rgb(37, 99, 235)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgb(37, 99, 235)'
                        e.target.style.color = 'white'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent'
                        e.target.style.color = 'rgb(37, 99, 235)'
                      }}
                    >
                      Test Email
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: 'rgba(37, 99, 235, 0.02)',
            borderRadius: '12px',
            border: '1px dashed rgba(37, 99, 235, 0.3)',
            marginBottom: '32px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Send size={32} color="#2563EB" />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1F2937',
              marginBottom: '8px'
            }}>
              No email accounts connected
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6B7280',
              marginBottom: '0'
            }}>
              Connect your email account to start sending campaigns
            </p>
          </div>
        )}

        {/* Connection Options */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/2560px-Gmail_icon_%282020%29.svg.png" 
              alt="Gmail"
              style={{
                width: '24px',
                height: '24px'
              }}
            />
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1F2937',
              margin: '0'
            }}>
              Connect a Gmail account
            </h3>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {/* Gmail */}
            <div 
              onClick={initiateGmailOAuth}
              style={{
                padding: '24px',
                border: '2px solid transparent',
                borderRadius: '12px',
                textAlign: 'center',
                cursor: gmailAuthLoading ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #667eea 0%, #764ba2 100%) border-box',
                opacity: gmailAuthLoading ? 0.6 : 1,
                transition: 'all 0.3s ease',
                ':hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.15)'
                }
              }}
            >
              <img 
                src="data:image/png;base64,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" 
                alt="Gmail" 
                style={{
                  width: '48px',
                  height: '48px',
                  marginBottom: '12px'
                }} 
              />
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#1F2937'
              }}>
                {gmailAuthLoading ? 'Connecting...' : 'Connect Gmail'}
              </div>
            </div>

            {/* Microsoft 365 */}
            <div style={{
              padding: '24px',
              border: '2px solid #E5E7EB',
              borderRadius: '12px',
              textAlign: 'center',
              cursor: 'not-allowed',
              opacity: 0.5,
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: '500'
              }}>
                Coming Soon
              </div>
              <img 
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEcAAABWCAYAAACdOoshAAAAAXNSR0IArs4c6QAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAR6ADAAQAAAABAAAAVgAAAACqq37jAAAE3ElEQVR4Ae2cXU7bQBDHx4l5aSuVSpTX5gbNYwuVyg3gBklPAEfgCBwh3MCcAEdqaR/NDcIrRSKorfpAEvc/Jks3wRniZP1BGEvBG896d+eXmdm1xY5HT+i4/kCNgU+tOKY2ht0njzprAzp584N6eajh5dGoyzavm7Q+fEm7I6IDz6NmWtuAFUGREOfjzTOK0uoscq2ycK62AMSjPQBpZ1EMgHpQKnABqlJwLreoCRitmBIojSxQ0uoyKFwPazEFG2d0klZHulY6HHab21fUIsSRWW4jKZBB1gesIAuo0uBcbcNC4DZQjj9FH310GHqAVf+DgB4huKcchcJht8EMsw8LYSDrKeMp61KQBip3ODz93vq0C7fh2aZRlvYZ+g0R8wJeIuQCx0y/cJs2BrWTYWBVqtr1XY7GTL+D6rnNQmouDSdZtdZpn6dfWEojF1NcSLXlb1oIjnEbXrXCSpo8jFWCYrBmgsNuE9eoPRhPv6sIxIDh86NwzKoVptGG61Rp+rX1yKWcCqei028XBMLxh2Gc8p88jwk4ZtXKbpO4TFl+E9MFlI7w4SftcPpJ++enYpYHPneEAbR41VqW26D/c4aB556wPqIwr/czWa2MLecUYIo+uugw9IYU1f8Cxoxnm6IHNd3fhFtNCx19v8GjQ4iAnrjJ269J3HDUdL7NuIeDeAH35HcoIdZB0XS8yFcdt60vDYfjBYNg66jjdWVV4oULTEvD2fyW/l7XxeDKbqNW9gCq3L/CEX4dhaNwBAKCSC1H4QgEBJFajsIRCAgitRyFIxAQRGo5CkcgIIjUchSOQEAQqeUoHIGAIFLLUTgCAUGklqNwBAKCSC1H4QgEBJFajsIRCAgitRyFIxAQRGo5CkcgIIjUchSOQEAQqeUoHIGAIFLLUTgCAUGklqNwBAKCSC1H4QgEBJFaTo5wboS2n7xoMcvBv/B7I/ri/6bGkycgKJD1P9i72OlytPGdAqHNlRHNBQf7G47XhnS4Svsa5vkFZ8Ph3XJI3gPXOarqfqh5FFymzgM4410wR0ip0lmm4VW49x4Ouw527HWwCyZcBcVc6MBwuv6A2s8tnswDz8e2wp2rj7R3uU2HsJx345tCPmO6juI69f1fdP4c487E1tckDcML7BJG1gGw+cyA7AOuFwFgH7vyIgTrPnLO9FC359/SRZGWN946fWqPLYdydwKO3cE4gQdvp+Z0Ue9t2awy4PVQtwd5H58I9/bxPYqHdONyr2fpcGwAnLIBS+l2kkbqv+vZVbKUw3Hlu7N3NwFkcd1KwbE15/g0qiXZ2PZw/bUtc1F+4Lom7lmuW1k4NgBkRTHWtGtfz7PMrov22V2befaDtrszY06Wjk0gR9JDzss1V3zK0n5Jdd3AsQefBHIfsx3nD10+PtlNF112D8fW4D6Q3y0NnMcnuy/XZbjvsRO3mmdgViBvzVO/lDpxkqIz9IcU8LqtMDhGWROfxsuCwgK56X/qfAMLCWojZJpMycZSOBx7cIssNO37FykDRpJ7A0lIOo8tTEuFYyvHoIY1OnC00LSbJkwOnNH23l0mhbO/VQaOPURe5OEX5seWRReaorvYfUnlSsKxB8yBPHkQ9pDfVDr4pT/iB+oGrhIYVR6O4WEC+dRCswuXCczsYuo+6zPHJ4aVN4R/dR6Ox+emyfEAAAAASUVORK5CYII=" 
                alt="Microsoft 365" 
                style={{
                  width: '48px',
                  height: '48px',
                  marginBottom: '12px',
                  opacity: 0.5
                }} 
              />
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#9CA3AF'
              }}>
                Microsoft 365
              </div>
            </div>

            {/* SMTP/IMAP */}
            <div style={{
              padding: '24px',
              border: '2px solid #E5E7EB',
              borderRadius: '12px',
              textAlign: 'center',
              cursor: 'not-allowed',
              opacity: 0.5,
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: '500'
              }}>
                Coming Soon
              </div>
              <svg width="48" height="48" viewBox="0 0 48 48" style={{ marginBottom: '12px', opacity: 0.5 }}>
                <path d="M12 4L4 8v24c0 4.42 3.58 8 8 8h24c4.42 0 8-3.58 8-8V12c0-4.42-3.58-8-8-8H12zm0 4h24c2.21 0 4 1.79 4 4v20c0 2.21-1.79 4-4 4H12c-2.21 0-4-1.79-4-4V12l4-4z" fill="#9CA3AF"/>
                <path d="M8 12l16 10L40 12M8 12v20M40 12v20" stroke="#9CA3AF" strokeWidth="2" fill="none"/>
              </svg>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#9CA3AF'
              }}>
                SMTP/IMAP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '500px',
            maxWidth: '90vw',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'between',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1F2937',
                margin: 0,
                flex: 1
              }}>
                Send Test Email
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {testModalSender && (
              <div style={{
                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '14px', color: '#1F2937', marginBottom: '4px' }}>
                  <strong>From:</strong> {testModalSender.email}
                </div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  {testModalSender.name || 'Gmail Account'}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1F2937',
                marginBottom: '8px'
              }}>
                Send test email to:
              </label>
              <input
                type="email"
                value={testModalEmail}
                onChange={(e) => setTestModalEmail(e.target.value)}
                placeholder="Enter email address"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #F59E0B',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '13px', color: '#92400E', marginBottom: '4px' }}>
                <strong>💡 Test Instructions:</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#92400E' }}>
                1. Click "Send Test Email" below<br/>
                2. Check your email and reply to the test message<br/>
                3. Your reply should appear in both "Sent" and "Inbox" folders in LeadsUp
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowTestModal(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6B7280',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendTestEmail}
                disabled={testModalLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: testModalLoading ? '#9CA3AF' : 'rgb(37, 99, 235)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  cursor: testModalLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {testModalLoading ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}