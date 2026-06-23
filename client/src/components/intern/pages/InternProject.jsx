import React from 'react';

// Helper function to format the description
const parseDescriptionSections = (text) => {
  if (!text) return [];
  const sectionRegex = /([A-Z][A-Za-z0-9&'/() ]{2,50}:)(?=\s)/g;
  const parts = text.split(sectionRegex).filter(Boolean);
  const sections = [];
  let i = 0;
  
  if (parts.length && !parts[0].endsWith(':')) {
    sections.push({ heading: null, content: parts[0].trim() });
    i = 1;
  }
  for (; i < parts.length; i += 2) {
    const heading = parts[i]?.replace(':', '').trim();
    const content = parts[i + 1]?.trim() || '';
    if (heading) sections.push({ heading, content });
  }
  return sections.length ? sections : [{ heading: null, content: text }];
};

const InternProject = ({ project }) => {
  // Defensive check: If your API returns an array, extract the first item.
  const projectData = Array.isArray(project) ? project[0] : project;

  // Empty state if no data or no title exists
  if (!projectData || !projectData.title) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <i className="ti ti-folder-off" style={{fontSize:'48px', color:'#9E9E9E'}} />
        <p style={{fontSize:'18px', color:'#212121', marginTop:'16px'}}>No project assigned yet</p>
        <p style={{fontSize:'14px', color:'#9E9E9E'}}>Your admin will assign a project soon</p>
      </div>
    );
  }

  return (
    <div className="project-wrapper">
      {/* Header */}
      <div className="project-card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <i className="ti ti-folder" aria-hidden="true" style={{ fontSize: '24px', color: '#3D35C4' }} />
        <h2 className="project-card-title" style={{ fontSize: '20px', fontWeight: '500', color: '#212121', margin: 0 }}>
          {projectData.title}
        </h2>
      </div>

      <hr className="project-card-divider" style={{ border: 'none', borderTop: '1px solid #EEEEEE', margin: '16px 0' }} />

      {/* Description Body */}
      <div style={{ marginBottom: '24px', flex: 1 }}>
        <h3 className="project-section-label" style={{ fontSize: '12px', color: '#9E9E9E', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 6px 0' }}>
          Description
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {parseDescriptionSections(projectData.description || 'No description provided.').map((section, idx) => (
            <div key={idx}>
              {section.heading && (
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: '#3D35C4', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3D35C4', display: 'inline-block', flexShrink: 0 }} />
                  {section.heading}
                </h4>
              )}
              <p style={{ margin: 0, fontSize: '13.5px', color: '#444', lineHeight: 1.8, paddingLeft: section.heading ? '14px' : 0 }}>
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      <hr className="project-card-divider" style={{ border: 'none', borderTop: '1px solid #EEEEEE', margin: '16px 0' }} />

      {/* Link Buttons */}
      <div className="project-buttons-row">
        {projectData.git_repo_link ? (
          <a href={projectData.git_repo_link} target="_blank" rel="noopener noreferrer" className="btn-git-repo">
            <i className="ti ti-brand-github" /><span>Git Repository</span>
          </a>
        ) : (
          <button type="button" className="btn-git-repo" disabled>
            <i className="ti ti-brand-github" /><span>Git Repository</span>
          </button>
        )}

        {projectData.live_project_link ? (
          <a href={projectData.live_project_link} target="_blank" rel="noopener noreferrer" className="btn-live-project">
            <i className="ti ti-external-link" /><span>Live Project</span>
          </a>
        ) : (
          <button type="button" className="btn-live-project" disabled>
            <i className="ti ti-external-link" /><span>Live Project</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default InternProject;