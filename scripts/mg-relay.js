async function fetchGraph(relayUrl, cypher) {
  const response = await fetch(`${relayUrl.replace(/\/$/, "")}/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cypher })
  });
  if (!response.ok) {
    throw new Error(`Relay error: ${await response.text()}`);
  }
  return response.json();
}
