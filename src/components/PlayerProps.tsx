import { usePlayerProps } from '@/hooks/useSportsData';
import { formatPlayerPropType, formatConfidence, getConfidenceColor } from '@/utils/formatting';

interface PlayerPropsProps {
  gameId: string;
  sport: string;
}

export default function PlayerProps({ gameId, sport }: PlayerPropsProps) {
  const { playerProps, loading, error } = usePlayerProps(gameId, sport);

  if (loading) {
    return <div className="text-white p-4">Loading player props...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading player props</div>;
  }

  if (playerProps.length === 0) {
    return <div className="text-gray-400 p-4">No player props available</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {playerProps.map((prop) => (
        <div key={prop.id} className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-white font-semibold">{prop.playerName}</h3>
              <div className="flex items-center mt-1">
                <span className="text-gray-300 text-sm mr-2">{formatPlayerPropType(prop.propType)}</span>
                <span className="text-blue-400 font-medium">
                  {prop.predictionValue} {prop.overUnderValue}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className={`${getConfidenceColor(prop.confidence)} font-bold`}>
                {formatConfidence(prop.confidence)}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-gray-300 text-sm">{prop.reasoning}</p>
          </div>
        </div>
      ))}
    </div>
  );
} 