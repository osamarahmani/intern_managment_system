const InternHeader = ({ activePage, internName, photoUrl }) => {
  const getPageTitle = () => {
    switch (activePage) {
      case 'profile':
        return 'My Profile';
      case 'project':
        return 'My Project';
      case 'tasks':
        return 'My Tasks';
      case 'directory':
        return 'Teammates Profile';
      default:
        return 'Intern Portal';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'IN';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div role="banner" style={{
      width: '100%',
      height: '64px',
      background: '#FFFFFF',
      borderBottom: '1px solid #EEEEEE',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      boxSizing: 'border-box'
    }}>
      <h1 className="intern-header-title">{getPageTitle()}</h1>
      <div className="intern-header-right">
        {photoUrl ? (
          <img 
            src={photoUrl} 
            alt={`${internName}'s Avatar`} 
            className="intern-header-avatar"
          />
        ) : (
          <div className="intern-header-avatar-initials" aria-label={internName}>
            {getInitials(internName)}
          </div>
        )}
        <span className="intern-header-name">{internName || 'Intern'}</span>
      </div>
    </div>
  );
};

export default InternHeader;
