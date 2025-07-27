"use client";

import { useState, useEffect } from "react";

export function useSidebarCollapse() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load initial state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapsed = () => {
    setIsCollapsed(prev => !prev);
  };

  return {
    isCollapsed,
    toggleCollapsed,
  };
}