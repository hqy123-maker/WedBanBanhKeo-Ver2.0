import axios from 'axios';

const http = axios.create({
  baseURL: process.env.VUE_APP_API_URL || 'http://localhost:5000/api',
});

// Interceptor cho request
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor cho response
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response.status === 401) {
      const authStore = useAuthStore();
      authStore.logoutUser();
      window.location.href = '/login'; // Chuyển hướng nếu token hết hạn
    }
    return Promise.reject(error);
  }
);

export default http;