import { Navigate } from "react-router-dom";

const withAuth = (WrappedComponent) => {
  return (props) => {
    const token = localStorage.getItem("token");

    if (!token) {
      return <Navigate to="/auth" replace />;
    }

    return <WrappedComponent {...props} />;
  };
};

export default withAuth;
