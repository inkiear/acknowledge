import {
  SessionProvider,
  SessionProviderProps,
  useSession,
} from "next-auth/react";
import { AppProps } from "next/app";
import { trpc } from "../utils/trpc";
import { MantineProvider } from "@mantine/core";
import { NextPage } from "next";
import { ReactElement, ReactNode, useEffect } from "react";
import { useAuthStore } from "../stores/auth";
import { useQuery } from "@tanstack/react-query";
import { getSdk } from "../__generated__/graphql-operations";
import { gqlClient } from "../services/graphql";
import { themeOverride } from "../styles/theme";
import { NotificationsProvider } from "@mantine/notifications";
import Head from "next/head";
import { SpotlightProvider } from "@mantine/spotlight";
import { spotlightActions } from "../config/spotlight";
import { useRouter } from "next/router";

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
  noAuth?: boolean;
};

type AppPropsWithLayout = AppProps<SessionProviderProps> & {
  Component: NextPageWithLayout<SessionProviderProps>;
};

function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppPropsWithLayout) {
  const router = useRouter();
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <>
      <Head>
        <title>Acknowledge</title>
      </Head>
      <SessionProvider session={session}>
        <AuthWrapper>
          <MantineProvider
            withGlobalStyles
            withNormalizeCSS
            withCSSVariables
            theme={themeOverride}
          >
            <SpotlightProvider
              shortcut={["\\"]}
              actions={spotlightActions(router)}
            >
              <NotificationsProvider>
                {getLayout(<Component {...pageProps} />)}
              </NotificationsProvider>
            </SpotlightProvider>
          </MantineProvider>
        </AuthWrapper>
      </SessionProvider>
    </>
  );
}

const AuthWrapper = ({ children }: { children: ReactElement }) => {
  const session = useSession();
  const { setLinearUser, setAccount } = useAuthStore();
  const gql = getSdk(gqlClient);

  const { data: linearMeData } = useQuery(
    ["me"],
    async () => {
      const data = await gql.Me(
        {},
        { Authorization: session.data?.account?.accessToken || "" }
      );

      return data;
    },
    {
      enabled: !!session.data?.account?.accessToken,
      refetchOnWindowFocus: false,
      retry: false,
      cacheTime: 0,
    }
  );
  const { data: meData } = trpc.accounts.me.useQuery(undefined, {
    enabled: !!session.data?.account?.accessToken,
    refetchOnWindowFocus: false,
    retry: false,
    cacheTime: 0,
  });

  useEffect(() => {
    if (session.status === "authenticated") {
      if (linearMeData) {
        setLinearUser(linearMeData.viewer);
      }
    }
  }, [session, linearMeData, setLinearUser]);
  useEffect(() => {
    if (session.status === "authenticated") {
      if (meData) {
        setAccount(meData);
      }
    }
  }, [session, meData, setAccount]);

  return children;
};

export default trpc.withTRPC(App);
