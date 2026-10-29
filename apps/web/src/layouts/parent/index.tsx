import { ParentChildrenProvider } from "@/contexts/parent-children-context";
import { ParentShell } from "@/pages/parent/component/shell/parent-shell";

const ParentLayout = () => (
  <ParentChildrenProvider>
    <ParentShell />
  </ParentChildrenProvider>
);

export default ParentLayout;
