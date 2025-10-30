import { useState, useEffect } from 'react';
import { User as UserIcon, Briefcase, GraduationCap, MapPin, Globe, Edit2, Save, X, Image as ImageIcon } from 'lucide-react';

interface Profile {
  user_id: string;
  avatar_url: string | null;
  role: string | null;
  research_direction: string | null;
  institution: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

// Use full URL for production to bypass proxy issues
const API_BASE = import.meta.env.VITE_API_BASE || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? `http://${window.location.hostname}:8000/api`
    : '/api');

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'phd', label: 'PhD Candidate' },
  { value: 'professor', label: 'Professor' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'industry', label: 'Industry Professional' },
  { value: 'other', label: 'Other' },
];

const RESEARCH_DIRECTIONS = [
  'Machine Learning', 'Deep Learning', 'Natural Language Processing',
  'Computer Vision', 'Reinforcement Learning', 'Robotics',
  'Data Science', 'Bioinformatics', 'Quantum Computing',
  'Cybersecurity', 'Blockchain', 'Other'
];

export default function ProfilePanel() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    avatar_url: '',
    role: '',
    research_direction: '',
    institution: '',
    bio: '',
    location: '',
    website: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditForm({
          avatar_url: data.avatar_url || '',
          role: data.role || '',
          research_direction: data.research_direction || '',
          institution: data.institution || '',
          bio: data.bio || '',
          location: data.location || '',
          website: data.website || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, avatar_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditForm({
        avatar_url: profile.avatar_url || '',
        role: profile.role || '',
        research_direction: profile.research_direction || '',
        institution: profile.institution || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
        Loading profile...
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{
        padding: '24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        color: 'white',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '700' }}>My Profile</h1>
          <p style={{ margin: 0, opacity: 0.9 }}>Manage your personal information</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '15px'
            }}
          >
            <Edit2 size={18} />
            Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <X size={18} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 24px',
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: '10px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        {/* Avatar Section */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: editForm.avatar_url 
                ? `url(${editForm.avatar_url})` 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '48px',
              fontWeight: '600',
              margin: '0 auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              {!editForm.avatar_url && <UserIcon size={48} />}
            </div>
            {editing && (
              <label style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: '#667eea',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                border: '3px solid white'
              }}>
                <ImageIcon size={18} color="white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Profile Fields */}
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Role */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151',
              fontSize: '15px'
            }}>
              <Briefcase size={18} color="#667eea" />
              Role
            </label>
            {editing ? (
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select your role</option>
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
                {profile.role ? ROLE_OPTIONS.find(r => r.value === profile.role)?.label : 'Not specified'}
              </div>
            )}
          </div>

          {/* Research Direction */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151',
              fontSize: '15px'
            }}>
              <GraduationCap size={18} color="#667eea" />
              Research Direction
            </label>
            {editing ? (
              <select
                value={editForm.research_direction}
                onChange={(e) => setEditForm({ ...editForm, research_direction: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select research direction</option>
                {RESEARCH_DIRECTIONS.map(dir => (
                  <option key={dir} value={dir}>{dir}</option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
                {profile.research_direction || 'Not specified'}
              </div>
            )}
          </div>

          {/* Institution */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151',
              fontSize: '15px'
            }}>
              <GraduationCap size={18} color="#667eea" />
              Institution / Company
            </label>
            {editing ? (
              <input
                type="text"
                value={editForm.institution}
                onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })}
                placeholder="e.g., MIT, Google Research"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            ) : (
              <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
                {profile.institution || 'Not specified'}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151',
              fontSize: '15px'
            }}>
              <MapPin size={18} color="#667eea" />
              Location
            </label>
            {editing ? (
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="e.g., San Francisco, CA"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            ) : (
              <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
                {profile.location || 'Not specified'}
              </div>
            )}
          </div>

          {/* Website */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151',
              fontSize: '15px'
            }}>
              <Globe size={18} color="#667eea" />
              Website
            </label>
            {editing ? (
              <input
                type="url"
                value={editForm.website}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                placeholder="https://yourwebsite.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            ) : (
              <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '8px' }}>
                {profile.website ? (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#667eea', textDecoration: 'none' }}
                  >
                    {profile.website}
                  </a>
                ) : (
                  <span style={{ color: '#6b7280' }}>Not specified</span>
                )}
              </div>
            )}
          </div>

          {/* Bio */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151',
              fontSize: '15px'
            }}>
              <UserIcon size={18} color="#667eea" />
              Bio
            </label>
            {editing ? (
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            ) : (
              <div style={{
                padding: '12px 16px',
                background: '#f9fafb',
                borderRadius: '8px',
                color: '#6b7280',
                minHeight: '80px',
                whiteSpace: 'pre-wrap'
              }}>
                {profile.bio || 'Not specified'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


