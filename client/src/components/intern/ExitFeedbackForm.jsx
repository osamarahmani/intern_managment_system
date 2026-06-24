import { useState, useEffect } from 'react'
import { getInternId, getToken } from '../../services/authService'
import { getInternById } from '../../services/internService'
import { getMyExitFeedback, submitExitFeedback } from '../../services/exitFeedbackService'
import InternAvatar from '../InternAvatar'

const API_BASE = import.meta.env.VITE_API_URL || ''

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const day = date.getDate()
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

const formatDateForInput = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

export default function ExitFeedbackForm({ internId: propInternId }) {
  const internId = propInternId || getInternId()

  const [loading, setLoading] = useState(true)
  const [internData, setInternData] = useState(null)
  const [existingFeedback, setExistingFeedback] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form State
  const [overallSatisfaction, setOverallSatisfaction] = useState(0)
  const [mentorSupportiveness, setMentorSupportiveness] = useState('')
  const [learningAreas, setLearningAreas] = useState([])
  const [ratingClarity, setRatingClarity] = useState('')
  const [ratingResources, setRatingResources] = useState('')
  const [ratingWorkLifeBalance, setRatingWorkLifeBalance] = useState('')
  const [ratingTeamIntegration, setRatingTeamIntegration] = useState('')
  const [recommendationRating, setRecommendationRating] = useState(0)
  const [testimonial, setTestimonial] = useState('')
  const [improvementSuggestion, setImprovementSuggestion] = useState('')
  const [consent, setConsent] = useState('')

  // Load Data
  useEffect(() => {
    if (!internId) return
    const loadData = async () => {
      setLoading(true)
      try {
        let intern = null
        try {
          intern = await getInternById(internId)
          setInternData(intern)
        } catch (e) {
          console.warn('Could not load intern profile:', e.message)
        }

        let feedback = null
        try {
          feedback = await getMyExitFeedback()
        } catch (e) {
          console.warn('Could not load existing feedback:', e.message)
        }

        if (feedback) {
          setExistingFeedback(feedback)
          fillFormFromFeedback(feedback)
          setIsEditing(false)
        } else {
          setIsEditing(true)
        }
      } catch (err) {
        console.error('Failed to load data', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [internId])



  const fillFormFromFeedback = (fb) => {
    setOverallSatisfaction(fb.overall_satisfaction || 0)
    setMentorSupportiveness(fb.mentor_supportiveness || '')
    setLearningAreas(fb.learning_areas || [])
    setRatingClarity(fb.rating_clarity || '')
    setRatingResources(fb.rating_resources || '')
    setRatingWorkLifeBalance(fb.rating_work_life_balance || '')
    setRatingTeamIntegration(fb.rating_team_integration || '')
    setRecommendationRating(fb.recommendation_rating || 0)
    setTestimonial(fb.testimonial || '')
    setImprovementSuggestion(fb.improvement_suggestion || '')
    setConsent(fb.consent || '')
  }

  const toggleLearningArea = (area) => {
    setLearningAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }

  const isEditWindowOpen = () => {
    if (!existingFeedback) return false
    const submittedAt = new Date(existingFeedback.submitted_at)
    const sevenDaysLater = new Date(submittedAt)
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
    return new Date() <= sevenDaysLater
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    // Validation checks
    if (
      !overallSatisfaction ||
      !mentorSupportiveness ||
      learningAreas.length === 0 ||
      !ratingClarity ||
      !ratingResources ||
      !ratingWorkLifeBalance ||
      !ratingTeamIntegration ||
      !recommendationRating ||
      !testimonial.trim() ||
      !improvementSuggestion.trim() ||
      !consent
    ) {
      setErrorMsg('Please complete all required fields.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const payload = {
      intern_name: internData.name,
      contact_number: internData.number || 'N/A',
      email: internData.mail,
      college_name: internData.college_name || 'N/A',
      department: internData.dept || 'N/A',
      role_title: internData.role_title || 'Intern',
      start_date: formatDateForInput(internData.starting_date),
      end_date: formatDateForInput(internData.ending_date),
      overall_satisfaction: overallSatisfaction,
      mentor_supportiveness: mentorSupportiveness,
      learning_areas: learningAreas,
      rating_clarity: ratingClarity,
      rating_resources: ratingResources,
      rating_work_life_balance: ratingWorkLifeBalance,
      rating_team_integration: ratingTeamIntegration,
      recommendation_rating: recommendationRating,
      testimonial: testimonial.trim(),
      improvement_suggestion: improvementSuggestion.trim(),
      consent
    }

    try {
      await submitExitFeedback(payload)
      setSuccessMsg('Feedback submitted successfully.')
      const updated = await getMyExitFeedback()
      setExistingFeedback(updated)
      setIsEditing(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErrorMsg(err.message || 'Submission failed.')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3D35C4',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Submitted Confirmation View
  if (existingFeedback && !isEditing) {
    const editAllowed = isEditWindowOpen()
    return (
      <div style={{
        maxWidth: '720px',
        margin: '40px auto',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <div style={{
          background: '#fff',
          border: '1px solid #E0E0E0',
          borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '40px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ fontSize: '48px' }}>✅</div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: '#212121',
            margin: '0',
            fontWeight: 700
          }}>
            Feedback Submitted
          </h2>
          <p style={{ color: '#666', fontSize: '15px', margin: '0' }}>
            Submitted on {formatDate(existingFeedback.submitted_at)}
          </p>

          {editAllowed ? (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                marginTop: '24px',
                height: '44px',
                padding: '0 32px',
                background: '#3D35C4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.target.style.background = '#2C259D'}
              onMouseOut={e => e.target.style.background = '#3D35C4'}
            >
              Edit Feedback
            </button>
          ) : (
            <p style={{ color: '#9E9E9E', fontSize: '13px', marginTop: '24px', fontStyle: 'italic' }}>
              The 7-day edit window has closed.
            </p>
          )}
        </div>
      </div>
    )
  }

  const sectionsStyle = {
    background: '#fff',
    border: '1px solid #E0E0E0',
    borderRadius: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    padding: '24px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column'
  }

  const headingStyle = {
    fontSize: '11px',
    fontWeight: 700,
    color: '#3D35C4',
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    borderBottom: '2px solid #F0EEFF',
    paddingBottom: '8px',
    marginBottom: '16px',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  }

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212121',
    marginBottom: '12px'
  }

  const readOnlyDivStyle = {
    height: '42px',
    padding: '0 14px',
    background: '#F5F5F5',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    color: '#424242',
    fontFamily: "'Roboto', sans-serif"
  }

  const subtitleStyle = {
    fontSize: '11px',
    color: '#9E9E9E',
    marginTop: '4px',
    display: 'block'
  }

  const formGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  }

  const starStyle = {
    color: '#B00020',
    marginLeft: '4px'
  }

  return (
    <div style={{
      maxWidth: '720px',
      margin: '40px auto',
      fontFamily: "'Roboto', sans-serif",
      padding: '0 16px'
    }}>
      <h1 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: '28px',
        fontWeight: 800,
        color: '#212121',
        marginBottom: '28px',
        textAlign: 'center'
      }}>
        Intern Exit Feedback Form
      </h1>

      {errorMsg && (
        <div style={{
          background: '#FFEBEE',
          color: '#B00020',
          border: '1px solid #FFCDD2',
          padding: '14px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '24px',
          fontWeight: '500'
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{
          background: '#E8F5E9',
          color: '#2E7D32',
          border: '1px solid #C8E6C9',
          padding: '14px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '24px',
          fontWeight: '500'
        }}>
          ✅ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1 — Profile & Contact */}
        <div style={sectionsStyle}>
          <div style={headingStyle}>Section 1 — Profile & Contact</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <InternAvatar
              internId={internId}
              name={internData?.name}
              size={80}
              style={{ border: '2px solid #E0E0E0' }}
            />
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#212121' }}>
                {internData?.name || 'Loading Name...'}
              </h3>
              <p style={{ margin: '0', fontSize: '13px', color: '#666' }}>Auto-filled from your profile</p>
            </div>
          </div>

          <div style={formGridStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>Contact Number</span>
              <div style={readOnlyDivStyle}>{internData?.number || '—'}</div>
              <span style={subtitleStyle}>Auto-filled from your profile</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>Email Address</span>
              <div style={readOnlyDivStyle}>{internData?.mail || '—'}</div>
              <span style={subtitleStyle}>Auto-filled from your profile</span>
            </div>
          </div>
        </div>

        {/* Section 2 — College Information */}
        <div style={sectionsStyle}>
          <div style={headingStyle}>Section 2 — College Information</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>College / University Name</span>
              <div style={readOnlyDivStyle}>{internData?.college_name || '—'}</div>
              <span style={subtitleStyle}>Auto-filled from your profile</span>
            </div>

            <div style={formGridStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>Degree / Department</span>
                <div style={readOnlyDivStyle}>{internData?.dept || '—'}</div>
                <span style={subtitleStyle}>Auto-filled from your profile</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>Internship Role/Title</span>
                <div style={readOnlyDivStyle}>{internData?.role_title || 'Intern'}</div>
                <span style={subtitleStyle}>Auto-filled from your profile</span>
              </div>
            </div>

            <div style={formGridStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>Start Date</span>
                <div style={readOnlyDivStyle}>{formatDate(internData?.starting_date)}</div>
                <span style={subtitleStyle}>Auto-filled from your profile</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>End Date</span>
                <div style={readOnlyDivStyle}>{formatDate(internData?.ending_date)}</div>
                <span style={subtitleStyle}>Auto-filled from your profile</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 — Overall Satisfaction */}
        <div style={sectionsStyle}>
          <div style={headingStyle}>Section 3 — Overall Satisfaction</div>
          <label style={labelStyle}>
            Overall, how satisfied were you with your internship experience? <span style={starStyle}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between', margin: '8px 0' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
              const selected = overallSatisfaction === num
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setOverallSatisfaction(num)}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    background: selected ? '#3D35C4' : '#FAFAFA',
                    color: selected ? '#fff' : '#212121',
                    border: selected ? '2px solid #3D35C4' : '1px solid #E0E0E0'
                  }}
                >
                  {num}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#757575', fontSize: '11px', fontWeight: 600, marginTop: '8px', textTransform: 'uppercase' }}>
            <span>Very Dissatisfied</span>
            <span>Extremely Satisfied</span>
          </div>
        </div>

        {/* Section 4 — Mentor Support */}
        <div style={sectionsStyle}>
          <div style={headingStyle}>Section 4 — Mentor Support</div>
          <label style={labelStyle}>
            How helpful and supportive was your direct supervisor/mentor? <span style={starStyle}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {[
              { val: 'not_supportive', label: 'Not Supportive' },
              { val: 'slightly_supportive', label: 'Slightly Supportive' },
              { val: 'moderately_supportive', label: 'Moderately Supportive' },
              { val: 'very_supportive', label: 'Very Supportive' },
              { val: 'exceptionally_supportive', label: 'Exceptionally Supportive' }
            ].map(item => {
              const selected = mentorSupportiveness === item.val
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setMentorSupportiveness(item.val)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: selected ? '#3D35C4' : '#FAFAFA',
                    color: selected ? '#fff' : '#424242',
                    border: selected ? '1.5px solid #3D35C4' : '1px solid #E0E0E0'
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 5 — Learning Areas */}
        <div style={sectionsStyle}>
          <div style={headingStyle}>Section 5 — Learning Areas</div>
          <label style={labelStyle}>
            Which areas did you feel provided the most valuable learning experience? (select all that apply) <span style={starStyle}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {[
              'Technical Skill Development',
              'Professional Communication',
              'Project Management/Planning',
              'Team Collaboration',
              'Industry Networking',
              'Problem-Solving'
            ].map(area => {
              const selected = learningAreas.includes(area)
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleLearningArea(area)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: selected ? '#3D35C4' : '#FAFAFA',
                    color: selected ? '#fff' : '#424242',
                    border: selected ? '1.5px solid #3D35C4' : '1px solid #E0E0E0'
                  }}
                >
                  {area}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 6 — Aspect Ratings Grid */}
        <div style={sectionsStyle}>
          <div style={headingStyle}>Section 6 — Aspect Ratings Grid</div>
          <label style={labelStyle}>
            Please rate the following aspects of your internship experience: <span style={starStyle}>*</span>
          </label>
          <div style={{ overflowX: 'auto', marginTop: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#666' }}>Aspect</th>
                  {['Poor', 'Fair', 'Good', 'Excellent'].map(h => (
                    <th key={h} style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 600, color: '#666' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Clarity of expectations and goals', key: 'rating_clarity', state: ratingClarity, setter: setRatingClarity },
                  { label: 'Access to necessary resources/tools', key: 'rating_resources', state: ratingResources, setter: setRatingResources },
                  { label: 'Work-life balance', key: 'rating_work_life_balance', state: ratingWorkLifeBalance, setter: setRatingWorkLifeBalance },
                  { label: 'Integration into the team culture', key: 'rating_team_integration', state: ratingTeamIntegration, setter: setRatingTeamIntegration }
                ].map(aspect => (
                  <tr key={aspect.key} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '14px 8px', color: '#212121', fontWeight: '500' }}>{aspect.label}</td>
                    {['poor', 'fair', 'good', 'excellent'].map(level => {
                      const selected = aspect.state === level
                      return (
                        <td key={level} style={{ textAlign: 'center', padding: '10px 4px' }}>
                          <button
                            type="button"
                            onClick={() => aspect.setter(level)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              cursor: 'pointer',
                              border: selected ? '2px solid #3D35C4' : '1.5px solid #CBD5E0',
                              background: selected ? '#3D35C4' : '#FAFAFA',
                              boxShadow: selected ? '0 0 0 2px rgba(61,53,196,0.2)' : 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                            aria-label={`Rate ${aspect.label} as ${level}`}
                          >
                            {selected && (
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 7 — Recommendation Rating */}
        <div style={sectionsStyle}>
          <div style={headingStyle}>Section 7 — Recommendation Rating</div>
          <label style={labelStyle}>
            If you were to recommend this internship program to a peer, what rating would you give it? <span style={starStyle}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {[1, 2, 3, 4, 5].map(num => {
              const selected = recommendationRating === num
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRecommendationRating(num)}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    background: selected ? '#3D35C4' : '#FAFAFA',
                    color: selected ? '#fff' : '#212121',
                    border: selected ? '2px solid #3D35C4' : '1px solid #E0E0E0'
                  }}
                >
                  {num}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 8 — Testimonial */}
        <div style={sectionsStyle}>
          <div style={headingStyle}>Section 8 — Testimonial</div>
          <label style={labelStyle}>
            Please write your testimonial. This brief quote may be used for promotional material (max 3–4 sentences). <span style={starStyle}>*</span>
          </label>
          <textarea
            rows={4}
            value={testimonial}
            onChange={e => setTestimonial(e.target.value)}
            placeholder="Please share a short testimonial about your internship experience, learning, mentorship, and project exposure (3–4 sentences)."
            style={{
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #E0E0E0',
              fontSize: '14px',
              fontFamily: "'Roboto', sans-serif",
              outline: 'none',
              resize: 'vertical',
              color: '#212121'
            }}
          />
        </div>

        {/* Section 9 — Improvement */}
        <div style={sectionsStyle}>
          <div style={headingStyle}>Section 9 — Improvement</div>
          <label style={labelStyle}>
            What is one thing the program could do to improve the intern experience? <span style={starStyle}>*</span>
          </label>
          <textarea
            rows={3}
            value={improvementSuggestion}
            onChange={e => setImprovementSuggestion(e.target.value)}
            placeholder="Your suggestion for improvement..."
            style={{
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #E0E0E0',
              fontSize: '14px',
              fontFamily: "'Roboto', sans-serif",
              outline: 'none',
              resize: 'vertical',
              color: '#212121'
            }}
          />
        </div>

        {/* Section 10 — Consent */}
        <div style={sectionsStyle}>
          <div style={headingStyle}>Section 10 — Consent</div>
          <label style={labelStyle}>
            May we use your name and likeness along with the testimonial in public materials? <span style={starStyle}>*</span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            {[
              { val: 'name_and_testimonial', label: 'Yes, you may use both my name and testimonial.' },
              { val: 'anonymous', label: 'Yes, you may use my testimonial but please keep it anonymous.' },
              { val: 'private', label: 'No, please keep this feedback private.' }
            ].map(item => {
              const selected = consent === item.val
              return (
                <div
                  key={item.val}
                  onClick={() => setConsent(item.val)}
                  style={{
                    border: selected ? '2px solid #3D35C4' : '1px solid #E0E0E0',
                    background: selected ? '#F0EEFF' : '#FAFAFA',
                    borderRadius: '10px',
                    padding: '16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: selected ? '600' : '500',
                    color: selected ? '#3D35C4' : '#424242',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: selected ? '5px solid #3D35C4' : '2px solid #CBD5E0',
                    background: '#fff',
                    boxSizing: 'border-box'
                  }} />
                  {item.label}
                </div>
              )
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          style={{
            width: '100%',
            height: '50px',
            background: '#3D35C4',
            color: 'white',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '16px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'background 0.2s',
            marginBottom: '40px'
          }}
          onMouseOver={e => e.target.style.background = '#2C259D'}
          onMouseOut={e => e.target.style.background = '#3D35C4'}
        >
          Submit Exit Feedback
        </button>
      </form>
    </div>
  )
}
