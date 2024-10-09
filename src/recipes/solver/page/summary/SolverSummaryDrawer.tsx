import {
  Button,
  Drawer,
  Group,
  Image,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconInfoHexagon,
  IconPower,
  IconRulerMeasure,
} from '@tabler/icons-react';
import { Node } from '@xyflow/react';
import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { RepeatingNumber } from '../../../../core/intl/NumberFormatter';
import { AllFactoryItemsMap } from '../../../FactoryItem';
import {
  SolverAreaNode,
  SolverEnergyNode,
} from '../../computeProductionConstraints';
import { IMachineNodeData } from '../../layout/MachineNode';
import { IResourceNodeData } from '../../layout/ResourceNode';
import { usePathSolverInstance } from '../../store/SolverSlice';
import { ISolverSolution } from '../SolverPage';

export interface ISolverSummaryDrawerProps {
  solution: ISolverSolution;
}

export function SolverSummaryDrawer(props: ISolverSummaryDrawerProps) {
  const { solution } = props;
  const dispatch = useDispatch();
  const [opened, { open, close }] = useDisclosure();
  const instance = usePathSolverInstance();

  const stats = useMemo(() => {
    const machineNodes = solution.nodes.filter(
      (node): node is Node<IMachineNodeData> => node.type === 'Machine',
    );

    // Power
    const power = machineNodes.reduce((acc, node) => {
      const energyNode = solution.graph.getNodeAttributes(
        `e${node.data.recipe.index}`,
      ) as SolverEnergyNode;
      return acc + (energyNode.value ?? 0);
    }, 0);

    // Area
    const area = machineNodes.reduce((acc, node) => {
      const areaNode = solution.graph.getNodeAttributes(
        // TODO Find a better way to encode node names
        `area${node.data.recipe.index}`,
      ) as SolverAreaNode;
      return acc + (areaNode.value ?? 0);
    }, 0);

    // All resources
    const resources = solution.nodes
      .filter(
        (node): node is Node<IResourceNodeData> => node.type === 'Resource',
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

    return {
      power,
      area,
      resources,
    };
  }, [solution]);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        leftSection={<IconInfoHexagon size={16} />}
        onClick={open}
      >
        Summary
      </Button>
      <Drawer
        position="right"
        size="lg"
        opened={opened}
        onClose={close}
        title={
          <Stack>
            <Text size="xl">Summary</Text>
          </Stack>
        }
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap={4}>
              <IconPower size={32} stroke={1.5} />
              <Text size="lg">Power</Text>
            </Group>
            <Group gap={4}>
              <Text size="lg" fw={600}>
                <RepeatingNumber value={stats.power} /> MW
              </Text>
            </Group>
            <Group gap={4}>
              <IconRulerMeasure size={32} stroke={1.5} />
              <Text size="lg">Area</Text>
            </Group>
            <Group gap={4}>
              <Text size="lg" fw={600}>
                <RepeatingNumber value={stats.area} /> m<sup>2</sup>
              </Text>
            </Group>
          </Group>
          <Title order={5}>Resources</Title>
          <Table withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th></Table.Th>
                <Table.Th>Resource</Table.Th>
                <Table.Th>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Object.entries(stats.resources).map(([id, value]) => {
                const resource = AllFactoryItemsMap[id];
                return (
                  <Table.Tr key={id}>
                    <Table.Td width="40px">
                      <Image
                        w={32}
                        h={32}
                        src={resource.imagePath}
                        alt={resource.name}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{resource.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <RepeatingNumber value={value} />
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Stack>
      </Drawer>
    </>
  );
}