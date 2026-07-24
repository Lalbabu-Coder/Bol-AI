import React, { createContext, useState, useEffect, useCallback } from 'react';
import { api, setCachedToken, getCachedToken, registerSessionExpiredCallback } from '../api/axios.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Clear local session states
  const clearSession = useCallback(() => {
    setUser(null);
    setCompany(null);
    setCachedToken('');
  }, []);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { accessToken, user: userData, company: companyData } = response.data.data;
      
      setCachedToken(accessToken);
      setUser(userData);
      setCompany(companyData);
      return { success: true, role: userData.role };
    } catch (err) {
      const message = err.response?.data?.message || 'Login credentials invalid';
      return { success: false, error: message };
    }
  };

  // Register handler
  const register = async (companyName, userName, email, password) => {
    try {
      const response = await api.post('/api/auth/register', {
        companyName,
        userName,
        email,
        password
      });
      const { accessToken, user: userData, company: companyData } = response.data.data;

      setCachedToken(accessToken);
      setUser(userData);
      setCompany(companyData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      return { success: false, error: message };
    }
  };

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      // Ignore failures on logout API calls
    } finally {
      clearSession();
    }
  }, [clearSession]);

  // Perform a silent check on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Attempt to refresh token using HTTP-only cookie automatically
        const response = await api.post('/api/auth/refresh');
        const { accessToken } = response.data.data;
        setCachedToken(accessToken);

        // Fetch user context if valid.
        // We can create a simple route or obtain details during the login/refresh payload.
        // In our backend, the login & register payloads return the user details.
        // However, if we refresh, we need to know who the user is.
        // Let's create an endpoint in the server or decode the user info from JWT?
        // Wait, standard practice is to have a profile endpoint, OR during token refresh,
        // we can return the user + company details in the refresh response payload!
        // That is exceptionally clean and eliminates an extra API request!
        // Wait, let's review if our server's /refresh route returns user + company.
        // Currently, our server's /refresh route returns just the token.
        // Let's modify our server's refresh endpoint to also return user and company metadata!
        // That is a massive optimization. Let's make sure we do that, or fetch it.
        // Wait, yes, returning user + company metadata from `/refresh` is very common and convenient.
        // Let's check how we did it in `controllers/authController.js`:
        //
        // export const refresh = asyncHandler(async (req, res) => {
        //   ...
        //   res.status(200).json({
        //     success: true,
        //     data: { accessToken: newAccessToken }
        //   });
        // });
        //
        // If we want to return user + company, we can modify the controller to find the user and company
        // and return them as well. That is awesome!
        // Let's double check if we can modify the backend refresh handler to include this.
        // Yes! Let's do it or query it. But wait, we can also modify the client to handle it.
        // Let's check what our AuthContext mount needs.
        // If the `/refresh` response has user and company details, we can set them:
        // `setUser(res.data.data.user)` and `setCompany(res.data.data.company)`.
        // Let's make sure the backend returns user + company.
        // Let's edit `controllers/authController.js` to return user and company details.
        // We will make that minor edit right after writing this file.
        
        // Assuming we return user & company from refresh:
        if (response.data.data.user && response.data.data.company) {
          setUser(response.data.data.user);
          setCompany(response.data.data.company);
        } else {
          // If not returned, we can fetch a profile/me endpoint, or for simplicity,
          // let's adjust the /refresh endpoint to return them, which we will do next.
        }
      } catch (err) {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    // Register Axios hook to automatically call logout if a refresh fails in the background
    registerSessionExpiredCallback(clearSession);

    initializeAuth();
  }, [clearSession]);

  const impersonate = (token, targetUser, targetCompany) => {
    localStorage.setItem('admin_token', getCachedToken());
    localStorage.setItem('admin_user', JSON.stringify(user));
    setCachedToken(token);
    setUser(targetUser);
    setCompany(targetCompany);
  };

  const exitImpersonation = () => {
    const adminToken = localStorage.getItem('admin_token');
    const adminUserJson = localStorage.getItem('admin_user');

    if (adminToken && adminUserJson) {
      setCachedToken(adminToken);
      setUser(JSON.parse(adminUserJson));
      setCompany(null);
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      return true;
    }
    return false;
  };

  const isImpersonating = !!localStorage.getItem('admin_token');

  const value = {
    user,
    company,
    loading,
    login,
    register,
    logout,
    impersonate,
    exitImpersonation,
    isImpersonating
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
