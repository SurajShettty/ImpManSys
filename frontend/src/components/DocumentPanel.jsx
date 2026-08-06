import React, { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const DOCUMENT_CATEGORIES = ['Contract', 'SOW', 'UAT Sign-off', 'Training Deck', 'Other']

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Attaches to exactly one of clientId / phaseId / activityId.
export default function DocumentPanel({ clientId, phaseId, activityId, compact = false }) {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const params = clientId ? { client_id: clientId } : phaseId ? { phase_id: phaseId } : { activity_id: activityId }
  const canUpload = user?.permissions?.includes('document.upload')
  const canDelete = user?.permissions?.includes('document.delete')

  const load = () => {
    setError('')
    api
      .get('/documents/', { params })
      .then((res) => setDocuments(res.data))
      .catch(() => setError('Failed to load documents'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [clientId, phaseId, activityId])

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      Object.entries(params).forEach(([key, value]) => formData.append(key, value))
      // Override the api instance's default 'application/json' header so the
      // browser can set 'multipart/form-data' with the correct boundary itself.
      await api.post('/documents/upload', formData, { headers: { 'Content-Type': undefined } })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload document')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const download = async (doc) => {
    setError('')
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = doc.original_filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to download document')
    }
  }

  const remove = async (doc) => {
    if (!window.confirm(`Delete "${doc.original_filename}"?`)) return
    setError('')
    try {
      await api.delete(`/documents/${doc.id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete document')
    }
  }

  return (
    <div className={compact ? '' : 'card'}>
      {!compact && (
        <div className="dashboard-card-header">
          <h3>Documents</h3>
        </div>
      )}
      {error && <div className="error">{error}</div>}

      {canUpload && (
        <div className="form-row" style={{ marginBottom: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {DOCUMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>File</label>
            <input ref={fileInputRef} type="file" onChange={upload} disabled={uploading} />
          </div>
          {uploading && <span className="muted">Uploading…</span>}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : documents.length === 0 ? (
        <div className="empty-state compact">
          <h3>No documents yet</h3>
          <p className="muted">Upload contracts, SOWs, sign-offs, or decks to keep them here.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th>Size</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.original_filename}</td>
                  <td><span className="badge badge-blue">{doc.category}</span></td>
                  <td className="muted">{doc.uploader?.name || '—'}</td>
                  <td className="muted">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="muted">{formatSize(doc.size_bytes)}</td>
                  <td className="actions" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-light btn-sm" onClick={() => download(doc)}>
                      Download
                    </button>
                    {canDelete && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(doc)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
