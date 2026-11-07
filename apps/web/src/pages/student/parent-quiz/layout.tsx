import { Provider } from "react-redux";
import { Outlet } from "react-router-dom";
import { store } from "@/store";

/** Wraps the "From your parent" subtree in its own Redux provider, same pattern as /calendar. */
export default function StudentParentQuizLayout() {
  return (
    <Provider store={store}>
      <Outlet />
    </Provider>
  );
}
