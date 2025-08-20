import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

class API {
  constructor() {
    this.client = axios.create({ baseURL: BASE_URL });
  }
  setToken(token) {
    this.client.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : undefined;
  }
  get(url, config) {
    return this.client.get(url, config);
  }
  post(url, data, config) {
    return this.client.post(url, data, config);
  }
}

export const api = new API();


