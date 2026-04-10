import {
  ActionIcon,
  Badge,
  Box,
  Collapse,
  Divider,
  Group,
  Image,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBolt,
  IconBuildingFactory2,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconPackages,
} from '@tabler/icons-react';
import { assetPath } from '@/core/assetPath';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import type { SolverSummaryStats } from './useSolverSummaryStats';

interface SolverSummarySidebarProps {
  stats: SolverSummaryStats;
  onClose: () => void;
}

function CollapsibleSection(props: {
  title: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [opened, { toggle }] = useDisclosure(props.defaultOpen ?? true);
  return (
    <Box>
      <UnstyledButton onClick={toggle} w="100%" p="6px 8px">
        <Group gap={6} justify="space-between">
          <Group gap={6}>
            {opened ? (
              <IconChevronDown size={14} />
            ) : (
              <IconChevronRight size={14} />
            )}
            {props.icon}
            <Text size="xs" fw={600} tt="uppercase">
              {props.title}
            </Text>
          </Group>
          {props.badge != null && (
            <Badge
              size="sm"
              variant="filled"
              color={props.badgeColor ?? 'gray'}
            >
              {props.badge}
            </Badge>
          )}
        </Group>
      </UnstyledButton>
      <Collapse expanded={opened}>
        <Box px="sm" pb="xs">
          {props.children}
        </Box>
      </Collapse>
    </Box>
  );
}

export function SolverSummarySidebar(props: SolverSummarySidebarProps) {
  const { stats, onClose } = props;

  return (
    <Box
      w={220}
      style={{
        flexShrink: 0,
        borderRight: '1px solid var(--mantine-color-dark-4)',
        display: 'flex',
        flexDirection: 'column',
      }}
      bg="dark.7"
    >
      <Group justify="space-between" p="xs" pb={4}>
        <Title order={6}>Factory Summary</Title>
        <Tooltip label="Close summary" position="right">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="xs"
            onClick={onClose}
          >
            <IconChevronLeft size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Divider color="dark.4" />
      <ScrollArea
        flex={1}
        type="auto"
        scrollbarSize={6}
        offsetScrollbars
      >
        <Stack gap={0}>
          <CollapsibleSection
            title="Machines"
            icon={<IconBuildingFactory2 size={14} />}
            badge={stats.totalMachines}
          >
            <Stack gap={4}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  Total
                </Text>
                <Text size="sm" fw={700}>
                  <RepeatingNumber value={stats.totalMachines} />
                </Text>
              </Group>
              <Divider color="dark.5" my={2} />
              {stats.buildingGroups.map(bg => (
                <Group key={bg.name} justify="space-between" gap={4}>
                  <Group gap={4}>
                    <Image
                      src={assetPath(bg.imagePath)}
                      w={16}
                      h={16}
                    />
                    <Text size="xs" lineClamp={1}>
                      {bg.name}
                    </Text>
                  </Group>
                  <Text size="xs" fw={600}>
                    {bg.count}
                  </Text>
                </Group>
              ))}
            </Stack>
          </CollapsibleSection>

          <CollapsibleSection
            title="Power"
            icon={<IconBolt size={14} />}
          >
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Total
              </Text>
              <Text size="sm" fw={700}>
                <RepeatingNumber value={stats.power} /> MW
              </Text>
            </Group>
          </CollapsibleSection>

          <CollapsibleSection
            title="Resources"
            icon={<IconPackages size={14} />}
            badge={Object.keys(stats.resources).length}
          >
            <Stack gap={4}>
              {Object.entries(stats.resources).map(([id, value]) => {
                const resource = AllFactoryItemsMap[id];
                return (
                  <Group key={id} justify="space-between" gap={4}>
                    <Group gap={4}>
                      <FactoryItemImage size={16} id={resource.id} />
                      <Text size="xs" lineClamp={1}>
                        {resource.name}
                      </Text>
                    </Group>
                    <Text size="xs" fw={600}>
                      <RepeatingNumber value={value} />
                    </Text>
                  </Group>
                );
              })}
            </Stack>
          </CollapsibleSection>
        </Stack>
      </ScrollArea>
    </Box>
  );
}
