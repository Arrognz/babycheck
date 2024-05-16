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
}

const api = new Api();
export default api;