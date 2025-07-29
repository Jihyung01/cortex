// src/components/Login.js 또는 해당 로그인 컴포넌트
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      alert("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // 로그인 성공 시 대시보드로 이동
        navigate("/dashboard");
      } else {
        alert(result.error || "로그인에 실패했습니다.");
      }
    } catch (error) {
      console.error("로그인 에러:", error);
      alert("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 데모 계정으로 로그인
  const handleDemoLogin = async () => {
    setFormData({
      email: "demo@cortex.app",
      password: "demo123",
    });

    setIsLoading(true);
    try {
      const result = await login("demo@cortex.app", "demo123");
      if (result.success) {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("데모 로그인 에러:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">⚡</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Cortex</h1>
          <p className="text-gray-600 mt-2">새 계정을 만드세요</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              이메일
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="이메일을 입력하세요"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="비밀번호를 입력하세요"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* 회원가입 링크 */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            이미 계정이 있으신가요?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-purple-600 hover:text-purple-700 font-medium"
              disabled={isLoading}
            >
              회원가입
            </button>
          </p>
        </div>

        {/* 데모 계정 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700 mb-2">
            <strong>데모 계정:</strong> demo@cortex.app / demo123
          </p>
          <button
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            데모 계정으로 로그인
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
