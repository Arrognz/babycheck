import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from './api/Api';
import { formatDate } from './Timeline';

const labelMap = {
    'poop': 'Caca',
    'pee': 'Pipi', 
    'sleep': 'Dort',
    'leftBoob': 'Tête sein gauche',
    'rightBoob': 'Tête sein droit',
    'leftBoobStop': 'Lâche sein gauche',
    'rightBoobStop': 'Lâche sein droit',
    'crying': 'Pleure',
    'wake': 'Est éveillé',
    'nap': 'Sieste'
};

export default function Admin({ user, onLogout }) {
    const [data, setData] = useState([]);
    const [users, setUsers] = useState([]);
    const [allUsersData, setAllUsersData] = useState({});
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('my-data'); // 'my-data', 'all-users', 'all-data'
    const [testEmail, setTestEmail] = useState('');
    const [emailSending, setEmailSending] = useState(false);
    const [emailMessage, setEmailMessage] = useState('');

    const isAdmin = user?.role === 'admin';

    const fetchMyData = async () => {
        setLoading(true);
        const response = await Api.getAllData();
        setData(response.events || []);
        setLoading(false);
    };

    const fetchAllUsers = async () => {
        if (!isAdmin) return;
        setLoading(true);
        const response = await Api.getAllUsers();
        setUsers(response.users || []);
        setLoading(false);
    };

    const fetchAllUsersData = async () => {
        if (!isAdmin) return;
        setLoading(true);
        const response = await Api.getAllUsersData();
        setAllUsersData(response.data || {});
        setLoading(false);
    };

    const fetchData = () => {
        switch (viewMode) {
            case 'my-data':
                fetchMyData();
                break;
            case 'all-users':
                fetchAllUsers();
                break;
            case 'all-data':
                fetchAllUsersData();
                break;
        }
    };

    const eraseMyData = async () => {
        if (window.confirm('Êtes-vous sûr de vouloir effacer vos données ? Cette action est irréversible !')) {
            setLoading(true);
            await Api.eraseAllData();
            setData([]);
            setLoading(false);
        }
    };

    const sendTestEmail = async () => {
        if (!testEmail || !testEmail.includes('@')) {
            setEmailMessage('Veuillez entrer une adresse email valide');
            return;
        }

        setEmailSending(true);
        setEmailMessage('');

        try {
            const response = await Api.sendTestEmail(testEmail);
            setEmailMessage('Email de test envoyé avec succès ! 📧');
            setTestEmail('');
        } catch (error) {
            console.error('Email send error:', error);
            setEmailMessage('Erreur lors de l\'envoi de l\'email: ' + (error.message || 'Erreur inconnue'));
        } finally {
            setEmailSending(false);
            setTimeout(() => setEmailMessage(''), 5000); // Clear message after 5 seconds
        }
    };

    useEffect(() => {
        fetchData();
    }, [viewMode]);

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link 
                    to="/"
                    style={{ 
                        padding: '8px 16px',
                        backgroundColor: '#ccc',
                        color: 'black',
                        textDecoration: 'none',
                        borderRadius: '4px'
                    }}
                >
                    ← Retour à l'App
                </Link>
                
                <Link 
                    to="/profile"
                    style={{ 
                        padding: '8px 16px',
                        backgroundColor: '#555',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px'
                    }}
                >
                    👤 Profil
                </Link>
            </div>
            <h1>Panneau d'Administration {isAdmin && '(Super Admin)'}</h1>
            
            {isAdmin && (
                <div style={{ marginBottom: '20px' }}>
                    <h3>Mode d'affichage :</h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <button 
                            onClick={() => setViewMode('my-data')}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: viewMode === 'my-data' ? '#61dafb' : '#ccc',
                                color: viewMode === 'my-data' ? 'black' : '#666',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Mes Données
                        </button>
                        <button 
                            onClick={() => setViewMode('all-users')}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: viewMode === 'all-users' ? '#61dafb' : '#ccc',
                                color: viewMode === 'all-users' ? 'black' : '#666',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Tous les Utilisateurs
                        </button>
                        <button 
                            onClick={() => setViewMode('all-data')}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: viewMode === 'all-data' ? '#61dafb' : '#ccc',
                                color: viewMode === 'all-data' ? 'black' : '#666',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Toutes les Données
                        </button>
                    </div>
                </div>
            )}

            {isAdmin && (
                <div style={{ 
                    marginBottom: '20px', 
                    padding: '15px', 
                    border: '1px solid #ddd', 
                    borderRadius: '8px',
                    backgroundColor: '#f9f9f9'
                }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>Test Email</h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                            type="email"
                            placeholder="votre-email@exemple.com"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            disabled={emailSending}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                minWidth: '250px',
                                fontSize: '14px'
                            }}
                            onKeyPress={(e) => e.key === 'Enter' && sendTestEmail()}
                        />
                        <button 
                            onClick={sendTestEmail}
                            disabled={emailSending || !testEmail}
                            style={{ 
                                padding: '8px 16px',
                                backgroundColor: emailSending ? '#ccc' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: emailSending ? 'not-allowed' : 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            {emailSending ? 'Envoi...' : '📧 Envoyer Test Email'}
                        </button>
                    </div>
                    {emailMessage && (
                        <div style={{
                            marginTop: '10px',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            backgroundColor: emailMessage.includes('succès') ? '#d4edda' : '#f8d7da',
                            color: emailMessage.includes('succès') ? '#155724' : '#721c24',
                            fontSize: '14px'
                        }}>
                            {emailMessage}
                        </div>
                    )}
                </div>
            )}
            
            <div style={{ marginBottom: '20px' }}>
                <button 
                    onClick={fetchData}
                    disabled={loading}
                    style={{ marginRight: '10px', padding: '8px 16px' }}
                >
                    {loading ? 'Chargement...' : 'Actualiser'}
                </button>
                
                {viewMode === 'my-data' && (
                    <button 
                        onClick={eraseMyData}
                        disabled={loading}
                        style={{ 
                            padding: '8px 16px', 
                            backgroundColor: '#ff4444', 
                            color: 'white', 
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Effacer Mes Données
                    </button>
                )}
            </div>

            {viewMode === 'my-data' && (
                <>
                    <h2>Mes Événements ({data.length} au total)</h2>
                    {renderMyData()}
                </>
            )}

            {viewMode === 'all-users' && isAdmin && (
                <>
                    <h2>Tous les Utilisateurs ({users.length} au total)</h2>
                    {renderAllUsers()}
                </>
            )}

            {viewMode === 'all-data' && isAdmin && (
                <>
                    <h2>Données de Tous les Utilisateurs</h2>
                    {renderAllUsersData()}
                </>
            )}
        </div>
    );

    function renderMyData() {
        return data.length === 0 ? (
            <p>Aucune donnée trouvée</p>
        ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #ccc' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Heure</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Événement</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>ID</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Timestamp Brut</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((event, index) => (
                        <tr key={event.id || index} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}>
                                {new Date(event.timestamp).toLocaleString()}
                            </td>
                            <td style={{ padding: '8px' }}>
                                {labelMap[event.name] || event.name}
                            </td>
                            <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                                {event.id}
                            </td>
                            <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                                {event.timestamp}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    function renderAllUsers() {
        return users.length === 0 ? (
            <p>Aucun utilisateur trouvé</p>
        ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #ccc' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Nom du Bébé</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Rôle</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Email</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Date de Création</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>ID</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user, index) => (
                        <tr key={user.id || index} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px', fontWeight: user.role === 'admin' ? 'bold' : 'normal' }}>
                                {user.username} {user.role === 'admin' && '👑'}
                            </td>
                            <td style={{ padding: '8px' }}>
                                {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                            </td>
                            <td style={{ padding: '8px' }}>
                                {user.email ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span>{user.email}</span>
                                        {user.email_verified ? (
                                            <span style={{ color: '#28a745', fontSize: '14px' }}>✅</span>
                                        ) : (
                                            <span style={{ color: '#ffc107', fontSize: '14px' }}>⚠️</span>
                                        )}
                                    </div>
                                ) : (
                                    <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Aucun email</span>
                                )}
                            </td>
                            <td style={{ padding: '8px' }}>
                                {new Date(user.created * 1000).toLocaleString()}
                            </td>
                            <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                                {user.id}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    function renderAllUsersData() {
        const userNames = Object.keys(allUsersData);
        
        return userNames.length === 0 ? (
            <p>Aucune donnée trouvée</p>
        ) : (
            <div>
                {userNames.map(userName => {
                    const userData = allUsersData[userName];
                    const userInfo = userData.user;
                    const events = userData.events || [];
                    
                    return (
                        <div key={userName} style={{ marginBottom: '40px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                            <h3 style={{ marginTop: '0', color: '#61dafb' }}>
                                {userName} ({events.length} événements)
                            </h3>
                            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
                                <div style={{ marginBottom: '8px' }}>
                                    Créé le: {new Date(userInfo.created * 1000).toLocaleDateString()} | ID: {userInfo.id}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <strong>Email:</strong>
                                    {userInfo.email ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span>{userInfo.email}</span>
                                            {userInfo.email_verified ? (
                                                <span style={{ color: '#28a745' }}>✅ Vérifié</span>
                                            ) : (
                                                <span style={{ color: '#ffc107' }}>⚠️ Non vérifié</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Aucun email configuré</span>
                                    )}
                                </div>
                            </div>
                            
                            {events.length === 0 ? (
                                <p style={{ fontStyle: 'italic' }}>Aucun événement pour cet utilisateur</p>
                            ) : (
                                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                                            <th style={{ padding: '6px', textAlign: 'left' }}>Heure</th>
                                            <th style={{ padding: '6px', textAlign: 'left' }}>Événement</th>
                                            <th style={{ padding: '6px', textAlign: 'left' }}>ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.slice(0, 10).map((event, index) => (
                                            <tr key={event.id || index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <td style={{ padding: '6px' }}>
                                                    {new Date(event.timestamp).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '6px' }}>
                                                    {labelMap[event.name] || event.name}
                                                </td>
                                                <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '11px' }}>
                                                    {event.id}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            
                            {events.length > 10 && (
                                <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '12px' }}>
                                    ... et {events.length - 10} autres événements
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }
}