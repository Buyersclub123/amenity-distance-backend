import React, { useState } from "react";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import "./App.css";

function App() {
  const [address, setAddress] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setOutput("");

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: address }),
      });

      const data = await response.json();
      setOutput(data.result);
    } catch (error) {
      console.error("Error fetching summary:", error);
      setOutput("❌ Failed to fetch summary.");
    }

    setLoading(false);
  };

  const handleClear = () => {
    setAddress("");
    setOutput("");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  return (
    <div className="app">
      <h1>Property Summary Tool</h1>
      <p>Enter a full property address below and click to generate a formatted summary (Address + Amenities block only, ready for UI).</p>

      <Textarea
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Enter address and amenity list here..."
        className="textarea"
      />

      <div className="buttons">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Generating..." : "Generate Summary"}
        </Button>
        <Button onClick={handleCopy} disabled={!output}>
          Copy
        </Button>
        <Button onClick={handleClear}>Clear</Button>
      </div>

      <Textarea
        value={output}
        readOnly
        className="output"
        placeholder="Formatted results will appear here..."
      />
    </div>
  );
}

export default App;
