import {
  ActionIcon,
  Badge,
  Burger,
  Container,
  Group,
  Image,
  Kbd,
  Tabs,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure, useOs } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { capitalize } from 'lodash';
import { Link } from 'react-router-dom';
import { UserMenu } from '@/auth/UserMenu';
import { openSpotlight } from '@/codex/spotlight/CodexSpotlight';
import { assetPath } from '@/core/assetPath';
import { GameMenu } from '@/games/menu/GameMenu';
import classes from './Header.module.css';

interface HeaderProps {
  tabs?: string[];
  activeTab?: string | null;
  children?: React.ReactNode;
  onChangeTab?: (tab: string | null) => void;
}

export function Header(props: HeaderProps) {
  const { children } = props;
  const theme = useMantineTheme();
  const [opened, { toggle }] = useDisclosure(false);
  const os = useOs();

  return (
    <header className={classes.header}>
      {import.meta.env.VITE_DEV_BANNER === 'true' && (
        <div className={classes.devBanner}>
          <Badge color="lime" variant="filled">
            Preview Build
          </Badge>
        </div>
      )}
      <Container className={classes.mainSection} size="lg">
        <Group justify="space-between">
          <Group align="flex-start">
            <Link to="/factories">
              <Image
                h={32}
                miw={200}
                w="auto"
                src={assetPath('/images/logo/satisfactory-logistics-logo.png')}
                alt="Satisfactory Logistics Planner"
              />
            </Link>
          </Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="xs" size="sm" />
          <Group>
            <Tooltip
              label={
                <>
                  Search <Kbd size="xs">{os === 'macos' ? '⌘' : 'Ctrl'}</Kbd>
                  {' + '}
                  <Kbd size="xs">K</Kbd>
                </>
              }
              position="bottom"
            >
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                onClick={openSpotlight}
                aria-label="Search"
              >
                <IconSearch size={18} />
              </ActionIcon>
            </Tooltip>
            <GameMenu />
            <UserMenu />
          </Group>
        </Group>
      </Container>
      {children}
      {props.tabs && (
        <Container size="lg">
          <Tabs
            defaultValue="factories"
            value={props.activeTab}
            variant="outline"
            visibleFrom="sm"
            onChange={tab => props.onChangeTab?.(tab)}
            classNames={{
              root: classes.tabs,
              list: classes.tabsList,
              tab: classes.tab,
            }}
          >
            <Tabs.List>
              {props.tabs?.map(tab => (
                <Tabs.Tab value={tab} key={tab}>
                  {capitalize(tab)}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </Container>
      )}
    </header>
  );
}
