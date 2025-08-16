// Target tab content component
import React, { useState } from 'react'
import { Upload, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface TargetTabProps {
  campaignId: string | number
}

export function TargetTab({
  campaignId
}: TargetTabProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadStats, setUploadStats] = useState<{
    imported: number
    duplicates: number
    total: number
  } | null>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file type
      if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
        return
      }

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be under 10MB')
        return
      }

      setUploadedFile(file)
      setUploadSuccess(false)
      setUploadStats(null)
      console.log('CSV file selected:', file.name)
    }
  }

  const handleCsvUpload = async () => {
    if (!uploadedFile) {
      toast.error('Please select a CSV file first')
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('csvFile', uploadedFile)

      const response = await fetch(`/api/campaigns/${campaignId}/contacts/upload`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setUploadSuccess(true)
        setUploadStats({
          imported: result.importedCount,
          duplicates: result.duplicateCount,
          total: result.totalProcessed
        })
        toast.success(`Successfully imported ${result.importedCount} contacts!`)
        
        // Reset file input
        const fileInput = document.getElementById('csv-upload') as HTMLInputElement
        if (fileInput) {
          fileInput.value = ''
        }
        setUploadedFile(null)
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('CSV upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload CSV file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="w-full animate-in fade-in duration-500">
      {/* Clean Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-light text-gray-900 tracking-tight">Target Audience</h1>
          <p className="text-gray-500 mt-2 font-light">Import your campaign target audience</p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
        <CardHeader className="p-8 pb-6">
          <CardTitle className="text-2xl font-medium">Import Contacts</CardTitle>
          <CardDescription className="mt-2 text-gray-500">
            Upload your contact list from a CSV file
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-8 pt-0">
          <div className="space-y-6">
            <div className={`rounded-2xl p-8 border-2 border-dashed text-center transition-colors ${
              uploadSuccess 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              {uploadSuccess ? (
                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              ) : (
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              )}
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {uploadSuccess ? 'Upload Successful!' : 'Upload CSV File'}
              </h3>
              
              <p className="text-sm text-gray-500 mb-6">
                {uploadSuccess 
                  ? 'Your contacts have been imported successfully.'
                  : 'Import your contacts from a CSV file. Maximum 10,000 contacts.'
                }
              </p>
              
              {!uploadSuccess && (
                <div className="flex items-center justify-center gap-4">
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <Button
                      as="span"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-3"
                      disabled={isUploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </label>
                  
                  {uploadedFile && (
                    <Button
                      onClick={handleCsvUpload}
                      disabled={isUploading}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-2xl px-6 py-3"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload CSV
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {uploadedFile && !uploadSuccess && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Upload className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(uploadedFile.size / 1024).toFixed(1)} KB • Ready to upload
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {uploadSuccess && uploadStats && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-green-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{uploadStats.imported}</div>
                      <div className="text-gray-500">Imported</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-600">{uploadStats.duplicates}</div>
                      <div className="text-gray-500">Duplicates</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-600">{uploadStats.total}</div>
                      <div className="text-gray-500">Total Processed</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 rounded-2xl p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• First row must contain column headers</li>
                <li>• Required fields: Email, First Name, Last Name</li>
                <li>• Optional fields: Company, Title, Phone, LinkedIn URL</li>
                <li>• UTF-8 encoding recommended</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}