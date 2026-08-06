import { useMemo } from "react";
import { ReactFlow, Background, Handle, Position, type Node, type Edge, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Player, Team } from "../types/player";
import type { TradeEvaluation } from "../engine/evaluateTrade";

function formatSalary(salary: number): string {
  const sign = salary < 0 ? "-" : "";
  return `${sign}$${(Math.abs(salary) / 1_000_000).toFixed(1)}M`;
}

// Every node gets all four handles so edges can connect from whichever side
// makes sense for that node's position in the diagram (team nodes sit on
// the outside, player nodes sit in a shared middle column with traffic
// flowing in both directions).
function FlowHandles() {
  return (
    <>
      <Handle type="target" position={Position.Left} id="target-left" style={{ top: "35%" }} />
      <Handle type="source" position={Position.Left} id="source-left" style={{ top: "65%" }} />
      <Handle type="target" position={Position.Right} id="target-right" style={{ top: "35%" }} />
      <Handle type="source" position={Position.Right} id="source-right" style={{ top: "65%" }} />
    </>
  );
}

function TeamNodeLabel({ data }: NodeProps) {
  const { team, legal, netValue } = data as { team: Team; legal: boolean; netValue: number };
  return (
    <div className={`flow-team-node ${legal ? "legal" : "illegal"}`}>
      <FlowHandles />
      <strong>
        {team.city} {team.name}
      </strong>
      <span>{legal ? "Cap OK" : "Cap violation"}</span>
      <span>Net value {formatSalary(netValue)}</span>
    </div>
  );
}

function PlayerNodeLabel({ data }: NodeProps) {
  const { player } = data as { player: Player };
  return (
    <div className="flow-player-node">
      <FlowHandles />
      <strong>{player.name}</strong>
      <span>
        {player.position} · OVR {player.overall}
      </span>
      <span>{formatSalary(player.salary)}</span>
    </div>
  );
}

const nodeTypes = { teamNode: TeamNodeLabel, playerNode: PlayerNodeLabel };

interface TradeFlowGraphProps {
  teamA: Team;
  teamB: Team;
  sendingA: Player[];
  sendingB: Player[];
  evaluation: TradeEvaluation;
}

const TEAM_A_X = 40;
const TEAM_B_X = 780;
const PLAYER_X = 410;
const ROW_HEIGHT = 90;

export function TradeFlowGraph({ teamA, teamB, sendingA, sendingB, evaluation }: TradeFlowGraphProps) {
  const legalA = evaluation.teams[0].capCheck.legal;
  const legalB = evaluation.teams[1].capCheck.legal;

  const { nodes, edges } = useMemo(() => {
    const totalRows = Math.max(sendingA.length, sendingB.length, 1);
    const graphHeight = totalRows * ROW_HEIGHT + 120;
    const edgeColor = evaluation.legal ? "#2e8b57" : "#c0392b";

    const nodes: Node[] = [
      {
        id: "teamA",
        type: "teamNode",
        position: { x: TEAM_A_X, y: graphHeight / 2 - 40 },
        data: { team: teamA, legal: legalA, netValue: evaluation.teams[0].netValue },
        draggable: false,
      },
      {
        id: "teamB",
        type: "teamNode",
        position: { x: TEAM_B_X, y: graphHeight / 2 - 40 },
        data: { team: teamB, legal: legalB, netValue: evaluation.teams[1].netValue },
        draggable: false,
      },
    ];

    const edges: Edge[] = [];

    // Players team A sends: flow left (teamA) -> player -> teamB (right).
    sendingA.forEach((player, i) => {
      const nodeId = `A-${player.id}`;
      nodes.push({
        id: nodeId,
        type: "playerNode",
        position: { x: PLAYER_X, y: 40 + i * ROW_HEIGHT },
        data: { player },
        draggable: false,
      });
      edges.push({
        id: `teamA-${nodeId}`,
        source: "teamA",
        sourceHandle: "source-right",
        target: nodeId,
        targetHandle: "target-left",
        style: { stroke: "#bbb" },
      });
      edges.push({
        id: `${nodeId}-teamB`,
        source: nodeId,
        sourceHandle: "source-right",
        target: "teamB",
        targetHandle: "target-left",
        style: { stroke: edgeColor, strokeWidth: 2 },
        animated: evaluation.legal,
      });
    });

    // Players team B sends: flow right (teamB) -> player -> teamA (left).
    sendingB.forEach((player, i) => {
      const nodeId = `B-${player.id}`;
      nodes.push({
        id: nodeId,
        type: "playerNode",
        position: { x: PLAYER_X, y: graphHeight - 40 - i * ROW_HEIGHT },
        data: { player },
        draggable: false,
      });
      edges.push({
        id: `teamB-${nodeId}`,
        source: "teamB",
        sourceHandle: "source-left",
        target: nodeId,
        targetHandle: "target-right",
        style: { stroke: "#bbb" },
      });
      edges.push({
        id: `${nodeId}-teamA`,
        source: nodeId,
        sourceHandle: "source-left",
        target: "teamA",
        targetHandle: "target-right",
        style: { stroke: edgeColor, strokeWidth: 2 },
        animated: evaluation.legal,
      });
    });

    return { nodes, edges };
  }, [teamA, teamB, sendingA, sendingB, evaluation, legalA, legalB]);

  return (
    <div className="trade-flow-graph">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}>
        <Background />
      </ReactFlow>
    </div>
  );
}
