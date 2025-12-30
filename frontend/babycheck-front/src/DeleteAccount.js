import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faExclamationTriangle, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Api from './api/Api';

export default function DeleteAccount({ user, onLogout }) {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(user);
    const [babyName, setBabyName] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchCurrentUser = async () => {
        try {
            const userData = await Api.getCurrentUser();
            setCurrentUser(userData);
        } catch (error) {
            console.error('Failed to fetch current user:', error);
        }
    };

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const handleDeleteAccount = async () => {
        if (!babyName.trim()) {
            setErrorMessage('Veuillez entrer le nom du bébé');
            return;
        }

        setDeleting(true);
        setErrorMessage('');

        try {
            await Api.deleteAccount(babyName.trim());
            // Account deleted successfully - logout and redirect
            onLogout();
            navigate('/');
        } catch (error) {
            console.error('Delete account error:', error);
            setErrorMessage(error.message || 'Erreur lors de la suppression du compte');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div style={{ 
            padding: '20px', 
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#282c34',
            minHeight: '100vh',
            color: 'white'
        }}>
            <div style={{ marginBottom: '30px' }}>
                <Link 
                    to="/profile"
                    style={{ 
                        padding: '8px 16px',
                        backgroundColor: '#444',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Retour au Profil
                </Link>
            </div>

            <div style={{
                backgroundColor: '#3a3f4a',
                padding: '30px',
                borderRadius: '10px',
                maxWidth: '500px',
                margin: '0 auto',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                border: '2px solid #ff4444'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <FontAwesomeIcon 
                        icon={faExclamationTriangle} 
                        size="3x" 
                        style={{ marginBottom: '15px', color: '#ff4444' }} 
                    />
                    <h1 style={{ margin: '0', fontSize: '28px', color: '#ff4444' }}>
                        Supprimer le Compte
                    </h1>
                </div>

                <div style={{
                    backgroundColor: '#4a1e1e',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '25px',
                    border: '1px solid #ff6b6b'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#ff6b6b' }}>
                        ⚠️ Attention - Action Irréversible
                    </h3>
                    <ul style={{ margin: '0', paddingLeft: '20px', color: '#ffb3b3' }}>
                        <li>Tous les événements de {currentUser?.username} seront supprimés</li>
                        <li>L'historique complet sera perdu définitivement</li>
                        <li>Cette action ne peut pas être annulée</li>
                        <li>Vous devrez créer un nouveau compte pour continuer</li>
                    </ul>
                </div>

                {currentUser?.email && currentUser?.email_verified ? (
                    <div style={{
                        backgroundColor: '#1e4f2f',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '25px',
                        border: '1px solid #28a745'
                    }}>
                        <p style={{ margin: '0', color: '#90ee90', fontSize: '14px' }}>
                            💡 <strong>Alternative:</strong> Vous avez un email vérifié ({currentUser.email}). 
                            Vous pourriez plutôt réinitialiser vos données depuis le panneau d'administration 
                            tout en gardant votre compte.
                        </p>
                    </div>
                ) : null}

                <div style={{ marginBottom: '25px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }}>
                        Pour confirmer, tapez le nom du bébé: <span style={{ color: '#61dafb' }}>
                            {currentUser?.username}
                        </span>
                    </label>
                    <input
                        type="text"
                        placeholder={`Tapez "${currentUser?.username}" ici`}
                        value={babyName}
                        onChange={(e) => setBabyName(e.target.value)}
                        disabled={deleting}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '2px solid #555',
                            borderRadius: '8px',
                            backgroundColor: '#1a1e25',
                            color: 'white',
                            fontSize: '16px',
                            fontFamily: 'Arial, sans-serif',
                            boxSizing: 'border-box'
                        }}
                        onKeyPress={(e) => e.key === 'Enter' && handleDeleteAccount()}
                    />
                </div>

                {errorMessage && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#4a1e1e',
                        color: '#ffb3b3',
                        border: '1px solid #ff6b6b',
                        fontSize: '14px'
                    }}>
                        {errorMessage}
                    </div>
                )}

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={handleDeleteAccount}
                        disabled={deleting || babyName.trim() !== currentUser?.username}
                        style={{
                            padding: '15px 30px',
                            fontSize: '16px',
                            backgroundColor: deleting || babyName.trim() !== currentUser?.username ? '#666' : '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: deleting || babyName.trim() !== currentUser?.username ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            margin: '0 auto',
                            opacity: deleting || babyName.trim() !== currentUser?.username ? 0.5 : 1
                        }}
                    >
                        <FontAwesomeIcon icon={faTrash} />
                        {deleting ? 'Suppression...' : 'Supprimer Définitivement'}
                    </button>
                </div>
            </div>
        </div>
    );
}