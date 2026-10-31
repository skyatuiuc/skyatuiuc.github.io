import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { doc, setDoc, deleteField } from 'firebase/firestore';
import { useRoster } from '../context/RosterContext';
import {
  Users,
  Layers,
  Sparkles,
  RotateCcw,
  Search,
  Info,
  CheckCircle2,
  AlertCircle,
  Move,
  Calendar,
  Plus,
  Minus,
  X,
  Tag,
  Filter
} from 'lucide-react';
import ParticipantDetailsModal from './ParticipantDetailsModal';
import NametagDownloadModal from './NametagDownloadModal';
import {
  STATUS, STATUS_OPTIONS, getStatus, getDisplayName, getAppliedAtMs, getGroupId, getGroupName, groupIdFor,
  getRoleCategory, ROLE_CATEGORY, matchesSearch
} from '../models/applicant';

// Priority sort: volunteers, then approved, pending, did not reply, uncontacted, withdrawn;
// within a rank, oldest application first.
const STATUS_RANK = {
  [STATUS.VOLUNTEER]: 1,
  [STATUS.APPROVED]: 2,
  [STATUS.PENDING]: 3,
  [STATUS.DID_NOT_REPLY]: 4,
  [STATUS.UNCONTACTED]: 5,
  [STATUS.WITHDRAWN]: 6
};
const getMemberSortRank = (member) => STATUS_RANK[member.status] || 7;

const sortMembers = (members) => [...members].sort((a, b) =>
  getMemberSortRank(a) - getMemberSortRank(b) || a.appliedAtMs - b.appliedAtMs || a.name.localeCompare(b.name)
);

// Member chip colours: Approved green, Withdrawn red, Volunteer status yellow, everyone else blue
const getMemberTheme = (member) => {
  if (member.isVolunteer) {
    return {
      type: 'volunteer',
      bg: 'var(--sky-sun-light)',
      border: '1.5px solid rgba(250, 188, 29, 0.6)',
      avatarBg: 'var(--sky-sun)',
      avatarColor: '#161942',
      textColor: '#B45309',
      hoverShadow: '0 4px 12px rgba(250, 188, 29, 0.3)',
      statusLabel: 'Volunteer'
    };
  }
  if (member.status === STATUS.WITHDRAWN) {
    return {
      type: 'withdrawn',
      bg: '#FEE2E2',
      border: '1.5px solid rgba(239, 68, 68, 0.5)',
      avatarBg: '#DC2626',
      avatarColor: '#FFFFFF',
      textColor: '#991B1B',
      hoverShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
      statusLabel: 'Withdrawn'
    };
  }
  if (member.status === STATUS.APPROVED) {
    return {
      type: 'approved',
      bg: '#DCFCE7',
      border: '1.5px solid rgba(34, 197, 94, 0.5)',
      avatarBg: '#16A34A',
      avatarColor: '#FFFFFF',
      textColor: '#166534',
      hoverShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
      statusLabel: 'Approved'
    };
  }
  return {
    type: 'pending',
    bg: '#DBEAFE',
    border: '1.5px solid rgba(59, 130, 246, 0.5)',
    avatarBg: '#1F74F1',
    avatarColor: '#FFFFFF',
    textColor: '#1E40AF',
    hoverShadow: '0 4px 12px rgba(31, 116, 241, 0.3)',
    statusLabel: member.status
  };
};

// Auto-arrange "role" choices map onto the shared role categories (exact, not substring matches)
const AUTO_ARRANGE_ROLE_CATEGORIES = {
  undergraduate: [ROLE_CATEGORY.UNDERGRADUATE],
  graduate: [ROLE_CATEGORY.GRADUATE],
  faculty: [ROLE_CATEGORY.FACULTY, ROLE_CATEGORY.SCHOLAR]
};

export default function GroupAssignmentTab() {
  const { activeRetreat, registrations: retreatAllApplicants, updateRegistrations } = useRoster();

  // Number of groups N (min 1, max 20, default 4 or from retreat config)
  const [numGroups, setNumGroups] = useState(() => activeRetreat?.groupConfig?.numGroups || 4);

  // Custom Group Names map: { 'group-1': 'Lotus', ... } (draft while typing; saved on blur)
  const [groupNames, setGroupNames] = useState(() => activeRetreat?.groupConfig?.groupNames || {});

  // Multi-Select Application Status Filter & Volunteers Visibility (the Volunteer status has its own pill)
  const [selectedStatuses, setSelectedStatuses] = useState(() => new Set([STATUS.APPROVED]));
  const [showVolunteers, setShowVolunteers] = useState(true);

  // Role-based Auto-Arrangement Settings
  const [autoArrangeRole, setAutoArrangeRole] = useState('participants'); // 'participants' | 'volunteers' | 'all' | 'undergraduate' | 'graduate' | 'faculty'
  const [autoArrangeOnlyUnassigned, setAutoArrangeOnlyUnassigned] = useState(false);

  // UI Search & Drag state
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedChip, setDraggedChip] = useState(null);
  const [activeDropZone, setActiveDropZone] = useState(null);
  const [inspectParticipant, setInspectParticipant] = useState(null);
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [showNametagModal, setShowNametagModal] = useState(false);

  // Sync retreat group config when the active retreat (or its saved config) changes
  useEffect(() => {
    setNumGroups(activeRetreat?.groupConfig?.numGroups || 4);
    setGroupNames(activeRetreat?.groupConfig?.groupNames || {});
  }, [activeRetreat?.id, activeRetreat?.groupConfig?.numGroups, activeRetreat?.groupConfig?.groupNames]);

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage({ type: '', text: '' });
    }, 3500);
  };

  // Retreat view with this screen's (possibly unsaved) group count/names applied
  const retreatView = useMemo(() => ({
    ...activeRetreat,
    groupConfig: { ...(activeRetreat?.groupConfig || {}), numGroups, groupNames }
  }), [activeRetreat, numGroups, groupNames]);

  // Status counts across all retreat applicants
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUS_OPTIONS.map(s => [s, 0]));
    retreatAllApplicants.forEach((reg) => { counts[getStatus(reg)] += 1; });
    return { counts, volCount: counts[STATUS.VOLUNTEER] };
  }, [retreatAllApplicants]);

  // Status toggle handlers
  const handleToggleStatus = (statusName) => {
    setSelectedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(statusName)) next.delete(statusName);
      else next.add(statusName);
      return next;
    });
  };

  const handleSelectAllStatuses = () => {
    setSelectedStatuses(new Set(STATUS_OPTIONS));
    setShowVolunteers(true);
  };

  const handleSelectApprovedOnly = () => {
    setSelectedStatuses(new Set([STATUS.APPROVED]));
    setShowVolunteers(true);
  };

  const handleClearStatuses = () => {
    setSelectedStatuses(new Set());
    setShowVolunteers(false);
  };

  // Manageable members: retreat applicants matching the selected statuses (+ volunteers if shown)
  const allManageableMembers = useMemo(() => retreatAllApplicants
    .filter((reg) => {
      const status = getStatus(reg);
      return status === STATUS.VOLUNTEER ? showVolunteers : selectedStatuses.has(status);
    })
    .map((reg) => {
      const groupId = getGroupId(reg, retreatView);
      return {
        id: reg.id,
        regId: reg.id,
        email: reg.email,
        name: getDisplayName(reg),
        photoURL: null,
        academicRole: reg.academicRole,
        status: getStatus(reg),
        appliedAtMs: getAppliedAtMs(reg),
        isVolunteer: getStatus(reg) === STATUS.VOLUNTEER,
        groupId: groupId || 'unassigned',
        assignedGroup: groupId ? getGroupName(groupId, retreatView) : '',
        rawRecord: reg
      };
    }), [retreatAllApplicants, selectedStatuses, showVolunteers, retreatView]);

  // Filtered members based on search query, sorted by rank
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? allManageableMembers.filter(m => matchesSearch(m.rawRecord, q) || m.status.toLowerCase().includes(q))
      : allManageableMembers;
    return sortMembers(list);
  }, [allManageableMembers, searchQuery]);

  // Group buckets: 1 to N with sorted members
  const groupList = useMemo(() => {
    const list = [];
    for (let i = 1; i <= numGroups; i++) {
      const gId = groupIdFor(i);
      const membersInGroup = filteredMembers.filter(m => m.groupId === gId);
      list.push({
        id: gId,
        index: i,
        name: groupNames[gId] ?? '',
        label: getGroupName(gId, retreatView),
        members: membersInGroup,
        participantCount: membersInGroup.filter(m => !m.isVolunteer).length,
        volunteerCount: membersInGroup.filter(m => m.isVolunteer).length,
        totalCount: membersInGroup.length
      });
    }
    return list;
  }, [numGroups, groupNames, filteredMembers, retreatView]);

  const unassignedMembers = useMemo(() => filteredMembers.filter(m => m.groupId === 'unassigned'), [filteredMembers]);

  // Save group config to the retreat document
  const persistRetreatGroupConfig = async (newNumGroups, newGroupNames) => {
    if (!activeRetreat?.id || activeRetreat.isGeneral) return;
    try {
      await setDoc(doc(db, 'retreat_history', activeRetreat.id), {
        groupConfig: {
          numGroups: newNumGroups,
          groupNames: newGroupNames,
          lastUpdated: new Date().toISOString()
        }
      }, { merge: true });
    } catch (err) {
      console.warn('Error saving group config to Firestore:', err);
      showToast('error', `Could not save group settings: ${err.code || err.message}`);
    }
  };

  // Set many registrations' group in one atomic batch
  const saveGroupAssignments = async (groupIdById) => {
    const updates = {};
    Object.entries(groupIdById).forEach(([id, gId]) => {
      updates[id] = { groupId: gId === 'unassigned' ? deleteField() : gId };
    });
    await updateRegistrations(updates);
  };

  // Change Number of Groups N & unassign people in removed groups
  const handleNumGroupsChange = async (nextN) => {
    const validN = Math.max(1, Math.min(20, nextN));
    if (validN === numGroups) return;

    const overflow = retreatAllApplicants.filter(r => (Number(String(r.groupId || '').replace('group-', '')) || 0) > validN);
    try {
      if (overflow.length > 0) {
        await saveGroupAssignments(Object.fromEntries(overflow.map(r => [r.id, 'unassigned'])));
        showToast('info', `Reduced to ${validN} groups. Unassigned ${overflow.length} members from removed groups.`);
      }
      setNumGroups(validN);
      await persistRetreatGroupConfig(validN, groupNames);
    } catch (err) {
      showToast('error', `Could not change group count: ${err.code || err.message}`);
    }
  };

  // Move single member to a group or unassign
  const handleAssignMemberToGroup = async (member, targetGroupId) => {
    const isUnassigning = targetGroupId === 'unassigned';
    try {
      await saveGroupAssignments({ [member.regId]: targetGroupId });
      showToast('success', `Moved ${member.name} to ${isUnassigning ? 'Unassigned' : getGroupName(targetGroupId, retreatView)}`);
    } catch (err) {
      showToast('error', `Could not move ${member.name}: ${err.code || err.message}`);
    }
  };

  // Auto-Arrange selected members into the groups with the FEWEST total members, oldest applicants first
  const handleAutoArrange = async () => {
    if (!activeRetreat || activeRetreat.isGeneral) {
      showToast('error', 'Please select a scheduled retreat first.');
      return;
    }

    const roleCategories = AUTO_ARRANGE_ROLE_CATEGORIES[autoArrangeRole];
    const candidateMembers = allManageableMembers.filter((m) => {
      if (autoArrangeRole === 'volunteers' && !m.isVolunteer) return false;
      if (autoArrangeRole === 'participants' && m.isVolunteer) return false;
      if (roleCategories && !roleCategories.includes(getRoleCategory(m.rawRecord))) return false;
      if (autoArrangeOnlyUnassigned && m.groupId !== 'unassigned') return false;
      return true;
    });

    if (candidateMembers.length === 0) {
      const roleName = autoArrangeRole === 'participants' ? 'non-volunteer participants' : autoArrangeRole === 'volunteers' ? 'volunteers' : `${autoArrangeRole} members`;
      showToast('error', `No matching ${roleName} found to auto-arrange.`);
      return;
    }

    setIsAutoAssigning(true);

    // Count members already placed that are NOT being re-arranged
    const candidateIds = new Set(candidateMembers.map(m => m.id));
    const groupMemberCounts = {};
    for (let i = 1; i <= numGroups; i++) groupMemberCounts[groupIdFor(i)] = 0;
    allManageableMembers.forEach((m) => {
      if (!candidateIds.has(m.id) && groupMemberCounts[m.groupId] !== undefined) groupMemberCounts[m.groupId]++;
    });

    const sortedCandidates = [...candidateMembers].sort((a, b) => a.appliedAtMs - b.appliedAtMs || a.name.localeCompare(b.name));
    const assignments = {};
    sortedCandidates.forEach((p) => {
      let targetGroupId = groupIdFor(1);
      for (let i = 1; i <= numGroups; i++) {
        if (groupMemberCounts[groupIdFor(i)] < groupMemberCounts[targetGroupId]) targetGroupId = groupIdFor(i);
      }
      groupMemberCounts[targetGroupId]++;
      assignments[p.id] = targetGroupId;
    });

    try {
      await saveGroupAssignments(assignments);
      await persistRetreatGroupConfig(numGroups, groupNames);
      const roleLabel = autoArrangeRole === 'participants' ? 'participants' : autoArrangeRole === 'volunteers' ? 'volunteers' : 'members';
      showToast('success', `Balanced & arranged ${sortedCandidates.length} ${roleLabel} across ${numGroups} groups by fewest total participants!`);
    } catch (err) {
      showToast('error', `Auto-arrange failed (no changes saved): ${err.code || err.message}`);
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // Clear a single group (unassign all of its members in one batch)
  const handleClearGroup = async (groupId, groupTitle) => {
    const memberIds = retreatAllApplicants.filter(r => r.groupId === groupId).map(r => r.id);
    if (memberIds.length === 0) {
      showToast('info', 'Group is already empty.');
      return;
    }
    if (!window.confirm(`Unassign all ${memberIds.length} members from ${groupTitle || groupId}?`)) return;
    try {
      await saveGroupAssignments(Object.fromEntries(memberIds.map(id => [id, 'unassigned'])));
      showToast('info', `Unassigned all ${memberIds.length} members from ${groupTitle || groupId}.`);
    } catch (err) {
      showToast('error', `Could not clear group: ${err.code || err.message}`);
    }
  };

  // Unassign everyone in this retreat in one batch
  const handleResetAll = async () => {
    const assignedIds = retreatAllApplicants.filter(r => r.groupId).map(r => r.id);
    if (assignedIds.length === 0) {
      showToast('info', 'No members are currently assigned.');
      return;
    }
    if (!window.confirm(`Are you sure you want to unassign all ${assignedIds.length} members for this retreat?`)) return;
    try {
      await saveGroupAssignments(Object.fromEntries(assignedIds.map(id => [id, 'unassigned'])));
      showToast('info', `Unassigned all ${assignedIds.length} members.`);
    } catch (err) {
      showToast('error', `Could not reset groups: ${err.code || err.message}`);
    }
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e, member) => {
    setDraggedChip(member);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: member.id, email: member.email, name: member.name }));
  };

  const handleDragEnd = () => {
    setDraggedChip(null);
    setActiveDropZone(null);
  };

  const handleDragOver = (e, dropZoneId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropZone !== dropZoneId) {
      setActiveDropZone(dropZoneId);
    }
  };

  const handleDragLeave = (e, dropZoneId) => {
    if (activeDropZone === dropZoneId) {
      setActiveDropZone(null);
    }
  };

  const handleDrop = (e, targetGroupId) => {
    e.preventDefault();
    setActiveDropZone(null);
    if (!draggedChip) return;
    if (draggedChip.groupId !== targetGroupId) {
      handleAssignMemberToGroup(draggedChip, targetGroupId);
    }
    setDraggedChip(null);
  };

  // Group names: edited locally while typing, saved once on blur / Enter
  const handleGroupNameChange = (gId, newName) => {
    setGroupNames(prev => ({ ...prev, [gId]: newName }));
  };

  const handleGroupNameCommit = () => {
    const cleaned = Object.fromEntries(Object.entries(groupNames).map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v));
    const saved = activeRetreat?.groupConfig?.groupNames || {};
    if (JSON.stringify(cleaned) === JSON.stringify(saved)) return;
    persistRetreatGroupConfig(numGroups, cleaned);
  };

  // Clean, Concise Chip Renderer with Color Theming
  const renderMemberChip = (member) => {
    const theme = getMemberTheme(member);
    const initial = (member.name[0] || 'U').toUpperCase();

    return (
      <div
        key={member.id}
        draggable={true}
        onDragStart={(e) => handleDragStart(e, member)}
        onDragEnd={handleDragEnd}
        className="animate-fade-in"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.65rem',
          borderRadius: 'var(--radius-full)',
          background: theme.bg,
          border: theme.border,
          boxShadow: 'var(--shadow-sm)',
          cursor: 'grab',
          userSelect: 'none',
          transition: 'all 0.15s ease',
          maxWidth: '100%'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.boxShadow = theme.hoverShadow;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }}
      >
        {/* Avatar / Profile Picture */}
        {member.photoURL ? (
          <img 
            src={member.photoURL} 
            alt={member.name}
            referrerPolicy="no-referrer"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `1.5px solid ${theme.avatarBg}`,
              flexShrink: 0
            }}
          />
        ) : (
          <div 
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: theme.avatarBg,
              color: theme.avatarColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 800,
              flexShrink: 0
            }}
          >
            {initial}
          </div>
        )}

        {/* Member Name */}
        <span 
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: theme.textColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '140px'
          }}
          title={`${member.name} (${member.email}) • Status: ${theme.statusLabel} • Role: ${member.academicRole || (member.isVolunteer ? 'Volunteer' : 'Participant')}`}
        >
          {member.name}
        </span>

        {/* Concise Status Tag */}
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '0.1rem 0.35rem',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.7)',
            color: theme.textColor,
            border: `1px solid ${theme.textColor}33`,
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            flexShrink: 0
          }}
        >
          {theme.statusLabel}
        </span>

        {/* Details Inspection Info Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInspectParticipant(member);
          }}
          title="Click to view full application details"
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.textColor,
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '50%',
            transition: 'opacity 0.15s ease',
            opacity: 0.8
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
        >
          <Info size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Toast Notification */}
      {toastMessage.text && (
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

      {/* TOP CONTROL BAR: RETREAT SELECTOR, N GROUPS INPUT, AUTO-ARRANGE & RESET BUTTONS */}
      <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          
          {/* Active Retreat Event Info */}
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

          {/* Group Count N Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#F8FAFC', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Number of Groups (N)
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--sky-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="var(--sky-blue)" />
                {numGroups} Groups
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => handleNumGroupsChange(numGroups - 1)}
                disabled={numGroups <= 1}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: 'var(--radius-sm)',
                  background: numGroups <= 1 ? '#F1F5F9' : '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  color: numGroups <= 1 ? 'var(--text-muted)' : 'var(--text-main)',
                  cursor: numGroups <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
                title="Decrease number of groups (overflow members will be automatically unassigned)"
              >
                <Minus size={14} />
              </button>

              <input
                type="number"
                min="1"
                max="20"
                value={numGroups}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  handleNumGroupsChange(val);
                }}
                style={{
                  width: '46px',
                  padding: '0.35rem',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  fontWeight: 700
                }}
              />

              <button
                type="button"
                onClick={() => handleNumGroupsChange(numGroups + 1)}
                disabled={numGroups >= 20}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: 'var(--radius-sm)',
                  background: numGroups >= 20 ? '#F1F5F9' : '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  color: numGroups >= 20 ? 'var(--text-muted)' : 'var(--text-main)',
                  cursor: numGroups >= 20 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
                title="Increase number of groups"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Action Buttons: Print Nametags, Role-based Auto-Arrange & Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowNametagModal(true)}
              style={{
                padding: '0.65rem 1.15rem',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                boxShadow: 'var(--shadow-sm)'
              }}
              title="Generate printable PDF nametag sheets for this retreat"
            >
              <Tag size={16} />
              Print Nametag Sheets
            </button>

            {/* Auto-Arrange Role Selector & Execution Button */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#F1F5F9',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              gap: '0.35rem',
              flexWrap: 'wrap'
            }}>
              <select
                value={autoArrangeRole}
                onChange={(e) => setAutoArrangeRole(e.target.value)}
                style={{
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid rgba(35, 39, 95, 0.15)',
                  borderRadius: 'var(--radius-sm)',
                  background: '#FFFFFF',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
                title="Select which role type to balance across groups"
              >
                <option value="participants">Participants (Non-Volunteers)</option>
                <option value="volunteers">Volunteers Only</option>
                <option value="all">All Roles (Everyone)</option>
                <optgroup label="Academic Roles">
                  <option value="undergraduate">Undergraduate Students</option>
                  <option value="graduate">Graduate Students</option>
                  <option value="faculty">Faculty / Staff</option>
                </optgroup>
              </select>

              <label 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0 0.35rem',
                  userSelect: 'none'
                }}
                title="Only assign currently unassigned members, keeping already assigned members in their groups"
              >
                <input
                  type="checkbox"
                  checked={autoArrangeOnlyUnassigned}
                  onChange={(e) => setAutoArrangeOnlyUnassigned(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--sky-blue)' }}
                />
                Unassigned Only
              </label>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAutoArrange}
                disabled={isAutoAssigning}
                style={{
                  padding: '0.55rem 1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                title="Sequentially assigns selected role into the group with fewest total participants"
              >
                <Sparkles size={15} />
                {isAutoAssigning ? 'Arranging...' : 'Auto-Arrange'}
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetAll}
              style={{
                padding: '0.65rem 1rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Reset all assignments"
            >
              <RotateCcw size={14} />
              Reset All
            </button>
          </div>

        </div>

      </div>

      {/* MULTI-SELECT APPLICATION STATUS FILTER BAR */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1rem 1.25rem', 
          background: '#FFFFFF', 
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} color="var(--sky-blue)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Filter Application Statuses:
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({allManageableMembers.length} displayed of {retreatAllApplicants.length} applicants)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={handleSelectAllStatuses}
              style={{
                background: '#F1F5F9',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.6rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleSelectApprovedOnly}
              style={{
                background: '#DCFCE7',
                border: '1px solid #86EFAC',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.6rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#166534',
                cursor: 'pointer'
              }}
            >
              Approved Only
            </button>
            <button
              type="button"
              onClick={handleClearStatuses}
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.6rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#DC2626',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Filter Pills with Checkboxes & Color Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          
          {/* Approved Pill (Green) */}
          <label 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: selectedStatuses.has('Approved') ? '#DCFCE7' : '#F8FAFC',
              border: selectedStatuses.has('Approved') ? '1.5px solid #86EFAC' : '1px solid var(--border-color)',
              color: selectedStatuses.has('Approved') ? '#166534' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              userSelect: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              checked={selectedStatuses.has('Approved')}
              onChange={() => handleToggleStatus('Approved')}
              style={{ accentColor: '#16A34A', cursor: 'pointer' }}
            />
            <span>Approved / Accepted</span>
            <span style={{
              background: selectedStatuses.has('Approved') ? '#BBF7D0' : '#E2E8F0',
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem'
            }}>
              {statusCounts.counts['Approved'] || 0}
            </span>
          </label>

          {/* Volunteers Pill (Current Yellow) */}
          <label 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: showVolunteers ? 'var(--sky-sun-light)' : '#F8FAFC',
              border: showVolunteers ? '1.5px solid rgba(250, 188, 29, 0.6)' : '1px solid var(--border-color)',
              color: showVolunteers ? '#B45309' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              userSelect: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              checked={showVolunteers}
              onChange={() => setShowVolunteers(prev => !prev)}
              style={{ accentColor: '#FABC1D', cursor: 'pointer' }}
            />
            <span>Volunteers</span>
            <span style={{
              background: showVolunteers ? 'rgba(250, 188, 29, 0.3)' : '#E2E8F0',
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem'
            }}>
              {statusCounts.volCount}
            </span>
          </label>

          {/* Pending Pill (Blue) */}
          <label 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: selectedStatuses.has('Pending') ? '#DBEAFE' : '#F8FAFC',
              border: selectedStatuses.has('Pending') ? '1.5px solid #93C5FD' : '1px solid var(--border-color)',
              color: selectedStatuses.has('Pending') ? '#1E40AF' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              userSelect: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              checked={selectedStatuses.has('Pending')}
              onChange={() => handleToggleStatus('Pending')}
              style={{ accentColor: '#1F74F1', cursor: 'pointer' }}
            />
            <span>Pending</span>
            <span style={{
              background: selectedStatuses.has('Pending') ? '#BFDBFE' : '#E2E8F0',
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem'
            }}>
              {statusCounts.counts['Pending'] || 0}
            </span>
          </label>

          {/* Did Not Reply Pill (Blue) */}
          <label 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: selectedStatuses.has('Did Not Reply') ? '#DBEAFE' : '#F8FAFC',
              border: selectedStatuses.has('Did Not Reply') ? '1.5px solid #93C5FD' : '1px solid var(--border-color)',
              color: selectedStatuses.has('Did Not Reply') ? '#1E40AF' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              userSelect: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              checked={selectedStatuses.has('Did Not Reply')}
              onChange={() => handleToggleStatus('Did Not Reply')}
              style={{ accentColor: '#1F74F1', cursor: 'pointer' }}
            />
            <span>Did Not Reply</span>
            <span style={{
              background: selectedStatuses.has('Did Not Reply') ? '#BFDBFE' : '#E2E8F0',
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem'
            }}>
              {statusCounts.counts['Did Not Reply'] || 0}
            </span>
          </label>

          {/* Uncontacted Pill (Blue) */}
          <label 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: selectedStatuses.has('Uncontacted') ? '#DBEAFE' : '#F8FAFC',
              border: selectedStatuses.has('Uncontacted') ? '1.5px solid #93C5FD' : '1px solid var(--border-color)',
              color: selectedStatuses.has('Uncontacted') ? '#1E40AF' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              userSelect: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              checked={selectedStatuses.has('Uncontacted')}
              onChange={() => handleToggleStatus('Uncontacted')}
              style={{ accentColor: '#1F74F1', cursor: 'pointer' }}
            />
            <span>Uncontacted</span>
            <span style={{
              background: selectedStatuses.has('Uncontacted') ? '#BFDBFE' : '#E2E8F0',
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem'
            }}>
              {statusCounts.counts['Uncontacted'] || 0}
            </span>
          </label>

          {/* Withdrawn Pill (Red) */}
          <label 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: selectedStatuses.has('Withdrawn') ? '#FEE2E2' : '#F8FAFC',
              border: selectedStatuses.has('Withdrawn') ? '1.5px solid #FCA5A5' : '1px solid var(--border-color)',
              color: selectedStatuses.has('Withdrawn') ? '#991B1B' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              userSelect: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              checked={selectedStatuses.has('Withdrawn')}
              onChange={() => handleToggleStatus('Withdrawn')}
              style={{ accentColor: '#DC2626', cursor: 'pointer' }}
            />
            <span>Withdrawn</span>
            <span style={{
              background: selectedStatuses.has('Withdrawn') ? '#FECACA' : '#E2E8F0',
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem'
            }}>
              {statusCounts.counts['Withdrawn'] || 0}
            </span>
          </label>

        </div>
      </div>

      {/* QUICK SEARCH & ROSTER METRICS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search applicants by name, email, role, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem 0.6rem 2.4rem',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--sky-blue)' }} />
            Participants: <strong style={{ color: 'var(--text-main)' }}>{allManageableMembers.filter(m => !m.isVolunteer).length}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--sky-sun)' }} />
            Volunteers: <strong style={{ color: '#B45309' }}>{allManageableMembers.filter(m => m.isVolunteer).length}</strong>
          </span>
        </div>
      </div>

      {/* =========================================================================
          PANEL 1: UNASSIGNED PARTICIPANTS & VOLUNTEERS (ALWAYS VISIBLE & SCROLLABLE)
          ========================================================================= */}
      <div 
        className="glass-card"
        onDragOver={(e) => handleDragOver(e, 'unassigned')}
        onDragLeave={(e) => handleDragLeave(e, 'unassigned')}
        onDrop={(e) => handleDrop(e, 'unassigned')}
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          border: activeDropZone === 'unassigned' 
            ? '2px dashed var(--sky-blue)' 
            : '1px solid var(--border-color)',
          background: activeDropZone === 'unassigned' 
            ? 'var(--sky-blue-light)' 
            : '#FFFFFF',
          transition: 'all 0.2s ease',
          boxShadow: activeDropZone === 'unassigned' ? '0 0 20px rgba(31, 116, 241, 0.2)' : 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={18} color="var(--sky-blue)" />
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Unassigned Pool
              <span className="badge" style={{
                background: unassignedMembers.length > 0 ? '#FFEDD5' : '#DCFCE7',
                color: unassignedMembers.length > 0 ? '#C2410C' : '#166534',
                border: unassignedMembers.length > 0 ? '1px solid #FDBA74' : '1px solid #86EFAC',
                fontSize: '0.75rem'
              }}>
                {unassignedMembers.length} Unassigned
              </span>
            </h4>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Drag chips here to unassign, or drag to any group below
          </span>
        </div>

        {/* Scrollable Container for Unassigned Chips */}
        <div 
          style={{
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '0.75rem',
            background: '#F8FAFC',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.6rem',
            alignContent: 'flex-start',
            minHeight: '80px'
          }}
        >
          {unassignedMembers.length > 0 ? (
            unassignedMembers.map(member => renderMemberChip(member))
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '70px', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              {searchQuery ? 'No matching unassigned members.' : '🎉 All approved applicants have been assigned to groups!'}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          PANEL 2: ASSIGNED GROUPS (ALWAYS VISIBLE & SCROLLABLE GRID OF GROUP PANELS)
          ========================================================================= */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--sky-blue)" />
            Assigned Retreat Groups ({numGroups})
          </h4>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Drop chips into group panels below to assign members
          </span>
        </div>

        {/* Scrollable Container with Grid of Group Cards */}
        <div 
          style={{
            maxHeight: '520px',
            overflowY: 'auto',
            paddingRight: '0.4rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '1.25rem'
          }}
        >
          {groupList.map(group => {
            const isDropTarget = activeDropZone === group.id;

            return (
              <div
                key={group.id}
                onDragOver={(e) => handleDragOver(e, group.id)}
                onDragLeave={(e) => handleDragLeave(e, group.id)}
                onDrop={(e) => handleDrop(e, group.id)}
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  background: isDropTarget 
                    ? 'var(--sky-sun-light)' 
                    : '#FFFFFF',
                  border: isDropTarget 
                    ? '2px dashed var(--sky-sun)' 
                    : '1px solid var(--border-color)',
                  boxShadow: isDropTarget 
                    ? '0 0 20px rgba(250, 188, 29, 0.25)' 
                    : 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                  minHeight: '260px'
                }}
              >
                {/* Group Card Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
                  
                  {/* Editable Group ID / Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--sky-sun)' }} />
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => handleGroupNameChange(group.id, e.target.value)}
                      onBlur={handleGroupNameCommit}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      placeholder={`Group ${group.index}`}
                      title="Click to edit group name"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px dashed rgba(35, 39, 95, 0.3)',
                        color: 'var(--text-main)',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.25rem',
                        outline: 'none',
                        width: '75%'
                      }}
                    />
                  </div>

                  {/* Total Participants Count & Clear Group Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                    
                    {/* Total participant count visible next to the clear button */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        background: group.members.length > 0 ? '#EFF6FF' : '#F1F5F9',
                        color: group.members.length > 0 ? '#1D4ED8' : 'var(--text-muted)',
                        border: group.members.length > 0 ? '1px solid #BFDBFE' : '1px solid var(--border-color)',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                      title={`Total participants in ${group.label}: ${group.members.length} (${group.participantCount} participants, ${group.volunteerCount} volunteers)`}
                    >
                      <Users size={12} />
                      <span>{group.members.length}</span>
                    </div>

                    {/* Clear Group Button at Top Right of Group Card */}
                    {group.members.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearGroup(group.id, group.label)}
                        style={{
                          background: '#FEF2F2',
                          border: '1px solid #FCA5A5',
                          color: '#DC2626',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.55rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontWeight: 600,
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                        title={`Unassign all ${group.members.length} members from ${group.label}`}
                      >
                        <RotateCcw size={11} /> Clear
                      </button>
                    )}
                  </div>

                </div>

                {/* Inside Group: Scrollable Chip Area & Drop Zone */}
                <div 
                  style={{
                    flex: 1,
                    minHeight: '140px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '0.75rem',
                    background: '#F8FAFC',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignContent: 'flex-start'
                  }}
                >
                  {group.members.length > 0 ? (
                    group.members.map(member => renderMemberChip(member))
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '120px', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                      <Move size={20} style={{ marginBottom: '0.35rem', opacity: 0.5 }} />
                      <span>Drag participants or volunteers here</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Participant Details Inspection Modal */}
      {inspectParticipant && (
        <ParticipantDetailsModal
          participant={inspectParticipant.rawRecord}
          groupName={inspectParticipant.assignedGroup}
          onClose={() => setInspectParticipant(null)}
        />
      )}

      {/* Printable Nametag Sheets Generation Modal */}
      <NametagDownloadModal
        isOpen={showNametagModal}
        onClose={() => setShowNametagModal(false)}
        activeRetreat={activeRetreat}
        allApplicants={retreatAllApplicants}
        groupNames={groupNames}
        db={db}
      />

    </div>
  );
}
