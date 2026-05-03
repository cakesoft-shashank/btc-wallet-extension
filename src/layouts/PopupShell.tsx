import { Box } from "@radix-ui/themes";

export const PopupShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box className="popup-shell" p="4">
      {children}
    </Box>
  );
};
