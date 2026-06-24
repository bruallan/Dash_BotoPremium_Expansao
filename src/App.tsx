import React, { useState, useEffect } from 'react';
import RegionaisDashboard from './components/RegionaisDashboard';
import DesenvolvimentoDashboard from './components/DesenvolvimentoDashboard';
import FranqueadoDashboard from './components/FranqueadoDashboard';
import { SectorSelection } from './components/SectorSelection';
import { LoginScreen } from './components/LoginScreen';
import { FinanceiroDashboard } from './components/FinanceiroDashboard';
import { OperacoesDashboard } from './components/OperacoesDashboard';
import { ExpansaoDashboard } from './components/ExpansaoDashboard';
import { BdFirebaseDashboard } from './components/BdFirebaseDashboard';

export default function App() {
    const [user, setUser] = useState<string | null>(null);
    const [activeSector, setActiveSector] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<any[]>(() => {
        const saved = localStorage.getItem('accessProfilesV4');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [
            { username: 'bruno', sectors: ['financeiro', 'operacoes', 'regionais', 'expansao', 'desenvolvimento', 'bdfirebase'] },
            { username: 'brunoallan004', sectors: ['financeiro', 'operacoes', 'regionais', 'expansao', 'desenvolvimento', 'bdfirebase'] },
            { username: 'admin', sectors: ['financeiro', 'operacoes', 'regionais', 'expansao', 'bdfirebase'] }
        ];
    });

    useEffect(() => {
        localStorage.setItem('accessProfilesV4', JSON.stringify(profiles));
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
        return <FinanceiroDashboard onBack={() => setActiveSector(null)} />;
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

    if (activeSector === 'bdfirebase') {
        return <BdFirebaseDashboard user={user} onBack={() => setActiveSector(null)} />;
    }

    return null;
}
