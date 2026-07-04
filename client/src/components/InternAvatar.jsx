import { useEffect, useState } from 'react'
import { API_URL } from '../utils/apiClient'
import { getToken } from '../services/authService'

const InternAvatar = ({ internId, name, size = 40, style = {}, photoBust = '' }) => {
  const [error, setError] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'IN'

  useEffect(() => {
    let objectUrl
    const controller = new AbortController()
    if (!internId || !getToken()) return () => controller.abort()

    fetch(`${API_URL}/api/interns/${internId}/photo?t=${encodeURIComponent(photoBust)}`, {
      credentials: 'include',
      signal: controller.signal
    })
      .then(response => {
        if (!response.ok) throw new Error('Photo unavailable')
        return response.blob()
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        setError(false)
        setPhotoUrl(objectUrl)
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(true)
      })

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [internId, photoBust])

  if (photoUrl && !error) {
    return (
      <img
        src={photoUrl}
        alt={name || 'Intern'}
        onError={() => setError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          display: 'block',
          ...style
        }}
      />
    )
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#3D35C4',
      color: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: Math.round(size * 0.35),
      fontWeight: '600',
      flexShrink: 0,
      userSelect: 'none',
      ...style
    }}>
      {initials}
    </div>
  )
}

export default InternAvatar
