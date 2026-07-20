import { useNavigate } from "react-router-dom";
import { Button } from "@titan/design-system";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <main style={{ padding: 32, textAlign: "center" }}>
      <h1>Page not found</h1>
      <p>The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.</p>
      {/* useNavigate + Button, not Link-wrapping-Button — nesting a <button>
          inside an <a> is invalid HTML and ambiguous for assistive tech. */}
      <Button onClick={() => navigate("/")}>Back to home</Button>
    </main>
  );
}
