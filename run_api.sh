# Create saves directory if it doesn't exist
mkdir -p saves
uvicorn api.game_api:app --reload --host 0.0.0.0 --port 8000
