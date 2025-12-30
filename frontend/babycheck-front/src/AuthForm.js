import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faEye, faEyeSlash, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import Api from './api/Api';

export default function AuthForm({ onAuthenticated }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;
            if (isLogin) {
                response = await Api.login(username, password);
            } else {
                response = await Api.register(username, password, email);
                if (response.ok) {
                    // After successful registration, automatically login
                    response = await Api.login(username, password);
                }
            }

            if (response.ok) {
                localStorage.setItem('babycheck_token', response.data.token);
                localStorage.setItem('babycheck_user', JSON.stringify(response.data.user));
                onAuthenticated(response.data.user, response.data.token);
            } else {
                setError(response.data.error || 'Erreur de connexion');
            }
        } catch (err) {
            setError('Erreur de réseau');
        } finally {
            setLoading(false);
        }
    };

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
                <FontAwesomeIcon icon={faUser} size="3x" style={{ marginBottom: '20px', color: '#61dafb' }} />
                <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>BabyCheck</h1>
                
                <div style={{ marginBottom: '20px' }}>
                    <button
                        type="button"
                        onClick={() => {setIsLogin(true); setError(''); setEmail('');}}
                        style={{
                            padding: '10px 20px',
                            marginRight: '10px',
                            backgroundColor: isLogin ? '#61dafb' : 'transparent',
                            color: isLogin ? '#282c34' : '#ccc',
                            border: '1px solid #61dafb',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Connexion
                    </button>
                    <button
                        type="button"
                        onClick={() => {setIsLogin(false); setError(''); setEmail('');}}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: !isLogin ? '#61dafb' : 'transparent',
                            color: !isLogin ? '#282c34' : '#ccc',
                            border: '1px solid #61dafb',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Inscription
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={isLogin ? "Nom du bébé ou email" : "Nom du bébé"}
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
                            icon={faUser} 
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

                    {!isLogin && (
                        <div style={{ position: 'relative', marginBottom: '20px' }}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Adresse email"
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
                    )}

                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mot de passe"
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
                    
                    <button
                        type="submit"
                        disabled={loading || !username || !password || (!isLogin && password.length < 6)}
                        style={{
                            width: '100%',
                            padding: '15px',
                            fontSize: '18px',
                            backgroundColor: loading || !username || !password || (!isLogin && password.length < 6) ? '#555' : '#61dafb',
                            color: loading || !username || !password || (!isLogin && password.length < 6) ? '#ccc' : '#282c34',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading || !username || !password || (!isLogin && password.length < 6) ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            boxSizing: 'border-box'
                        }}
                    >
                        {loading ? 
                            (isLogin ? 'Connexion...' : 'Inscription...') : 
                            (isLogin ? 'Se connecter' : 'S\'inscrire')
                        }
                    </button>

                    {isLogin && (
                        <div style={{ textAlign: 'center', marginTop: '15px' }}>
                            <a
                                href="/forgot-password"
                                style={{
                                    color: '#61dafb',
                                    textDecoration: 'none',
                                    fontSize: '14px'
                                }}
                                onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                            >
                                Mot de passe oublié ?
                            </a>
                        </div>
                    )}
                </form>
                
                {error && (
                    <p style={{ 
                        color: '#ff6b6b', 
                        marginTop: '15px', 
                        fontSize: '14px' 
                    }}>
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}