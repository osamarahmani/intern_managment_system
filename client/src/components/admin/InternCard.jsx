const InternCard = ({ intern, onClick }) => {
  const {
    name,
    collegeName,
    dept,
    year,
    sem,
    photo,
    startingDate,
    endingDate,
    project
  } = intern;

  // Utility to generate initials
  const getInitials = (str) => {
    if (!str) return 'IM';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Utility to format "Jun 1 – Aug 31"
  const formatDuration = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
    
    const startStr = `${months[start.getMonth()]} ${start.getDate()}`;
    const endStr = `${months[end.getMonth()]} ${end.getDate()}`;
    return `${startStr} – ${endStr}`;
  };

  const initials = getInitials(name);
  const duration = formatDuration(startingDate, endingDate);
  const hasProject = project && project.title && project.title.trim().length > 0;

  return (
    <div 
      className="intern-card-wrapper" 
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onClick(); } }}
      aria-label={`View details of intern ${name}`}
    >
      {/* Avatar Container */}
      <div className="card-avatar-container">
        {photo ? (
          <img 
            src={photo} 
            alt={`Avatar of ${name}`} 
            className="card-avatar-image" 
          />
        ) : (
          <div className="card-avatar-initials" aria-hidden="true">
            {initials}
          </div>
        )}
      </div>

      {/* Intern Info */}
      <h3 className="card-name">{name}</h3>
      <p className="card-dept">{dept}</p>
      <p className="card-college">{collegeName}</p>

      {/* Divider */}
      <div className="card-divider" />

      {/* Year/Sem Badge & Duration */}
      <div className="card-bottom-row">
        <span className="card-badge-year-sem">
          {year} • Sem {sem}
        </span>
        <span className="card-duration-text">
          {duration}
        </span>
      </div>

      {/* Project Assigned Status Indicator */}
      <div className="card-project-status">
        <span className={`status-dot ${hasProject ? 'assigned' : 'unassigned'}`} aria-hidden="true" />
        <span className={`status-text ${hasProject ? 'assigned' : 'unassigned'}`}>
          {hasProject ? 'Project Assigned' : 'No Project'}
        </span>
      </div>
    </div>
  );
};

export default InternCard;
