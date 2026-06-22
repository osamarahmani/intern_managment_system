import { useState, useEffect, useRef } from 'react'
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
import { getUserEmail, getUserName, isSuperAdminOwner } from '../../services/authService'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import { keepPreviousIfEqual } from '../../utils/stableState'

const SUPER_ADMIN_ACTIVE_PAGE_KEY = 'ims_super_admin_active_page'

const SuperAdminLayout = ({ onLogout }) => {
  const superAdminName = getUserName() || 'Super Admin'
  const superAdminEmail = getUserEmail()
  const canonicalSuperAdmin = isSuperAdminOwner()
  const [activePage, setActivePage] = useState(() => sessionStorage.getItem(SUPER_ADMIN_ACTIVE_PAGE_KEY) || 'dashboard') // 'dashboard' | 'pending' | 'admins' | 'archived'
  const [batches, setBatches] = useState([])
  const [admins, setAdmins] = useState([])
  const [pendingInterns, setPendingInterns] = useState([])
  const [viewBatch, setViewBatch] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAdminFilter, setSelectedAdminFilter] = useState('all')
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
  const dashboardLeftColumnRef = useRef(null)
  const [dashboardRightHeight, setDashboardRightHeight] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth))

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
    sessionStorage.setItem(SUPER_ADMIN_ACTIVE_PAGE_KEY, activePage)
  }, [activePage])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isDashboardStacked = viewportWidth < 1180
  const isDashboardMobile = viewportWidth < 760

  useEffect(() => {
    if (activePage !== 'dashboard' || viewBatch || isDashboardStacked || !dashboardLeftColumnRef.current) {
      setDashboardRightHeight(null)
      return undefined
    }

    const updateHeight = () => {
      const height = dashboardLeftColumnRef.current?.getBoundingClientRect().height || 0
      if (height > 0) setDashboardRightHeight(Math.round(height))
    }

    updateHeight()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateHeight) : null
    observer?.observe(dashboardLeftColumnRef.current)
    window.addEventListener('resize', updateHeight)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [activePage, viewBatch, isDashboardStacked, summaryBatch?.id, summaryStats, batchSuccess, batchError, adminSuccess, adminError])

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
      fetchBatchSummary(summaryBatch.batch_number, false, summaryBatch.id)
    }
  }, [summaryBatch?.id, summaryBatch?.batch_number])

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
    summaryBatch ? fetchBatchSummary(summaryBatch.batch_number, true, summaryBatch.id) : Promise.resolve()
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

  const fetchBatchSummary = async (batchNum, silent = false, batchId = null) => {
    if (!silent) setSummaryLoading(true)
    try {
      const batchInterns = await getInternsByBatch(batchNum, undefined, batchId)
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
    const matchesSearch = num.includes(q) || mentor.includes(q)
    const matchesAdmin = selectedAdminFilter === 'all' || b.created_by === selectedAdminFilter
    return matchesSearch && matchesAdmin
  })

  const platformTotals = {
    admins: admins.length,
    batches: batches.length,
    totalStudents: batches.reduce((sum, batch) => sum + (batch.total_intern_count || 0), 0),
    approvedInterns: batches.reduce((sum, batch) => sum + (batch.intern_count || 0), 0),
    completedInterns: batches.reduce((sum, batch) => sum + (batch.completed_intern_count || 0), 0),
    activeInterns: batches.reduce((sum, batch) => sum + (batch.active_intern_count || 0), 0),
    discontinuedInterns: batches.reduce((sum, batch) => sum + (batch.discontinued_intern_count || 0), 0)
  }

  const superAdminBatches = batches.filter(batch => String(batch.mentor_email || '').toLowerCase() === String(superAdminEmail || '').toLowerCase())
  const normalAdminBatches = batches.filter(batch => String(batch.mentor_email || '').toLowerCase() !== String(superAdminEmail || '').toLowerCase())

  const summarizeBatches = (batchList) => ({
    batches: batchList.length,
    totalStudents: batchList.reduce((sum, batch) => sum + (batch.total_intern_count || 0), 0),
    approvedInterns: batchList.reduce((sum, batch) => sum + (batch.intern_count || 0), 0),
    activeInterns: batchList.reduce((sum, batch) => sum + (batch.active_intern_count || 0), 0),
    completedInterns: batchList.reduce((sum, batch) => sum + (batch.completed_intern_count || 0), 0),
    discontinuedInterns: batchList.reduce((sum, batch) => sum + (batch.discontinued_intern_count || 0), 0)
  })

  const superAdminTotals = summarizeBatches(superAdminBatches)
  const normalAdminTotals = summarizeBatches(normalAdminBatches)

  const adminTotals = admins.reduce((acc, admin) => {
    const ownedBatches = batches.filter(batch => batch.created_by === admin.id)
    acc[admin.id] = {
      batches: ownedBatches.length,
      totalStudents: ownedBatches.reduce((sum, batch) => sum + (batch.total_intern_count || 0), 0),
      approvedInterns: ownedBatches.reduce((sum, batch) => sum + (batch.intern_count || 0), 0),
      activeInterns: ownedBatches.reduce((sum, batch) => sum + (batch.active_intern_count || 0), 0),
      completedInterns: ownedBatches.reduce((sum, batch) => sum + (batch.completed_intern_count || 0), 0),
      discontinuedInterns: ownedBatches.reduce((sum, batch) => sum + (batch.discontinued_intern_count || 0), 0)
    }
    return acc
  }, {})

  const dashboardTwoColumnGrid = isDashboardStacked
    ? '1fr'
    : 'minmax(320px, 0.9fr) minmax(520px, 1.4fr)'
  const dashboardStudentGrid = isDashboardMobile
    ? '1fr'
    : 'minmax(280px, 1fr) minmax(280px, 1fr)'
  const normalAdminsGrid = isDashboardStacked
    ? '1fr'
    : 'minmax(180px, 1fr) repeat(5, minmax(90px, 0.7fr))'
  const quickActionsGrid = isDashboardMobile
    ? '1fr'
    : 'repeat(2, minmax(0, 1fr))'
  const quickActionCardStyle = {
    background: '#FFFFFF',
    padding: isDashboardMobile ? '16px' : '18px',
    borderRadius: '12px',
    border: '1px solid #E0E0E0',
    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: isDashboardMobile ? 'auto' : '318px',
    boxSizing: 'border-box'
  }
  const actionStatusSlotStyle = {
    minHeight: isDashboardMobile ? '0' : '38px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'stretch'
  }
  const actionMessageStyle = (type) => ({
    background: type === 'success' ? '#E6F4EA' : '#FCE8E6',
    color: type === 'success' ? '#137333' : '#C5221F',
    padding: '9px 11px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    width: '100%',
    boxSizing: 'border-box',
    lineHeight: 1.35
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
            onClick={() => {
              setSelectedAdminFilter('all')
              setActivePage('admins')
            }}
            style={activePage === 'admins' ? activeTabStyle : inactiveTabStyle}
          >
            Admin Data
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

          <div style={{
            color: '#fff',
            borderRadius: '8px',
            padding: '6px 12px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px',
            background: 'rgba(255, 255, 255, 0.12)',
            border: canonicalSuperAdmin ? '1px solid rgba(3, 218, 198, 0.7)' : '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.1 }}>
              👑 {superAdminName}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.9, lineHeight: 1.1 }}>
              {canonicalSuperAdmin ? 'Only Super Admin' : 'Super Admin'}{superAdminEmail ? ` • ${superAdminEmail}` : ''}
            </span>
          </div>

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
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
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
                <ApprovedInterns batchNumber={viewBatch.batch_number} batchId={viewBatch.id} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '14px'
                }}>
                  {[
                    ['Total Admins', platformTotals.admins, '👥', '#F0EEFF', '#3D35C4'],
                    ['Total Batches', platformTotals.batches, '🗂️', '#E3F2FD', '#1565C0'],
                    ['Total Students', platformTotals.totalStudents, '🎓', '#E8F5E9', '#2E7D32'],
                    ['Approved Interns', platformTotals.approvedInterns, '✅', '#F3F0FF', '#3D35C4'],
                    ['Active Interns', platformTotals.activeInterns, '🟢', '#E8F5E9', '#2E7D32'],
                    ['Completed', platformTotals.completedInterns, '🏁', '#FFF3E0', '#E65100']
                  ].map(([label, value, icon, bg, color]) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => {
                        if (label === 'Total Admins') {
                          setSelectedAdminFilter('all')
                          setActivePage('admins')
                        }
                      }}
                      style={{
                      background: '#FFFFFF',
                      border: '1px solid #E0E0E0',
                      borderRadius: '14px',
                      padding: '16px',
                      boxShadow: '0 4px 18px rgba(0,0,0,0.035)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                      ,
                      cursor: label === 'Total Admins' ? 'pointer' : 'default',
                      textAlign: 'left',
                      fontFamily: "'Plus Jakarta Sans', sans-serif"
                    }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: bg,
                        color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0
                      }}>
                        {icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#212121', lineHeight: 1 }}>{value}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#757575', textTransform: 'uppercase', letterSpacing: '0.45px', marginTop: '4px' }}>{label}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: dashboardStudentGrid,
                  gap: '16px'
                }}>
                  {[
                    {
                      title: 'Overall Student Data',
                      subtitle: 'All students across Super Admin and every normal admin.',
                      totals: platformTotals,
                      accent: '#3D35C4',
                      bg: 'linear-gradient(135deg, #F3F0FF 0%, #FFFFFF 100%)',
                      icon: '🌐'
                    },
                    {
                      title: 'Super Admin Student Data',
                      subtitle: 'Students inside batches directly owned by Super Admin.',
                      totals: superAdminTotals,
                      accent: '#E65100',
                      bg: 'linear-gradient(135deg, #FFF3E0 0%, #FFFFFF 100%)',
                      icon: '👑'
                    }
                  ].map((section) => (
                    <div key={section.title} style={{
                      background: section.bg,
                      border: `1px solid ${section.accent}22`,
                      borderRadius: '16px',
                      padding: '18px',
                      boxShadow: '0 4px 18px rgba(0,0,0,0.035)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#212121' }}>
                            {section.icon} {section.title}
                          </h3>
                          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#757575' }}>{section.subtitle}</p>
                        </div>
                        <div style={{ fontSize: '30px', fontWeight: 900, color: section.accent, lineHeight: 1 }}>
                          {section.totals.totalStudents}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                        {[
                          ['Batches', section.totals.batches],
                          ['Approved', section.totals.approvedInterns],
                          ['Active', section.totals.activeInterns],
                          ['Completed', section.totals.completedInterns],
                          ['Discontinued', section.totals.discontinuedInterns],
                          ['Students', section.totals.totalStudents]
                        ].map(([label, value]) => (
                          <div key={label} style={{
                            background: '#FFFFFF',
                            border: '1px solid #EEEEEE',
                            borderRadius: '10px',
                            padding: '10px',
                            minWidth: 0
                          }}>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: section.accent, lineHeight: 1 }}>{value}</div>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#757575', textTransform: 'uppercase', letterSpacing: '0.35px', marginTop: '6px' }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E0E0E0',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: normalAdminsGrid,
                  gap: '10px',
                  alignItems: 'center',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.025)'
                }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#212121' }}>Normal Admins Combined</div>
                    <div style={{ fontSize: '12px', color: '#757575', marginTop: '3px' }}>All data excluding Super Admin-owned batches.</div>
                  </div>
                  {[
                    ['Batches', normalAdminTotals.batches],
                    ['Students', normalAdminTotals.totalStudents],
                    ['Approved', normalAdminTotals.approvedInterns],
                    ['Active', normalAdminTotals.activeInterns],
                    ['Completed', normalAdminTotals.completedInterns]
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: '#FAFAFA', borderRadius: '10px', padding: '10px', border: '1px solid #EEEEEE' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#1565C0', lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#757575', textTransform: 'uppercase', marginTop: '6px' }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: dashboardTwoColumnGrid, gap: isDashboardStacked ? '18px' : '24px', alignItems: 'start' }}>
                {/* Left Column */}
                <div ref={dashboardLeftColumnRef} style={{ display: 'flex', flexDirection: 'column', gap: '18px', minHeight: 0 }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: quickActionsGrid, gap: '18px', alignItems: 'stretch' }}>
                  {/* Card 2: Provision New Batch */}
                  <div style={quickActionCardStyle}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#212121', marginBottom: '14px', marginTop: 0 }}>Provision New Batch</h3>
                    <div style={actionStatusSlotStyle}>
                      {batchSuccess ? <div style={actionMessageStyle('success')}>{batchSuccess}</div> : batchError ? <div style={actionMessageStyle('error')}>{batchError}</div> : null}
                    </div>
                    <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Batch Number</label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                              flex: '1 1 150px',
                              minWidth: 0,
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
                          marginTop: 'auto',
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
                  <div style={quickActionCardStyle}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#212121', marginBottom: '14px', marginTop: 0 }}>Create Admin</h3>
                    <div style={actionStatusSlotStyle}>
                      {adminSuccess ? <div style={actionMessageStyle('success')}>{adminSuccess}</div> : adminError ? <div style={actionMessageStyle('error')}>{adminError}</div> : null}
                    </div>
                    <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
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
                          marginTop: 'auto',
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
                </div>

                {/* Right Column: Registered Batches */}
                <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '16px', border: '1px solid #E6E6EF', boxShadow: '0 8px 28px rgba(61,53,196,0.06)', display: 'flex', flexDirection: 'column', minHeight: 0, height: !isDashboardStacked && dashboardRightHeight ? `${dashboardRightHeight}px` : 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#212121', margin: 0 }}>
                          Batch Directory
                        </h3>
                        <span style={{
                          background: '#F3F0FF',
                          color: '#3D35C4',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '5px 10px',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap',
                          border: '1px solid #E2DEFF'
                        }}>
                          {filteredBatches.length} shown • {batches.length} total
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#757575', fontWeight: 500 }}>
                        {selectedAdminFilter === 'all'
                          ? 'All Super Admin and normal-admin batches in one clean view.'
                          : `Showing batches for ${admins.find(admin => admin.id === selectedAdminFilter)?.name || 'selected admin'}.`}
                      </span>
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
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        boxShadow: '0 6px 16px rgba(61,53,196,0.18)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Export All
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search batch or mentor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 14px',
                      border: '1px solid #E6E6EF',
                      borderRadius: '10px',
                      fontSize: '14px',
                      marginBottom: '14px',
                      boxSizing: 'border-box',
                      background: '#FAFAFC',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
                    {filteredBatches.map((batch) => {
                      const isSelected = summaryBatch && summaryBatch.id === batch.id
                      const totalInterns = batch.total_intern_count ?? batch.intern_count ?? 0
                      return (
                        <div
                          key={batch.id}
                          onClick={() => setSummaryBatch(batch)}
                          style={{
                            padding: isSelected ? '13px' : '14px',
                            border: isSelected ? '2px solid #3D35C4' : '1px solid #ECECF3',
                            borderRadius: '14px',
                            background: isSelected ? '#F8F7FF' : '#FFFFFF',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 8px 20px rgba(61,53,196,0.10)' : '0 2px 10px rgba(0,0,0,0.025)'
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
                            <div style={{ minWidth: 0 }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setViewBatch(batch)
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  padding: 0,
                                  fontSize: '18px',
                                  fontWeight: '800',
                                  color: '#24212F',
                                  cursor: 'pointer',
                                  textAlign: 'left'
                                }}
                              >
                                {batch.batch_number}
                              </button>
                              <div style={{ fontSize: '12px', color: '#757575', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {batch.mentor_name || 'Unassigned'}{batch.mentor_email ? ` • ${batch.mentor_email}` : ''}
                              </div>
                            </div>

                            {batch.internship_completed && (
                              <span style={{
                                background: '#E8F5E9', color: '#2E7D32', borderRadius: '999px',
                                padding: '5px 9px', fontSize: '10px', fontWeight: 800,
                                letterSpacing: '0.2px', whiteSpace: 'nowrap',
                                border: '1px solid #C8E6C9'
                              }}>
                                Completed
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

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: '8px'
                          }}>
                            <div style={{ background: '#FAFAFC', border: '1px solid #EEEEF6', borderRadius: '10px', padding: '10px' }}>
                              <div style={{ fontSize: '10px', fontWeight: '800', color: '#8A8A98', textTransform: 'uppercase', letterSpacing: '0.35px' }}>
                                Students
                              </div>
                              <div style={{ fontSize: '20px', fontWeight: '900', color: '#212121', marginTop: '3px', lineHeight: 1 }}>
                                {totalInterns}
                              </div>
                            </div>
                            <div style={{ background: '#F3F0FF', border: '1px solid #E2DEFF', borderRadius: '10px', padding: '10px' }}>
                              <div style={{ fontSize: '10px', fontWeight: '800', color: '#6A62C8', textTransform: 'uppercase', letterSpacing: '0.35px' }}>
                                Approved
                              </div>
                              <div style={{ fontSize: '20px', fontWeight: '900', color: '#3D35C4', marginTop: '3px', lineHeight: 1 }}>
                                {batch.intern_count ?? 0}
                              </div>
                            </div>
                            <div style={{ background: '#F6FBF7', border: '1px solid #DDEFE1', borderRadius: '10px', padding: '10px' }}>
                              <div style={{ fontSize: '10px', fontWeight: '800', color: '#2E7D32', textTransform: 'uppercase', letterSpacing: '0.35px' }}>
                                Progress
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '5px' }}>
                                <span style={{ color: '#2E7D32', fontSize: '12px', fontWeight: '800' }}>
                                  {batch.active_intern_count ?? 0} Active
                                </span>
                                <span style={{ color: '#3D35C4', fontSize: '12px', fontWeight: '800' }}>
                                  {batch.completed_intern_count ?? 0} Completed
                                </span>
                              </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minHeight: 0 }}>
            <div style={{
              background: '#FFFFFF',
              padding: '22px 24px',
              borderRadius: '12px',
              border: '1px solid #E0E0E0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '16px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#212121', margin: 0 }}>Admin Data Overview</h2>
                <p style={{ fontSize: '13px', color: '#757575', margin: '6px 0 0 0' }}>
                  Separate page for viewing each admin’s batches, students, and progress without changing the dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAdminFilter('all')
                  setActivePage('dashboard')
                }}
                style={{
                  background: '#F3F0FF',
                  color: '#3D35C4',
                  border: '1px solid #3D35C4',
                  borderRadius: '8px',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ← Back to Dashboard
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '14px'
            }}>
              {[
                ['Total Admins', platformTotals.admins],
                ['Total Batches', selectedAdminFilter === 'all' ? platformTotals.batches : adminTotals[selectedAdminFilter]?.batches || 0],
                ['Total Students', selectedAdminFilter === 'all' ? platformTotals.totalStudents : adminTotals[selectedAdminFilter]?.totalStudents || 0],
                ['Approved', selectedAdminFilter === 'all' ? platformTotals.approvedInterns : adminTotals[selectedAdminFilter]?.approvedInterns || 0],
                ['Completed', selectedAdminFilter === 'all' ? platformTotals.completedInterns : adminTotals[selectedAdminFilter]?.completedInterns || 0]
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#3D35C4', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#757575', textTransform: 'uppercase', letterSpacing: '0.45px', marginTop: '6px' }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(460px, 1.4fr)', gap: '22px', minHeight: 0 }}>
              <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#212121', margin: 0 }}>Admins</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedAdminFilter('all')}
                    style={{
                      border: 'none',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      background: selectedAdminFilter === 'all' ? '#3D35C4' : '#F5F5F5',
                      color: selectedAdminFilter === 'all' ? '#FFFFFF' : '#616161',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    All Admins
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 285px)', overflowY: 'auto', paddingRight: '3px' }}>
                  {admins.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#757575', padding: '20px' }}>No admins found</div>
                  ) : admins.map((adm) => {
                    const totals = adminTotals[adm.id] || { batches: 0, totalStudents: 0, approvedInterns: 0, completedInterns: 0 }
                    const selected = selectedAdminFilter === adm.id
                    return (
                      <div key={adm.id} style={{
                        border: selected ? '2px solid #3D35C4' : '1px solid #E0E0E0',
                        background: selected ? '#F3F0FF' : '#FAFAFA',
                        borderRadius: '10px',
                        padding: selected ? '13px' : '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <button
                          type="button"
                          onClick={() => setSelectedAdminFilter(adm.id)}
                          style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                        >
                          <h4 style={{ margin: 0, fontSize: '16px', color: '#212121' }}>{adm.name || 'No Name'}</h4>
                          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#757575' }}>{adm.email}</p>
                          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#9E9E9E' }}>
                            Created: {new Date(adm.created_at).toLocaleDateString()}
                          </p>
                        </button>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                          {[
                            ['Batches', totals.batches],
                            ['Students', totals.totalStudents],
                            ['Approved', totals.approvedInterns],
                            ['Done', totals.completedInterns]
                          ].map(([label, value]) => (
                            <div key={label} style={{ background: '#FFFFFF', borderRadius: '8px', padding: '7px', border: '1px solid #EEEEEE' }}>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: '#3D35C4', lineHeight: 1 }}>{value}</div>
                              <div style={{ fontSize: '9px', fontWeight: 700, color: '#9E9E9E', textTransform: 'uppercase', marginTop: '4px' }}>{label}</div>
                            </div>
                          ))}
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
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Delete Admin
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {selectedAdminFilter === 'all' ? (
                <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', minHeight: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#212121', margin: 0 }}>All Admin Batches ({filteredBatches.length})</h3>
                      <p style={{ fontSize: '12px', color: '#757575', margin: '4px 0 0 0' }}>Select an admin on the left to open their full workspace.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportAll}
                      style={{ background: '#3D35C4', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ⬇ Export All
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 'calc(100vh - 290px)', overflowY: 'auto', paddingRight: '3px' }}>
                    {filteredBatches.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#757575', padding: '30px' }}>No batches found.</div>
                    ) : filteredBatches.map((batch) => (
                      <div key={batch.id} style={{ border: '1px solid #EEEEEE', borderRadius: '10px', padding: '14px', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                        <div>
                          <button
                            type="button"
                            onClick={() => setViewBatch(batch)}
                            style={{ border: 'none', background: 'transparent', padding: 0, color: '#3D35C4', fontSize: '18px', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {batch.batch_number}
                          </button>
                          <div style={{ fontSize: '12px', color: '#757575', marginTop: '4px' }}>{batch.mentor_name || 'Unassigned'} • {batch.mentor_email || 'No email'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <span style={{ background: '#FFFFFF', border: '1px solid #EEEEEE', borderRadius: '999px', padding: '5px 9px', fontSize: '11px', fontWeight: 700 }}>{batch.total_intern_count || 0} Students</span>
                          <span style={{ background: '#F0EEFF', color: '#3D35C4', borderRadius: '999px', padding: '5px 9px', fontSize: '11px', fontWeight: 700 }}>{batch.intern_count || 0} Approved</span>
                          <span style={{ background: '#E8F5E9', color: '#2E7D32', borderRadius: '999px', padding: '5px 9px', fontSize: '11px', fontWeight: 700 }}>{batch.completed_intern_count || 0} Completed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ minHeight: 0 }}>
                  <ApprovedInterns
                    adminId={selectedAdminFilter}
                    adminName={admins.find(admin => admin.id === selectedAdminFilter)?.name || 'selected admin'}
                  />
                </div>
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
