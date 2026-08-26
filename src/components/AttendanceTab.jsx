import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Square, 
  Calendar, 
  Users, 
  Layers, 
  Search, 
  Clock, 
  Info,
  Filter,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import ParticipantDetailsModal from './ParticipantDetailsModal';

export default function AttendanceTab({
  activeRetreat,
  registrations = [],
  authorizedEmails = [],
  currentUser
}) {
  // 1. Calculate the 3 retreat day dates & smart auto-default based on today
  const retreatDays = useMemo(() => {
    if (!activeRetreat?.startDate) {
      return [
        { dayIndex: 1, key: 'day1', label: 'Day 1', dateStr: '', shortDate: '' },
        { dayIndex: 2, key: 'day2', label: 'Day 2', dateStr: '', shortDate: '' },
        { dayIndex: 3, key: 'day3', label: 'Day 3', dateStr: '', shortDate: '' }
      ];
    }

    try {
      const [startYear, startMonth, startDay] = activeRetreat.startDate.split('-').map(Number);
      const d1 = new Date(startYear, startMonth - 1, startDay);
      const d2 = new Date(d1); d2.setDate(d1.getDate() + 1);
      const d3 = new Date(d1); d3.setDate(d1.getDate() + 2);

      const formatDate = (d) => d.toISOString().split('T')[0];
      const formatShort = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      return [
        { dayIndex: 1, key: 'day1', label: 'Day 1', dateStr: formatDate(d1), shortDate: formatShort(d1) },
        { dayIndex: 2, key: 'day2', label: 'Day 2', dateStr: formatDate(d2), shortDate: formatShort(d2) },
        { dayIndex: 3, key: 'day3', label: 'Day 3', dateStr: formatDate(d3), shortDate: formatShort(d3) }
      ];
    } catch {
      return [
        { dayIndex: 1, key: 'day1', label: 'Day 1', dateStr: '', shortDate: '' },
        { dayIndex: 2, key: 'day2', label: 'Day 2', dateStr: '', shortDate: '' },
        { dayIndex: 3, key: 'day3', label: 'Day 3', dateStr: '', shortDate: '' }
      ];
    }
  }, [activeRetreat?.startDate]);

  // Determine initial selected day (closest to today)
  const initialDayIndex = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const match = retreatDays.find(d => d.dateStr === todayStr);
    if (match) return match.dayIndex;
    if (retreatDays[0]?.dateStr && todayStr < retreatDays[0].dateStr) return 1;
    if (retreatDays[2]?.dateStr && todayStr > retreatDays[2].dateStr) return 3;
    return 1;
  }, [retreatDays]);

  const [activeDayIndex, setActiveDayIndex] = useState(initialDayIndex);
  useEffect(() => {
    setActiveDayIndex(initialDayIndex);
  }, [initialDayIndex]);

  const activeDayObj = retreatDays[activeDayIndex - 1] || retreatDays[0];
  const activeDayKey = activeDayObj.key;

  // 2. VIEW SWITCHER: "my_group" (default) vs "everyone"
  const [activeView, setActiveView] = useState('my_group');
  const [everyoneGroupFilter, setEveryoneGroupFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectParticipant, setInspectParticipant] = useState(null);

  // Group config from retreat metadata
  const retreatGroupConfig = useMemo(() => activeRetreat?.groupConfig || {}, [activeRetreat?.groupConfig]);
  const numConfiguredGroups = Number(retreatGroupConfig.numGroups) || 4;
  const retreatGroupNames = useMemo(() => retreatGroupConfig.groupNames || {}, [retreatGroupConfig.groupNames]);

  // Find user's assigned group from authorizedEmails or registrations
  const userEmail = (currentUser?.email || '').trim().toLowerCase();
  
  const userAssignedGroupId = useMemo(() => {
    // Check volunteer assignment list in retreat groupConfig
    const volAssignments = retreatGroupConfig.volunteerAssignments || {};
    const directVol = Object.entries(volAssignments).find(([_, vList]) => 
      Array.isArray(vList) && vList.some(vEmail => vEmail.toLowerCase() === userEmail)
    );
    if (directVol) return directVol[0];

    // Check volunteer in authorizedEmails
    const authRecord = authorizedEmails.find(a => (a.email || '').trim().toLowerCase() === userEmail);
    if (authRecord?.assignedGroup && authRecord.assignedGroup !== 'unassigned') {
      return authRecord.assignedGroup;
    }

    // Default fallback to group-1 if volunteer
    return 'group-1';
  }, [retreatGroupConfig, authorizedEmails, userEmail]);

  // 3. Filter approved registrations for this active retreat
  const retreatApprovedParticipants = useMemo(() => {
    if (!activeRetreat?.id) return [];
    
    return registrations.filter(r => {
      const retreatMatches = r.retreatId === activeRetreat.id || (!r.retreatId && activeRetreat.id === 'general');
      const isApproved = r.interviewStatus === 'Approved' || r.status === 'Approved';
      return retreatMatches && isApproved;
    });
  }, [registrations, activeRetreat?.id]);

  // 4. Group members roster list based on active view and group mappings
  const displayRoster = useMemo(() => {
    const groupAssignments = retreatGroupConfig.assignments || {};

    const list = retreatApprovedParticipants.map(r => {
      // Determine participant group assignment
      const assignedGId = r.groupId || groupAssignments[r.id] || groupAssignments[r.email] || 'unassigned';
      const assignedGName = retreatGroupNames[assignedGId] || (assignedGId === 'unassigned' ? 'Unassigned' : `Group ${assignedGId.replace('group-', '')}`);

      return {
        id: r.id,
        name: r.fullName || `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email,
        firstName: r.firstName || '',
        lastName: r.lastName || '',
        email: r.email,
        phone: r.phone || '',
        academicRole: r.academicRole || '',
        feeTier: r.feeTier || '',
        feeAmount: r.feeAmount,
        isPaid: r.isPaid,
        attendance: r.attendance || {},
        groupId: assignedGId,
        assignedGroup: assignedGName,
        isVolunteer: false,
        rawRecord: r
      };
    });

    // Also include assigned volunteers in the group view
    const volAssignments = retreatGroupConfig.volunteerAssignments || {};
    const volunteerMembers = [];

    authorizedEmails.forEach(vol => {
      const vEmail = (vol.email || '').trim().toLowerCase();
      if (!vEmail) return;

      // Determine which group this volunteer belongs to
      let volGId = 'unassigned';
      Object.entries(volAssignments).forEach(([gId, vList]) => {
        if (Array.isArray(vList) && vList.some(email => email.toLowerCase() === vEmail)) {
          volGId = gId;
        }
      });

      if (volGId === 'unassigned' && vol.assignedGroup) {
        volGId = vol.assignedGroup;
      }

      // Check if this volunteer is also a participant to prevent duplicate row
      const isAlreadyIn = list.some(m => m.email.toLowerCase() === vEmail);
      if (!isAlreadyIn) {
        const volGName = retreatGroupNames[volGId] || (volGId === 'unassigned' ? 'Unassigned' : `Group ${volGId.replace('group-', '')}`);
        volunteerMembers.push({
          id: `vol-${vol.id || vEmail}`,
          name: vol.name || vol.displayName || vEmail.split('@')[0],
          firstName: vol.name?.split(' ')[0] || vEmail.split('@')[0],
          lastName: vol.name?.split(' ')[1] || '',
          email: vEmail,
          phone: vol.phone || '',
          academicRole: 'Volunteer Mentor',
          feeTier: 'Staff / Mentor',
          feeAmount: 0,
          isPaid: true,
          attendance: vol.attendance || {},
          groupId: volGId,
          assignedGroup: volGName,
          isVolunteer: true,
          photoURL: vol.photoURL || null,
          rawRecord: vol
        });
      }
    });

    const combinedList = [...list, ...volunteerMembers];

    // Filter by Active View
    let filtered = combinedList;
    if (activeView === 'my_group') {
      filtered = combinedList.filter(m => m.groupId === userAssignedGroupId);
    } else if (activeView === 'everyone' && everyoneGroupFilter !== 'ALL') {
      filtered = combinedList.filter(m => m.groupId === everyoneGroupFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.academicRole.toLowerCase().includes(q)
      );
    }

    // Sort: Volunteers first, then alphabetically by first name
    return filtered.sort((a, b) => {
      if (a.isVolunteer && !b.isVolunteer) return -1;
      if (!a.isVolunteer && b.isVolunteer) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [
    retreatApprovedParticipants, 
    authorizedEmails, 
    retreatGroupConfig, 
    retreatGroupNames, 
    activeView, 
    userAssignedGroupId, 
    everyoneGroupFilter, 
    searchQuery
  ]);

  // 5. Toggle Attendance Action
  const [toastMessage, setToastMessage] = useState(null);

  const handleToggleAttendance = async (member) => {
    const currentAtt = Boolean(member.attendance?.[activeDayKey]);
    const nextAtt = !currentAtt;

    // Optimistically update locally
    const updatedAttendance = {
      ...(member.attendance || {}),
      [activeDayKey]: nextAtt,
      lastUpdated: new Date().toISOString(),
      updatedBy: currentUser?.email || 'facilitator'
    };

    // Calculate total days attended
    const attendedCount = ['day1', 'day2', 'day3'].reduce((acc, k) => {
      const val = k === activeDayKey ? nextAtt : Boolean(member.attendance?.[k]);
      return acc + (val ? 1 : 0);
    }, 0);

    const isGraduated = attendedCount === 3;

    try {
      if (member.isVolunteer) {
        // Save volunteer attendance in authorized_emails or local storage
        if (isFirebaseConfigured && db) {
          const volDocRef = doc(db, 'authorized_emails', member.rawRecord.id || member.email);
          await updateDoc(volDocRef, {
            attendance: updatedAttendance
          });
        }
      } else {
        // Save participant attendance in registrations
        if (isFirebaseConfigured && db && member.id && !member.id.startsWith('vol-')) {
          const regDocRef = doc(db, 'registrations', member.id);
          await updateDoc(regDocRef, {
            attendance: updatedAttendance,
            attendedDaysCount: attendedCount,
            attendanceStatus: isGraduated ? 'Completed' : attendedCount > 0 ? 'In Progress' : 'Registered',
            completed: isGraduated
          });
        }
      }

      // Update local storage backup
      try {
        const savedRegs = JSON.parse(localStorage.getItem('sky_registrations') || '[]');
        const idx = savedRegs.findIndex(r => r.id === member.id || r.email === member.email);
        if (idx !== -1) {
          savedRegs[idx].attendance = updatedAttendance;
          savedRegs[idx].attendedDaysCount = attendedCount;
          savedRegs[idx].attendanceStatus = isGraduated ? 'Completed' : attendedCount > 0 ? 'In Progress' : 'Registered';
          savedRegs[idx].completed = isGraduated;
          localStorage.setItem('sky_registrations', JSON.stringify(savedRegs));
        }
      } catch (err) {
        console.warn("Local storage attendance update error:", err);
      }

      setToastMessage({
        type: 'success',
        text: `${member.name}: ${activeDayObj.label} marked as ${nextAtt ? 'Present (✓)' : 'Absent (—)'}`
      });

      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Attendance toggle error:", err);
      setToastMessage({
        type: 'error',
        text: `Failed to save attendance: ${err.message}`
      });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* TOAST ALERT BANNER */}
      {toastMessage && (
        <div 
          className="animate-fade-in"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: toastMessage.type === 'error' ? '#FEF2F2' : toastMessage.type === 'info' ? '#EFF6FF' : '#DCFCE7',
            border: toastMessage.type === 'error' ? '1px solid #F87171' : toastMessage.type === 'info' ? '1px solid #93C5FD' : '1px solid #86EFAC',
            color: toastMessage.type === 'error' ? '#DC2626' : toastMessage.type === 'info' ? '#1D4ED8' : '#166534',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* TOP HEADER CONTROLS: RETREAT SELECTOR, VIEW SWITCHER & DAY TABS */}
      <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.5rem' }}>
          
          {/* Active Retreat Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 250px' }}>
            <Calendar size={22} color="var(--sky-blue)" />
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
                Target Active Retreat
              </label>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {activeRetreat?.title || 'No Retreat Selected'}
              </div>
            </div>
          </div>

          {/* VIEW SWITCHER: "MY GROUP" vs "EVERYONE" */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#F1F5F9', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setActiveView('my_group')}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeView === 'my_group' ? 'var(--sky-blue)' : 'transparent',
                color: activeView === 'my_group' ? '#FFF' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.2s ease',
                boxShadow: activeView === 'my_group' ? '0 2px 8px rgba(31, 116, 241, 0.3)' : 'none'
              }}
            >
              <Users size={16} />
              My Group
            </button>

            <button
              type="button"
              onClick={() => setActiveView('everyone')}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeView === 'everyone' ? 'var(--sky-blue)' : 'transparent',
                color: activeView === 'everyone' ? '#FFF' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.2s ease',
                boxShadow: activeView === 'everyone' ? '0 2px 8px rgba(31, 116, 241, 0.3)' : 'none'
              }}
            >
              <Layers size={16} />
              Everyone ({retreatApprovedParticipants.length})
            </button>
          </div>

        </div>

        {/* =========================================================================
            3 DAY TABS: DAY 1, DAY 2, DAY 3 (SMART AUTO-DEFAULT CLOSEST DATE)
            ========================================================================= */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1.25rem'
        }}>
          {retreatDays.map(day => {
            const isSelected = day.dayIndex === activeDayIndex;

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setActiveDayIndex(day.dayIndex)}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid var(--sky-blue)' : '1px solid var(--border-color)',
                  background: isSelected ? 'var(--sky-blue-light)' : '#F8FAFC',
                  color: isSelected ? 'var(--sky-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.2rem',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 4px 14px rgba(31, 116, 241, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', fontWeight: 800, color: isSelected ? 'var(--sky-blue)' : 'var(--text-main)' }}>
                  <Clock size={16} />
                  {day.label}
                </div>
                <div style={{ fontSize: '0.78rem', color: isSelected ? 'var(--sky-blue)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {day.shortDate || 'Date TBD'}
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* HEADER BAR FOR ACTIVE VIEW (WITH FILTER IN EVERYONE MODE ONLY) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {activeView === 'my_group' ? (
          /* MY GROUP HEADER */
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--sky-sun)' }} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
              {retreatGroupNames[userAssignedGroupId] || `Group ${userAssignedGroupId.replace('group-', '')}`} Roster
            </h3>
            <span className="badge badge-sun" style={{ fontSize: '0.72rem' }}>
              {displayRoster.length} Members
            </span>
          </div>
        ) : (
          /* EVERYONE HEADER & GROUP FILTER */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Layers size={18} color="var(--sky-blue)" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                Full Retreat Attendance Roster
              </h3>
              <span className="badge badge-sky" style={{ fontSize: '0.72rem' }}>
                {displayRoster.length} Participants
              </span>
            </div>

            {/* Filter by Group Dropdown (ONLY visible in Everyone Mode) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={15} color="var(--text-muted)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter by Group:</span>
              <select
                value={everyoneGroupFilter}
                onChange={(e) => setEveryoneGroupFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                <option value="ALL">All Groups & Unassigned</option>
                {Array.from({ length: numConfiguredGroups }).map((_, i) => {
                  const gId = `group-${i + 1}`;
                  const gName = retreatGroupNames[gId] || `Group ${i + 1}`;
                  return (
                    <option key={gId} value={gId}>
                      {gName}
                    </option>
                  );
                })}
                <option value="unassigned">Unassigned Only</option>
              </select>
            </div>
          </>
        )}

      </div>

      {/* SEARCH BAR */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Filter by participant name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '0.65rem 0.85rem 0.65rem 2.4rem',
            background: '#FFFFFF',
            border: '1px solid rgba(35, 39, 95, 0.15)',
            color: 'var(--text-main)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.88rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* =========================================================================
          ATTENDANCE PARTICIPANT ROSTER LIST (RESPONSIVE & MOBILE-FRIENDLY)
          ========================================================================= */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '0', 
          overflowX: 'auto', 
          WebkitOverflowScrolling: 'touch', 
          borderRadius: 'var(--radius-md)', 
          width: '100%',
          background: '#FFFFFF',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        
        {displayRoster.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '540px', width: '100%' }}>
            
            {/* Table Header Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 2fr) 140px minmax(100px, 1fr) 110px',
              padding: '0.85rem 1.25rem',
              background: '#F8FAFC',
              borderBottom: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <div>Participant</div>
              <div>{activeDayObj.label} Attendance</div>
              <div>Group</div>
              <div style={{ textAlign: 'center' }}>3-Day History</div>
            </div>

            {/* Rows */}
            {displayRoster.map(member => {
              const isPresent = Boolean(member.attendance?.[activeDayKey]);
              const initial = (member.name[0] || 'U').toUpperCase();
              const isVol = member.isVolunteer;

              return (
                <div
                  key={member.id}
                  className="roster-row-hover"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(180px, 2fr) 140px minmax(100px, 1fr) 110px',
                    padding: '0.9rem 1.25rem',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(35, 39, 95, 0.06)',
                    background: isPresent ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {/* Column 1: Avatar, Name, Email, Details Trigger */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, paddingRight: '0.5rem' }}>
                    
                    {/* Avatar */}
                    {member.photoURL ? (
                      <img 
                        src={member.photoURL} 
                        alt={member.name}
                        referrerPolicy="no-referrer"
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: isVol ? '2px solid var(--sky-sun)' : '2px solid var(--sky-blue)',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div 
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: isVol 
                            ? 'var(--sky-sun-light)' 
                            : 'var(--sky-blue-light)',
                          color: isVol ? '#B45309' : 'var(--sky-blue)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}
                      >
                        {initial}
                      </div>
                    )}

                    {/* Name, Role & Details Trigger */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setInspectParticipant(member)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--text-main)',
                            fontWeight: 700,
                            fontSize: '0.92rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                          title="Click to view full participant application details"
                        >
                          <span style={{ textDecoration: 'underline dotted rgba(35, 39, 95, 0.4)' }}>{member.name}</span>
                          <Info size={13} color="var(--text-muted)" />
                        </button>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {member.email} • {member.academicRole || 'Participant'}
                      </div>
                    </div>

                  </div>

                  {/* Column 2: Tactile Attendance Toggle Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleAttendance(member)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.45rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        border: isPresent ? '1px solid #10B981' : '1px solid var(--border-color)',
                        background: isPresent ? '#10B981' : '#FFFFFF',
                        color: isPresent ? '#FFF' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isPresent ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none'
                      }}
                    >
                      {isPresent ? (
                        <>
                          <CheckSquare size={16} color="#FFF" />
                          <span>Present</span>
                        </>
                      ) : (
                        <>
                          <Square size={16} color="var(--text-muted)" />
                          <span>Absent</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Column 3: Assigned Group Badge */}
                  <div>
                    <span 
                      className="badge" 
                      style={{
                        background: member.groupId !== 'unassigned' ? 'var(--sky-blue-light)' : '#F1F5F9',
                        color: member.groupId !== 'unassigned' ? 'var(--sky-blue)' : 'var(--text-muted)',
                        border: member.groupId !== 'unassigned' ? '1px solid rgba(31, 116, 241, 0.3)' : '1px solid var(--border-color)',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      {member.assignedGroup}
                    </span>
                  </div>

                  {/* Column 4: 3-Day History Quick Indicators */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                    {['day1', 'day2', 'day3'].map((dKey, idx) => {
                      const attended = Boolean(member.attendance?.[dKey]);
                      const isCurrentDay = dKey === activeDayKey;

                      return (
                        <div
                          key={dKey}
                          title={`Day ${idx + 1}: ${attended ? 'Present' : 'Absent'}`}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: attended 
                              ? '#DCFCE7' 
                              : '#F1F5F9',
                            color: attended ? '#166534' : 'var(--text-muted)',
                            border: isCurrentDay 
                              ? '1.5px solid var(--sky-blue)' 
                              : attended ? '1px solid #86EFAC' : '1px solid var(--border-color)'
                          }}
                        >
                          {attended ? '✓' : `D${idx + 1}`}
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}

          </div>
        ) : (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              No members found in this roster view
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              {searchQuery ? 'Try clearing your search query filter above.' : 'Approved participants assigned to this group will appear here.'}
            </div>
          </div>
        )}

      </div>

      {/* Participant Details Inspection Modal */}
      {inspectParticipant && (
        <ParticipantDetailsModal
          participant={inspectParticipant}
          groupName={inspectParticipant.assignedGroup}
          isVolunteer={inspectParticipant.isVolunteer}
          onClose={() => setInspectParticipant(null)}
        />
      )}

    </div>
  );
}
