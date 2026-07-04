import { formatDate } from '../../utils/formatDate';

const TaskItem = ({ task, onEdit, onDelete }) => {
  const { title, description, dueDate, submissionDate } = task;

  return (
    <div className="task-item-card">
      {/* Left Column: Metadata & Truncated Specs */}
      <div className="task-item-left">
        <h5 className="task-item-title">{title}</h5>
        <p className="task-item-desc" title={description}>
          {description}
        </p>
      </div>

      {/* Right Column: Date Badges & Actions */}
      <div className="task-item-right">
        {/* Due Date Indicator */}
        <div className="task-date-group">
          <span className="task-date-label">Due</span>
          <span className="task-date-val">{formatDate(dueDate)}</span>
        </div>

        {/* Submission Date Indicator */}
        <div className="task-date-group">
          <span className="task-date-label">Submitted</span>
          <span 
            className="task-date-val" 
            style={{ 
              color: submissionDate ? 'var(--secondary-variant)' : '#BDBDBD',
              fontStyle: submissionDate ? 'normal' : 'italic' 
            }}
          >
            {formatDate(submissionDate)}
          </span>
        </div>

        {/* Action Button Controls */}
        <div className="task-actions-group">
          {/* Edit Trigger */}
          <button
            type="button"
            className="task-action-icon-btn edit"
            onClick={onEdit}
            title="Edit task details"
            aria-label={`Edit task ${title}`}
          >
            <i className="ti ti-edit" aria-hidden="true" style={{ fontSize: '16px' }} />
          </button>

          {/* Delete Trigger */}
          <button
            type="button"
            className="task-action-icon-btn delete"
            onClick={onDelete}
            title="Delete task assignment"
            aria-label={`Delete task ${title}`}
          >
            <i className="ti ti-trash" aria-hidden="true" style={{ fontSize: '16px' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
