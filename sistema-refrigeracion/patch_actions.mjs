import fs from 'fs';
import path from 'path';

const actionsDir = path.join(process.cwd(), 'src', 'actions');
const files = fs.readdirSync(actionsDir).filter(f => f.endsWith('.ts'));

let totalInjected = 0;

for (const file of files) {
    const filePath = path.join(actionsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure we have the import
    if (!content.includes('requerirUsuario')) {
        content = content.replace(/(im\port\s+.*?;\r?\n)/, '$1import { requerirUsuario } from "@/lib/sesion";\n');
    }

    // Match all export async function M(args) { 
    // And if it doesn't immediately have await requerirUsuario()
    // It's a bit tricky with AST, let's use regex that finds the first block opening
    const regex = /export\s+async\s+function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{([\s\S]*?)(?=export|function|$)/g;

    let modified = false;

    // A simpler approach: Just match `try {` after `export async function name() {`
    // Or just find `export async function xyz(...) {\n` and insert `await requerirUsuario();\n`
    
    // Let's parse with simple regex:
    const lines = content.split('\n');
    let insideExportedFunc = false;
    let braceLevel = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.match(/^export\s+async\s+function\s+[a-zA-Z0-9_]+\s*\(/)) {
            // We found a function
            let j = i;
            let foundTry = false;
            // look ahead for the opening brace of function or try block
            while (j < lines.length && j < i + 10) {
                if (lines[j].includes('try {')) {
                    // Check if requerirUsuario is already there
                    if (!lines[j+1].includes('requerirUsuario') && !lines[j+2].includes('requerirUsuario')) {
                        lines.splice(j + 1, 0, '        await requerirUsuario();');
                        modified = true;
                        totalInjected++;
                    }
                    break;
                } else if (lines[j].includes('{') && j === i) {
                    // If no try {} block, we could just inject it at the beginning of the function
                    // Let's assume standard formatting where `try {` is on the next few lines
                }
                j++;
            }
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`Patched ${file}`);
    }
}
console.log(`Total injections: ${totalInjected}`);
