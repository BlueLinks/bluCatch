import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Platform mapping for each game
const GAME_PLATFORMS = {
  'red': 'gb',
  'blue': 'gb',
  'yellow': 'gbc',
  'gold': 'gbc',
  'silver': 'gbc',
  'crystal': 'gbc',
  'ruby': 'gba',
  'sapphire': 'gba',
  'emerald': 'gba',
  'firered': 'gba',
  'leafgreen': 'gba',
  'diamond': 'nds',
  'pearl': 'nds',
  'platinum': 'nds',
  'heartgold': 'nds',
  'soulsilver': 'nds',
  'black': 'nds',
  'white': 'nds',
  'black2': 'nds',
  'white2': 'nds',
  'x': '3ds',
  'y': '3ds',
  'omegaruby': '3ds',
  'alphasapphire': '3ds',
  'sun': '3ds',
  'moon': '3ds',
  'ultrasun': '3ds',
  'ultramoon': '3ds',
  'letsgopikachu': 'switch',
  'letsgoeevee': 'switch',
  'sword': 'switch',
  'shield': 'switch',
  'brilliantdiamond': 'switch',
  'shiningpearl': 'switch',
  'legendsarceus': 'switch',
  'scarlet': 'switch',
  'violet': 'switch'
};

function main() {
  console.log('=== Adding Platform Information to Games ===\n');
  
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  if (!fs.existsSync(gamesPath)) {
    console.error('❌ games.json not found');
    process.exit(1);
  }
  
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  
  // Backup
  const backupPath = gamesPath.replace('.json', '.before-platforms.json');
  fs.copyFileSync(gamesPath, backupPath);
  console.log(`📋 Backup saved to ${backupPath}\n`);
  
  // Add platform to each game
  let updated = 0;
  gamesData.games.forEach(game => {
    if (GAME_PLATFORMS[game.id]) {
      game.platform = GAME_PLATFORMS[game.id];
      updated++;
      console.log(`  ${game.name}: ${GAME_PLATFORMS[game.id].toUpperCase()}`);
    } else {
      console.log(`  ⚠️  ${game.name}: No platform mapping found`);
    }
  });
  
  // Save
  fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
  console.log(`\n📝 Updated ${gamesPath}`);
  console.log(`✅ Added platform info to ${updated} games`);
  
  // Stats by platform
  console.log('\n📊 Games by Platform:');
  const platformCounts = {};
  gamesData.games.forEach(game => {
    const platform = game.platform || 'unknown';
    platformCounts[platform] = (platformCounts[platform] || 0) + 1;
  });
  
  Object.entries(platformCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([platform, count]) => {
    const platformName = {
      'gb': 'Game Boy',
      'gbc': 'Game Boy Color',
      'gba': 'Game Boy Advance',
      'nds': 'Nintendo DS',
      '3ds': 'Nintendo 3DS',
      'switch': 'Nintendo Switch',
      'unknown': 'Unknown'
    }[platform] || platform;
    
    console.log(`  ${platformName}: ${count} games`);
  });
}

main();

