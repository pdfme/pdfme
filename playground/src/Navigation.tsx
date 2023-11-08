import { Link } from "react-router-dom";

const Navigation = () => (
  <div style={{ marginBottom: "0.5rem" }}>
    <span style={{ marginRight: "1rem" }}>
      <Link to="/">Designer</Link>
    </span>
    <span style={{ marginRight: "1rem" }}>
      <Link to="/form-viewer">Form, Viewer</Link>
    </span>
  </div>
);

export default Navigation;
