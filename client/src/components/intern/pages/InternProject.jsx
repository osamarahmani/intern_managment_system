import React from 'react';

const InternProject = ({ project }) => {
  // Empty state centered in the full height
  if (!project || !project.title) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <i className="ti ti-folder-off" style={{fontSize:'48px', color:'#9E9E9E'}} />
        <p style={{fontSize:'18px', color:'#212121', marginTop:'16px'}}>No project assigned yet</p>
        <p style={{fontSize:'14px', color:'#9E9E9E'}}>Your admin will assign a project soon</p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      minHeight: 'calc(100vh - 130px)',
      background: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E0E0E0',
      padding: '32px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="project-card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <i className="ti ti-folder" aria-hidden="true" style={{ fontSize: '24px', color: '#3D35C4' }} />
        <h2 className="project-card-title" style={{ fontSize: '20px', fontWeight: '500', color: '#212121', margin: 0 }}>{project.title}</h2>
      </div>

      <hr className="project-card-divider" style={{ border: 'none', borderTop: '1px solid #EEEEEE', margin: '16px 0' }} />

      <div style={{ marginBottom: '24px', flex: 1 }}>
        <h3 className="project-section-label" style={{ fontSize: '12px', color: '#9E9E9E', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 6px 0' }}>Description</h3>
        <p className="project-section-value" style={{ fontSize: '14px', color: '#212121', lineHeight: '1.7', margin: 0 }}>{project.description || 'No description provided.'}</p>
      </div>

      <hr className="project-card-divider" style={{ border: 'none', borderTop: '1px solid #EEEEEE', margin: '16px 0' }} />

      <div className="project-links-row" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
        {project.git_repo_link ? (
          <a 
            href={project.git_repo_link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-git-repo"
            title="Open Git Repository in a new tab"
          >
            <i className="ti ti-brand-github" aria-hidden="true" />
            <span>Git Repository</span>
          </a>
        ) : (
          <button 
            type="button" 
            className="btn-git-repo" 
            disabled 
            title="No Git Repository link provided"
          >
            <i className="ti ti-brand-github" aria-hidden="true" />
            <span>Git Repository</span>
          </button>
        )}

        {project.live_project_link ? (
          <a 
            href={project.live_project_link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-live-project"
            title="Open Live Project in a new tab"
          >
            <i className="ti ti-external-link" aria-hidden="true" />
            <span>Live Project</span>
          </a>
        ) : (
          <button 
            type="button" 
            className="btn-live-project" 
            disabled 
            title="No Live Project link provided"
          >
            <i className="ti ti-external-link" aria-hidden="true" />
            <span>Live Project</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default InternProject;
