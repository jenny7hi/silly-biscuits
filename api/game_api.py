import base64
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List
from pathlib import Path
from api.game_management import Game, GameInfo, GameState

app = FastAPI(title="Silly Biscuits Game API")

class GameCreate(BaseModel):
    num_players: int

class PlayMove(BaseModel):
    card: str
    location: str = Field(..., pattern='^(hand|public|hidden)$')

@app.post("/games/", response_model=GameInfo)
def create_game(game_data: GameCreate):
    """Create a new game and return its code"""
    if not 1 <= game_data.num_players <= 4:
        raise HTTPException(status_code=400, detail="Number of players must be between 1 and 4")
    
    game = Game(game_data.num_players)
    game_code = game.save_game()
    return game.to_info(game_code)

@app.get("/games/", response_model=List[GameInfo])
def list_games():
    """List all saved games"""
    saves_dir = Path('saves')
    if not saves_dir.exists():
        return []
    
    games = []
    for save_file in saves_dir.glob("game_*.sav"):
        try:
            game_code = base64.urlsafe_b64encode(save_file.name.encode()).decode()
            game = Game.load_game(game_code)
            if game:
                games.append(game.to_info(game_code))
        except Exception:
            continue
    return games

@app.get("/games/{game_code}", response_model=GameInfo)
def get_game(game_code: str):
    """Get information about a specific game"""
    game = Game.load_game(game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return game.to_info(game_code)

@app.get("/games/{game_code}/state", response_model=GameState)
def get_game_state(game_code: str):
    """Get detailed game state for current player"""
    game = Game.load_game(game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return game.to_state(game_code)

@app.post("/games/{game_code}/play")
def play_move(game_code: str, move: PlayMove):
    """Make a move in the specified game"""
    game = Game.load_game(game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Get the current player and validate the move
    player = game.players[game.curr_player]
    card, message = player.can_play(move.card, move.location, len(game.deck))
    
    if not card:
        raise HTTPException(status_code=400, detail=message)
    
    if not game.is_legal_play(card):
        raise HTTPException(status_code=400, detail="Illegal move")
    
    # Make the move
    game.make_play(card, move.location, player)
    game.active.append(card)
    
    # Handle post-move actions
    if len(player.hand) <= 5 and game.deck:
        player.draw(game.deck.pop())
    
    if card.value != 10:
        game.next_player()
        
    # Save updated game state
    game.save_game()
    
    # Return new game state
    return game.to_state(game_code)

@app.delete("/games/{game_code}")
def delete_game(game_code: str):
    """Delete a specific game save"""
    try:
        filename = base64.urlsafe_b64decode(game_code.encode()).decode()
        save_path = Path('saves') / filename
        if save_path.exists():
            save_path.unlink()
            return {"message": "Game deleted successfully"}
        raise HTTPException(status_code=404, detail="Game not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid game code")

@app.delete("/games/")
def delete_all_games():
    """Delete all saved games"""
    saves_dir = Path('saves')
    if not saves_dir.exists():
        return {"message": "No games to delete"}
    
    for save_file in saves_dir.glob("game_*.sav"):
        save_file.unlink()
    return {"message": "All games deleted successfully"}
