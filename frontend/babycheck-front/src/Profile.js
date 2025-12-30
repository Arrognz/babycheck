import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faSignOutAlt, faHome, faCog, faEnvelope, faCheck, faTrash } from "@fortawesome/free-solid-svg-icons";
import Api from './api/Api';

export default function Profile({ user, onLogout }) {
    const [currentUser, setCurrentUser] = useState(user);
    const [email, setEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [emailSending, setEmailSending] = useState(false);
    const [codeVerifying, setCodeVerifying] = useState(false);
    const [emailMessage, setEmailMessage] = useState('');
    const [showVerificationInput, setShowVerificationInput] = useState(false);
    const [pendingEmail, setPendingEmail] = useState('');
    const [loading, setLoading] = useState(false);

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

    const fetchCurrentUser = async () => {
        setLoading(true);
        try {
            const userData = await Api.getCurrentUser();
            setCurrentUser(userData);
        } catch (error) {
            console.error('Failed to fetch current user:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const sendVerificationEmail = async () => {
        if (!email || !email.includes('@')) {
            setEmailMessage('Veuillez entrer une adresse email valide');
            return;
        }

        setEmailSending(true);
        setEmailMessage('');

        try {
            await Api.sendVerificationEmail(email);
            setEmailMessage('Code de vérification envoyé ! Vérifiez vos emails 📧');
            setShowVerificationInput(true);
            setPendingEmail(email);
        } catch (error) {
            console.error('Email verification error:', error);
            // Check if it's the "email already exists" error for better styling
            const isEmailTakenError = error.message && error.message.includes('déjà utilisée');
            setEmailMessage(error.message || 'Erreur lors de l\'envoi de l\'email');
        } finally {
            setEmailSending(false);
            setTimeout(() => setEmailMessage(''), 5000);
        }
    };

    const verifyEmailCode = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setEmailMessage('Veuillez entrer un code de 6 chiffres');
            return;
        }

        setCodeVerifying(true);
        setEmailMessage('');

        try {
            await Api.verifyEmailCode(pendingEmail, verificationCode);
            setEmailMessage('Email vérifié avec succès ! ✅');
            setShowVerificationInput(false);
            setEmail('');
            setVerificationCode('');
            setPendingEmail('');
            // Refresh user data to reflect the verified email
            await fetchCurrentUser();
        } catch (error) {
            console.error('Code verification error:', error);
            setEmailMessage('Code invalide ou expiré. Réessayez.');
        } finally {
            setCodeVerifying(false);
            setTimeout(() => setEmailMessage(''), 5000);
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
                
                {currentUser?.role === 'admin' && (
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
                        <strong>Nom :</strong> {currentUser?.username}
                    </div>
                    <div style={{ 
                        padding: '15px',
                        backgroundColor: '#2a2e37',
                        borderRadius: '8px',
                        marginBottom: '10px'
                    }}>
                        <strong>Rôle :</strong> {currentUser?.role === 'admin' ? 'Administrateur 👑' : 'Utilisateur'}
                    </div>
                    <div style={{ 
                        padding: '15px',
                        backgroundColor: '#2a2e37',
                        borderRadius: '8px'
                    }}>
                        <strong>Compte créé le :</strong> {currentUser?.created ? formatDate(currentUser.created) : 'Date inconnue'}
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
                        {currentUser?.id}
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
                        <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '8px' }} />
                        Adresse Email
                    </h2>

                    {currentUser?.email && currentUser?.email_verified ? (
                        <div style={{ 
                            padding: '15px',
                            backgroundColor: '#2a2e37',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <FontAwesomeIcon icon={faCheck} style={{ color: '#28a745' }} />
                            <span><strong>Email vérifié :</strong> {currentUser.email}</span>
                        </div>
                    ) : (
                        <div style={{ 
                            padding: '15px',
                            backgroundColor: '#2a2e37',
                            borderRadius: '8px'
                        }}>
                            <div style={{ marginBottom: '15px' }}>
                                <strong>Aucun email configuré.</strong> Ajoutez votre email pour recevoir des notifications.
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <input
                                    type="email"
                                    placeholder="votre-email@exemple.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={emailSending || showVerificationInput}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #555',
                                        borderRadius: '4px',
                                        backgroundColor: '#1a1e25',
                                        color: 'white',
                                        fontSize: '14px',
                                        marginBottom: '10px',
                                        boxSizing: 'border-box'
                                    }}
                                    onKeyPress={(e) => e.key === 'Enter' && sendVerificationEmail()}
                                />
                                
                                <button 
                                    onClick={sendVerificationEmail}
                                    disabled={emailSending || !email || showVerificationInput}
                                    style={{ 
                                        width: '100%',
                                        padding: '10px 16px',
                                        backgroundColor: emailSending ? '#666' : '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: emailSending ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        marginBottom: '10px'
                                    }}
                                >
                                    {emailSending ? 'Envoi...' : 'Envoyer Code de Vérification'}
                                </button>
                            </div>

                            {showVerificationInput && (
                                <div style={{ marginTop: '15px', borderTop: '1px solid #555', paddingTop: '15px' }}>
                                    <div style={{ marginBottom: '10px', fontSize: '14px', color: '#ccc' }}>
                                        Entrez le code de 6 chiffres envoyé à <strong>{pendingEmail}</strong>:
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="123456"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        disabled={codeVerifying}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #555',
                                            borderRadius: '4px',
                                            backgroundColor: '#1a1e25',
                                            color: 'white',
                                            fontSize: '16px',
                                            textAlign: 'center',
                                            letterSpacing: '2px',
                                            marginBottom: '10px',
                                            boxSizing: 'border-box'
                                        }}
                                        maxLength={6}
                                        onKeyPress={(e) => e.key === 'Enter' && verifyEmailCode()}
                                    />
                                    
                                    <button 
                                        onClick={verifyEmailCode}
                                        disabled={codeVerifying || verificationCode.length !== 6}
                                        style={{ 
                                            width: '100%',
                                            padding: '10px 16px',
                                            backgroundColor: codeVerifying ? '#666' : '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: codeVerifying ? 'not-allowed' : 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        {codeVerifying ? 'Vérification...' : 'Vérifier Code'}
                                    </button>
                                </div>
                            )}

                            {emailMessage && (
                                <div style={{
                                    marginTop: '10px',
                                    padding: '10px 12px',
                                    borderRadius: '4px',
                                    backgroundColor: emailMessage.includes('succès') || emailMessage.includes('envoyé') ? '#1e4f2f' : '#4a1e1e',
                                    color: emailMessage.includes('succès') || emailMessage.includes('envoyé') ? '#90ee90' : '#ffb3b3',
                                    fontSize: '14px',
                                    textAlign: 'center'
                                }}>
                                    {emailMessage}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link 
                            to="/delete-account"
                            style={{
                                padding: '15px 30px',
                                fontSize: '16px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                textDecoration: 'none',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                        >
                            <FontAwesomeIcon icon={faTrash} />
                            Supprimer le Compte
                        </Link>
                        
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
                                gap: '10px'
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
        </div>
    );
}