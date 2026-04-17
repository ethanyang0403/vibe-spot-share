// Hinge-style profile view body. Used both for the user's own profile
// (Profile tab) and for viewing someone else's profile (modal).

import { Camera, Plus, X as XIcon } from 'lucide-react';
import type { ProfileData } from '@/lib/profilesMock';
import { darkenColor } from '@/lib/profilesMock';

interface PhotoCardProps {
  showName?: boolean;
  name?: string;
  ageZone?: string;
  // For other-person variant: gradient + initial silhouette
  color?: string;
  initial?: string;
  editing?: boolean;
}

export function PhotoCard({
  showName,
  name,
  ageZone,
  color,
  initial,
  editing,
}: PhotoCardProps) {
  const isPersonColored = !!color;
  const background = isPersonColored
    ? `linear-gradient(135deg, ${color} 0%, ${darkenColor(color!)} 100%)`
    : 'linear-gradient(135deg, #1C1C24 0%, #2A2A35 100%)';

  return (
    <div
      className="relative mx-4 mt-4 overflow-hidden"
      style={{ borderRadius: 16, aspectRatio: '4 / 5', background }}
    >
      {/* Centered placeholder content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isPersonColored ? (
          <span
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: '#fff',
              opacity: 0.3,
              lineHeight: 1,
            }}
          >
            {initial}
          </span>
        ) : (
          <>
            <Camera size={40} color="#555566" />
            <p className="mt-2 text-[14px]" style={{ color: '#555566' }}>Add photo</p>
          </>
        )}
      </div>

      {/* Bottom gradient + name overlay */}
      {showName && (
        <>
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: '30%',
              background: 'linear-gradient(transparent, rgba(10, 10, 15, 0.85))',
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>
              {name}
            </p>
            <p className="mt-1" style={{ fontSize: 15, color: '#cbcbd6' }}>
              {ageZone}
            </p>
          </div>
        </>
      )}

      {/* Edit "+" overlay */}
      {editing && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            right: 12,
            bottom: 12,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#C2E9FF',
          }}
        >
          <Plus size={18} color="#0A0A0F" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      className="mx-4 mt-5"
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#555566',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </p>
  );
}

function PromptCard({ prompt }: { prompt: { question: string; answer: string } }) {
  return (
    <div
      className="mx-4 mt-4"
      style={{
        backgroundColor: '#141419',
        borderRadius: 14,
        padding: 20,
        borderLeft: '3px solid #C2E9FF',
      }}
    >
      <p style={{ fontSize: 13, color: '#8A8A9A', fontStyle: 'italic' }}>
        {prompt.question}
      </p>
      <p className="mt-2" style={{ fontSize: 16, color: '#fff', fontWeight: 600, lineHeight: 1.4 }}>
        {prompt.answer}
      </p>
    </div>
  );
}

interface InterestsProps {
  interests: string[];
  editing?: boolean;
}
function Interests({ interests, editing }: InterestsProps) {
  if (interests.length === 0) return null;
  return (
    <div className="mx-4 mt-3 flex flex-wrap gap-2">
      {interests.map((chip) => (
        <span
          key={chip}
          className="inline-flex items-center"
          style={{
            backgroundColor: '#141419',
            border: '1px solid #2A2A35',
            color: '#fff',
            fontSize: 13,
            padding: '8px 14px',
            borderRadius: 20,
            gap: 6,
          }}
        >
          {chip}
          {editing && (
            <XIcon size={12} color="#8A8A9A" strokeWidth={3} />
          )}
        </span>
      ))}
      {editing && (
        <span
          className="inline-flex items-center"
          style={{
            border: '1px dashed #C2E9FF',
            color: '#C2E9FF',
            fontSize: 13,
            padding: '8px 14px',
            borderRadius: 20,
          }}
        >
          + Add
        </span>
      )}
    </div>
  );
}

interface ProfileViewProps {
  profile: ProfileData;
  // Own-profile mode header data
  ownName?: string;            // e.g. "Ethan"
  // Other-person mode header data
  otherName?: string;          // e.g. "Jordan Lee"
  otherDegree?: '1st' | '2nd' | '3rd';
  otherColor?: string;
  otherInitial?: string;
  // Stats row: in own-profile, friends/moments/pings; in other-profile, mutual count.
  stats: Array<{ value: string; label: string }>;
  editing?: boolean;
  // Trailing children (account actions for own; CTAs for other)
  children?: React.ReactNode;
}

export default function ProfileView({
  profile,
  ownName,
  otherName,
  otherDegree,
  otherColor,
  otherInitial,
  stats,
  editing,
  children,
}: ProfileViewProps) {
  const isOther = !!otherName;
  const displayName = otherName ?? ownName ?? '';
  const ageZone = `${profile.age} · ${profile.zone}`;

  // Build photo card sequence — first photo holds the name overlay
  const totalPhotos = Math.min(profile.photoCount, 5);

  // We weave photos with content blocks. We render them as a flat sequence
  // at known positions (photo, stats, bio, photo, interests, photo, prompt1,
  // photo, prompt2, photo).
  return (
    <>
      {/* Photo 1 — with name overlay */}
      <PhotoCard
        showName
        name={displayName}
        ageZone={
          isOther && otherDegree ? `${ageZone}` : ageZone
        }
        color={isOther ? otherColor : undefined}
        initial={isOther ? otherInitial : undefined}
        editing={editing}
      />

      {/* Degree badge inline under name (other-person only) */}
      {isOther && otherDegree && (
        <div className="mx-4 mt-3">
          <span
            className="inline-flex items-center"
            style={{
              backgroundColor: '#C2E9FF',
              color: '#0A0A0F',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
            }}
          >
            {otherDegree}
          </span>
        </div>
      )}

      {/* Stats row */}
      <div className="mx-4 mt-3 flex gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex-1 text-center"
            style={{
              backgroundColor: '#141419',
              border: '1px solid #2A2A35',
              borderRadius: 12,
              padding: '10px 4px',
            }}
          >
            <p style={{ color: '#C2E9FF', fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
              {s.value}
            </p>
            <p style={{ color: '#8A8A9A', fontSize: 11, marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bio */}
      <SectionLabel>About</SectionLabel>
      {editing ? (
        <textarea
          defaultValue={profile.bio}
          className="mx-4 mt-2 w-[calc(100%-2rem)] resize-none bg-transparent text-white outline-none"
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            borderBottom: '1px solid #C2E9FF',
            paddingBottom: 6,
          }}
          rows={3}
        />
      ) : (
        <p
          className="mx-4 mt-2 text-white"
          style={{ fontSize: 15, lineHeight: 1.5 }}
        >
          {profile.bio}
        </p>
      )}

      {/* Photo 2 */}
      {totalPhotos >= 2 && (
        <PhotoCard
          color={isOther ? otherColor : undefined}
          initial={isOther ? otherInitial : undefined}
          editing={editing}
        />
      )}

      {/* Interests */}
      {profile.interests.length > 0 && (
        <>
          <SectionLabel>Interests</SectionLabel>
          <Interests interests={profile.interests} editing={editing} />
        </>
      )}

      {/* Photo 3 */}
      {totalPhotos >= 3 && (
        <PhotoCard
          color={isOther ? otherColor : undefined}
          initial={isOther ? otherInitial : undefined}
          editing={editing}
        />
      )}

      {/* Prompt 1 */}
      {profile.prompts[0] && <PromptCard prompt={profile.prompts[0]} />}

      {/* Photo 4 */}
      {totalPhotos >= 4 && (
        <PhotoCard
          color={isOther ? otherColor : undefined}
          initial={isOther ? otherInitial : undefined}
          editing={editing}
        />
      )}

      {/* Prompt 2 */}
      {profile.prompts[1] && <PromptCard prompt={profile.prompts[1]} />}

      {/* Photo 5 */}
      {totalPhotos >= 5 && (
        <PhotoCard
          color={isOther ? otherColor : undefined}
          initial={isOther ? otherInitial : undefined}
          editing={editing}
        />
      )}

      {/* Trailing actions */}
      {children}
    </>
  );
}
