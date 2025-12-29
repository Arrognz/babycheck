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

    async register(username, password) {
        try {
            const response = await fetch(`${this.baseUrl}/register`, {
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
}

const api = new Api();
export default api;