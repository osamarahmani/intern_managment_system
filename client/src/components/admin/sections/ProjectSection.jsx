import React, { useState, useEffect } from 'react';

const ProjectSection = ({ intern, onAssign }) => {
  const existingProject = intern.project || {};

  const [projectData, setProjectData] = useState({
    title: existingProject.title || '',
    description: existingProject.description || '',
    gitRepoLink: existingProject.gitRepoLink || '',
    liveProjectLink: existingProject.liveProjectLink || ''
  });

  const [localErrors, setLocalErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync state if intern changes
  useEffect(() => {
    const freshProject = intern.project || {};
    setProjectData({
      title: freshProject.title || '',
      description: freshProject.description || '',
      gitRepoLink: freshProject.gitRepoLink || '',
      liveProjectLink: freshProject.liveProjectLink || ''
    });
    setLocalErrors({});
    setShowSuccess(false);
  }, [intern]);

  const handleFieldChange = (field, value) => {
    setProjectData((prev) => ({ ...prev, [field]: value }));
    if (localErrors[field]) {
      setLocalErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    // Validate that project details are filled if submitting
    if (!projectData.title.trim()) {
      errors.title = 'Project Title is required.';
    }

    if (!projectData.description.trim()) {
      errors.description = 'Project Description is required.';
    }

    // Optional format checks for links if provided
    if (projectData.gitRepoLink && !/^https?:\/\/\S+/.test(projectData.gitRepoLink)) {
      errors.gitRepoLink = 'Please enter a valid URL (starting with http:// or https://)';
    }

    if (projectData.liveProjectLink && !/^https?:\/\/\S+/.test(projectData.liveProjectLink)) {
      errors.liveProjectLink = 'Please enter a valid URL (starting with http:// or https://)';
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }

    // Perform save
    onAssign(projectData);

    // Trigger Success Notification (duration: 2s)
    setShowSuccess(true);
    const timer = setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
    return () => clearTimeout(timer);
  };

  // Determine if a project is already assigned
  const isAssigned = existingProject.title && existingProject.title.trim().length > 0;

  return (
    <form className="section-form" onSubmit={handleFormSubmit} noValidate id="project-panel" role="tabpanel" aria-labelledby="project-tab">
      <div className="project-single-col">
        {/* Project Title */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-proj-title">
            Project Title <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="edit-proj-title"
            className={`form-input ${localErrors.title ? 'input-error' : ''}`}
            value={projectData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            required
          />
          {localErrors.title && <span className="error-message" role="alert">{localErrors.title}</span>}
        </div>

        {/* Project Description */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-proj-desc">
            Project Description <span className="required-asterisk">*</span>
          </label>
          <textarea
            id="edit-proj-desc"
            rows={4}
            className={`form-input ${localErrors.description ? 'input-error' : ''}`}
            style={{ height: 'auto', padding: '12px 14px' }}
            value={projectData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            required
          />
          {localErrors.description && <span className="error-message" role="alert">{localErrors.description}</span>}
        </div>

        {/* Git Repo Link */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-proj-git">
            Git Repo Link
          </label>
          <div className="url-input-wrapper">
            <span className="url-input-icon" aria-hidden="true">
              <i className="ti ti-brand-github" />
            </span>
            <input
              type="url"
              id="edit-proj-git"
              placeholder="https://github.com/username/repository"
              className={`form-input url-form-input ${localErrors.gitRepoLink ? 'input-error' : ''}`}
              value={projectData.gitRepoLink}
              onChange={(e) => handleFieldChange('gitRepoLink', e.target.value)}
            />
          </div>
          {localErrors.gitRepoLink && <span className="error-message" role="alert">{localErrors.gitRepoLink}</span>}
        </div>

        {/* Live Project Link */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-proj-live">
            Live Project Link
          </label>
          <div className="url-input-wrapper">
            <span className="url-input-icon" aria-hidden="true">
              <i className="ti ti-external-link" />
            </span>
            <input
              type="url"
              id="edit-proj-live"
              placeholder="https://live-domain.com"
              className={`form-input url-form-input ${localErrors.liveProjectLink ? 'input-error' : ''}`}
              value={projectData.liveProjectLink}
              onChange={(e) => handleFieldChange('liveProjectLink', e.target.value)}
            />
          </div>
          {localErrors.liveProjectLink && <span className="error-message" role="alert">{localErrors.liveProjectLink}</span>}
        </div>
      </div>

      {/* Footer Container */}
      <div className="section-footer">
        {showSuccess && (
          <span className="inline-success-msg" role="status" aria-live="polite">
            <i className="ti ti-circle-check" aria-hidden="true" />
            Project assigned successfully
          </span>
        )}
        <button
          type="submit"
          className={`project-submit-btn ${isAssigned ? 'update-mode' : 'assign-mode'}`}
          aria-label={isAssigned ? "Update project details" : "Assign project to intern"}
        >
          {isAssigned ? 'Update Project' : 'Assign Project'}
        </button>
      </div>
    </form>
  );
};

export default ProjectSection;
