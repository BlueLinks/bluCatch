import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Essential Pokémon to add (starters, legendaries, mythicals, gifts)
const ESSENTIAL_POKEMON = {
  // Gen 1 games
  'red': [
    { id: 1, location: 'Starter from Professor Oak' },
    { id: 2, location: 'Evolve Bulbasaur' },
    { id: 3, location: 'Evolve Ivysaur' },
    { id: 4, location: 'Starter from Professor Oak' },
    { id: 5, location: 'Evolve Charmander' },
    { id: 6, location: 'Evolve Charmeleon' },
    { id: 7, location: 'Starter from Professor Oak' },
    { id: 8, location: 'Evolve Squirtle' },
    { id: 9, location: 'Evolve Wartortle' },
    { id: 144, location: 'Seafoam Islands' },
    { id: 145, location: 'Power Plant' },
    { id: 146, location: 'Victory Road' },
    { id: 150, location: 'Cerulean Cave' }
  ],
  'blue': [
    { id: 1, location: 'Starter from Professor Oak' },
    { id: 2, location: 'Evolve Bulbasaur' },
    { id: 3, location: 'Evolve Ivysaur' },
    { id: 4, location: 'Starter from Professor Oak' },
    { id: 5, location: 'Evolve Charmander' },
    { id: 6, location: 'Evolve Charmeleon' },
    { id: 7, location: 'Starter from Professor Oak' },
    { id: 8, location: 'Evolve Squirtle' },
    { id: 9, location: 'Evolve Wartortle' },
    { id: 144, location: 'Seafoam Islands' },
    { id: 145, location: 'Power Plant' },
    { id: 146, location: 'Victory Road' },
    { id: 150, location: 'Cerulean Cave' }
  ],
  'yellow': [
    { id: 1, location: 'Gift in Cerulean City' },
    { id: 2, location: 'Evolve Bulbasaur' },
    { id: 3, location: 'Evolve Ivysaur' },
    { id: 4, location: 'Gift on Route 24' },
    { id: 5, location: 'Evolve Charmander' },
    { id: 6, location: 'Evolve Charmeleon' },
    { id: 7, location: 'Gift in Vermilion City' },
    { id: 8, location: 'Evolve Squirtle' },
    { id: 9, location: 'Evolve Wartortle' },
    { id: 25, location: 'Starter from Professor Oak' },
    { id: 144, location: 'Seafoam Islands' },
    { id: 145, location: 'Power Plant' },
    { id: 146, location: 'Victory Road' },
    { id: 150, location: 'Cerulean Cave' },
    { id: 151, location: 'Event exclusive' }
  ],
  
  // Gen 2 games
  'gold': [
    { id: 152, location: 'Starter from Professor Elm' },
    { id: 153, location: 'Evolve Chikorita' },
    { id: 154, location: 'Evolve Bayleef' },
    { id: 155, location: 'Starter from Professor Elm' },
    { id: 156, location: 'Evolve Cyndaquil' },
    { id: 157, location: 'Evolve Quilava' },
    { id: 158, location: 'Starter from Professor Elm' },
    { id: 159, location: 'Evolve Totodile' },
    { id: 160, location: 'Evolve Croconaw' },
    { id: 243, location: 'Roaming Johto' },
    { id: 244, location: 'Burned Tower' },
    { id: 245, location: 'Tin Tower' },
    { id: 249, location: 'Whirl Islands' },
    { id: 250, location: 'Tin Tower' },
    { id: 251, location: 'Event exclusive' }
  ],
  'silver': [
    { id: 152, location: 'Starter from Professor Elm' },
    { id: 153, location: 'Evolve Chikorita' },
    { id: 154, location: 'Evolve Bayleef' },
    { id: 155, location: 'Starter from Professor Elm' },
    { id: 156, location: 'Evolve Cyndaquil' },
    { id: 157, location: 'Evolve Quilava' },
    { id: 158, location: 'Starter from Professor Elm' },
    { id: 159, location: 'Evolve Totodile' },
    { id: 160, location: 'Evolve Croconaw' },
    { id: 243, location: 'Roaming Johto' },
    { id: 244, location: 'Burned Tower' },
    { id: 245, location: 'Tin Tower' },
    { id: 249, location: 'Whirl Islands' },
    { id: 250, location: 'Bell Tower' },
    { id: 251, location: 'Event exclusive' }
  ],
  'crystal': [
    { id: 152, location: 'Starter from Professor Elm' },
    { id: 153, location: 'Evolve Chikorita' },
    { id: 154, location: 'Evolve Bayleef' },
    { id: 155, location: 'Starter from Professor Elm' },
    { id: 156, location: 'Evolve Cyndaquil' },
    { id: 157, location: 'Evolve Quilava' },
    { id: 158, location: 'Starter from Professor Elm' },
    { id: 159, location: 'Evolve Totodile' },
    { id: 160, location: 'Evolve Croconaw' },
    { id: 243, location: 'Roaming Johto' },
    { id: 244, location: 'Burned Tower' },
    { id: 245, location: 'Roaming Johto' },
    { id: 249, location: 'Whirl Islands' },
    { id: 250, location: 'Tin Tower' },
    { id: 251, location: 'Ilex Forest (event)' }
  ],
  
  // Gen 3 games
  'ruby': [
    { id: 252, location: 'Starter from Professor Birch' },
    { id: 253, location: 'Evolve Treecko' },
    { id: 254, location: 'Evolve Grovyle' },
    { id: 255, location: 'Starter from Professor Birch' },
    { id: 256, location: 'Evolve Torchic' },
    { id: 257, location: 'Evolve Combusken' },
    { id: 258, location: 'Starter from Professor Birch' },
    { id: 259, location: 'Evolve Mudkip' },
    { id: 260, location: 'Evolve Marshtomp' },
    { id: 377, location: 'Desert Ruins' },
    { id: 378, location: 'Island Cave' },
    { id: 379, location: 'Tomb' },
    { id: 380, location: 'Roaming Hoenn' },
    { id: 382, location: 'Cave of Origin' },
    { id: 383, location: 'Cave of Origin' },
    { id: 384, location: 'Sky Pillar' },
    { id: 385, location: 'Event exclusive' },
    { id: 386, location: 'Event exclusive' }
  ],
  'sapphire': [
    { id: 252, location: 'Starter from Professor Birch' },
    { id: 253, location: 'Evolve Treecko' },
    { id: 254, location: 'Evolve Grovyle' },
    { id: 255, location: 'Starter from Professor Birch' },
    { id: 256, location: 'Evolve Torchic' },
    { id: 257, location: 'Evolve Combusken' },
    { id: 258, location: 'Starter from Professor Birch' },
    { id: 259, location: 'Evolve Mudkip' },
    { id: 260, location: 'Evolve Marshtomp' },
    { id: 377, location: 'Desert Ruins' },
    { id: 378, location: 'Island Cave' },
    { id: 379, location: 'Tomb' },
    { id: 381, location: 'Roaming Hoenn' },
    { id: 382, location: 'Cave of Origin' },
    { id: 383, location: 'Cave of Origin' },
    { id: 384, location: 'Sky Pillar' },
    { id: 385, location: 'Event exclusive' },
    { id: 386, location: 'Event exclusive' }
  ],
  'emerald': [
    { id: 252, location: 'Starter from Professor Birch' },
    { id: 253, location: 'Evolve Treecko' },
    { id: 254, location: 'Evolve Grovyle' },
    { id: 255, location: 'Starter from Professor Birch' },
    { id: 256, location: 'Evolve Torchic' },
    { id: 257, location: 'Evolve Combusken' },
    { id: 258, location: 'Starter from Professor Birch' },
    { id: 259, location: 'Evolve Mudkip' },
    { id: 260, location: 'Evolve Marshtomp' },
    { id: 377, location: 'Desert Ruins' },
    { id: 378, location: 'Island Cave' },
    { id: 379, location: 'Tomb' },
    { id: 380, location: 'Roaming Hoenn' },
    { id: 381, location: 'Roaming Hoenn' },
    { id: 382, location: 'Cave of Origin' },
    { id: 383, location: 'Marine Cave / Terra Cave' },
    { id: 384, location: 'Sky Pillar' },
    { id: 385, location: 'Event exclusive' },
    { id: 386, location: 'Birth Island (event)' }
  ],
  'firered': [
    { id: 1, location: 'Starter from Professor Oak' },
    { id: 2, location: 'Evolve Bulbasaur' },
    { id: 3, location: 'Evolve Ivysaur' },
    { id: 4, location: 'Starter from Professor Oak' },
    { id: 5, location: 'Evolve Charmander' },
    { id: 6, location: 'Evolve Charmeleon' },
    { id: 7, location: 'Starter from Professor Oak' },
    { id: 8, location: 'Evolve Squirtle' },
    { id: 9, location: 'Evolve Wartortle' },
    { id: 144, location: 'Seafoam Islands' },
    { id: 145, location: 'Power Plant' },
    { id: 146, location: 'Mt. Ember' },
    { id: 150, location: 'Cerulean Cave' },
    { id: 151, location: 'Event exclusive' },
    { id: 243, location: 'Roaming Kanto' },
    { id: 244, location: 'Event exclusive' },
    { id: 245, location: 'Event exclusive' },
    { id: 249, location: 'Navel Rock (event)' },
    { id: 250, location: 'Navel Rock (event)' },
    { id: 251, location: 'Event exclusive' },
    { id: 380, location: 'Roaming Kanto' },
    { id: 385, location: 'Event exclusive' },
    { id: 386, location: 'Event exclusive' }
  ],
  'leafgreen': [
    { id: 1, location: 'Starter from Professor Oak' },
    { id: 2, location: 'Evolve Bulbasaur' },
    { id: 3, location: 'Evolve Ivysaur' },
    { id: 4, location: 'Starter from Professor Oak' },
    { id: 5, location: 'Evolve Charmander' },
    { id: 6, location: 'Evolve Charmeleon' },
    { id: 7, location: 'Starter from Professor Oak' },
    { id: 8, location: 'Evolve Squirtle' },
    { id: 9, location: 'Evolve Wartortle' },
    { id: 144, location: 'Seafoam Islands' },
    { id: 145, location: 'Power Plant' },
    { id: 146, location: 'Mt. Ember' },
    { id: 150, location: 'Cerulean Cave' },
    { id: 151, location: 'Event exclusive' },
    { id: 243, location: 'Roaming Kanto' },
    { id: 244, location: 'Event exclusive' },
    { id: 245, location: 'Event exclusive' },
    { id: 249, location: 'Navel Rock (event)' },
    { id: 250, location: 'Navel Rock (event)' },
    { id: 251, location: 'Event exclusive' },
    { id: 381, location: 'Roaming Kanto' },
    { id: 385, location: 'Event exclusive' },
    { id: 386, location: 'Event exclusive' }
  ],
  
  // Gen 4 - Diamond/Pearl/Platinum
  'diamond': [
    { id: 387, location: 'Starter from Professor Rowan' },
    { id: 388, location: 'Evolve Turtwig' },
    { id: 389, location: 'Evolve Grotle' },
    { id: 390, location: 'Starter from Professor Rowan' },
    { id: 391, location: 'Evolve Chimchar' },
    { id: 392, location: 'Evolve Monferno' },
    { id: 393, location: 'Starter from Professor Rowan' },
    { id: 394, location: 'Evolve Piplup' },
    { id: 395, location: 'Evolve Prinplup' },
    { id: 480, location: 'Lake Verity' },
    { id: 481, location: 'Lake Acuity' },
    { id: 482, location: 'Lake Valor' },
    { id: 483, location: 'Spear Pillar' },
    { id: 484, location: 'Spear Pillar' },
    { id: 485, location: 'Stark Mountain' },
    { id: 486, location: 'Snowpoint Temple' },
    { id: 487, location: 'Turnback Cave' },
    { id: 488, location: 'Fullmoon Island' },
    { id: 489, location: 'Event exclusive' },
    { id: 490, location: 'Event exclusive' },
    { id: 491, location: 'Event exclusive' },
    { id: 492, location: 'Event exclusive' },
    { id: 493, location: 'Event exclusive' }
  ],
  'pearl': [
    { id: 387, location: 'Starter from Professor Rowan' },
    { id: 388, location: 'Evolve Turtwig' },
    { id: 389, location: 'Evolve Grotle' },
    { id: 390, location: 'Starter from Professor Rowan' },
    { id: 391, location: 'Evolve Chimchar' },
    { id: 392, location: 'Evolve Monferno' },
    { id: 393, location: 'Starter from Professor Rowan' },
    { id: 394, location: 'Evolve Piplup' },
    { id: 395, location: 'Evolve Prinplup' },
    { id: 480, location: 'Lake Verity' },
    { id: 481, location: 'Lake Acuity' },
    { id: 482, location: 'Lake Valor' },
    { id: 483, location: 'Spear Pillar' },
    { id: 484, location: 'Spear Pillar' },
    { id: 485, location: 'Stark Mountain' },
    { id: 486, location: 'Snowpoint Temple' },
    { id: 487, location: 'Turnback Cave' },
    { id: 488, location: 'Fullmoon Island' },
    { id: 489, location: 'Event exclusive' },
    { id: 490, location: 'Event exclusive' },
    { id: 491, location: 'Event exclusive' },
    { id: 492, location: 'Event exclusive' },
    { id: 493, location: 'Event exclusive' }
  ],
  'platinum': [
    { id: 387, location: 'Starter from Professor Rowan' },
    { id: 388, location: 'Evolve Turtwig' },
    { id: 389, location: 'Evolve Grotle' },
    { id: 390, location: 'Starter from Professor Rowan' },
    { id: 391, location: 'Evolve Chimchar' },
    { id: 392, location: 'Evolve Monferno' },
    { id: 393, location: 'Starter from Professor Rowan' },
    { id: 394, location: 'Evolve Piplup' },
    { id: 395, location: 'Evolve Prinplup' },
    { id: 480, location: 'Lake Verity' },
    { id: 481, location: 'Lake Acuity' },
    { id: 482, location: 'Lake Valor' },
    { id: 483, location: 'Spear Pillar' },
    { id: 484, location: 'Distortion World' },
    { id: 485, location: 'Stark Mountain' },
    { id: 486, location: 'Snowpoint Temple' },
    { id: 487, location: 'Turnback Cave' },
    { id: 488, location: 'Fullmoon Island' },
    { id: 489, location: 'Event exclusive' },
    { id: 490, location: 'Event exclusive' },
    { id: 491, location: 'Event exclusive' },
    { id: 492, location: 'Event exclusive' },
    { id: 493, location: 'Hall of Origin (event)' }
  ],
  
  // Add more games as needed...
  // For brevity, I'll add key ones
  
  'sword': [
    { id: 810, location: 'Starter from Leon' },
    { id: 811, location: 'Evolve Grookey' },
    { id: 812, location: 'Evolve Thwackey' },
    { id: 813, location: 'Starter from Leon' },
    { id: 814, location: 'Evolve Scorbunny' },
    { id: 815, location: 'Evolve Raboot' },
    { id: 816, location: 'Starter from Leon' },
    { id: 817, location: 'Evolve Sobble' },
    { id: 818, location: 'Evolve Drizzile' },
    { id: 888, location: 'Slumbering Weald' },
    { id: 889, location: 'Slumbering Weald' },
    { id: 890, location: 'Slumbering Weald' }
  ],
  'shield': [
    { id: 810, location: 'Starter from Leon' },
    { id: 811, location: 'Evolve Grookey' },
    { id: 812, location: 'Evolve Thwackey' },
    { id: 813, location: 'Starter from Leon' },
    { id: 814, location: 'Evolve Scorbunny' },
    { id: 815, location: 'Evolve Raboot' },
    { id: 816, location: 'Starter from Leon' },
    { id: 817, location: 'Evolve Sobble' },
    { id: 818, location: 'Evolve Drizzile' },
    { id: 888, location: 'Slumbering Weald' },
    { id: 889, location: 'Slumbering Weald' },
    { id: 890, location: 'Slumbering Weald' }
  ],
  
  'scarlet': [
    { id: 906, location: 'Starter from Nemona' },
    { id: 907, location: 'Evolve Sprigatito' },
    { id: 908, location: 'Evolve Floragato' },
    { id: 909, location: 'Starter from Nemona' },
    { id: 910, location: 'Evolve Fuecoco' },
    { id: 911, location: 'Evolve Crocalor' },
    { id: 912, location: 'Starter from Nemona' },
    { id: 913, location: 'Evolve Quaxly' },
    { id: 914, location: 'Evolve Quaxwell' }
  ],
  'violet': [
    { id: 906, location: 'Starter from Nemona' },
    { id: 907, location: 'Evolve Sprigatito' },
    { id: 908, location: 'Evolve Floragato' },
    { id: 909, location: 'Starter from Nemona' },
    { id: 910, location: 'Evolve Fuecoco' },
    { id: 911, location: 'Evolve Crocalor' },
    { id: 912, location: 'Starter from Nemona' },
    { id: 913, location: 'Evolve Quaxly' },
    { id: 914, location: 'Evolve Quaxwell' }
  ]
};

function mergePokemon(gameId, essentialList, existingList) {
  const existingIds = new Set(existingList.map(p => p.id));
  const toAdd = essentialList.filter(p => !existingIds.has(p.id));
  
  if (toAdd.length > 0) {
    existingList.push(...toAdd);
    existingList.sort((a, b) => a.id - b.id);
    console.log(`  Added ${toAdd.length} essential Pokémon to ${gameId}`);
  }
  
  return existingList;
}

function main() {
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  if (!fs.existsSync(gamesPath)) {
    console.error('❌ games.json not found');
    process.exit(1);
  }
  
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  
  console.log('Adding essential Pokémon (starters, legendaries, etc.)...\n');
  
  let totalAdded = 0;
  
  gamesData.games.forEach(game => {
    if (ESSENTIAL_POKEMON[game.id]) {
      const before = game.pokemon.length;
      game.pokemon = mergePokemon(game.id, ESSENTIAL_POKEMON[game.id], game.pokemon);
      totalAdded += (game.pokemon.length - before);
    }
  });
  
  // Backup
  const backupPath = gamesPath.replace('.json', '.before-essential.json');
  fs.copyFileSync(gamesPath, backupPath);
  console.log(`\n📋 Backup saved to ${backupPath}`);
  
  // Save
  fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
  console.log(`📝 Updated ${gamesPath}`);
  console.log(`\n✅ Added ${totalAdded} essential Pokémon across all games`);
  
  // Stats
  console.log('\n📊 Updated Pokémon counts:');
  gamesData.games.forEach(game => {
    console.log(`  ${game.name}: ${game.pokemon.length} Pokémon`);
  });
}

main();

