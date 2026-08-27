import { createHashRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { Dashboard } from "@/routes/Dashboard/Dashboard";
import { ProjectDetail } from "@/routes/ProjectDetail/ProjectDetail";
import { NewProjectWizard } from "@/routes/NewProjectWizard/NewProjectWizard";
import { Settings } from "@/routes/Settings/Settings";

/**
 * Hash routing: GitHub Pages is static and 404s on a hard refresh of a deep
 * path. Hashes sidestep that with zero deploy config. See ARCHITECTURE.md §6.
 */
export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "project/:id", element: <ProjectDetail /> },
      { path: "new", element: <NewProjectWizard /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);
