import { Flex, Heading, Text } from "@radix-ui/themes";

export const AppHeader = ({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) => {
  return (
    <Flex direction="column" gap="1">
      <Heading size="5">{title}</Heading>
      {subtitle ? (
        <Text size="2" color="gray">
          {subtitle}
        </Text>
      ) : null}
    </Flex>
  );
};
