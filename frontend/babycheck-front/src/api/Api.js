class Api {
    constructor() {
        // if env is development
        this.baseUrl = '/api';
        if (process.env.NODE_ENV === 'development') {
            this.baseUrl = 'http://localhost:8080/api';
        }
    }

    getAuthHeaders() {
        const token = localStorage.getItem('babycheck_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    async ping() {
        const response = await fetch(`${this.baseUrl}/ping`);
        const body = await response.json();
        return body.message;
    }

    async remote(action) {
        try {
            const response = await fetch(`${this.baseUrl}/remote/${action}`, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
            });
            const body = await response.json();
            return body;
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async search(start, stop) {
        try {
            // post request with start and stop body parameters as unix timestamps
            const response = await fetch(`${this.baseUrl}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({ start, stop })
            });
            const body = await response.json();
            return body;
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async delete(eventTs) {
        try {
            const response = await fetch(`${this.baseUrl}/remote`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({ timestamp: eventTs })
            });
            const body = await response.json();
            return body;
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async updateEvent(timestamp, newAction) {
        try {
            const response = await fetch(`${this.baseUrl}/event/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({ timestamp, new_action: newAction })
            });
            const body = await response.json();
            return body;
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async getMode() {
        try {
            const response = await fetch(`${this.baseUrl}/mode`, {
                headers: this.getAuthHeaders()
            });
            const body = await response.json();
            return body;
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async register(username, password, email = '') {
        try {
            const body = { username, password };
            if (email) {
                body.email = email;
            }
            
            const response = await fetch(`${this.baseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            return {
                ok: response.ok,
                status: response.status,
                data: await response.json()
            };
        } catch (e) {
            console.error(e);
            return { ok: false, error: e.message };
        }
    }

    async login(username, password) {
        try {
            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            return {
                ok: response.ok,
                status: response.status,
                data: await response.json()
            };
        } catch (e) {
            console.error(e);
            return { ok: false, error: e.message };
        }
    }

    async add(action, timestamp) {
        try {
            const response = await fetch(`${this.baseUrl}/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({ action, timestamp })
            });
            const body = await response.json();
            return body;
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async getAllData() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/my-data`, {
                headers: this.getAuthHeaders()
            });
            const body = await response.json();
            return body;
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async eraseAllData() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/my-data`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            const body = await response.json();
            return body;
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async getAllUsers() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/users`, {
                headers: this.getAuthHeaders()
            });
            const body = await response.json();
            return body;
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async getAllUsersData() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/data`, {
                headers: this.getAuthHeaders()
            });
            const body = await response.json();
            return body;
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async sendTestEmail(email) {
        try {
            const response = await fetch(`${this.baseUrl}/admin/test-email`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Email send failed');
            }

            const body = await response.json();
            return body;
        } catch (e) {
            console.error('Email send error:', e);
            throw e;
        }
    }

    async getCurrentUser() {
        try {
            const response = await fetch(`${this.baseUrl}/me`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get current user');
            }

            const body = await response.json();
            return body.user;
        } catch (e) {
            console.error('Get current user error:', e);
            throw e;
        }
    }

    async sendVerificationEmail(email) {
        try {
            const response = await fetch(`${this.baseUrl}/send-verification-email`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Verification email send failed');
            }

            const body = await response.json();
            return body;
        } catch (e) {
            console.error('Verification email error:', e);
            throw e;
        }
    }

    async verifyEmailCode(email, code) {
        try {
            const response = await fetch(`${this.baseUrl}/verify-email`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, code })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Email verification failed');
            }

            const body = await response.json();
            return body;
        } catch (e) {
            console.error('Email verification error:', e);
            throw e;
        }
    }

    async deleteAccount(babyName) {
        try {
            const response = await fetch(`${this.baseUrl}/delete-account`, {
                method: 'DELETE',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ baby_name: babyName })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Account deletion failed');
            }

            const body = await response.json();
            return body;
        } catch (e) {
            console.error('Account deletion error:', e);
            throw e;
        }
    }

    async requestPasswordReset(email) {
        try {
            const response = await fetch(`${this.baseUrl}/request-password-reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            return {
                ok: response.ok,
                status: response.status,
                data: await response.json()
            };
        } catch (e) {
            console.error('Password reset request error:', e);
            return { ok: false, error: e.message };
        }
    }

    async resetPassword(token, password) {
        try {
            const response = await fetch(`${this.baseUrl}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, password })
            });

            return {
                ok: response.ok,
                status: response.status,
                data: await response.json()
            };
        } catch (e) {
            console.error('Password reset error:', e);
            return { ok: false, error: e.message };
        }
    }

    async getStats(period) {
        try {
            const response = await fetch(`${this.baseUrl}/stats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({ period })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Stats fetch failed');
            }

            return await response.json();
        } catch (e) {
            console.error('Stats fetch error:', e);
            throw e;
        }
    }
}

const api = new Api();
export default api;