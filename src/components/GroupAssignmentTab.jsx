import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, isFirebaseConfigured } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { logDatabaseOperation } from '../services/telemetryService';
import { ADMIN_EMAIL } from '../context/AuthContext';
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

// Normalize status into consistent category
const normalizeStatusKey = (reg) => {
  const raw = (reg.orientationStatus || reg.interviewStatus || reg.status || 'Uncontacted').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('approved') || lower.includes('accept')) return 'Approved';
  if (lower.includes('withdraw')) return 'Withdrawn';
  if (lower.includes('progress')) return 'In Progress';
  if (lower.includes('did not reply') || lower.includes('no reply')) return 'Did Not Reply';
  if (lower.includes('pending')) return 'Pending';
  if (lower.includes('uncontacted')) return 'Uncontacted';
  return raw || 'Uncontacted';
};

// Priority Sort Rank:
// 1. Volunteers appear first
// 2. Then accepted / approved
// 3. Then in progress
// 4. Then pending
// 5. Then did not reply
// 6. Then uncontacted
// 7. Then withdrawn
const getMemberSortRank = (member) => {
  if (member.isVolunteer) return 1;
  const rawStatus = (member.orientationStatus || member.interviewStatus || member.status || '').toLowerCase().trim();
  if (rawStatus.includes('approved') || rawStatus.includes('accept')) return 2;
  if (rawStatus.includes('progress')) return 3;
  if (rawStatus.includes('pending')) return 4;
  if (rawStatus.includes('did not reply') || rawStatus.includes('no reply')) return 5;
  if (rawStatus.includes('uncontacted')) return 6;
  if (rawStatus.includes('withdraw')) return 7;
  return 8;
};

// Sort members by rank, then application timestamp, then name
const sortMembers = (members) => {
  return [...members].sort((a, b) => {
    const rankA = getMemberSortRank(a);
    const rankB = getMemberSortRank(b);
    if (rankA !== rankB) return rankA - rankB;

    const timeA = new Date(a.submittedAt || a.registeredAt || 0).getTime();
    const timeB = new Date(b.submittedAt || b.registeredAt || 0).getTime();
    if (timeA && timeB && timeA !== timeB) {
      return timeA - timeB;
    }
    return (a.name || '').localeCompare(b.name || '');
  });
};

// Member chip color theming based on user specifications:
// - Approved: Green
// - Withdrawn: Red
// - Volunteers: Current Yellow
// - Pending / In Progress / Did Not Reply / Uncontacted: Blue
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

  const rawStatus = (member.orientationStatus || member.interviewStatus || member.status || '').toLowerCase().trim();

  if (rawStatus.includes('withdraw')) {
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

  if (rawStatus.includes('approved') || rawStatus.includes('accept')) {
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

  // Pending / In Progress / Did Not Reply / Uncontacted -> Blue
  let label = 'Pending';
  if (rawStatus.includes('progress')) label = 'In Progress';
  else if (rawStatus.includes('did not reply') || rawStatus.includes('no reply')) label = 'Did Not Reply';
  else if (rawStatus.includes('uncontacted')) label = 'Uncontacted';
  else if (member.orientationStatus) label = member.orientationStatus;

  return {
    type: 'pending',
    bg: '#DBEAFE',
    border: '1.5px solid rgba(59, 130, 246, 0.5)',
    avatarBg: '#1F74F1',
    avatarColor: '#FFFFFF',
    textColor: '#1E40AF',
    hoverShadow: '0 4px 12px rgba(31, 116, 241, 0.3)',
    statusLabel: label
  };
};

export default function GroupAssignmentTab({ 
  retreats = [], 
  registrations = [], 
  setRegistrations,
  authorizedEmails = [], 
  onSaveRetreat,
  selectedRetreatId = ''
}) {
  const activeRetreat = retreats.find(r => r.id === selectedRetreatId) || (retreats.length > 0 ? retreats[0] : null);

  // Number of groups N (min 1, max 20, default 4 or from retreat config)
  const [numGroups, setNumGroups] = useState(() => {
    return activeRetreat?.groupConfig?.numGroups || 4;
  });

  // Custom Group Names map: { 'group-1': 'Group 1', 'group-2': 'Group 2', ... }
  const [groupNames, setGroupNames] = useState(() => {
    return activeRetreat?.groupConfig?.groupNames || {};
  });

  // Multi-Select Application Status Filter & Volunteers Visibility
  const [selectedStatuses, setSelectedStatuses] = useState(() => new Set(['Approved']));
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

  // Sync retreat group config when activeRetreat changes
  useEffect(() => {
    if (activeRetreat && activeRetreat.id !== 'ALL') {
      if (activeRetreat.groupConfig?.numGroups) {
        setNumGroups(activeRetreat.groupConfig.numGroups);
      }
      if (activeRetreat.groupConfig?.groupNames) {
        setGroupNames(activeRetreat.groupConfig.groupNames);
      } else {
        setGroupNames({});
      }
    }
  }, [activeRetreat]);

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage({ type: '', text: '' });
    }, 3500);
  };

  // Helper: is volunteer
  const isVolunteerEmail = useCallback((email) => {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    if (clean === ADMIN_EMAIL.toLowerCase().trim()) return true;
    return authorizedEmails.some(ae => {
      const authEmail = (typeof ae === 'string' ? ae : ae?.email || '').toLowerCase().trim();
      return authEmail === clean;
    });
  }, [authorizedEmails]);

  // All applicants for active retreat (all statuses: approved, pending, uncontacted, waitlisted, etc.)
  const retreatAllApplicants = useMemo(() => {
    return registrations.filter(r => {
      return selectedRetreatId === 'ALL' || 
        retreats.length <= 1 ||
        r.retreatId === activeRetreat?.id || 
        (!r.retreatId && r.retreatTitle === activeRetreat?.title) ||
        (r.retreatTitle && activeRetreat?.title && r.retreatTitle.toLowerCase().trim() === activeRetreat.title.toLowerCase().trim());
    });
  }, [registrations, activeRetreat, selectedRetreatId, retreats]);

  // Status counts across all retreat applicants
  const statusCounts = useMemo(() => {
    const counts = {
      'Approved': 0,
      'Pending': 0,
      'In Progress': 0,
      'Did Not Reply': 0,
      'Uncontacted': 0,
      'Withdrawn': 0
    };
    let volCount = 0;

    retreatAllApplicants.forEach(reg => {
      const email = reg.email?.toLowerCase().trim() || '';
      if (isVolunteerEmail(email)) {
        volCount++;
      }
      const st = normalizeStatusKey(reg);
      counts[st] = (counts[st] || 0) + 1;
    });

    return { counts, volCount };
  }, [retreatAllApplicants, isVolunteerEmail]);

  // Status toggle handlers
  const handleToggleStatus = (statusName) => {
    setSelectedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(statusName)) {
        next.delete(statusName);
      } else {
        next.add(statusName);
      }
      return next;
    });
  };

  const handleSelectAllStatuses = () => {
    const all = new Set(['Approved', 'Pending', 'In Progress', 'Did Not Reply', 'Uncontacted', 'Withdrawn', ...Object.keys(statusCounts.counts)]);
    setSelectedStatuses(all);
    setShowVolunteers(true);
  };

  const handleSelectApprovedOnly = () => {
    setSelectedStatuses(new Set(['Approved']));
    setShowVolunteers(true);
  };

  const handleClearStatuses = () => {
    setSelectedStatuses(new Set());
    setShowVolunteers(false);
  };

  // Manageable member list derived from retreat applicants filtered by selected statuses and volunteer toggle
  const allManageableMembers = useMemo(() => {
    const matchingApplicants = retreatAllApplicants.filter(reg => {
      const email = reg.email?.toLowerCase().trim() || '';
      const isVol = isVolunteerEmail(email);

      // If volunteer and showVolunteers is checked, include
      if (isVol && showVolunteers) return true;

      // Otherwise, match application status
      const st = normalizeStatusKey(reg);
      return selectedStatuses.has(st);
    });

    return matchingApplicants.map(reg => {
      const email = reg.email?.toLowerCase().trim() || '';
      const isVol = isVolunteerEmail(email);

      // Validate groupId against current numGroups
      let assignedGroupId = reg.groupId || 'unassigned';
      if (assignedGroupId !== 'unassigned') {
        const gMatch = assignedGroupId.match(/^group-(\d+)$/);
        if (gMatch) {
          const gIndex = parseInt(gMatch[1], 10);
          if (gIndex > numGroups || gIndex < 1) {
            assignedGroupId = 'unassigned';
          }
        }
      }

      const groupLabel = assignedGroupId !== 'unassigned'
        ? (groupNames[assignedGroupId] || `Group ${assignedGroupId.replace('group-', '')}`)
        : '';

      const normalizedSt = normalizeStatusKey(reg);

      return {
        id: reg.id,
        regId: reg.id,
        email: reg.email,
        name: `${reg.firstName || ''} ${reg.lastName || ''}`.trim() || reg.name || reg.email,
        firstName: reg.firstName,
        lastName: reg.lastName,
        photoURL: reg.photoURL || null,
        phone: reg.phone,
        academicRole: reg.academicRole,
        feeTier: reg.feeTier,
        paymentStatus: reg.paymentStatus,
        orientationStatus: reg.orientationStatus || reg.interviewStatus || reg.status || normalizedSt,
        interviewStatus: reg.orientationStatus || reg.interviewStatus || reg.status || normalizedSt,
        normalizedStatus: normalizedSt,
        submittedAt: reg.submittedAt || reg.registeredAt,
        foodAllergies: reg.foodAllergies,
        healthConditions: reg.healthConditions,
        volunteerNotes: reg.volunteerNotes || reg.orientationNotes || reg.interviewNotes,
        attendance: reg.attendance || {},
        isVolunteer: isVol,
        groupId: assignedGroupId,
        assignedGroup: groupLabel
      };
    });
  }, [retreatAllApplicants, isVolunteerEmail, selectedStatuses, showVolunteers, numGroups, groupNames]);

  // Filtered members based on search query, sorted by rank (volunteers first, then accepted, then in progress, etc.)
  const filteredMembers = useMemo(() => {
    let list = allManageableMembers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.email.toLowerCase().includes(q) ||
        (m.academicRole && m.academicRole.toLowerCase().includes(q)) ||
        (m.normalizedStatus && m.normalizedStatus.toLowerCase().includes(q))
      );
    }
    return sortMembers(list);
  }, [allManageableMembers, searchQuery]);

  // Group buckets: 1 to N with sorted members
  const groupList = useMemo(() => {
    const list = [];
    for (let i = 1; i <= numGroups; i++) {
      const gId = `group-${i}`;
      const defaultName = `Group ${i}`;
      const customName = groupNames[gId] || defaultName;
      
      const membersInGroup = sortMembers(filteredMembers.filter(m => m.groupId === gId));
      const participantCount = membersInGroup.filter(m => !m.isVolunteer).length;
      const volunteerCount = membersInGroup.filter(m => m.isVolunteer).length;

      list.push({
        id: gId,
        index: i,
        name: customName,
        members: membersInGroup,
        participantCount,
        volunteerCount,
        totalCount: membersInGroup.length
      });
    }
    return list;
  }, [numGroups, groupNames, filteredMembers]);

  // Unassigned bucket (sorted by rank: volunteers first, then accepted, then in progress, etc.)
  const unassignedMembers = useMemo(() => {
    const unassigned = filteredMembers.filter(m => {
      if (!m.groupId || m.groupId === 'unassigned') return true;
      const gMatch = m.groupId.match(/^group-(\d+)$/);
      if (gMatch) {
        const gNum = parseInt(gMatch[1], 10);
        if (gNum > numGroups || gNum < 1) return true;
      }
      return false;
    });
    return sortMembers(unassigned);
  }, [filteredMembers, numGroups]);

  // Save Group Config to Retreat in Firestore
  const persistRetreatGroupConfig = async (newNumGroups, newGroupNames) => {
    if (!activeRetreat || activeRetreat.id === 'ALL') return;
    const updatedConfig = {
      numGroups: newNumGroups !== undefined ? newNumGroups : numGroups,
      groupNames: newGroupNames !== undefined ? newGroupNames : groupNames,
      lastUpdated: new Date().toISOString()
    };

    if (onSaveRetreat) {
      onSaveRetreat(activeRetreat.id, { groupConfig: updatedConfig });
    } else if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'retreat_history', activeRetreat.id), { groupConfig: updatedConfig }, { merge: true });
        logDatabaseOperation(0, 1, 0);
      } catch (err) {
        console.warn("Error saving group config to Firestore:", err);
      }
    }
  };

  // Change Number of Groups N & Automatically unassign people in removed groups
  const handleNumGroupsChange = async (nextN) => {
    const validN = Math.max(1, Math.min(20, nextN));
    if (validN === numGroups) return;

    // Check if any applicant is in a removed group (groupId > validN)
    const membersToUnassign = retreatAllApplicants.filter(r => {
      const gMatch = r.groupId?.match(/^group-(\d+)$/);
      if (gMatch) {
        return parseInt(gMatch[1], 10) > validN;
      }
      return false;
    });

    if (membersToUnassign.length > 0) {
      const unassignIds = membersToUnassign.map(m => m.id);
      const updatedRegs = registrations.map(reg => {
        if (unassignIds.includes(reg.id)) {
          return { ...reg, groupId: 'unassigned', assignedGroup: '' };
        }
        return reg;
      });
      setRegistrations(updatedRegs);
      localStorage.setItem('sky_registrations', JSON.stringify(updatedRegs));

      if (isFirebaseConfigured && db) {
        try {
          await Promise.all(
            unassignIds.map(async (id) => {
              await setDoc(doc(db, 'registrations', id), {
                groupId: 'unassigned',
                assignedGroup: '',
                groupUpdatedAt: new Date().toISOString()
              }, { merge: true });
            })
          );
          logDatabaseOperation(0, unassignIds.length, 0);
        } catch (err) {
          console.warn("Error unassigning overflow members:", err);
        }
      }
      showToast('info', `Reduced to ${validN} groups. Unassigned ${unassignIds.length} members from removed groups.`);
    }

    setNumGroups(validN);
    persistRetreatGroupConfig(validN, groupNames);
  };

  // Move single member to a group or unassign
  const handleAssignMemberToGroup = async (member, targetGroupId) => {
    const isUnassigning = targetGroupId === 'unassigned';
    const targetGroupName = isUnassigning ? '' : (groupNames[targetGroupId] || `Group ${targetGroupId.replace('group-', '')}`);

    const updatedRegs = registrations.map(reg => {
      if (reg.id === member.regId) {
        return {
          ...reg,
          groupId: targetGroupId,
          assignedGroup: targetGroupName
        };
      }
      return reg;
    });

    setRegistrations(updatedRegs);
    localStorage.setItem('sky_registrations', JSON.stringify(updatedRegs));

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'registrations', member.regId), {
          groupId: targetGroupId,
          assignedGroup: targetGroupName,
          groupUpdatedAt: new Date().toISOString()
        }, { merge: true });
        logDatabaseOperation(0, 1, 0);
      } catch (err) {
        console.warn("Firestore registration group update error:", err);
      }
    }

    showToast('success', `Moved ${member.name} to ${isUnassigning ? 'Unassigned' : targetGroupName}`);
  };

  // Auto-Arrange Participants / Selected Role into groups with FEWEST total participants
  const handleAutoArrange = async () => {
    if (!activeRetreat) {
      showToast('error', 'Please select an active retreat first.');
      return;
    }

    if (numGroups < 1) {
      showToast('error', 'Number of groups must be at least 1.');
      return;
    }

    // 1. Identify members matching the selected role
    const candidateMembers = allManageableMembers.filter(m => {
      if (autoArrangeRole === 'volunteers') {
        if (!m.isVolunteer) return false;
      } else if (autoArrangeRole === 'participants') {
        if (m.isVolunteer) return false;
      } else if (autoArrangeRole === 'all') {
        // all displayed members
      } else {
        // Academic role match
        const role = (m.academicRole || '').toLowerCase();
        if (!role.includes(autoArrangeRole.toLowerCase())) return false;
      }

      // If only unassigned option is selected
      if (autoArrangeOnlyUnassigned) {
        if (m.groupId && m.groupId !== 'unassigned') {
          const gMatch = m.groupId.match(/^group-(\d+)$/);
          if (gMatch) {
            const gNum = parseInt(gMatch[1], 10);
            if (gNum >= 1 && gNum <= numGroups) return false;
          }
        }
      }

      return true;
    });

    if (candidateMembers.length === 0) {
      const roleName = autoArrangeRole === 'participants' ? 'non-volunteer participants' : autoArrangeRole === 'volunteers' ? 'volunteers' : `${autoArrangeRole} members`;
      showToast('error', `No matching ${roleName} found to auto-arrange.`);
      return;
    }

    setIsAutoAssigning(true);

    // 2. Count existing members in each group that are NOT being auto-arranged
    // (e.g. Group 1 has 3 volunteers and Group 2 has 1 volunteer)
    const candidateIds = new Set(candidateMembers.map(m => m.id));
    const groupMemberCounts = {};
    for (let i = 1; i <= numGroups; i++) {
      groupMemberCounts[`group-${i}`] = 0;
    }

    allManageableMembers.forEach(m => {
      if (!candidateIds.has(m.id) && m.groupId && groupMemberCounts[m.groupId] !== undefined) {
        groupMemberCounts[m.groupId]++;
      }
    });

    // 3. Sort candidates sequentially by application timestamp (oldest submission first)
    const sortedCandidates = [...candidateMembers].sort((a, b) => {
      const timeA = new Date(a.submittedAt || a.registeredAt || 0).getTime();
      const timeB = new Date(b.submittedAt || b.registeredAt || 0).getTime();
      if (timeA && timeB && timeA !== timeB) {
        return timeA - timeB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // 4. Sequentially insert each participant into the group with the FEWEST current total members
    const updatedRegistrationsMap = new Map();
    const batchUpdates = [];

    sortedCandidates.forEach((p) => {
      let minCount = Infinity;
      let targetGroupId = 'group-1';

      for (let i = 1; i <= numGroups; i++) {
        const gId = `group-${i}`;
        const count = groupMemberCounts[gId] || 0;
        if (count < minCount) {
          minCount = count;
          targetGroupId = gId;
        }
      }

      // Assign to target group and increment total count
      groupMemberCounts[targetGroupId]++;
      const targetGroupName = groupNames[targetGroupId] || `Group ${targetGroupId.replace('group-', '')}`;

      updatedRegistrationsMap.set(p.id, {
        groupId: targetGroupId,
        assignedGroup: targetGroupName
      });

      batchUpdates.push({
        id: p.id,
        groupId: targetGroupId,
        assignedGroup: targetGroupName
      });
    });

    // 5. Update local state immediately (optimistic UI)
    const newRegistrations = registrations.map(reg => {
      if (updatedRegistrationsMap.has(reg.id)) {
        const update = updatedRegistrationsMap.get(reg.id);
        return { ...reg, ...update };
      }
      return reg;
    });

    setRegistrations(newRegistrations);
    localStorage.setItem('sky_registrations', JSON.stringify(newRegistrations));

    // 6. Persist group config to retreat
    persistRetreatGroupConfig(numGroups, groupNames);

    // 7. Save batch updates to Firestore
    if (isFirebaseConfigured && db) {
      try {
        let writeOps = 0;
        await Promise.all(
          batchUpdates.map(async (u) => {
            await setDoc(doc(db, 'registrations', u.id), {
              groupId: u.groupId,
              assignedGroup: u.assignedGroup,
              groupUpdatedAt: new Date().toISOString()
            }, { merge: true });
            writeOps++;
          })
        );
        logDatabaseOperation(0, writeOps, 0);
      } catch (err) {
        console.warn("Firestore auto-arrange batch save error:", err);
      }
    }

    setIsAutoAssigning(false);
    const roleLabel = autoArrangeRole === 'participants' ? 'participants' : autoArrangeRole === 'volunteers' ? 'volunteers' : 'members';
    showToast(
      'success', 
      `Balanced & arranged ${sortedCandidates.length} ${roleLabel} across ${numGroups} groups by fewest total participants!`
    );
  };

  // Clear a single group (unassign ALL members in this group atomically)
  const handleClearGroup = async (groupId, groupTitle) => {
    const membersInGroup = retreatAllApplicants.filter(r => r.groupId === groupId);
    if (membersInGroup.length === 0) {
      showToast('info', 'Group is already empty.');
      return;
    }

    if (!window.confirm(`Unassign all ${membersInGroup.length} members from ${groupTitle || groupId}?`)) {
      return;
    }

    const memberIds = membersInGroup.map(m => m.id);
    const updatedRegs = registrations.map(reg => {
      if (memberIds.includes(reg.id)) {
        return {
          ...reg,
          groupId: 'unassigned',
          assignedGroup: ''
        };
      }
      return reg;
    });

    setRegistrations(updatedRegs);
    localStorage.setItem('sky_registrations', JSON.stringify(updatedRegs));

    if (isFirebaseConfigured && db) {
      try {
        await Promise.all(
          memberIds.map(async (id) => {
            await setDoc(doc(db, 'registrations', id), {
              groupId: 'unassigned',
              assignedGroup: '',
              groupUpdatedAt: new Date().toISOString()
            }, { merge: true });
          })
        );
        logDatabaseOperation(0, memberIds.length, 0);
      } catch (err) {
        console.warn("Firestore clear group error:", err);
      }
    }

    showToast('info', `Unassigned all ${memberIds.length} members from ${groupTitle || groupId}.`);
  };

  // Reset / Unassign ALL participants and volunteers in this retreat atomically
  const handleResetAll = async () => {
    const assignedMembers = retreatAllApplicants.filter(r => r.groupId && r.groupId !== 'unassigned');
    if (assignedMembers.length === 0) {
      showToast('info', 'No members are currently assigned.');
      return;
    }

    if (!window.confirm(`Are you sure you want to unassign all ${assignedMembers.length} members for this retreat?`)) {
      return;
    }

    const assignedIds = assignedMembers.map(m => m.id);
    const updatedRegs = registrations.map(reg => {
      if (assignedIds.includes(reg.id)) {
        return {
          ...reg,
          groupId: 'unassigned',
          assignedGroup: ''
        };
      }
      return reg;
    });

    setRegistrations(updatedRegs);
    localStorage.setItem('sky_registrations', JSON.stringify(updatedRegs));

    if (isFirebaseConfigured && db) {
      try {
        await Promise.all(
          assignedIds.map(async (id) => {
            await setDoc(doc(db, 'registrations', id), {
              groupId: 'unassigned',
              assignedGroup: '',
              groupUpdatedAt: new Date().toISOString()
            }, { merge: true });
          })
        );
        logDatabaseOperation(0, assignedIds.length, 0);
      } catch (err) {
        console.warn("Firestore reset all error:", err);
      }
    }

    showToast('info', `Unassigned all ${assignedIds.length} members.`);
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

  // Handle Changing Group Name inline
  const handleGroupNameChange = (gId, newName) => {
    const updated = { ...groupNames, [gId]: newName };
    setGroupNames(updated);
    persistRetreatGroupConfig(numGroups, updated);
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

          {/* In Progress Pill (Blue) */}
          <label 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: selectedStatuses.has('In Progress') ? '#DBEAFE' : '#F8FAFC',
              border: selectedStatuses.has('In Progress') ? '1.5px solid #93C5FD' : '1px solid var(--border-color)',
              color: selectedStatuses.has('In Progress') ? '#1E40AF' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              userSelect: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              checked={selectedStatuses.has('In Progress')}
              onChange={() => handleToggleStatus('In Progress')}
              style={{ accentColor: '#1F74F1', cursor: 'pointer' }}
            />
            <span>In Progress</span>
            <span style={{
              background: selectedStatuses.has('In Progress') ? '#BFDBFE' : '#E2E8F0',
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem'
            }}>
              {statusCounts.counts['In Progress'] || 0}
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
                      title={`Total participants in ${group.name}: ${group.members.length} (${group.participantCount} participants, ${group.volunteerCount} volunteers)`}
                    >
                      <Users size={12} />
                      <span>{group.members.length}</span>
                    </div>

                    {/* Clear Group Button at Top Right of Group Card */}
                    {group.members.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearGroup(group.id, group.name)}
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
                        title={`Unassign all ${group.members.length} members from ${group.name}`}
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
          participant={inspectParticipant}
          groupName={inspectParticipant.assignedGroup}
          isVolunteer={inspectParticipant.isVolunteer}
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
