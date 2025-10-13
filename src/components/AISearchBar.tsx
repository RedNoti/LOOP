// src/components/AISearchBar.tsx
import { useState } from "react";

// LOOP 프로젝트용 AI 검색 바 컴포넌트 Props 타입
interface AISearchBarProps {
    onAISearch: (query: string) => void;
    loading: boolean;
}

// LOOP 프로젝트용 AI 검색 입력 폼 컴포넌트
export default function AISearchBar({ onAISearch, loading}: AISearchBarProps) {
    const [query, setQuery] = useState('');

    // 폼 제출 핸들러
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onAISearch(query);
        }
    };

    return (
        <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
            <h3 style={{ 
                margin: '0 0 10px 0', 
                color: 'white',
                fontSize: '18px',
                fontWeight: 'bold'
            }}>🤖 LOOP AI로 노래 찾기</h3>
            <form onSubmit={handleSubmit}>
                <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 최근 유행하는 아이유 노래를 5곡 알려줘"
                style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '10px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}
                />
                <button
                type="submit"
                disabled={loading}
                style={{
                    padding: '12px 20px',
                    backgroundColor: loading ? '#ccc' : '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? "not-allowed" : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease'
                }}
                >
                    {loading ? "🤖 AI 검색중..." : "🚀 AI 검색"}
                </button>
            </form>
        </div>
    );
}