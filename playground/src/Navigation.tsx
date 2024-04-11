import { Link } from "react-router-dom";

const Navigation = () => (
  <div style={{ margin: "0.5rem 1rem" }}>
    <span style={{ marginRight: "1rem" }}>
      Branch: Main
    </span>
    <span style={{ marginRight: "1rem" }}>
      <Link to="/">Designer</Link>
    </span>
    <span style={{ marginRight: "1rem" }}>
      <Link to="/form-viewer">Form, Viewer</Link>
    </span>
  </div>
);

export default Navigation;
