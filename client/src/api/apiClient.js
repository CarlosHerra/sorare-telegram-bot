export const apiFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401 || response.status === 403) {
        if (token) {
            localStorage.removeItem('token');
            window.location.reload(); // Force reload to clear state
        }
        throw new Error('Unauthorized');
    }

    // Attempt to parse JSON correctly even for empty responses
    let data;
    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(data.error || 'API Request Failed');
    }

    return data;
};
