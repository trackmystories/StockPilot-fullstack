'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';

import {
  Anchor,
  Box,
  Button,
  Container,
  Group,
  Text,
} from '@mantine/core';

import styles from './NavigationHeader.module.css';

const navigationItems = [
  {
    label: 'Home',
    href: '/',
  },
  {
    label: 'About',
    href: '/about',
  },
  {
    label: 'News',
    href: '/news',
  },
];

const BRAND_GREEN = '#16b77a';

export function NavigationHeader() {
  const pathname = usePathname();

  return (
    <Box
      component="header"
      className={styles.header}
    >
      <Container
        size="xl"
        className={styles.container}
      >
        <div className={styles.inner}>
          <Link
            href="/"
            className={styles.brand}
          >
            <Image
              src="/logo.png"
              alt="StockPilot logo"
              width={68}
              height={34}
              className={styles.logo}
            />

            <Text
              fw={700}
              className={styles.brandName}
            >
              StockPilot
            </Text>
          </Link>

          <div className={styles.navigation}>
            <Group
              gap="lg"
              className={styles.links}
            >
              {navigationItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                return (
                  <Anchor
                    key={item.href}
                    component={Link}
                    href={item.href}
                    c={isActive ? BRAND_GREEN : 'dark'}
                    fw={isActive ? 600 : 400}
                    underline="never"
                    className={styles.link}
                  >
                    {item.label}
                  </Anchor>
                );
              })}
            </Group>

            <Button
              component={Link}
              href="/login"
              color={BRAND_GREEN}
              className={styles.cta}
            >
              Coming soon
            </Button>
          </div>
        </div>
      </Container>
    </Box>
  );
}