// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

// API 기본 URL
const API_BASE_URL = "http://localhost:5000/api";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API 호출 헬퍼 함수
  const apiCall = async (endpoint, options = {}) => {
    try {
      const token = localStorage.getItem("token");

      const config = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      // 응답 상태 확인
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("API 호출 에러:", error);
      throw error;
    }
  };

  // 로그인 함수
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (response.success) {
        const { access_token, user: userData } = response;

        // 토큰 저장
        localStorage.setItem("token", access_token);

        // 사용자 정보 설정
        setUser(userData);

        return { success: true, user: userData };
      } else {
        throw new Error(response.message || "로그인에 실패했습니다.");
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 회원가입 함수
  const register = async (email, username, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, username, password }),
      });

      if (response.success) {
        const { access_token, user: userData } = response;

        // 토큰 저장
        localStorage.setItem("token", access_token);

        // 사용자 정보 설정
        setUser(userData);

        return { success: true, user: userData };
      } else {
        throw new Error(response.message || "회원가입에 실패했습니다.");
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 함수
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setError(null);
  };

  // 현재 사용자 정보 가져오기
  const getCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return null;
      }

      const response = await apiCall("/auth/me");

      if (response.success) {
        setUser(response.user);
        return response.user;
      } else {
        // 토큰이 유효하지 않음
        localStorage.removeItem("token");
        return null;
      }
    } catch (error) {
      console.error("사용자 정보 가져오기 실패:", error);
      localStorage.removeItem("token");
      return null;
    }
  };

  // 컴포넌트 마운트 시 사용자 정보 확인
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        await getCurrentUser();
      } catch (error) {
        console.error("인증 초기화 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    getCurrentUser,
    apiCall, // 다른 컴포넌트에서 API 호출할 때 사용
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
