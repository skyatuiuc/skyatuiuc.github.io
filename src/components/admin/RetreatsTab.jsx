import React, { useState } from 'react';
import { db, isFirebaseConfigured } from '../../firebase/config';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useRoster } from '../../context/RosterContext';
import { formatDirectImageUrl } from '../../services/emailService';
import { todayChicago } from '../../utils/dateUtils';
import { Trash2, Calendar, Plus, Edit3, Save, X } from 'lucide-react';
import { useToast } from '../ui/ToastProvider';
import { useConfirm } from '../ui/ConfirmProvider';
import { formatRetreatDates } from '../../models/retreat';

// Admin tab: schedule retreats and edit retreat history
export default function RetreatsTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const { retreats } = useRoster();

  const [editingRetreatId, setEditingRetreatId] = useState(null);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [teachers, setTeachers] = useState('');
  const [courses, setCourses] = useState('SKY Breath Meditation');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [fridayTime, setFridayTime] = useState('');
  const [saturdayTime, setSaturdayTime] = useState('');
  const [sundayTime, setSundayTime] = useState('');
  const [groupPhotoUrl, setGroupPhotoUrl] = useState('');

  const handleStartEditRetreat = (ret) => {
    setEditingRetreatId(ret.id);
    setTitle(ret.title || '');
    setStartDate(ret.startDate || '');
    setEndDate(ret.endDate || '');
    setTeachers(ret.teachers || '');
    setCourses(ret.courses || 'SKY Breath Meditation');
    setLocation(ret.location || '');
    setAddress(ret.address || '');
    setFridayTime(ret.fridayTime || ret.day1Time || '');
    setSaturdayTime(ret.saturdayTime || ret.day2Time || '');
    setSundayTime(ret.sundayTime || ret.day3Time || '');
    setGroupPhotoUrl(ret.groupPhotoUrl || '');
    toast.info(`Editing retreat record: ${ret.title}`);
  };

  const handleCancelEditRetreat = () => {
    setEditingRetreatId(null);
    setTitle('');
    setStartDate('');
    setEndDate('');
    setTeachers('');
    setCourses('SKY Breath Meditation');
    setLocation('');
    setAddress('');
    setFridayTime('');
    setSaturdayTime('');
    setSundayTime('');
    setGroupPhotoUrl('');
  };

  const handleSaveRetreat = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate || !location.trim()) {
      toast.error('Please fill in Title, Start Date, End Date, and Location.');
      return;
    }

    if (editingRetreatId) {
      const existing = retreats.find(r => r.id === editingRetreatId) || {};
      const updatedRetreat = {
        ...existing,
        id: editingRetreatId,
        title: title.trim(),
        startDate,
        endDate,
        teachers: teachers.trim() || 'SKY Certified Teachers',
        courses: courses.trim() || 'SKY Breath Meditation',
        location: location.trim(),
        address: address.trim(),
        fridayTime: fridayTime.trim(),
        saturdayTime: saturdayTime.trim(),
        sundayTime: sundayTime.trim(),
        groupPhotoUrl: groupPhotoUrl.trim(),
        updatedAt: new Date().toISOString()
      };


      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'retreat_history', editingRetreatId), updatedRetreat, { merge: true });
        } catch (err) {
          console.warn("Firestore retreat update error:", err);
          toast.error(`Retreat not saved: ${err.code || err.message}`);
          return;
        }
      }

      handleCancelEditRetreat();
      toast.success(`Successfully updated retreat: ${updatedRetreat.title}`);
    } else {
      const retreatId = `retreat-${Date.now()}`;
      const newRetreat = {
        id: retreatId,
        title: title.trim(),
        startDate,
        endDate,
        teachers: teachers.trim() || 'SKY Certified Teachers',
        courses: courses.trim() || 'SKY Breath Meditation',
        location: location.trim(),
        address: address.trim(),
        fridayTime: fridayTime.trim(),
        saturdayTime: saturdayTime.trim(),
        sundayTime: sundayTime.trim(),
        groupPhotoUrl: groupPhotoUrl.trim(),
        createdAt: new Date().toISOString()
      };


      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'retreat_history', retreatId), newRetreat);
        } catch (err) {
          console.warn("Firestore retreat save error:", err);
          toast.error(`Retreat not created: ${err.code || err.message}`);
          return;
        }
      }

      handleCancelEditRetreat();
      toast.success(`Successfully created retreat: ${newRetreat.title}`);
    }
  };

  const handleDeleteRetreat = async (id, retreatTitle) => {
    if (!(await confirm({
      title: 'Delete retreat?',
      message: `"${retreatTitle}" will be removed from the retreat list. Its registrations are not deleted.`,
      confirmLabel: 'Delete retreat',
      danger: true
    }))) return;
    if (editingRetreatId === id) {
      handleCancelEditRetreat();
    }
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'retreat_history', id));
      } catch (e) {
        console.warn("Firestore delete retreat error:", e);
        toast.error(`Retreat not deleted: ${e.code || e.message}`);
        return;
      }
    }
    toast.success('Deleted retreat record.');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2.5rem' }}>
      
      <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={22} color="var(--sky-blue)" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              {editingRetreatId ? 'Edit Retreat Record' : 'Create New Retreat Record'}
            </h2>
          </div>
          {editingRetreatId && (
            <span className="badge badge-sun" style={{ fontSize: '0.7rem' }}>
              <Edit3 size={12} style={{ display: 'inline', marginRight: '3px' }} /> EDITING MODE
            </span>
          )}
        </div>

        {editingRetreatId && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'var(--sky-sun-light)',
            border: '1px solid rgba(250, 188, 29, 0.3)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Editing: <strong style={{ color: 'var(--text-main)' }}>{title || 'Selected Retreat'}</strong></span>
            <button 
              type="button" 
              onClick={handleCancelEditRetreat} 
              style={{ background: 'none', border: 'none', color: '#B45309', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'underline' }}
            >
              Reset to Create New
            </button>
          </div>
        )}

        <form onSubmit={handleSaveRetreat} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>RETREAT TITLE *</label>
            <input 
              type="text"
              required
              placeholder="e.g. SKY Happiness Retreat | Fall 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>START DATE *</label>
              <input 
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>END DATE *</label>
              <input 
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>TEACHERS / INSTRUCTORS</label>
              <input 
                type="text"
                placeholder="Facilitators"
                value={teachers}
                onChange={(e) => setTeachers(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>VENUE & ROOM #</label>
              <input 
                type="text"
                placeholder="e.g. Sidney Lu Mechanical Engineering Building, Room 2100"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>STREET ADDRESS (OPTIONAL)</label>
            <input 
              type="text"
              placeholder="e.g. 1206 W Green St, Urbana, IL 61801"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>COURSE / WORKSHOP TYPE</label>
            <input 
              type="text"
              placeholder="e.g. SKY Breath Meditation"
              value={courses}
              onChange={(e) => setCourses(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
            />
          </div>

          {/* Session Timings Configuration */}
          <div style={{
            background: 'var(--sky-blue-subtle)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(31, 116, 241, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sky-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🕒 Daily Session Timings (Used in Cards & Email Templates)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DAY 1 (FRIDAY) TIME</label>
                <input 
                  type="text"
                  placeholder="6:30 PM – 9:30 PM"
                  value={fridayTime}
                  onChange={(e) => setFridayTime(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DAY 2 (SATURDAY) TIME</label>
                <input 
                  type="text"
                  placeholder="10:00 AM – 2:00 PM"
                  value={saturdayTime}
                  onChange={(e) => setSaturdayTime(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DAY 3 (SUNDAY) TIME</label>
                <input 
                  type="text"
                  placeholder="10:00 AM – 2:00 PM"
                  value={sundayTime}
                  onChange={(e) => setSundayTime(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Cohort Graduation Group Photo */}
          <div style={{
            background: '#F8FAFC',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(35, 39, 95, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📸 Cohort Graduation Group Photo (Included in Completion Email)
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Paste a shared Google Drive link (set to &quot;Anyone with the link can view&quot;), a website asset link (e.g. <code>https://skyuiuc.org/assets/retreats/...</code>), or any public image URL.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input 
                type="url"
                placeholder="e.g. https://drive.google.com/file/d/... or https://skyuiuc.org/assets/..."
                value={groupPhotoUrl}
                onChange={(e) => setGroupPhotoUrl(formatDirectImageUrl(e.target.value))}
                style={{ 
                  flex: 1, 
                  padding: '0.65rem 0.85rem', 
                  background: '#FFFFFF', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-sm)', 
                  color: 'var(--text-main)', 
                  fontSize: '0.85rem' 
                }}
              />

              {groupPhotoUrl && (
                <button
                  type="button"
                  onClick={() => setGroupPhotoUrl('')}
                  style={{
                    padding: '0.65rem 0.85rem',
                    background: '#FEE2E2',
                    color: '#DC2626',
                    border: '1px solid #FCA5A5',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            {groupPhotoUrl && (
              <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '1rem', background: '#FFFFFF', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <img 
                  src={groupPhotoUrl} 
                  alt="Group Photo Preview" 
                  style={{ width: '80px', height: '55px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #E2E8F0' }} 
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  <span style={{ color: '#16A34A', fontWeight: 700 }}>✓ Attached: </span>
                  <a href={groupPhotoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--sky-blue)' }}>{groupPhotoUrl}</a>
                </div>
              </div>
            )}
          </div>

          {editingRetreatId ? (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={handleCancelEditRetreat} 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '0.85rem', gap: '0.4rem' }}
              >
                <X size={16} /> Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-sun" 
                style={{ flex: 2, padding: '0.85rem', gap: '0.4rem' }}
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          ) : (
            <button type="submit" className="btn btn-sun" style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}>
              <Plus size={16} /> Create Retreat Record
            </button>
          )}
        </form>
      </div>

      <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
          MANAGED RETREAT RECORDS ({retreats.length})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '480px', overflowY: 'auto' }}>
          {retreats.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem 1rem' }}>
              No retreat records found. Use the form to create your first retreat.
            </div>
          ) : (
            retreats.map((ret) => {
              const isUpcoming = ret.endDate >= todayChicago();
              const isCurrentlyEditing = editingRetreatId === ret.id;
              return (
                <div key={ret.id} style={{
                  padding: '1rem 1.15rem',
                  background: isCurrentlyEditing ? 'var(--sky-sun-light)' : '#F8FAFC',
                  borderRadius: 'var(--radius-sm)',
                  border: isCurrentlyEditing 
                    ? '1px solid var(--sky-sun)' 
                    : (isUpcoming ? '1px solid var(--sky-blue)' : '1px solid var(--border-color)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'var(--transition-fast)'
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{ret.title}</span>
                      <span className={`badge ${isUpcoming ? 'badge-sky' : 'badge-earth'}`} style={{ fontSize: '0.65rem' }}>
                        {isUpcoming ? 'UPCOMING' : 'PAST'}
                      </span>
                      {ret.groupPhotoUrl && (
                        <span className="badge badge-sky" style={{ fontSize: '0.65rem' }}>📸 PHOTO</span>
                      )}
                      {isCurrentlyEditing && (
                        <span className="badge badge-sun" style={{ fontSize: '0.65rem' }}>EDITING</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>📅 {formatRetreatDates(ret)}</span>
                      <span>•</span>
                      <span>📍 {ret.location || 'UIUC Campus'}{ret.address ? ` (${ret.address})` : ''}</span>
                    </div>
                    {ret.teachers && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Instructors: {ret.teachers}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <button 
                      onClick={() => handleStartEditRetreat(ret)}
                      style={{
                        background: isCurrentlyEditing ? 'var(--sky-sun-light)' : '#FFFFFF',
                        border: isCurrentlyEditing ? '1px solid var(--sky-sun)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: isCurrentlyEditing ? '#B45309' : 'var(--text-main)',
                        cursor: 'pointer',
                        padding: '0.35rem 0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        transition: 'var(--transition-fast)'
                      }}
                      title="Edit Retreat Data"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteRetreat(ret.id, ret.title)}
                      style={{
                        background: '#FEF2F2',
                        border: '1px solid #F87171',
                        borderRadius: 'var(--radius-sm)',
                        color: '#DC2626',
                        cursor: 'pointer',
                        padding: '0.35rem 0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'var(--transition-fast)'
                      }}
                      title="Delete Retreat"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
