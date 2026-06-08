import React from 'react';
import { formatDate } from '../../../utils/formatDate';
import InternAvatar from '../../InternAvatar';

const InternProfile = ({ internData }) => {
  if (!internData) return null;

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      minHeight: 'calc(100vh - 130px)',
      background: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E0E0E0',
      overflow: 'hidden'
    }}>
      {/* Left purple panel */}
      <div style={{
        width: '280px',
        flexShrink: 0,
        background: '#3D35C4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 24px'
      }}>
        {/* Avatar */}
        <InternAvatar
          internId={internData.id}
          name={internData.name}
          size={120}
          style={{
            border: '3px solid rgba(255,255,255,0.3)'
          }}
        />
        <p style={{color:'#FFFFFF', fontSize:'18px', fontWeight:'500', marginTop:'16px', textAlign: 'center'}}>
          {internData.name}
        </p>
        <p style={{color:'rgba(255,255,255,0.75)', fontSize:'13px', textAlign: 'center'}}>
          {internData.dept}
        </p>
        <span style={{
          border: '1px solid rgba(255,255,255,0.5)',
          color: '#FFFFFF', fontSize: '11px',
          padding: '3px 12px', borderRadius: '4px', marginTop: '8px'
        }}>INTERN</span>
      </div>

      {/* Right details — takes all remaining space */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignContent: 'start'
      }}>
        {[
          ['College Name', internData.college_name || internData.collegeName],
          ['Department', internData.dept],
          ['Year', internData.year],
          ['Semester', internData.sem],
          ['Email Address', internData.mail],
          ['Phone Number', internData.number],
          ['Starting Date', formatDate(internData.starting_date)],
          ['Ending Date', formatDate(internData.ending_date)]
        ].map(([label, value], i) => (
          <div key={i} style={{
            padding: '16px 20px',
            borderBottom: '1px solid #F0F0F0',
            borderRight: i % 2 === 0 ? '1px solid #F0F0F0' : 'none'
          }}>
            <p style={{
              fontSize: '11px', color: '#9E9E9E',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: '4px'
            }}>{label}</p>
            <p style={{
              fontSize: '14px', fontWeight: '500', color: '#212121'
            }}>{value || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InternProfile;
