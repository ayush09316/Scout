export const SKILLS: { name: string; aliases?: string[]; cased?: boolean }[] = [
  { name: "Python" }, { name: "Django" }, { name: "Flask" }, { name: "FastAPI" }, { name: "Celery" },
  { name: "Go", aliases: ["golang"], cased: true }, { name: "Java" }, { name: "Kotlin" }, { name: "Scala" }, { name: "Rust" }, { name: "C++" }, { name: "C#", aliases: [".net"] },
  { name: "Ruby" }, { name: "Rails", aliases: ["ruby on rails"] }, { name: "PHP" }, { name: "Elixir" },
  { name: "JavaScript" }, { name: "TypeScript" }, { name: "Node.js", aliases: ["nodejs"] }, { name: "React", aliases: ["react.js", "reactjs"] },
  { name: "Next.js", aliases: ["nextjs"] }, { name: "Vue", aliases: ["vue.js"] }, { name: "Angular" }, { name: "CSS" }, { name: "GraphQL" },
  { name: "REST APIs", aliases: ["rest api", "restful"] }, { name: "gRPC" }, { name: "Webhooks", aliases: ["webhook"] }, { name: "Microservices", aliases: ["microservice"] },
  { name: "PostgreSQL", aliases: ["postgres"] }, { name: "MySQL" }, { name: "MongoDB" }, { name: "Redis" }, { name: "Elasticsearch", aliases: ["opensearch"] }, { name: "Cassandra" }, { name: "DynamoDB" },
  { name: "SQL" }, { name: "Kafka" }, { name: "RabbitMQ" }, { name: "Spark" }, { name: "Airflow" }, { name: "dbt" }, { name: "Snowflake" }, { name: "BigQuery" },
  { name: "AWS" }, { name: "GCP", aliases: ["google cloud"] }, { name: "Azure" }, { name: "Docker" }, { name: "Kubernetes", aliases: ["k8s"] }, { name: "Terraform" },
  { name: "Linux" }, { name: "CI/CD" }, { name: "Prometheus" }, { name: "Grafana" }, { name: "OpenTelemetry" },
  { name: "PyTorch" }, { name: "TensorFlow" }, { name: "LLMs", aliases: ["llm", "large language model", "large language models"] }, { name: "RAG" }, { name: "Evals", aliases: ["llm evaluation"] },
  { name: "Vector DBs", aliases: ["vector database", "pgvector", "vector db"] }, { name: "Machine Learning" }, { name: "NLP" },
  { name: "Distributed Systems", aliases: ["distributed system"] }, { name: "System Design" }, { name: "Payments", aliases: ["payment"] },
  { name: "Spring", aliases: ["spring boot"] }, { name: "iOS", aliases: ["swift"] }, { name: "Android" }, { name: "Flutter" },
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const patterns = SKILLS.map((s) => ({
  name: s.name,
  cased: !!s.cased,
  re: s.cased
    ? new RegExp(`(^|[^A-Za-z0-9])(${esc(s.name)}|${(s.aliases ?? []).map(esc).join("|")})(?![A-Za-z0-9-])(?! to\\b)`, "")
    : new RegExp(`(^|[^a-z0-9+#.])(${[s.name, ...(s.aliases ?? [])].map((a) => esc(a.toLowerCase())).join("|")})(?![a-z0-9+#])`, "i"),
}));

export function skillRegex(name: string) {
  const p = patterns.find((x) => x.name === name);
  return p?.re ?? new RegExp(`(^|[^a-z0-9])(${esc(name.toLowerCase())})(?![a-z0-9])`, "i");
}

export function findSkills(text: string): string[] {
  return patterns.filter((p) => p.re.test(text)).map((p) => p.name);
}

export function hasSkill(text: string, name: string) {
  return skillRegex(name).test(text);
}

const DISPLAY = new Map<string, string>();
for (const sk of SKILLS) {
  DISPLAY.set(sk.name.toLowerCase(), sk.name);
  for (const a of sk.aliases ?? []) DISPLAY.set(a.toLowerCase(), sk.name);
}

export function displaySkill(s: string) {
  const hit = DISPLAY.get(s.toLowerCase().trim());
  if (hit) return hit;
  if (/[A-Z]/.test(s)) return s;
  return s.length <= 3 ? s.toUpperCase() : s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
