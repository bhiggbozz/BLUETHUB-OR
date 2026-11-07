import { Provider } from "react-redux";
import { Outlet } from "react-router-dom";
import { store } from "@/store";

/** Wraps the practice-quiz subtree in its own Redux provider, same pattern as /calendar. */
export default function ParentPracticeQuizLayout() {
  return (
    <Provider store={store}>
      <Outlet />
    </Provider>
  );
}
