import { Network, Server, User, Search, BrainCircuit } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMemoryInsights } from "@/lib/backend-api";

export default function InsightsPage() {
  const { user, getAuthToken } = useAuth();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const token = await getAuthToken();
      if (!token) return;
      try {
        const data = await fetchMemoryInsights(token);
        setInsights(data);
      } catch (err) {
        console.error("Failed to load insights", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, getAuthToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="font-mono text-sm animate-pulse flex items-center gap-2">
          <Network className="h-4 w-4" /> LOADING COGNEE GRAPH...
        </div>
      </div>
    );
  }

  const nodesCount = insights?.nodes?.length || 0;
  const edgesCount = insights?.edges?.length || 0;
  const metrics = insights?.metrics || {};

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="mb-8">
        <h2 className="font-heading text-3xl tracking-wider text-foreground flex items-center gap-3">
          <Network className="h-8 w-8 text-primary" />
          KNOWLEDGE GRAPH
        </h2>
        <p className="font-mono text-xs text-muted-foreground mt-2 uppercase">Cognee Memory Insights & Graph Topology</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-brutal p-6">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-4 w-4 text-primary" />
            <span className="font-mono text-[10px] uppercase text-muted-foreground">Total Nodes</span>
          </div>
          <div className="font-heading text-4xl">{nodesCount}</div>
        </div>
        <div className="card-brutal p-6">
          <div className="flex items-center gap-2 mb-2">
            <Network className="h-4 w-4 text-primary" />
            <span className="font-mono text-[10px] uppercase text-muted-foreground">Total Edges</span>
          </div>
          <div className="font-heading text-4xl">{edgesCount}</div>
        </div>
        <div className="card-brutal p-6">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-mono text-[10px] uppercase text-muted-foreground">Users Indexed</span>
          </div>
          <div className="font-heading text-4xl">{metrics.users || 0}</div>
        </div>
        <div className="card-brutal p-6">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <span className="font-mono text-[10px] uppercase text-muted-foreground">Entities</span>
          </div>
          <div className="font-heading text-4xl">{metrics.entities || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card-brutal p-6">
          <h3 className="font-heading text-xl mb-4">LATEST NODES</h3>
          <div className="space-y-3">
            {insights?.nodes?.slice(0, 5).map((node: any, idx: number) => (
              <div key={idx} className="p-3 bg-secondary/30 border border-border rounded-sm flex flex-col">
                <span className="font-mono text-xs text-primary">{node.id}</span>
                <span className="font-body text-sm mt-1">{JSON.stringify(node.attributes)}</span>
              </div>
            ))}
            {nodesCount === 0 && (
              <div className="text-center p-6 text-muted-foreground font-mono text-sm">
                No memories generated yet
              </div>
            )}
          </div>
        </div>

        <div className="card-brutal p-6">
          <h3 className="font-heading text-xl mb-4">LATEST CONNECTIONS</h3>
          <div className="space-y-3">
            {insights?.edges?.slice(0, 5).map((edge: any, idx: number) => (
              <div key={idx} className="p-3 bg-secondary/30 border border-border rounded-sm flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground truncate w-1/3">{edge.source}</span>
                <span className="font-mono text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-sm">{edge.type}</span>
                <span className="font-mono text-xs text-muted-foreground truncate w-1/3 text-right">{edge.target}</span>
              </div>
            ))}
            {edgesCount === 0 && (
              <div className="text-center p-6 text-muted-foreground font-mono text-sm">
                No connections found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
