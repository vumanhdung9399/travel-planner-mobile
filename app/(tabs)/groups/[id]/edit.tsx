import GroupForm from "@/src/components/group/GroupForm";
import { useLocalSearchParams } from "expo-router";

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <GroupForm mode="edit" groupId={id} />;
}
