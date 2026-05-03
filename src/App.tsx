import { Flex, Spinner, Theme } from "@radix-ui/themes";
import { useWallet } from "@/hooks/useWallet";
import { PopupShell } from "@/layouts/PopupShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { UnlockPage } from "@/pages/UnlockPage";

export const App = () => {
  const { status, theme } = useWallet();

  return (
    <Theme appearance={theme} accentColor="gray" panelBackground="solid" grayColor="sand">
      <PopupShell>
        {status === "loading" ? (
          <Flex justify="center" align="center" className="full-height">
            <Spinner />
          </Flex>
        ) : null}
        {status === "setup" ? <OnboardingPage /> : null}
        {status === "locked" ? <UnlockPage /> : null}
        {status === "unlocked" ? <DashboardPage /> : null}
      </PopupShell>
    </Theme>
  );
};
