DELETE FROM games 
WHERE id NOT IN (SELECT game_id FROM user_games);
