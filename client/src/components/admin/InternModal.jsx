import React, { useRef } from 'react';
import BasicInfoSection from './sections/BasicInfoSection';
import ProjectSection from './sections/ProjectSection';
import TaskSection from './sections/TaskSection';
import InternAvatar from '../InternAvatar';

const InternModal = ({
  intern,
  onClose,
  activeTab,
  setActiveTab,
  onUpdateIntern,
  onAssignProject,
  onAddTask,
  onEditTask,
  onDeleteTask
}) => {
  const fileInputRef = useRef(null);

  // Utility to generate initials
  const getInitials = (str) => {
    if (!str) return 'IM';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpdateIntern(intern.id, { photoFile: file });
    }
  };

  const initials = getInitials(intern.name);

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'basicInfo':
        return (
          <BasicInfoSection 
            intern={intern} 
            onSave={(updatedFields) => onUpdateIntern(intern.id, updatedFields)} 
          />
        );
      case 'project':
        return (
          <ProjectSection 
            intern={intern} 
            onAssign={(projectData) => onAssignProject(intern.id, projectData)} 
          />
        );
      case 'tasks':
        return (
          <TaskSection 
            intern={intern} 
            onAddTask={onAddTask} 
            onEditTask={onEditTask} 
            onDeleteTask={onDeleteTask} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Modal Dialog Card */}
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        {/* Absolute positioned close button */}
        <button 
          type="button" 
          className="modal-close-btn" 
          onClick={onClose}
          aria-label="Close modal dialog"
        >
          &times;
        </button>

        {/* Left Column (30%) - Purple Branding & Photo */}
        <div className="modal-col-left">
          <div className="modal-left-avatar-container">
            <InternAvatar
              key={`${intern.id}-${intern.photo_updated_at || ''}`}
              internId={intern.id}
              name={intern.name}
              size={100}
            />
          </div>

          <h3 id="modal-title" className="modal-left-name">{intern.name}</h3>
          <p className="modal-left-dept">{intern.dept}</p>

          {/* Change Photo Button & Invisible File Input */}
          <button 
            type="button" 
            className="modal-left-photo-btn"
            onClick={handlePhotoClick}
          >
            Change Photo
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            accept="image/*"
            style={{ display: 'none' }}
            aria-label="Upload new profile picture"
          />
        </div>

        {/* Right Column (70%) - Navigation Tabs & Subsections */}
        <div className="modal-col-right">
          {/* Tab Selection Header */}
          <div className="modal-tabs-header" role="tablist" aria-label="Intern details panels">
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === 'basicInfo' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('basicInfo')}
              role="tab"
              aria-selected={activeTab === 'basicInfo'}
              aria-controls="basic-info-panel"
              id="basic-info-tab"
            >
              Basic Info
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === 'project' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('project')}
              role="tab"
              aria-selected={activeTab === 'project'}
              aria-controls="project-panel"
              id="project-tab"
            >
              Project
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === 'tasks' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('tasks')}
              role="tab"
              aria-selected={activeTab === 'tasks'}
              aria-controls="tasks-panel"
              id="tasks-tab"
            >
              Tasks
            </button>
          </div>

          {/* Render Active Form Section panel */}
          <div className="modal-tab-content-area">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternModal;
