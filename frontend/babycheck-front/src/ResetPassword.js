import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faEye, faEyeSlash, faCheckCircle, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import Api from './api/Api';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    const [token, setToken] = useState('');

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // Extract token from URL parameters
        const urlParams = new URLSearchParams(location.search);
        const tokenFromUrl = urlParams.get('token');
        
        if (!tokenFromUrl) {
            setMessage('Lien invalide ou expiré');
            return;
        }
        
        setToken(tokenFromUrl);
    }, [location.search]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        // Validate passwords
        if (password.length < 6) {
            setMessage('Le mot de passe doit contenir au moins 6 caractères');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setMessage('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        try {
            const response = await Api.resetPassword(token, password);
            if (response.ok) {
                setMessage(response.data.message);
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            } else {
                setMessage(response.data.error || 'Erreur lors de la réinitialisation');
            }
        } catch (err) {
            setMessage('Erreur de réseau');
        } finally {
            setLoading(false);
        }
    };

    if (!token && !loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                backgroundColor: '#282c34',
                color: 'white',
                fontFamily: 'Arial, sans-serif',
                padding: '20px',
                boxSizing: 'border-box'
            }}>
                <div style={{
                    backgroundColor: '#3a3f4a',
                    padding: '40px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    width: '100%',
                    maxWidth: '500px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    border: '2px solid #ff4444'
                }}>
                    <FontAwesomeIcon 
                        icon={faExclamationTriangle} 
                        size="3x" 
                        style={{ marginBottom: '20px', color: '#ff4444' }} 
                    />
                    <h1 style={{ marginBottom: '20px', fontSize: '24px', color: '#ff4444' }}>
                        Lien Invalide
                    </h1>
                    <p style={{ marginBottom: '30px', color: '#ccc' }}>
                        Ce lien de réinitialisation est invalide ou a expiré.
                    </p>
                    <Link 
                        to="/forgot-password"
                        style={{
                            display: 'inline-block',
                            padding: '12px 24px',
                            backgroundColor: '#61dafb',
                            color: '#282c34',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            marginRight: '10px'
                        }}
                    >
                        Demander un nouveau lien
                    </Link>
                    <Link 
                        to="/"
                        style={{
                            display: 'inline-block',
                            padding: '12px 24px',
                            backgroundColor: '#555',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold'
                        }}
                    >
                        Retour à la connexion
                    </Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                backgroundColor: '#282c34',
                color: 'white',
                fontFamily: 'Arial, sans-serif',
                padding: '20px',
                boxSizing: 'border-box'
            }}>
                <div style={{
                    backgroundColor: '#3a3f4a',
                    padding: '40px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    width: '100%',
                    maxWidth: '500px',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                }}>
                    <FontAwesomeIcon 
                        icon={faCheckCircle} 
                        size="3x" 
                        style={{ marginBottom: '20px', color: '#28a745' }} 
                    />
                    <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>
                        Mot de passe réinitialisé
                    </h1>
                    
                    <div style={{
                        backgroundColor: '#1e4f2f',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '30px',
                        border: '1px solid #28a745'
                    }}>
                        <p style={{ margin: '0', color: '#90ee90' }}>
                            {message}
                        </p>
                    </div>

                    <p style={{ marginBottom: '30px', color: '#ccc' }}>
                        Vous allez être redirigé vers la page de connexion dans quelques secondes...
                    </p>
                    
                    <Link 
                        to="/"
                        style={{
                            display: 'inline-block',
                            padding: '12px 24px',
                            backgroundColor: '#61dafb',
                            color: '#282c34',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold'
                        }}
                    >
                        Se connecter maintenant
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#282c34',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            <div style={{
                backgroundColor: '#3a3f4a',
                padding: '30px',
                borderRadius: '10px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center',
                boxSizing: 'border-box'
            }}>
                <FontAwesomeIcon 
                    icon={faLock} 
                    size="3x" 
                    style={{ marginBottom: '20px', color: '#61dafb' }} 
                />
                <h1 style={{ marginBottom: '10px', fontSize: '24px' }}>
                    Nouveau mot de passe
                </h1>
                <p style={{ 
                    marginBottom: '30px', 
                    color: '#ccc', 
                    fontSize: '16px',
                    lineHeight: '1.5'
                }}>
                    Choisissez un nouveau mot de passe sécurisé
                </p>
                
                <form onSubmit={handleSubmit}>
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nouveau mot de passe"
                            style={{
                                width: '100%',
                                padding: '15px 50px 15px 50px',
                                fontSize: '18px',
                                border: '1px solid #555',
                                borderRadius: '8px',
                                backgroundColor: '#2a2e37',
                                color: 'white',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                            disabled={loading}
                            required
                            minLength={6}
                        />
                        <FontAwesomeIcon 
                            icon={faLock} 
                            style={{
                                position: 'absolute',
                                left: '15px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#ccc',
                                fontSize: '18px'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '15px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: '#ccc',
                                cursor: 'pointer',
                                padding: '5px',
                                fontSize: '18px'
                            }}
                        >
                            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                        </button>
                    </div>

                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmer le mot de passe"
                            style={{
                                width: '100%',
                                padding: '15px 15px 15px 50px',
                                fontSize: '18px',
                                border: '1px solid #555',
                                borderRadius: '8px',
                                backgroundColor: '#2a2e37',
                                color: 'white',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                            disabled={loading}
                            required
                        />
                        <FontAwesomeIcon 
                            icon={faLock} 
                            style={{
                                position: 'absolute',
                                left: '15px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#ccc',
                                fontSize: '18px'
                            }}
                        />
                    </div>

                    <div style={{
                        marginBottom: '20px',
                        fontSize: '14px',
                        color: '#ccc',
                        textAlign: 'left',
                        backgroundColor: '#2a2e37',
                        padding: '12px',
                        borderRadius: '8px'
                    }}>
                        <strong>Exigences du mot de passe :</strong>
                        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                            <li style={{ color: password.length >= 6 ? '#28a745' : '#ff6b6b' }}>
                                Au moins 6 caractères {password.length >= 6 ? '✅' : `(${password.length}/6)`}
                            </li>
                            <li style={{ color: password === confirmPassword && password ? '#28a745' : '#ccc' }}>
                                Les mots de passe correspondent {password === confirmPassword && password ? '✅' : ''}
                            </li>
                        </ul>
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading || !password || !confirmPassword || password !== confirmPassword || password.length < 6}
                        style={{
                            width: '100%',
                            padding: '15px',
                            fontSize: '18px',
                            backgroundColor: loading || !password || !confirmPassword || password !== confirmPassword || password.length < 6 ? '#555' : '#61dafb',
                            color: loading || !password || !confirmPassword || password !== confirmPassword || password.length < 6 ? '#ccc' : '#282c34',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading || !password || !confirmPassword || password !== confirmPassword || password.length < 6 ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            boxSizing: 'border-box',
                            marginBottom: '20px'
                        }}
                    >
                        {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
                    </button>
                </form>
                
                {message && !success && (
                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        borderRadius: '8px',
                        backgroundColor: '#4a1e1e',
                        color: '#ffb3b3',
                        border: '1px solid #ff6b6b',
                        fontSize: '14px'
                    }}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}