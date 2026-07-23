const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'app/components/OrderList.tsx',
    'app/components/OrderNotes.tsx',
    'app/components/OrderStock.tsx',
    'app/components/OtherExpenses.tsx'
];

const swalImport = `import Swal from 'sweetalert2';\nimport withReactContent from 'sweetalert2-react-content';\nconst MySwal = withReactContent(Swal);\n\n`;

for (const relPath of filesToUpdate) {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) {
        console.error(`File not found: ${fullPath}`);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let hasChanges = false;

    // We can't just replace `confirm(` with `await MySwal.fire({ ... })` trivially if the function isn't async,
    // or we'd have to rewrite sync flow to async.
    // Instead of regex, let's just log where they are and we will replace them manually via tool.
    console.log(`--- ${relPath} ---`);
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('confirm(') || line.includes('alert(')) {
            console.log(`${i + 1}: ${line.trim()}`);
        }
    });
}
