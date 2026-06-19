import { useState, useEffect } from 'react'
import { downloadWorkbook } from '../../utils/spreadsheetExport'
import ApprovedInterns from '../admin/ApprovedInterns'
import PendingApprovals from '../admin/PendingApprovals'
import ArchivedInterns from '../admin/ArchivedInterns'
import ArchivedBatches from '../admin/ArchivedBatches'
import InternAvatar from '../InternAvatar'
import { getBatches, createBatch, updateBatch, changeBatchMentor, archiveBatch } from '../../services/batchService'
import { getAllAdmins, createAdmin, deleteAdmin } from '../../services/adminService'
import { getAllInterns, approveIntern, rejectIntern, getInternsByBatch } from '../../services/internService'
import { getProjectByInternId } from '../../services/projectService'
import { getTasksByInternId } from '../../services/taskService'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import { keepPreviousIfEqual } from '../../utils/stableState'

const SuperAdminLayout = ({ onLogout }) => {
  const [activePage, setActivePage] = useState('dashboard') // 'dashboard' | 'pending' | 'admins' | 'archived'
  const [batches, setBatches] = useState([])
  const [admins, setAdmins] = useState([])
  const [pendingInterns, setPendingInterns] = useState([])
  const [viewBatch, setViewBatch] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [changingMentorBatchId, setChangingMentorBatchId] = useState(null)
  const [selectedMentorId, setSelectedMentorId] = useState('')

  // Batch Form states
  const [batchNumber, setBatchNumber] = useState('')
  const [registrationKey, setRegistrationKey] = useState('')
  const [batchSuccess, setBatchSuccess] = useState('')
  const [batchError, setBatchError] = useState('')

  // Admin Form states
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminSuccess, setAdminSuccess] = useState('')
  const [adminError, setAdminError] = useState('')

  // UI state variables
  const [visibleKeyBatchId, setVisibleKeyBatchId] = useState(null)
  const [copiedBatchId, setCopiedBatchId] = useState(null)
  const [savedVisibility, setSavedVisibility] = useState({})

  // Batch Summary Card states
  const [summaryBatch, setSummaryBatch] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryStats, setSummaryStats] = useState({
    totalInterns: 0,
    internsWithProject: 0,
    internsWithoutProject: 0,
    avgDaysRemaining: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    notStartedTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    topPerformer: null,
    topPerformerCount: 0,
    hasInterns: false
  })

  const [internStatusCounts, setInternStatusCounts] = useState({ active: 0, discontinued: 0, completed: 0 })

  useEffect(() => {
    fetchBatches()
    fetchAdmins()
    fetchPending()
  }, [])



  // Select default batch for summary when batches load
  useEffect(() => {
    if (batches.length > 0 && !summaryBatch) {
      setSummaryBatch(batches[0])
    }
  }, [batches])

  // Fetch summary when summary batch changes
  useEffect(() => {
    if (summaryBatch) {
      fetchBatchSummary(summaryBatch.batch_number)
    }
  }, [summaryBatch?.batch_number])

  const fetchBatches = async () => {
    try {
      const data = await getBatches()
      if (data) {
        setBatches(previous => keepPreviousIfEqual(previous, data))
        setSummaryBatch(prev => prev ? keepPreviousIfEqual(prev, data.find(batch => batch.id === prev.id) || prev) : prev)
        setViewBatch(prev => prev ? keepPreviousIfEqual(prev, data.find(batch => batch.id === prev.id) || prev) : prev)
        fetchInternStatusCounts()
      }
    } catch (err) {
      console.error('Error fetching batches:', err.message)
    }
  }

  const fetchInternStatusCounts = async () => {
    try {
      const all = await getAllInterns()
      const approved = (all || []).filter(i => i.status === 'approved')
      const counts = { active: 0, discontinued: 0, completed: 0 }
      approved.forEach(i => {
        const s = i.intern_status || 'active'
        if (s === 'discontinued') counts.discontinued++
        else if (s === 'completed') counts.completed++
        else counts.active++
      })
      setInternStatusCounts(previous => keepPreviousIfEqual(previous, counts))
    } catch (err) {
      console.error('Error fetching intern status counts:', err.message)
    }
  }

  const fetchAdmins = async () => {
    try {
      const data = await getAllAdmins()
      if (data) setAdmins(previous => keepPreviousIfEqual(previous, data))
    } catch (err) {
      console.error('Error fetching admins:', err.message)
    }
  }

  const fetchPending = async () => {
    try {
      const allInterns = await getAllInterns()
      const pending = allInterns.filter((i) => i.status === 'pending')
      setPendingInterns(previous => keepPreviousIfEqual(previous, pending || []))
    } catch (err) {
      console.error('Error fetching pending registrations:', err.message)
    }
  }

  // Synchronize batches, mentors, and approval notifications in the background.
  useAutoRefresh(() => Promise.all([
    fetchBatches(),
    fetchAdmins(),
    fetchPending(),
    summaryBatch ? fetchBatchSummary(summaryBatch.batch_number, true) : Promise.resolve()
  ]), 10000)

  const handleExportAll = async () => {
    try {
      const allInterns = await getAllInterns()
      const approved = allInterns.filter(i => i.status === 'approved')
      if (!approved.length) { alert('No approved interns to export.'); return }
      const internIds = approved.map(i => i.id)
      const projectsData = await Promise.all(internIds.map(id => getProjectByInternId(id)))
      const projects = projectsData.filter(Boolean)
      const tasksData = await Promise.all(internIds.map(id => getTasksByInternId(id)))
      const tasks = tasksData.flat()
      const internMap = {}
      approved.forEach(i => { internMap[i.id] = i })
      const internSheet = approved.map(i => ({
        'Name': i.name, 'Email': i.mail, 'Phone': i.number,
        'College': i.college_name, 'Department': i.dept,
        'Batch': i.batch_number, 'Starting Date': i.starting_date,
        'Ending Date': i.ending_date, 'Status': i.status
      }))
      const projectSheet = projects.map(p => ({
        'Intern Name': internMap[p.intern_id]?.name || '—',
        'Batch': internMap[p.intern_id]?.batch_number || '—',
        'Project Title': p.title, 'Description': p.description,
        'Git Repo': p.git_repo_link || '—', 'Live Link': p.live_project_link || '—'
      }))
      const taskSheet = tasks.map(t => ({
        'Intern Name': internMap[t.intern_id]?.name || '—',
        'Batch': internMap[t.intern_id]?.batch_number || '—',
        'Task Title': t.title, 'Expected Date': t.expected_date,
        'Submission Date': t.submission_date || '—', 'Status': t.status
      }))
      downloadWorkbook(
        { Interns: internSheet, Projects: projectSheet, Tasks: taskSheet },
        `All_Batches_Export_${new Date().toISOString().split('T')[0]}.xls`
      )
    } catch (err) {
      alert('Export failed: ' + err.message)
    }
  }

  const fetchBatchSummary = async (batchNum, silent = false) => {
    if (!silent) setSummaryLoading(true)
    try {
      const batchInterns = await getInternsByBatch(batchNum)
      const safeInterns = batchInterns || []
      const internIds = safeInterns.map((i) => i.id)

      if (internIds.length === 0) {
        setSummaryStats(previous => keepPreviousIfEqual(previous, {
          totalInterns: 0,
          internsWithProject: 0,
          internsWithoutProject: 0,
          avgDaysRemaining: 0,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          notStartedTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          topPerformer: null,
          topPerformerCount: 0,
          hasInterns: false
        }))
        return
      }

      const tasksData = await Promise.all(internIds.map((id) => getTasksByInternId(id)))
      const batchTasks = tasksData.flat()

      const projectsData = await Promise.all(internIds.map((id) => getProjectByInternId(id)))
      const batchProjects = projectsData.filter(Boolean)

      const safeTasks = batchTasks || []
      const safeProjects = batchProjects || []
      const today = new Date().toISOString().split('T')[0]

      const totalInterns = safeInterns.length
      const internsWithProject = safeProjects.length
      const internsWithoutProject = totalInterns - internsWithProject
      const avgDaysRemaining =
        totalInterns > 0
          ? Math.round(
            safeInterns.reduce((sum, i) => {
              const endingDateStr = i.ending_date || i.endingDate
              const endingDate = endingDateStr ? new Date(endingDateStr) : null
              const diff =
                endingDate && !isNaN(endingDate.getTime())
                  ? Math.max(0, Math.ceil((endingDate - new Date()) / (1000 * 60 * 60 * 24)))
                  : 0
              return sum + diff
            }, 0) / totalInterns
          )
          : 0

      const totalTasks = safeTasks.length
      const completedTasks = safeTasks.filter((t) => t.status === 'completed').length
      const inProgressTasks = safeTasks.filter((t) => t.status === 'in_progress').length
      const notStartedTasks = safeTasks.filter((t) => t.status === 'not_started').length
      const overdueTasks = safeTasks.filter(
        (t) => t.status !== 'completed' && t.expected_date && t.expected_date < today
      ).length
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      const completedByIntern = {}
      safeTasks
        .filter((t) => t.status === 'completed')
        .forEach((t) => {
          completedByIntern[t.intern_id] = (completedByIntern[t.intern_id] || 0) + 1
        })
      const topInternId = Object.entries(completedByIntern).sort((a, b) => b[1] - a[1])[0]?.[0]
      const topPerformer = safeInterns.find((i) => i.id === topInternId)
      const topPerformerCount = completedByIntern[topInternId] || 0

      setSummaryStats(previous => keepPreviousIfEqual(previous, {
        totalInterns,
        internsWithProject,
        internsWithoutProject,
        avgDaysRemaining,
        totalTasks,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        overdueTasks,
        completionRate,
        topPerformer,
        topPerformerCount,
        hasInterns: true
      }))
    } catch (err) {
      console.error('Error fetching batch summary:', err.message)
    } finally {
      if (!silent) setSummaryLoading(false)
    }
  }

  const handleGenerateKey = () => {
    if (!batchNumber.trim()) return

    const today = new Date()
    const dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0')

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let randomStr = ''
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    const batchCode = batchNumber.trim().toUpperCase().replace(/\s+/g, '')
    const key = `${dateStr}-${randomStr}-${batchCode}`
    setRegistrationKey(key)
  }

  const handleCreateBatch = async (e) => {
    e.preventDefault()
    setBatchError('')
    setBatchSuccess('')

    if (!batchNumber.trim() || !registrationKey.trim()) {
      setBatchError('Both Batch Number and Registration Key are required.')
      return
    }

    try {
      const data = await createBatch({
        batch_number: batchNumber.trim(),
        registration_key: registrationKey.trim()
      })
      setBatchSuccess(`Batch "${batchNumber}" provisioned successfully!`)
      setBatches((prev) => [data, ...prev])
      setBatchNumber('')
      setRegistrationKey('')
    } catch (err) {
      setBatchError(err.message || 'Failed to create batch.')
    }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    setAdminError('')
    setAdminSuccess('')

    if (!adminName.trim() || !adminEmail.trim()) {
      setAdminError('Both Name and Email are required.')
      return
    }

    try {
      await createAdmin(adminName.trim(), adminEmail.trim())
      setAdminSuccess(`Admin created and credentials sent to ${adminEmail}`)
      setAdminName('')
      setAdminEmail('')
      fetchAdmins()
    } catch (err) {
      setAdminError(err.message || 'Failed to create admin.')
    }
  }

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Delete this admin?')) return

    try {
      await deleteAdmin(id)
      fetchAdmins()
    } catch (err) {
      alert(`Deletion failed: ${err.message}`)
    }
  }

  const handleToggleBatchStatus = async (batch) => {
    const updatedStatus = !batch.is_active
    try {
      await updateBatch(batch.id, {
        is_active: updatedStatus,
        visibility_mode: batch.visibility_mode
      })
      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, is_active: updatedStatus } : b))
      )
    } catch (err) {
      alert(`Status toggle failed: ${err.message}`)
    }
  }

  const handleUpdateVisibilityMode = async (batchId, mode) => {
    try {
      const batch = batches.find((b) => b.id === batchId)
      await updateBatch(batchId, {
        is_active: batch?.is_active ?? true,
        visibility_mode: mode
      })
      setBatches((prev) =>
        prev.map((b) => (b.id === batchId ? { ...b, visibility_mode: mode } : b))
      )
      setSavedVisibility((prev) => ({ ...prev, [batchId]: true }))
      setTimeout(() => {
        setSavedVisibility((prev) => ({ ...prev, [batchId]: false }))
      }, 2000)
    } catch (err) {
      alert('Failed to save visibility mode: ' + err.message)
    }
  }

  const handleArchiveBatch = async (batch) => {
    if (!window.confirm(`Archive batch "${batch.batch_number}"? It will be hidden from batch management and registration, but existing intern data will be preserved.`)) {
      return
    }

    try {
      await archiveBatch(batch.id)
      setBatches((prev) => prev.filter((b) => b.id !== batch.id))
      if (summaryBatch?.id === batch.id) {
        setSummaryBatch(null)
      }
      if (viewBatch?.id === batch.id) {
        setViewBatch(null)
      }
      alert('Batch archived successfully.')
    } catch (err) {
      alert(`Archive batch failed: ${err.message}`)
    }
  }

  const handleChangeMentorSubmit = async (batchId, adminId) => {
    try {
      await changeBatchMentor(batchId, adminId)
      setChangingMentorBatchId(null)
      setSelectedMentorId('')
      fetchBatches()
      alert('Mentor updated successfully!')
    } catch (err) {
      alert('Failed to update mentor: ' + err.message)
    }
  }

  const handleApprove = async (id) => {
    try {
      const intern = pendingInterns.find((i) => i.id === id)
      if (!intern) return
      await approveIntern(id)
      setPendingInterns((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      alert(`Approval failed: ${err.message}`)
    }
  }

  const handleReject = async (id) => {
    try {
      await rejectIntern(id)
      setPendingInterns((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      alert(`Rejection failed: ${err.message}`)
    }
  }

  const filteredBatches = batches.filter((b) => {
    const num = b.batch_number?.toLowerCase() || ''
    const mentor = b.mentor_name?.toLowerCase() || ''
    const q = searchTerm.toLowerCase()
    return num.includes(q) || mentor.includes(q)
  })

  // Styles matched from AdminLayout
  const activeTabStyle = {
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#fff',
    borderRadius: '8px',
    padding: '7px 16px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    border: 'none',
    cursor: 'pointer',
    outline: 'none'
  }

  const inactiveTabStyle = {
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '8px',
    padding: '7px 16px',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background 0.2s, color 0.2s'
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Header Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: '56px',
        background: '#3D35C4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
        boxSizing: 'border-box'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            style={activePage === 'dashboard' ? activeTabStyle : inactiveTabStyle}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActivePage('pending')}
            style={activePage === 'pending' ? activeTabStyle : inactiveTabStyle}
          >
            Pending Approvals
          </button>
          <button
            type="button"
            onClick={() => setActivePage('admins')}
            style={activePage === 'admins' ? activeTabStyle : inactiveTabStyle}
          >
            Admin Management
          </button>
          <button
            type="button"
            onClick={() => setActivePage('archived')}
            style={activePage === 'archived' ? activeTabStyle : inactiveTabStyle}
          >
            Archives
          </button>
        </div>

        {/* Right Label, Notification Bell & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Bell Icon */}
          <div
            onClick={() => setActivePage('pending')}
            style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Pending Approvals"
          >
            <i className="ti ti-bell" style={{ fontSize: '22px', color: '#fff' }} />
            {pendingInterns.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '-6px',
                background: '#FF4444',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                minWidth: '18px',
                height: '18px',
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                {pendingInterns.length}
              </div>
            )}
          </div>

          <span style={{
            color: '#fff',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            display: 'inline-block'
          }}>
            Super Admin Panel
          </span>

          <button
            type="button"
            onClick={onLogout}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              border: '1px solid rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background 0.2s'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        marginTop: '56px',
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        width: '100vw',
        boxSizing: 'border-box',
        padding: '24px',
        background: 'radial-gradient(circle at 15% 20%, rgba(232, 230, 248, 0.6) 0%, transparent 35%), radial-gradient(circle at 85% 80%, rgba(253, 246, 236, 0.6) 0%, transparent 35%), #FFFFFF',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {activePage === 'dashboard' && (
          <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {viewBatch ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                <button
                  onClick={() => setViewBatch(null)}
                  style={{
                    alignSelf: 'flex-start',
                    marginBottom: '16px',
                    background: 'transparent',
                    color: '#3D35C4',
                    border: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}
                >
                  ← Back to Dashboard
                </button>
                <ApprovedInterns batchNumber={viewBatch.batch_number} />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(460px, 1.5fr)', gap: '30px', alignItems: 'start', height: '100%', minHeight: 0 }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
                  {/* Card 1: Batch Summary Card */}
                  <div style={{
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    padding: '20px',
                    border: '1px solid #E0E0E0'
                  }}>
                    <h3 style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#212121',
                      marginBottom: '20px',
                      marginTop: 0
                    }}>
                      📊 Batch Summary — {summaryBatch ? summaryBatch.batch_number : 'None'}
                    </h3>

                    {summaryLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ background: '#F5F5F5', borderRadius: '10px', height: '60px' }} />
                        <div style={{ background: '#F5F5F5', borderRadius: '10px', height: '60px' }} />
                        <div style={{ background: '#F5F5F5', borderRadius: '10px', height: '60px' }} />
                        <div style={{ background: '#F5F5F5', borderRadius: '10px', height: '60px' }} />
                      </div>
                    ) : !summaryBatch ? (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '120px',
                        fontFamily: "'Roboto', sans-serif",
                        color: '#9E9E9E',
                        textAlign: 'center'
                      }}>
                        No batch selected.
                      </div>
                    ) : !summaryStats.hasInterns ? (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '120px',
                        fontFamily: "'Roboto', sans-serif",
                        color: '#9E9E9E',
                        textAlign: 'center'
                      }}>
                        No approved interns in this batch yet.
                      </div>
                    ) : (
                      <div>
                        {/* Section 1 — Intern Stats */}
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#9E9E9E',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          marginBottom: '10px',
                          display: 'block'
                        }}>
                          INTERNS
                        </span>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                          <div style={{ background: '#F3F0FF', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#3D35C4', lineHeight: 1 }}>
                              {summaryStats.totalInterns}
                            </div>
                            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                              Total Interns
                            </div>
                          </div>
                          <div style={{ background: '#E8F5E9', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#2E7D32', lineHeight: 1 }}>
                              {summaryStats.internsWithProject}
                            </div>
                            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                              With Project
                            </div>
                          </div>
                          <div style={{ background: '#FFF3E0', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#E65100', lineHeight: 1 }}>
                              {summaryStats.internsWithoutProject}
                            </div>
                            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                              No Project Yet
                            </div>
                          </div>
                        </div>

                        <div style={{
                          background: '#F0EEFF',
                          borderRadius: '10px',
                          padding: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '10px'
                        }}>
                          <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '13px', fontWeight: 600, color: '#3D35C4' }}>
                            Avg Days Remaining
                          </span>
                          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '20px', fontWeight: 700, color: '#3D35C4' }}>
                            {summaryStats.avgDaysRemaining} days
                          </span>
                        </div>

                        {/* Section 2 — Task Stats */}
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#9E9E9E',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          marginTop: '16px',
                          marginBottom: '10px',
                          display: 'block'
                        }}>
                          TASKS
                        </span>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div style={{ background: '#F3F0FF', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#3D35C4', lineHeight: 1 }}>
                              {summaryStats.totalTasks}
                            </div>
                            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                              Total Tasks
                            </div>
                          </div>
                          <div style={{ background: '#E8F5E9', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#2E7D32', lineHeight: 1 }}>
                              {summaryStats.completedTasks}
                            </div>
                            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                              Completed
                            </div>
                          </div>
                          <div style={{ background: '#E3F2FD', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#1565C0', lineHeight: 1 }}>
                              {summaryStats.inProgressTasks}
                            </div>
                            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                              In Progress
                            </div>
                          </div>
                          <div style={{ background: '#FFF8E1', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#F9A825', lineHeight: 1 }}>
                              {summaryStats.notStartedTasks}
                            </div>
                            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                              Not Started
                            </div>
                          </div>
                        </div>

                        <div style={{
                          background: summaryStats.overdueTasks > 0 ? '#FFEBEE' : '#F5F5F5',
                          borderRadius: '10px',
                          padding: '12px',
                          marginTop: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{
                            fontFamily: "'Roboto', sans-serif",
                            fontSize: '13px',
                            fontWeight: 600,
                            color: summaryStats.overdueTasks > 0 ? '#B00020' : '#9E9E9E'
                          }}>
                            ⚠️ Overdue Tasks
                          </span>
                          <span style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: '20px',
                            fontWeight: 700,
                            color: summaryStats.overdueTasks > 0 ? '#B00020' : '#9E9E9E'
                          }}>
                            {summaryStats.overdueTasks}
                          </span>
                        </div>

                        {/* Section 3 — Completion Rate */}
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#9E9E9E',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          marginTop: '16px',
                          marginBottom: '10px',
                          display: 'block'
                        }}>
                          COMPLETION RATE
                        </span>

                        <div style={{ background: '#F9F9F9', borderRadius: '10px', padding: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '13px', fontWeight: 600, color: '#212121' }}>
                              Overall Progress
                            </span>
                            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', fontWeight: 700, color: '#3D35C4' }}>
                              {summaryStats.completionRate}%
                            </span>
                          </div>
                          <div style={{ height: '8px', borderRadius: '4px', background: '#E0E0E0', marginTop: '10px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${summaryStats.completionRate}%`,
                              background: summaryStats.completionRate >= 75 ? '#2E7D32' : (summaryStats.completionRate >= 40 ? '#3D35C4' : '#E65100'),
                              borderRadius: '4px',
                              height: '8px',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>

                        {/* Section 4 — Top Performer */}
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#9E9E9E',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          marginTop: '16px',
                          marginBottom: '10px',
                          display: 'block'
                        }}>
                          TOP PERFORMER
                        </span>

                        {!summaryStats.topPerformer ? (
                          <div style={{
                            fontFamily: "'Roboto', sans-serif",
                            color: '#9E9E9E',
                            fontSize: '13px',
                            textAlign: 'center',
                            padding: '12px'
                          }}>
                            No completed tasks yet.
                          </div>
                        ) : (
                          <div style={{
                            background: 'linear-gradient(135deg, #F3F0FF 0%, #E8E6FF 100%)',
                            borderRadius: '10px',
                            padding: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <InternAvatar
                              internId={summaryStats.topPerformer.id}
                              name={summaryStats.topPerformer.name}
                              size={44}
                              photoBust={summaryStats.topPerformer._photoBust || ''}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 700, color: '#3D35C4' }}>
                                {summaryStats.topPerformer.name}
                              </span>
                              <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '12px', color: '#757575', marginTop: '2px' }}>
                                {summaryStats.topPerformerCount} tasks completed
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card 2: Provision New Batch */}
                  <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Provision New Batch</h3>
                    {batchSuccess && <div style={{ background: '#E6F4EA', color: '#137333', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px', fontWeight: '500' }}>{batchSuccess}</div>}
                    {batchError && <div style={{ background: '#FCE8E6', color: '#C5221F', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px', fontWeight: '500' }}>{batchError}</div>}
                    <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Batch Number</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input
                            type="text"
                            placeholder="BATCH NUMBER"
                            value={batchNumber}
                            onChange={(e) => {
                              setBatchNumber(e.target.value)
                              setRegistrationKey('')
                            }}
                            required
                            style={{
                              flex: 1,
                              height: '40px',
                              padding: '0 12px',
                              border: '1px solid #E0E0E0',
                              borderRadius: '6px',
                              fontSize: '14px',
                              boxSizing: 'border-box'
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleGenerateKey}
                            disabled={!batchNumber.trim()}
                            style={{
                              height: '40px',
                              padding: '0 16px',
                              background: batchNumber.trim() ? '#03DAC6' : '#F5F5F5',
                              color: batchNumber.trim() ? '#000000' : '#BDBDBD',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '600',
                              fontSize: '13px',
                              cursor: batchNumber.trim() ? 'pointer' : 'not-allowed',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            Generate Key
                          </button>
                        </div>
                      </div>
                      {registrationKey && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          background: '#F8F7FF',
                          border: '1px solid #3D35C4',
                          borderRadius: '8px',
                          padding: '10px 14px'
                        }}>
                          <i className="ti ti-key" style={{ color: '#3D35C4', fontSize: '16px' }} />
                          <span style={{
                            flex: 1,
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            color: '#3D35C4',
                            fontWeight: '600',
                            letterSpacing: '0.05em'
                          }}>
                            {registrationKey}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(registrationKey)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#3D35C4',
                              fontSize: '13px',
                              fontWeight: '500',
                              padding: '4px 8px'
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={!batchNumber.trim() || !registrationKey.trim()}
                        style={{
                          height: '40px',
                          background: (batchNumber.trim() && registrationKey) ? '#3D35C4' : '#F5F5F5',
                          color: (batchNumber.trim() && registrationKey) ? '#FFFFFF' : '#BDBDBD',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: (batchNumber.trim() && registrationKey) ? 'pointer' : 'not-allowed'
                        }}
                      >
                        Generate Batch
                      </button>
                    </form>
                  </div>

                  {/* Card 3: Create Admin */}
                  <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Create Admin</h3>
                    {adminSuccess && <div style={{ background: '#E6F4EA', color: '#137333', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px', fontWeight: '500' }}>{adminSuccess}</div>}
                    {adminError && <div style={{ background: '#FCE8E6', color: '#C5221F', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px', fontWeight: '500' }}>{adminError}</div>}
                    <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Name</label>
                        <input
                          type="text"
                          placeholder="Admin Name"
                          value={adminName}
                          onChange={(e) => { setAdminName(e.target.value); setAdminError(''); setAdminSuccess('') }}
                          required
                          style={{
                            height: '40px',
                            padding: '0 12px',
                            border: '1px solid #E0E0E0',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Email</label>
                        <input
                          type="email"
                          placeholder="Admin Email"
                          value={adminEmail}
                          onChange={(e) => { setAdminEmail(e.target.value); setAdminError(''); setAdminSuccess('') }}
                          required
                          style={{
                            height: '40px',
                            padding: '0 12px',
                            border: '1px solid #E0E0E0',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <button
                        type="submit"
                        style={{
                          height: '40px',
                          background: '#3D35C4',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Create Admin
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Column: Registered Batches */}
                <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#212121', margin: 0 }}>Registered Batches ({batches.length})</h3>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                          🟢 {internStatusCounts.active} Active
                        </span>
                        <span style={{ background: '#FFF3F3', color: '#B00020', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                          ⛔ {internStatusCounts.discontinued} Discontinued
                        </span>
                        <span style={{ background: '#F0EEFF', color: '#3D35C4', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                          🎓 {internStatusCounts.completed} Completed
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportAll()}
                      style={{
                        background: '#3D35C4',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontFamily: "'Plus Jakarta Sans', sans-serif"
                      }}
                    >
                      ⬇ Export All Batches
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by batch number or mentor name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      border: '1px solid #E0E0E0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      marginBottom: '20px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
                    {filteredBatches.map((batch) => {
                      const isSelected = summaryBatch && summaryBatch.id === batch.id
                      return (
                        <div
                          key={batch.id}
                          onClick={() => setSummaryBatch(batch)}
                          style={{
                            padding: isSelected ? '15px 19px' : '16px 20px',
                            border: isSelected ? `2px solid ${batch.internship_completed ? '#2E7D32' : '#3D35C4'}` : `1px solid ${batch.internship_completed ? '#A5D6A7' : '#EEEEEE'}`,
                            borderRadius: '10px',
                            background: batch.internship_completed ? 'linear-gradient(135deg, #F4FBF5 0%, #E8F5E9 100%)' : '#FAFAFA',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {/* Top row — batch name + toggle only */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}>
                            {/* Batch Number */}
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                setViewBatch(batch)
                              }}
                              style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: '#3D35C4',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              {batch.batch_number}
                            </span>

                            {batch.internship_completed && (
                              <span style={{
                                background: '#2E7D32', color: '#FFFFFF', borderRadius: '12px',
                                padding: '4px 9px', fontSize: '9px', fontWeight: 800,
                                letterSpacing: '0.3px', whiteSpace: 'nowrap'
                              }}>
                                ✓ INTERNSHIP COMPLETED
                              </span>
                            )}

                            {/* Active/Inactive Status Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleBatchStatus(batch)
                                }}
                                style={{
                                  width: '40px',
                                  height: '22px',
                                  borderRadius: '11px',
                                  background: batch.is_active ? '#3D35C4' : '#E0E0E0',
                                  position: 'relative',
                                  cursor: 'pointer',
                                  transition: 'background 0.25s ease',
                                  flexShrink: 0
                                }}
                              >
                                <div style={{
                                  position: 'absolute',
                                  top: '2px',
                                  left: batch.is_active ? '20px' : '2px',
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: '#FFFFFF',
                                  transition: 'left 0.25s ease',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }} />
                              </div>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                color: batch.is_active ? '#3D35C4' : '#9E9E9E',
                                minWidth: '46px'
                              }}>
                                {batch.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>

                          {/* Mentor change inline select */}
                          {changingMentorBatchId === batch.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'flex',
                                gap: '8px',
                                background: '#F9F9F9',
                                padding: '10px',
                                borderRadius: '6px',
                                border: '1px solid #E0E0E0',
                                marginTop: '4px'
                              }}
                            >
                              <select
                                value={selectedMentorId}
                                onChange={(e) => setSelectedMentorId(e.target.value)}
                                style={{
                                  flex: 1,
                                  height: '32px',
                                  borderRadius: '4px',
                                  border: '1px solid #CCC',
                                  fontSize: '13px'
                                }}
                              >
                                <option value="">Select Mentor...</option>
                                {admins.map((adm) => (
                                  <option key={adm.id} value={adm.id}>
                                    {adm.name} ({adm.email})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleChangeMentorSubmit(batch.id, selectedMentorId)}
                                style={{
                                  background: '#3D35C4',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '0 12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Save
                              </button>
                            </div>
                          )}

                          {/* Middle/Bottom Row — Profiles Visibility, Show Key, and Mentor stack */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            borderTop: '1px solid #EEEEEE',
                            paddingTop: '12px',
                            marginTop: '4px'
                          }}>
                            {/* Left: Visibility & Show Key */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>
                                  Profiles Visibility:
                                </span>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                  {[
                                    { mode: 'public', label: 'Public' },
                                    { mode: 'private', label: 'Private' },
                                    { mode: 'intern_choice', label: "Intern's Choice" }
                                  ].map(({ mode, label }) => {
                                    const isActive = (batch.visibility_mode || 'intern_choice') === mode
                                    return (
                                      <button
                                        key={mode}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleUpdateVisibilityMode(batch.id, mode)
                                        }}
                                        style={{
                                          background: isActive ? '#3D35C4' : '#F5F5F5',
                                          color: isActive ? '#FFFFFF' : '#616161',
                                          border: 'none',
                                          borderRadius: '8px',
                                          padding: '6px 14px',
                                          fontSize: '12px',
                                          fontWeight: isActive ? '600' : '400',
                                          cursor: 'pointer',
                                          transition: 'background 0.2s, color 0.2s'
                                        }}
                                      >
                                        {label}
                                      </button>
                                    )
                                  })}
                                </div>
                                {savedVisibility[batch.id] && (
                                  <span style={{
                                    color: '#3D35C4',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    marginLeft: '4px'
                                  }}>
                                    ✓ Saved
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setVisibleKeyBatchId(visibleKeyBatchId === batch.id ? null : batch.id)
                                  }}
                                  style={{
                                    background: 'none',
                                    border: '1px solid #E0E0E0',
                                    borderRadius: '6px',
                                    padding: '5px 12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    color: '#757575',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <i className="ti ti-eye" style={{ fontSize: '14px' }} />
                                  {visibleKeyBatchId === batch.id ? 'Hide Key' : 'Show Key'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleArchiveBatch(batch)
                                  }}
                                  style={{
                                    background: '#FFF3E0',
                                    border: '1px solid #E65100',
                                    borderRadius: '6px',
                                    padding: '5px 12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#E65100',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <i className="ti ti-archive" style={{ fontSize: '14px' }} />
                                  Archive Batch
                                </button>
                              </div>
                            </div>

                            {/* Right: Mentor stack + Change Mentor button */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.4 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                                  {batch.mentor_name || 'Unassigned'}
                                </span>
                                <span style={{ fontSize: 11, color: '#888' }}>
                                  {batch.mentor_email}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setChangingMentorBatchId(changingMentorBatchId === batch.id ? null : batch.id)
                                  setSelectedMentorId(batch.created_by || '')
                                }}
                                style={{
                                  background: 'transparent',
                                  color: '#3D35C4',
                                  border: '1px solid #3D35C4',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Change Mentor
                              </button>
                            </div>
                          </div>

                          {/* Key reveal details */}
                          {visibleKeyBatchId === batch.id && (
                            <div style={{
                              marginTop: '10px',
                              background: '#F8F7FF',
                              border: '1px solid #3D35C4',
                              borderRadius: '8px',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px'
                            }}>
                              <i className="ti ti-key" style={{ color: '#3D35C4', fontSize: '16px', flexShrink: 0 }} />
                              <span style={{
                                flex: 1,
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                color: '#3D35C4',
                                fontWeight: '600',
                                letterSpacing: '0.05em',
                                wordBreak: 'break-all'
                              }}>
                                {batch.registration_key}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigator.clipboard.writeText(batch.registration_key)
                                  setCopiedBatchId(batch.id)
                                  setTimeout(() => setCopiedBatchId(null), 2000)
                                }}
                                style={{
                                  background: copiedBatchId === batch.id ? '#03DAC6' : '#3D35C4',
                                  color: copiedBatchId === batch.id ? '#000000' : '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '5px 12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  transition: 'background 0.2s'
                                }}
                              >
                                {copiedBatchId === batch.id ? '✓ Copied' : 'Copy'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setVisibleKeyBatchId(null)
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#9E9E9E',
                                  fontSize: '18px',
                                  lineHeight: 1,
                                  padding: '0 4px',
                                  flexShrink: 0
                                }}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {filteredBatches.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#757575', padding: '20px' }}>No batches found</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activePage === 'pending' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <PendingApprovals
              pendingInterns={pendingInterns}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </div>
        )}

        {activePage === 'admins' && (
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#212121', marginBottom: '20px', marginTop: 0 }}>Admin Management</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {admins.map((adm) => (
                <div
                  key={adm.id}
                  style={{
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', color: '#212121' }}>{adm.name || 'No Name'}</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#757575' }}>{adm.email}</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#BDBDBD' }}>
                      Created: {new Date(adm.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteAdmin(adm.id)}
                    style={{
                      alignSelf: 'flex-start',
                      background: '#FF4444',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {admins.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#757575', padding: '20px' }}>No admins found</div>
              )}
            </div>
          </div>
        )}
        {activePage === 'archived' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <ArchivedBatches onRestoreSuccess={fetchBatches} />
            <ArchivedInterns onRestoreSuccess={fetchPending} />
          </div>
        )}
      </div>
    </div>
  )
}

export default SuperAdminLayout
