import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SuperAdmin() {
  const navigate = useNavigate();

  // Redirect to overview page on component mount
  useEffect(() => {
    navigate('/super-admin/overview', { replace: true });
  }, []); // navigate is stable from react-router-dom

  return null;
}