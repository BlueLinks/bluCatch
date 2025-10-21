# Test curl Commands

## Direct File Access (Works Immediately)

### Test Caterpie (has dual-slot and enhanced data)

```bash
cat public/api/dex/10.json | jq '.'
```

### Caterpie in Red with enhanced Viridian Forest data

```bash
cat public/api/dex/10.json | jq '.games[] | select(.id == "red")'
```

### Caterpie in Platinum with dual-slot

```bash
cat public/api/dex/10.json | jq '.games[] | select(.id == "platinum")'
```

### Moltres with Mt. Ember special encounter

```bash
cat public/api/dex/146.json | jq '.games[] | select(.id == "firered")'
```

### Check for enhanced fields

```bash
cat public/api/dex/10.json | jq '.games[].locations[] | select(.rate != null)'
```

## With Dev Server (npm run dev)

### Start server first

```bash
npm run dev
```

### Then in another terminal:

#### Main dex endpoint

```bash
curl http://localhost:5173/api/dex.json | jq '.pokemon | length'
```

#### Caterpie full data

```bash
curl http://localhost:5173/api/dex/10.json | jq '.'
```

#### Caterpie enhanced encounters only

```bash
curl http://localhost:5173/api/dex/10.json | jq '[.games[].locations[] | select(.rate != null)]'
```

#### Moltres data

```bash
curl http://localhost:5173/api/dex/146.json | jq '.games[] | select(.id == "firered") | .locations'
```

#### Find all Pokemon with enhanced data

```bash
for i in {1..20}; do
  curl -s http://localhost:5173/api/dex/$i.json | jq -r "select(.games[].locations[]?.rate != null) | \"#\(.id) \(.name) has enhanced data\""
done
```

## Database Direct Queries

### All enhanced encounters

```bash
sqlite3 -header -column public/data/pokemon.db "
SELECT p.name, g.name as game, e.location, e.encounter_area, e.level_range, e.encounter_rate
FROM encounters e
JOIN pokemon p ON e.pokemon_id = p.id
JOIN games g ON e.game_id = g.id
WHERE e.location_id IS NOT NULL
LIMIT 20;"
```

### Moltres encounters

```bash
sqlite3 -header -column public/data/pokemon.db "
SELECT p.name, g.name as game, l.name as location, e.encounter_area, e.level_range, e.encounter_rate
FROM encounters e
JOIN pokemon p ON e.pokemon_id = p.id
JOIN games g ON e.game_id = g.id
LEFT JOIN locations l ON e.location_id = l.id
WHERE p.id = 146;"
```

### Dual-slot encounters

```bash
sqlite3 -header -column public/data/pokemon.db "
SELECT p.name, g.name as game, e.location, e.special_requirements
FROM encounters e
JOIN pokemon p ON e.pokemon_id = p.id
JOIN games g ON e.game_id = g.id
WHERE e.special_requirements IS NOT NULL
LIMIT 10;"
```

### Viridian Forest encounters

```bash
sqlite3 -header -column public/data/pokemon.db "
SELECT p.name, g.name as game, e.encounter_area, e.level_range, e.encounter_rate
FROM encounters e
JOIN pokemon p ON e.pokemon_id = p.id
JOIN games g ON e.game_id = g.id
WHERE e.location_id = 'kanto-viridian-forest'
ORDER BY p.id, g.id;"
```

### Mt. Ember encounters

```bash
sqlite3 -header -column public/data/pokemon.db "
SELECT p.name, g.name as game, e.encounter_area, e.level_range, e.encounter_rate
FROM encounters e
JOIN pokemon p ON e.pokemon_id = p.id
JOIN games g ON e.game_id = g.id
WHERE e.location_id = 'kanto-mt-ember'
ORDER BY p.id, g.id;"
```

## Expected Output Examples

### Caterpie Red Enhanced

```json
{
	"location": "Viridian Forest",
	"locationName": "Viridian Forest",
	"region": "kanto",
	"locationType": "forest",
	"area": "grass",
	"rate": "5%",
	"levels": "3"
}
```

### Caterpie Platinum Dual-Slot

```json
{
	"location": "Route 204",
	"specialRequirements": {
		"dualSlot": "firered"
	}
}
```

### Moltres FireRed Special

```json
{
	"location": "Mt. Ember",
	"locationName": "Mt. Ember",
	"region": "kanto",
	"locationType": "mountain",
	"area": "special",
	"rate": "One time only",
	"levels": "50"
}
```

## Quick Verification

```bash
# Count enhanced encounters
sqlite3 public/data/pokemon.db "SELECT COUNT(*) FROM encounters WHERE location_id IS NOT NULL;"

# Count locations discovered
sqlite3 public/data/pokemon.db "SELECT COUNT(*) FROM locations;"

# Show location types
sqlite3 public/data/pokemon.db "SELECT location_type, COUNT(*) FROM locations GROUP BY location_type;"
```
