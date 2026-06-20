import { useState, useEffect } from 'react'
import { submitExitFeedback, getMyExitFeedback } from '../../services/exitFeedbackService'

const LEARNING_AREAS = [
  { value: 'technical', label: 'Technical Skill Development' },
  { value: 'communication', label: 'Professional Communication' },
  { value: 'project_management', label: 'Project Management/Planning' },
  { value: 'collaboration', label: 'Team Collaboration' },
  { value: 'networking', label: 'Industry Networking' },
  { value: 'problem_solving', label: 'Problem-Solving' }
]

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Excellent']

const MENTOR_OPTIONS = [
  { value: 'not_supportive', label: 'Not Supportive' },
  { value: 'slightly', label: 'Slightly Supportive' },
  { value: 'moderately', label: 'Moderately Supportive' },
  { value: 'very', label: 'Very Supportive' },
  { value: 'exceptionally', label: 'Exceptionally Supportive' }
]

const defaultForm = {
  satisfaction_score: 0,
  mentor_support: '',
  learning_areas: [],
  rating_clarity: 0,
  rating_resources: 0,
  rating_worklife: 0,
  rating_culture: 0,
  recommend_score: 0,
  testimonial: '',
  improvement: '',
  photo_consent: ''
}

const ExitFeedbackForm = ({ internName, internId }) => {
  const [form, setForm] = useState(defaultForm)
  const [existing, setExisting] = useState(null)
  const [editWindowOpen, setEditWindowOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const data = await getMyExitFeedback()
        if (data) {
          setExisting(data)
          setForm({
            satisfaction_score: data.satisfaction_score,
            mentor_support: data.mentor_support,
            learning_areas: data.learning_areas || [],
            rating_clarity: data.rating_clarity,
            rating_resources: data.rating_resources,
            rating_worklife: data.rating_worklife,
            rating_culture: data.rating_culture,
            recommend_score: data.recommend_score,
            testimonial: data.testimonial,
            improvement: data.improvement,
            photo_consent: data.photo_consent
          })
          // Check if within 7-day edit window
          const submittedAt = new Date(data.submitted_at)
          const sevenDaysLater = new Date(submittedAt)
          sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
          setEditWindowOpen(new Date() <= sevenDaysLater)
        }
      } catch (err) {
        console.error('Error loading exit feedback:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchExisting()
  }, [])

  const handleLearningToggle = (value) => {
    setForm(prev => ({
      ...prev,
      learning_areas: prev.learning_areas.includes(value)
        ? prev.learning_areas.filter(v => v !== value)
        : [...prev.learning_areas, value]
    }))
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!form.satisfaction_score || !form.mentor_support || !form.learning_areas.length ||
        !form.rating_clarity || !form.rating_resources || !form.rating_worklife ||
        !form.rating_culture || !form.recommend_score || !form.testimonial.trim() ||
        !form.improvement.trim() || !form.photo_consent) {
      setError('Please complete all fields before submitting.')
      return
    }
    setSubmitting(true)
    try {
      await submitExitFeedback(form)
      setSuccess(existing ? 'Feedback updated successfully!' : 'Feedback submitted successfully!')
      setIsEditing(false)
      const data = await getMyExitFeedback()
      setExisting(data)
      const submittedAt = new Date(data.submitted_at)
      const sevenDaysLater = new Date(submittedAt)
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      setEditWindowOpen(new Date() <= sevenDaysLater)
    } catch (err) {
      setError(err.message || 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const sectionLabel = (text) => (
    <div style={{ fontSize: '11px', fontWeight: 700, color: '#9E9E9E', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px', marginTop: '24px' }}>
      {text}
    </div>
  )

  const fieldLabel = (text, required = true) => (
    <div style={{ fontSize: '13px', fontWeight: 600, color: '#212121', marginBottom: '8px' }}>
      {text}{required && <span style={{ color: '#B00020' }}> *</span>}
    </div>
  )

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#9E9E9E', fontFamily: "'Roboto', sans-serif" }}>Loading...</div>
  }

  // Submitted + not editing view
  if (existing && !isEditing) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px' }}>
        <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: '10px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#2E7D32' }}>Feedback Submitted</div>
          <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '13px', color: '#388E3C', marginTop: '4px' }}>
            Submitted on {new Date(existing.submitted_at).toLocaleDateString()}
          </div>
        </div>
        {editWindowOpen && (
          <button
            onClick={() => { setIsEditing(true); setSuccess(''); setError('') }}
            style={{ width: '100%', height: '40px', background: '#3D35C4', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Edit Feedback
          </button>
        )}
        {!editWindowOpen && (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#9E9E9E', fontFamily: "'Roboto', sans-serif" }}>
            The 7-day edit window has closed.
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px', fontFamily: "'Roboto', sans-serif" }}>
      <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '20px', fontWeight: 700, color: '#212121', marginTop: 0, marginBottom: '4px' }}>
        Exit Feedback Form
      </h2>
      <p style={{ fontSize: '13px', color: '#757575', marginBottom: '24px', marginTop: 0 }}>
        {existing ? 'Update your internship feedback below.' : 'Share your internship experience. All fields are required.'}
      </p>

      {error && <div style={{ background: '#FFEBEE', color: '#B00020', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: 500 }}>{error}</div>}
      {success && <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: 500 }}>{success}</div>}

      {/* Intern Info */}
      {sectionLabel('Intern Information')}
      <div style={{ background: '#F8F7FF', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '14px 16px', fontSize: '14px', color: '#212121', marginBottom: '8px' }}>
        {internName}
      </div>

      {/* Satisfaction Score */}
      {sectionLabel('Overall Satisfaction')}
      {fieldLabel('Overall, how satisfied were you with your internship experience?')}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" onClick={() => setForm(p => ({ ...p, satisfaction_score: n }))}
            style={{ width: '38px', height: '38px', borderRadius: '8px', border: form.satisfaction_score === n ? '2px solid #3D35C4' : '1px solid #E0E0E0', background: form.satisfaction_score === n ? '#3D35C4' : '#FAFAFA', color: form.satisfaction_score === n ? '#fff' : '#212121', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9E9E9E', marginTop: '4px' }}>
        <span>Very Dissatisfied</span><span>Extremely Satisfied</span>
      </div>

      {/* Mentor Support */}
      {sectionLabel('Mentor Support')}
      {fieldLabel('How helpful and supportive was your direct supervisor/mentor?')}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {MENTOR_OPTIONS.map(opt => (
          <button key={opt.value} type="button" onClick={() => setForm(p => ({ ...p, mentor_support: opt.value }))}
            style={{ padding: '8px 14px', borderRadius: '8px', border: form.mentor_support === opt.value ? '2px solid #3D35C4' : '1px solid #E0E0E0', background: form.mentor_support === opt.value ? '#3D35C4' : '#FAFAFA', color: form.mentor_support === opt.value ? '#fff' : '#212121', fontWeight: form.mentor_support === opt.value ? 600 : 400, fontSize: '13px', cursor: 'pointer' }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Learning Areas */}
      {sectionLabel('Learning Experience')}
      {fieldLabel('Which areas provided the most valuable learning experience? (Select all that apply)')}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {LEARNING_AREAS.map(area => {
          const selected = form.learning_areas.includes(area.value)
          return (
            <button key={area.value} type="button" onClick={() => handleLearningToggle(area.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: selected ? '2px solid #3D35C4' : '1px solid #E0E0E0', background: selected ? '#3D35C4' : '#FAFAFA', color: selected ? '#fff' : '#212121', fontWeight: selected ? 600 : 400, fontSize: '13px', cursor: 'pointer' }}>
              {area.label}
            </button>
          )
        })}
      </div>

      {/* Aspect Ratings */}
      {sectionLabel('Rate Your Experience')}
      {fieldLabel('Please rate the following aspects:')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { key: 'rating_clarity', label: 'Clarity of expectations and goals' },
          { key: 'rating_resources', label: 'Access to necessary resources/tools' },
          { key: 'rating_worklife', label: 'Work-life balance' },
          { key: 'rating_culture', label: 'Integration into the team culture' }
        ].map(({ key, label }) => (
          <div key={key} style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#212121', marginBottom: '10px' }}>{label}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4].map(n => (
                <button key={n} type="button" onClick={() => setForm(p => ({ ...p, [key]: n }))}
                  style={{ flex: 1, padding: '7px 0', borderRadius: '6px', border: form[key] === n ? '2px solid #3D35C4' : '1px solid #E0E0E0', background: form[key] === n ? '#3D35C4' : '#fff', color: form[key] === n ? '#fff' : '#212121', fontWeight: form[key] === n ? 600 : 400, fontSize: '12px', cursor: 'pointer' }}>
                  {RATING_LABELS[n]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recommend Score */}
      {sectionLabel('Recommendation')}
      {fieldLabel('If you were to recommend this internship program to a peer, what rating would you give it?')}
      <div style={{ display: 'flex', gap: '10px' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setForm(p => ({ ...p, recommend_score: n }))}
            style={{ flex: 1, height: '42px', borderRadius: '8px', border: form.recommend_score === n ? '2px solid #3D35C4' : '1px solid #E0E0E0', background: form.recommend_score === n ? '#3D35C4' : '#FAFAFA', color: form.recommend_score === n ? '#fff' : '#212121', fontWeight: 600, fontSize: '16px', cursor: 'pointer' }}>
            {n}
          </button>
        ))}
      </div>

      {/* Testimonial */}
      {sectionLabel('Testimonial')}
      {fieldLabel('Please write your testimonial (max 3–4 sentences, may be used in promotional material)')}
      <textarea
        value={form.testimonial}
        onChange={e => setForm(p => ({ ...p, testimonial: e.target.value }))}
        placeholder="Share a short testimonial about your internship experience, learning, mentorship, and project exposure."
        rows={4}
        style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', fontFamily: "'Roboto', sans-serif" }}
      />

      {/* Improvement */}
      {sectionLabel('Improvement')}
      {fieldLabel('What is one thing the program could do to improve the intern experience?')}
      <textarea
        value={form.improvement}
        onChange={e => setForm(p => ({ ...p, improvement: e.target.value }))}
        placeholder="Your suggestion..."
        rows={3}
        style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', fontFamily: "'Roboto', sans-serif" }}
      />

      {/* Photo Consent */}
      {sectionLabel('Consent')}
      {fieldLabel('May we use your name and likeness along with the testimonial in public materials?')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { value: 'both', label: 'Yes, you may use both my name and testimonial.' },
          { value: 'anonymous', label: 'Yes, you may use my testimonial but please keep it anonymous.' },
          { value: 'private', label: 'No, please keep this feedback private.' }
        ].map(opt => (
          <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '10px 14px', border: form.photo_consent === opt.value ? '2px solid #3D35C4' : '1px solid #E0E0E0', borderRadius: '8px', background: form.photo_consent === opt.value ? '#F0EEFF' : '#FAFAFA' }}>
            <input type="radio" name="photo_consent" value={opt.value} checked={form.photo_consent === opt.value} onChange={() => setForm(p => ({ ...p, photo_consent: opt.value }))} style={{ marginTop: '2px', accentColor: '#3D35C4' }} />
            <span style={{ fontSize: '13px', color: '#212121', fontWeight: form.photo_consent === opt.value ? 600 : 400 }}>{opt.label}</span>
          </label>
        ))}
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        style={{ width: '100%', height: '44px', background: submitting ? '#9E9E9E' : '#3D35C4', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', marginTop: '28px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {submitting ? 'Submitting...' : existing ? 'Update Feedback' : 'Submit Feedback'}
      </button>

      {existing && (
        <button type="button" onClick={() => { setIsEditing(false); setError(''); setSuccess('') }}
          style={{ width: '100%', height: '40px', background: 'transparent', color: '#9E9E9E', border: '1px solid #E0E0E0', borderRadius: '8px', fontWeight: 500, fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>
          Cancel
        </button>
      )}
    </div>
  )
}

export default ExitFeedbackForm
