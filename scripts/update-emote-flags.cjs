const fs = require('node:fs');
const path = require('node:path');

const emotesFilePath = path.join(__dirname, '../src/common/constants/emotes.constant.ts');

function loadEmotes() {
  const fileContent = fs.readFileSync(emotesFilePath, 'utf8');

  const arrayMatch = fileContent.match(/export const EMOTES[^=]*=\s*\[([\s\S]*)\];/);
  if (!arrayMatch) {
    throw new Error('Could not find EMOTES array in the file');
  }

  let arrayContent = arrayMatch[1];

  // Convert TypeScript object syntax to JSON:
  // 1. Add quotes around property names
  arrayContent = arrayContent.replace(/(\w+):/g, '"$1":');
  // 2. Convert single quotes to double quotes for string values
  arrayContent = arrayContent.replace(/'([^']*)'/g, '"$1"');
  // 3. Handle boolean values (keep them unquoted)
  arrayContent = arrayContent.replace(/"(true|false)"/g, '$1');
  // 4. Remove comma before closing brace with any amount of whitespace
  arrayContent = arrayContent.replace(/,(\s*\})/g, '$1');
  // 5. Remove comma at the very end (before closing bracket)
  arrayContent = arrayContent.replace(/,(\s*)$/, '$1');

  const fullArrayContent = `[${arrayContent}]`;

  try {
    return JSON.parse(fullArrayContent);
  } catch (error) {
    console.error('Failed to parse emotes array as JSON');
    console.error('Content preview:', `${fullArrayContent.substring(0, 500)}...`);
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
}

function isMoreThanMonthOld(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  return date < oneMonthAgo;
}

function processEmotes(emotes) {
  let updatedCount = 0;

  const processedEmotes = emotes.map((emote) => {
    const processedEmote = { ...emote };
    let wasUpdated = false;

    if (!('new' in processedEmote)) {
      processedEmote.new = false;
      wasUpdated = true;
    }
    if (!('updated' in processedEmote)) {
      processedEmote.updated = false;
      wasUpdated = true;
    }

    if (isMoreThanMonthOld(emote.lastModified)) {
      if (processedEmote.new) {
        processedEmote.new = false;
        wasUpdated = true;
        console.info(`🔄 Removed 'new' flag from: ${processedEmote.name} (old date: ${emote.lastModified})`);
      }
      if (processedEmote.updated) {
        processedEmote.updated = false;
        wasUpdated = true;
        console.info(`🔄 Removed 'updated' flag from: ${processedEmote.name} (old date: ${emote.lastModified})`);
      }
    }

    if (wasUpdated) {
      updatedCount++;
    }

    return processedEmote;
  });

  return { emotes: processedEmotes, updatedCount };
}

function generateFileContent(emotes) {
  const typeDefinition = '{ lastModified: string; name: string; new: boolean; tier: \'follower\' | \'1\' | \'2\' | \'3\'; updated: boolean; url: string }[]';

  const emotesString = emotes.map((emote) => {
    const lines = ['  {'];

    lines.push(`    lastModified: '${emote.lastModified}',`);
    lines.push(`    name: '${emote.name}',`);
    lines.push(`    new: ${emote.new},`);
    lines.push(`    tier: '${emote.tier}',`);
    lines.push(`    updated: ${emote.updated},`);
    lines.push(`    url: '${emote.url}',`);
    lines.push('  },');

    return lines.join('\n');
  }).join('\n');

  return `export const EMOTES: ${typeDefinition} = [
${emotesString}
];
`;
}

// Main execution
function main() {
  try {
    console.info('Loading emotes...');
    const emotes = loadEmotes();
    console.info(`Found ${emotes.length} emotes`);

    console.info('Processing emotes...');
    const { emotes: processedEmotes, updatedCount } = processEmotes(emotes);

    console.info('Generating new file content...');
    const newContent = generateFileContent(processedEmotes);

    console.info('Writing updated file...');
    fs.writeFileSync(emotesFilePath, newContent, 'utf8');

    console.info(`✅ Successfully processed ${emotes.length} emotes`);
    console.info(`📝 Updated ${updatedCount} emotes`);

    if (updatedCount === 0) {
      console.info('💡 No changes made - all emotes either:');
      console.info('   • Have recent lastModified dates (< 1 month old)');
      console.info('   • Already have the correct new/updated flags');
      console.info('   • Missing flags were added as false (hidden in output)');
    }
  } catch (error) {
    console.error('❌ Error updating emote flags:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
