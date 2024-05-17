class Api {
    constructor() {
        // if env is development
        this.baseUrl = '/api';
        if (process.env.NODE_ENV === 'development') {
            this.baseUrl = 'http://localhost:5001/api';
        }
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
                    'Content-Type': 'application/json'
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
                    'Content-Type': 'application/json'
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
                    'Content-Type': 'application/json'
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
}

const api = new Api();
export default api;