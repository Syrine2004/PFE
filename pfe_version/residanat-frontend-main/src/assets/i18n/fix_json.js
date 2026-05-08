const fs = require('fs');
const path = require('path');

function fixJson(filePath) {
    let content = fs.readFileSync(filePath, 'utf8').trim();
    // Replace "} {" with "}, {" to merge multiple root objects
    // This is a hacky way to fix files where multiple objects were appended
    let fixed = content.replace(/\}\s*\{/g, ',\n');
    if (!fixed.startsWith('{')) fixed = '{' + fixed;
    if (!fixed.endsWith('}')) fixed = fixed + '}';
    
    try {
        const obj = JSON.parse(fixed);
        fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
        console.log('Fixed ' + filePath);
    } catch (e) {
        console.error('Failed to fix ' + filePath + ': ' + e.message);
        // Try another approach: find the first } that matches the first {
        // and remove it if there is more content after
    }
}

fixJson(process.argv[2]);
