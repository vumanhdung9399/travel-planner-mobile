import BubbleChatContent from "@/src/components/group/BubbleChatContent";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect } from "react";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function BubbleChatScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
    avatar?: string | string[];
  }>();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ swipeEnabled: false });
  }, [navigation]);

  return (
    <BubbleChatContent
      groupId={firstParam(params.id)}
      groupName={firstParam(params.name)}
      groupAvatar={firstParam(params.avatar)}
    />
  );
}
