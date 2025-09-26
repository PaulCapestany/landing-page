import express from "express";
import cors from "cors";
import neo4j from "neo4j-driver";

const {
  MG_URI = "bolt+ssc://YOUR_HOST:7687",
  MG_USER = "readonly",
  MG_PASS = "change-me"
} = process.env;

const driver = neo4j.driver(MG_URI, neo4j.auth.basic(MG_USER, MG_PASS));
const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.post("/query", async (req, res) => {
  const { cypher = "MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 200", params = {} } = req.body || {};
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);

    const nodes = new Map();
    const edges = [];
    const nodeOf = (n) => {
      const id = n.identity.toString();
      if (!nodes.has(id)) nodes.set(id, { id, label: Array.from(n.labels || []).join(","), data: n.properties || {} });
      return nodes.get(id);
    };

    for (const rec of result.records) {
      for (const v of rec.values()) {
        if (v && typeof v === "object" && v.start && v.end) {
          const start = v.start.toString();
          const end = v.end.toString();
          edges.push({
            id: v.identity.toString(),
            start,
            end,
            source: start,
            target: end,
            label: v.type,
            data: v.properties || {}
          });
        } else if (v && v.labels) {
          nodeOf(v);
        }
      }
    }

    res.json({ nodes: Array.from(nodes.values()), edges });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  } finally {
    await session.close().catch(() => {});
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`mg-relay listening on :${port}`));
