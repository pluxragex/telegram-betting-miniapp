import './GroupCard.css';

interface GroupCardProps {
  group: {
    id: number;
    name: string;
    teams?: Array<{ id: number; name: string; is_active: boolean }>;
  };
  index?: number;
  onClick: () => void;
  hasActiveMatches?: boolean;
  hasOpenMatches?: boolean;
}

function getGroupDescription(group: GroupCardProps['group']): string {
  if (group.teams && group.teams.length > 0) {
    const activeTeams = group.teams.filter(t => t.is_active);
    if (activeTeams.length > 0) {
      return activeTeams.map(t => t.name).join(', ');
    }
  }
  const match = group.name.match(/Группа\s+(\d+)/i);
  if (match && match[1]) {
    return `Матчи группы ${match[1]}`;
  }
  return 'Матчи внутри группы';
}

export function GroupCard({ group, index, onClick, hasActiveMatches, hasOpenMatches }: GroupCardProps) {
  return (
    <div className="group-card" onClick={onClick}>
      <div className="group-card-content">
        <div className="group-card-icon">
          {index ? (
            <span className="group-card-number">{index}</span>
          ) : (
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 4L20 12L28 14L20 16L16 24L12 16L4 14L12 12L16 4Z"
                fill="currentColor"
              />
            </svg>
          )}
        </div>
        <div className="group-card-info">
          <h3 className="group-card-name">{group.name}</h3>
          <p className="group-card-description">{getGroupDescription(group)}</p>
        </div>
        <div className="group-card-arrow-container">
          {(hasActiveMatches || hasOpenMatches) && (
            <div className={`group-card-indicator ${hasActiveMatches ? 'active' : 'open'}`}></div>
          )}
          <div className="group-card-arrow">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 18L15 12L9 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

