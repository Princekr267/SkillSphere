import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../utils/api';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: 'client' | 'freelancer' | 'admin';
  avatar?: string;
  location: {
    type?: string;
    coordinates: [number, number]; // [lng, lat]
    city: string;
  };
  companyName?: string;
  bio?: string;
  skills: Array<{ name: string; level: 'Beginner' | 'Intermediate' | 'Expert' }>;
  hourlyRate?: number;
  portfolio: Array<{ title: string; description: string; link?: string }>;
  resumeUrl?: string;
  certifications: string[];
  rating: number;
  reviewCount: number;
}

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: any) => Promise<void>;
  uploadResumeFile: (file: File) => Promise<string>;
  updateUser: (updatedUser: IUser) => void;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('skillsphere_token'));
  const [loading, setLoading] = useState<boolean>(true);

  // Load user data on startup if token is present
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            // Token invalid or expired
            logout();
          }
        } catch (error) {
          console.error('Failed to load user details:', error);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('skillsphere_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', userData);
      if (res.data.success) {
        localStorage.setItem('skillsphere_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('skillsphere_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const updateProfile = async (profileData: any) => {
    try {
      const res = await api.put('/users/profile', profileData);
      if (res.data.success) {
        setUser(res.data.user);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Profile update failed');
    }
  };

  const uploadResumeFile = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('resume', file);
      
      const res = await api.post('/users/upload-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (res.data.success) {
        setUser(res.data.user);
        return res.data.resumeUrl;
      }
      throw new Error('Upload failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Resume upload failed');
    }
  };


  const updateUser = (updatedUser: IUser) => {
    setUser(updatedUser);
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateProfile,
        uploadResumeFile,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
