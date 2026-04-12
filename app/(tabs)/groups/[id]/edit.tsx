import GroupForm from "@/src/components/group/GroupForm";
import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { useLocalSearchParams } from "expo-router";

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <CommonHeader title={"Sửa nhóm"} />
      <GroupForm mode="edit" groupId={id} />
    </>
  );
}
