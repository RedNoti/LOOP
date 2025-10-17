// src/components/AISearchBar.tsx
import { useState } from "react";
import styled from "styled-components";

// LOOP 프로젝트용 AI 검색 바 컴포넌트 Props 타입
interface AISearchBarProps {
    onAISearch: (query: string) => void;
    loading: boolean;
    isDarkMode?: boolean;
}

// 테마 기반 스타일드 컴포넌트
const SearchContainer = styled.div<{ $isDark: boolean }>`
  margin-bottom: 20px;
  padding: 20px;
  background: ${props => props.$isDark 
    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' 
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  border-radius: 12px;
  box-shadow: ${props => props.$isDark 
    ? '0 4px 15px rgba(0,0,0,0.3)' 
    : '0 4px 15px rgba(0,0,0,0.1)'};
  border: 1px solid ${props => props.$isDark ? '#404040' : 'transparent'};
`;

const Title = styled.h3<{ $isDark: boolean }>`
  margin: 0 0 15px 0;
  color: ${props => props.$isDark ? '#e6e6e6' : 'white'};
  font-size: 18px;
  font-weight: bold;
`;

const SearchInput = styled.input<{ $isDark: boolean }>`
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  background: ${props => props.$isDark ? '#303030' : 'white'};
  color: ${props => props.$isDark ? '#e6e6e6' : '#1a1a1a'};
  box-shadow: ${props => props.$isDark 
    ? '0 2px 10px rgba(0,0,0,0.3)' 
    : '0 2px 10px rgba(0,0,0,0.1)'};
  transition: all 0.3s ease;

  &::placeholder {
    color: ${props => props.$isDark ? '#8a8f98' : '#8e8e93'};
  }

  &:focus {
    background: ${props => props.$isDark ? '#404040' : '#ffffff'};
    box-shadow: ${props => props.$isDark 
      ? '0 0 0 3px rgba(10,132,255,0.3)' 
      : '0 0 0 3px rgba(0,122,255,0.3)'};
  }
`;

const SearchButton = styled.button<{ $isDark: boolean; $loading: boolean }>`
  padding: 12px 20px;
  background: ${props => {
    if (props.$loading) return props.$isDark ? '#404040' : '#ccc';
    return props.$isDark ? '#0a84ff' : '#ff6b6b';
  }};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: ${props => props.$loading ? 'not-allowed' : 'pointer'};
  font-size: 16px;
  font-weight: bold;
  box-shadow: ${props => props.$isDark 
    ? '0 2px 10px rgba(0,0,0,0.3)' 
    : '0 2px 10px rgba(0,0,0,0.2)'};
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: ${props => props.$isDark ? '#007aff' : '#ff5252'};
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

// LOOP 프로젝트용 AI 검색 입력 폼 컴포넌트
export default function AISearchBar({ onAISearch, loading, isDarkMode = false }: AISearchBarProps) {
    const [query, setQuery] = useState('');

    // 폼 제출 핸들러
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onAISearch(query);
        }
    };

    return (
        <SearchContainer $isDark={isDarkMode}>
            <Title $isDark={isDarkMode}>LOOP AI로 노래 찾기</Title>
            <form onSubmit={handleSubmit}>
                <SearchInput
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="예: 최근 유행하는 아이유 노래를 5곡 알려줘"
                    $isDark={isDarkMode}
                />
                <SearchButton
                    type="submit"
                    disabled={loading}
                    $isDark={isDarkMode}
                    $loading={loading}
                >
                    {loading ? "AI 검색중..." : "AI 검색"}
                </SearchButton>
            </form>
        </SearchContainer>
    );
}