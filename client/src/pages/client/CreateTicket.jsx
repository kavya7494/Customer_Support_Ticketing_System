import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ticketService } from '../../services/ticketService'
import { Upload, X, SendHorizontal, Info, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const CONCERNS = [
  'Technical Issue', 'Billing', 'Account', 'Product Feedback', 'General Inquiry',
  'Bug Report', 'Feature Request', 'Performance', 'Security'
]

export default function CreateTicket() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ subject: '', description: '', concern: '', tags: '' })
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f => f.size <= 10 * 1024 * 1024)
    if (valid.length !== newFiles.length) toast.error('Files must be under 10MB')
    setFiles(prev => {
      const combined = [...prev, ...valid]
      return combined.slice(0, 5)
    })
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Subject and description are required')
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('subject', form.subject.trim())
      fd.append('description', form.description.trim())
      if (form.concern) fd.append('concern', form.concern)
      if (form.tags) fd.append('tags', form.tags)
      files.forEach(f => fd.append('attachments', f))

      const { data } = await ticketService.createTicket(fd)
      const createdTicket = data.data?.ticket || data.data
      toast.success(`Ticket ${createdTicket.ticketNumber || ''} created!`)
      if (createdTicket._id) {
        navigate(`/client/tickets/${createdTicket._id}`)
      } else {
        navigate('/client/tickets')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Create Support Ticket</h1>
        <p className="text-sm text-gray-500 mt-0.5">Our AI will automatically prioritize and route your ticket</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* AI triage notice */}
        <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <span>Our system will automatically detect urgency, department, and assign the best available agent.</span>
        </div>

        {/* Subject */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">Ticket Details</h2>
          <div>
            <label className="label">Subject <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="input"
              placeholder="Brief description of the issue"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              required
              maxLength={200}
            />
            <p className="text-xs text-gray-400 mt-1">{form.subject.length}/200 characters</p>
          </div>

          <div>
            <label className="label">Description <span className="text-red-500">*</span></label>
            <textarea
              className="input min-h-32 resize-none"
              placeholder="Describe your issue in detail — include steps to reproduce, error messages, etc."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
              rows={5}
            />
          </div>

          <div>
            <label className="label">Category (optional)</label>
            <div className="relative">
              <select
                className="input appearance-none pr-8"
                value={form.concern}
                onChange={e => setForm(f => ({ ...f, concern: e.target.value }))}
              >
                <option value="">Auto-detect category</option>
                {CONCERNS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="label">Tags (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. billing, urgent, api-error (comma separated)"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            />
          </div>
        </div>

        {/* Attachments */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Attachments</h2>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Drop files or click to upload</p>
            <p className="text-xs text-gray-400 mt-1">Images, PDF, Word, ZIP — up to 5 files, 10MB each</p>
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.zip,.mp4"
              onChange={e => handleFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                      <Upload size={13} className="text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-700 truncate">{file.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">({(file.size / 1024).toFixed(0)}KB)</span>
                  </div>
                  <button type="button" onClick={() => setFiles(f => f.filter((_, j) => j !== i))}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary px-6">
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><SendHorizontal size={16} /> Submit Ticket</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
