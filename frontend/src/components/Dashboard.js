// src/components/Dashboard.js
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

const Dashboard = () => {
  const { user, logout, apiCall } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await apiCall("/dashboard/summary");
        if (response.success) {
          setDashboardData(response.data);
        }
      } catch (error) {
        console.error("대시보드 데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [apiCall]);

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">대시보드를 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-sm">⚡</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Cortex</h1>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                안녕하세요, {user?.username}님!
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 환영 메시지 */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white p-6 mb-8">
          <h2 className="text-2xl font-bold mb-2">
            환영합니다, {user?.username}님! 🎉
          </h2>
          <p className="text-purple-100">
            Cortex와 함께 더 생산적인 하루를 시작해보세요.
          </p>
        </div>

        {/* 통계 카드 */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-blue-600 text-xl">📝</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">총 노트</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.total_notes}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">완료된 작업</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.completed_tasks}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-yellow-600 text-xl">⏳</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">진행 중인 작업</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.in_progress_tasks}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-purple-600 text-xl">📊</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">완료율</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(dashboardData.stats.completion_rate)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 빠른 액션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              빠른 노트 작성
            </h3>
            <textarea
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="빠른 메모를 작성하세요..."
            />
            <button className="mt-3 w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors">
              노트 저장
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              오늘의 할 일
            </h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input type="checkbox" className="mr-3" />
                <span className="text-gray-700">새로운 작업 추가하기</span>
              </div>
              <div className="flex items-center">
                <input type="checkbox" className="mr-3" />
                <span className="text-gray-700">프로젝트 진행 상황 확인</span>
              </div>
              <div className="flex items-center">
                <input type="checkbox" className="mr-3" />
                <span className="text-gray-700">주간 보고서 작성</span>
              </div>
            </div>
            <button className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
              작업 관리
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              AI 인사이트
            </h3>
            <p className="text-gray-600 mb-4">
              오늘의 생산성 점수:{" "}
              <span className="font-semibold text-green-600">85점</span>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              "훌륭한 진전을 보이고 있습니다! 꾸준한 노력이 좋은 결과로 이어지고
              있어요."
            </p>
            <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
              상세 분석 보기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
