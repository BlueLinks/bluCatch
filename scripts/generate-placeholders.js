import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const games = [
  { id: 'red', name: 'RED', color: '#DC0A2D' },
  { id: 'blue', name: 'BLUE', color: '#0075BE' },
  { id: 'yellow', name: 'YELLOW', color: '#FFCB05' },
  { id: 'gold', name: 'GOLD', color: '#DAA520' },
  { id: 'silver', name: 'SILVER', color: '#C0C0C0' },
  { id: 'crystal', name: 'CRYSTAL', color: '#4FD9FF' },
  { id: 'ruby', name: 'RUBY', color: '#A00000' },
  { id: 'sapphire', name: 'SAPPHIRE', color: '#0070CC' },
  { id: 'emerald', name: 'EMERALD', color: '#00A651' },
  { id: 'firered', name: 'FIRE RED', color: '#FF7327' },
  { id: 'leafgreen', name: 'LEAF GREEN', color: '#00DD00' },
  { id: 'diamond', name: 'DIAMOND', color: '#5199C7' },
  { id: 'pearl', name: 'PEARL', color: '#EE90C8' },
  { id: 'platinum', name: 'PLATINUM', color: '#999999' },
  { id: 'heartgold', name: 'HEART GOLD', color: '#DAA520' },
  { id: 'soulsilver', name: 'SOUL SILVER', color: '#C0C0C0' },
  { id: 'black', name: 'BLACK', color: '#444444' },
  { id: 'white', name: 'WHITE', color: '#E0E0E0' },
  { id: 'black2', name: 'BLACK 2', color: '#0C6C8C' },
  { id: 'white2', name: 'WHITE 2', color: '#F0A284' },
  { id: 'x', name: 'X', color: '#025DA6' },
  { id: 'y', name: 'Y', color: '#EA1A3E' },
  { id: 'omegaruby', name: 'OMEGA RUBY', color: '#AB2813' },
  { id: 'alphasapphire', name: 'ALPHA SAPPHIRE', color: '#0062A3' },
  { id: 'sun', name: 'SUN', color: '#F1912B' },
  { id: 'moon', name: 'MOON', color: '#5599CA' },
  { id: 'ultrasun', name: 'ULTRA SUN', color: '#E95B2B' },
  { id: 'ultramoon', name: 'ULTRA MOON', color: '#226DB5' },
  { id: 'letsgopikachu', name: "LET'S GO PIKACHU", color: '#F5DA26' },
  { id: 'letsgoeevee', name: "LET'S GO EEVEE", color: '#C47547' },
  { id: 'sword', name: 'SWORD', color: '#00A1E9' },
  { id: 'shield', name: 'SHIELD', color: '#BF004F' },
  { id: 'brilliantdiamond', name: 'BRILLIANT DIAMOND', color: '#5199C7' },
  { id: 'shiningpearl', name: 'SHINING PEARL', color: '#EE90C8' },
  { id: 'legendsarceus', name: 'LEGENDS ARCEUS', color: '#36597B' },
  { id: 'scarlet', name: 'SCARLET', color: '#F34134' },
  { id: 'violet', name: 'VIOLET', color: '#8B5DA7' }
];

const boxartDir = path.join(__dirname, '../public/images/boxart');

// Create directory if it doesn't exist
if (!fs.existsSync(boxartDir)) {
  fs.mkdirSync(boxartDir, { recursive: true });
}

games.forEach(game => {
  const textColor = game.id === 'white' || game.id === 'yellow' ? '#000000' : '#FFFFFF';
  const fontSize = game.name.length > 12 ? '18' : game.name.length > 8 ? '22' : '28';
  
  const svg = `<svg width="200" height="280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-${game.id}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${game.color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${adjustBrightness(game.color, -30)};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="200" height="280" fill="url(#grad-${game.id})" rx="8"/>
  <rect x="10" y="10" width="180" height="260" fill="none" stroke="${textColor}" stroke-width="2" rx="5" opacity="0.3"/>
  <text x="100" y="100" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${textColor}" text-anchor="middle" opacity="0.8">POKÉMON</text>
  <text x="100" y="150" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}" text-anchor="middle">${game.name}</text>
</svg>`;

  fs.writeFileSync(path.join(boxartDir, `${game.id}.png`), svg);
  console.log(`Created placeholder for ${game.name}`);
});

function adjustBrightness(color, amount) {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

console.log('All placeholders created successfully!');

