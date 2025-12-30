import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faArrowLeft, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import Api from './api/Api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await Api.requestPasswordReset(email);
            if (response.ok) {
                setMessage(response.data.message);
                setSubmitted(true);
            } else {
                setMessage(response.data.error || 'Erreur lors de la demande');
            }
        } catch (err) {
            setMessage('Erreur de réseau');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
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
                    <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>Email Envoyé</h1>
                    
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

                    <div style={{
                        backgroundColor: '#2a2e37',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '30px',
                        textAlign: 'left'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#61dafb' }}>
                            📧 Vérifiez votre boîte email
                        </h3>
                        <ul style={{ margin: '0', paddingLeft: '20px', color: '#ccc' }}>
                            <li>Le lien expire dans 5 minutes</li>
                            <li>Vérifiez également vos spams</li>
                            <li>Vous pouvez fermer cette page</li>
                        </ul>
                    </div>
                    
                    <Link 
                        to="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: '#61dafb',
                            color: '#282c34',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold'
                        }}
                    >
                        <FontAwesomeIcon icon={faArrowLeft} />
                        Retour à la connexion
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
                    icon={faEnvelope} 
                    size="3x" 
                    style={{ marginBottom: '20px', color: '#61dafb' }} 
                />
                <h1 style={{ marginBottom: '10px', fontSize: '24px' }}>Mot de passe oublié</h1>
                <p style={{ 
                    marginBottom: '30px', 
                    color: '#ccc', 
                    fontSize: '16px',
                    lineHeight: '1.5'
                }}>
                    Entrez votre adresse email pour recevoir un lien de réinitialisation
                </p>
                
                <form onSubmit={handleSubmit}>
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="votre-email@exemple.com"
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
                            icon={faEnvelope} 
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
                    
                    <button
                        type="submit"
                        disabled={loading || !email}
                        style={{
                            width: '100%',
                            padding: '15px',
                            fontSize: '18px',
                            backgroundColor: loading || !email ? '#555' : '#61dafb',
                            color: loading || !email ? '#ccc' : '#282c34',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading || !email ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            boxSizing: 'border-box',
                            marginBottom: '20px'
                        }}
                    >
                        {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
                    </button>
                </form>
                
                <Link 
                    to="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#61dafb',
                        textDecoration: 'none',
                        fontSize: '14px'
                    }}
                    onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Retour à la connexion
                </Link>
                
                {message && !submitted && (
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