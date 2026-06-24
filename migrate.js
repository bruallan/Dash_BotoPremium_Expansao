const fs = require('fs');

// 1. Clean App.tsx
let appStr = fs.readFileSync('src/App.tsx', 'utf8');

// We need to import ExpansaoDashboard
appStr = appStr.replace("import { FinancialSector } from './components/sectors/FinancialSector';", "import { FinancialSector } from './components/sectors/FinancialSector';\nimport { ExpansaoDashboard } from './components/sectors/ExpansaoDashboard';");

// We need to remove the View* components from App.tsx. They span from line 19 to 955.
// Let's use regex to find where `export default function App()` starts and cut everything before it, keeping imports.
const appStartIdx = appStr.indexOf('export default function App() {');
const importsEndIdx = appStr.indexOf('\nconst ViewLogs');
if (importsEndIdx !== -1 && appStartIdx !== -1) {
    const imports = appStr.substring(0, importsEndIdx);
    const restOfApp = appStr.substring(appStartIdx);
    appStr = imports + '\n\n' + restOfApp;
}

// Inside App.tsx, we need to remove the Expansao logic.
// That is harder via string replacement. Let's just rewrite App.tsx completely.
const cleanAppStr = `import React, { useState, useEffect } from 'react';
import RegionaisDashboard from './components/RegionaisDashboard';
import DesenvolvimentoDashboard from './components/DesenvolvimentoDashboard';
import FranqueadoDashboard from './components/FranqueadoDashboard';
import { SectorSelection } from './components/SectorSelection';
import { LoginScreen } from './components/LoginScreen';
import { FinancialSector } from './components/sectors/FinancialSector';
import { OperacoesDashboard } from './components/OperacoesDashboard';
import { ExpansaoDashboard } from './components/sectors/ExpansaoDashboard';

export default function App() {
    const [user, setUser] = useState<string | null>(null);
    const [activeSector, setActiveSector] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<any[]>(() => {
        const saved = localStorage.getItem('accessProfiles');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [
            { username: 'bruno', sectors: ['financeiro', 'operacoes', 'regionais', 'expansao', 'desenvolvimento'] },
            { username: 'brunoallan004', sectors: ['financeiro', 'operacoes', 'regionais', 'expansao', 'desenvolvimento'] },
            { username: 'admin', sectors: ['financeiro', 'operacoes', 'regionais', 'expansao'] }
        ];
    });

    useEffect(() => {
        localStorage.setItem('accessProfiles', JSON.stringify(profiles));
    }, [profiles]);

    if (!user) {
        return <LoginScreen onLogin={setUser} />;
    }

    if (user.includes('@')) {
        return <FranqueadoDashboard user={user} onBack={() => setUser(null)} />;
    }

    if (!activeSector) {
        return <SectorSelection user={user} profiles={profiles} onSelectSector={setActiveSector} onLogout={() => setUser(null)} />;
    }

    if (activeSector === 'financeiro') {
        return <FinancialSector onBack={() => setActiveSector(null)} />;
    }

    if (activeSector === 'regionais') {
        return <RegionaisDashboard user={user} onBack={() => setActiveSector(null)} onLogout={() => setUser(null)} />;
    }

    if (activeSector === 'desenvolvimento') {
        return <DesenvolvimentoDashboard user={user} profiles={profiles} setProfiles={setProfiles} onBack={() => setActiveSector(null)} />;
    }

    if (activeSector === 'franqueado') {
        return <FranqueadoDashboard user={user} onBack={() => setActiveSector(null)} />;
    }

    if (activeSector === 'operacoes') {
        return <OperacoesDashboard user={user} onBack={() => setActiveSector(null)} />;
    }

    if (activeSector === 'expansao') {
        return <ExpansaoDashboard user={user} onBack={() => setActiveSector(null)} />;
    }

    return null;
}
`;

fs.writeFileSync('src/App.tsx', cleanAppStr);

// 2. Clean ExpansaoDashboard.tsx
let expStr = fs.readFileSync('src/components/sectors/ExpansaoDashboard.tsx', 'utf8');
// Replace `export default function App()` with `export const ExpansaoDashboard = ({ user, onBack }: any) => {`
expStr = expStr.replace('export default function App() {', 'export const ExpansaoDashboard = ({ user, onBack }: any) => {');

// Remove global user state from ExpansaoDashboard (since we received user as prop).
expStr = expStr.replace('const [user, setUser] = useState<string | null>(null);', '');
expStr = expStr.replace('const [activeSector, setActiveSector] = useState<string | null>(null);', '');

// Remove the `if (!activeSector) return SectorSelection...` parts
let expLines = expStr.split('\\n');
// We want to slice out lines that handle the fallback from lines 1142 to 1193 in the original App.tsx
// It's easier to replace with Regex.
expStr = expStr.replace(/if \(!user\) \{[\\s\\S]*?if \(activeSector !== 'expansao'\) \{[\\s\\S]*?\}\n/g, '');

// Fix the onBack call. Replace `onClick={() => setActiveSector(null)}` with `onClick={onBack}`
expStr = expStr.replace(/onClick=\{\(\) => setActiveSector\(null\)\}/g, 'onClick={onBack}');

fs.writeFileSync('src/components/sectors/ExpansaoDashboard.tsx', expStr);
