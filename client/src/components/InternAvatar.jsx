import React, { useState } from 'react';

const InternAvatar = ({ photoUrl, name, size = 40, style = {} }) => {
  const [error, setError] = useState(false);

  const initials = name
    ? name.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'IN';

  if (photoUrl && !error) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          ...style
        }}
      />
    );
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
      fontSize: size * 0.35,
      fontWeight: '600',
      flexShrink: 0,
      ...style
    }}>
      {initials}
    </div>
  );
};

export default InternAvatar;
