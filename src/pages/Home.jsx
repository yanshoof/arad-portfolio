import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    // Force navigation to Open Positions
    navigate(createPageUrl("OpenPositions"), { replace: true });
  }, [navigate]);

  // Show nothing while redirecting
  return null;
}