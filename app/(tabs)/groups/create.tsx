import GroupForm from "@/src/components/group/GroupForm";
import { CommonHeader } from "@/src/components/layout/CommonHeader";

export default function CreateGroupScreen() {
  return (
    <>
      <CommonHeader title={"Thêm nhóm mới"} />
      <GroupForm mode="create" />
    </>
  );
}
