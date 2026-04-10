import type { Node } from '@xyflow/react';
import { useMemo } from 'react';
import type {
  SolverAreaNode,
  SolverEnergyNode,
} from '@/solver/algorithm/SolverNode';
import type { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';
import { calculateMachineNodeBuildings } from '@/solver/layout/nodes/machine-node/postprocess/calculateMachineNodeBuildings';
import type { IResourceNodeData } from '@/solver/layout/nodes/resource-node/ResourceNode';
import type { ISolverSolution } from '@/solver/page/SolverPage';

export interface SolverSummaryStats {
  power: number;
  area: number;
  resources: Record<string, number>;
  totalMachines: number;
  totalBuildings: number;
  buildingGroups: { name: string; count: number; imagePath: string }[];
}

export function useSolverSummaryStats(
  solution: ISolverSolution | null,
): SolverSummaryStats | null {
  return useMemo(() => {
    if (!solution) return null;

    const machineNodes = solution.nodes.filter(
      (node): node is Node<IMachineNodeData, 'Machine'> =>
        node.type === 'Machine',
    );

    const power = machineNodes.reduce((acc, node) => {
      const energyNode = solution.graph.getNodeAttributes(
        `e${node.data.recipe.index}`,
      ) as SolverEnergyNode;
      return acc + (energyNode.value ?? 0);
    }, 0);

    const area = machineNodes.reduce((acc, node) => {
      const areaNode = solution.graph.getNodeAttributes(
        `area${node.data.recipe.index}`,
      ) as SolverAreaNode;
      return acc + (areaNode.value ?? 0);
    }, 0);

    const resources = solution.nodes
      .filter(
        (node): node is Node<IResourceNodeData, 'Resource'> =>
          node.type === 'Resource',
      )
      .reduce(
        (acc, node) => {
          if (!acc[node.data.resource.id]) {
            acc[node.data.resource.id] = 0;
          }
          acc[node.data.resource.id] += node.data.value;
          return acc;
        },
        {} as Record<string, number>,
      );

    const buildingMap = new Map<
      string,
      { name: string; count: number; imagePath: string }
    >();
    let totalMachines = 0;

    for (const node of machineNodes) {
      const calc = calculateMachineNodeBuildings(
        node.data,
        solution.context.request.nodes?.[node.id],
      );
      const count = calc.roundedBuildingsAmount;
      totalMachines += count;

      const existing = buildingMap.get(calc.building.id);
      if (existing) {
        existing.count += count;
      } else {
        buildingMap.set(calc.building.id, {
          name: calc.building.name,
          count,
          imagePath: calc.building.imagePath,
        });
      }
    }

    const buildingGroups = Array.from(buildingMap.values()).sort(
      (a, b) => b.count - a.count,
    );

    return {
      power,
      area,
      resources,
      totalMachines,
      totalBuildings: buildingGroups.length,
      buildingGroups,
    };
  }, [solution]);
}
