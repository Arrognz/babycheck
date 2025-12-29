import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faSignOutAlt, faHome, faCog } from "@fortawesome/free-solid-svg-icons";

export default function Profile({ user, onLogout }) {
    const handleLogout = () => {
        if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            onLogout();
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div style={{ 
            padding: '20px', 
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#282c34',
            minHeight: '100vh',
            color: 'white'
        }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '30px',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <Link 
                    to="/"
                    style={{ 
                        padding: '8px 16px',
                        backgroundColor: '#444',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <FontAwesomeIcon icon={faHome} />
                    Retour à l'App
                </Link>
                
                {user?.role === 'admin' && (
                    <Link 
                        to="/admin"
                        style={{ 
                            padding: '8px 16px',
                            backgroundColor: '#666',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <FontAwesomeIcon icon={faCog} />
                        Administration
                    </Link>
                )}
            </div>

            <div style={{
                backgroundColor: '#3a3f4a',
                padding: '30px',
                borderRadius: '10px',
                maxWidth: '500px',
                margin: '0 auto',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <FontAwesomeIcon 
                        icon={faUser} 
                        size="3x" 
                        style={{ marginBottom: '15px', color: '#61dafb' }} 
                    />
                    <h1 style={{ margin: '0', fontSize: '28px' }}>Profil</h1>
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <h2 style={{ 
                        fontSize: '18px', 
                        marginBottom: '15px',
                        color: '#61dafb',
                        borderBottom: '1px solid #555',
                        paddingBottom: '5px'
                    }}>
                        Informations du Bébé
                    </h2>
                    <div style={{ 
                        padding: '15px',
                        backgroundColor: '#2a2e37',
                        borderRadius: '8px',
                        marginBottom: '10px'
                    }}>
                        <strong>Nom :</strong> {user?.username}
                    </div>
                    <div style={{ 
                        padding: '15px',
                        backgroundColor: '#2a2e37',
                        borderRadius: '8px',
                        marginBottom: '10px'
                    }}>
                        <strong>Rôle :</strong> {user?.role === 'admin' ? 'Administrateur 👑' : 'Utilisateur'}
                    </div>
                    <div style={{ 
                        padding: '15px',
                        backgroundColor: '#2a2e37',
                        borderRadius: '8px'
                    }}>
                        <strong>Compte créé le :</strong> {user?.created ? formatDate(user.created) : 'Date inconnue'}
                    </div>
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <h2 style={{ 
                        fontSize: '18px', 
                        marginBottom: '15px',
                        color: '#61dafb',
                        borderBottom: '1px solid #555',
                        paddingBottom: '5px'
                    }}>
                        Identifiant Unique
                    </h2>
                    <div style={{ 
                        padding: '15px',
                        backgroundColor: '#2a2e37',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        wordBreak: 'break-all'
                    }}>
                        {user?.id}
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '15px 30px',
                            fontSize: '16px',
                            backgroundColor: '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            margin: '0 auto'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#ff6666'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#ff4444'}
                    >
                        <FontAwesomeIcon icon={faSignOutAlt} />
                        Se Déconnecter
                    </button>
                </div>
            </div>
        </div>
    );
}