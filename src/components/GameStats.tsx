import { Game } from '@/models/types';

interface GameStatsProps {
  game: Game;
}

export default function GameStats({ game }: GameStatsProps) {
  if (game.sport === 'NBA') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card p-4 rounded-lg">
          <h3 className="text-xl font-bold mb-3">{game.homeTeamName} Key Stats</h3>
          <div className="space-y-2">
            <p className="text-muted-foreground">Points Per Game: 112.5</p>
            <p className="text-muted-foreground">Rebounds Per Game: 45.2</p>
            <p className="text-muted-foreground">Assists Per Game: 25.8</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg">
          <h3 className="text-xl font-bold mb-3">{game.awayTeamName} Key Stats</h3>
          <div className="space-y-2">
            <p className="text-muted-foreground">Points Per Game: 108.3</p>
            <p className="text-muted-foreground">Rebounds Per Game: 42.7</p>
            <p className="text-muted-foreground">Assists Per Game: 23.4</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-card p-4 rounded-lg">
        <h3 className="text-xl font-bold mb-3">{game.homeTeamName} Key Stats</h3>
        <div className="space-y-2">
          <p className="text-muted-foreground">Batting Average: .275</p>
          <p className="text-muted-foreground">ERA: 3.45</p>
          <p className="text-muted-foreground">Runs Per Game: 4.8</p>
        </div>
      </div>
      <div className="bg-card p-4 rounded-lg">
        <h3 className="text-xl font-bold mb-3">{game.awayTeamName} Key Stats</h3>
        <div className="space-y-2">
          <p className="text-muted-foreground">Batting Average: .268</p>
          <p className="text-muted-foreground">ERA: 3.82</p>
          <p className="text-muted-foreground">Runs Per Game: 4.2</p>
        </div>
      </div>
    </div>
  );
} 