import React from 'react';

const InternProject = ({ project }) => {
  // Empty State (No project assigned yet)
  if (!project || !project.title) {
    return (
      <div className="intern-empty-state">
        <i className="ti ti-folder-off intern-empty-icon" aria-hidden="true" />
        <h2 className="intern-empty-title">No project assigned yet</h2>
        <p className="intern-empty-subtitle">Your admin will assign a project soon</p>
      </div>
    );
  }

  // Display project details card
  return (
    <div className="project-card">
      <div className="project-card-header">
        <i className="ti ti-folder" aria-hidden="true" />
        <h2 className="project-card-title">{project.title}</h2>
      </div>

      <hr className="project-card-divider" />

      <div style={{ marginBottom: '24px' }}>
        <h3 className="project-section-label">Description</h3>
        <p className="project-section-value">{project.description || 'No description provided.'}</p>
      </div>

      <hr className="project-card-divider" />

      <div className="project-links-row">
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
