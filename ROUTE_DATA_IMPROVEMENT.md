# Route & Location Data Improvement Plan

## Investigation Summary

### Key Finding: Bulbapedia Has an API! ✅

Bulbapedia runs on MediaWiki and provides the **MediaWiki API**:

-   **Endpoint:** `https://bulbapedia.bulbagarden.net/w/api.php`
-   **Current Usage:** The scraper (`scripts/scrape-bulbapedia.js`) already uses this API
-   **Format:** Returns parsed HTML in JSON format

### Route Pages Have Better Structured Data

**Example:** Sinnoh Route 204

-   URL: `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&format=json&page=Sinnoh_Route_204`
-   Contains explicit dual-slot markers with game requirements
-   Structured encounter tables with:
    -   Pokemon names
    -   Game versions (Diamond, Pearl, Platinum, etc.)
    -   Encounter methods (wild, surf, dual-slot, etc.)
    -   Encounter rates and levels

**HTML Structure Example:**

```html
<td>
	<a href="/wiki/Dual-slot_mode" title="Dual-slot mode">Dual-slot</a>
	<br />
	<small><a href="/wiki/Pokémon_FireRed_and_LeafGreen_Versions">FireRed</a></small>
</td>
```

## Current vs. Improved Approach

### Current Approach (Pokemon Pages)

**Query:** `page=Caterpie_(Pokémon)`

**Data Format:**

```
Red: Route 25, Viridian Forest
Blue: Routes 2, 24, and 25, Viridian Forest
Diamond: Route 204 (FireRed)
Pearl: Route 204 (FireRed)
Platinum: Route 204, Eterna Forest (FireRed)
```

**Problems:**

-   Location string parsing is fragile
-   Dual-slot info embedded in parentheses as text
-   Multiple locations concatenated
-   Hard to extract structured data

### Improved Approach (Route Pages)

**Query:** `page=Sinnoh_Route_204`

**Data Structure:** (Encounter tables with explicit markup)

-   Separate rows for each encounter
-   Explicit "Dual-slot mode" links
-   Game requirements clearly labeled
-   Encounter rates and levels included
-   Time of day / season information
-   Separate tables for grass, surf, fishing, etc.

**Benefits:**

-   Explicit dual-slot indicators (not just text)
-   Cleaner parsing with DOM selectors
-   More metadata available (rates, levels, times)
-   Can validate against multiple sources

## Recommended Database Schema

### Option 1: Enhanced Current Format

```json
{
	"id": "platinum",
	"pokemon": [
		{
			"id": 10,
			"encounters": [
				{
					"location": "Route 204",
					"locationId": "sinnoh-route-204",
					"method": "wild",
					"area": "grass",
					"requirements": {
						"dualSlot": "firered"
					},
					"metadata": {
						"level": "5-6",
						"rate": "8%"
					}
				}
			]
		}
	]
}
```

### Option 2: Location-First Database

**locations.json:**

```json
{
	"locations": [
		{
			"id": "sinnoh-route-204",
			"name": "Sinnoh Route 204",
			"region": "sinnoh",
			"generation": 4,
			"bulbapediaPage": "Sinnoh_Route_204",
			"games": ["diamond", "pearl", "platinum", "brilliantdiamond", "shiningpearl"]
		}
	]
}
```

**encounters.json:**

```json
{
	"encounters": [
		{
			"pokemonId": 10,
			"locationId": "sinnoh-route-204",
			"games": {
				"platinum": {
					"method": "wild",
					"area": "grass",
					"level": "5-6",
					"rate": "8%",
					"requirements": {
						"dualSlot": "firered"
					}
				}
			}
		}
	]
}
```

## Implementation Strategy

### Phase 1: Immediate Fix ✅ DONE

-   Added dual-slot pattern detection to `src/utils/calculator.js`
-   Detects patterns: `(FireRed)`, `(LeafGreen)`, `(Ruby)`, `(Sapphire)`, `(Emerald)`, `(Any Gen III game)`
-   Integrates with existing "Dual-Slot Mode" filter
-   Build successful, all tests pass

### Phase 2: Data Structure Enhancement

1. **Extract Location List**

    - Parse all location strings from `games.json`
    - Create unique location IDs
    - Build `locations.json` database
    - Link to Bulbapedia pages where available

2. **Query Route Pages**

    - For each location, query its Bulbapedia page
    - Parse encounter tables
    - Extract structured encounter data
    - Validate against existing data

3. **Migrate to New Format**
    - Convert string-based locations to structured encounters
    - Add metadata (levels, rates, methods, requirements)
    - Preserve backward compatibility during transition
    - Update calculator.js to use new format

### Phase 3: Enhanced Features

With structured location data, enable:

-   **Filter by location type** (routes, caves, cities, etc.)
-   **Filter by encounter method** (grass, surf, fish, special)
-   **Show encounter rates** for each Pokemon
-   **Level range display** for wild encounters
-   **Time/season requirements** (morning, day, night, seasons)
-   **Location-based search** ("Show all Pokemon on Route 1")
-   **Cross-referencing** ("Which routes have Pikachu?")

## MediaWiki API Usage Examples

### Get Pokemon Page

```
GET https://bulbapedia.bulbagarden.net/w/api.php
  ?action=parse
  &format=json
  &page=Caterpie_(Pokémon)
  &prop=text
  &section=7          # Section 7 is "Game locations"
```

### Get Route Page

```
GET https://bulbapedia.bulbagarden.net/w/api.php
  ?action=parse
  &format=json
  &page=Sinnoh_Route_204
```

### Get Page Sections

```
GET https://bulbapedia.bulbagarden.net/w/api.php
  ?action=parse
  &format=json
  &page=Caterpie_(Pokémon)
  &prop=sections
```

## Example: Parsing Route Page for Dual-Slot Encounters

```javascript
async function getRouteDualSlotEncounters(routeName) {
	const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&format=json&page=${encodeURIComponent(
		routeName
	)}`;
	const response = await fetch(url);
	const data = await response.json();
	const html = data.parse.text["*"];

	const dom = new JSDOM(html);
	const document = dom.window.document;

	// Find all cells with dual-slot links
	const dualSlotLinks = document.querySelectorAll('a[title="Dual-slot mode"]');

	const encounters = [];
	dualSlotLinks.forEach((link) => {
		const cell = link.closest("td");
		const row = cell.closest("tr");

		// Get game requirement from the link's parent cell
		const gameMatch = cell.textContent.match(/(FireRed|LeafGreen|Ruby|Sapphire|Emerald)/);

		// Get Pokemon name from earlier in the row
		const pokemonLink = row.querySelector('a[title*="(Pokémon)"]');

		if (gameMatch && pokemonLink) {
			const pokemonName = pokemonLink.getAttribute("title").replace(" (Pokémon)", "");
			const requirement = gameMatch[1].toLowerCase();

			encounters.push({
				pokemon: pokemonName,
				location: routeName,
				method: "dual-slot",
				requirement: requirement,
			});
		}
	});

	return encounters;
}
```

## Benefits of Route-Based Approach

1. **Better Data Quality**

    - Explicit markers instead of text parsing
    - Reduced ambiguity
    - Easier to validate

2. **More Metadata**

    - Encounter rates
    - Level ranges
    - Time/season requirements
    - Method-specific data (fishing rod types, etc.)

3. **Easier Maintenance**

    - Single source of truth per location
    - Update one route page → affects all Pokemon
    - Validation against route data

4. **Enhanced Features**

    - Location-based filtering and search
    - Better user experience with detailed info
    - Pokédex-style completion tracking per route

5. **API Efficiency**
    - Fewer API calls (query routes, not every Pokemon)
    - Can cache route data
    - Batch processing of encounters

## Next Steps

1. ✅ **Immediate** - Dual-slot detection fix (DONE)
2. **Short-term** - Extract location list from existing data
3. **Medium-term** - Build location database
4. **Long-term** - Query route pages and migrate to structured format

## Resources

-   [MediaWiki API Documentation](https://www.mediawiki.org/wiki/API:Main_page)
-   [Bulbapedia API Endpoint](https://bulbapedia.bulbagarden.net/w/api.php)
-   [Dual-slot mode (Bulbapedia)](https://bulbapedia.bulbagarden.net/wiki/Dual-slot_mode)
-   [Example Route Page](https://bulbapedia.bulbagarden.net/wiki/Sinnoh_Route_204)

## Conclusion

The immediate dual-slot fix is complete and working. The route-based approach offers significant improvements for future development:

-   **Better data structure** - Explicit metadata instead of string parsing
-   **More features** - Location-based search, encounter rates, level ranges
-   **Easier maintenance** - Single source of truth per location
-   **API already available** - MediaWiki API provides everything we need

The foundation is in place for a more robust, feature-rich Pokémon availability tracker!
