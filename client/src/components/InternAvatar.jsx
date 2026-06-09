import { useState } from 'react'

const InternAvatar = ({ internId, name, size = 40, style = {}, photoBust = '' }) => {
  const [error, setError] = useState(false)

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'IN'

  const photoUrl = internId
    ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/interns/${internId}/photo?t=${photoBust}`
    : null

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